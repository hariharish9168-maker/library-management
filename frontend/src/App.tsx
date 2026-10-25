import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { BookCataloguePage } from './pages/books/BookCataloguePage';
import { BookFormPage } from './pages/books/BookFormPage';
import { BookDetailsPage } from './pages/books/BookDetailsPage';
import { FindBookPage } from './pages/location/FindBookPage';
import { RackShelfPage } from './pages/location/RackShelfPage';
import { CopyInventoryPage } from './pages/inventory/CopyInventoryPage';
import { IssueBookPage } from './pages/circulation/IssueBookPage';
import { ReturnBookPage } from './pages/circulation/ReturnBookPage';
import { ActiveLoansPage } from './pages/circulation/ActiveLoansPage';
import { BorrowingHistoryPage } from './pages/circulation/BorrowingHistoryPage';
import { OverdueBooksPage } from './pages/circulation/OverdueBooksPage';
import { FineManagementPage } from './pages/fines/FineManagementPage';
import { StudentListPage } from './pages/students/StudentListPage';
import { StudentDetailsPage } from './pages/students/StudentDetailsPage';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { StaffManagementPage } from './pages/admin/StaffManagementPage';
import { LibrarySettingsPage } from './pages/admin/LibrarySettingsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'librarian' | 'student'>;
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated Protected Routes inside Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Catalog & Location */}
            <Route path="/books" element={<BookCataloguePage />} />
            <Route
              path="/books/new"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <BookFormPage />
                </ProtectedRoute>
              }
            />
            <Route path="/books/:id" element={<BookDetailsPage />} />
            <Route
              path="/books/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <BookFormPage />
                </ProtectedRoute>
              }
            />

            <Route path="/find-book" element={<FindBookPage />} />
            <Route path="/find_book" element={<Navigate to="/find-book" replace />} />
            <Route
              path="/racks-shelves"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <RackShelfPage />
                </ProtectedRoute>
              }
            />
            <Route path="/racks_shelves" element={<Navigate to="/racks-shelves" replace />} />
            <Route path="/rack-shelves" element={<Navigate to="/racks-shelves" replace />} />
            <Route
              path="/copies"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <CopyInventoryPage />
                </ProtectedRoute>
              }
            />

            {/* Circulation */}
            <Route
              path="/issue-book"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <IssueBookPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/return-book"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <ReturnBookPage />
                </ProtectedRoute>
              }
            />
            <Route path="/active-loans" element={<ActiveLoansPage />} />
            <Route path="/borrowing-history" element={<BorrowingHistoryPage />} />
            <Route path="/overdue-books" element={<OverdueBooksPage />} />

            {/* Fines, Students & Community */}
            <Route path="/fines" element={<FineManagementPage />} />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <StudentListPage />
                </ProtectedRoute>
              }
            />
            <Route path="/students/:id" element={<StudentDetailsPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'librarian']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Administration */}
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <LibrarySettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
