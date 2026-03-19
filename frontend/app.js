// ============================================
// OrganizeYourLife - Frontend Application
// ============================================

const API_BASE = '/api';

// ============================================
// State
// ============================================
const state = {
    currentSection: 'dashboard',
    taskType: 'company',
    companies: [],
    tasks: [],
    habits: [],
    goals: [],
    tags: [],
    notes: [],
    dashboard: null,
    settings: {
        habit_limit_days: '30'
    }
};


// ============================================
// API Helper
// ============================================
async function api(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        showToast(err.message, 'error');
        throw err;
    }
}

// ============================================
// Navigation
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
}

function navigateTo(section) {
    state.currentSection = section;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');

    // Load data
    switch (section) {
        case 'dashboard': loadDashboard(); break;
        case 'tasks': loadTasks(); break;
        case 'habits': loadHabits(); break;
        case 'goals': loadGoals(); break;
        case 'companies': loadCompanies(); break;
        case 'tags': loadTags(); break;
        case 'notes': loadNotes(); break;
        case 'calendar': loadCalendar(); break;
        case 'settings': loadSettings(); break;
    }

}

// ============================================
// Date Display
// ============================================
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formatted = now.toLocaleDateString('pt-BR', options);
    document.getElementById('current-date').textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// ============================================
// Toast
// ============================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// Modal
// ============================================
function openModal(title, bodyHTML, footerHTML, extraClass = '') {
    const modal = document.getElementById('modal');
    modal.className = 'modal ' + extraClass;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    document.getElementById('modal-overlay').classList.add('open');
}


function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

function initModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        const data = await api('/dashboard');
        state.dashboard = data;

        const limit = state.settings.habit_limit_days;
        const isInfinite = limit === 'infinito' || limit === '' || limit === 0 || limit === '0';
        const limitLabel = isInfinite ? 'Histórico Total' : `Hábitos (${limit} dias)`;
        document.getElementById('stat-tasks-completed').textContent = data.overallStats.total_tasks_completed || 0;
        document.getElementById('stat-habits-30d').textContent = data.overallStats.habits_limit_days || 0;
        document.querySelector('#stat-habits-30d + .stat-label').textContent = limitLabel;
        document.getElementById('stat-goals').textContent = `${data.overallStats.goals_completed || 0}/${data.overallStats.total_goals || 0}`;

        // Badge in frequency section
        const frequencyBadge = document.querySelector('#section-dashboard .card-badge');
        if (frequencyBadge) {
            frequencyBadge.textContent = isInfinite ? 'Histórico completo' : `Últimos ${limit} dias`;
        }




        // Today's habits
        renderTodayHabits(data.todayHabits);

        // Company tasks
        renderDashboardCompanyTasks(data.tasksByCompany);

        // Habit stats
        renderDashboardHabitStats(data.habitStats);

        // Goals progress
        renderDashboardGoals(data.goalsProgress);
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderTodayHabits(habits) {
    const container = document.getElementById('today-habits');
    if (!habits || habits.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum hábito cadastrado</div>';
        return;
    }
    container.innerHTML = habits.map(h => `
        <div class="today-habit-chip ${h.done_today ? 'done' : ''}" data-habit-id="${h.id}" onclick="toggleHabitFromDashboard(${h.id}, this)">
            <span class="chip-icon">${h.icon}</span>
            <span>${h.name}</span>
            <span class="chip-check"></span>
        </div>
    `).join('');
}

async function toggleHabitFromDashboard(habitId, el) {
    try {
        const result = await api(`/habits/${habitId}/toggle`, { method: 'POST', body: {} });
        if (result.toggled) {
            el.classList.add('done');
        } else {
            el.classList.remove('done');
        }
        // Refresh stats
        loadDashboard();
    } catch (err) {
        console.error(err);
    }
}

function renderDashboardCompanyTasks(tasks) {
    const container = document.getElementById('dashboard-company-tasks');
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma task por empresa</div>';
        return;
    }
    container.innerHTML = tasks.map(t => {
        const percent = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
        return `
            <div class="company-bar">
                <span class="company-bar-name">${t.company_name}</span>
                <div class="company-bar-track">
                    <div class="company-bar-fill" style="width: ${percent}%; background: ${t.color || '#18181B'}"></div>
                </div>
                <span class="company-bar-count">${t.completed}/${t.total}</span>
            </div>
        `;
    }).join('');
}

function renderDashboardHabitStats(stats) {
    const container = document.getElementById('dashboard-habit-stats');
    if (!stats || stats.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum hábito cadastrado</div>';
        return;
    }
    container.innerHTML = stats.map(s => `
        <div class="habit-stat-item">
            <div class="habit-stat-left">
                <span class="habit-stat-icon">${s.icon}</span>
                <span class="habit-stat-name">${s.name}</span>
            </div>
            <div style="text-align: right;">
                <span class="habit-stat-count">${s.times_done}</span>
                <span class="habit-stat-label">vezes</span>
            </div>
        </div>
    `).join('');
}

function renderDashboardGoals(goals) {
    const container = document.getElementById('dashboard-goals-progress');
    if (!goals || goals.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma meta cadastrada</div>';
        return;
    }
    container.innerHTML = goals.map(g => {
        const percent = g.total_subjects > 0 ? Math.round((g.completed_subjects / g.total_subjects) * 100) : 0;
        const isComplete = percent === 100;
        return `
            <div class="goal-progress-item">
                <div class="goal-progress-info">
                    <div class="goal-progress-title">${g.title}</div>
                    <div class="goal-progress-category">${g.category || ''} · ${g.completed_subjects}/${g.total_subjects} assuntos</div>
                </div>
                <div class="goal-progress-track">
                    <div class="goal-progress-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
                </div>
                <span class="goal-progress-percent">${percent}%</span>
            </div>
        `;
    }).join('');
}

// ============================================
// TASKS
// ============================================
async function loadTasks() {
    await loadCompaniesForFilter();
    const params = new URLSearchParams();
    params.set('type', state.taskType);

    const companyFilter = document.getElementById('filter-company').value;
    const statusFilter = document.getElementById('filter-status').value;
    if (companyFilter) params.set('company_id', companyFilter);
    if (statusFilter) params.set('status', statusFilter);

    try {
        state.tasks = await api(`/tasks?${params}`);
        if (!state.tags || state.tags.length === 0) {
            state.tags = await api('/tags');
        }
        renderTasks();
    } catch (err) {
        console.error(err);
    }
}

