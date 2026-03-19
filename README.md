# OrganizeYourLife

Sistema de organização pessoal e profissional.

## Como rodar

Um único comando para subir tudo (banco, API e frontend):

```bash
docker compose up --build -d
```

Acesse: **http://localhost:8080**

## Como parar

```bash
docker compose down
```

## Para resetar o banco de dados

```bash
docker compose down -v
docker compose up --build -d
```

## Estrutura

```
OrganizeYourLife/
├── docker-compose.yml     # Orquestração dos containers
├── db/
│   └── init.sql           # Schema e dados iniciais
├── api/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── index.js       # API REST (Express)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf          # Config do Nginx (proxy reverso)
    ├── index.html
    ├── styles.css
    └── app.js              # SPA JavaScript
```

## Funcionalidades

- **Dashboard**: Visão geral com stats de tasks, hábitos e metas
- **Tarefas por Empresa**: Crie e gerencie tasks organizadas por empresa
- **Tarefas Pontuais**: Tasks que precisam ser feitas apenas uma vez
- **Hábitos**: Acompanhe hábitos diários com contadores e histórico
- **Metas**: Defina metas com matérias/assuntos e acompanhe o progresso (%)
- **Empresas**: Cadastre e gerencie suas empresas

## Tecnologias

- **Frontend**: HTML, CSS, JavaScript (SPA)
- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL 16
- **Infraestrutura**: Docker Compose
