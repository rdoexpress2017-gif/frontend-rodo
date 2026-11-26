import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginScreen } from './LoginScreen';
import { handleUnauthorizedResponseError, resetUnauthorizedLock } from '../../shared/services/api';

const mockLogin = vi.fn();

vi.mock('../../shared/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    logout: vi.fn(),
    user: null,
    isMaster: false,
  }),
}));

describe('LoginScreen & 401 Session Expiration Interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUnauthorizedLock();
    localStorage.clear();
  });

  it('should render empty email and password fields with no pre-filled admin credentials', () => {
    render(
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/E-mail de acesso/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(/Senha/i) as HTMLInputElement;

    expect(emailInput.value).toBe('');
    expect(passwordInput.value).toBe('');
  });

  it('should display session expired warning when expired=true query param is present and redirect to original route after login', async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/login?expired=true&redirect=%2Ffinanceiro']}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/financeiro" element={<div>Tela Financeiro Recuperada</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Sua sessão expirou\. Faça login novamente para continuar\./i)
    ).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/E-mail de acesso/i), 'admin@rodo.com');
    await userEvent.type(screen.getByPlaceholderText(/Senha/i), 'Admin@123');
    await userEvent.click(screen.getByRole('button', { name: /Acessar Painel/i }));

    expect(mockLogin).toHaveBeenCalledWith('admin@rodo.com', 'Admin@123');
    expect(await screen.findByText('Tela Financeiro Recuperada')).toBeInTheDocument();
  });

  it('should clear localStorage auth cache, dispatch auth:session-expired and redirect once on concurrent 401 errors while ignoring 401 from /auth/login', async () => {
    localStorage.setItem('rodo_auth', JSON.stringify({ token: 'expired-jwt' }));
    const replaceMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/pedidos',
        search: '?page=0',
        replace: replaceMock,
      },
    });

    const eventSpy = vi.fn();
    window.addEventListener('auth:session-expired', eventSpy);

    // 1. 401 on /auth/login should reject normally and NOT trigger session expiration redirect
    await expect(
      handleUnauthorizedResponseError({
        response: { status: 401 },
        config: { url: '/auth/login' },
      } as any)
    ).rejects.toBeDefined();
    expect(replaceMock).not.toHaveBeenCalled();

    // 2. Concurrent 401s on protected endpoints (/clients, /motoboys, /orders) should trigger redirect only ONCE
    handleUnauthorizedResponseError({
      response: { status: 401 },
      config: { url: '/clients' },
    } as any);
    handleUnauthorizedResponseError({
      response: { status: 401 },
      config: { url: '/motoboys' },
    } as any);
    handleUnauthorizedResponseError({
      response: { status: 401 },
      config: { url: '/orders?page=0&size=20' },
    } as any);

    expect(localStorage.getItem('rodo_auth')).toBeNull();
    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/login?expired=true&redirect=%2Fpedidos%3Fpage%3D0');

    window.removeEventListener('auth:session-expired', eventSpy);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
