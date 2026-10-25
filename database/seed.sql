-- =============================================================================
-- SMART LIBRARY MANAGEMENT SYSTEM WITH BOOK LOCATION TRACKING
-- Seed Data
-- =============================================================================

USE smart_library;

-- 1. Insert Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'System Administrator with full access to settings, staff, and audit records'),
(2, 'librarian', 'Library Staff with permissions to catalog books, manage copies, issue and return'),
(3, 'student', 'Student Borrower with catalogue access, personal loans, and reservations')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Insert Default Library Settings
INSERT INTO library_settings (setting_key, setting_value, description) VALUES
('loan_duration_days', '14', 'Standard loan duration in days for students'),
('max_books_per_student', '3', 'Maximum concurrent active loans permitted per student'),
('grace_period_days', '0', 'Number of grace days after due date before daily fines begin'),
('fine_rate_per_day', '2.00', 'Daily fine rate in local currency per overdue day'),
('max_fine_limit', '150.00', 'Maximum cap on overdue fines per loan'),
('currency_symbol', '₹', 'Currency symbol used throughout the system'),
('allow_reservations', 'true', 'Enable student book reservations when zero copies are available')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);

-- 3. Insert Floors
INSERT INTO floors (id, floor_number, name, description) VALUES
(1, 1, 'Ground Floor', 'Main Entrance, Circulation Desk, Computer Science & Electronics'),
(2, 2, 'First Floor', 'Mechanical, Civil Engineering, Applied Sciences & Quiet Study Hall'),
(3, 3, 'Second Floor', 'Reference Collection, Research Periodicals & Humanities')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. Insert Sections
INSERT INTO sections (id, floor_id, code, name, description) VALUES
(1, 1, 'CS-SEC', 'Computer Science & Software Engineering', 'Programming, Algorithms, AI, Databases and Networks'),
(2, 1, 'ELEC-SEC', 'Electrical & Electronics Engineering', 'Circuits, Microcontrollers, VLSI, and Signal Processing'),
(3, 2, 'MECH-SEC', 'Mechanical & Civil Engineering', 'Thermodynamics, Mechanics, Robotics, Fluid Dynamics'),
(4, 2, 'SCI-SEC', 'Applied Sciences & Mathematics', 'Calculus, Statistics, Physics, and Chemistry'),
(5, 3, 'REF-SEC', 'Reference & Research Periodicals', 'Encyclopedias, Bound Journals, Technical Standards'),
(6, 3, 'LIT-SEC', 'Literature & Humanities', 'Classic literature, philosophy, and communication skills')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 5. Insert Racks
INSERT INTO racks (id, section_id, rack_number, description) VALUES
-- CS Section Racks
(1, 1, 'R01', 'Core Programming, Data Structures & Algorithms'),
(2, 1, 'R02', 'Database Systems, Cloud Computing & Web Technologies'),
(3, 1, 'R03', 'Artificial Intelligence, Machine Learning & Cyber Security'),
-- Electronics Section Racks
(4, 2, 'R01', 'Analog & Digital Electronic Circuits'),
(5, 2, 'R02', 'Microprocessors, Embedded Systems & IoT'),
-- Mechanical Section Racks
(6, 3, 'R01', 'Thermodynamics, Heat Transfer & Fluid Mechanics'),
(7, 3, 'R02', 'Engineering Mechanics, CAD/CAM & Robotics'),
-- Sciences Racks
(8, 4, 'R01', 'Advanced Engineering Mathematics & Probability'),
(9, 4, 'R02', 'Applied Physics, Modern Optics & Material Science'),
-- Reference Racks
(10, 5, 'R01', 'Standard Handbooks & Encyclopedias')
ON DUPLICATE KEY UPDATE rack_number=VALUES(rack_number);

