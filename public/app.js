const api = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url}`);
  return res.json();
};

const renderTable = (elId, rows) => {
  const el = document.getElementById(elId);
  if (!rows?.length) {
    el.innerHTML = '<tr><td class="text-muted">No data</td></tr>';
    return;
  }
  const cols = Object.keys(rows[0]);
  el.innerHTML = `<thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
};

const showSection = (name) => {
  document.querySelectorAll('.app-section').forEach((s) => s.classList.add('d-none'));
  document.getElementById(`${name}Section`).classList.remove('d-none');
};

document.querySelectorAll('.menu-btn').forEach((btn) => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});

let spendRevenueChart;
let utilizationChart;
let projectionChart;

const loadDashboard = async () => {
  const data = await api('/api/dashboard');
  const cards = [
    ['Total Active Resources', data.total_active_resources],
    ['Current Utilization %', data.current_utilization_percent],
    ['Bench Count', data.bench_count],
    ['Monthly Salary Spend', data.total_monthly_salary_spend],
    ['Monthly Revenue Potential', data.total_monthly_revenue_potential],
    ['Profit', data.profit]
  ];
  document.getElementById('dashboardCards').innerHTML = cards.map(([k, v]) => `<div class="col-md-4"><div class="card metric-card"><div class="card-body"><h6>${k}</h6><h4>${v}</h4></div></div></div>`).join('');

  if (spendRevenueChart) spendRevenueChart.destroy();
  if (utilizationChart) utilizationChart.destroy();
  spendRevenueChart = new Chart(document.getElementById('spendRevenueChart'), {
    type: 'bar',
    data: { labels: ['Salary Spend', 'Revenue', 'Profit'], datasets: [{ label: 'Amount', data: [data.total_monthly_salary_spend, data.total_monthly_revenue_potential, data.profit] }] }
  });
  utilizationChart = new Chart(document.getElementById('utilizationChart'), {
    type: 'doughnut',
    data: { labels: ['Utilized', 'Bench'], datasets: [{ data: [data.current_utilization_percent, Math.max(100 - data.current_utilization_percent, 0)] }] }
  });
};

const loadMasterTables = async () => {
  const [resources, resourceTypes, projects, allocations, skills, scenarios] = await Promise.all([
    api('/api/resources/summary/list'), api('/api/resource_types'), api('/api/projects'), api('/api/allocations'), api('/api/resource_skills'), api('/api/projection_scenarios')
  ]);

  window._resources = resources;
  renderTable('resourcesTable', resources);
  renderTable('resourceTypesTable', resourceTypes);
  renderTable('projectsTable', projects);
  renderTable('allocationsTable', allocations);
  renderTable('skillsTable', skills);
  renderTable('scenariosTable', scenarios);

  const select = document.getElementById('scenarioSelect');
  select.innerHTML = scenarios.map((s) => `<option value="${s.scenario_id}">${s.scenario_name}</option>`).join('');
};

document.getElementById('resourceSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderTable('resourcesTable', (window._resources || []).filter((r) => String(r.name).toLowerCase().includes(q)));
});

const loadTimeline = async () => {
  const scenarioId = document.getElementById('scenarioSelect').value;
  if (!scenarioId) return;

  const summaryResp = await api(`/api/projection/${scenarioId}/summary`);
  renderTable('timelineTable', summaryResp.summary);

  if (projectionChart) projectionChart.destroy();
  projectionChart = new Chart(document.getElementById('projectionChart'), {
    type: 'line',
    data: {
      labels: summaryResp.summary.map((m) => m.month),
      datasets: [
        { label: 'Demand', data: summaryResp.summary.map((m) => m.total_demand) },
        { label: 'Available', data: summaryResp.summary.map((m) => m.total_available) },
        { label: 'Profit', data: summaryResp.summary.map((m) => m.profit_estimate) }
      ]
    }
  });

  const projectWise = await api(`/api/projection/${scenarioId}/project-wise`);
  const flatRows = projectWise.flatMap((p) => p.timeline.map((t) => ({ project_name: p.project_name, month: t.month, required_resources: t.required_resources })));
  renderTable('projectTimelineTable', flatRows);
};

document.getElementById('loadTimeline').addEventListener('click', loadTimeline);

document.getElementById('loadBench').addEventListener('click', async () => {
  const scenarioId = document.getElementById('scenarioSelect').value;
  const month = document.getElementById('benchMonth').value;
  if (!scenarioId || !month) return;
  const resp = await api(`/api/projection/${scenarioId}/bench?month=${month}`);
  renderTable('benchTable', resp.bench_resources);
});

document.getElementById('downloadCsv').addEventListener('click', () => {
  const scenarioId = document.getElementById('scenarioSelect').value;
  if (!scenarioId) return;
  window.open(`/api/reports/scenario/${scenarioId}/csv`, '_blank');
});

(async function init() {
  await loadDashboard();
  await loadMasterTables();
  if (document.getElementById('scenarioSelect').value) {
    await loadTimeline();
  }
})();
