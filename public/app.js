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

const asDateInput = (v) => (v ? String(v).slice(0, 10) : '');
const asMonthInput = (v) => (v ? String(v).slice(0, 7) : '');
const chip = (label, value, kind = 'secondary') => `<span class="badge text-bg-${kind} me-1 mb-1">${label}: ${Number(value).toFixed(2).replace(/\.00$/, '')}</span>`;

const renderTable = (elId, rows, { allowHtml = false } = {}) => {
  const el = document.getElementById(elId);
  if (!rows?.length) {
    el.innerHTML = '<tr><td class="text-muted">No data</td></tr>';
    return;
  }
  const cols = Object.keys(rows[0]);
  el.innerHTML = `<thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${allowHtml ? (r[c] ?? '') : String(r[c] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>`;
};

const renderCrudTable = (elId, rows, entity, options = {}) => {
  const el = document.getElementById(elId);
  if (!rows?.length) {
    el.innerHTML = '<tr><td class="text-muted">No data</td></tr>';
    return;
  }
  const hiddenCols = options.hiddenCols || [];
  const cols = Object.keys(rows[0]).filter((c) => !c.endsWith('_at') && !hiddenCols.includes(c));
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

document.querySelectorAll('.menu-btn').forEach((btn) => btn.addEventListener('click', () => showSection(btn.dataset.section)));

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
  skills: { pk: 'skill_id', fields: [{ name: 'skill_name', required: true }, { name: 'category' }] },
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
  resource_comments: {
    pk: 'comment_id',
    fields: [
      { name: 'resource_id', type: 'select', source: 'resources', labelKey: 'name', valueKey: 'resource_id', required: true },
      { name: 'comment_text', type: 'textarea', required: true }
    ]
  },
  performance_trackers: {
    pk: 'performance_id',
    fields: [
      { name: 'resource_id', type: 'select', source: 'resources', labelKey: 'name', valueKey: 'resource_id', required: true },
      { name: 'project_id', type: 'select', source: 'projects', labelKey: 'project_name', valueKey: 'project_id', required: true },
      { name: 'project_owner_name', required: true },
      { name: 'financial_year', required: true, placeholder: 'YYYY-YY (e.g. 2026-27)' },
      { name: 'quarter', type: 'select', options: ['Q1', 'Q2', 'Q3', 'Q4'], required: true },
      { name: 'comments', type: 'textarea', required: true }
    ]
  },
  scenario_project_demands: {
    pk: 'demand_id',
    fields: [
      { name: 'scenario_id', type: 'select', source: 'projection_scenarios', labelKey: 'scenario_name', valueKey: 'scenario_id', required: true },
      { name: 'project_id', type: 'select', source: 'projects', labelKey: 'project_name', valueKey: 'project_id', required: true },
      { name: 'month', type: 'month', required: true },
      { name: 'demand_from_date', type: 'date' },
      { name: 'demand_to_date', type: 'date' },
      { name: 'resource_type_id', type: 'select', source: 'resource_types', labelKey: 'type_name', valueKey: 'resource_type_id', required: true },
      { name: 'required_count', type: 'number', step: '0.01', required: true },
      { name: 'utilization_percentage', type: 'number', step: '0.01', required: true },
      { name: 'notes', type: 'textarea' }
    ]
  }
};

const state = { data: {}, edit: null, timelineSummary: [] };
const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));
let spendRevenueChart;
let utilizationChart;
let projectionChart;

const idMap = {
  resourceName: (id) => (state.data.resources || []).find((r) => String(r.resource_id) === String(id))?.name || id,
  projectName: (id) => (state.data.projects || []).find((p) => String(p.project_id) === String(id))?.project_name || id,
  typeName: (id) => (state.data.resource_types || []).find((t) => String(t.resource_type_id) === String(id))?.type_name || id,
  skillName: (id) => (state.data.skills || []).find((s) => String(s.skill_id) === String(id))?.skill_name || id,
  scenarioName: (id) => (state.data.projection_scenarios || []).find((s) => String(s.scenario_id) === String(id))?.scenario_name || id
};

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
  spendRevenueChart = new Chart(document.getElementById('spendRevenueChart'), { type: 'bar', data: { labels: ['Salary Spend', 'Revenue', 'Profit'], datasets: [{ label: 'Amount', data: [data.total_monthly_salary_spend, data.total_monthly_revenue_potential, data.profit] }] } });
  utilizationChart = new Chart(document.getElementById('utilizationChart'), { type: 'doughnut', data: { labels: ['Utilized', 'Bench'], datasets: [{ data: [data.current_utilization_percent, Math.max(100 - data.current_utilization_percent, 0)] }] } });
};

