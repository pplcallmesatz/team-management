const api = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Failed: ${url}`;
    try {
      const err = await res.json();
      message = err.error || message;
    } catch (_e) {}
    throw new Error(message);
  }
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

const renderCrudTable = (elId, rows, entity) => {
  const el = document.getElementById(elId);
  if (!rows?.length) {
    el.innerHTML = '<tr><td class="text-muted">No data</td></tr>';
    return;
  }
  const cols = Object.keys(rows[0]).filter((c) => !c.endsWith('_at'));
  const pk = entityConfigs[entity].pk;

  el.innerHTML = `
    <thead>
      <tr>
        ${cols.map((c) => `<th>${c}</th>`).join('')}
        <th>actions</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          ${cols.map((c) => `<td>${row[c] ?? ''}</td>`).join('')}
          <td>
            <button class="btn btn-outline-secondary btn-sm" data-edit="${entity}" data-id="${row[pk]}">Edit</button>
            <button class="btn btn-outline-danger btn-sm ms-1" data-delete="${entity}" data-id="${row[pk]}">Delete</button>
          </td>
        </tr>
      `).join('')}
    </tbody>`;
};

const showSection = (name) => {
  document.querySelectorAll('.app-section').forEach((s) => s.classList.add('d-none'));
  document.getElementById(`${name}Section`).classList.remove('d-none');
};

document.querySelectorAll('.menu-btn').forEach((btn) => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});

const entityConfigs = {
  resources: {
    pk: 'resource_id',
    fields: [
      { name: 'name', required: true },
      { name: 'date_of_joining', type: 'date', required: true },
      { name: 'past_experience', type: 'number', step: '0.01' },
      { name: 'resource_type_id', type: 'select', source: 'resource_types', labelKey: 'type_name', valueKey: 'resource_type_id', required: true },
      { name: 'current_ctc', type: 'number', step: '0.01', required: true },
      { name: 'status', type: 'select', options: ['Active', 'Inactive'], required: true },
      { name: 'notes', type: 'textarea' }
    ]
  },
  resource_types: {
    pk: 'resource_type_id',
    fields: [
      { name: 'type_name', required: true }, { name: 'rate_card_min', type: 'number', step: '0.01', required: true },
      { name: 'rate_card_max', type: 'number', step: '0.01', required: true }, { name: 'salary_ctc_min', type: 'number', step: '0.01' },
      { name: 'salary_ctc_max', type: 'number', step: '0.01' }, { name: 'description', type: 'textarea' }
    ]
  },
  projects: {
    pk: 'project_id',
    fields: [
      { name: 'project_name', required: true }, { name: 'client_name' }, { name: 'project_owner' },
      { name: 'start_date', type: 'date' }, { name: 'end_date', type: 'date' },
      { name: 'status', type: 'select', options: ['Ongoing', 'Completed', 'Upcoming'], required: true },
      { name: 'notes', type: 'textarea' }
    ]
  },
  allocations: {
    pk: 'allocation_id',
    fields: [
      { name: 'resource_id', type: 'select', source: 'resources', labelKey: 'name', valueKey: 'resource_id', required: true },
      { name: 'project_id', type: 'select', source: 'projects', labelKey: 'project_name', valueKey: 'project_id', required: true },
      { name: 'from_date', type: 'date', required: true }, { name: 'to_date', type: 'date', required: true },
      { name: 'utilization_percentage', type: 'number', step: '0.01', required: true },
      { name: 'notes', type: 'textarea' }
    ]
  },
  skills: {
    pk: 'skill_id',
    fields: [{ name: 'skill_name', required: true }, { name: 'category' }]
  },
  resource_skills: {
    pk: 'resource_skill_id',
    fields: [
      { name: 'resource_id', type: 'select', source: 'resources', labelKey: 'name', valueKey: 'resource_id', required: true },
      { name: 'skill_id', type: 'select', source: 'skills', labelKey: 'skill_name', valueKey: 'skill_id', required: true },
      { name: 'level', type: 'number', min: 0, max: 5, required: true }
    ]
  },
  projection_scenarios: {
    pk: 'scenario_id',
    fields: [
      { name: 'scenario_name', required: true },
      { name: 'start_month', type: 'month', required: true },
      { name: 'end_month', type: 'month', required: true },
      { name: 'notes', type: 'textarea' }
    ]
  },
  scenario_project_demands: {
    pk: 'demand_id',
    fields: [
      { name: 'scenario_id', type: 'select', source: 'projection_scenarios', labelKey: 'scenario_name', valueKey: 'scenario_id', required: true },
      { name: 'project_id', type: 'select', source: 'projects', labelKey: 'project_name', valueKey: 'project_id', required: true },
      { name: 'month', type: 'month', required: true },
      { name: 'resource_type_id', type: 'select', source: 'resource_types', labelKey: 'type_name', valueKey: 'resource_type_id', required: true },
      { name: 'required_count', type: 'number', step: '0.01', required: true },
      { name: 'utilization_percentage', type: 'number', step: '0.01', required: true },
      { name: 'notes', type: 'textarea' }
    ]
  }
};

const state = { data: {}, edit: null };
const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));

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