async function loadCompaniesForFilter() {
    try {
        state.companies = await api('/companies');
        const select = document.getElementById('filter-company');
        const currentVal = select.value;
        select.innerHTML = '<option value="">Todas as empresas</option>';
        state.companies.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        select.value = currentVal;
    } catch (err) {
        console.error(err);
    }
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    const filterBar = document.getElementById('company-filter-bar');

    filterBar.style.display = state.taskType === 'company' ? 'flex' : 'none';

    if (state.tasks.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">📋</div>
            Nenhuma tarefa ${state.taskType === 'company' ? 'por empresa' : 'pontual'} encontrada
        </div>`;
        return;
    }

    if (state.taskType === 'company') {
        const grouped = {};
        state.tasks.forEach(t => {
            const key = t.company_name || 'Sem Empresa';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(t);
        });

        container.innerHTML = Object.keys(grouped).sort().map(companyName => `
            <div class="task-group">
                <div class="task-group-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'flex' : 'none'">
                    <span class="task-group-title">${companyName}</span>
                    <span class="task-group-count">${grouped[companyName].length}</span>
                </div>
                <div class="task-group-content">
                    ${grouped[companyName].map(t => renderSingleTask(t)).join('')}
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = state.tasks.map(t => renderSingleTask(t)).join('');
    }
}

function renderSingleTask(t) {
    const totalSteps = parseInt(t.total_steps) || 0;
    const completedSteps = parseInt(t.completed_steps) || 0;
    const stepPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const hasSteps = totalSteps > 0;

    // Tags HTML
    const tagsHTML = t.tags && t.tags.length > 0 ? t.tags.map(tag =>
        `<span class="task-tag" style="background:${tag.color}22; color:${tag.color}; border:1px solid ${tag.color}44;">${tag.name}</span>`
    ).join('') : '';

    return `
    <div class="task-item-wrapper" data-id="${t.id}">
        <div class="task-item">
            <div class="task-check ${t.status === 'completed' ? 'completed' : ''}" 
                 onclick="toggleTask(${t.id}, '${t.status}')"></div>
            <div class="task-info">
                <div class="task-title ${t.status === 'completed' ? 'completed' : ''}">${t.title}</div>
                <div class="task-meta">
                    ${t.company_name && state.taskType !== 'company' ? `<span class="task-tag company">${t.company_name}</span>` : ''}
                    <span class="task-tag priority-${t.priority}">${t.priority}</span>
                    ${t.status === 'in_progress' ? '<span class="task-tag status-in_progress">Em Progresso</span>' : ''}
                    ${t.due_date ? `<span class="task-date">${formatDate(t.due_date)}</span>` : ''}
                    ${t.company_task_type ? `<span class="task-tag" style="background:var(--accent);color:#fff;">${t.company_task_type}</span>` : ''}
                    ${tagsHTML}
                </div>
                ${hasSteps ? `
                <div class="task-steps-progress">
                    <div class="task-steps-bar">
                        <div class="task-steps-bar-fill ${stepPercent === 100 ? 'complete' : ''}" style="width: ${stepPercent}%"></div>
                    </div>
                    <span class="task-steps-label">${completedSteps}/${totalSteps} passos · ${stepPercent}%</span>
                </div>` : ''}
            </div>
            <div class="task-actions">
                <button class="btn-icon" onclick="toggleTaskSteps(${t.id})" title="Passos">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>
                </button>
                <button class="btn-icon" onclick="editTask(${t.id})" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon" onclick="deleteTask(${t.id})" title="Excluir">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div>
        </div>
        <div class="task-steps-panel" id="task-steps-${t.id}" style="display:none;">
            <div class="task-steps-loading">Carregando passos...</div>
        </div>
    </div>
    `;
}

async function toggleTaskSteps(taskId) {
    const panel = document.getElementById(`task-steps-${taskId}`);
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        await loadTaskSteps(taskId);
    } else {
        panel.style.display = 'none';
    }
}

async function loadTaskSteps(taskId) {
    const panel = document.getElementById(`task-steps-${taskId}`);
    try {
        const steps = await api(`/tasks/${taskId}/steps`);
        renderTaskSteps(taskId, steps, panel);
    } catch (err) {
        panel.innerHTML = '<div class="empty-state">Erro ao carregar passos</div>';
    }
}

function renderTaskSteps(taskId, steps, panel) {
    const stepsHTML = steps.length > 0 ? steps.map(s => `
        <div class="task-step">
            <div class="step-check ${s.is_completed ? 'completed' : ''}" 
                 onclick="toggleStep(${s.id}, ${taskId})"></div>
            <span class="step-name ${s.is_completed ? 'completed' : ''}">${s.title}</span>
            <button class="btn-icon step-delete" onclick="deleteStep(${s.id}, ${taskId})" title="Excluir">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    `).join('') : '<div style="font-size:13px;color:var(--text-tertiary);padding:4px 0;">Nenhum passo adicionado</div>';

    panel.innerHTML = `
        <div class="task-steps-list">${stepsHTML}</div>
        <div class="task-step-add">
            <input type="text" class="form-input" id="step-input-${taskId}" 
                   placeholder="Novo passo..." 
                   onkeydown="if(event.key==='Enter')addStep(${taskId})">
            <button class="btn btn-sm btn-primary" onclick="addStep(${taskId})">+</button>
        </div>
    `;
}

async function addStep(taskId) {
    const input = document.getElementById(`step-input-${taskId}`);
    const title = input.value.trim();
    if (!title) return;

    try {
        await api(`/tasks/${taskId}/steps`, { method: 'POST', body: { title } });
        input.value = '';
        await loadTaskSteps(taskId);
        // Refresh the task list to update progress
        const params = new URLSearchParams();
        params.set('type', state.taskType);
        const companyFilter = document.getElementById('filter-company').value;
        const statusFilter = document.getElementById('filter-status').value;
        if (companyFilter) params.set('company_id', companyFilter);
        if (statusFilter) params.set('status', statusFilter);
        state.tasks = await api(`/tasks?${params}`);
        // Re-render but keep the steps panel open
        renderTasks();
        const panel = document.getElementById(`task-steps-${taskId}`);
        panel.style.display = 'block';
        await loadTaskSteps(taskId);
    } catch (err) {
        console.error(err);
    }
}

