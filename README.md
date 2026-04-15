# Resource Planning + Utilization + Revenue Projection App

Lightweight internal admin app built using **Node.js (Express)**, **MySQL**, and **Bootstrap 5 + vanilla JS**.

## Features

- Resource Master + comments + utilization summary
- Resource Type Master with rate cards
- Project Master
- Actual Allocations
- Skill Matrix (skills + resource skills)
- Projection Scenarios and Project Demand Planning
- Month-wise projection timeline summary API and UI
- Project-wise timeline view
- Designation-wise summary (included in summary payload)
- Bench forecast list
- Dashboard metrics + Chart.js visualizations
- CSV export for scenario summary

## Tech Stack

- Backend: Node.js + Express
- Database: MySQL (`mysql2`)
- Frontend: Bootstrap 5, HTML, CSS, JavaScript, Chart.js

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Update `.env` with your MySQL credentials.

4. Create schema and seed data:

```bash
mysql -u root -p < schema.sql
mysql -u root -p < seed.sql
```

5. Start app:

```bash
npm start
```

Open: `http://localhost:3000`

## Required Tables Included

- resources
- resource_comments
- resource_types
- projects
- allocations
- skills
- resource_skills
- projection_scenarios
- scenario_project_demands

## Key APIs

- CRUD for: `/api/resources`, `/api/resource_types`, `/api/projects`, `/api/allocations`, `/api/skills`, `/api/resource_skills`, `/api/projection_scenarios`, `/api/scenario_project_demands`
- Resource list summary: `GET /api/resources/summary/list`
- Dashboard: `GET /api/dashboard`
- Projection summary: `GET /api/projection/:scenarioId/summary`
- Project timeline: `GET /api/projection/:scenarioId/project-wise`
- Bench list: `GET /api/projection/:scenarioId/bench?month=YYYY-MM`
- CSV export: `GET /api/reports/scenario/:scenarioId/csv`

## Notes

- No multi-user role management included (single admin usage).
- Login is intentionally skipped as requested.
- Projection module is planning-only and separate from actual allocations.
