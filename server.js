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

const monthRange = (startMonth, endMonth) => {
  const months = [];
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
};

const crudConfig = {
  resources: { table: 'resources', pk: 'resource_id' },
  resource_types: { table: 'resource_types', pk: 'resource_type_id' },
  projects: { table: 'projects', pk: 'project_id' },
  allocations: { table: 'allocations', pk: 'allocation_id' },
  skills: { table: 'skills', pk: 'skill_id' },
  resource_skills: { table: 'resource_skills', pk: 'resource_skill_id' },
  projection_scenarios: { table: 'projection_scenarios', pk: 'scenario_id' },
  scenario_project_demands: { table: 'scenario_project_demands', pk: 'demand_id' },
  resource_comments: { table: 'resource_comments', pk: 'comment_id' }
};

for (const [route, cfg] of Object.entries(crudConfig)) {
  app.get(`/api/${route}`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${cfg.table} ORDER BY ${cfg.pk} DESC`);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(`/api/${route}/:id`, async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${cfg.table} WHERE ${cfg.pk} = ?`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(`/api/${route}`, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload[cfg.pk];
      const keys = Object.keys(payload);
      if (!keys.length) return res.status(400).json({ error: 'No data provided' });
      const placeholders = keys.map(() => '?').join(',');
      const [result] = await pool.query(
        `INSERT INTO ${cfg.table} (${keys.join(',')}) VALUES (${placeholders})`,
        keys.map((k) => payload[k])
      );
      res.status(201).json({ id: result.insertId, ...payload });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put(`/api/${route}/:id`, async (req, res) => {
    try {
      const payload = { ...req.body };
      delete payload[cfg.pk];
      const keys = Object.keys(payload);
      if (!keys.length) return res.status(400).json({ error: 'No data provided' });
      const setClause = keys.map((k) => `${k} = ?`).join(', ');
      const [result] = await pool.query(
        `UPDATE ${cfg.table} SET ${setClause} WHERE ${cfg.pk} = ?`,
        [...keys.map((k) => payload[k]), req.params.id]
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
      res.json({ id: req.params.id, ...payload });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete(`/api/${route}/:id`, async (req, res) => {
    try {
      const [result] = await pool.query(`DELETE FROM ${cfg.table} WHERE ${cfg.pk} = ?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

app.get('/api/resources/summary/list', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        r.resource_id,
        r.name,
        rt.type_name,
        ROUND((TIMESTAMPDIFF(MONTH, r.date_of_joining, CURDATE())/12) + IFNULL(r.past_experience,0),2) AS total_experience,
        r.current_ctc,
        IFNULL(SUM(a.utilization_percentage),0) AS utilization_percent,
        GREATEST(100 - IFNULL(SUM(a.utilization_percentage),0),0) AS bench_percent,
        COUNT(a.allocation_id) AS active_allocations_count,
        r.status
      FROM resources r
      LEFT JOIN resource_types rt ON rt.resource_type_id = r.resource_type_id
      LEFT JOIN allocations a
        ON a.resource_id = r.resource_id
       AND CURDATE() BETWEEN a.from_date AND a.to_date
      GROUP BY r.resource_id
      ORDER BY r.name
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const [[active]] = await pool.query("SELECT COUNT(*) AS total FROM resources WHERE status='Active'");
    const [[salary]] = await pool.query("SELECT IFNULL(SUM(current_ctc/12),0) AS monthly_salary FROM resources WHERE status='Active'");
    const [[util]] = await pool.query(`
      SELECT IFNULL(SUM(a.utilization_percentage),0) AS total_util
      FROM allocations a
      JOIN resources r ON r.resource_id = a.resource_id
      WHERE r.status='Active' AND CURDATE() BETWEEN a.from_date AND a.to_date
    `);
    const [[bench]] = await pool.query(`
      SELECT COUNT(*) AS bench_count FROM resources r
      LEFT JOIN allocations a ON a.resource_id=r.resource_id AND CURDATE() BETWEEN a.from_date AND a.to_date
      WHERE r.status='Active'
      GROUP BY r.resource_id
      HAVING IFNULL(SUM(a.utilization_percentage),0)=0
    `).catch(() => [[{ bench_count: 0 }]]);

    const [revenues] = await pool.query(`
      SELECT IFNULL(SUM((a.utilization_percentage/100) * ((rt.rate_card_min + rt.rate_card_max)/2)),0) AS monthly_revenue
      FROM allocations a
      JOIN resources r ON r.resource_id = a.resource_id
      JOIN resource_types rt ON rt.resource_type_id = r.resource_type_id
      WHERE r.status='Active' AND CURDATE() BETWEEN a.from_date AND a.to_date
    `);

    const monthlyRevenue = Number(revenues[0]?.monthly_revenue || 0);
    const monthlySalary = Number(salary.monthly_salary || 0);

    res.json({
      total_active_resources: active.total,
      current_utilization_percent: active.total ? Number((util.total_util / active.total).toFixed(2)) : 0,
      bench_count: bench?.bench_count || 0,
      total_monthly_salary_spend: Number(monthlySalary.toFixed(2)),
      total_monthly_revenue_potential: Number(monthlyRevenue.toFixed(2)),
      profit: Number((monthlyRevenue - monthlySalary).toFixed(2))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projection/:scenarioId/summary', async (req, res) => {
  try {
    const [scenarioRows] = await pool.query('SELECT * FROM projection_scenarios WHERE scenario_id=?', [req.params.scenarioId]);
    if (!scenarioRows.length) return res.status(404).json({ error: 'Scenario not found' });
    const scenario = scenarioRows[0];

    const months = monthRange(scenario.start_month, scenario.end_month);

    const [resourceTypes] = await pool.query('SELECT resource_type_id, type_name, rate_card_min, rate_card_max FROM resource_types ORDER BY resource_type_id');
    const [availableRows] = await pool.query(`
      SELECT resource_type_id, COUNT(*) AS available_count
      FROM resources
      WHERE status='Active'
      GROUP BY resource_type_id
    `);
    const [salaryRows] = await pool.query("SELECT IFNULL(SUM(current_ctc/12),0) AS salary_monthly FROM resources WHERE status='Active'");
    const [demandRows] = await pool.query(`
      SELECT month, resource_type_id, SUM(required_count * (utilization_percentage/100)) AS demand_count
      FROM scenario_project_demands
      WHERE scenario_id=?
      GROUP BY month, resource_type_id
    `, [req.params.scenarioId]);

    const availableByType = Object.fromEntries(availableRows.map((r) => [r.resource_type_id, Number(r.available_count)]));
    const demandMap = {};
    for (const row of demandRows) {
      demandMap[`${row.month}|${row.resource_type_id}`] = Number(row.demand_count);
    }
    const salaryMonthly = Number(salaryRows[0]?.salary_monthly || 0);

    const summary = months.map((month) => {
      let totalAvailable = 0;
      let totalDemand = 0;
      let totalOccupied = 0;
      let totalBench = 0;
      let totalShortage = 0;
      let revenue = 0;

      const designations = resourceTypes.map((rt) => {
        const available = availableByType[rt.resource_type_id] || 0;
        const demand = Number((demandMap[`${month}|${rt.resource_type_id}`] || 0).toFixed(2));
        const occupied = Math.min(available, demand);
        const bench = Math.max(available - demand, 0);
        const shortage = Math.max(demand - available, 0);
        const avgRate = (Number(rt.rate_card_min) + Number(rt.rate_card_max)) / 2;
        const typeRevenue = occupied * avgRate;

        totalAvailable += available;
        totalDemand += demand;
        totalOccupied += occupied;
        totalBench += bench;
        totalShortage += shortage;
        revenue += typeRevenue;

        return {
          resource_type_id: rt.resource_type_id,
          type_name: rt.type_name,
          available_count: Number(available.toFixed ? available.toFixed(2) : available),
          demand_count: Number(demand.toFixed(2)),
          occupied_count: Number(occupied.toFixed(2)),
          bench_count: Number(bench.toFixed(2)),
          shortage_count: Number(shortage.toFixed(2)),
          revenue: Number(typeRevenue.toFixed(2))
        };
      });

      return {
        month,
        total_available: Number(totalAvailable.toFixed(2)),
        total_demand: Number(totalDemand.toFixed(2)),
        occupied_count: Number(totalOccupied.toFixed(2)),
        bench_count: Number(totalBench.toFixed(2)),
        shortage_count: Number(totalShortage.toFixed(2)),
        salary_spend: Number(salaryMonthly.toFixed(2)),
        revenue_potential: Number(revenue.toFixed(2)),
        profit_estimate: Number((revenue - salaryMonthly).toFixed(2)),
        designations
      };
    });

    res.json({ scenario, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projection/:scenarioId/project-wise', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.project_id, p.project_name, spd.month,
             SUM(spd.required_count * (spd.utilization_percentage/100)) AS required_resources
      FROM scenario_project_demands spd
      JOIN projects p ON p.project_id = spd.project_id
      WHERE spd.scenario_id=?
      GROUP BY p.project_id, p.project_name, spd.month
      ORDER BY p.project_name, spd.month
    `, [req.params.scenarioId]);

    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.project_id]) {
        grouped[row.project_id] = { project_id: row.project_id, project_name: row.project_name, timeline: [] };
      }
      grouped[row.project_id].timeline.push({ month: row.month, required_resources: Number(row.required_resources) });
    }
    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projection/:scenarioId/bench', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'month query param required (YYYY-MM)' });

    const [resources] = await pool.query(`
      SELECT r.resource_id, r.name, r.resource_type_id, rt.type_name
      FROM resources r
      JOIN resource_types rt ON rt.resource_type_id = r.resource_type_id
      WHERE r.status='Active'
      ORDER BY r.resource_type_id, r.name
    `);

    const [demand] = await pool.query(`
      SELECT resource_type_id, SUM(required_count * (utilization_percentage/100)) AS demand_count
      FROM scenario_project_demands
      WHERE scenario_id=? AND month=?
      GROUP BY resource_type_id
    `, [req.params.scenarioId, month]);

    const demandByType = Object.fromEntries(demand.map((d) => [d.resource_type_id, Number(d.demand_count)]));
    const grouped = {};
    resources.forEach((r) => {
      if (!grouped[r.resource_type_id]) grouped[r.resource_type_id] = [];
      grouped[r.resource_type_id].push(r);
    });

    const benchResources = [];
    for (const [typeId, list] of Object.entries(grouped)) {
      const needed = Math.ceil(demandByType[typeId] || 0);
      benchResources.push(...list.slice(needed));
    }

    res.json({ month, bench_resources: benchResources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/scenario/:scenarioId/csv', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/projection/${req.params.scenarioId}/summary`);
    const data = await response.json();
    if (!data.summary) return res.status(400).json(data);

    const headers = ['Month', 'Total Available', 'Total Demand', 'Occupied', 'Bench', 'Shortage', 'Salary Spend', 'Revenue Potential', 'Profit'];
    const rows = data.summary.map((s) => [s.month, s.total_available, s.total_demand, s.occupied_count, s.bench_count, s.shortage_count, s.salary_spend, s.revenue_potential, s.profit_estimate]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="scenario_${req.params.scenarioId}_summary.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