async function toggleStep(stepId, taskId) {
    try {
        await api(`/steps/${stepId}/toggle`, { method: 'PATCH' });
        await loadTaskSteps(taskId);
        // Refresh tasks to update progress
        const params = new URLSearchParams();
        params.set('type', state.taskType);
        const companyFilter = document.getElementById('filter-company').value;
        const statusFilter = document.getElementById('filter-status').value;
        if (companyFilter) params.set('company_id', companyFilter);
        if (statusFilter) params.set('status', statusFilter);
        state.tasks = await api(`/tasks?${params}`);
        renderTasks();
        const panel = document.getElementById(`task-steps-${taskId}`);
        panel.style.display = 'block';
        await loadTaskSteps(taskId);
    } catch (err) {
        console.error(err);
    }
}

async function deleteStep(stepId, taskId) {
    try {
        await api(`/steps/${stepId}`, { method: 'DELETE' });
        await loadTaskSteps(taskId);
        const params = new URLSearchParams();
        params.set('type', state.taskType);
        const companyFilter = document.getElementById('filter-company').value;
        const statusFilter = document.getElementById('filter-status').value;
        if (companyFilter) params.set('company_id', companyFilter);
        if (statusFilter) params.set('status', statusFilter);
        state.tasks = await api(`/tasks?${params}`);
        renderTasks();
        const panel = document.getElementById(`task-steps-${taskId}`);
        panel.style.display = 'block';
        await loadTaskSteps(taskId);
    } catch (err) {
        console.error(err);
    }
}

