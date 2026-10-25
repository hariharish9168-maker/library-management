# Issue and Return Workflow

## 1. Book Issue Workflow
The issue operation transitions an available physical book copy into an active loan.

```mermaid
sequenceDiagram
    autonumber
    actor Librarian
    participant UI as Frontend (React)
    participant API as Backend (Express)
    participant DB as Relational Database

    Librarian->>UI: Select Student (ID/Reg No) + Scan Copy Barcode / Accession No
    UI->>API: POST /api/loans/issue { studentId, copyIdentifier }
    
    API->>DB: BEGIN TRANSACTION
    API->>DB: Check Student: active == 1?
    alt Student Inactive
        API-->>UI: 400 Error: Student account deactivated
    end

    API->>DB: Count Active Loans vs max_books_allowed
    alt Borrowing Limit Exceeded
        API-->>UI: 400 Error: Borrowing limit reached
    end

    API->>DB: Check existing Overdue loans for student
    alt Has Overdue Items
        API-->>UI: 400 Error: Disqualifying overdue books exist
    end

    API->>DB: SELECT copy FOR UPDATE (Row Lock)
    alt Copy Not Available or Lost/Damaged
        API-->>UI: 400 Error: Copy is not available
    end

    API->>DB: Read loan_duration_days (e.g. 14) from library_settings
    API->>DB: INSERT INTO loans (due_date = NOW() + 14d, status = 'Active')
    API->>DB: UPDATE book_copies SET status = 'Issued'
    API->>DB: INSERT INTO audit_logs (action = 'ISSUE_BOOK')
    API->>DB: COMMIT TRANSACTION

    API-->>UI: 201 Created: Return Loan Receipt (Loan ID, Due Date)
    UI-->>Librarian: Display Issue Receipt & Confirmation Card
```

---

## 2. Book Return Workflow & Shelving Guide
The return workflow recalculates overdue durations, settles fines, and directs the librarian to the copy's designated shelf location.

```mermaid
sequenceDiagram
    autonumber
    actor Librarian
    participant UI as Frontend (React)
    participant API as Backend (Express)
    participant DB as Relational Database

    Librarian->>UI: Scan Barcode or Enter Accession / Loan ID
    UI->>API: GET /api/loans/return-search?q=ACC-1001-A
    API->>DB: Query active loan + designated shelf coordinates
    API-->>UI: Return loan details + Live Overdue fine calculation
    UI-->>Librarian: Preview Active Loan & Accrued Fines

    Librarian->>UI: Select Condition (Good/Damaged) & Click "Confirm Return"
    UI->>API: POST /api/loans/return { loanId, conditionOnReturn }
    
    API->>DB: BEGIN TRANSACTION
    API->>DB: Verify loan.status != 'Returned'
    API->>DB: Calculate overdueDays = max(0, returnDate - dueDate - gracePeriod)
    API->>DB: fine = min(overdueDays * fine_rate_per_day, max_fine_limit)
    
    API->>DB: UPDATE loans SET status = 'Returned', return_date = NOW()
    
    alt If fine > 0
        API->>DB: INSERT INTO fines (overdue_days, total_amount, status = 'Unpaid')
    end

    API->>DB: UPDATE book_copies SET status = 'Available', condition = conditionOnReturn
    API->>DB: Query designated storage location (Floor -> Section -> Rack -> Shelf)
    API->>DB: INSERT INTO audit_logs (action = 'RETURN_BOOK')
    API->>DB: COMMIT TRANSACTION

    API-->>UI: 200 OK: Return confirmation + Designated Shelving Coordinate
    UI-->>Librarian: Show Shelving Guide Banner: "Floor 1 -> CS-SEC -> Rack R01 -> Shelf S02"
```
