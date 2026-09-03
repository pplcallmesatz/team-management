CREATE DATABASE IF NOT EXISTS product_pricing;
USE product_pricing;

CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address TEXT,
  mobile VARCHAR(40),
  website VARCHAR(255),
  email VARCHAR(160),
  vendor_type ENUM('Raw Material','Packaging Material','Both') NOT NULL DEFAULT 'Both',
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vendor_type (vendor_type), INDEX idx_vendor_status (status)
);

CREATE TABLE raw_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  unit ENUM('KG','Gram','Piece') NOT NULL DEFAULT 'KG',
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE raw_material_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT NOT NULL,
  raw_material_id INT NOT NULL,
  purchase_date DATE NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit ENUM('KG','Gram','Piece') NOT NULL,
  purchase_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  wastage_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  usable_quantity DECIMAL(14,4) NOT NULL,
  cost_per_kg DECIMAL(14,4),
  cost_per_gram DECIMAL(14,6),
  cost_per_piece DECIMAL(14,4),
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
  INDEX idx_raw_purchase_filters (vendor_id, raw_material_id, purchase_date)
);

CREATE TABLE packaging_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  material_type VARCHAR(80) NOT NULL,
  vendor_id INT,
  description TEXT,
  current_individual_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

CREATE TABLE packaging_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  packaging_material_id INT NOT NULL,
  vendor_id INT NOT NULL,
  purchase_date DATE NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit VARCHAR(30) NOT NULL DEFAULT 'Piece',
  purchase_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  other_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(14,4) NOT NULL,
  individual_piece_cost DECIMAL(14,4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (packaging_material_id) REFERENCES packaging_materials(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  INDEX idx_packaging_purchase_filters (packaging_material_id, vendor_id, purchase_date)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  category VARCHAR(120),
  description TEXT,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pricing_calculations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  raw_material_purchase_id INT NOT NULL,
  vendor_id INT NOT NULL,
  raw_material_id INT NOT NULL,
  calculation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  purchase_quantity DECIMAL(14,4) NOT NULL,
  purchase_unit VARCHAR(20) NOT NULL,
  purchase_price DECIMAL(14,4) NOT NULL,
  wastage_percent DECIMAL(8,4) NOT NULL,
  usable_quantity DECIMAL(14,4) NOT NULL,
  effective_cost_per_kg DECIMAL(14,4),
  effective_cost_per_gram DECIMAL(14,6),
  effective_cost_per_piece DECIMAL(14,4),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (raw_material_purchase_id) REFERENCES raw_material_purchases(id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
  INDEX idx_pricing_history (product_id, calculation_date)
);

CREATE TABLE product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pricing_calculation_id INT NOT NULL,
  variant_name VARCHAR(120) NOT NULL,
  quantity DECIMAL(14,4) NOT NULL,
  unit ENUM('KG','Gram','Piece') NOT NULL,
  packaging_material_id INT NOT NULL,
  packaging_material_name VARCHAR(160) NOT NULL,
  packaging_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  stickering_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  labour_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  raw_material_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  landing_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  profit_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  mrp DECIMAL(14,4) NOT NULL DEFAULT 0,
  customer_discount_type ENUM('Percentage','Flat') NOT NULL DEFAULT 'Percentage',
  customer_discount_value DECIMAL(14,4) NOT NULL DEFAULT 0,
  selling_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  dealer_discount_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  dealer_price DECIMAL(14,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pricing_calculation_id) REFERENCES pricing_calculations(id) ON DELETE CASCADE,
  FOREIGN KEY (packaging_material_id) REFERENCES packaging_materials(id)
);
