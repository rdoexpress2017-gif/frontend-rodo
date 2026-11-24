import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  User,
  ListOrdered,
  PiggyBank,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  ArrowUpDown,
  Clock,
} from 'lucide-react';
import {
  ExpenseDTO,
  FinancialSummaryDTO,
  OrderDTO,
  PagedResponse,
  PaymentOrderDTO,
} from '../../shared/types/domain.types';
import { api, formatCurrency, formatDateShort } from '../../shared/services/api';

type FinancialSortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

const toInputDate = (iso?: string | null): string => {
  if (!iso) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toTimestamp = (iso?: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export const FinancialScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RDO' | 'LANCAMENTOS' | 'CAIXA'>('RDO');
  const [hideValues, setHideValues] = useState(false);

  // Shared period filters & sorting across all 3 Financial tabs (RDO, Lançamentos, Caixa)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOption, setSortOption] = useState<FinancialSortOption>('DATE_DESC');

  const [summary, setSummary] = useState<FinancialSummaryDTO>({
    totalRevenue: 0,
    totalCommissions: 0,
    companyShare: 0,
    totalExpenses: 0,
    collaboratorShare: 0,
    totalOrders: 0,
    netBalance: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    paidCommissions: 0,
    paidOrdersCount: 0,
    pendingOrdersCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<OrderDTO[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrderDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Lançamento Modal state (Create / Edit)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDTO | null>(null);
  const [expenseDateInput, setExpenseDateInput] = useState(() => toInputDate());
  const [expenseAmountInput, setExpenseAmountInput] = useState('');
  const [expenseDescriptionInput, setExpenseDescriptionInput] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const periodParams: Record<string, string> = {};
      if (startDate) {
        periodParams.startDate = new Date(`${startDate}T00:00:00`).toISOString();
      }
      if (endDate) {
        periodParams.endDate = new Date(`${endDate}T23:59:59`).toISOString();
      }

      const [sumRes, ordersRes, expRes, poRes] = await Promise.allSettled([
        api.get<FinancialSummaryDTO>('/orders/summary', { params: periodParams }),
        api.get<PagedResponse<OrderDTO>>('/orders', {
          params: { ...periodParams, page: 0, size: 100 },
        }),
        api.get<ExpenseDTO[]>('/expenses', { params: periodParams }),
        api.get<PaymentOrderDTO[]>('/payment-orders'),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data) {
        setSummary(sumRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        setRecentOrders(ordersRes.value.data.content || []);
      }
      if (expRes.status === 'fulfilled' && Array.isArray(expRes.value.data)) {
        setExpenses(expRes.value.data);
      }
      if (poRes.status === 'fulfilled' && Array.isArray(poRes.value.data)) {
        setPaymentOrders(poRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const handleSettlePaymentOrder = async (poId: string) => {
    try {
      await api.patch(`/payment-orders/${poId}/settle`);
      await loadFinancialData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao dar baixa na Ordem de Pagamento.');
    }
  };

  const openCreateExpenseModal = () => {
    setEditingExpense(null);
    setExpenseDateInput(toInputDate());
    setExpenseAmountInput('');
    setExpenseDescriptionInput('');
    setExpenseModalOpen(true);
  };

  const openEditExpenseModal = (expense: ExpenseDTO) => {
    setEditingExpense(expense);
    setExpenseDateInput(toInputDate(expense.expenseDate));
    setExpenseAmountInput(String(expense.amount));
    setExpenseDescriptionInput(expense.description);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(expenseAmountInput.replace(',', '.'));
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    setSavingExpense(true);
    try {
      const payload = {
        expenseDate: new Date(`${expenseDateInput}T12:00:00`).toISOString(),
        amount: numericAmount,
        description: expenseDescriptionInput.trim(),
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }

      setExpenseModalOpen(false);
      await loadFinancialData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao salvar lançamento.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: ExpenseDTO) => {
    try {
      await api.delete(`/expenses/${expense.id}`);
      await loadFinancialData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao excluir lançamento.');
    }
  };

  const toggleDateSort = () => {
    setSortOption((prev) => (prev === 'DATE_DESC' ? 'DATE_ASC' : 'DATE_DESC'));
  };

  const toggleAmountSort = () => {
    setSortOption((prev) => (prev === 'AMOUNT_DESC' ? 'AMOUNT_ASC' : 'AMOUNT_DESC'));
  };

  const maskValue = (val: string) => (hideValues ? 'R$ •••••' : val);

  const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

  const sortedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = recentOrders.filter((o) => {
      if (!q) return true;
      return (
        o.clientName?.toLowerCase().includes(q) ||
        o.destinationAddress?.street?.toLowerCase().includes(q) ||
        String(o.orderNumber).includes(q) ||
        formatDateShort(o.createdAt).toLowerCase().includes(q) ||
        String(o.amount).includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === 'DATE_DESC') return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      if (sortOption === 'DATE_ASC') return toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      if (sortOption === 'AMOUNT_DESC') return (b.amount || 0) - (a.amount || 0);
      return (a.amount || 0) - (b.amount || 0);
    });
  }, [recentOrders, searchQuery, sortOption]);

  const sortedExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = expenses.filter((exp) => {
      const ts = toTimestamp(exp.expenseDate);
      if (startMs !== null && ts < startMs) return false;
      if (endMs !== null && ts > endMs) return false;
      if (!q) return true;
      return (
        exp.description?.toLowerCase().includes(q) ||
        exp.id?.toLowerCase().includes(q) ||
        formatDateShort(exp.expenseDate).toLowerCase().includes(q) ||
        String(exp.amount).includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === 'DATE_DESC') return toTimestamp(b.expenseDate) - toTimestamp(a.expenseDate);
      if (sortOption === 'DATE_ASC') return toTimestamp(a.expenseDate) - toTimestamp(b.expenseDate);
      if (sortOption === 'AMOUNT_DESC') return (b.amount || 0) - (a.amount || 0);
      return (a.amount || 0) - (b.amount || 0);
    });
  }, [expenses, searchQuery, sortOption, startMs, endMs]);

  const sortedPaymentOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = paymentOrders.filter((po) => {
      const ts = toTimestamp(po.issueDate || po.createdAt);
      if (startMs !== null && ts < startMs) return false;
      if (endMs !== null && ts > endMs) return false;
      if (!q) return true;
      return (
        po.clientName?.toLowerCase().includes(q) ||
        po.status?.toLowerCase().includes(q) ||
        formatDateShort(po.issueDate).toLowerCase().includes(q) ||
        String(po.totalAmount).includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const dateA = toTimestamp(a.issueDate || a.createdAt);
      const dateB = toTimestamp(b.issueDate || b.createdAt);
      if (sortOption === 'DATE_DESC') return dateB - dateA;
      if (sortOption === 'DATE_ASC') return dateA - dateB;
      if (sortOption === 'AMOUNT_DESC') return (b.totalAmount || 0) - (a.totalAmount || 0);
      return (a.totalAmount || 0) - (b.totalAmount || 0);
    });
  }, [paymentOrders, searchQuery, sortOption, startMs, endMs]);

  const totalDespesasLancamentos = summary.totalExpenses ?? summary.companyShare ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-6 space-y-4 sm:space-y-6">
      {/* Top Tabs: RDO | Lançamentos | Caixa (Ordens de Pagamento) */}
      <div className="grid grid-cols-3 rounded-xl bg-red-50/40 overflow-hidden border border-red-100/60">
        <button
          type="button"
          onClick={() => setActiveTab('RDO')}
          className={`py-2.5 sm:py-3 px-1.5 text-[11px] sm:text-xs font-bold tracking-wide transition cursor-pointer ${
            activeTab === 'RDO'
              ? 'text-[#D92D3A] border-b-2 border-[#D92D3A] bg-red-50/60'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          RDO
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('LANCAMENTOS')}
          className={`py-2.5 sm:py-3 px-1.5 text-[11px] sm:text-xs font-bold tracking-wide transition cursor-pointer ${
            activeTab === 'LANCAMENTOS'
              ? 'text-[#D92D3A] border-b-2 border-[#D92D3A] bg-red-50/60'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Lançamentos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CAIXA')}
          className={`py-2.5 sm:py-3 px-1.5 text-[11px] sm:text-xs font-bold tracking-wide transition cursor-pointer truncate ${
            activeTab === 'CAIXA'
              ? 'text-[#D92D3A] border-b-2 border-[#D92D3A] bg-red-50/60'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Caixa (Ordens de Pagamento)
        </button>
      </div>

      {/* Period Filter & Sorting Bar across ALL 3 Financial Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3 w-full lg:w-auto flex-1">
          <div>
            <label
              htmlFor="fin-start-date"
              className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
            >
              Data Inicial
            </label>
            <input
              id="fin-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D92D3A]"
            />
          </div>

          <div>
            <label
              htmlFor="fin-end-date"
              className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
            >
              Data Final
            </label>
            <input
              id="fin-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D92D3A]"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label
              htmlFor="fin-sort-select"
              className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
            >
              Ordenar por
            </label>
            <select
              id="fin-sort-select"
              aria-label="Ordenar financeiro por"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as FinancialSortOption)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D92D3A]"
            >
              <option value="DATE_DESC">Data (Mais recente ↓)</option>
              <option value="DATE_ASC">Data (Mais antiga ↑)</option>
              <option value="AMOUNT_DESC">Valor (Maior ↓)</option>
              <option value="AMOUNT_ASC">Valor (Menor ↑)</option>
            </select>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => loadFinancialData()}
            className="px-4 py-2 rounded-xl bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Calcular
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Limpar Período
            </button>
          )}
        </div>

        {activeTab === 'LANCAMENTOS' && (
          <button
            type="button"
            onClick={openCreateExpenseModal}
            className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-full bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        )}
      </div>

      {/* RESUMO GERAL Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
          RESUMO GERAL
        </h2>
        <button
          type="button"
          onClick={() => setHideValues((prev) => !prev)}
          className="text-slate-700 hover:text-slate-900 cursor-pointer"
          title="Ocultar ou exibir valores"
        >
          {hideValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Summary Cards: Total Pedidos, Já Recebido (Pagos), A Receber (Não Pagos), Repasses, Despesas, Colaborador, Registros, Lucro (Somente Pagos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Receitas
            </p>
            <p className="text-base font-extrabold text-slate-900">
              {maskValue(formatCurrency(summary.totalRevenue))}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              Valor total de pedidos ({summary.totalOrders})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
          <div className="w-11 h-11 rounded-2xl bg-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
              Já Recebido
            </p>
            <p className="text-base font-extrabold text-emerald-800">
              {maskValue(formatCurrency(summary.paidRevenue ?? 0))}
            </p>
            <p className="text-[11px] font-bold text-emerald-700">
              {summary.paidOrdersCount ?? 0} pagos em caixa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="w-11 h-11 rounded-2xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
              A Receber
            </p>
            <p className="text-base font-extrabold text-amber-800">
              {maskValue(formatCurrency(summary.pendingRevenue ?? 0))}
            </p>
            <p className="text-[11px] font-bold text-amber-800">
              {summary.pendingOrdersCount ?? 0} a receber (não pagos)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Lucro</p>
            <p className="text-base font-extrabold text-slate-900">
              {maskValue(formatCurrency(summary.netBalance))}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              Somente sobre pedidos pagos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 text-[#D92D3A] flex items-center justify-center shrink-0">
            <ArrowUpCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Repasses
            </p>
            <p className="text-base font-extrabold text-slate-900">
              {maskValue(formatCurrency(summary.totalCommissions))}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              Pagos: {maskValue(formatCurrency(summary.paidCommissions ?? 0))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Despesas
            </p>
            <p className="text-base font-extrabold text-purple-700">
              {maskValue(formatCurrency(totalDespesasLancamentos))}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              Lançamentos do período
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Colaborador
            </p>
            <p className="text-base font-extrabold text-blue-600">
              {maskValue(formatCurrency(summary.collaboratorShare))}
            </p>
            <p className="text-[11px] font-semibold text-slate-500">
              Comissão motoboys
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Registros
            </p>
            <p className="text-base font-extrabold text-amber-800">{summary.totalOrders}</p>
            <p className="text-[11px] font-semibold text-slate-600">
              {summary.paidOrdersCount ?? 0} pagos • {summary.pendingOrdersCount ?? 0} pendentes
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar & Refresh */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por data, descrição, cliente ou valor..."
          className="px-4 py-2 rounded-full border border-slate-300 text-xs font-semibold text-slate-800 flex-1 sm:flex-initial sm:w-72 focus:outline-none focus:border-[#D92D3A]"
        />
        <button
          type="button"
          onClick={loadFinancialData}
          className="p-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          title="Recarregar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab 1: RDO (Últimos Pedidos) */}
      {activeTab === 'RDO' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={toggleDateSort}
                    className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                  >
                    DATA
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">DESCRIÇÃO</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={toggleAmountSort}
                    className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                  >
                    VALOR
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">TIPO / STATUS</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    Nenhum pedido encontrado no período selecionado.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                    } border-b border-slate-100`}
                  >
                    <td className="py-3.5 px-4">{formatDateShort(order.createdAt)}</td>
                    <td className="py-3.5 px-4 font-medium">
                      ENTREGA de {order.destinationAddress?.street},{' '}
                      {order.destinationAddress?.number} ,{' '}
                      {order.destinationAddress?.neighborhood || order.destinationAddress?.city} (
                      {order.clientName})
                    </td>
                    <td className="py-3.5 px-4 font-bold">{formatCurrency(order.amount)}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Lançamentos (Company Expenses) */}
      {activeTab === 'LANCAMENTOS' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={toggleDateSort}
                    className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                  >
                    Data do Lançamento
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">Descrição do Gasto</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={toggleAmountSort}
                    className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                  >
                    Valor Gasto
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Nenhum lançamento de despesa registrado no período selecionado.
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((exp, idx) => (
                  <tr
                    key={exp.id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                    } border-b border-slate-100`}
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      #{exp.id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 font-medium">{formatDateShort(exp.expenseDate)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{exp.description}</td>
                    <td className="py-3.5 px-4 font-extrabold text-[#D92D3A]">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditExpenseModal(exp)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          title="Editar lançamento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1.5 rounded-lg border border-red-200 text-[#D92D3A] hover:bg-red-50 cursor-pointer"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Caixa (Ordens de Pagamento) */}
      {activeTab === 'CAIXA' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={toggleDateSort}
                    className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                  >
                    Emissão
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Qtd. Pedidos</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={toggleAmountSort}
                    className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                  >
                    Valor Total
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-4">Status da OP</th>
                <th className="py-3 px-4 text-right">Baixa em Cascata</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-700">
              {sortedPaymentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Nenhuma Ordem de Pagamento encontrada no período selecionado.
                  </td>
                </tr>
              ) : (
                sortedPaymentOrders.map((po, idx) => (
                  <tr
                    key={po.id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                    } border-b border-slate-100`}
                  >
                    <td className="py-3.5 px-4">{formatDateShort(po.issueDate)}</td>
                    <td className="py-3.5 px-4 font-bold">{po.clientName}</td>
                    <td className="py-3.5 px-4">{po.orderIds?.length || 0} pedidos</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          po.status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {po.status === 'AGUARDANDO_PAGAMENTO' ? (
                        <button
                          type="button"
                          onClick={() => handleSettlePaymentOrder(po.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmar Pagamento (Baixa)
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold">
                          Liquidado em {formatDateShort(po.settledAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Novo / Editar Lançamento */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editingExpense ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="expense-date"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Data do Lançamento *
                </label>
                <input
                  id="expense-date"
                  type="date"
                  required
                  value={expenseDateInput}
                  onChange={(e) => setExpenseDateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-amount"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Valor Gasto (R$) *
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Ex: 120.00"
                  value={expenseAmountInput}
                  onChange={(e) => setExpenseAmountInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-description"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Descrição do Gasto *
                </label>
                <input
                  id="expense-description"
                  type="text"
                  required
                  placeholder="Ex: Gasto com internet do mês, conserto do computador..."
                  value={expenseDescriptionInput}
                  onChange={(e) => setExpenseDescriptionInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-4 py-2 rounded-xl bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingExpense ? 'Salvando...' : 'Salvar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
