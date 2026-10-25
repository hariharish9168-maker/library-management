# System Architecture

## Architecture Overview
The Smart Library Management System is architectured as a multi-tier, decoupled full-stack web application designed for high availability, transactional reliability, and concurrent inventory tracking.

```mermaid
graph TD
    subgraph Client Tier [Frontend - React + Vite + TypeScript]
        UI[Tailwind CSS & Responsive Layout]
        Router[React Router DOM]
        State[AuthContext & JWT Store]
        BarcodeComp[JsBarcode Label Engine]
        Charts[Recharts Dashboard]
    end

    subgraph API Tier [Backend - Node.js + Express + TypeScript]
        MW_Auth[JWT Auth Middleware & RBAC Guard]
        MW_Err[Centralized Error & Audit Handler]
        Zod[Zod Request Validation]
        
        subgraph Controllers [REST API Controllers]
            C_Auth[Auth & Profile]
            C_Book[Catalogue & Categories]
            C_Copy[Copy Inventory & Barcodes]
            C_Loc[Location Hierarchy & Find]
            C_Loan[Issue & Return Engine]
            C_Fine[Fines & Payment Ledger]
            C_Dash[Live Database Metrics]
            C_Rep[CSV Export & Analytics]
        end
    end

    subgraph Data Tier [Relational Persistence]
        DB_Mgr[Unified Database Manager]
        MySQL[(MySQL 8.0 Primary Relational Engine)]
        SQLite[(Node:SQLite Persistent Engine)]
    end

    UI --> Router
    Router --> State
    State --> BarcodeComp
    State --> Charts
    UI -->|Axios REST Calls with Bearer JWT| MW_Auth

    MW_Auth --> Zod
    Zod --> Controllers
    Controllers --> MW_Err
    Controllers -->|Transactions & Row Locking| DB_Mgr

    DB_Mgr -->|Default in Docker/Prod| MySQL
    DB_Mgr -->|Local Zero-Config Fallback| SQLite
```

---

## Component Interaction Flow
1. **User Authentication**: Client submits credentials → `auth.controller` checks bcrypt hash → signs 24h JWT containing user role, student ID, and full name.
2. **Location Tracking**: User queries title → `location.controller` performs multi-table JOIN across `books`, `book_copies`, `shelves`, `racks`, `sections`, and `floors` → returns full hierarchical physical path.
3. **Issue Operation**: Concurrency check with `FOR UPDATE` lock → checks student active status, loan limits, and overdue restrictions → inserts `loans` record → marks copy `Issued` in atomic transaction.
4. **Return Operation**: Finds active loan → calculates overdue duration and daily fine → updates loan `Returned` → updates copy status → returns designated storage location coordinates for physical shelving.