const refreshEntityData = async () => {
  const entities = ['resources', 'resource_types', 'projects', 'allocations', 'skills', 'resource_skills', 'projection_scenarios', 'scenario_project_demands'];
  await Promise.all(entities.map(async (entity) => {
    state.data[entity] = await api(`/api/${entity}`);
  }));

  state.data.resource_summary = await api('/api/resources/summary/list');

  renderCrudTable('resourceTypesTable', state.data.resource_types, 'resource_types');
  renderCrudTable('projectsTable', state.data.projects, 'projects');
  renderCrudTable('allocationsTable', state.data.allocations, 'allocations');
  renderCrudTable('skillsTable', state.data.skills, 'skills');
  renderCrudTable('resourceSkillsTable', state.data.resource_skills, 'resource_skills');
  renderCrudTable('scenariosTable', state.data.projection_scenarios, 'projection_scenarios');
  renderCrudTable('demandsTable', state.data.scenario_project_demands, 'scenario_project_demands');

  window._resources = state.data.resource_summary;
  renderCrudTable('resourcesTable', state.data.resource_summary, 'resources');

  const select = document.getElementById('scenarioSelect');
  select.innerHTML = state.data.projection_scenarios.map((s) => `<option value="${s.scenario_id}">${s.scenario_name}</option>`).join('');
};

document.getElementById('resourceSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = (window._resources || []).filter((r) => String(r.name).toLowerCase().includes(q));
  renderCrudTable('resourcesTable', filtered, 'resources');
});

const openCrudModal = (entity, row = null) => {
  state.edit = { entity, row };
  const cfg = entityConfigs[entity];
  document.getElementById('crudModalTitle').textContent = `${row ? 'Edit' : 'Add'} ${entity.replaceAll('_', ' ')}`;

  const html = cfg.fields.map((f) => {
    const value = row?.[f.name] ?? '';
    if (f.type === 'textarea') {
      return `<div class="mb-2"><label class="form-label">${f.name}</label><textarea class="form-control" name="${f.name}">${value}</textarea></div>`;
    }
    if (f.type === 'select') {
      const options = f.options || (state.data[f.source] || []).map((o) => ({ label: o[f.labelKey], value: o[f.valueKey] }));
      return `<div class="mb-2"><label class="form-label">${f.name}</label><select class="form-select" name="${f.name}" ${f.required ? 'required' : ''}><option value="">Select</option>${options.map((o) => `<option value="${o.value}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label ?? o}</option>`).join('')}</select></div>`;
    }
    return `<div class="mb-2"><label class="form-label">${f.name}</label><input class="form-control" type="${f.type || 'text'}" name="${f.name}" value="${value}" ${f.required ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''}></div>`;
  }).join('');

  document.getElementById('crudFormFields').innerHTML = html;
  crudModal.show();
};

document.querySelectorAll('[data-add]').forEach((btn) => {
  btn.addEventListener('click', () => openCrudModal(btn.dataset.add));
});

document.getElementById('crudForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { entity, row } = state.edit;
  const cfg = entityConfigs[entity];
  const formData = new FormData(e.target);
  const payload = {};
  cfg.fields.forEach((f) => {
    const v = formData.get(f.name);
    payload[f.name] = v === '' ? null : v;
  });

  const pk = cfg.pk;
  if (row && row[pk]) {
    await api(`/api/${entity}/${row[pk]}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  } else {
    await api(`/api/${entity}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  }

  crudModal.hide();
  e.target.reset();
  await refreshEntityData();
  await loadDashboard();
  if (document.getElementById('scenarioSelect').value) await loadTimeline();
});

document.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');

  if (editBtn) {
    const entity = editBtn.dataset.edit;
    if (entity === 'resources') {
      const full = await api(`/api/resources/${editBtn.dataset.id}`);
      openCrudModal(entity, full);
      return;
    }
    const row = (state.data[entity] || []).find((r) => String(r[entityConfigs[entity].pk]) === String(editBtn.dataset.id));
    openCrudModal(entity, row);
  }

  if (delBtn) {
    const entity = delBtn.dataset.delete;
    if (!confirm(`Delete this ${entity}?`)) return;
    await api(`/api/${entity}/${delBtn.dataset.id}`, { method: 'DELETE' });
    await refreshEntityData();
    await loadDashboard();
    if (document.getElementById('scenarioSelect').value) await loadTimeline();
  }
});

const loadTimeline = async () => {
  const scenarioId = document.getElementById('scenarioSelect').value;
  if (!scenarioId) return;

  const summaryResp = await api(`/api/projection/${scenarioId}/summary`);
  renderTable('timelineTable', summaryResp.summary.map((m) => ({
    month: m.month,
    total_available: m.total_available,
    total_demand: m.total_demand,
    occupied_count: m.occupied_count,
    bench_count: m.bench_count,
    shortage_count: m.shortage_count,
    salary_spend: m.salary_spend,
    revenue_potential: m.revenue_potential,
    profit_estimate: m.profit_estimate
  })));

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
  await refreshEntityData();
  if (document.getElementById('scenarioSelect').value) {
    await loadTimeline();
  }
})();
