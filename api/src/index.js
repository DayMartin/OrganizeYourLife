const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'organize',
    password: process.env.DB_PASS || 'organize123',
    database: process.env.DB_NAME || 'organizedb',
});

// Helper to get habit limit interval
async function getHabitInterval() {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'habit_limit_days'");
        if (result.rows.length > 0) {
            const val = result.rows[0].value;
            if (val === 'infinito' || val === 0 || val === '0' || val === null || val === '') {
                return "INTERVAL '1000 years'";
            }

            return `INTERVAL '${val} days'`;
        }
    } catch (e) {
        console.error('getHabitInterval error:', e);
    }
    return "INTERVAL '30 days'";
}


// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ========================
// DASHBOARD
// ========================
app.get('/api/dashboard', async (req, res) => {
    try {
        // Tasks by company
        const tasksByCompany = await pool.query(`
      SELECT c.name as company_name, c.color,
        COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
        COUNT(*) as total
      FROM tasks t
      JOIN companies c ON t.company_id = c.id
      WHERE t.type = 'company'
      GROUP BY c.id, c.name, c.color
      ORDER BY c.name
    `);

        // Punctual tasks stats
        const punctualStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) as total
      FROM tasks WHERE type = 'punctual'
    `);

        // Habit stats (configurable limit)
        const limitInterval = await getHabitInterval();
        const habitStats = await pool.query(`
      SELECT h.id, h.name, h.icon,
        COUNT(hl.id) as times_done,
        MAX(hl.logged_at) as last_done
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id 
        AND hl.logged_at >= CURRENT_DATE - ${limitInterval}
      WHERE h.is_active = true
      GROUP BY h.id, h.name, h.icon
      ORDER BY h.name
    `);


        // Today's habits
        const todayHabits = await pool.query(`
      SELECT h.id, h.name, h.icon,
        CASE WHEN hl.id IS NOT NULL THEN true ELSE false END as done_today
      FROM habits h
      LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.logged_at = CURRENT_DATE
      WHERE h.is_active = true
      ORDER BY h.name
    `);

        // Goals progress
        const goalsProgress = await pool.query(`
      SELECT g.id, g.title, g.status, g.category,
        COUNT(gs.id) as total_subjects,
        COUNT(gs.id) FILTER (WHERE gs.status = 'completed') as completed_subjects
      FROM goals g
      LEFT JOIN goal_subjects gs ON g.id = gs.goal_id
      GROUP BY g.id, g.title, g.status, g.category
      ORDER BY g.created_at DESC
    `);

        // Overall stats
        const overallStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as total_tasks_completed,
        (SELECT COUNT(*) FROM habit_logs WHERE logged_at >= CURRENT_DATE - ${limitInterval}) as habits_limit_days,
        (SELECT COUNT(*) FROM goals WHERE status = 'completed') as goals_completed,
        (SELECT COUNT(*) FROM goals) as total_goals
    `);


        res.json({
            tasksByCompany: tasksByCompany.rows,
            punctualStats: punctualStats.rows[0],
            habitStats: habitStats.rows,
            todayHabits: todayHabits.rows,
            goalsProgress: goalsProgress.rows,
            overallStats: overallStats.rows[0],
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========================
// COMPANIES
// ========================
app.get('/api/companies', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM companies ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/companies', async (req, res) => {
    try {
        const { name, color, settings } = req.body;
        const result = await pool.query(
            'INSERT INTO companies (name, color, settings) VALUES ($1, $2, $3) RETURNING *',
            [name, color || '#6B7280', settings || { types: [], steps: {} }]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/companies/:id', async (req, res) => {
    try {
        const { name, color, settings } = req.body;
        const result = await pool.query(
            'UPDATE companies SET name=$1, color=$2, settings=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
            [name, color, settings || { types: [], steps: {} }, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/companies/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM companies WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// TAGS
// ========================
app.get('/api/tags', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tags ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tags', async (req, res) => {
    try {
        const { name, color, status } = req.body;
        const result = await pool.query(
            'INSERT INTO tags (name, color, status) VALUES ($1, $2, $3) RETURNING *',
            [name, color || '#6B7280', status || 'ACTIVE']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tags/:id', async (req, res) => {
    try {
        const { name, color, status } = req.body;
        const result = await pool.query(
            'UPDATE tags SET name=$1, color=$2, status=$3 WHERE id=$4 RETURNING *',
            [name, color, status || 'ACTIVE', req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tags/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tags WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// NOTES
// ========================
app.get('/api/notes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes ORDER BY updated_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notes', async (req, res) => {
    try {
        const { title, content } = req.body;
        const result = await pool.query(
            'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
            [title, content || '']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notes/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        const result = await pool.query(
            'UPDATE notes SET title=$1, content=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
            [title, content, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM notes WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// SETTINGS
// ========================
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM system_settings');
        const settings = {};
        result.rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const { key, value } = req.body;
        await pool.query(
            'INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
            [key, JSON.stringify(value)]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const { type, company_id, status } = req.query;
        let query = `
      SELECT t.*, c.name as company_name, c.color as company_color,
        (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id) as total_steps,
        (SELECT COUNT(*) FROM task_steps WHERE task_id = t.id AND is_completed = true) as completed_steps,
        COALESCE(
          (SELECT json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color, 'status', tg.status))
           FROM task_tags tt JOIN tags tg ON tt.tag_id = tg.id WHERE tt.task_id = t.id),
          '[]'::json
        ) as tags
      FROM tasks t
      LEFT JOIN companies c ON t.company_id = c.id
      WHERE 1=1
    `;
        const params = [];
        if (type) {
            params.push(type);
            query += ` AND t.type = $${params.length}`;
        }
        if (company_id) {
            params.push(company_id);
            query += ` AND t.company_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND t.status = $${params.length}`;
        }
        query += ' ORDER BY t.created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, company_id, type, priority, due_date, company_task_type, tags } = req.body;
        const result = await pool.query(
            `INSERT INTO tasks (title, description, company_id, type, priority, due_date, company_task_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description, company_id || null, type, priority || 'medium', due_date || null, company_task_type || null]
        );
        const task = result.rows[0];

        // Process tags
        if (tags && Array.isArray(tags) && tags.length > 0) {
            for (const tagId of tags) {
                await pool.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [task.id, tagId]);
            }
        }

        // Process steps based on company settings
        if (company_id) {
            const companyRes = await pool.query('SELECT settings FROM companies WHERE id = $1', [company_id]);
            if (companyRes.rows.length > 0) {
                const settings = companyRes.rows[0].settings || {};
                let stepsToCreate = [];

                if (settings.steps) {
                    if (company_task_type && settings.steps[company_task_type]) {
                        stepsToCreate = settings.steps[company_task_type];
                    } else if (settings.steps['default']) {
                        stepsToCreate = settings.steps['default'];
                    }
                }

                if (Array.isArray(stepsToCreate)) {
                    for (let i = 0; i < stepsToCreate.length; i++) {
                        await pool.query(
                            'INSERT INTO task_steps (task_id, title, sort_order) VALUES ($1, $2, $3)',
                            [task.id, stepsToCreate[i], i]
                        );
                    }
                }
            }
        }

        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const { title, description, company_id, status, priority, due_date, company_task_type, tags } = req.body;
        const completed_at = status === 'completed' ? 'NOW()' : 'NULL';
        const result = await pool.query(
            `UPDATE tasks SET title=$1, description=$2, company_id=$3, status=$4, 
       priority=$5, due_date=$6, company_task_type=$7, completed_at=${completed_at}, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
            [title, description, company_id, status, priority, due_date, company_task_type || null, taskId]
        );

        // Update tags
        if (tags && Array.isArray(tags)) {
            await pool.query('DELETE FROM task_tags WHERE task_id = $1', [taskId]);
            for (const tagId of tags) {
                await pool.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)', [taskId, tagId]);
            }
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const completed_at = status === 'completed' ? 'NOW()' : 'NULL';
        const result = await pool.query(
            `UPDATE tasks SET status=$1, completed_at=${completed_at}, updated_at=NOW() WHERE id=$2 RETURNING *`,
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// TASK STEPS
// ========================
app.get('/api/tasks/:id/steps', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM task_steps WHERE task_id = $1 ORDER BY sort_order, created_at',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks/:id/steps', async (req, res) => {
    try {
        const { title, sort_order } = req.body;
        const result = await pool.query(
            'INSERT INTO task_steps (task_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, title, sort_order || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/steps/:id/toggle', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE task_steps SET is_completed = NOT is_completed, 
             completed_at = CASE WHEN is_completed THEN NULL ELSE NOW() END
             WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/steps/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM task_steps WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================
// HABITS
// ========================
app.get('/api/habits', async (req, res) => {
    try {
        const limitInterval = await getHabitInterval();
        const result = await pool.query(`
      SELECT h.*, 
        (SELECT COUNT(*) FROM habit_logs WHERE habit_id = h.id) as total_logs,
        (SELECT COUNT(*) FROM habit_logs WHERE habit_id = h.id AND logged_at >= CURRENT_DATE - ${limitInterval}) as logs_limit,
        (SELECT COUNT(*) FROM habit_logs WHERE habit_id = h.id AND logged_at >= CURRENT_DATE - INTERVAL '7 days') as logs_last_7,
        CASE WHEN EXISTS (SELECT 1 FROM habit_logs WHERE habit_id = h.id AND logged_at = CURRENT_DATE) 
          THEN true ELSE false END as done_today
      FROM habits h
      ORDER BY h.name
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/habits', async (req, res) => {
    try {
        const { name, description, frequency, icon } = req.body;
        const result = await pool.query(
            'INSERT INTO habits (name, description, frequency, icon) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, frequency || 'daily', icon || '✓']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/habits/:id', async (req, res) => {
    try {
        const { name, description, frequency, icon, is_active } = req.body;
        const result = await pool.query(
            `UPDATE habits SET name=$1, description=$2, frequency=$3, icon=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
            [name, description, frequency, icon, is_active, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/habits/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM habits WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle habit for today
app.post('/api/habits/:id/toggle', async (req, res) => {
    try {
        const habitId = req.params.id;
        const date = req.body.date || new Date().toISOString().split('T')[0];

        const existing = await pool.query(
            'SELECT id FROM habit_logs WHERE habit_id = $1 AND logged_at = $2',
            [habitId, date]
        );

        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM habit_logs WHERE habit_id = $1 AND logged_at = $2', [habitId, date]);
            res.json({ toggled: false });
        } else {
            await pool.query(
                'INSERT INTO habit_logs (habit_id, logged_at) VALUES ($1, $2)',
                [habitId, date]
            );
            res.json({ toggled: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Habit history (configurable limit)
app.get('/api/habits/:id/history', async (req, res) => {
    try {
        const limitInterval = await getHabitInterval();
        const result = await pool.query(
            `SELECT logged_at, notes FROM habit_logs 
       WHERE habit_id = $1 AND logged_at >= CURRENT_DATE - ${limitInterval}
       ORDER BY logged_at DESC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ========================
// GOALS
// ========================
app.get('/api/goals', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT g.*,
        COUNT(gs.id) as total_subjects,
        COUNT(gs.id) FILTER (WHERE gs.status = 'completed') as completed_subjects,
        CASE WHEN COUNT(gs.id) > 0 
          THEN ROUND(COUNT(gs.id) FILTER (WHERE gs.status = 'completed')::numeric / COUNT(gs.id) * 100)
          ELSE 0 END as progress_percent
      FROM goals g
      LEFT JOIN goal_subjects gs ON g.id = gs.goal_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/goals/:id', async (req, res) => {
    try {
        const goal = await pool.query('SELECT * FROM goals WHERE id = $1', [req.params.id]);
        if (goal.rows.length === 0) return res.status(404).json({ error: 'Goal not found' });

        const subjects = await pool.query(
            'SELECT * FROM goal_subjects WHERE goal_id = $1 ORDER BY sort_order, created_at',
            [req.params.id]
        );

        res.json({ ...goal.rows[0], subjects: subjects.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals', async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const result = await pool.query(
            'INSERT INTO goals (title, description, category) VALUES ($1, $2, $3) RETURNING *',
            [title, description, category]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/goals/:id', async (req, res) => {
    try {
        const { title, description, category, status } = req.body;
        const completed_at = status === 'completed' ? 'NOW()' : 'NULL';
        const result = await pool.query(
            `UPDATE goals SET title=$1, description=$2, category=$3, status=$4, 
       completed_at=${completed_at}, updated_at=NOW() WHERE id=$5 RETURNING *`,
            [title, description, category, status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/goals/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM goals WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Goal Subjects
app.post('/api/goals/:id/subjects', async (req, res) => {
    try {
        const { title, description, sort_order } = req.body;
        const result = await pool.query(
            'INSERT INTO goal_subjects (goal_id, title, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.params.id, title, description, sort_order || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/subjects/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const completed_at = status === 'completed' ? 'NOW()' : 'NULL';
        const result = await pool.query(
            `UPDATE goal_subjects SET status=$1, completed_at=${completed_at}, updated_at=NOW() WHERE id=$2 RETURNING *`,
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/subjects/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM goal_subjects WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`OrganizeYourLife API running on port ${PORT}`);
});
