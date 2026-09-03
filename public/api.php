<?php
declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/src/PricingCalculator.php';

use App\PricingCalculator;

$pdo = db();
$route = trim((string) ($_GET['route'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($route === 'dashboard' && $method === 'GET') dashboard($pdo);
    if ($route === 'raw_material_purchases' && $method === 'POST') createRawPurchase($pdo);
    if ($route === 'packaging_purchases' && $method === 'POST') createPackagingPurchase($pdo);
    if ($route === 'pricing_calculations' && $method === 'POST') createPricingCalculation($pdo);
    if (preg_match('#^pricing_calculations/(\d+)/report$#', $route, $match) && $method === 'GET') report($pdo, (int) $match[1]);
    if (preg_match('#^pricing_calculations/(\d+)$#', $route, $match) && $method === 'GET') calculation($pdo, (int) $match[1]);
    if (in_array($route, ['raw_material_purchases', 'packaging_purchases', 'pricing_calculations'], true) && $method === 'GET') purchaseList($pdo, $route);
    if (preg_match('#^(vendors|raw_materials|packaging_materials|products)(?:/(\d+))?$#', $route, $match)) master($pdo, $match[1], isset($match[2]) ? (int) $match[2] : null, $method);
    fail('Route not found.', 404);
} catch (DomainException $error) { fail($error->getMessage());
} catch (PDOException $error) { fail('Database request failed. Check your database configuration and schema.', 500); }
catch (Throwable $error) { fail($error->getMessage(), 500); }

function master(PDO $pdo, string $entity, ?int $id, string $method): never
{
    $fields = [
        'vendors' => ['name','address','mobile','website','email','vendor_type','status'],
        'raw_materials' => ['name','unit','status'],
        'packaging_materials' => ['name','material_type','vendor_id','description','status'],
        'products' => ['name','sku','category','description','status'],
    ][$entity];
    if ($method === 'GET') {
        if ($id) { $statement = $pdo->prepare("SELECT * FROM {$entity} WHERE id = ?"); $statement->execute([$id]); $row = $statement->fetch(); $row ? json_response($row) : fail('Record not found.', 404); }
        json_response($pdo->query("SELECT * FROM {$entity} ORDER BY id DESC")->fetchAll());
    }
    $data = request_data();
    if (empty(trim((string) ($data['name'] ?? '')))) fail('Name is required.');
    $payload = []; foreach ($fields as $field) if (array_key_exists($field, $data)) $payload[$field] = $data[$field] === '' ? null : $data[$field];
    if ($method === 'POST') {
        $sql = sprintf('INSERT INTO %s (%s) VALUES (%s)', $entity, implode(',', array_keys($payload)), implode(',', array_fill(0, count($payload), '?')));
        $pdo->prepare($sql)->execute(array_values($payload)); json_response(['id' => (int) $pdo->lastInsertId()], 201);
    }
    if ($method === 'PUT' && $id) {
        $sql = sprintf('UPDATE %s SET %s WHERE id = ?', $entity, implode(',', array_map(fn($field) => "{$field} = ?", array_keys($payload))));
        $statement = $pdo->prepare($sql); $statement->execute([...array_values($payload), $id]); $statement->rowCount() ? json_response(['id' => $id]) : fail('Record not found.', 404);
    }
    if ($method === 'DELETE' && $id) { $statement = $pdo->prepare("DELETE FROM {$entity} WHERE id = ?"); $statement->execute([$id]); $statement->rowCount() ? json_response(['success' => true]) : fail('Record not found.', 404); }
    fail('Method not allowed.', 405);
}

function dashboard(PDO $pdo): never
{
    $value = fn(string $sql): float => (float) $pdo->query($sql)->fetchColumn();
    $recentPurchases = $pdo->query("(SELECT 'Raw' AS type, rp.id, rm.name AS item, v.name AS vendor, rp.purchase_date, rp.purchase_price AS total FROM raw_material_purchases rp JOIN raw_materials rm ON rm.id=rp.raw_material_id JOIN vendors v ON v.id=rp.vendor_id) UNION ALL (SELECT 'Packaging', pp.id, pm.name, v.name, pp.purchase_date, pp.total_cost FROM packaging_purchases pp JOIN packaging_materials pm ON pm.id=pp.packaging_material_id JOIN vendors v ON v.id=pp.vendor_id) ORDER BY purchase_date DESC LIMIT 6")->fetchAll();
    $recentPricing = $pdo->query('SELECT pc.id, p.name AS product, pc.calculation_date, COUNT(pv.id) AS variants FROM pricing_calculations pc JOIN products p ON p.id=pc.product_id LEFT JOIN product_variants pv ON pv.pricing_calculation_id=pc.id GROUP BY pc.id ORDER BY pc.id DESC LIMIT 5')->fetchAll();
    json_response(['total_products' => $value('SELECT COUNT(*) FROM products'), 'total_raw_material_vendors' => $value("SELECT COUNT(*) FROM vendors WHERE vendor_type IN ('Raw Material','Both')"), 'total_packaging_materials' => $value('SELECT COUNT(*) FROM packaging_materials'), 'total_vendors' => $value('SELECT COUNT(*) FROM vendors'), 'raw_purchase_value' => $value('SELECT COALESCE(SUM(purchase_price),0) FROM raw_material_purchases'), 'packaging_purchase_value' => $value('SELECT COALESCE(SUM(total_cost),0) FROM packaging_purchases'), 'recentPurchases' => $recentPurchases, 'recentPricing' => $recentPricing]);
}

function createRawPurchase(PDO $pdo): never
{
    $data = request_data(); $calc = PricingCalculator::rawPurchase($data);
    $fields = ['vendor_id','raw_material_id','purchase_date','quantity','unit','purchase_price','wastage_percent','usable_quantity','cost_per_kg','cost_per_gram','cost_per_piece','status'];
    $record = [...$data, 'usable_quantity' => $calc['usable'], ...$calc, 'status' => $data['status'] ?? 'Active'];
    insert($pdo, 'raw_material_purchases', $fields, $record); json_response(['id' => (int) $pdo->lastInsertId()], 201);
}

function createPackagingPurchase(PDO $pdo): never
{
    $data = request_data(); $calc = PricingCalculator::packagingPurchase($data); $fields = ['packaging_material_id','vendor_id','purchase_date','quantity','unit','purchase_cost','shipping_cost','other_cost','total_cost','individual_piece_cost'];
    $pdo->beginTransaction();
    try { insert($pdo, 'packaging_purchases', $fields, [...$data, ...$calc]); $id = (int) $pdo->lastInsertId(); $pdo->prepare('UPDATE packaging_materials SET current_individual_cost = ? WHERE id = ?')->execute([$calc['individual_piece_cost'], $data['packaging_material_id']]); $pdo->commit(); json_response(['id' => $id], 201); }
    catch (Throwable $error) { $pdo->rollBack(); throw $error; }
}

function createPricingCalculation(PDO $pdo): never
{
    $data = request_data(); if (empty($data['product_id']) || empty($data['raw_material_purchase_id']) || empty($data['variants']) || !is_array($data['variants'])) fail('Product, raw material purchase, and at least one variant are required.');
    $statement = $pdo->prepare('SELECT * FROM raw_material_purchases WHERE id = ?'); $statement->execute([$data['raw_material_purchase_id']]); $purchase = $statement->fetch(); if (!$purchase) fail('Raw material purchase was not found.');
    $pdo->beginTransaction();
    try {
        $header = ['product_id' => $data['product_id'], 'raw_material_purchase_id' => $purchase['id'], 'vendor_id' => $purchase['vendor_id'], 'raw_material_id' => $purchase['raw_material_id'], 'purchase_quantity' => $purchase['quantity'], 'purchase_unit' => $purchase['unit'], 'purchase_price' => $purchase['purchase_price'], 'wastage_percent' => $purchase['wastage_percent'], 'usable_quantity' => $purchase['usable_quantity'], 'effective_cost_per_kg' => $purchase['cost_per_kg'], 'effective_cost_per_gram' => $purchase['cost_per_gram'], 'effective_cost_per_piece' => $purchase['cost_per_piece'], 'notes' => $data['notes'] ?? null];
        insert($pdo, 'pricing_calculations', array_keys($header), $header); $id = (int) $pdo->lastInsertId();
        foreach ($data['variants'] as $variant) {
            $packaging = $pdo->prepare('SELECT id, name, current_individual_cost FROM packaging_materials WHERE id = ?'); $packaging->execute([$variant['packaging_material_id'] ?? 0]); $packaging = $packaging->fetch(); if (!$packaging) fail('Select a valid packaging material for every variant.');
            $variant = [...$variant, 'pricing_calculation_id' => $id, 'packaging_material_name' => $packaging['name'], 'packaging_cost' => $packaging['current_individual_cost'], 'stickering_cost' => $variant['stickering_cost'] ?? 0, 'labour_cost' => $variant['labour_cost'] ?? 0];
            $variant = [...$variant, ...PricingCalculator::variant($purchase, $variant)];
            insert($pdo, 'product_variants', ['pricing_calculation_id','variant_name','quantity','unit','packaging_material_id','packaging_material_name','packaging_cost','stickering_cost','labour_cost','raw_material_cost','landing_cost','profit_percent','mrp','customer_discount_type','customer_discount_value','selling_price','dealer_discount_percent','dealer_price'], $variant);
        }
        $pdo->commit(); json_response(['id' => $id], 201);
    } catch (Throwable $error) { $pdo->rollBack(); throw $error; }
}

function insert(PDO $pdo, string $table, array $fields, array $data): void { $pdo->prepare(sprintf('INSERT INTO %s (%s) VALUES (%s)', $table, implode(',', $fields), implode(',', array_fill(0, count($fields), '?'))))->execute(array_map(fn($field) => $data[$field] ?? null, $fields)); }
function purchaseList(PDO $pdo, string $route): never { $sql = match($route) { 'raw_material_purchases' => 'SELECT rp.*, rm.name raw_material_name, v.name vendor_name FROM raw_material_purchases rp JOIN raw_materials rm ON rm.id=rp.raw_material_id JOIN vendors v ON v.id=rp.vendor_id ORDER BY rp.id DESC', 'packaging_purchases' => 'SELECT pp.*, pm.name packaging_material_name, v.name vendor_name FROM packaging_purchases pp JOIN packaging_materials pm ON pm.id=pp.packaging_material_id JOIN vendors v ON v.id=pp.vendor_id ORDER BY pp.id DESC', default => 'SELECT pc.*, p.name product_name, rm.name raw_material_name, v.name vendor_name FROM pricing_calculations pc JOIN products p ON p.id=pc.product_id JOIN raw_materials rm ON rm.id=pc.raw_material_id JOIN vendors v ON v.id=pc.vendor_id ORDER BY pc.id DESC' }; json_response($pdo->query($sql)->fetchAll()); }
function calculation(PDO $pdo, int $id): never { $statement = $pdo->prepare('SELECT * FROM pricing_calculations WHERE id = ?'); $statement->execute([$id]); $record = $statement->fetch(); if (!$record) fail('Calculation not found.', 404); $variants = $pdo->prepare('SELECT * FROM product_variants WHERE pricing_calculation_id = ?'); $variants->execute([$id]); json_response([...$record, 'variants' => $variants->fetchAll()]); }
function report(PDO $pdo, int $id): never { $statement = $pdo->prepare('SELECT pc.*, p.name product_name, p.sku, rm.name raw_material_name, v.name vendor_name FROM pricing_calculations pc JOIN products p ON p.id=pc.product_id JOIN raw_materials rm ON rm.id=pc.raw_material_id JOIN vendors v ON v.id=pc.vendor_id WHERE pc.id = ?'); $statement->execute([$id]); $c = $statement->fetch(); if (!$c) { http_response_code(404); exit('Report not found.'); } $variants = $pdo->prepare('SELECT * FROM product_variants WHERE pricing_calculation_id = ?'); $variants->execute([$id]); header('Content-Type: text/html; charset=utf-8'); require __DIR__ . '/report.php'; exit; }
