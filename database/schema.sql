-- =============================================================================
-- SMART LIBRARY MANAGEMENT SYSTEM WITH BOOK LOCATION TRACKING
-- Relational MySQL Schema
-- =============================================================================

CREATE DATABASE IF NOT EXISTS smart_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_library;

-- Set foreign key checks off during setup
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES TABLE
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. USERS TABLE
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email),
    INDEX idx_user_role (role_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. STUDENTS TABLE (Profile extension for student accounts)
DROP TABLE IF EXISTS students;
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    student_reg_no VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    max_books_allowed INT NOT NULL DEFAULT 3,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_reg (student_reg_no),
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. PHYSICAL LOCATION HIERARCHY: Floors -> Sections -> Racks -> Shelves
DROP TABLE IF EXISTS floors;
CREATE TABLE floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_number INT NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DROP TABLE IF EXISTS sections;
CREATE TABLE sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_id INT NOT NULL,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_floor_section (floor_id, code),
    CONSTRAINT fk_sections_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

DROP TABLE IF EXISTS racks;
CREATE TABLE racks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    rack_number VARCHAR(30) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_section_rack (section_id, rack_number),
    CONSTRAINT fk_racks_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

DROP TABLE IF EXISTS shelves;
CREATE TABLE shelves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rack_id INT NOT NULL,
    shelf_number VARCHAR(30) NOT NULL,
    capacity INT NOT NULL DEFAULT 30,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_rack_shelf (rack_id, shelf_number),
    CONSTRAINT fk_shelves_rack FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. CATEGORIES TABLE
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. BOOKS TABLE (Title catalog level)
DROP TABLE IF EXISTS books;
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(30) NULL,
    publisher VARCHAR(150) NULL,
    edition VARCHAR(50) NULL,
    publication_year INT NULL,
    category_id INT NOT NULL,
    description TEXT NULL,
    cover_image_url VARCHAR(500) NULL,
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_book_title (title),
    INDEX idx_book_author (author),
    INDEX idx_book_category (category_id),
    UNIQUE KEY uk_book_isbn (isbn),
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 7. BOOK COPIES TABLE (Physical item tracking)
DROP TABLE IF EXISTS book_copies;
CREATE TABLE book_copies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    accession_number VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(60) NULL UNIQUE,
    shelf_id INT NULL,
    `condition` ENUM('New', 'Good', 'Worn', 'Damaged', 'Lost') NOT NULL DEFAULT 'Good',
    status ENUM('Available', 'Issued', 'Reserved', 'Maintenance', 'Archived') NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_copy_book (book_id),
    INDEX idx_copy_shelf (shelf_id),
    INDEX idx_copy_status (status),
    INDEX idx_copy_accession (accession_number),
    CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_copies_shelf FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. LIBRARY SETTINGS TABLE
DROP TABLE IF EXISTS library_settings;
CREATE TABLE library_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value VARCHAR(255) NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. LOANS TABLE (Issue & Return transactions)
DROP TABLE IF EXISTS loans;
CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    copy_id INT NOT NULL,
    issue_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME NULL,
    status ENUM('Active', 'Returned', 'Overdue') NOT NULL DEFAULT 'Active',
    issued_by INT NOT NULL,
    returned_by INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loans_student (student_id),
    INDEX idx_loans_copy (copy_id),
    INDEX idx_loans_status (status),
    INDEX idx_loans_due_date (due_date),
    CONSTRAINT fk_loans_student FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE,
    CONSTRAINT fk_loans_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON UPDATE CASCADE,
    CONSTRAINT fk_loans_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_loans_returner FOREIGN KEY (returned_by) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 10. FINES TABLE
DROP TABLE IF EXISTS fines;
CREATE TABLE fines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL UNIQUE,
    student_id INT NOT NULL,
    overdue_days INT NOT NULL DEFAULT 0,
    fine_rate DECIMAL(10,2) NOT NULL DEFAULT 2.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('Unpaid', 'Partially_Paid', 'Paid', 'Waived') NOT NULL DEFAULT 'Unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fines_student (student_id),
    INDEX idx_fines_status (status),
    CONSTRAINT fk_fines_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON UPDATE CASCADE,
    CONSTRAINT fk_fines_student FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 11. FINE PAYMENTS TABLE
DROP TABLE IF EXISTS fine_payments;
CREATE TABLE fine_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fine_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type ENUM('Cash', 'Online', 'Waiver') NOT NULL DEFAULT 'Cash',
    received_by INT NOT NULL,
    transaction_reference VARCHAR(100) NULL,
    notes VARCHAR(255) NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_fine FOREIGN KEY (fine_id) REFERENCES fines(id) ON UPDATE CASCADE,
    CONSTRAINT fk_payments_receiver FOREIGN KEY (received_by) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 12. RESERVATIONS TABLE
DROP TABLE IF EXISTS reservations;
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    student_id INT NOT NULL,
    queue_order INT NOT NULL DEFAULT 1,
    status ENUM('Pending', 'Fulfilled', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending',
    reserved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at DATETIME NULL,
    notes VARCHAR(255) NULL,
    INDEX idx_reservations_book (book_id),
    INDEX idx_reservations_student (student_id),
    CONSTRAINT fk_res_book FOREIGN KEY (book_id) REFERENCES books(id) ON UPDATE CASCADE,
    CONSTRAINT fk_res_student FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 13. AUDIT LOGS TABLE
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NULL,
    details TEXT NULL,
    ip_address VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
