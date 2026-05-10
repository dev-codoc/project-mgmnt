# ProjectHub — Multi-User Project Management Dashboard

A full-stack **Mini CRM / Project Management** application with authentication, role-based access control, task management, search/filter, and pagination. Built with the MERN stack.

---

## 📁 Project Structure

```
project-mgmt/
├── backend/                  # Node.js + Express REST API
│   ├── src/
│   │   ├── config/           # DB connection
│   │   ├── controllers/      # Business logic (auth, projects, tasks)
│   │   ├── middleware/        # Auth, RBAC, error handler, validators
│   │   ├── models/            # Mongoose schemas (User, Project, Task)
│   │   ├── routes/            # Express routers
│   │   └── utils/             # Seed script
│   ├── Dockerfile
│   └── package.json
├── frontend/                  # React 18 SPA
│   ├── src/
│   │   ├── api/               # Axios client + API modules
│   │   ├── pages/             # Route-level components
│   │   ├── components/        # Layout, shared UI
│   │   └── store/             # Zustand global state
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/ci.yml  # GitHub Actions CI/CD
├── docker-compose.yml         # Full local dev environment
└── README.md
```

---

## ⚡ Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- MongoDB running locally OR Docker

### Option A — Manual

```bash
# Clone and enter project
git clone <repo-url>
cd project-mgmt

# ── Backend ──
cd backend
cp .env.example .env          # Edit MONGO_URI and JWT_SECRET
npm install
npm run seed                  # Seed demo users + projects
npm run dev                   # Starts on :5000

# ── Frontend (new terminal) ──
cd frontend
npm install
npm start                     # Starts on :3000
```

### Option B — Docker Compose

```bash
docker-compose up --build
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

---

## 🔑 Demo Credentials

| Role  | Email            | Password    |
|-------|------------------|-------------|
| Admin | admin@demo.com   | password123 |
| User  | alice@demo.com   | password123 |
| User  | bob@demo.com     | password123 |

---

## 🗄️ Database Design

### Users Collection
| Field     | Type     | Notes                          |
|-----------|----------|--------------------------------|
| _id       | ObjectId | Primary key                    |
| name      | String   | Required, max 50               |
| email     | String   | Unique, indexed                |
| password  | String   | bcrypt hashed, select: false   |
| role      | String   | 'admin' \| 'user'             |
| isActive  | Boolean  | Soft-delete support            |
| createdAt | Date     | Auto                           |

### Projects Collection
| Field       | Type       | Notes                          |
|-------------|------------|--------------------------------|
| _id         | ObjectId   | Primary key                    |
| name        | String     | Required, text-indexed         |
| description | String     | Optional                       |
| status      | String     | active/on-hold/completed/archived |
| priority    | String     | low/medium/high/critical       |
| owner       | ObjectId   | Ref: User, indexed             |
| members     | ObjectId[] | Ref: User[]                    |
| dueDate     | Date       | Optional                       |
| tags        | String[]   | Array of tag strings           |

### Tasks Collection
| Field       | Type     | Notes                          |
|-------------|----------|--------------------------------|
| _id         | ObjectId | Primary key                    |
| title       | String   | Required, text-indexed         |
| description | String   | Optional                       |
| status      | String   | todo/in-progress/review/done   |
| priority    | String   | low/medium/high/critical       |
| project     | ObjectId | Ref: Project, indexed          |
| assignee    | ObjectId | Ref: User, indexed             |
| createdBy   | ObjectId | Ref: User                      |
| dueDate     | Date     | Indexed for overdue queries    |
| completedAt | Date     | Auto-set when status = 'done'  |

### Indexes
- `User.email` — unique index (fast login lookup)
- `Project.name + description` — compound text index (search)
- `Task.title + description` — compound text index (search)
- `Task.project, Task.assignee, Task.status, Task.dueDate` — individual indexes for filter performance

### Relationships
```
User (1) ──── (many) Project   [owner]
User (many) ── (many) Project  [members]
Project (1) ── (many) Task     [project ref]
User (1) ──── (many) Task      [assignee]
```

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api
```

All protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Auth Routes

| Method | Endpoint              | Auth  | Description                |
|--------|-----------------------|-------|----------------------------|
| POST   | /auth/register        | No    | Register new user          |
| POST   | /auth/login           | No    | Login, returns JWT         |
| GET    | /auth/me              | Yes   | Get current user           |
| GET    | /auth/users           | Admin | List all users             |
| PATCH  | /auth/users/:id/role  | Admin | Update user role           |

### Project Routes

