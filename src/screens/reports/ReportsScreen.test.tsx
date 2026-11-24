import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsScreen } from './ReportsScreen';
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
      delete: vi.fn(),
    },
  };
});

describe('ReportsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display reports with orderIds, fetch orders via /orders/by-ids when viewing report, and only generate PDF when clicking Gerar PDF button', async () => {
    // Arrange
    const mockReports = [
      {
        id: 'rep-10',
        reportCode: 'REL-202610-ABCD',
        type: 'CLIENTE',
        targetEntityId: 'c-1',
        targetEntityName: 'INCLOSET',
        targetEntitySubtype: 'WEEKLY',
        orderIds: ['ord-1', 'ord-2'],
        periodStart: '2026-10-13T00:00:00Z',
        periodEnd: '2026-10-19T17:30:00Z',
        totalOrders: 2,
        totalAmount: 54.0,
        totalDistanceKm: 12.0,
        paymentOrderId: 'po-10',
        paymentOrderStatus: 'AGUARDANDO_PAGAMENTO',
        generatedByUserId: 'u-1',
        generatedByUserName: 'Renata',
        createdAt: '2026-10-20T12:00:00Z',
      },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/reports') {
        return Promise.resolve({ data: mockReports });
      }
      if (url === '/orders/by-ids') {
        return Promise.resolve({
          data: [
            {
              id: 'ord-1',
              orderNumber: 1001,
              clientName: 'INCLOSET',
              requesterName: 'A. Junqueira',
              destinationAddress: { street: 'Alameda Mônaco', number: '457', neighborhood: 'Nova Lima', city: 'BH', state: 'MG' },
              amount: 36.0,
              motoboyCommissionAmount: 28.8,
              createdAt: '2026-10-14T13:00:00Z',
            },
          ],
        });
      }
      if (url === '/clients') {
        return Promise.resolve({ data: [{ id: 'c-1', name: 'INCLOSET' }] });
      }
      if (url === '/motoboys') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/orders/list') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/reports/rep-10/pdf') {
        return Promise.resolve({ data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }) });
      }
      if (url === '/settings') {
        return Promise.resolve({
          data: {
            id: 'GLOBAL_CONFIG',
            pricePerKm: 2.5,
            baseRate: 10.0,
            defaultMotoboyCommissionPercentage: 70.0,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    window.URL.createObjectURL = vi.fn(() => 'blob:mock-pdf');
    window.URL.revokeObjectURL = vi.fn();

    // Act
    render(<ReportsScreen />);

    // Switch to Clientes tab
    const clientesTab = await screen.findByRole('button', { name: /Relatórios de Clientes/i });
    await userEvent.click(clientesTab);

    // Assert report row is displayed and PDF was NOT generated automatically
    expect(await screen.findByText('REL-202610-ABCD')).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith('/reports/rep-10/pdf', expect.anything());

    // Action buttons should be hidden inside the 3-dots menu initially
    expect(screen.queryByRole('button', { name: /Ver Relatório/i })).not.toBeInTheDocument();

    // Open the 3-dots menu and click "Ver Relatório" to open on-screen preview via /orders/by-ids
    const actionsTrigger = screen.getByTestId('report-actions-trigger-0');
    await userEvent.click(actionsTrigger);

    const actionsMenu = screen.getByTestId('report-actions-menu-0');
    expect(actionsMenu.className).toContain('fixed');

    const viewBtn = screen.getByRole('button', { name: /Ver Relatório/i });
    await userEvent.click(viewBtn);

    expect(api.get).toHaveBeenCalledWith('/orders/by-ids', {
      params: { ids: 'ord-1,ord-2' },
    });
    expect(await screen.findByText(/A. Junqueira/i)).toBeInTheDocument();

    // Assert dynamic percentage from settings table (70% motoboy / 30% RDO) is displayed instead of hardcoded 80% / 20%
    expect(screen.getByText('Valor Motoboy (70%)')).toBeInTheDocument();
    expect(screen.getByText('Valor RDO (30%)')).toBeInTheDocument();
    expect(screen.getByText('VALOR MOTOBOY (70%)')).toBeInTheDocument();
    expect(screen.getByText('VALOR RDO (30%)')).toBeInTheDocument();
    expect(screen.queryByText('VALOR MOTOBOY (80%)')).not.toBeInTheDocument();

    // Click "Gerar PDF" button inside the modal
    const pdfBtns = screen.getAllByRole('button', { name: /Gerar PDF/i });
    await userEvent.click(pdfBtns[0]);

    expect(api.get).toHaveBeenCalledWith('/reports/rep-10/pdf', { responseType: 'blob' });
  });

  it('should display Busca Aberta tab (accessible to all profiles), populate Client and Motoboy filter options even if initial aux fetch fails or recovers later, and filter orders by selected Client and Motoboy', async () => {
    let clientsCallCount = 0;
    let motoboysCallCount = 0;

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/clients') {
        clientsCallCount += 1;
        if (clientsCallCount === 1) {
          return Promise.reject(new Error('Backend restarting'));
        }
        return Promise.resolve({
          data: [
            { id: 'c-1', name: 'Farmácia DrogaRaia Savassi' },
            { id: 'c-2', name: 'Restaurante Sabor Mineiro' },
          ],
        });
      }
      if (url === '/motoboys') {
        motoboysCallCount += 1;
        return Promise.resolve({
          data: [
            { id: 'm-1', name: 'Carlos Eduardo Silva' },
            { id: 'm-2', name: 'Gabriel Melo' },
          ],
        });
      }
      if (url === '/orders/list') {
        return Promise.resolve({
          data: [
            {
              id: 'ord-1026',
              orderNumber: 1026,
              clientId: 'c-1',
              clientName: 'Farmácia DrogaRaia Savassi',
              motoboyId: 'm-1',
              motoboyName: 'Carlos Eduardo Silva',
              requesterName: 'Mariana',
              routeDistanceKm: 6,
              amount: 25.0,
              motoboyCommissionAmount: 20.0,
              status: 'PENDENTE',
              createdAt: '2026-10-23T14:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(<ReportsScreen />);

    // Verify tab is named strictly "Busca Aberta"
    expect(screen.getByRole('button', { name: /^Busca Aberta$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Master \(Busca Aberta\)/i })).not.toBeInTheDocument();

    // Wait for order row to render
    expect(await screen.findByText('#1026')).toBeInTheDocument();

    // Even though first /clients call failed, motoboys succeeded (via allSettled) AND client from order is merged, plus focusing/switching refreshes aux lists!
    const clientSelect = screen.getByLabelText(/Filtrar por Cliente/i) as HTMLSelectElement;
    const motoboySelect = screen.getByLabelText(/Filtrar por Motoboy/i) as HTMLSelectElement;

    await userEvent.click(clientSelect);

    expect(await screen.findByRole('option', { name: 'Restaurante Sabor Mineiro' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carlos Eduardo Silva' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gabriel Melo' })).toBeInTheDocument();

    await userEvent.selectOptions(clientSelect, 'c-2');
    expect(api.get).toHaveBeenCalledWith('/orders/list', {
      params: expect.objectContaining({ clientId: 'c-2' }),
    });

    await userEvent.selectOptions(motoboySelect, 'm-2');
    expect(api.get).toHaveBeenCalledWith('/orders/list', {
      params: expect.objectContaining({ clientId: 'c-2', motoboyId: 'm-2' }),
    });
  });

  it('should allow sorting Relatórios de Clientes and Relatórios de Motoboys by Data de Criação, Data de Alteração, and Valor', async () => {
    const mockReports = [
      {
        id: 'rep-1',
        reportCode: 'REL-MENOR',
        type: 'CLIENTE',
        targetEntityId: 'c-1',
        targetEntityName: 'Cliente Alfa',
        targetEntitySubtype: 'DAILY',
        orderIds: ['ord-1'],
        periodStart: '2026-10-10T00:00:00Z',
        periodEnd: '2026-10-10T23:59:59Z',
        totalOrders: 1,
        totalAmount: 40.0,
        totalDistanceKm: 5.0,
        paymentOrderStatus: 'PAGO',
        generatedByUserId: 'u-1',
        generatedByUserName: 'Rodrigo',
        createdAt: '2026-10-10T18:00:00Z',
        updatedAt: '2026-10-29T15:00:00Z',
      },
      {
        id: 'rep-2',
        reportCode: 'REL-MAIOR',
        type: 'CLIENTE',
        targetEntityId: 'c-2',
        targetEntityName: 'Cliente Beta',
        targetEntitySubtype: 'WEEKLY',
        orderIds: ['ord-2', 'ord-3'],
        periodStart: '2026-10-20T00:00:00Z',
        periodEnd: '2026-10-25T23:59:59Z',
        totalOrders: 2,
        totalAmount: 190.0,
        totalDistanceKm: 18.0,
        paymentOrderStatus: 'AGUARDANDO_PAGAMENTO',
        generatedByUserId: 'u-1',
        generatedByUserName: 'Rodrigo',
        createdAt: '2026-10-25T18:00:00Z',
        updatedAt: '2026-10-25T18:00:00Z',
      },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/reports') {
        return Promise.resolve({ data: mockReports });
      }
      return Promise.resolve({ data: [] });
    });

    render(<ReportsScreen />);

    // Open Relatórios de Clientes
    await userEvent.click(await screen.findByRole('button', { name: /Relatórios de Clientes/i }));
    expect(await screen.findByText('REL-MENOR')).toBeInTheDocument();
    expect(screen.getByText('REL-MAIOR')).toBeInTheDocument();

    const sortReportsSelect = screen.getByLabelText(/Ordenar relatórios por/i);

    // 1. Sort by Valor (Maior ↓) -> REL-MAIOR first
    await userEvent.selectOptions(sortReportsSelect, 'AMOUNT_DESC');
    let rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('REL-MAIOR');
    expect(rows[2].textContent).toContain('REL-MENOR');

    // 2. Sort by Valor (Menor ↑) -> REL-MENOR first
    await userEvent.selectOptions(sortReportsSelect, 'AMOUNT_ASC');
    rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('REL-MENOR');
    expect(rows[2].textContent).toContain('REL-MAIOR');

    // 3. Sort by Data de Alteração (Mais recente ↓) -> REL-MENOR has updatedAt 2026-10-29, so it comes first!
    await userEvent.selectOptions(sortReportsSelect, 'UPDATED_DESC');
    rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('REL-MENOR');
    expect(rows[2].textContent).toContain('REL-MAIOR');

    // 4. Sort by Data de Criação (Mais recente ↓) -> REL-MAIOR has createdAt 2026-10-25, so it comes first!
    await userEvent.selectOptions(sortReportsSelect, 'CREATED_DESC');
    rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('REL-MAIOR');
    expect(rows[2].textContent).toContain('REL-MENOR');
  });

  it('should display Relatórios da Empresa (RDO) tab only for MASTER profile, and render all 8 RESUMO GERAL fields plus per-motoboy aggregates and total to pay', async () => {
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

    const mockEmpresaReports = [
      {
        id: 'rep-emp-1',
        reportCode: 'REL-202611-EMP1',
        type: 'EMPRESA',
        targetEntityName: 'RDO Express (Resumo Geral)',
        targetEntitySubtype: 'EMPRESA',
        orderIds: ['ord-1', 'ord-2'],
        periodStart: '2026-11-23T00:00:00Z',
        periodEnd: '2026-11-23T23:59:59Z',
        totalOrders: 136,
        totalAmount: 4435.0,
        totalDistanceKm: 1050.0,
        generatedByUserId: 'SYSTEM_JOB',
        generatedByUserName: 'Robô Automático',
        createdAt: '2026-11-23T20:00:00Z',
        updatedAt: '2026-11-23T20:00:00Z',
        companySummary: {
          totalRevenue: 4435.0,
          paidRevenue: 4035.0,
          pendingRevenue: 400.0,
          netProfit: 477.0,
          totalCommissions: 3548.0,
          paidCommissions: 3228.0,
          totalExpenses: 330.0,
          collaboratorShare: 3548.0,
          totalOrders: 136,
          paidOrdersCount: 125,
          pendingOrdersCount: 11,
          motoboyAggregates: [
            {
              motoboyId: 'm-1',
              motoboyName: 'Carlos Eduardo Silva',
              motoboyType: 'FIXO',
              totalOrders: 56,
              totalDistanceKm: 450.0,
              grossAmount: 1935.0,
              amountToPay: 1548.0,
            },
            {
              motoboyId: 'm-2',
              motoboyName: 'Marcos Vinícius Souza',
              motoboyType: 'TERCEIRIZADO',
              totalOrders: 80,
              totalDistanceKm: 600.0,
              grossAmount: 2500.0,
              amountToPay: 2000.0,
            },
          ],
          totalMotoboysAmountToPay: 3548.0,
          emailSentToMaster: true,
          masterEmailRecipient: 'admin@rodo.com',
        },
      },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/reports') {
        return Promise.resolve({ data: mockEmpresaReports });
      }
      if (url === '/orders/by-ids') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(<ReportsScreen />);

    // MASTER tab "Relatórios da Empresa (RDO)" should be visible
    const empresaTabBtn = await screen.findByRole('button', {
      name: /Relatórios da Empresa \(RDO\)/i,
    });
    await userEvent.click(empresaTabBtn);

    expect(await screen.findByText('REL-202611-EMP1')).toBeInTheDocument();

    // Open 3-dots menu and click "Ver Relatório" to open Empresa Report detail modal
    const actionsTrigger = screen.getByTestId('report-actions-trigger-0');
    await userEvent.click(actionsTrigger);

    const viewBtn = screen.getByRole('button', { name: /Ver Relatório/i });
    await userEvent.click(viewBtn);

    // Verify all 8 RESUMO GERAL metrics
    expect(await screen.findByText(/Valor total de pedidos \(136\)/i)).toBeInTheDocument();
    expect(screen.getByText(/125 pagos em caixa/i)).toBeInTheDocument();
    expect(screen.getByText(/11 a receber \(não pagos\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Somente sobre pedidos pagos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/477,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/330,00/)).toBeInTheDocument();
    expect(screen.getByText(/125 pagos • 11 pendentes/i)).toBeInTheDocument();

    // Verify Motoboy Aggregates and final total to pay for all motoboys together
    expect(screen.getByText('Carlos Eduardo Silva')).toBeInTheDocument();
    expect(screen.getByText('Marcos Vinícius Souza')).toBeInTheDocument();
    expect(screen.getByText(/1\.548,00/)).toBeInTheDocument();
    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument();
    expect(
      screen.getByText(/VALOR FINAL DE TODOS OS MOTOBOYS JUNTOS NO DIA/i)
    ).toBeInTheDocument();

    // Open 3-dots menu again and verify EMPRESA report can be deleted
    await userEvent.click(screen.getByTestId('report-actions-trigger-0'));
    (api.delete as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const deleteBtn = screen.getByRole('button', { name: /Excluir/i });
    await userEvent.click(deleteBtn);
    expect(api.delete).toHaveBeenCalledWith('/reports/rep-emp-1');
  });
});
