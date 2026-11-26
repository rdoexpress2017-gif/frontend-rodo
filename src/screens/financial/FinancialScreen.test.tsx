import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialScreen } from './FinancialScreen';
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
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
});

describe('FinancialScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display Despesas (instead of Empresa) and Lucro (instead of Saldo Total) in RESUMO GERAL, filter RDO by startDate and endDate, and manage Lançamentos (create, edit, delete)', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/orders/summary') {
        return Promise.resolve({
          data: {
            totalRevenue: 777.0,
            paidRevenue: 577.0,
            pendingRevenue: 200.0,
            totalCommissions: 621.6,
            paidCommissions: 461.6,
            companyShare: 55.4,
            totalExpenses: 55.4,
            collaboratorShare: 621.6,
            totalOrders: 26,
            paidOrdersCount: 20,
            pendingOrdersCount: 6,
            netBalance: 60.0,
            estimatedProfit: 100.0,
          },
        });
      }
      if (url === '/orders') {
        return Promise.resolve({
          data: {
            content: [
              {
                id: 'ord-1',
                orderNumber: 1026,
                clientName: 'Farmácia DrogaRaia Savassi',
                destinationAddress: { street: 'Rua Teste da silva', number: '12', neighborhood: 'Pedra Azul', city: 'BH', state: 'MG' },
                amount: 32.0,
                status: 'PAGO',
                createdAt: '2026-10-23T14:00:00Z',
              },
            ],
            page: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
          },
        });
      }
      if (url === '/payment-orders') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/expenses') {
        return Promise.resolve({
          data: [
            {
              id: 'exp-1',
              expenseDate: '2026-10-29T12:00:00Z',
              amount: 55.4,
              description: 'Gasto com internet do mês',
              createdAt: '2026-10-29T12:00:00Z',
              updatedAt: '2026-10-29T12:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'exp-2',
        expenseDate: '2026-10-29T12:00:00Z',
        amount: 120.0,
        description: 'Conserto do computador',
        createdAt: '2026-10-29T12:00:00Z',
        updatedAt: '2026-10-29T12:00:00Z',
      },
    });

    (api.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(<FinancialScreen />);

    // Verify card labels: "Despesas" (replaced "Empresa"), "Lucro" (replaced "Saldo Total"), "Lucro Estimado", "Já Recebido", and "A Receber"
    expect(await screen.findByText('Despesas')).toBeInTheDocument();
    expect(screen.queryByText('Empresa')).not.toBeInTheDocument();
    expect(screen.getByText('Lucro')).toBeInTheDocument();
    expect(screen.getByText('Lucro Estimado')).toBeInTheDocument();
    expect(screen.queryByText('Saldo Total')).not.toBeInTheDocument();
    expect(screen.getByText('Já Recebido')).toBeInTheDocument();
    expect(screen.getByText('A Receber')).toBeInTheDocument();

    // Verify values rendered for Total Pedidos (R$ 777,00), Já Recebido (R$ 577,00), A Receber (R$ 200,00 / 6 a receber), Despesas (R$ 55,40), Lucro (R$ 60,00) and Lucro Estimado (R$ 100,00)
    expect(await screen.findByText(/55,40/)).toBeInTheDocument();
    expect(screen.getByText(/577,00/)).toBeInTheDocument();
    expect(screen.getByText(/200,00/)).toBeInTheDocument();
    expect(screen.getByText(/6 a receber/i)).toBeInTheDocument();
    expect(screen.getByText(/60,00/)).toBeInTheDocument();
    expect(screen.getByText(/100,00/)).toBeInTheDocument();

    // Verify date filters in RDO tab and the red "Calcular" button next to the filters trigger summary recalculation
    const startInput = screen.getByLabelText(/Data Inicial/i);
    const endInput = screen.getByLabelText(/Data Final/i);
    await userEvent.type(startInput, '2026-10-01');
    await userEvent.type(endInput, '2026-10-29');

    const calcBtn = screen.getByRole('button', { name: /Calcular/i });
    expect(calcBtn.className).toContain('bg-[#D92D3A]');
    vi.mocked(api.get).mockClear();
    await userEvent.click(calcBtn);

    expect(api.get).toHaveBeenCalledWith(
      '/orders/summary',
      expect.objectContaining({
        params: expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String),
        }),
      })
    );

    // Switch to "Lançamentos" tab
    const lancamentosTab = screen.getByRole('button', { name: /Lançamentos/i });
    await userEvent.click(lancamentosTab);

    // Existing expense row is shown
    expect(await screen.findByText('Gasto com internet do mês')).toBeInTheDocument();

    // Open "Novo Lançamento" modal and create a new expense
    const newBtn = screen.getByRole('button', { name: /Novo Lançamento/i });
    await userEvent.click(newBtn);

    const descInput = screen.getByLabelText(/Descrição do Gasto/i);
    const amountInput = screen.getByLabelText(/Valor Gasto/i);
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'Conserto do computador');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '120.00');

    const saveBtn = screen.getByRole('button', { name: /Salvar Lançamento/i });
    await userEvent.click(saveBtn);

    expect(api.post).toHaveBeenCalledWith(
      '/expenses',
      expect.objectContaining({
        amount: 120,
        description: 'Conserto do computador',
      })
    );
  });

  it('should allow filtering by date and sorting by Data or Valor across RDO, Lançamentos, and Caixa (Ordens de Pagamento)', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/orders/summary') {
        return Promise.resolve({
          data: {
            totalRevenue: 150.0,
            totalCommissions: 120.0,
            companyShare: 80.0,
            totalExpenses: 80.0,
            collaboratorShare: 120.0,
            totalOrders: 2,
            netBalance: -50.0,
          },
        });
      }
      if (url === '/orders') {
        return Promise.resolve({
          data: {
            content: [
              {
                id: 'ord-1',
                orderNumber: 1001,
                clientName: 'Cliente Menor',
                destinationAddress: { street: 'Rua A', number: '10', city: 'BH', state: 'MG' },
                amount: 30.0,
                status: 'ENTREGUE',
                createdAt: '2026-10-20T10:00:00Z',
              },
              {
                id: 'ord-2',
                orderNumber: 1002,
                clientName: 'Cliente Maior',
                destinationAddress: { street: 'Rua B', number: '20', city: 'BH', state: 'MG' },
                amount: 120.0,
                status: 'PAGO',
                createdAt: '2026-10-25T10:00:00Z',
              },
            ],
            page: 0,
            size: 50,
            totalElements: 2,
            totalPages: 1,
          },
        });
      }
      if (url === '/expenses') {
        return Promise.resolve({
          data: [
            {
              id: 'exp-10',
              expenseDate: '2026-10-20T12:00:00Z',
              amount: 50.0,
              description: 'Manutenção Moto',
              createdAt: '2026-10-20T12:00:00Z',
              updatedAt: '2026-10-20T12:00:00Z',
            },
            {
              id: 'exp-20',
              expenseDate: '2026-10-28T12:00:00Z',
              amount: 200.0,
              description: 'Internet Fibra',
              createdAt: '2026-10-28T12:00:00Z',
              updatedAt: '2026-10-28T12:00:00Z',
            },
          ],
        });
      }
      if (url === '/payment-orders') {
        return Promise.resolve({
          data: [
            {
              id: 'po-1',
              reportId: 'rep-1',
              clientId: 'c-1',
              clientName: 'OP Menor',
              orderIds: ['ord-1'],
              totalAmount: 90.0,
              status: 'AGUARDANDO_PAGAMENTO',
              issueDate: '2026-10-21T12:00:00Z',
              createdAt: '2026-10-21T12:00:00Z',
              updatedAt: '2026-10-21T12:00:00Z',
            },
            {
              id: 'po-2',
              reportId: 'rep-2',
              clientId: 'c-2',
              clientName: 'OP Maior',
              orderIds: ['ord-2'],
              totalAmount: 350.0,
              status: 'PAGO',
              issueDate: '2026-10-27T12:00:00Z',
              settledAt: '2026-10-28T12:00:00Z',
              createdAt: '2026-10-27T12:00:00Z',
              updatedAt: '2026-10-28T12:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(<FinancialScreen />);

    // Sort RDO orders by smallest amount first (AMOUNT_ASC)
    const sortSelect = await screen.findByLabelText(/Ordenar financeiro por/i);
    await userEvent.selectOptions(sortSelect, 'AMOUNT_ASC');

    const rowsAfterAsc = screen.getAllByRole('row');
    expect(rowsAfterAsc[1].textContent).toContain('Cliente Menor');
    expect(rowsAfterAsc[2].textContent).toContain('Cliente Maior');

    // Sort RDO orders by largest amount first (AMOUNT_DESC)
    await userEvent.selectOptions(sortSelect, 'AMOUNT_DESC');
    const rowsAfterDesc = screen.getAllByRole('row');
    expect(rowsAfterDesc[1].textContent).toContain('Cliente Maior');
    expect(rowsAfterDesc[2].textContent).toContain('Cliente Menor');

    // Switch to Lançamentos tab and verify sorting by AMOUNT_ASC
    await userEvent.click(screen.getByRole('button', { name: /Lançamentos/i }));
    await userEvent.selectOptions(sortSelect, 'AMOUNT_ASC');
    const expRowsAsc = screen.getAllByRole('row');
    expect(expRowsAsc[1].textContent).toContain('Manutenção Moto');
    expect(expRowsAsc[2].textContent).toContain('Internet Fibra');

    // Switch to Caixa (Ordens de Pagamento) tab and verify date filter + sorting are available and work
    await userEvent.click(screen.getByRole('button', { name: /Caixa \(Ordens de Pagamento\)/i }));
    expect(screen.getByLabelText(/Data Inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data Final/i)).toBeInTheDocument();

    await userEvent.selectOptions(sortSelect, 'AMOUNT_DESC');
    const poRowsDesc = screen.getAllByRole('row');
    expect(poRowsDesc[1].textContent).toContain('OP Maior');
    expect(poRowsDesc[2].textContent).toContain('OP Menor');
  });
});