| Method | Endpoint           | Auth    | Description                     |
|--------|--------------------|---------|----------------------------------|
| GET    | /projects/stats    | Yes     | Dashboard statistics             |
| GET    | /projects          | Yes     | List projects (paginated, filter)|
| POST   | /projects          | Yes     | Create project                   |
| GET    | /projects/:id      | Yes     | Get project + tasks              |
| PUT    | /projects/:id      | Owner/Admin | Update project              |
| DELETE | /projects/:id      | Owner/Admin | Delete project + tasks      |

**Query params for GET /projects:**
- `page`, `limit` — pagination
- `status` — filter by status
- `priority` — filter by priority
- `search` — full-text search
- `sortBy` — e.g. `-createdAt`, `name`

### Task Routes

| Method | Endpoint    | Auth           | Description                     |
|--------|-------------|----------------|----------------------------------|
| GET    | /tasks      | Yes            | List tasks (paginated, filter)   |
| POST   | /tasks      | Yes            | Create task                      |
| GET    | /tasks/:id  | Yes            | Get single task                  |
| PUT    | /tasks/:id  | Member/Admin   | Update task                      |
| DELETE | /tasks/:id  | Creator/Admin  | Delete task                      |

**Query params for GET /tasks:**
- `page`, `limit` — pagination
- `project` — filter by project ID
- `status`, `priority`, `assignee` — filters
- `search` — full-text search
- `myTasks=true` — show only tasks assigned to me

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  React SPA                       │
│  Zustand (auth state) + Axios (API client)       │
│  Pages: Dashboard, Projects, Tasks, Users        │
└────────────────────┬────────────────────────────┘
                     │ HTTP / REST
┌────────────────────▼────────────────────────────┐
│           Express REST API (Node.js)             │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Auth   │ │ Projects │ │     Tasks        │  │
│  │ Routes  │ │  Routes  │ │     Routes       │  │
│  └────┬────┘ └────┬─────┘ └────────┬─────────┘  │
│       │           │                │             │
│  ┌────▼───────────▼────────────────▼──────────┐  │
│  │         Middleware Layer                    │  │
│  │  protect() · authorize() · validate()      │  │
│  │  errorHandler · notFound                   │  │
│  └────────────────────────────────────────────┘  │
│                     │                            │
│  ┌──────────────────▼──────────────────────────┐ │
│  │             Controllers                      │ │
│  │  authController · projectController ·        │ │
│  │  taskController                              │ │
│  └──────────────────┬───────────────────────── ┘ │
└─────────────────────┼────────────────────────────┘
                      │ Mongoose ODM
┌─────────────────────▼────────────────────────────┐
│               MongoDB Atlas / Local               │
│          Users · Projects · Tasks                 │
└───────────────────────────────────────────────────┘
```

---

## 🛡️ Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- JWT tokens (7-day expiry, signed with secret)
- All sensitive routes protected via `protect` middleware
- Role-based access via `authorize('admin')` middleware
- Input validation via `express-validator` on all write routes
- Resource ownership checks (only owner/admin can edit/delete)
- Centralized error handling (no stack traces in production)

---

## ✨ Features Checklist

| Feature                        | Status |
|-------------------------------|--------|
| JWT Authentication             | ✅     |
| Signup / Login                 | ✅     |
| Dashboard with stats           | ✅     |
| Project CRUD                   | ✅     |
| Task CRUD                      | ✅     |
| Assign tasks to users          | ✅     |
| Task status tracking           | ✅     |
| Kanban board per project       | ✅     |
| Search (full-text)             | ✅     |
| Filter (status, priority, etc) | ✅     |
| Pagination (backend + frontend)| ✅     |
| Role-based access (Admin/User) | ✅     |
| Input validation + error msgs  | ✅     |
| Responsive UI                  | ✅     |
| Docker / Docker Compose        | ✅     |
| CI/CD (GitHub Actions)         | ✅     |
| Seed data script               | ✅     |

---

## 🚀 Deployment

### Backend → Render.com

1. Create a new **Web Service** on Render
2. Connect GitHub repo, set root directory to `backend/`
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Add environment variables from `.env.example`

### Frontend → Vercel

1. Import repo on Vercel
2. Set root directory to `frontend/`
3. Add env: `REACT_APP_API_URL=https://your-backend.onrender.com/api`
4. Deploy

### MongoDB → MongoDB Atlas

1. Create free cluster at cloud.mongodb.com
2. Get connection string, set as `MONGO_URI` in backend env

---

## 🧪 Running Tests

```bash
# Backend
cd backend && npm test

# Seed fresh demo data
npm run seed
```

---

## 👤 Author

Built as part of a Full Stack Developer Assessment.

Tech stack: **MongoDB · Express · React 18 · Node.js · Zustand · JWT · bcrypt · Docker · GitHub Actions**