const renderDemandTable = () => {
  const selectedScenarioId = document.getElementById('demandScenarioFilter')?.value || '';
  let rows = [...(state.data.scenario_project_demands || [])];
  if (selectedScenarioId) rows = rows.filter((r) => String(r.scenario_id) === String(selectedScenarioId));
  const transformed = rows.map((r) => ({
    ...r,
    scenario_name: idMap.scenarioName(r.scenario_id),
    project_name: idMap.projectName(r.project_id),
    resource_type: idMap.typeName(r.resource_type_id)
  }));
  renderCrudTable('demandsTable', transformed, 'scenario_project_demands', { hiddenCols: ['scenario_id', 'project_id', 'resource_type_id'] });
};

const renderAllocationTable = () => {
  const resourceFilter = document.getElementById('allocationResourceFilter')?.value || '';
  const projectFilter = document.getElementById('allocationProjectFilter')?.value || '';
  let rows = [...(state.data.allocations || [])];
  if (resourceFilter) rows = rows.filter((r) => String(r.resource_id) === String(resourceFilter));
  if (projectFilter) rows = rows.filter((r) => String(r.project_id) === String(projectFilter));
  const transformed = rows.map((r) => ({
    ...r,
    resource_name: idMap.resourceName(r.resource_id),
    project_name: idMap.projectName(r.project_id)
  }));
  renderCrudTable('allocationsTable', transformed, 'allocations', { hiddenCols: ['resource_id', 'project_id'] });
};

const renderPerformanceTable = () => {
  const fyFilter = document.getElementById('performanceFyFilter')?.value || '';
  const userFilter = document.getElementById('performanceUserFilter')?.value || '';
  const quarterFilter = document.getElementById('performanceQuarterFilter')?.value || '';

  let rows = [...(state.data.performance_trackers || [])];
  if (fyFilter) rows = rows.filter((r) => String(r.financial_year) === String(fyFilter));
  if (userFilter) rows = rows.filter((r) => String(r.resource_id) === String(userFilter));
  if (quarterFilter) rows = rows.filter((r) => String(r.quarter) === String(quarterFilter));

  const transformed = rows.map((r) => ({
    ...r,
    resource_name: idMap.resourceName(r.resource_id),
    project_name: idMap.projectName(r.project_id)
  }));
  renderCrudTable('performanceTable', transformed, 'performance_trackers', { hiddenCols: ['resource_id', 'project_id'] });
};

const renderResourceSkillsTable = () => {
  const resourceFilter = document.getElementById('resourceSkillResourceFilter')?.value || '';
  let rows = [...(state.data.resource_skills || [])];
  if (resourceFilter) rows = rows.filter((r) => String(r.resource_id) === String(resourceFilter));
  const transformed = rows.map((r) => ({
    ...r,
    resource_name: idMap.resourceName(r.resource_id),
    skill_name: idMap.skillName(r.skill_id)
  }));
  renderCrudTable('resourceSkillsTable', transformed, 'resource_skills', { hiddenCols: ['resource_id', 'skill_id'] });
};

const populateFilterSelect = (id, list, valueKey, labelKey, placeholder) => {
  const el = document.getElementById(id);
  if (!el) return;
  const current = el.value;
  el.innerHTML = `<option value="">${placeholder}</option>${list.map((x) => `<option value="${x[valueKey]}">${x[labelKey]}</option>`).join('')}`;
  if ([...el.options].some((o) => o.value === current)) el.value = current;
};

const refreshEntityData = async () => {
  const entities = ['resources', 'resource_types', 'projects', 'allocations', 'skills', 'resource_skills', 'resource_comments', 'performance_trackers', 'projection_scenarios', 'scenario_project_demands'];
  await Promise.all(entities.map(async (entity) => { state.data[entity] = await api(`/api/${entity}`); }));

  state.data.resource_summary = await api('/api/resources/summary/list');

  renderCrudTable('resourceTypesTable', state.data.resource_types, 'resource_types');
  renderCrudTable('projectsTable', state.data.projects, 'projects');
  renderAllocationTable();
  renderCrudTable('skillsTable', state.data.skills, 'skills');
  renderResourceSkillsTable();
  renderPerformanceTable();
  renderCrudTable('scenariosTable', state.data.projection_scenarios, 'projection_scenarios');
  renderDemandTable();

  window._resources = state.data.resource_summary;
  renderCrudTable('resourcesTable', state.data.resource_summary, 'resources');

  const comments = (state.data.resource_comments || []).map((c) => ({ ...c, resource_name: idMap.resourceName(c.resource_id) }));
  renderCrudTable('resourceCommentsTable', comments, 'resource_comments', { hiddenCols: ['resource_id'] });

  const scenarioOptions = state.data.projection_scenarios.map((s) => `<option value="${s.scenario_id}">${s.scenario_name}</option>`).join('');
  document.getElementById('scenarioSelect').innerHTML = scenarioOptions;

  populateFilterSelect('demandScenarioFilter', state.data.projection_scenarios, 'scenario_id', 'scenario_name', 'All scenarios');
  populateFilterSelect('allocationResourceFilter', state.data.resources, 'resource_id', 'name', 'All resources');
  populateFilterSelect('allocationProjectFilter', state.data.projects, 'project_id', 'project_name', 'All projects');
  populateFilterSelect('resourceSkillResourceFilter', state.data.resources, 'resource_id', 'name', 'All resources');
  const fyValues = [...new Set((state.data.performance_trackers || []).map((r) => r.financial_year).filter(Boolean))];
  const fyEl = document.getElementById('performanceFyFilter');
  if (fyEl) {
    const current = fyEl.value;
    fyEl.innerHTML = `<option value="">All Financial Years</option>${fyValues.map((fy) => `<option value="${fy}">${fy}</option>`).join('')}`;
    if ([...fyEl.options].some((o) => o.value === current)) fyEl.value = current;
  }
  populateFilterSelect('performanceUserFilter', state.data.resources, 'resource_id', 'name', 'All Users');
};

