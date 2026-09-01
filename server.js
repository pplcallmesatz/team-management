const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const money = (v) => Number(v || 0);
const round = (v, p = 4) => Number(Number(v || 0).toFixed(p));
const isPercent4 = (v) => /^\d+(\.\d{1,4})?$/.test(String(v));
const assert = (condition, message) => { if (!condition) { const e = new Error(message); e.status = 422; throw e; } };

const units = {
  toGram(quantity, unit) {
    if (unit === 'KG') return money(quantity) * 1000;
    if (unit === 'Gram') return money(quantity);
    throw new Error('Piece cannot be converted to weight without an explicit conversion');
  },
  weightCompatible(unit) { return ['KG', 'Gram'].includes(unit); }
};

const calculator = {
  rawPurchase({ quantity, unit, purchase_price, wastage_percent }) {
    assert(money(quantity) > 0, 'Quantity must be greater than 0');
    assert(money(purchase_price) >= 0, 'Purchase price must be greater than or equal to 0');
    assert(money(wastage_percent) >= 0 && money(wastage_percent) < 100 && isPercent4(wastage_percent), 'Wastage must be 0 to less than 100 with up to 4 decimals');
    const usable_quantity = round(money(quantity) * (1 - money(wastage_percent) / 100));
    assert(usable_quantity > 0, 'Usable quantity must be greater than 0');
    if (unit === 'Piece') return { usable_quantity, cost_per_kg: null, cost_per_gram: null, cost_per_piece: round(money(purchase_price) / usable_quantity) };
    const usableGram = units.toGram(usable_quantity, unit);
    const cost_per_gram = round(money(purchase_price) / usableGram, 6);
    return { usable_quantity, cost_per_kg: round(cost_per_gram * 1000), cost_per_gram, cost_per_piece: null };
  },
  packagingPurchase({ quantity, purchase_cost, shipping_cost, other_cost }) {
    assert(money(quantity) > 0, 'Packaging quantity must be greater than 0');
    [purchase_cost, shipping_cost, other_cost].forEach((v) => assert(money(v) >= 0, 'Packaging costs must be greater than or equal to 0'));
    const total_cost = round(money(purchase_cost) + money(shipping_cost) + money(other_cost));
    return { total_cost, individual_piece_cost: round(total_cost / money(quantity)) };
  },
  variant(purchase, variant) {
    assert(money(variant.quantity) > 0, 'Variant quantity must be greater than 0');
    ['profit_percent', 'dealer_discount_percent'].forEach((k) => assert(money(variant[k]) >= 0 && money(variant[k]) <= 100 && isPercent4(variant[k]), `${k} must be 0-100 with up to 4 decimals`));
    let raw_material_cost;
    if (variant.unit === 'Piece') {
      assert(purchase.cost_per_piece !== null && purchase.cost_per_piece !== undefined, 'Piece variants require a piece-based raw material purchase');
      raw_material_cost = money(variant.quantity) * money(purchase.cost_per_piece);
    } else {
      assert(purchase.cost_per_gram !== null && purchase.cost_per_gram !== undefined, 'Weight variants require a KG/Gram raw material purchase');
      raw_material_cost = units.toGram(variant.quantity, variant.unit) * money(purchase.cost_per_gram);
    }
    const landing_cost = raw_material_cost + money(variant.packaging_cost) + money(variant.stickering_cost) + money(variant.labour_cost);
    const mrp = landing_cost * (1 + money(variant.profit_percent) / 100);
    assert(['Percentage', 'Flat'].includes(variant.customer_discount_type), 'Customer discount type is invalid');
    assert(money(variant.customer_discount_value) >= 0, 'Customer discount cannot be negative');
    const selling_price = variant.customer_discount_type === 'Flat'
      ? mrp - money(variant.customer_discount_value)
      : mrp * (1 - money(variant.customer_discount_value) / 100);
    assert(selling_price >= 0, 'Flat discount must not be greater than MRP');
    const dealer_price = mrp * (1 - money(variant.dealer_discount_percent) / 100);
    return { raw_material_cost: round(raw_material_cost), landing_cost: round(landing_cost), mrp: round(mrp), selling_price: round(selling_price), dealer_price: round(dealer_price) };
  }
};

