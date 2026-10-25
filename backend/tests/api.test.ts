import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/database/db';
import { setupDatabase } from '../src/database/setup';

describe('Smart Library Management System - Automated Integration Tests', () => {
  let adminToken: string;
  let librarianToken: string;
  let studentToken: string;
  let testBookId: number;
  let testCopyId: number;
  let testAccession: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.initialize();
    await setupDatabase(false);

    // 1. Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@library.edu', password: 'admin123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;

    // 2. Login as Librarian
    const libRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'librarian@library.edu', password: 'librarian123' });
    expect(libRes.status).toBe(200);
    librarianToken = libRes.body.token;

    // 3. Login as Student
    const stuRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'student@library.edu', password: 'student123' });
    expect(stuRes.status).toBe(200);
    studentToken = stuRes.body.token;
  });

  describe('1. Authentication & Security', () => {
    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'admin@library.edu', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should register a new student account', async () => {
      const rand = Math.floor(Math.random() * 10000);
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: `teststudent_${rand}`,
          email: `teststudent_${rand}@library.edu`,
          password: 'password123',
          fullName: 'Test Automation Student',
          studentRegNo: `REG-${rand}`,
          department: 'Computer Science',
          academicYear: 'Year 2',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('student');
    });

    it('should prevent student from creating books (role permission test)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Unauthorized Book',
          author: 'Malicious User',
          categoryId: 1,
        });

      expect(res.status).toBe(403);
    });

    it('should isolate student data: student cannot view another student profile', async () => {
      // Student 1 (id 1) trying to fetch student 2 profile
      const res = await request(app)
        .get('/api/students/2')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Book Inventory & Location Tracking', () => {
    it('should allow librarian to create a book title', async () => {
      const rand = Math.floor(Math.random() * 10000);
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          title: `Automated Test Book ${rand}`,
          author: 'Dr. Test Author',
          isbn: `97800000${rand}`,
          categoryId: 1,
          publisher: 'Test Press',
          edition: '1st Edition',
          publicationYear: 2026,
          description: 'A test book created via automated test suite.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testBookId = res.body.data.id;
    });

    it('should assign a physical copy to a shelf location (Floor -> Section -> Rack -> Shelf)', async () => {
      testAccession = `ACC-AUTO-${Math.floor(Math.random() * 100000)}`;
      const res = await request(app)
        .post('/api/copies')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          bookId: testBookId,
          accessionNumber: testAccession,
          barcode: `BC-${testAccession}`,
          shelfId: 1, // Shelf 1 in Rack 1, CS-SEC, Floor 1
          condition: 'New',
          status: 'Available',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      testCopyId = res.body.data.id;
    });

    it('should find book with complete location path', async () => {
      const res = await request(app)
        .get(`/api/locations/find?q=${encodeURIComponent(testAccession)}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const match = res.body.data[0];
      expect(match.accession_number).toBe(testAccession);
      expect(match.hasLocation).toBe(true);
      expect(match.fullLocationPath).toContain('Floor 1');
      expect(match.fullLocationPath).toContain('Rack R01');
    });
  });

  describe('3. Issue & Return Management Workflow', () => {
    it('should successfully issue the available copy to Student 1', async () => {
      const res = await request(app)
        .post('/api/loans/issue')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          studentId: 1,
          copyIdentifier: testAccession,
          notes: 'Automated test loan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.loanId).toBeDefined();

      // Verify copy status is now Issued
      const copyLookup = await request(app)
        .get(`/api/copies/lookup/${testAccession}`)
        .set('Authorization', `Bearer ${librarianToken}`);
      expect(copyLookup.body.data.status).toBe('Issued');
    });

    it('should PREVENT duplicate issue of already issued copy', async () => {
      const res = await request(app)
        .post('/api/loans/issue')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          studentId: 1,
          copyIdentifier: testAccession,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not available');
    });

    it('should return book and verify designated shelving location & status reset', async () => {
      // Find the active loan for this copy
      const searchRes = await request(app)
        .get(`/api/loans/return-search?q=${encodeURIComponent(testAccession)}`)
        .set('Authorization', `Bearer ${librarianToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBeGreaterThan(0);
      const loan = searchRes.body.data[0];

      // Process return
      const returnRes = await request(app)
        .post('/api/loans/return')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          loanId: loan.loan_id,
          conditionOnReturn: 'Good',
        });

      expect(returnRes.status).toBe(200);
      expect(returnRes.body.success).toBe(true);
      expect(returnRes.body.data.designatedShelvingLocation).toContain('Shelf');
      expect(returnRes.body.data.updatedCopyStatus).toBe('Available');

      // Verify cannot return again (duplicate return prevention)
      const duplicateRes = await request(app)
        .post('/api/loans/return')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          loanId: loan.loan_id,
        });
      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.message).toContain('already been marked as returned');
    });
  });

  describe('4. Dashboard Metrics Calculation', () => {
    it('should calculate authoritative dashboard statistics from DB', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalTitles).toBeGreaterThan(0);
      expect(res.body.data.summary.totalCopies).toBeGreaterThan(0);
      expect(res.body.data.summary.registeredStudents).toBeGreaterThan(0);
    });
  });
});
