import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsScreen } from './SettingsScreen';
import { api } from '../../shared/services/api';

vi.mock('../../shared/services/api', async () => {
  const actual = await vi.importActual<typeof import('../../shared/services/api')>(
    '../../shared/services/api'
  );
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    },
  };
});

describe('SettingsScreen - Daily Job Execution Flag & Alert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display alert warning and prevent execution when daily job was already executed today', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'GLOBAL_CONFIG',
        pricePerKm: 2.5,
        baseRate: 10.0,
        defaultMotoboyCommissionPercentage: 70.0,
        dailyJobExecutedToday: true,
        lastDailyJobExecutionDate: '2026-11-23',
      },
    });

    (api.post as unknown as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        status: 400,
        data: {
          message:
            'O fechamento e geração automática de relatórios já foi executado hoje. Não é permitido executá-lo novamente no mesmo dia.',
        },
      },
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SettingsScreen />);

    // Verify the status flag badge is displayed on screen
    expect(await screen.findByText(/Já executado hoje/i)).toBeInTheDocument();

    // When user clicks "Executar Fechamento Diário Agora", an alert message is shown
    const runJobBtn = screen.getByRole('button', { name: /Executar Fechamento Diário Agora/i });
    await userEvent.click(runJobBtn);

    expect(
      await screen.findByText(/já foi executado hoje/i)
    ).toBeInTheDocument();
    expect(alertSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('should allow MASTER user to configure the execution time of the Robô de Fechamento Diário', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'GLOBAL_CONFIG',
        pricePerKm: 2.5,
        baseRate: 10.0,
        defaultMotoboyCommissionPercentage: 70.0,
        dailyJobExecutedToday: false,
        dailyJobExecutionTime: '20:00',
      },
    });

    (api.put as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'GLOBAL_CONFIG',
        pricePerKm: 2.5,
        baseRate: 10.0,
        defaultMotoboyCommissionPercentage: 70.0,
        dailyJobExecutedToday: false,
        dailyJobExecutionTime: '21:30',
      },
    });

    render(<SettingsScreen />);

    const timeInput = (await screen.findByLabelText(
      /Horário de Execução do Robô de Fechamento Diário/i
    )) as HTMLInputElement;
    expect(timeInput.value).toBe('20:00');

    await userEvent.clear(timeInput);
    await userEvent.type(timeInput, '21:30');

    const saveBtn = screen.getByRole('button', { name: /Salvar Configurações/i });
    await userEvent.click(saveBtn);

    expect(api.put).toHaveBeenCalledWith(
      '/settings',
      expect.objectContaining({
        dailyJobExecutionTime: '21:30',
      })
    );

    expect(
      await screen.findByText(/Robô de Fechamento Diário \(Agendado às 21:30\)/i)
    ).toBeInTheDocument();
  });
});