-- 6. Insert Shelves
INSERT INTO shelves (id, rack_id, shelf_number, capacity, description) VALUES
-- Rack 1 (CS Core)
(1, 1, 'S01', 30, 'Top Shelf - Introductory Programming & C/C++'),
(2, 1, 'S02', 30, 'Second Shelf - Data Structures & Algorithms in Java/Python'),
(3, 1, 'S03', 30, 'Third Shelf - Operating Systems & Computer Architecture'),
(4, 1, 'S04', 30, 'Bottom Shelf - Software Engineering & Compilers'),
-- Rack 2 (CS Database/Cloud)
(5, 2, 'S01', 30, 'Top Shelf - Relational Database Systems & SQL'),
(6, 2, 'S02', 30, 'Second Shelf - Distributed Systems & Cloud Platforms'),
(7, 2, 'S03', 30, 'Third Shelf - Web Development & REST Architectures'),
-- Rack 3 (CS AI/ML)
(8, 3, 'S01', 30, 'Top Shelf - Artificial Intelligence & Search Algorithms'),
(9, 3, 'S02', 30, 'Second Shelf - Deep Learning & Neural Networks'),
(10, 3, 'S03', 30, 'Third Shelf - Computer Vision & Natural Language Processing'),
-- Rack 4 (Electronics Circuits)
(11, 4, 'S01', 25, 'Top Shelf - Circuit Analysis & Network Theory'),
(12, 4, 'S02', 25, 'Second Shelf - Digital Logic & Microelectronics'),
-- Rack 5 (Embedded)
(13, 5, 'S01', 25, 'Top Shelf - ARM Architecture & Embedded C'),
-- Rack 6 (Mechanical)
(14, 6, 'S01', 30, 'Top Shelf - Fundamentals of Thermodynamics'),
(15, 6, 'S02', 30, 'Second Shelf - Fluid Mechanics & Turbomachinery'),
-- Rack 8 (Math)
(16, 8, 'S01', 35, 'Top Shelf - Higher Engineering Mathematics'),
(17, 8, 'S02', 35, 'Second Shelf - Probability, Statistics & Stochastic Processes')
ON DUPLICATE KEY UPDATE shelf_number=VALUES(shelf_number);

