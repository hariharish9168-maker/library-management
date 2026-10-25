# Smart Library Management System with Book Location Tracking

A modern, production-ready, full-stack web application designed for academic libraries and institutions. The system manages book inventories, tracks individual physical copies, provides precision physical location navigation (**Floor → Section → Rack → Shelf**), processes issues and returns, calculates overdue fines, and maintains student borrowing ledgers.

---

## 1. Project Overview & Objectives
Managing large academic libraries requires more than a simple title list. Physical books are stored across diverse floors, sections, and shelves. Librarians and students spend substantial time trying to locate specific books.

### Primary Objectives:
- **Exact Physical Location Tracking**: Navigate every physical copy down to its exact **Floor**, **Section**, **Rack**, and **Shelf**.
- **Individual Physical Copy Management**: Track multiple copies of the same book independently with distinct accession numbers, barcodes, and wear conditions.
- **Accurate Circulation Workflows**: Concurrency-protected book issue and return processing preventing duplicate transactions.
- **Automatic Overdue Fine Engine**: Configurable grace periods, daily penalty rates (e.g. ₹2.00/day), fine caps, and payment ledgers.
- **Role-Based Access Control**: Strict server-side permission tiers for **Administrators**, **Librarians**, and **Students**.
- **Designated Shelving Guide**: Immediately upon returning a book, the librarian is shown the exact shelf coordinate where the book belongs.

---

## 2. Technology Stack

### Frontend:
- **React 18** with **Vite** (TypeScript)
- **Tailwind CSS** (Modern dark vertical sidebar, clean light workspace, responsive layouts)
- **React Router DOM** (Role-based Protected Routes)
- **Axios** (REST client with JWT interceptors)
- **Lucide React** (Consistent modern iconography)
- **Recharts** (Circulation and inventory analytics)
- **JsBarcode** (Vector SVG barcode generation and print-friendly labels)

### Backend:
- **Node.js** & **Express.js** (TypeScript REST API architecture)
- **JWT (JSON Web Tokens)** for stateless authentication
- **bcryptjs** (10 salt rounds password hashing)
- **Zod** (Robust request validation schemas)
- **Audit Logging** (Tracks sensitive circulation and administrative operations)

### Database:
- **MySQL 8.0** (Normalized 3NF relational schema with foreign keys, cascading rules, unique indexes, and ACID transactions)
- **mysql2/promise** connection pool with parameterized queries
- **Zero-Dependency Fallback Engine**: Auto-detection with built-in `node:sqlite` persistence for out-of-the-box local testing without requiring external daemons.

---

## 3. User Roles & Credentials

The system provides three pre-seeded test accounts for instant evaluation:

| Role | Email | Password | Permissions & Scope |
|---|---|---|---|
| **Administrator** | `admin@library.edu` | `admin123` | Full system control, staff provisioning, library circulation policies, fine formulas, audit logs, and catalogue archiving. |
| **Librarian** | `librarian@library.edu` | `librarian123` | Book catalogue CRUD, physical copy tracking, issue books, process returns, student registration, and fine collection. |
| **Student** | `student@library.edu` | `student123` | Browse catalogue, locate physical books on shelves, check active loans, view personal fines, place reservation holds. |

*Additional test student accounts: `alice@library.edu` (has sample overdue loan for fine testing) and `bob@library.edu` (password: `student123`).*

---

## 4. Key Features

### 4.1 Physical Location Engine
Every physical copy is mapped to a hierarchical path:
```
Floor 1 (Ground Floor) → CS & Engineering (CS-SEC) → Rack R01 (Algorithms) → Shelf S02
```
- **Find a Book Page**: Direct search that provides physical breadcrumbs and coordinates for each matching copy.
- **Rack & Shelf Manager**: Interactive floor plan showing shelf capacity and listing all books currently placed on each shelf.
- **Copy Transfer**: Easily move copies between shelves.

### 4.2 Barcode & Accession Tracking
- Every copy receives a unique Accession Number (e.g. `ACC-1001-A`) and optional Barcode.
- Printable barcode labels rendered dynamically via `JsBarcode`.
- USB barcode scanner friendly (detects Enter key from hardware scanners).

### 4.3 Circulation Engine (Issue & Return)
- **Issue Verification**: Checks student active status, checks borrowing limits (e.g. 3 books max), blocks students with overdue penalties.
- **Return Processing**: Dedicated return desk calculating overdue days, assessing fines, updating wear condition, and displaying designated shelving coordinates.
- **Concurrency Protection**: Database transactions with row-level locks prevent race conditions.

### 4.4 Configurable Fine Policy
- Configurable loan duration (default 14 days).
- Grace period (days before fines start).
- Configurable daily rate (default ₹2.00/day).
- Cash/online payment receipts and authorized waiver handling.

---

## 5. Project Structure

