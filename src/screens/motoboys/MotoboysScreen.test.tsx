import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MotoboysScreen } from './MotoboysScreen';
import { api } from '../../shared/services/api';

vi.mock('../../shared/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('MotoboysScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('should render motoboys and allow deleting a motoboy', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'm-1',
          name: 'Carlos Eduardo Silva',
          cpf: '111.222.333-44',
          phone: '(31) 99111-2233',
          type: 'FIXO',
          active: true,
        },
      ],
    });
    (api.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(<MotoboysScreen />);

    expect(await screen.findByText('Carlos Eduardo Silva')).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: /Excluir motoboy/i });
    await userEvent.click(deleteBtn);

    expect(api.delete).toHaveBeenCalledWith('/motoboys/m-1');
  });
});
