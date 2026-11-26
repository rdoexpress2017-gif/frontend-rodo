import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientsScreen } from './ClientsScreen';
import { api } from '../../shared/services/api';

vi.mock('../../shared/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ClientsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('should render clients and allow deleting a client', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'c-1',
          name: 'Farmácia DrogaRaia Savassi',
          document: '12.345.678/0001-90',
          email: 'contato@drogaraia.com.br',
          phone: '(31) 3222-1100',
          baseAddress: {
            street: 'Av. do Contorno',
            number: '6000',
            neighborhood: 'Savassi',
            city: 'Belo Horizonte',
            state: 'MG',
          },
          billingCycle: { type: 'DAILY' },
          active: true,
        },
      ],
    });
    (api.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(<ClientsScreen />);

    expect(await screen.findByText('Farmácia DrogaRaia Savassi')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Excluir cliente/i });
    await userEvent.click(deleteBtn);

    expect(api.delete).toHaveBeenCalledWith('/clients/c-1');
  });
});
