import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireRole from './RequireRole';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderAdminRoute = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/admin" element={<div>Admin Page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('RequireRole', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows a loading state instead of the route while the session is resolving', () => {
    mockUseAuth.mockReturnValue({ role: undefined, loading: true });
    renderAdminRoute();

    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders the protected route when the role matches (e.g. an admin visiting /admin)', () => {
    mockUseAuth.mockReturnValue({ role: 'admin', loading: false });
    renderAdminRoute();

    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('redirects away when the role does not match (e.g. a student visiting /admin)', () => {
    mockUseAuth.mockReturnValue({ role: 'student', loading: false });
    renderAdminRoute();

    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
