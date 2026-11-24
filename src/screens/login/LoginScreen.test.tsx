import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';

vi.mock('../../shared/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    logout: vi.fn(),
    user: { id: 'u-2', name: 'Maria Atendente', email: 'atendente@rodo.com', role: 'ATENDENTE' },
    isMaster: false,
  }),
}));

describe('LoginScreen', () => {
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
});
