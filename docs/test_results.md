# Automated Test Cases and Execution Results

## Test Suite Summary
The backend includes an automated integration test suite built with **Vitest** and **Supertest**. Tests execute transactional workflows directly against the relational database and verify security, business logic, inventory accuracy, and edge-case error prevention.

---

### Executed Test Matrix
| # | Test Case Description | Module | Verification Method | Status |
|---|---|---|---|:---:|
| 1 | Reject login with invalid password | Auth | Checks `401 Unauthorized` & error response | **PASSED** |
| 2 | Register new student borrower account | Auth | Verifies `student` role, reg number uniqueness | **PASSED** |
| 3 | Prevent student from creating books | RBAC | Verifies `403 Forbidden` for non-staff roles | **PASSED** |
| 4 | Student data isolation: block cross-student profile inspection | Security | Verifies `403 Forbidden` when accessing other student IDs | **PASSED** |
| 5 | Librarian adds new book title to catalogue | Inventory | Verifies insertion in `books` table | **PASSED** |
| 6 | Assign physical copy to shelf location | Location | Verifies `book_copies` linked to `shelves` | **PASSED** |
| 7 | Find book with complete location path (Floor -> Sec -> Rack -> Shelf) | Location Engine | Verifies multi-join hierarchy breadcrumbs | **PASSED** |
| 8 | Issue available physical copy to student | Circulation | Verifies copy status transitions to `Issued`, due date set | **PASSED** |
| 9 | Prevent duplicate issue of already issued copy | Concurrency | Verifies `400 Bad Request` with status check | **PASSED** |
| 10 | Process book return, verify designated shelving location & status reset | Circulation | Verifies loan `Returned`, copy `Available`, shelving guide returned | **PASSED** |
| 11 | Calculate authoritative dashboard statistics directly from database | Analytics | Verifies non-hardcoded database aggregations | **PASSED** |

---

### Test Execution Output Log
```
> smart-library-backend@1.0.0 test
> vitest run

 RUN  v2.1.9 C:/Users/Harish/Desktop/lib/backend

stdout | tests/api.test.ts > Smart Library Management System - Automated Integration Tests
[Database] Connected to persistent relational database...
[Setup] Setting up database schema...
[Setup] Database setup and seed verification completed successfully!

 ✓ tests/api.test.ts (11 tests) 945ms

 Test Files  1 passed (1)
      Tests  11 passed (11)
   Duration  3.05s
```