const crud = {
  vendors: { table: 'vendors', pk: 'id' }, raw_materials: { table: 'raw_materials', pk: 'id' },
  packaging_materials: { table: 'packaging_materials', pk: 'id' }, products: { table: 'products', pk: 'id' }
};

for (const [route, cfg] of Object.entries(crud)) {
  app.get(`/api/${route}`, async (_req, res) => res.json((await pool.query(`SELECT * FROM ${cfg.table} ORDER BY ${cfg.pk} DESC`))[0]));
  app.get(`/api/${route}/:id`, async (req, res) => {
    const rows = (await pool.query(`SELECT * FROM ${cfg.table} WHERE ${cfg.pk}=?`, [req.params.id]))[0];
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  });
  app.post(`/api/${route}`, async (req, res, next) => { try {
    const payload = { ...req.body }; delete payload[cfg.pk]; const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    const result = (await pool.query(`INSERT INTO ${cfg.table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => payload[k])))[0];
    res.status(201).json({ id: result.insertId, ...payload });
  } catch (e) { next(e); } });
  app.put(`/api/${route}/:id`, async (req, res, next) => { try {
    const payload = { ...req.body }; delete payload[cfg.pk]; const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    const result = (await pool.query(`UPDATE ${cfg.table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE ${cfg.pk}=?`, [...keys.map((k) => payload[k]), req.params.id]))[0];
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ id: req.params.id, ...payload });
  } catch (e) { next(e); } });
  app.delete(`/api/${route}/:id`, async (req, res, next) => { try {
    const result = (await pool.query(`DELETE FROM ${cfg.table} WHERE ${cfg.pk}=?`, [req.params.id]))[0];
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { next(e); } });
}

app.get('/api/dashboard', async (_req, res, next) => { try {
  const q = async (sql) => Number(((await pool.query(sql))[0][0] || {}).total || 0);
  const [recentPurchases] = await pool.query(`SELECT 'Raw' type, rp.id, rm.name item, v.name vendor, rp.purchase_date, rp.purchase_price total FROM raw_material_purchases rp JOIN raw_materials rm ON rm.id=rp.raw_material_id JOIN vendors v ON v.id=rp.vendor_id UNION ALL SELECT 'Packaging', pp.id, pm.name, v.name, pp.purchase_date, pp.total_cost FROM packaging_purchases pp JOIN packaging_materials pm ON pm.id=pp.packaging_material_id JOIN vendors v ON v.id=pp.vendor_id ORDER BY purchase_date DESC LIMIT 6`);
  const [recentPricing] = await pool.query(`SELECT pc.id, p.name product, pc.calculation_date, COUNT(pv.id) variants FROM pricing_calculations pc JOIN products p ON p.id=pc.product_id LEFT JOIN product_variants pv ON pv.pricing_calculation_id=pc.id GROUP BY pc.id ORDER BY pc.id DESC LIMIT 5`);
  res.json({ total_products: await q('SELECT COUNT(*) total FROM products'), total_raw_material_vendors: await q("SELECT COUNT(*) total FROM vendors WHERE vendor_type IN ('Raw Material','Both')"), total_packaging_materials: await q('SELECT COUNT(*) total FROM packaging_materials'), total_vendors: await q('SELECT COUNT(*) total FROM vendors'), raw_purchase_value: await q('SELECT IFNULL(SUM(purchase_price),0) total FROM raw_material_purchases'), packaging_purchase_value: await q('SELECT IFNULL(SUM(total_cost),0) total FROM packaging_purchases'), recentPurchases, recentPricing });
} catch (e) { next(e); } });

app.post('/api/raw_material_purchases', async (req, res, next) => { try {
  const calc = calculator.rawPurchase(req.body);
  const p = { ...req.body, ...calc };
  const keys = ['vendor_id','raw_material_id','purchase_date','quantity','unit','purchase_price','wastage_percent','usable_quantity','cost_per_kg','cost_per_gram','cost_per_piece','status'];
  const result = (await pool.query(`INSERT INTO raw_material_purchases (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => p[k] ?? (k === 'status' ? 'Active' : null))))[0];
  res.status(201).json({ id: result.insertId, ...p });
} catch (e) { next(e); } });
app.get('/api/raw_material_purchases', async (_req, res) => res.json((await pool.query(`SELECT rp.*, rm.name raw_material_name, v.name vendor_name FROM raw_material_purchases rp JOIN raw_materials rm ON rm.id=rp.raw_material_id JOIN vendors v ON v.id=rp.vendor_id ORDER BY rp.id DESC`))[0]));

app.post('/api/packaging_purchases', async (req, res, next) => { try {
  const calc = calculator.packagingPurchase(req.body); const p = { ...req.body, ...calc };
  const keys = ['packaging_material_id','vendor_id','purchase_date','quantity','unit','purchase_cost','shipping_cost','other_cost','total_cost','individual_piece_cost'];
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const result = (await conn.query(`INSERT INTO packaging_purchases (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => p[k])))[0]; await conn.query('UPDATE packaging_materials SET current_individual_cost=? WHERE id=?', [calc.individual_piece_cost, p.packaging_material_id]); await conn.commit(); res.status(201).json({ id: result.insertId, ...p }); } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
} catch (e) { next(e); } });
app.get('/api/packaging_purchases', async (_req, res) => res.json((await pool.query(`SELECT pp.*, pm.name packaging_material_name, v.name vendor_name FROM packaging_purchases pp JOIN packaging_materials pm ON pm.id=pp.packaging_material_id JOIN vendors v ON v.id=pp.vendor_id ORDER BY pp.id DESC`))[0]));

app.post('/api/pricing_calculations', async (req, res, next) => { try {
  assert(Array.isArray(req.body.variants) && req.body.variants.length, 'At least one variant is required');
  const [purchaseRows] = await pool.query('SELECT * FROM raw_material_purchases WHERE id=?', [req.body.raw_material_purchase_id]);
  assert(purchaseRows.length, 'Raw material purchase is required'); const purchase = purchaseRows[0];
  const conn = await pool.getConnection();
  try { await conn.beginTransaction();
    const keys = ['product_id','raw_material_purchase_id','vendor_id','raw_material_id','purchase_quantity','purchase_unit','purchase_price','wastage_percent','usable_quantity','effective_cost_per_kg','effective_cost_per_gram','effective_cost_per_piece','notes'];
    const header = { product_id: req.body.product_id, raw_material_purchase_id: purchase.id, vendor_id: purchase.vendor_id, raw_material_id: purchase.raw_material_id, purchase_quantity: purchase.quantity, purchase_unit: purchase.unit, purchase_price: purchase.purchase_price, wastage_percent: purchase.wastage_percent, usable_quantity: purchase.usable_quantity, effective_cost_per_kg: purchase.cost_per_kg, effective_cost_per_gram: purchase.cost_per_gram, effective_cost_per_piece: purchase.cost_per_piece, notes: req.body.notes || null };
    const result = (await conn.query(`INSERT INTO pricing_calculations (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => header[k])))[0];
    for (const variant of req.body.variants) {
      const [pmRows] = await conn.query('SELECT name,current_individual_cost FROM packaging_materials WHERE id=?', [variant.packaging_material_id]); assert(pmRows.length, 'Packaging material is required');
      const v = { ...variant, packaging_cost: pmRows[0].current_individual_cost, packaging_material_name: pmRows[0].name };
      Object.assign(v, calculator.variant(purchase, v));
      const vKeys = ['pricing_calculation_id','variant_name','quantity','unit','packaging_material_id','packaging_material_name','packaging_cost','stickering_cost','labour_cost','raw_material_cost','landing_cost','profit_percent','mrp','customer_discount_type','customer_discount_value','selling_price','dealer_discount_percent','dealer_price'];
      v.pricing_calculation_id = result.insertId;
      await conn.query(`INSERT INTO product_variants (${vKeys.join(',')}) VALUES (${vKeys.map(() => '?').join(',')})`, vKeys.map((k) => v[k] ?? 0));
    }
    await conn.commit(); res.status(201).json({ id: result.insertId });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
} catch (e) { next(e); } });
app.get('/api/pricing_calculations', async (_req, res) => res.json((await pool.query(`SELECT pc.*, p.name product_name, rm.name raw_material_name, v.name vendor_name FROM pricing_calculations pc JOIN products p ON p.id=pc.product_id JOIN raw_materials rm ON rm.id=pc.raw_material_id JOIN vendors v ON v.id=pc.vendor_id ORDER BY pc.id DESC`))[0]));
app.get('/api/pricing_calculations/:id', async (req, res) => { const rows = (await pool.query('SELECT * FROM pricing_calculations WHERE id=?', [req.params.id]))[0]; if (!rows.length) return res.status(404).json({ error: 'Not found' }); const variants = (await pool.query('SELECT * FROM product_variants WHERE pricing_calculation_id=?', [req.params.id]))[0]; res.json({ ...rows[0], variants }); });
app.get('/api/pricing_calculations/:id/report', async (req, res) => { const [rows] = await pool.query(`SELECT pc.*, p.name product_name, p.sku, rm.name raw_material_name, v.name vendor_name FROM pricing_calculations pc JOIN products p ON p.id=pc.product_id JOIN raw_materials rm ON rm.id=pc.raw_material_id JOIN vendors v ON v.id=pc.vendor_id WHERE pc.id=?`, [req.params.id]); if (!rows.length) return res.status(404).send('Not found'); const [variants] = await pool.query('SELECT * FROM product_variants WHERE pricing_calculation_id=?', [req.params.id]); res.send(reportHtml(rows[0], variants)); });

function reportHtml(c, variants) { const rs = (n, d = 2) => `₹${Number(n || 0).toFixed(d)}`; return `<!doctype html><html><head><title>Costing Report #${c.id}</title><link rel="stylesheet" href="/styles.css"></head><body class="report"><header><h1>Product Costing & Pricing Report</h1><p>Calculation #${c.id} · ${new Date(c.calculation_date).toLocaleString()}</p></header><section><h2>Product Information</h2><p><b>${c.product_name}</b> (${c.sku}) · Raw Material: ${c.raw_material_name} · Vendor: ${c.vendor_name}</p></section><section><h2>Raw Material Costing</h2><table><tbody><tr><td>Purchase Quantity</td><td>${c.purchase_quantity} ${c.purchase_unit}</td></tr><tr><td>Purchase Price</td><td>${rs(c.purchase_price)}</td></tr><tr><td>Wastage</td><td>${c.wastage_percent}%</td></tr><tr><td>Usable Quantity</td><td>${c.usable_quantity} ${c.purchase_unit}</td></tr><tr><td>Effective Cost/KG</td><td>${c.effective_cost_per_kg == null ? '-' : rs(c.effective_cost_per_kg, 4)}</td></tr><tr><td>Effective Cost/Gram</td><td>${c.effective_cost_per_gram == null ? '-' : rs(c.effective_cost_per_gram, 6)}</td></tr></tbody></table></section><section><h2>Variant Pricing</h2><table><thead><tr><th>Variant</th><th>Raw</th><th>Packaging</th><th>Sticker</th><th>Labour</th><th>Landing</th><th>Profit %</th><th>MRP</th><th>Customer SP</th><th>Dealer Price</th></tr></thead><tbody>${variants.map((v) => `<tr><td>${v.variant_name}</td><td>${rs(v.raw_material_cost)}</td><td>${rs(v.packaging_cost)}</td><td>${rs(v.stickering_cost)}</td><td>${rs(v.labour_cost)}</td><td><b>${rs(v.landing_cost)}</b></td><td>${v.profit_percent}%</td><td><b>${rs(v.mrp)}</b></td><td><b>${rs(v.selling_price)}</b></td><td><b>${rs(v.dealer_price)}</b></td></tr>`).join('')}</tbody></table></section><footer>Generated by Product Pricing & Costing Application</footer><script>window.print()</script></body></html>`; }

app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Product Pricing app running on http://localhost:${PORT}`));
