# Database Schema Specification

## 1. Relational Database Design
The Smart Library Management System employs a normalized 3NF relational MySQL database. All monetary amounts use high-precision decimals, timestamps track lifecycles, and primary keys utilize auto-incrementing integer sequences.

---

### Table: `roles`
Stores authorization role definitions.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Unique Role ID |
| `name` | VARCHAR(30) | NOT NULL, UNIQUE | Role identifier (`admin`, `librarian`, `student`) |
| `description` | VARCHAR(255) | NULL | Human readable role description |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

---

### Table: `users`
Central authentication store for all system actors.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Unique User ID |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Login handle |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | Primary email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Salted bcrypt hash |
| `role_id` | INT | FK -> `roles.id`, INDEX | System permission tier |
| `full_name` | VARCHAR(100) | NOT NULL | Full personal name |
| `phone` | VARCHAR(20) | NULL | Contact phone |
| `is_active` | TINYINT(1) | DEFAULT 1 | Account active flag |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation |
| `updated_at` | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last profile update |

---

### Table: `students`
Profile extension specifically for student borrowers.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Unique Student Borrower ID |
| `user_id` | INT | FK -> `users.id`, UNIQUE | 1-to-1 link to users |
| `student_reg_no`| VARCHAR(50) | NOT NULL, UNIQUE, INDEX | Institutional Roll/Reg Number |
| `department` | VARCHAR(100) | NOT NULL | Academic branch |
| `academic_year` | VARCHAR(20) | NOT NULL | Year / Semester |
| `max_books_allowed`| INT | DEFAULT 3 | Borrower limit override |
| `is_active` | TINYINT(1) | DEFAULT 1 | Borrowing permission status |

---

### Location Tables (`floors`, `sections`, `racks`, `shelves`)
Hierarchical location taxonomy: Floor → Section → Rack → Shelf.

#### `floors`
- `id`: PK, INT AUTO_INCREMENT
- `floor_number`: INT UNIQUE (1, 2, 3...)
- `name`: VARCHAR(100) (e.g., "Ground Floor")
- `description`: VARCHAR(255)

#### `sections`
- `id`: PK, INT AUTO_INCREMENT
- `floor_id`: FK -> `floors.id` (ON DELETE CASCADE)
- `code`: VARCHAR(30) (e.g., "CS-SEC", "ELEC-SEC")
- `name`: VARCHAR(100)
- `UNIQUE KEY`: (`floor_id`, `code`)

#### `racks`
- `id`: PK, INT AUTO_INCREMENT
- `section_id`: FK -> `sections.id` (ON DELETE CASCADE)
- `rack_number`: VARCHAR(30) (e.g., "R01", "R02")
- `UNIQUE KEY`: (`section_id`, `rack_number`)

#### `shelves`
- `id`: PK, INT AUTO_INCREMENT
- `rack_id`: FK -> `racks.id` (ON DELETE CASCADE)
- `shelf_number`: VARCHAR(30) (e.g., "S01", "S02")
- `capacity`: INT DEFAULT 30
- `description`: VARCHAR(255)
- `UNIQUE KEY`: (`rack_id`, `shelf_number`)

---

### Table: `books`
Bibliographical catalogue for book titles.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Unique Book Title ID |
| `title` | VARCHAR(255) | NOT NULL, INDEX | Title of book |
| `author` | VARCHAR(255) | NOT NULL, INDEX | Author names |
| `isbn` | VARCHAR(30) | UNIQUE, NULL | International Standard Book Number |
| `publisher` | VARCHAR(150) | NULL | Publishing house |
| `edition` | VARCHAR(50) | NULL | Edition description |
| `publication_year`| INT | NULL | Year published |
| `category_id` | INT | FK -> `categories.id` | Subject category |
| `description` | TEXT | NULL | Synopsis & syllabus tags |
| `cover_image_url`| VARCHAR(500)| NULL | Cover asset link |
| `is_archived` | TINYINT(1) | DEFAULT 0 | Soft-archive status |

---

### Table: `book_copies`
Authoritative physical copy records.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Unique Physical Copy ID |
| `book_id` | INT | FK -> `books.id`, INDEX | Master catalogue title |
| `accession_number`| VARCHAR(50)| NOT NULL, UNIQUE, INDEX | Unique library accession tag |
| `barcode` | VARCHAR(60) | UNIQUE, NULL | Scannable barcode |
| `shelf_id` | INT | FK -> `shelves.id`, NULL | Physical shelf coordinate |
| `condition` | ENUM | 'New','Good','Worn','Damaged','Lost' | Physical state |
| `status` | ENUM | 'Available','Issued','Reserved','Maintenance','Archived' | Current circulation status |

---

### Table: `loans`
Issue and return circulation transactions.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Loan Transaction ID |
| `student_id` | INT | FK -> `students.id`, INDEX | Borrower |
| `copy_id` | INT | FK -> `book_copies.id`, INDEX | Checked out physical copy |
| `issue_date` | DATETIME | NOT NULL | Timestamp of issue |
| `due_date` | DATETIME | NOT NULL, INDEX | Contractual due deadline |
| `return_date` | DATETIME | NULL | Timestamp of return |
| `status` | ENUM | 'Active','Returned','Overdue' | Transaction status |
| `issued_by` | INT | FK -> `users.id` | Librarian who issued item |
| `returned_by` | INT | FK -> `users.id`, NULL | Librarian who processed return |

---

### Table: `fines` & `fine_payments`
Overdue penalty tracking and cash/online receipt ledger.
- `fines`: Tracks loan ID, overdue days, fine rate, total amount, paid amount, status (`Unpaid`, `Partially_Paid`, `Paid`, `Waived`).
- `fine_payments`: Tracks fine ID, amount paid, payment type (`Cash`, `Online`, `Waiver`), received by user ID, transaction reference.
