# Software Requirements Specification (SRS)
## Smart Library Management System with Book Location Tracking

### 1. Introduction
#### 1.1 Purpose
This document provides a comprehensive specification for the Smart Library Management System with Book Location Tracking. It defines the functional requirements, non-functional requirements, data models, user roles, and constraints necessary to build, deploy, and maintain the system.

#### 1.2 Scope
The system automates library operations including book cataloguing, physical copy inventory, precise physical location tracking (Floor → Section → Rack → Shelf), circulation workflows (issue and return), overdue penalty calculation, student account management, and analytical reporting.

---

### 2. Overall Description
#### 2.1 Product Perspective
Smart Library is an enterprise-grade full-stack web application with a decoupled REST API backend, a relational database (MySQL), and a responsive React Single Page Application (SPA).

#### 2.2 User Classes and Characteristics
1. **System Administrator**: Manages staff credentials, library-wide circulation policies, fine formulas, audit logs, and overall system health.
2. **Librarian (Staff)**: Performs daily circulation desk duties (issuing and returning books), manages individual copy locations, tracks overdue items, registers student borrowers, and records fine receipts.
3. **Student (Borrower)**: Authenticated borrower who searches the catalogue, looks up exact physical shelf coordinates, tracks personal active loans, views personal fine ledgers, and places reservation holds.

---

### 3. Functional Requirements

#### 3.1 Authentication & Security (FR-01)
- **FR-01.1**: The system shall support secure password authentication using `bcrypt` (10 salt rounds).
- **FR-01.2**: JSON Web Tokens (JWT) shall be signed and verified on every protected request.
- **FR-01.3**: Public registration shall only permit creating `student` accounts. Administrative role escalation is strictly blocked on the backend.
- **FR-01.4**: Student borrowers can only view their own loan history, fines, and profile.

#### 3.2 Book Catalogue & Inventory (FR-02)
- **FR-02.1**: Book titles shall record Title, Author, ISBN, Publisher, Edition, Year, Category, and Description.
- **FR-02.2**: Physical copies shall be tracked independently, each having an Accession Number, Barcode, Condition, and Status (`Available`, `Issued`, `Reserved`, `Maintenance`, `Archived`).
- **FR-02.3**: Safe archiving shall soft-delete book records without destroying historical loan transactions.
- **FR-02.4**: Total, Available, and Issued copies shall be computed dynamically from authoritative copy records.

#### 3.3 Physical Book Location Tracking (FR-03) - Core Feature
- **FR-03.1**: The system shall enforce a strict physical location hierarchy: `Floor → Section → Rack → Shelf`.
- **FR-03.2**: Every copy can be assigned to a specific shelf or marked as unassigned (sorting desk).
- **FR-03.3**: The dedicated "Find a Book" search shall display full location paths (e.g., `Floor 1 → Electronics Section (ELEC-SEC) → Rack R03 → Shelf S02`).
- **FR-03.4**: When multiple copies exist on different shelves, each copy and its exact coordinate shall be displayed separately.
- **FR-03.5**: Upon book return, the system shall prominently display the designated shelving location so librarians know where to shelve the returned item.

#### 3.4 Circulation: Book Issue (FR-04)
- **FR-04.1**: Verification of active student status and checking against the student's borrowing limit (`max_books_allowed`).
- **FR-04.2**: Blocking issue requests if the student possesses overdue books past due date.
- **FR-04.3**: Database transactions and concurrency locking (`SELECT ... FOR UPDATE`) to prevent simultaneous issue of the same physical copy.
- **FR-04.4**: Due date calculation based on configurable library setting `loan_duration_days` (default 14 days).

#### 3.5 Circulation: Book Return (FR-05)
- **FR-05.1**: Search active loans by Accession Number, Barcode, Student Reg No, or Loan ID.
- **FR-05.2**: Automatic overdue days and fine calculation based on `fine_rate_per_day` and `grace_period_days`.
- **FR-05.3**: Prevention of duplicate returns.
- **FR-05.4**: Recording wear condition on return (Good, Worn, Damaged, Lost) with controlled status transition.

#### 3.6 Fines & Penalties (FR-06)
- **FR-06.1**: Daily fine rate configurable per overdue calendar day.
- **FR-06.2**: Support for recording Cash and Online payments with receipt references.
- **FR-06.3**: Authorized fine waiver mechanism with permanent audit logging.

---

### 4. Non-Functional Requirements
- **Performance**: API responses under 150ms for catalogue queries; database indexing on foreign keys, ISBN, and accession numbers.
- **Reliability & Persistence**: Relational integrity with foreign key cascading and atomic transactions.
- **Usability**: Professional responsive UI with dark vertical sidebar, clear breadcrumbs, status badges, and loading states.
- **Portability**: Containerized deployment via Docker and Docker Compose.
