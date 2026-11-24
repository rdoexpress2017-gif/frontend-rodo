import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrdersScreen } from './OrdersScreen';
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
      patch: vi.fn(),
    },
  };
});

describe('OrdersScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filters, display paginated orders with alternating white/gray rows, and separate Solicitante from Atendente in edit modal', async () => {
    // Arrange
    const mockOrders = [
      {
        id: 'ord-1',
        orderNumber: 1001,
        clientId: 'c-1',
        clientName: 'Farmácia DrogaRaia',
        motoboyId: 'm-1',
        motoboyName: 'Carlos Moto',
        requesterName: 'Mariana',
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo (Master)',
        originAddress: { street: 'Av Contorno', number: '6000', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua Pedra Bonita', number: '878', neighborhood: 'Barroca', city: 'BH', state: 'MG' },
        routeDistanceKm: 7.5,
        amount: 35.0,
        motoboyCommissionAmount: 28.0,
        status: 'PENDENTE',
        createdAt: '2026-10-23T12:00:00Z',
        updatedAt: '2026-10-23T12:00:00Z',
      },
      {
        id: 'ord-2',
        orderNumber: 1026,
        clientId: 'c-2',
        clientName: 'Restaurante Sabor Mineiro',
        motoboyId: 'm-2',
        motoboyName: 'Marcos Souza',
        requesterName: undefined,
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo (Master)',
        originAddress: { street: 'Rua A', number: '10', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua B', number: '20', neighborhood: 'Centro', city: 'BH', state: 'MG' },
        routeDistanceKm: 5.0,
        amount: 25.0,
        motoboyCommissionAmount: 20.0,
        status: 'ENTREGUE',
        createdAt: '2026-10-23T13:00:00Z',
        updatedAt: '2026-10-23T13:00:00Z',
      },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/orders') {
        return Promise.resolve({
          data: {
            content: mockOrders,
            page: 0,
            size: 20,
            totalElements: 2,
            totalPages: 1,
          },
        });
      }
      if (url === '/clients') {
        return Promise.resolve({ data: [{ id: 'c-1', name: 'Farmácia DrogaRaia' }] });
      }
      if (url === '/motoboys') {
        return Promise.resolve({ data: [{ id: 'm-1', name: 'Carlos Moto' }] });
      }
      return Promise.resolve({ data: [] });
    });

    // Act
    render(<OrdersScreen />);

    // Assert rows and filters
    expect(await screen.findByText(/#1001/i)).toBeInTheDocument();
    expect(screen.getByText(/#1026/i)).toBeInTheDocument();

    await waitFor(() => {
      const row1 = screen.getByTestId('order-row-0');
      const row2 = screen.getByTestId('order-row-1');
      expect(row1.className).toContain('bg-white');
      expect(row2.className).toContain('bg-slate-100');
    });

    // Click the 3-dots action button on #1026 (where requesterName is undefined)
    const actionsBtn2 = screen.getByTestId('order-actions-trigger-1');
    await userEvent.click(actionsBtn2);

    const editBtn = await screen.findByText('Editar Pedido');
    await userEvent.click(editBtn);

    // Assert modal shows Solicitante empty (NOT filled with Rodrigo) and Atendente filled with Rodrigo (Master)
    const solicitanteInput = screen.getByLabelText(/Nome do Solicitante/i) as HTMLInputElement;
    const atendenteInput = screen.getByLabelText(/Atendente/i) as HTMLInputElement;
    expect(solicitanteInput.value).toBe('');
    expect(atendenteInput.value).toBe('Rodrigo (Master)');
  });

  it('should allow selecting multiple orders only with the same status and execute batch status change sequentially one by one', async () => {
    const mockOrders = [
      {
        id: 'ord-p1',
        orderNumber: 1001,
        clientId: 'c-1',
        clientName: 'Cliente 1',
        motoboyId: 'm-1',
        motoboyName: 'Moto 1',
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo',
        originAddress: { street: 'Rua A', number: '1', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua B', number: '2', city: 'BH', state: 'MG' },
        routeDistanceKm: 5,
        amount: 25,
        motoboyCommissionAmount: 20,
        status: 'PENDENTE',
        createdAt: '2026-10-29T10:00:00Z',
        updatedAt: '2026-10-29T10:00:00Z',
      },
      {
        id: 'ord-p2',
        orderNumber: 1002,
        clientId: 'c-1',
        clientName: 'Cliente 1',
        motoboyId: 'm-1',
        motoboyName: 'Moto 1',
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo',
        originAddress: { street: 'Rua A', number: '1', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua C', number: '3', city: 'BH', state: 'MG' },
        routeDistanceKm: 6,
        amount: 30,
        motoboyCommissionAmount: 24,
        status: 'PENDENTE',
        createdAt: '2026-10-29T11:00:00Z',
        updatedAt: '2026-10-29T11:00:00Z',
      },
      {
        id: 'ord-c1',
        orderNumber: 1003,
        clientId: 'c-2',
        clientName: 'Cliente 2',
        motoboyId: 'm-2',
        motoboyName: 'Moto 2',
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo',
        originAddress: { street: 'Rua D', number: '4', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua E', number: '5', city: 'BH', state: 'MG' },
        routeDistanceKm: 4,
        amount: 20,
        motoboyCommissionAmount: 16,
        status: 'COLETADO',
        createdAt: '2026-10-29T12:00:00Z',
        updatedAt: '2026-10-29T12:00:00Z',
      },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/orders') {
        return Promise.resolve({
          data: {
            content: mockOrders,
            page: 0,
            size: 20,
            totalElements: 3,
            totalPages: 1,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    (api.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    render(<OrdersScreen />);

    expect(await screen.findByText('#1001')).toBeInTheDocument();

    const checkboxP1 = screen.getByTestId('select-order-ord-p1') as HTMLInputElement;
    const checkboxP2 = screen.getByTestId('select-order-ord-p2') as HTMLInputElement;
    const checkboxC1 = screen.getByTestId('select-order-ord-c1') as HTMLInputElement;

    // Initially all checkboxes are enabled
    expect(checkboxP1.disabled).toBe(false);
    expect(checkboxP2.disabled).toBe(false);
    expect(checkboxC1.disabled).toBe(false);

    // Select first PENDENTE order (#1001)
    await userEvent.click(checkboxP1);

    // Now the COLETADO order (#1003) checkbox MUST be disabled, while the other PENDENTE order (#1002) remains enabled!
    expect(checkboxP1.checked).toBe(true);
    expect(checkboxP2.disabled).toBe(false);
    expect(checkboxC1.disabled).toBe(true);

    // Select second PENDENTE order (#1002)
    await userEvent.click(checkboxP2);
    expect(checkboxP2.checked).toBe(true);

    // Click batch action button "Marcar como Coletado (Lote)"
    const batchColetadoBtn = screen.getByRole('button', { name: /Marcar como Coletado \(Lote\)/i });
    await userEvent.click(batchColetadoBtn);

    // Verify individual sequential PATCH calls were made for ord-p1 and ord-p2
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(2);
      expect(api.patch).toHaveBeenNthCalledWith(1, '/orders/ord-p1/status', { status: 'COLETADO' });
      expect(api.patch).toHaveBeenNthCalledWith(2, '/orders/ord-p2/status', { status: 'COLETADO' });
    });
  });

  it('should allow marking an ENTREGUE order as PAGO individually via actions menu and in batch', async () => {
    const mockOrders = [
      {
        id: 'ord-e1',
        orderNumber: 2001,
        clientId: 'c-1',
        clientName: 'Cliente 1',
        motoboyId: 'm-1',
        motoboyName: 'Moto 1',
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo',
        originAddress: { street: 'Rua A', number: '1', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua B', number: '2', city: 'BH', state: 'MG' },
        routeDistanceKm: 5,
        amount: 25,
        motoboyCommissionAmount: 20,
        status: 'ENTREGUE',
        createdAt: '2026-10-29T10:00:00Z',
        updatedAt: '2026-10-29T10:00:00Z',
      },
      {
        id: 'ord-e2',
        orderNumber: 2002,
        clientId: 'c-1',
        clientName: 'Cliente 1',
        motoboyId: 'm-1',
        motoboyName: 'Moto 1',
        createdByUserId: 'u-1',
        createdByUserName: 'Rodrigo',
        originAddress: { street: 'Rua A', number: '1', city: 'BH', state: 'MG' },
        destinationAddress: { street: 'Rua C', number: '3', city: 'BH', state: 'MG' },
        routeDistanceKm: 6,
        amount: 30,
        motoboyCommissionAmount: 24,
        status: 'ENTREGUE',
        createdAt: '2026-10-29T11:00:00Z',
        updatedAt: '2026-10-29T11:00:00Z',
      },
    ];

    (api.get as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/orders') {
        return Promise.resolve({
          data: {
            content: mockOrders,
            page: 0,
            size: 20,
            totalElements: 2,
            totalPages: 1,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    (api.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    render(<OrdersScreen />);

    expect(await screen.findByText('#2001')).toBeInTheDocument();

    // 1. Individual action via 3-dots menu on #2001
    const actionsBtn0 = screen.getByTestId('order-actions-trigger-0');
    await userEvent.click(actionsBtn0);

    const markPaidBtn = await screen.findByRole('button', { name: /Marcar como Pago/i });
    await userEvent.click(markPaidBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/orders/ord-e1/status', { status: 'PAGO' });
    });

    // 2. Batch action on ENTREGUE orders (#2001 and #2002)
    vi.mocked(api.patch).mockClear();

    const checkboxE1 = screen.getByTestId('select-order-ord-e1');
    const checkboxE2 = screen.getByTestId('select-order-ord-e2');
    await userEvent.click(checkboxE1);
    await userEvent.click(checkboxE2);

    const batchPaidBtn = screen.getByRole('button', { name: /Marcar como Pago \(Lote\)/i });
    await userEvent.click(batchPaidBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(2);
      expect(api.patch).toHaveBeenNthCalledWith(1, '/orders/ord-e1/status', { status: 'PAGO' });
      expect(api.patch).toHaveBeenNthCalledWith(2, '/orders/ord-e2/status', { status: 'PAGO' });
    });
  });
});