async function toggleTask(id, currentStatus) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
        await api(`/tasks/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
        showToast(newStatus === 'completed' ? 'Tarefa concluída!' : 'Tarefa reaberta');
        loadTasks();
    } catch (err) {
        console.error(err);
    }
}

function showAddTaskModal() {
    const companyOptions = state.companies.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('');
    const tagsOptions = state.tags.filter(t => t.status !== 'DONE').map(t => `
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
            <input type="checkbox" name="task-tags-cb" value="${t.id}">
            <span style="color:${t.color};font-weight:500;">${t.name}</span>
        </label>
    `).join('');
    const isCompany = state.taskType === 'company';

    openModal('Nova Tarefa', `
        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" class="form-input" id="task-title" placeholder="Título da tarefa">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="task-description" placeholder="Descrição (opcional)"></textarea>
        </div>
        ${isCompany ? `
        <div class="form-group">
            <label class="form-label">Empresa</label>
            <select class="form-select" id="task-company" onchange="toggleCompanyTaskTypeFields(this)">
                <option value="">Selecione...</option>
                ${companyOptions}
            </select>
        </div>
        <div class="form-group" id="company-task-type-group" style="display:none;">
            <label class="form-label">Tipo de Tarefa</label>
            <select class="form-select" id="task-company-type">
                <!-- dynamic options -->
            </select>
            <p style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">Isso irá gerar os passos automaticamente.</p>
        </div>` : ''}
        <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select class="form-select" id="task-priority">
                <option value="low">Baixa</option>
                <option value="medium" selected>Média</option>
                <option value="high">Alta</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Tags</label>
            <div style="max-height:100px;overflow-y:auto;background:var(--bg-tertiary);padding:8px;border-radius:4px;">
                ${tagsOptions || '<div style="font-size:12px;color:gray;">Nenhuma tag cadastrada</div>'}
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Data de vencimento</label>
            <input type="date" class="form-input" id="task-due">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveTask()">Salvar</button>
    `);
}

function toggleCompanyTaskTypeFields(selectEl, prefix = '') {
    const companyId = parseInt(selectEl.value);
    const group = document.getElementById(prefix + 'company-task-type-group');
    const typeSelect = document.getElementById(prefix + 'task-company-type');

    if (group && typeSelect) {
        let types = [];
        if (companyId) {
            const company = state.companies.find(c => c.id === companyId);
            if (company && company.settings && company.settings.types) {
                types = company.settings.types;
            }
        }

        if (types.length > 0) {
            typeSelect.innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
            // Se já tiver um valor selecionado antes de renderizar as opções, precisamos mantê-lo se estiver usando React ou similar, mas aqui como a DOM é refeita, a gente ajusta manualmente na chamada de edição.
            group.style.display = 'block';
        } else {
            typeSelect.innerHTML = '';
            group.style.display = 'none';
        }
    }
}

async function saveTask() {
    const title = document.getElementById('task-title').value.trim();
    if (!title) return showToast('Título é obrigatório', 'error');

    const isCompany = state.taskType === 'company';
    const companyEl = document.getElementById('task-company');
    const capTypeEl = document.getElementById('task-company-type');

    const selectedTags = Array.from(document.querySelectorAll('input[name="task-tags-cb"]:checked')).map(cb => parseInt(cb.value));

    const body = {
        title,
        description: document.getElementById('task-description').value.trim(),
        type: state.taskType,
        company_id: isCompany && companyEl ? companyEl.value : null,
        priority: document.getElementById('task-priority').value,
        due_date: document.getElementById('task-due').value || null,
        company_task_type: (isCompany && capTypeEl && capTypeEl.closest('#company-task-type-group').style.display !== 'none') ? capTypeEl.value : null,
        tags: selectedTags
    };

    try {
        await api('/tasks', { method: 'POST', body });
        showToast('Tarefa criada com sucesso!');
        closeModal();
        loadTasks();
    } catch (err) {
        console.error(err);
    }
}

async function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    if (!state.tags || state.tags.length === 0) {
        state.tags = await api('/tags');
    }

    const companyOptions = state.companies.map(c =>
        `<option value="${c.id}" data-name="${c.name}" ${c.id === task.company_id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const taskTagsIds = (task.tags || []).map(t => t.id);
    const tagsOptions = state.tags.filter(t => t.status !== 'DONE' || taskTagsIds.includes(t.id)).map(t => `
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
            <input type="checkbox" name="task-tags-cb" value="${t.id}" ${taskTagsIds.includes(t.id) ? 'checked' : ''}>
            <span style="color:${t.color};font-weight:500;">${t.name}</span>
            ${t.status === 'DONE' ? '<span style="font-size:10px;background:#eee;padding:2px 4px;border-radius:4px;color:#666;">DONE</span>' : ''}
        </label>
    `).join('');

    let typeOptionsHTML = '';
    let showTypeGroup = false;
    if (task.company_id) {
        const company = state.companies.find(c => c.id === task.company_id);
        if (company && company.settings && company.settings.types && company.settings.types.length > 0) {
            showTypeGroup = true;
            typeOptionsHTML = company.settings.types.map(t =>
                `<option value="${t}" ${task.company_task_type === t ? 'selected' : ''}>${t}</option>`
            ).join('');
        }
    }

    openModal('Editar Tarefa', `
        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" class="form-input" id="edit-task-title" value="${task.title}">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="edit-task-description">${task.description || ''}</textarea>
        </div>
        ${task.type === 'company' ? `
        <div class="form-group">
            <label class="form-label">Empresa</label>
            <select class="form-select" id="edit-task-company" onchange="toggleCompanyTaskTypeFields(this, 'edit-')">
                <option value="">Selecione...</option>
                ${companyOptions}
            </select>
        </div>
        <div class="form-group" id="edit-company-task-type-group" style="display:${showTypeGroup ? 'block' : 'none'};">
            <label class="form-label">Tipo de Tarefa</label>
            <select class="form-select" id="edit-task-company-type">
                ${typeOptionsHTML}
            </select>
        </div>
        ` : ''}
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" id="edit-task-status">
                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pendente</option>
                <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>Em Progresso</option>
                <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Concluída</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Prioridade</label>
            <select class="form-select" id="edit-task-priority">
                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baixa</option>
                <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Média</option>
                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Tags</label>
            <div style="max-height:100px;overflow-y:auto;background:var(--bg-tertiary);padding:8px;border-radius:4px;">
                ${tagsOptions || '<div style="font-size:12px;color:gray;">Nenhuma tag cadastrada</div>'}
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Data de vencimento</label>
            <input type="date" class="form-input" id="edit-task-due" value="${task.due_date ? task.due_date.split('T')[0] : ''}">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateTask(${id})">Salvar</button>
    `);
}

async function updateTask(id) {
    const task = state.tasks.find(t => t.id === id);
    const companyEl = document.getElementById('edit-task-company');
    const typeEl = document.getElementById('edit-task-company-type');

    const selectedTags = Array.from(document.querySelectorAll('input[name="task-tags-cb"]:checked')).map(cb => parseInt(cb.value));

    const body = {
        title: document.getElementById('edit-task-title').value.trim(),
        description: document.getElementById('edit-task-description').value.trim(),
        company_id: companyEl ? companyEl.value : task.company_id,
        status: document.getElementById('edit-task-status').value,
        priority: document.getElementById('edit-task-priority').value,
        due_date: document.getElementById('edit-task-due').value || null,
        company_task_type: (typeEl && typeEl.closest('#edit-company-task-type-group').style.display !== 'none') ? typeEl.value : null,
        tags: selectedTags
    };

    try {
        await api(`/tasks/${id}`, { method: 'PUT', body });
        showToast('Tarefa atualizada!');
        closeModal();
        loadTasks();
    } catch (err) {
        console.error(err);
    }
}

async function deleteTask(id) {
    if (!confirm('Deseja excluir esta tarefa?')) return;
    try {
        await api(`/tasks/${id}`, { method: 'DELETE' });
        showToast('Tarefa excluída');
        loadTasks();
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// HABITS
// ============================================
async function loadHabits() {
    try {
        state.habits = await api('/habits');
        renderHabits();
    } catch (err) {
        console.error(err);
    }
}

function renderHabits() {
    const container = document.getElementById('habits-list');
    if (state.habits.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🔄</div>
            Nenhum hábito cadastrado
        </div>`;
        return;
    }

    container.innerHTML = state.habits.map(h => `
        <div class="habit-card">
            <div class="habit-card-header">
                <span class="habit-card-icon">${h.icon}</span>
                <div style="display:flex;gap:4px;">
                    <button class="btn-icon" onclick="editHabit(${h.id})" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon" onclick="deleteHabit(${h.id})" title="Excluir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="habit-card-name">${h.name}</div>
            ${h.description ? `<div class="habit-card-desc">${h.description}</div>` : ''}
            <div class="habit-card-stats">
                <div class="habit-card-stat">
                    <span class="habit-card-stat-value">${h.total_logs || 0}</span>
                    <span class="habit-card-stat-label">Total</span>
                </div>
                <div class="habit-card-stat">
                    <span class="habit-card-stat-value">${h.logs_limit || 0}</span>
                    <span class="habit-card-stat-label">${(state.settings.habit_limit_days === 'infinito' || state.settings.habit_limit_days === '' || state.settings.habit_limit_days === '0') ? 'Total' : `${state.settings.habit_limit_days} dias`}</span>
                </div>


                <div class="habit-card-stat">
                    <span class="habit-card-stat-value">${h.logs_last_7 || 0}</span>
                    <span class="habit-card-stat-label">7 dias</span>
                </div>
            </div>
            <button class="habit-card-toggle ${h.done_today ? 'done' : ''}" onclick="toggleHabit(${h.id})">
                ${h.done_today ? '✓ Feito hoje' : 'Marcar como feito'}
            </button>
        </div>
    `).join('');
}

async function toggleHabit(id) {
    try {
        await api(`/habits/${id}/toggle`, { method: 'POST', body: {} });
        loadHabits();
    } catch (err) {
        console.error(err);
    }
}

function showAddHabitModal() {
    openModal('Novo Hábito', `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="habit-name" placeholder="Nome do hábito">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="habit-description" placeholder="Descrição (opcional)"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Ícone (emoji)</label>
            <input type="text" class="form-input" id="habit-icon" placeholder="Ex: 🏋️" value="✓" maxlength="4">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveHabit()">Salvar</button>
    `);
}

async function saveHabit() {
    const name = document.getElementById('habit-name').value.trim();
    if (!name) return showToast('Nome é obrigatório', 'error');

    try {
        await api('/habits', {
            method: 'POST', body: {
                name,
                description: document.getElementById('habit-description').value.trim(),
                icon: document.getElementById('habit-icon').value || '✓',
            }
        });
        showToast('Hábito criado!');
        closeModal();
        loadHabits();
    } catch (err) {
        console.error(err);
    }
}

async function editHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    if (!habit) return;

    openModal('Editar Hábito', `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="edit-habit-name" value="${habit.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="edit-habit-description">${habit.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Ícone (emoji)</label>
            <input type="text" class="form-input" id="edit-habit-icon" value="${habit.icon}" maxlength="4">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateHabit(${id})">Salvar</button>
    `);
}

async function updateHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    try {
        await api(`/habits/${id}`, {
            method: 'PUT', body: {
                name: document.getElementById('edit-habit-name').value.trim(),
                description: document.getElementById('edit-habit-description').value.trim(),
                icon: document.getElementById('edit-habit-icon').value || '✓',
                frequency: habit.frequency,
                is_active: habit.is_active,
            }
        });
        showToast('Hábito atualizado!');
        closeModal();
        loadHabits();
    } catch (err) {
        console.error(err);
    }
}

async function deleteHabit(id) {
    if (!confirm('Deseja excluir este hábito e todo seu histórico?')) return;
    try {
        await api(`/habits/${id}`, { method: 'DELETE' });
        showToast('Hábito excluído');
        loadHabits();
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// GOALS
// ============================================
async function loadGoals() {
    try {
        const goals = await api('/goals');
        // Load subjects for each goal
        state.goals = await Promise.all(goals.map(async g => {
            const detail = await api(`/goals/${g.id}`);
            return { ...g, subjects: detail.subjects };
        }));
        renderGoals();
    } catch (err) {
        console.error(err);
    }
}

function renderGoals() {
    const container = document.getElementById('goals-list');
    if (state.goals.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🎯</div>
            Nenhuma meta cadastrada
        </div>`;
        return;
    }

    container.innerHTML = state.goals.map(g => {
        const total = g.subjects ? g.subjects.length : 0;
        const completed = g.subjects ? g.subjects.filter(s => s.status === 'completed').length : 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isComplete = percent === 100;

        const subjectsHTML = g.subjects && g.subjects.length > 0 ? g.subjects.map(s => `
            <div class="goal-subject">
                <div class="subject-check ${s.status === 'completed' ? 'completed' : ''}" 
                     onclick="toggleSubject(${s.id}, '${s.status}', ${g.id})"></div>
                <span class="subject-name ${s.status === 'completed' ? 'completed' : ''}">${s.title}</span>
                <button class="btn-icon subject-delete" onclick="deleteSubject(${s.id})" title="Excluir">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('') : '<div style="font-size:13px;color:var(--text-tertiary);padding:8px 0;">Nenhum assunto adicionado</div>';

        return `
            <div class="goal-card">
                <div class="goal-card-header">
                    <span class="goal-card-title">${g.title}</span>
                    <span class="goal-status-badge ${g.status}">${statusLabel(g.status)}</span>
                </div>
                ${g.category ? `<div class="goal-card-category">${g.category}</div>` : ''}
                
                <div class="goal-card-progress">
                    <div class="goal-card-progress-header">
                        <span class="goal-card-percent">${percent}%</span>
                        <span class="goal-card-count">${completed}/${total} assuntos</span>
                    </div>
                    <div class="goal-card-bar">
                        <div class="goal-card-bar-fill ${isComplete ? 'complete' : ''}" style="width: ${percent}%"></div>
                    </div>
                </div>

                <div class="goal-subjects">
                    ${subjectsHTML}
                </div>

                <div class="goal-card-actions">
                    <button class="btn btn-sm btn-secondary" onclick="showAddSubjectModal(${g.id})">
                        + Assunto
                    </button>
                    ${g.status !== 'completed' ? `
                    <button class="btn btn-sm btn-primary" onclick="completeGoal(${g.id})">
                        Concluir Meta
                    </button>` : ''}
                    <button class="btn btn-sm btn-ghost" onclick="editGoal(${g.id})">Editar</button>
                    <button class="btn btn-sm btn-ghost" onclick="deleteGoal(${g.id})" style="color:var(--danger)">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleSubject(subjectId, currentStatus, goalId) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
        await api(`/subjects/${subjectId}/status`, { method: 'PATCH', body: { status: newStatus } });
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

async function deleteSubject(id) {
    if (!confirm('Excluir este assunto?')) return;
    try {
        await api(`/subjects/${id}`, { method: 'DELETE' });
        showToast('Assunto excluído');
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

function showAddGoalModal() {
    openModal('Nova Meta', `
        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" class="form-input" id="goal-title" placeholder="Ex: Curso de TypeScript">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="goal-description" placeholder="Descrição (opcional)"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Categoria</label>
            <input type="text" class="form-input" id="goal-category" placeholder="Ex: Programação, Idiomas">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveGoal()">Salvar</button>
    `);
}

async function saveGoal() {
    const title = document.getElementById('goal-title').value.trim();
    if (!title) return showToast('Título é obrigatório', 'error');

    try {
        await api('/goals', {
            method: 'POST', body: {
                title,
                description: document.getElementById('goal-description').value.trim(),
                category: document.getElementById('goal-category').value.trim(),
            }
        });
        showToast('Meta criada!');
        closeModal();
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

async function editGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    openModal('Editar Meta', `
        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" class="form-input" id="edit-goal-title" value="${goal.title}">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="edit-goal-description">${goal.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Categoria</label>
            <input type="text" class="form-input" id="edit-goal-category" value="${goal.category || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" id="edit-goal-status">
                <option value="in_progress" ${goal.status === 'in_progress' ? 'selected' : ''}>Em Progresso</option>
                <option value="completed" ${goal.status === 'completed' ? 'selected' : ''}>Concluída</option>
                <option value="paused" ${goal.status === 'paused' ? 'selected' : ''}>Pausada</option>
            </select>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateGoal(${id})">Salvar</button>
    `);
}

async function updateGoal(id) {
    try {
        await api(`/goals/${id}`, {
            method: 'PUT', body: {
                title: document.getElementById('edit-goal-title').value.trim(),
                description: document.getElementById('edit-goal-description').value.trim(),
                category: document.getElementById('edit-goal-category').value.trim(),
                status: document.getElementById('edit-goal-status').value,
            }
        });
        showToast('Meta atualizada!');
        closeModal();
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

async function completeGoal(id) {
    if (!confirm('Marcar esta meta como concluída?')) return;
    const goal = state.goals.find(g => g.id === id);
    try {
        await api(`/goals/${id}`, {
            method: 'PUT', body: {
                title: goal.title,
                description: goal.description,
                category: goal.category,
                status: 'completed',
            }
        });
        showToast('Meta concluída! 🎉');
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

async function deleteGoal(id) {
    if (!confirm('Excluir esta meta e todos seus assuntos?')) return;
    try {
        await api(`/goals/${id}`, { method: 'DELETE' });
        showToast('Meta excluída');
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

function showAddSubjectModal(goalId) {
    openModal('Novo Assunto', `
        <div class="form-group">
            <label class="form-label">Título do assunto</label>
            <input type="text" class="form-input" id="subject-title" placeholder="Ex: Generics">
        </div>
        <div class="form-group">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" id="subject-description" placeholder="Descrição (opcional)"></textarea>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveSubject(${goalId})">Salvar</button>
    `);
}

async function saveSubject(goalId) {
    const title = document.getElementById('subject-title').value.trim();
    if (!title) return showToast('Título é obrigatório', 'error');

    try {
        await api(`/goals/${goalId}/subjects`, {
            method: 'POST', body: {
                title,
                description: document.getElementById('subject-description').value.trim(),
            }
        });
        showToast('Assunto adicionado!');
        closeModal();
        loadGoals();
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// COMPANIES
// ============================================
async function loadCompanies() {
    try {
        state.companies = await api('/companies');
        renderCompanies();
    } catch (err) {
        console.error(err);
    }
}

function renderCompanies() {
    const container = document.getElementById('companies-list');
    if (state.companies.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🏢</div>
            Nenhuma empresa cadastrada
        </div>`;
        return;
    }

    container.innerHTML = state.companies.map(c => `
        <div class="company-card">
            <div class="company-card-header">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div class="company-color-dot" style="background:${c.color}"></div>
                    <span class="company-card-name">${c.name}</span>
                </div>
            </div>
            <div class="company-card-date">Criada em ${formatDate(c.created_at)}</div>
            <div class="company-card-actions">
                <button class="btn btn-sm btn-secondary" onclick="configureCompany(${c.id})" title="Configurar Tipos e Passos Padrão">⚙️</button>
                <div style="flex:1;"></div>
                <button class="btn btn-sm btn-secondary" onclick="editCompany(${c.id})">Editar</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteCompany(${c.id})" style="color:var(--danger)">Excluir</button>
            </div>
        </div>
    `).join('');
}

function showAddCompanyModal() {
    openModal('Nova Empresa', `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="company-name" placeholder="Nome da empresa">
        </div>
        <div class="form-group">
            <label class="form-label">Cor</label>
            <input type="color" class="form-input" id="company-color" value="#374151" style="height:44px;padding:4px;">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCompany()">Salvar</button>
    `);
}

async function saveCompany() {
    const name = document.getElementById('company-name').value.trim();
    if (!name) return showToast('Nome é obrigatório', 'error');

    try {
        await api('/companies', {
            method: 'POST', body: {
                name,
                color: document.getElementById('company-color').value,
            }
        });
        showToast('Empresa criada!');
        closeModal();
        loadCompanies();
    } catch (err) {
        console.error(err);
    }
}

async function editCompany(id) {
    const company = state.companies.find(c => c.id === id);
    if (!company) return;

    openModal('Editar Empresa', `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="edit-company-name" value="${company.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Cor</label>
            <input type="color" class="form-input" id="edit-company-color" value="${company.color}" style="height:44px;padding:4px;">
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateCompany(${id})">Salvar</button>
    `);
}

async function updateCompany(id) {
    try {
        await api(`/companies/${id}`, {
            method: 'PUT', body: {
                name: document.getElementById('edit-company-name').value.trim(),
                color: document.getElementById('edit-company-color').value,
            }
        });
        showToast('Empresa atualizada!');
        closeModal();
        loadCompanies();
    } catch (err) {
        console.error(err);
    }
}

async function deleteCompany(id) {
    if (!confirm('Excluir esta empresa? As tarefas associadas serão desvinculadas.')) return;
    try {
        await api(`/companies/${id}`, { method: 'DELETE' });
        showToast('Empresa excluída');
        loadCompanies();
    } catch (err) {
        console.error(err);
    }
}

async function configureCompany(id) {
    const company = state.companies.find(c => c.id === id);
    if (!company) return;

    const currentSettings = JSON.stringify(company.settings || { types: [], steps: {} }, null, 2);

    openModal(`Configurações de Passos: ${company.name}`, `
        <div style="font-size:13px;color:var(--text-tertiary);margin-bottom:12px;">
            Configure os Tipos de Tarefa e os Passos Padrão usando formato JSON.<br>
            Exemplo:<br>
            <code>{"types": ["Frontend", "Backend"], "steps": {"default": ["Passo 1"], "Frontend": ["Passo A", "Passo B"]}}</code>
        </div>
        <div class="form-group">
            <textarea class="form-input" id="company-settings-json" style="height:250px; font-family:monospace; font-size:13px;">${currentSettings}</textarea>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveCompanySettings(${id})">Salvar</button>
    `);
}

async function saveCompanySettings(id) {
    const company = state.companies.find(c => c.id === id);
    const jsonStr = document.getElementById('company-settings-json').value;
    let settingsObj;
    try {
        settingsObj = JSON.parse(jsonStr);
    } catch (e) {
        return showToast('Formato JSON inválido. Verifique os erros de sintaxe.', 'error');
    }

    try {
        await api(`/companies/${id}`, {
            method: 'PUT',
            body: { name: company.name, color: company.color, settings: settingsObj }
        });
        showToast('Configurações salvas!');
        closeModal();
        loadCompanies();
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// TAGS
// ============================================
async function loadTags() {
    try {
        state.tags = await api('/tags');
        renderTags();
    } catch (err) {
        console.error(err);
    }
}

function renderTags() {
    const container = document.getElementById('tags-list');
    const statusFilter = document.getElementById('filter-tag-status') ? document.getElementById('filter-tag-status').value : 'ACTIVE';

    let filteredTags = state.tags;
    if (statusFilter) {
        filteredTags = state.tags.filter(t => t.status === statusFilter);
    }

    if (filteredTags.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">🏷️</div>
            Nenhuma tag encontrada
        </div>`;
        return;
    }

    container.innerHTML = filteredTags.map(t => `
        <div class="tag-card">
            <div class="company-card-info">
                <div class="company-color-dot" style="background:${t.color}"></div>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span class="company-name">${t.name}</span>
                    ${t.status === 'DONE' ? '<span style="font-size:11px;font-weight:600;color:var(--text-tertiary);background:var(--border-light);padding:2px 6px;border-radius:100px;display:inline-block;width:fit-content;">DONE</span>' : ''}
                </div>
            </div>
            <div class="company-card-actions">
                <button class="btn btn-sm btn-secondary" onclick="editTag(${t.id})">Editar</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteTag(${t.id})" style="color:var(--danger)">Excluir</button>
            </div>
        </div>
    `).join('');
}

function showAddTagModal() {
    openModal('Nova Tag', `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="tag-name" placeholder="Nome da tag">
        </div>
        <div class="form-group">
            <label class="form-label">Cor</label>
            <input type="color" class="form-input" id="tag-color" value="#3B82F6" style="height:44px;padding:4px;">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" id="tag-status">
                <option value="ACTIVE" selected>ACTIVE</option>
                <option value="DONE">DONE</option>
            </select>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveTag()">Salvar</button>
    `);
}

async function saveTag() {
    const name = document.getElementById('tag-name').value.trim();
    if (!name) return showToast('Nome é obrigatório', 'error');

    try {
        await api('/tags', {
            method: 'POST', body: {
                name,
                color: document.getElementById('tag-color').value,
                status: document.getElementById('tag-status').value,
            }
        });
        showToast('Tag criada!');
        closeModal();
        loadTags();
    } catch (err) {
        console.error(err);
    }
}

async function editTag(id) {
    const tag = state.tags.find(t => t.id === id);
    if (!tag) return;

    openModal('Editar Tag', `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="edit-tag-name" value="${tag.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Cor</label>
            <input type="color" class="form-input" id="edit-tag-color" value="${tag.color}" style="height:44px;padding:4px;">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" id="edit-tag-status">
                <option value="ACTIVE" ${tag.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                <option value="DONE" ${tag.status === 'DONE' ? 'selected' : ''}>DONE</option>
            </select>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateTag(${id})">Salvar</button>
    `);
}

async function updateTag(id) {
    try {
        await api(`/tags/${id}`, {
            method: 'PUT', body: {
                name: document.getElementById('edit-tag-name').value.trim(),
                color: document.getElementById('edit-tag-color').value,
                status: document.getElementById('edit-tag-status').value,
            }
        });
        showToast('Tag atualizada!');
        closeModal();
        loadTags();
    } catch (err) {
        console.error(err);
    }
}

async function deleteTag(id) {
    if (!confirm('Excluir esta tag? Ela será removida de todas as tarefas associadas.')) return;
    try {
        await api(`/tags/${id}`, { method: 'DELETE' });
        showToast('Tag excluída');
        loadTags();
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// Helpers
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusLabel(status) {
    const labels = {
        'pending': 'Pendente',
        'in_progress': 'Em Progresso',
        'completed': 'Concluída',
        'paused': 'Pausada',
    };
    return labels[status] || status;
}

// ============================================
// Event Listeners & Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Expose functions to global scope for HTML onclick
    window.saveSystemSetting = saveSystemSetting;
    window.navigateTo = navigateTo;

    initNavigation();

    initModal();
    updateDate();
    loadSettings();
    loadDashboard();

    // Task type tabs
    document.querySelectorAll('#task-type-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#task-type-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.taskType = tab.dataset.type;
            loadTasks();
        });
    });

    // Filters
    document.getElementById('filter-company').addEventListener('change', loadTasks);
    document.getElementById('filter-status').addEventListener('change', loadTasks);

    // Add buttons
    document.getElementById('btn-add-task').addEventListener('click', showAddTaskModal);

    document.getElementById('btn-add-habit').addEventListener('click', showAddHabitModal);
    document.getElementById('btn-add-goal').addEventListener('click', showAddGoalModal);
    document.getElementById('btn-add-company').addEventListener('click', showAddCompanyModal);
    document.getElementById('btn-add-tag').addEventListener('click', showAddTagModal);
    document.getElementById('btn-add-note').addEventListener('click', showAddNoteModal);

    // Tag Filter
    const tagFilterEl = document.getElementById('filter-tag-status');
    if (tagFilterEl) {
        tagFilterEl.addEventListener('change', renderTags);
    }

    // Load dashboard
    loadDashboard();
});

// ============================================
// NOTES
// ============================================
async function loadNotes() {
    try {
        state.notes = await api('/notes');
        renderNotes();
    } catch (err) {
        console.error(err);
    }
}

function renderNotes() {
    const container = document.getElementById('notes-list');
    if (state.notes.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">📝</div>
            Nenhuma nota cadastrada
        </div>`;
        return;
    }

    container.innerHTML = state.notes.map(n => `
        <div class="tag-card" style="align-items:flex-start;">
            <div class="company-card-info" style="cursor:pointer;" onclick="showNote(${n.id})">
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <span class="company-name" style="font-size:16px;">${n.title}</span>
                    <span style="font-size:12px;color:var(--text-tertiary);">${formatDate(n.updated_at)}</span>
                </div>
            </div>
            <div class="company-card-actions" style="margin-top:16px; width:100%; display:flex; gap:8px;">
                <button class="btn btn-sm btn-secondary" onclick="editNote(${n.id})">Editar</button>
                <button class="btn btn-sm btn-ghost" onclick="deleteNote(${n.id})" style="color:var(--danger)">Excluir</button>
            </div>
        </div>
    `).join('');
}

function showAddNoteModal() {
    openModal('Nova Nota', `
        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" class="form-input" id="note-title" placeholder="Título da nota">
        </div>
        <div class="form-group">
            <label class="form-label">Conteúdo</label>
            <textarea class="form-input" id="note-content" placeholder="Escreva sua anotação..." style="height:300px;resize:vertical;"></textarea>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveNote()">Salvar</button>
    `, 'modal-lg');
}


async function saveNote() {
    const title = document.getElementById('note-title').value.trim();
    if (!title) return showToast('Título é obrigatório', 'error');

    try {
        await api('/notes', {
            method: 'POST', body: {
                title,
                content: document.getElementById('note-content').value
            }
        });
        showToast('Nota criada!');
        closeModal();
        loadNotes();
    } catch (err) {
        console.error(err);
    }
}

function showNote(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;

    openModal(note.title, `
        <div class="note-content-display" style="max-height:70vh;overflow-y:auto;padding-right:10px;">${note.content || ''}</div>
    `, `
        <span style="font-size:12px;color:var(--text-tertiary);margin-right:auto;">Última edição: ${formatDate(note.updated_at)}</span>
        <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
    `, 'modal-lg');
}



async function editNote(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;

    openModal('Editar Nota', `
        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" class="form-input" id="edit-note-title" value="${note.title}">
        </div>
        <div class="form-group">
            <label class="form-label">Conteúdo</label>
            <textarea class="form-input" id="edit-note-content" style="height:350px;resize:vertical;">${note.content || ''}</textarea>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="updateNote(${id})">Salvar</button>
    `, 'modal-lg');
}


async function updateNote(id) {
    try {
        await api(`/notes/${id}`, {
            method: 'PUT', body: {
                title: document.getElementById('edit-note-title').value.trim(),
                content: document.getElementById('edit-note-content').value,
            }
        });
        showToast('Nota atualizada!');
        closeModal();
        loadNotes();
    } catch (err) {
        console.error(err);
    }
}

async function deleteNote(id) {
    if (!confirm('Deseja mesmo excluir esta nota?')) return;
    try {
        await api(`/notes/${id}`, { method: 'DELETE' });
        showToast('Nota excluída!');
        loadNotes();
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// CALENDAR 
// ============================================
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
let tokenClient;
let gapiInited = false;
let gisInited = false;

window.onload = function () {
    if (window.gapi) {
        gapi.load('client', () => { gapiInited = true; maybeEnableCalendar(); });
    }
    if (window.google) {
        gisInited = true;
        maybeEnableCalendar();
    }
};

function maybeEnableCalendar() {
    const clientId = localStorage.getItem('google_client_id');
    if (gapiInited && gisInited && clientId) {
        initGoogleApi(clientId);
    }
}

async function initGoogleApi(clientId) {
    try {
        await gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (resp) => {
                if (resp.error !== undefined) {
                    throw resp;
                }
                document.getElementById('btn-auth-google').style.display = 'none';
                document.getElementById('btn-logout-google').style.display = 'inline-block';
                fetchEvents();
            },
        });

        document.getElementById('calendar-empty-state').innerHTML = `<div class="empty-state-icon">📅</div>Seu Client ID está configurado. Clique em Conectar Google para visualizar o calendário.`;
        document.getElementById('btn-auth-google').style.display = 'inline-block';
        document.getElementById('btn-auth-google').onclick = () => {
            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        };

        document.getElementById('btn-logout-google').onclick = () => {
            const token = gapi.client.getToken();
            if (token !== null) {
                google.accounts.oauth2.revoke(token.access_token, () => {
                    gapi.client.setToken('');
                    document.getElementById('full-calendar-container').style.display = 'none';
                    document.getElementById('calendar-empty-state').style.display = 'block';
                    document.getElementById('btn-auth-google').style.display = 'inline-block';
                    document.getElementById('btn-logout-google').style.display = 'none';
                });
            }
        };

        // Auto fetch if token already exists from session somehow
        if (gapi.client.getToken() !== null) {
            document.getElementById('btn-auth-google').style.display = 'none';
            document.getElementById('btn-logout-google').style.display = 'inline-block';
            fetchEvents();
        }

    } catch (e) {
        console.error('Error initializing GAPI client:', e);
    }
}

let calendar = null;

function loadCalendar() {
    const clientId = localStorage.getItem('google_client_id');
    if (!clientId) {
        document.getElementById('calendar-empty-state').style.display = 'block';
        document.getElementById('full-calendar-container').style.display = 'none';
    } else {
        maybeEnableCalendar();
        if (gapi.client && gapi.client.getToken() !== null) {
            document.getElementById('btn-auth-google').style.display = 'none';
            document.getElementById('btn-logout-google').style.display = 'inline-block';
            fetchEvents();
        }
    }

    // Auto-resize calendar if it exists
    if (calendar) {
        setTimeout(() => calendar.render(), 100);
    }
}

function configureGoogleClientId() {
    const currentId = localStorage.getItem('google_client_id') || '';
    openModal('Integração com Google Calendar', `
        <div class="form-group">
            <label class="form-label">Client ID (OAuth 2.0)</label>
            <input type="text" class="form-input" id="conf-google-client-id" placeholder="12345678...apps.googleusercontent.com" value="${currentId}">
            <p style="font-size:12px;color:var(--text-tertiary);margin-top:6px;">Esta chave fica salva apenas no seu navegador. Nunca enviada ao servidor.</p>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveGoogleClientId()">Salvar Client ID</button>
    `);
}

function saveGoogleClientId() {
    const val = document.getElementById('conf-google-client-id').value.trim();
    if (val) {
        localStorage.setItem('google_client_id', val);
        showToast('Client ID salvo com sucesso!', 'success');
        setTimeout(() => window.location.reload(), 1500);
    } else {
        localStorage.removeItem('google_client_id');
        showToast('Client ID removido!');
        closeModal();
    }
}

async function fetchEvents() {
    try {
        // Primeiro buscamos todas as agendas do usuário
        const calendarListResponse = await gapi.client.calendar.calendarList.list();
        const calendars = calendarListResponse.result.items;

        let allEvents = [];

        // Buscamos eventos de cada agenda individualmente
        for (const cal of calendars) {
            const eventsResponse = await gapi.client.calendar.events.list({
                'calendarId': cal.id,
                'timeMin': (new Date(new Date().setMonth(new Date().getMonth() - 2))).toISOString(), // 2 meses atrás
                'timeMax': (new Date(new Date().setMonth(new Date().getMonth() + 4))).toISOString(), // 4 meses a frente
                'showDeleted': false,
                'singleEvents': true,
            });

            const events = eventsResponse.result.items.map(ev => ({
                id: ev.id,
                title: ev.summary || '(Sem Título)',
                start: ev.start.dateTime || ev.start.date,
                end: ev.end.dateTime || ev.end.date,
                url: ev.htmlLink,
                backgroundColor: cal.backgroundColor,
                borderColor: cal.backgroundColor,
                extendedProps: {
                    description: ev.description,
                    location: ev.location,
                    calendarName: cal.summaryOverride || cal.summary
                }
            }));
            allEvents = allEvents.concat(events);
        }

        renderCalendar(allEvents);
    } catch (err) {
        showToast('Erro ao sincronizar agendas do Google.', 'error');
        console.error(err);
    }
}

function renderCalendar(events) {
    document.getElementById('calendar-empty-state').style.display = 'none';
    const container = document.getElementById('full-calendar-container');
    container.style.display = 'block';

    if (!calendar) {
        calendar = new FullCalendar.Calendar(container, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            themeSystem: 'standard',
            height: 'auto',
            events: events,
            eventClick: function (info) {
                info.jsEvent.preventDefault();
                if (info.event.url) {
                    window.open(info.event.url, '_blank');
                }
            },
            eventMouseEnter: function (info) {
                // Poderíamos adicionar tooltip aqui
            }
        });
        calendar.render();
    } else {
        calendar.removeAllEvents();
        calendar.addEventSource(events);
        calendar.render();
    }
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
    try {
        const settings = await api('/settings');
        state.settings = { ...state.settings, ...settings };

        // Update UI if on settings section
        if (state.currentSection === 'settings' && document.getElementById('setting-habit-limit')) {
            document.getElementById('setting-habit-limit').value = state.settings.habit_limit_days || '30';
        }
    } catch (err) {
        console.error('Settings load error:', err);
    }
}

async function saveSystemSetting(key, value) {
    try {
        await api('/settings', {
            method: 'POST',
            body: { key, value }
        });
        showToast('Configuração salva!');
        loadSettings();
    } catch (err) {
        console.error('Settings save error:', err);
    }
}




