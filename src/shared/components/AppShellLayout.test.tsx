import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppShellLayout } from './AppShellLayout';
import { AuthProvider } from '../hooks/useAuth';

describe('AppShellLayout Responsive Mobile/Tablet Behavior', () => {
  beforeEach(() => {
    localStorage.setItem(
      'rodo_auth',
      JSON.stringify({
        id: 'u-1',
        name: 'Rodrigo (Master)',
        email: 'admin@rodo.com',
        role: 'MASTER',
        token: 'jwt-token',
      })
    );
  });

  it('should start with mobile drawer closed on phone screen (<768px) and toggle drawer with backdrop when clicking menu button', async () => {
    // Simulate phone viewport width (375px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(
      <MemoryRouter initialEntries={['/pedidos']}>
        <AuthProvider>
          <AppShellLayout />
        </AuthProvider>
      </MemoryRouter>
    );

    const sidebar = screen.getByTestId('app-sidebar');
    // On mobile (<768px), sidebar starts closed (-translate-x-full)
    expect(sidebar.className).toContain('-translate-x-full');
    expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();

    // Click hamburger menu button to open mobile drawer
    const toggleBtn = screen.getByRole('button', { name: /Alternar menu/i });
    await userEvent.click(toggleBtn);

    expect(sidebar.className).toContain('translate-x-0');
    expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

    // Clicking backdrop closes the mobile drawer
    await userEvent.click(screen.getByTestId('mobile-sidebar-backdrop'));
    expect(sidebar.className).toContain('-translate-x-full');
  });
});