-- 7. Insert Categories
INSERT INTO categories (id, name, code, description) VALUES
(1, 'Computer Science & IT', 'CS', 'Algorithms, Programming, Software Architecture, Networks'),
(2, 'Electronics & Communication', 'EC', 'Semiconductors, Telecommunications, Embedded Systems'),
(3, 'Mechanical Engineering', 'ME', 'Thermal, Design, Manufacturing, Robotics'),
(4, 'Mathematics & Statistics', 'MTH', 'Applied Mathematics, Discrete Math, Probability'),
(5, 'Physical Sciences', 'SCI', 'Applied Physics, Chemistry, Materials Science'),
(6, 'General & Humanities', 'GEN', 'Professional Ethics, Technical Writing, Management')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 8. Insert Books
INSERT INTO books (id, title, author, isbn, publisher, edition, publication_year, category_id, description, cover_image_url) VALUES
(1, 'Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', '9780262033848', 'MIT Press', '3rd Edition', 2009, 1, 'The definitive reference and textbook on algorithms and data structures.', 'https://images.unsplash.com/photo-1532012164546-f432f2e37b29?w=400&q=80'),
(2, 'Database System Concepts', 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', '9780073523323', 'McGraw-Hill Education', '7th Edition', 2019, 1, 'Fundamental concepts of database management, relational algebra, SQL, and transaction processing.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'),
(3, 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', '9780134610993', 'Pearson', '4th Edition', 2020, 1, 'Comprehensive and state-of-the-art introduction to the theory and practice of artificial intelligence.', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80'),
(4, 'Operating System Concepts', 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne', '9781119800361', 'Wiley', '10th Edition', 2018, 1, 'Essential guide to operating systems architecture, process management, memory, and virtual storage.', 'https://images.unsplash.com/photo-1507842229451-7f01be7fe802?w=400&q=80'),
(5, 'Computer Networking: A Top-Down Approach', 'James F. Kurose, Keith W. Ross', '9780133594140', 'Pearson', '7th Edition', 2016, 1, 'A modern and intuitive top-down approach focusing on internet architecture, protocols, and security.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=80'),
(6, 'Microelectronic Circuits', 'Adel S. Sedra, Kenneth C. Smith', '9780190853464', 'Oxford University Press', '8th Edition', 2020, 2, 'The international standard for electrical and computer engineering circuit analysis and design.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'),
(7, 'Thermodynamics: An Engineering Approach', 'Yunus A. Cengel, Michael A. Boles', '9789814595292', 'McGraw-Hill', '8th Edition', 2015, 3, 'Classic engineering text covering the principles of energy, entropy, power cycles, and heat exchange.', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80'),
(8, 'Higher Engineering Mathematics', 'B.S. Grewal', '9788174091955', 'Khanna Publishers', '44th Edition', 2017, 4, 'Standard textbook covering advanced calculus, differential equations, Fourier series, and linear algebra.', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80'),
(9, 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', '9780132350884', 'Prentice Hall', '1st Edition', 2008, 1, 'Practical guide to writing clean, maintainable, readable code and refactoring legacy systems.', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80'),
(10, 'Designing Data-Intensive Applications', 'Martin Kleppmann', '9781449373320', 'O Reilly Media', '1st Edition', 2017, 1, 'The big ideas behind reliable, scalable, and maintainable systems, partitioning, and replication.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 9. Insert Physical Book Copies (Each copy has an accession number, barcode, shelf location)
INSERT INTO book_copies (id, book_id, accession_number, barcode, shelf_id, `condition`, status) VALUES
-- Intro to Algorithms (Book 1) - Floor 1 -> CS-SEC -> Rack R01 -> Shelf S02
(1, 1, 'ACC-1001-A', 'BC-100101', 2, 'Good', 'Available'),
(2, 1, 'ACC-1001-B', 'BC-100102', 2, 'New', 'Available'),
(3, 1, 'ACC-1001-C', 'BC-100103', 2, 'Good', 'Issued'),
-- Database System Concepts (Book 2) - Floor 1 -> CS-SEC -> Rack R02 -> Shelf S01
(4, 2, 'ACC-1002-A', 'BC-100201', 5, 'Good', 'Available'),
(5, 2, 'ACC-1002-B', 'BC-100202', 5, 'Good', 'Issued'),
-- AI: A Modern Approach (Book 3) - Floor 1 -> CS-SEC -> Rack R03 -> Shelf S01
(6, 3, 'ACC-1003-A', 'BC-100301', 8, 'New', 'Available'),
(7, 3, 'ACC-1003-B', 'BC-100302', 8, 'Good', 'Available'),
-- Operating System Concepts (Book 4) - Floor 1 -> CS-SEC -> Rack R01 -> Shelf S03
(8, 4, 'ACC-1004-A', 'BC-100401', 3, 'Good', 'Available'),
(9, 4, 'ACC-1004-B', 'BC-100402', 3, 'Worn', 'Available'),
-- Computer Networking (Book 5) - Floor 1 -> CS-SEC -> Rack R02 -> Shelf S03
(10, 5, 'ACC-1005-A', 'BC-100501', 7, 'Good', 'Available'),
-- Microelectronic Circuits (Book 6) - Floor 1 -> ELEC-SEC -> Rack R01 -> Shelf S01
(11, 6, 'ACC-1006-A', 'BC-100601', 11, 'Good', 'Available'),
(12, 6, 'ACC-1006-B', 'BC-100602', 11, 'New', 'Available'),
-- Thermodynamics (Book 7) - Floor 2 -> MECH-SEC -> Rack R01 -> Shelf S01
(13, 7, 'ACC-1007-A', 'BC-100701', 14, 'Good', 'Available'),
-- Higher Engineering Mathematics (Book 8) - Floor 2 -> SCI-SEC -> Rack R01 -> Shelf S01
(14, 8, 'ACC-1008-A', 'BC-100801', 16, 'Good', 'Available'),
(15, 8, 'ACC-1008-B', 'BC-100802', 16, 'Good', 'Available'),
-- Clean Code (Book 9) - Floor 1 -> CS-SEC -> Rack R01 -> Shelf S01
(16, 9, 'ACC-1009-A', 'BC-100901', 1, 'Good', 'Available'),
-- Designing Data-Intensive Applications (Book 10) - Floor 1 -> CS-SEC -> Rack R02 -> Shelf S02
(17, 10, 'ACC-1010-A', 'BC-101001', 6, 'New', 'Available')
ON DUPLICATE KEY UPDATE accession_number=VALUES(accession_number);
