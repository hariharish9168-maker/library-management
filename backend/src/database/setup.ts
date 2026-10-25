import bcrypt from 'bcryptjs';
import { db } from './db';

export async function setupDatabase(dropExisting = false) {
  await db.initialize();
  console.log(`[Setup] Setting up database schema (Driver: ${db.activeDriver})...`);

  if (db.activeDriver === 'mysql') {
    if (dropExisting) {
      await db.execRaw('SET FOREIGN_KEY_CHECKS = 0;');
      const tables = [
        'audit_logs', 'reservations', 'fine_payments', 'fines', 'loans',
        'book_copies', 'books', 'categories', 'shelves', 'racks', 'sections',
        'floors', 'students', 'users', 'roles', 'library_settings'
      ];
      for (const t of tables) {
        await db.execRaw(`DROP TABLE IF EXISTS \`${t}\`;`);
      }
      await db.execRaw('SET FOREIGN_KEY_CHECKS = 1;');
    }

    // Create tables in MySQL syntax
    await db.execRaw(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(30) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS users (
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

      CREATE TABLE IF NOT EXISTS students (
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

      CREATE TABLE IF NOT EXISTS floors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        floor_number INT NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        floor_id INT NOT NULL,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_floor_section (floor_id, code),
        CONSTRAINT fk_sections_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS racks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT NOT NULL,
        rack_number VARCHAR(30) NOT NULL,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_section_rack (section_id, rack_number),
        CONSTRAINT fk_racks_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS shelves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rack_id INT NOT NULL,
        shelf_number VARCHAR(30) NOT NULL,
        capacity INT NOT NULL DEFAULT 30,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_rack_shelf (rack_id, shelf_number),
        CONSTRAINT fk_shelves_rack FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS books (
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

      CREATE TABLE IF NOT EXISTS book_copies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        accession_number VARCHAR(50) NOT NULL UNIQUE,
        barcode VARCHAR(60) NULL UNIQUE,
        shelf_id INT NULL,
        \`condition\` ENUM('New', 'Good', 'Worn', 'Damaged', 'Lost') NOT NULL DEFAULT 'Good',
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

      CREATE TABLE IF NOT EXISTS library_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(50) NOT NULL UNIQUE,
        setting_value VARCHAR(255) NOT NULL,
        description VARCHAR(255) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS loans (
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
        CONSTRAINT fk_loans_student FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE,
        CONSTRAINT fk_loans_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON UPDATE CASCADE,
        CONSTRAINT fk_loans_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON UPDATE CASCADE,
        CONSTRAINT fk_loans_returner FOREIGN KEY (returned_by) REFERENCES users(id) ON UPDATE CASCADE
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS fines (
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

      CREATE TABLE IF NOT EXISTS fine_payments (
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

      CREATE TABLE IF NOT EXISTS reservations (
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

      CREATE TABLE IF NOT EXISTS audit_logs (
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
    `);
  } else {
    // SQLite syntax
    await db.execRaw(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        student_reg_no TEXT NOT NULL UNIQUE,
        department TEXT NOT NULL,
        academic_year TEXT NOT NULL,
        max_books_allowed INTEGER NOT NULL DEFAULT 3,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS floors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        floor_number INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        floor_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (floor_id, code),
        FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS racks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER NOT NULL,
        rack_number TEXT NOT NULL,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (section_id, rack_number),
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS shelves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rack_id INTEGER NOT NULL,
        shelf_number TEXT NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 30,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (rack_id, shelf_number),
        FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT NOT NULL UNIQUE,
        description TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT NULL UNIQUE,
        publisher TEXT NULL,
        edition TEXT NULL,
        publication_year INTEGER NULL,
        category_id INTEGER NOT NULL,
        description TEXT NULL,
        cover_image_url TEXT NULL,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS book_copies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        accession_number TEXT NOT NULL UNIQUE,
        barcode TEXT NULL UNIQUE,
        shelf_id INTEGER NULL,
        condition TEXT NOT NULL DEFAULT 'Good',
        status TEXT NOT NULL DEFAULT 'Available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS library_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        copy_id INTEGER NOT NULL,
        issue_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME NOT NULL,
        return_date DATETIME NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        issued_by INTEGER NOT NULL,
        returned_by INTEGER NULL,
        notes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE,
        FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON UPDATE CASCADE,
        FOREIGN KEY (issued_by) REFERENCES users(id) ON UPDATE CASCADE,
        FOREIGN KEY (returned_by) REFERENCES users(id) ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS fines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL UNIQUE,
        student_id INTEGER NOT NULL,
        overdue_days INTEGER NOT NULL DEFAULT 0,
        fine_rate REAL NOT NULL DEFAULT 2.00,
        total_amount REAL NOT NULL DEFAULT 0.00,
        paid_amount REAL NOT NULL DEFAULT 0.00,
        status TEXT NOT NULL DEFAULT 'Unpaid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON UPDATE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS fine_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fine_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT NOT NULL DEFAULT 'Cash',
        received_by INTEGER NOT NULL,
        transaction_reference TEXT NULL,
        notes TEXT NULL,
        payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fine_id) REFERENCES fines(id) ON UPDATE CASCADE,
        FOREIGN KEY (received_by) REFERENCES users(id) ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        queue_order INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'Pending',
        reserved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fulfilled_at DATETIME NULL,
        notes TEXT NULL,
        FOREIGN KEY (book_id) REFERENCES books(id) ON UPDATE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NULL,
        details TEXT NULL,
        ip_address TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
  }

  console.log('[Setup] Schema successfully created. Checking default seeds...');

  // Seed roles if empty
  const roles = await db.query('SELECT COUNT(*) as count FROM roles');
  if (roles[0].count === 0) {
    await db.execute("INSERT INTO roles (id, name, description) VALUES (1, 'admin', 'System Administrator')");
    await db.execute("INSERT INTO roles (id, name, description) VALUES (2, 'librarian', 'Library Staff')");
    await db.execute("INSERT INTO roles (id, name, description) VALUES (3, 'student', 'Student Borrower')");
  }

  // Seed settings if empty
  const settings = await db.query('SELECT COUNT(*) as count FROM library_settings');
  if (settings[0].count === 0) {
    const defaultSettings = [
      ['loan_duration_days', '14', 'Standard loan duration in days for students'],
      ['max_books_per_student', '3', 'Maximum concurrent active loans permitted per student'],
      ['grace_period_days', '0', 'Number of grace days after due date before daily fines begin'],
      ['fine_rate_per_day', '2.00', 'Daily fine rate in local currency per overdue day'],
      ['max_fine_limit', '150.00', 'Maximum cap on overdue fines per loan'],
      ['currency_symbol', '₹', 'Currency symbol used throughout the system'],
      ['allow_reservations', 'true', 'Enable student book reservations when zero copies are available']
    ];
    for (const [k, v, d] of defaultSettings) {
      await db.execute('INSERT INTO library_settings (setting_key, setting_value, description) VALUES (?, ?, ?)', [k, v, d]);
    }
  }

  // Seed default users if empty
  const users = await db.query('SELECT COUNT(*) as count FROM users');
  if (users[0].count === 0) {
    console.log('[Setup] Seeding default accounts (Admin, Librarian, Students)...');
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const librarianPasswordHash = bcrypt.hashSync('librarian123', 10);
    const studentPasswordHash = bcrypt.hashSync('student123', 10);

    // 1. Admin
    const adminRes = await db.execute(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
       VALUES (?, ?, ?, 1, ?, ?, 1)`,
      ['admin', 'admin@library.edu', adminPasswordHash, 'Dr. Sarah Jenkins (Head Admin)', '+91 98765 43210']
    );

    // 2. Librarian
    const libRes = await db.execute(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
       VALUES (?, ?, ?, 2, ?, ?, 1)`,
      ['librarian', 'librarian@library.edu', librarianPasswordHash, 'Marcus Vance (Chief Librarian)', '+91 98765 43211']
    );

    // 3. Students
    // Student 1: John Doe
    const stu1Res = await db.execute(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
       VALUES (?, ?, ?, 3, ?, ?, 1)`,
      ['student', 'student@library.edu', studentPasswordHash, 'John Doe', '+91 98765 11111']
    );
    await db.execute(
      `INSERT INTO students (user_id, student_reg_no, department, academic_year, max_books_allowed)
       VALUES (?, ?, ?, ?, ?)`,
      [stu1Res.insertId, 'STU-2026-001', 'Computer Science & Engineering', 'Year 3 / Sem 6', 3]
    );

    // Student 2: Alice Smith
    const stu2Res = await db.execute(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
       VALUES (?, ?, ?, 3, ?, ?, 1)`,
      ['alice', 'alice@library.edu', studentPasswordHash, 'Alice Smith', '+91 98765 22222']
    );
    await db.execute(
      `INSERT INTO students (user_id, student_reg_no, department, academic_year, max_books_allowed)
       VALUES (?, ?, ?, ?, ?)`,
      [stu2Res.insertId, 'STU-2026-002', 'Electronics & Communication', 'Year 2 / Sem 4', 3]
    );

    // Student 3: Bob Miller
    const stu3Res = await db.execute(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, phone, is_active)
       VALUES (?, ?, ?, 3, ?, ?, 1)`,
      ['bob', 'bob@library.edu', studentPasswordHash, 'Bob Miller', '+91 98765 33333']
    );
    await db.execute(
      `INSERT INTO students (user_id, student_reg_no, department, academic_year, max_books_allowed)
       VALUES (?, ?, ?, ?, ?)`,
      [stu3Res.insertId, 'STU-2026-003', 'Mechanical Engineering', 'Year 4 / Sem 7', 3]
    );
  }

  // Seed Locations if empty
  const floors = await db.query('SELECT COUNT(*) as count FROM floors');
  if (floors[0].count === 0) {
    console.log('[Setup] Seeding location hierarchy (Floors -> Sections -> Racks -> Shelves)...');
    
    // Floors
    await db.execute("INSERT INTO floors (id, floor_number, name, description) VALUES (1, 1, 'Floor 1 (Ground Floor)', 'Main Circulation Desk, CS & Electronics')");
    await db.execute("INSERT INTO floors (id, floor_number, name, description) VALUES (2, 2, 'Floor 2 (First Floor)', 'Mechanical, Applied Sciences & Reading Hall')");
    await db.execute("INSERT INTO floors (id, floor_number, name, description) VALUES (3, 3, 'Floor 3 (Second Floor)', 'Periodicals, Research Archives & Humanities')");

    // Sections
    await db.execute("INSERT INTO sections (id, floor_id, code, name, description) VALUES (1, 1, 'CS-SEC', 'Computer Science & Software Engineering', 'Programming, Algorithms, AI, Databases')");
    await db.execute("INSERT INTO sections (id, floor_id, code, name, description) VALUES (2, 1, 'ELEC-SEC', 'Electronics & Electrical', 'Circuits, Microcontrollers, Signal Processing')");
    await db.execute("INSERT INTO sections (id, floor_id, code, name, description) VALUES (3, 2, 'MECH-SEC', 'Mechanical & Civil', 'Thermodynamics, Robotics, Fluid Mechanics')");
    await db.execute("INSERT INTO sections (id, floor_id, code, name, description) VALUES (4, 2, 'SCI-SEC', 'Applied Sciences & Mathematics', 'Calculus, Physics, Statistics')");
    await db.execute("INSERT INTO sections (id, floor_id, code, name, description) VALUES (5, 3, 'REF-SEC', 'Reference Collection', 'Encyclopedias, Bound Volumes, Standards')");

    // Racks
    await db.execute("INSERT INTO racks (id, section_id, rack_number, description) VALUES (1, 1, 'R01', 'Core Programming & Data Structures')");
    await db.execute("INSERT INTO racks (id, section_id, rack_number, description) VALUES (2, 1, 'R02', 'Database Systems & Cloud Computing')");
    await db.execute("INSERT INTO racks (id, section_id, rack_number, description) VALUES (3, 1, 'R03', 'Artificial Intelligence & Machine Learning')");
    await db.execute("INSERT INTO racks (id, section_id, rack_number, description) VALUES (4, 2, 'R01', 'Analog & Digital Circuits')");
    await db.execute("INSERT INTO racks (id, section_id, rack_number, description) VALUES (5, 3, 'R01', 'Thermodynamics & Heat Transfer')");
    await db.execute("INSERT INTO racks (id, section_id, rack_number, description) VALUES (6, 4, 'R01', 'Engineering Mathematics & Probability')");

    // Shelves
    const shelfRows = [
      [1, 1, 'S01', 30, 'Top Tier - Introductory Programming & C/C++'],
      [2, 1, 'S02', 30, 'Middle Tier - Data Structures & Algorithms'],
      [3, 1, 'S03', 30, 'Lower Tier - Operating Systems & Architecture'],
      [4, 2, 'S01', 30, 'Top Tier - Relational Databases & SQL'],
      [5, 2, 'S02', 30, 'Middle Tier - Distributed Systems & Cloud Platforms'],
      [6, 3, 'S01', 30, 'Top Tier - Machine Learning & Neural Networks'],
      [7, 3, 'S02', 30, 'Middle Tier - Computer Vision & Natural Language Processing'],
      [8, 4, 'S01', 25, 'Top Tier - Circuit Analysis & Devices'],
      [9, 5, 'S01', 30, 'Top Tier - Thermodynamics & Heat Exchangers'],
      [10, 6, 'S01', 35, 'Top Tier - Advanced Engineering Mathematics']
    ];
    for (const s of shelfRows) {
      await db.execute('INSERT INTO shelves (id, rack_id, shelf_number, capacity, description) VALUES (?, ?, ?, ?, ?)', s);
    }
  }

  // Seed Categories if empty
  const cats = await db.query('SELECT COUNT(*) as count FROM categories');
  if (cats[0].count === 0) {
    console.log('[Setup] Seeding categories...');
    await db.execute("INSERT INTO categories (id, name, code, description) VALUES (1, 'Computer Science & IT', 'CS', 'Algorithms, Programming, Software Architecture, Networks')");
    await db.execute("INSERT INTO categories (id, name, code, description) VALUES (2, 'Electronics & Communication', 'EC', 'Semiconductors, Telecommunications, Embedded Systems')");
    await db.execute("INSERT INTO categories (id, name, code, description) VALUES (3, 'Mechanical Engineering', 'ME', 'Thermal, Design, Manufacturing, Robotics')");
    await db.execute("INSERT INTO categories (id, name, code, description) VALUES (4, 'Mathematics & Statistics', 'MTH', 'Applied Mathematics, Discrete Math, Probability')");
    await db.execute("INSERT INTO categories (id, name, code, description) VALUES (5, 'Physical Sciences', 'SCI', 'Applied Physics, Chemistry, Materials Science')");
  }

  // Seed Books if empty
  const books = await db.query('SELECT COUNT(*) as count FROM books');
  if (books[0].count === 0) {
    console.log('[Setup] Seeding book catalogue and physical copies with exact locations...');
    const bookList = [
      [1, 'Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest', '9780262033848', 'MIT Press', '3rd Edition', 2009, 1, 'The definitive reference and textbook on algorithms and data structures.', 'https://images.unsplash.com/photo-1532012164546-f432f2e37b29?w=400&q=80'],
      [2, 'Database System Concepts', 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', '9780073523323', 'McGraw-Hill Education', '7th Edition', 2019, 1, 'Fundamental concepts of database management, relational algebra, SQL, and transaction processing.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'],
      [3, 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', '9780134610993', 'Pearson', '4th Edition', 2020, 1, 'Comprehensive and state-of-the-art introduction to the theory and practice of artificial intelligence.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80'],
      [4, 'Operating System Concepts', 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne', '9781119800361', 'Wiley', '10th Edition', 2018, 1, 'Essential guide to operating systems architecture, process management, and virtual memory.', 'https://images.unsplash.com/photo-1507842229451-7f01be7fe802?w=400&q=80'],
      [5, 'Designing Data-Intensive Applications', 'Martin Kleppmann', '9781449373320', 'O Reilly Media', '1st Edition', 2017, 1, 'The big ideas behind reliable, scalable, and maintainable systems, replication and partitioning.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80'],
      [6, 'Microelectronic Circuits', 'Adel S. Sedra, Kenneth C. Smith', '9780190853464', 'Oxford University Press', '8th Edition', 2020, 2, 'The standard for electrical and computer engineering circuit analysis and design.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'],
      [7, 'Thermodynamics: An Engineering Approach', 'Yunus A. Cengel, Michael A. Boles', '9789814595292', 'McGraw-Hill', '8th Edition', 2015, 3, 'Principles of energy, entropy, power cycles, and heat transfer.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80'],
      [8, 'Higher Engineering Mathematics', 'B.S. Grewal', '9788174091955', 'Khanna Publishers', '44th Edition', 2017, 4, 'Standard textbook covering advanced calculus, differential equations, and linear algebra.', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80']
    ];

    for (const b of bookList) {
      await db.execute('INSERT INTO books (id, title, author, isbn, publisher, edition, publication_year, category_id, description, cover_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', b);
    }

    // Physical copies:
    const copies = [
      // Algorithms (Book 1) -> Shelf 2 (Floor 1 -> CS-SEC -> R01 -> S02)
      [1, 1, 'ACC-1001-A', 'BC-100101', 2, 'Good', 'Available'],
      [2, 1, 'ACC-1001-B', 'BC-100102', 2, 'New', 'Available'],
      [3, 1, 'ACC-1001-C', 'BC-100103', 2, 'Good', 'Issued'],
      // Database System Concepts (Book 2) -> Shelf 4 (Floor 1 -> CS-SEC -> R02 -> S01)
      [4, 2, 'ACC-1002-A', 'BC-100201', 4, 'Good', 'Available'],
      [5, 2, 'ACC-1002-B', 'BC-100202', 4, 'Good', 'Issued'],
      // AI Modern Approach (Book 3) -> Shelf 6 (Floor 1 -> CS-SEC -> R03 -> S01)
      [6, 3, 'ACC-1003-A', 'BC-100301', 6, 'New', 'Available'],
      [7, 3, 'ACC-1003-B', 'BC-100302', 6, 'Good', 'Available'],
      // Operating System Concepts (Book 4) -> Shelf 3 (Floor 1 -> CS-SEC -> R01 -> S03)
      [8, 4, 'ACC-1004-A', 'BC-100401', 3, 'Good', 'Available'],
      // Designing Data-Intensive Applications (Book 5) -> Shelf 5 (Floor 1 -> CS-SEC -> R02 -> S02)
      [9, 5, 'ACC-1005-A', 'BC-100501', 5, 'New', 'Available'],
      // Microelectronic Circuits (Book 6) -> Shelf 8 (Floor 1 -> ELEC-SEC -> R01 -> S01)
      [10, 6, 'ACC-1006-A', 'BC-100601', 8, 'Good', 'Available'],
      // Thermodynamics (Book 7) -> Shelf 9 (Floor 2 -> MECH-SEC -> R01 -> S01)
      [11, 7, 'ACC-1007-A', 'BC-100701', 9, 'Good', 'Available'],
      // Higher Engineering Mathematics (Book 8) -> Shelf 10 (Floor 2 -> SCI-SEC -> R01 -> S01)
      [12, 8, 'ACC-1008-A', 'BC-100801', 10, 'Good', 'Available']
    ];

    for (const c of copies) {
      await db.execute('INSERT INTO book_copies (id, book_id, accession_number, barcode, shelf_id, condition, status) VALUES (?, ?, ?, ?, ?, ?, ?)', c);
    }

    // Seed Sample Loans:
    // Loan 1: Active Loan (Student 1: John Doe, Copy 3: Algorithms)
    // Issued 5 days ago, due in 9 days
    const now = new Date();
    const issueDate1 = new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const dueDate1 = new Date(now.getTime() + 9 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    await db.execute(
      `INSERT INTO loans (id, student_id, copy_id, issue_date, due_date, status, issued_by, notes)
       VALUES (1, 1, 3, ?, ?, 'Active', 2, 'Course study loan')`,
      [issueDate1, dueDate1]
    );

    // Loan 2: Overdue Loan (Student 2: Alice Smith, Copy 5: Database Concepts)
    // Issued 20 days ago, due 6 days ago -> 6 overdue days!
    const issueDate2 = new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);
    const dueDate2 = new Date(now.getTime() - 6 * 24 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    await db.execute(
      `INSERT INTO loans (id, student_id, copy_id, issue_date, due_date, status, issued_by, notes)
       VALUES (2, 2, 5, ?, ?, 'Overdue', 2, 'Semester project loan')`,
      [issueDate2, dueDate2]
    );

    // Generate corresponding fine record for Loan 2: 6 days * ₹2.00 = ₹12.00
    await db.execute(
      `INSERT INTO fines (loan_id, student_id, overdue_days, fine_rate, total_amount, paid_amount, status)
       VALUES (2, 2, 6, 2.00, 12.00, 0.00, 'Unpaid')`
    );
  }

  console.log('[Setup] Database setup and seed verification completed successfully!');
}

if (require.main === module) {
  setupDatabase(false)
    .then(() => {
      console.log('Setup finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
}
