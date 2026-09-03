# Product Pricing & Costing Application

A PHP 8.2+ and MySQL application for recording vendor purchases and calculating immutable product-costing snapshots by variant. It calculates wastage-adjusted raw-material costs, packaging landed cost, product landing cost, MRP, customer selling prices, and dealer prices.

## Technology

- **Backend:** native PHP 8.2+ with PDO/MySQL and a centralized `PricingCalculator` service.
- **Frontend:** responsive Bootstrap dashboard with vanilla JavaScript for immediate recalculation.
- **Database:** MySQL 8+ schema with foreign keys and immutable calculation/variant snapshots.
- **Report:** print-ready business report available from Pricing History; the browser print dialog can save it as PDF.

## Setup

1. Create the database schema:

   ```bash
   mysql -u root -p < schema.sql
   ```

   Optional demo masters and purchases are available with:

   ```bash
   mysql -u root -p < seed.sql
   ```

2. Configure database access:

   ```bash
   cp .env.example .env
   ```

3. Run the PHP development server from the repository root:

   ```bash
   php -S localhost:8000 router.php
   ```

4. Open `http://localhost:8000`.

## Core routes

- `public/api.php?route=vendors` — Vendor master CRUD.
- `public/api.php?route=raw_material_purchases` — Raw purchase list/create with wastage calculations.
- `public/api.php?route=packaging_purchases` — Packaging purchase list/create with landed cost calculation.
- `public/api.php?route=pricing_calculations` — Immutable pricing history list/create.
- `public/api.php?route=pricing_calculations/{id}/report` — Professional print-ready costing report.

## Business rules

- KG and Gram convert centrally; Piece remains independent.
- Wastage must be at least 0 and less than 100, with up to four decimal places.
- Product pricing stores raw-purchase values plus packaging and calculated variant values at the time it is saved, so later master-price changes cannot alter history.