document.getElementById('resourceSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  const filtered = (window._resources || []).filter((r) => String(r.name).toLowerCase().includes(q));
  renderCrudTable('resourcesTable', filtered, 'resources');
});

const normalizeFieldValue = (f, value) => {
  if (value == null) return '';
  if (f.type === 'date') return asDateInput(value);
  if (f.type === 'month') return asMonthInput(value);
  return value;
};

const openCrudModal = (entity, row = null) => {
  state.edit = { entity, row };
  const cfg = entityConfigs[entity];
  document.getElementById('crudModalTitle').textContent = `${row ? 'Edit' : 'Add'} ${entity.replaceAll('_', ' ')}`;

  const html = cfg.fields.map((f) => {
    const value = normalizeFieldValue(f, row?.[f.name]);
    if (f.type === 'textarea') return `<div class="mb-2"><label class="form-label">${f.name}</label><textarea class="form-control" name="${f.name}" ${f.required ? 'required' : ''}>${value}</textarea></div>`;
    if (f.type === 'select') {
      const options = f.options ? f.options.map((o) => (typeof o === 'object' ? o : { label: o, value: o })) : (state.data[f.source] || []).map((o) => ({ label: o[f.labelKey], value: o[f.valueKey] }));
      return `<div class="mb-2"><label class="form-label">${f.name}</label><select class="form-select" name="${f.name}" ${f.required ? 'required' : ''}><option value="">Select</option>${options.map((o) => `<option value="${o.value}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
    }
    return `<div class="mb-2"><label class="form-label">${f.name}</label><input class="form-control" type="${f.type || 'text'}" name="${f.name}" value="${value}" ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} ${f.required ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''}></div>`;
  }).join('');

  document.getElementById('crudFormFields').innerHTML = html;
  crudModal.show();
};

document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => openCrudModal(btn.dataset.add)));

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
    const full = await api(`/api/${entity}/${editBtn.dataset.id}`);
    openCrudModal(entity, full);
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

const toChipCell = (designations, key, badgeType) => designations
  .filter((d) => Number(d[key]) > 0)
  .map((d) => chip(d.type_name, d[key], badgeType))
  .join('') || '<span class="text-muted">0</span>';

const loadTimeline = async () => {
  const scenarioId = document.getElementById('scenarioSelect').value;
  if (!scenarioId) return;

  const summaryResp = await api(`/api/projection/${scenarioId}/summary`);
  state.timelineSummary = summaryResp.summary || [];

  renderTable('timelineTable', state.timelineSummary.map((m) => ({
    month: m.month,
    total_available: m.total_available,
    total_demand: toChipCell(m.designations, 'demand_count', 'info'),
    occupied_count: m.occupied_count,
    bench_count: toChipCell(m.designations, 'bench_count', 'warning'),
    shortage_count: toChipCell(m.designations, 'shortage_count', 'danger'),
    salary_spend: m.salary_spend,
    revenue_potential: m.revenue_potential,
    profit_estimate: m.profit_estimate
  })), { allowHtml: true });

  if (projectionChart) projectionChart.destroy();
  projectionChart = new Chart(document.getElementById('projectionChart'), {
    type: 'line',
    data: {
      labels: state.timelineSummary.map((m) => m.month),
      datasets: [
        { label: 'Demand', data: state.timelineSummary.map((m) => m.total_demand) },
        { label: 'Available', data: state.timelineSummary.map((m) => m.total_available) },
        { label: 'Profit', data: state.timelineSummary.map((m) => m.profit_estimate) }
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

document.getElementById('demandScenarioFilter').addEventListener('change', renderDemandTable);
document.getElementById('allocationResourceFilter').addEventListener('change', renderAllocationTable);
document.getElementById('allocationProjectFilter').addEventListener('change', renderAllocationTable);
document.getElementById('resourceSkillResourceFilter').addEventListener('change', renderResourceSkillsTable);

(async function init() {
  await loadDashboard();
  await refreshEntityData();
  if (document.getElementById('scenarioSelect').value) await loadTimeline();
})();

document.getElementById('performanceFyFilter').addEventListener('change', renderPerformanceTable);
document.getElementById('performanceUserFilter').addEventListener('change', renderPerformanceTable);
document.getElementById('performanceQuarterFilter').addEventListener('change', renderPerformanceTable);
