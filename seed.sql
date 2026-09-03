USE product_pricing;

INSERT INTO vendors (name, address, mobile, email, vendor_type, status) VALUES
('Nature Source Traders', 'Pune, Maharashtra', '9876543210', 'orders@naturesource.test', 'Raw Material', 'Active'),
('PackRight Supplies', 'Mumbai, Maharashtra', '9988776655', 'sales@packright.test', 'Packaging Material', 'Active');

INSERT INTO raw_materials (name, unit, status) VALUES
('Organic Honey', 'KG', 'Active'),
('Loose Leaf Tea', 'KG', 'Active');

INSERT INTO raw_material_purchases (vendor_id, raw_material_id, purchase_date, quantity, unit, purchase_price, wastage_percent, usable_quantity, cost_per_kg, cost_per_gram, status) VALUES
(1, 1, '2026-09-01', 10, 'KG', 900, 5, 9, 100, 0.100000, 'Active');

INSERT INTO packaging_materials (name, material_type, vendor_id, description, current_individual_cost, status) VALUES
('250g Glass Bottle', 'Glass Bottle', 2, 'Food-safe bottle for 250g honey variant.', 12, 'Active'),
('500g Glass Bottle', 'Glass Bottle', 2, 'Food-safe bottle for 500g honey variant.', 16, 'Active');

INSERT INTO packaging_purchases (packaging_material_id, vendor_id, purchase_date, quantity, unit, purchase_cost, shipping_cost, other_cost, total_cost, individual_piece_cost) VALUES
(1, 2, '2026-09-01', 1000, 'Piece', 10000, 1000, 1000, 12000, 12),
(2, 2, '2026-09-01', 1000, 'Piece', 14000, 1000, 1000, 16000, 16);

INSERT INTO products (name, sku, category, description, status) VALUES
('Organic Honey', 'HNY-ORG', 'Honey', 'Natural honey variants with bottle packaging.', 'Active');
