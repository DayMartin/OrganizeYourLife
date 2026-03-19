-- OrganizeYourLife Database Schema

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('company', 'punctual')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    company_task_type VARCHAR(255),
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_steps (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DONE')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
    icon VARCHAR(50) DEFAULT '✓',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(habit_id, logged_at)
);

CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_subjects (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_at TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_company ON tasks(company_id);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_steps_task ON task_steps(task_id);
CREATE INDEX idx_task_tags_task ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_date ON habit_logs(logged_at);
CREATE INDEX idx_goal_subjects_goal ON goal_subjects(goal_id);

-- Seed some sample data
INSERT INTO companies (name, color, settings) VALUES
    ('AXOMA', '#ce850fff', '{"types": [], "steps": {"default": ["In progresing", "Open PR", "Code review", "Build", "Deploy", "Done"]}}'::jsonb),
    ('JOHNSON', '#d12288ff', '{"types": ["Hybrid", "Tiger"], "steps": {"Hybrid": ["In progresing", "Open PR in Hybrid", "Open PR in QA", "Rodar pipeline", "Open PR in UAT", "Rodar pipeline", "Done"], "Tiger": ["In progresing", "Open PR in Tiger", "Open PR in Hybrid", "Open PR in QA", "Rodar pipeline", "Open PR in UAT", "Rodar pipeline", "Done"]}}'::jsonb),
    ('CAPGEMINI', '#a85393ff', '{}'::jsonb);
    ('SEGUE', '#1ea556ff', '{}'::jsonb);


INSERT INTO tags (name, color) VALUES
    ('Frontend', '#3B82F6'),
    ('Backend', '#EF4444'),
    ('Bug', '#F59E0B');

INSERT INTO habits (name, description, icon) VALUES
    ('Exercício', 'Fazer pelo menos 30 min de exercício', '🏋️'),
    ('Leitura', 'Ler pelo menos 20 páginas', '📖'),
    ('Meditação', 'Meditar por 10 minutos', '🧘'),
    ('Água', 'Beber 2L de água', '💧');

INSERT INTO goals (title, description, category) VALUES
    ('Curso de TypeScript', 'Dominar TypeScript avançado', 'Programação'),
    ('Inglês Avançado', 'Alcançar fluência em inglês', 'Idiomas');

INSERT INTO goal_subjects (goal_id, title, sort_order) VALUES
    (1, 'Tipos Básicos e Interfaces', 1),
    (1, 'Generics', 2),
    (1, 'Decorators', 3),
    (1, 'Utility Types', 4),
    (2, 'Grammar Advanced', 1),
    (2, 'Business English', 2),
    (2, 'Conversação', 3);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES ('habit_limit_days', '30') ON CONFLICT (key) DO NOTHING;

