import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  CheckCircle2,
  Truck,
  XCircle,
  MoreVertical,
  CheckSquare,
  DollarSign,
} from 'lucide-react';
import {
  ClientDTO,
  MotoboyDTO,
  OrderDTO,
  OrderStatus,
  PagedResponse,
} from '../../shared/types/domain.types';
import { api, formatCurrency, formatDateTime } from '../../shared/services/api';
import { OrderFormModal } from './components/OrderFormModal';

const STATUS_BADGE: Record<OrderStatus, { label: string; classes: string }> = {
  PENDENTE: { label: 'Pendente', classes: 'bg-amber-100 text-amber-800' },
  COLETADO: { label: 'Coletado', classes: 'bg-blue-100 text-blue-800' },
  ENTREGUE: { label: 'Entregue', classes: 'bg-emerald-100 text-emerald-800' },
  AGUARDANDO_PAGAMENTO: {
    label: 'Aguard. Pagto',
    classes: 'bg-purple-100 text-purple-800',
  },
  PAGO: { label: 'Pago', classes: 'bg-green-200 text-green-900' },
  CANCELADO: { label: 'Cancelado', classes: 'bg-red-100 text-red-700' },
};

export const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [motoboys, setMotoboys] = useState<MotoboyDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters: Dates, Client, Motoboy, Status
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedMotoboyId, setSelectedMotoboyId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Pagination: 20 per page
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 20;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderDTO | null>(null);

  // 3-dots Action Menu state
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  // Batch Selection state (strictly locks to the status of the first selected order)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const lockedBatchStatus = useMemo<OrderStatus | null>(() => {
    if (selectedOrderIds.length === 0) return null;
    const firstSelected = orders.find((o) => selectedOrderIds.includes(o.id));
    return firstSelected?.status ?? null;
  }, [orders, selectedOrderIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuOrderId(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenMenuOrderId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  const loadAuxData = useCallback(async () => {
    const [clientsRes, motoboysRes] = await Promise.allSettled([
      api.get<ClientDTO[]>('/clients'),
      api.get<MotoboyDTO[]>('/motoboys'),
    ]);
    if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value.data)) {
      setClients(clientsRes.value.data);
    }
    if (motoboysRes.status === 'fulfilled' && Array.isArray(motoboysRes.value.data)) {
      setMotoboys(motoboysRes.value.data);
    }
  }, []);

  const loadOrders = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: targetPage,
          size: PAGE_SIZE,
        };
        if (startDate) params.startDate = new Date(`${startDate}T00:00:00`).toISOString();
        if (endDate) params.endDate = new Date(`${endDate}T23:59:59`).toISOString();
        if (selectedClientId) params.clientId = selectedClientId;
        if (selectedMotoboyId) params.motoboyId = selectedMotoboyId;
        if (selectedStatus) params.status = selectedStatus;

        const res = await api.get<PagedResponse<OrderDTO>>('/orders', { params });
        setOrders(res.data.content || []);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
      } finally {
        setLoading(false);
      }
    },
    [page, startDate, endDate, selectedClientId, selectedMotoboyId, selectedStatus]
  );

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    setSelectedOrderIds([]);
    loadOrders(0);
  }, [startDate, endDate, selectedClientId, selectedMotoboyId, selectedStatus]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setOpenMenuOrderId(null);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      loadOrders(page);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao alterar status do pedido.');
    }
  };

  const toggleSelectOrder = (order: OrderDTO) => {
    setSelectedOrderIds((prev) => {
      if (prev.includes(order.id)) {
        return prev.filter((id) => id !== order.id);
      }
      if (lockedBatchStatus && order.status !== lockedBatchStatus) {
        return prev;
      }
      return [...prev, order.id];
    });
  };

  const handleToggleSelectAllSameStatus = () => {
    const targetStatus: OrderStatus | undefined =
      lockedBatchStatus || (selectedStatus as OrderStatus) || orders[0]?.status;
    if (!targetStatus) return;

    const matchingIds = orders.filter((o) => o.status === targetStatus).map((o) => o.id);
    const allSelected =
      matchingIds.length > 0 && matchingIds.every((id) => selectedOrderIds.includes(id));

    if (allSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(matchingIds);
    }
  };

  // Executes status transition sequentially one by one via PATCH /orders/{id}/status without changing the backend
  const handleBatchStatusChange = async (nextStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0 || batchProcessing) return;
    setBatchProcessing(true);
    try {
      for (const orderId of selectedOrderIds) {
        await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      }
      setSelectedOrderIds([]);
      await loadOrders(page);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          'Erro ao processar alteração em lote de alguns pedidos.'
      );
      await loadOrders(page);
    } finally {
      setBatchProcessing(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedClientId('');
    setSelectedMotoboyId('');
    setSelectedStatus('');
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar (Dates, Client, Motoboy, Status + New Order Button) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1 min-w-0 w-full">
            <div>
              <label
                htmlFor="filter-start-date"
                className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
              >
                Data Inicial
              </label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D92D3A]"
              />
            </div>

            <div>
              <label
                htmlFor="filter-end-date"
                className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
              >
                Data Final
              </label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D92D3A]"
              />
            </div>

            <div>
              <label
                htmlFor="filter-client"
                className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
              >
                Cliente
              </label>
              <select
                id="filter-client"
                value={selectedClientId}
                onFocus={() => {
                  if (clients.length === 0) loadAuxData();
                }}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#D92D3A]"
              >
                <option value="">Todos os clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-motoboy"
                className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
              >
                Motoboy
              </label>
              <select
                id="filter-motoboy"
                value={selectedMotoboyId}
                onFocus={() => {
                  if (motoboys.length === 0) loadAuxData();
                }}
                onChange={(e) => setSelectedMotoboyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#D92D3A]"
              >
                <option value="">Todos os motoboys</option>
                {motoboys.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="filter-status"
                className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
              >
                Status
              </label>
              <select
                id="filter-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#D92D3A]"
              >
                <option value="">Todos os status</option>
                <option value="PENDENTE">Pendente</option>
                <option value="COLETADO">Coletado</option>
                <option value="ENTREGUE">Entregue</option>
                <option value="AGUARDANDO_PAGAMENTO">Aguardando Pagamento</option>
                <option value="PAGO">Pago</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={clearFilters}
              className="px-3.5 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                loadAuxData();
                loadOrders(page);
              }}
              className="p-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingOrder(null);
                setModalOpen(true);
              }}
              className="flex-1 sm:flex-initial justify-center px-5 py-2.5 rounded-full bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo
            </button>
          </div>
        </div>
      </div>

      {/* Batch Action Bar (visible when 1+ orders with the same status are selected) */}
      {selectedOrderIds.length > 0 && lockedBatchStatus && (
        <div className="bg-slate-900 text-white rounded-2xl px-5 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <CheckSquare className="w-4 h-4 text-[#D92D3A]" />
            <span>
              <strong>{selectedOrderIds.length}</strong> pedido(s) selecionado(s) no status{' '}
              <span className="px-2 py-0.5 rounded-full bg-white/15 font-bold uppercase">
                {STATUS_BADGE[lockedBatchStatus]?.label || lockedBatchStatus}
              </span>
            </span>
            <span className="text-slate-400 hidden md:inline">
              (Apenas pedidos com este mesmo status podem ser selecionados juntos)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lockedBatchStatus === 'PENDENTE' && (
              <button
                type="button"
                disabled={batchProcessing}
                onClick={() => handleBatchStatusChange('COLETADO')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Truck className="w-3.5 h-3.5" />
                Marcar como Coletado (Lote)
              </button>
            )}

            {(lockedBatchStatus === 'PENDENTE' || lockedBatchStatus === 'COLETADO') && (
              <button
                type="button"
                disabled={batchProcessing}
                onClick={() => handleBatchStatusChange('ENTREGUE')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmar Entrega (Lote)
              </button>
            )}

            {(lockedBatchStatus === 'ENTREGUE' ||
              lockedBatchStatus === 'AGUARDANDO_PAGAMENTO') && (
              <button
                type="button"
                disabled={batchProcessing}
                onClick={() => handleBatchStatusChange('PAGO')}
                className="px-3.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Marcar como Pago (Lote)
              </button>
            )}

            {(lockedBatchStatus === 'PENDENTE' ||
              lockedBatchStatus === 'COLETADO' ||
              lockedBatchStatus === 'ENTREGUE') && (
              <button
                type="button"
                disabled={batchProcessing}
                onClick={() => handleBatchStatusChange('CANCELADO')}
                className="px-3.5 py-1.5 rounded-xl bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancelar Selecionados (Lote)
              </button>
            )}

            <button
              type="button"
              disabled={batchProcessing}
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Limpar Seleção
            </button>
          </div>
        </div>
      )}

      {/* Orders Table (20 rows per page, alternating white and gray rows, horizontally scrollable on mobile/tablet) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[920px] text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Selecionar pedidos do mesmo status"
                    title="Selecionar todos os pedidos do mesmo status nesta página"
                    checked={
                      orders.length > 0 &&
                      lockedBatchStatus !== null &&
                      orders
                        .filter((o) => o.status === lockedBatchStatus)
                        .every((o) => selectedOrderIds.includes(o.id))
                    }
                    onChange={handleToggleSelectAllSameStatus}
                    className="rounded border-slate-300 text-[#D92D3A] focus:ring-[#D92D3A] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3 w-14">Nº</th>
                <th className="py-3.5 px-3 w-28">Data</th>
                <th className="py-3.5 px-3 w-36">Cliente</th>
                <th className="py-3.5 px-3 w-28">Solicitante</th>
                <th className="py-3.5 px-3 w-28">Atendente</th>
                <th className="py-3.5 px-3 w-32">Motoboy</th>
                <th className="py-3.5 px-3">Descrição / Rota</th>
                <th className="py-3.5 px-3 w-20">Valor</th>
                <th className="py-3.5 px-3 w-20">Repasse</th>
                <th className="py-3.5 px-3 w-28">Status</th>
                <th className="py-3.5 px-3 w-14 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      <Search className="w-5 h-5 text-slate-400 animate-pulse" />
                      Buscando informações ..
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-14 text-center text-slate-400">
                    Nenhum pedido encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => {
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-100';
                  const badge = STATUS_BADGE[order.status] || {
                    label: order.status,
                    classes: 'bg-slate-100 text-slate-700',
                  };
                  const destText = order.destinationAddress
                    ? `ENTREGA de ${order.destinationAddress.street}, ${order.destinationAddress.number} - ${
                        order.destinationAddress.neighborhood || order.destinationAddress.city
                      }`
                    : '-';
                  const isMenuOpen = openMenuOrderId === order.id;
                  const isSelected = selectedOrderIds.includes(order.id);
                  const isDisabledByStatusLock =
                    batchProcessing ||
                    (lockedBatchStatus !== null && order.status !== lockedBatchStatus);

                  return (
                    <tr
                      key={order.id}
                      data-testid={`order-row-${idx}`}
                      className={`${rowBg} border-b border-slate-100 hover:bg-red-50/30 transition-colors`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          data-testid={`select-order-${order.id}`}
                          aria-label={`Selecionar pedido #${order.orderNumber}`}
                          checked={isSelected}
                          disabled={isDisabledByStatusLock}
                          onChange={() => toggleSelectOrder(order)}
                          title={
                            isDisabledByStatusLock && lockedBatchStatus
                              ? `Apenas pedidos com status ${lockedBatchStatus} podem ser selecionados neste lote`
                              : `Selecionar pedido #${order.orderNumber}`
                          }
                          className="rounded border-slate-300 text-[#D92D3A] focus:ring-[#D92D3A] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 truncate">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td
                        className="py-3 px-3 font-semibold text-slate-800 truncate"
                        title={order.clientName}
                      >
                        {order.clientName}
                      </td>
                      <td
                        className="py-3 px-3 text-slate-700 truncate"
                        title={order.requesterName || '-'}
                      >
                        {order.requesterName || '-'}
                      </td>
                      <td
                        className="py-3 px-3 text-slate-500 truncate"
                        title={order.createdByUserName || '-'}
                      >
                        {order.createdByUserName || '-'}
                      </td>
                      <td
                        className="py-3 px-3 text-slate-700 truncate"
                        title={order.motoboyName}
                      >
                        {order.motoboyName}
                      </td>
                      <td className="py-3 px-3 truncate" title={destText}>
                        {destText} ({order.routeDistanceKm} km)
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-blue-600 whitespace-nowrap">
                        {formatCurrency(order.motoboyCommissionAmount)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold truncate ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center relative">
                        <div
                          ref={isMenuOpen ? menuContainerRef : undefined}
                          className="inline-block relative"
                        >
                          <button
                            type="button"
                            data-testid={`order-actions-trigger-${idx}`}
                            aria-label="Abrir ações do pedido"
                            onClick={(e) => {
                              if (openMenuOrderId === order.id) {
                                setOpenMenuOrderId(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 160;
                              const openUpwards =
                                window.innerHeight > 0 &&
                                rect.bottom + menuHeight + 12 > window.innerHeight &&
                                rect.top > menuHeight;
                              setMenuPosition({
                                top: openUpwards ? rect.top - menuHeight - 6 : rect.bottom + 6,
                                right: Math.max(12, window.innerWidth - rect.right),
                              });
                              setOpenMenuOrderId(order.id);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              style={{
                                top: `${menuPosition.top}px`,
                                right: `${menuPosition.right}px`,
                              }}
                              className="fixed w-48 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-[100] text-left"
                            >
                              {order.status === 'PENDENTE' && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(order.id, 'COLETADO')}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Truck className="w-4 h-4 shrink-0" />
                                  <span>Marcar como Coletado</span>
                                </button>
                              )}

                              {(order.status === 'PENDENTE' ||
                                order.status === 'COLETADO') && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(order.id, 'ENTREGUE')}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span>Confirmar Entrega</span>
                                </button>
                              )}

                              {(order.status === 'ENTREGUE' ||
                                order.status === 'AGUARDANDO_PAGAMENTO') && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(order.id, 'PAGO')}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 flex items-center gap-2.5 cursor-pointer"
                                >
                                  <DollarSign className="w-4 h-4 shrink-0" />
                                  <span>Marcar como Pago</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuOrderId(null);
                                  setEditingOrder(order);
                                  setModalOpen(true);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4 shrink-0 text-slate-500" />
                                <span>Editar Pedido</span>
                              </button>

                              {(order.status === 'PENDENTE' ||
                                order.status === 'COLETADO' ||
                                order.status === 'ENTREGUE') &&
                                !order.paymentOrderId && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(order.id, 'CANCELADO')}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100 mt-1 pt-2 cursor-pointer"
                                  >
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    <span>Cancelar Pedido</span>
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (20 per page) */}
        <div className="px-3.5 sm:px-5 py-3.5 bg-white border-t border-slate-200 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="text-center sm:text-left">
            Mostrando <span className="font-bold">{orders.length}</span> de{' '}
            <span className="font-bold">{totalElements}</span> pedidos (Limite: {PAGE_SIZE} por
            página)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => loadOrders(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span className="font-semibold">
              Página {page + 1} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => loadOrders(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <OrderFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => loadOrders(page)}
        clients={clients}
        motoboys={motoboys}
        editingOrder={editingOrder}
      />
    </div>
  );
};