```
smart-library/
├── backend/                  # Node.js + Express + TypeScript REST API
│   ├── src/
│   │   ├── config/           # Environment configuration
│   │   ├── database/         # MySQL connection pool & setup runner
│   │   ├── controllers/      # 12 business logic controllers
│   │   ├── routes/           # REST endpoints
│   │   ├── middlewares/      # JWT auth, RBAC guard, error handling
│   │   ├── utils/            # JWT helper, fine calculator
│   │   ├── app.ts            # Express app configuration
│   │   └── index.ts          # Server entrypoint
│   ├── tests/                # Automated Vitest integration test suite
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # React + Vite + TypeScript Client
│   ├── src/
│   │   ├── api/              # Axios client with interceptors
│   │   ├── context/          # AuthContext & Session management
│   │   ├── components/       # Reusable layout, stat cards, modals, barcodes
│   │   ├── pages/            # 21 complete page views
│   │   ├── App.tsx           # Route configuration & guards
│   │   └── main.tsx          # Client entrypoint
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── database/                 # Database DDL & Seed Scripts
│   ├── schema.sql            # Normalized MySQL schema with foreign keys
│   └── seed.sql              # Initial categories, books, copies, locations
│
├── docs/                     # Comprehensive System Documentation
│   ├── SRS.md                # Software Requirements Specification
│   ├── architecture.md       # Multi-tier System Architecture
│   ├── erd.md                # Entity-Relationship Diagram (Mermaid)
│   ├── dfd.md                # Data Flow Diagrams (Context & Level 1)
│   ├── use_cases.md          # Actor Use-Case Diagram
│   ├── issue_return_workflow.md # Circulation Sequence Diagrams
│   ├── database_schema.md    # Detailed Database Table Dictionary
│   ├── test_results.md       # Automated Test Cases Matrix & Logs
│   └── deployment_guide.md   # Production Deployment Instructions
│
├── .env.example              # Example environment variables
├── docker-compose.yml        # 1-click Docker multi-container stack
└── README.md                 # Master documentation
```

---

## 6. Installation & Local Setup

### Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **npm** v9+
- *(Optional)* **MySQL** 8.0 or Docker

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/your-username/smart-library.git
cd smart-library

# Copy environment variables
cp .env.example .env
```

### Step 2: Install Dependencies
```bash
# Install backend packages
cd backend
npm install

# Install frontend packages
cd ../frontend
npm install
```

### Step 3: Database Setup
You can run against a local MySQL server or use the automatic fallback:
```bash
# If using MySQL, create the database and run setup:
cd ../backend
npm run db:setup
```
*Note: If MySQL is not running on port 3306, the database manager automatically falls back to the embedded relational SQLite engine in `database/smart_library.sqlite` with the exact same schema and seeds.*

### Step 4: Run the Automated Test Suite
```bash
cd backend
npm test
```
All 11 automated integration tests will execute and verify authentication, book creation, location lookup, issue workflows, duplicate prevention, and return calculations.

### Step 5: Start Development Servers
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Server runs at http://localhost:5000/api
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Client runs at http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser and use any of the quick demo credentials on the login screen!

---

## 7. 1-Click Docker Deployment
To launch MySQL 8.0, Backend, and Frontend containers simultaneously:
```bash
docker-compose up -d
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- MySQL Database: `localhost:3306`

---

## 8. REST API Endpoints Overview

| Method | Endpoint | Access Tier | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Sign in with email/username and password |
| `POST` | `/api/auth/register` | Public | Student borrower registration |
| `GET` | `/api/auth/me` | Authenticated | Fetch current user session profile |
| `GET` | `/api/books` | Authenticated | Search & filter book titles with copy counts |
| `POST` | `/api/books` | Staff | Add new book title |
| `GET` | `/api/books/:id` | Authenticated | Book details with all physical copies and coordinates |
| `GET` | `/api/copies` | Authenticated | List physical copies by accession, status, or condition |
| `GET` | `/api/locations/find` | Authenticated | **Find a Book**: returns complete Floor → Sec → Rack → Shelf path |
| `GET` | `/api/locations/hierarchy` | Authenticated | Full building location tree |
| `POST` | `/api/loans/issue` | Staff | Transactional issue with limit & overdue checking |
| `GET` | `/api/loans/return-search` | Staff | Find active loan by barcode, accession, or student |
| `POST` | `/api/loans/return` | Staff | Process return, calculate fine, and display shelving location |
| `GET` | `/api/loans/active` | Authenticated | Active loans list with live overdue days and fine |
| `GET` | `/api/loans/history` | Authenticated | Transaction history (student personal or staff full) |
| `GET` | `/api/loans/overdue` | Authenticated | Overdue books tracker with contact info |
| `GET` | `/api/fines` | Authenticated | Fine ledger and payment statuses |
| `POST` | `/api/fines/pay` | Staff | Record cash/online fine payment |
| `POST` | `/api/fines/waive` | Staff | Authorize official fine waiver |
| `GET` | `/api/reports/books/csv` | Staff | Download catalogue master CSV |
| `GET` | `/api/reports/loans/csv` | Staff | Download circulation transactions CSV |
| `GET` | `/api/dashboard/stats` | Authenticated | Live calculated database statistics |

---

## 9. College Project & Viva Presentation Highlights
- **Architecture**: Decoupled 3-tier architecture with stateless JWT security.
- **Database Normalization**: 3NF normalized tables with foreign keys and cascading rules.
- **Physical Book Location Hierarchy**: Realistic tracking of exact shelf coordinates (`Floor → Section → Rack → Shelf`).
- **Concurrency & ACID**: Concurrency protection during book issues via database transactions.
- **Shelving Return Feature**: When a book is returned, librarians are guided with the exact shelving coordinates.
- **Automated Tests**: Comprehensive integration test suite verifying critical business constraints.
