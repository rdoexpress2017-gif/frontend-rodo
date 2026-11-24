import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  PlusCircle,
  Eye,
  X,
  FileSpreadsheet,
  Info,
  Users,
  RefreshCw,
  ArrowUpDown,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import {
  ClientDTO,
  MotoboyDTO,
  OrderDTO,
  ReportDTO,
  ReportType,
  SystemSettingsDTO,
} from '../../shared/types/domain.types';
import { api, formatCurrency, formatDateShort, formatDateTime } from '../../shared/services/api';

type MasterSortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';
type ReportSortOption =
  | 'CREATED_DESC'
  | 'CREATED_ASC'
  | 'UPDATED_DESC'
  | 'UPDATED_ASC'
  | 'AMOUNT_DESC'
  | 'AMOUNT_ASC';

const toTimestamp = (iso?: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const formatFullDate = (iso?: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const ReportsScreen: React.FC = () => {
  const [subTab, setSubTab] = useState<'MASTER' | 'CLIENTE' | 'MOTOBOY' | 'EMPRESA'>('MASTER');

  const isMasterProfile = useMemo(() => {
    try {
      const saved = localStorage.getItem('rodo_auth');
      if (!saved) return true;
      const parsed = JSON.parse(saved);
      return parsed?.role ? parsed.role === 'MASTER' : true;
    } catch {
      return true;
    }
  }, []);

  // Master Open Search state
  const [masterOrders, setMasterOrders] = useState<OrderDTO[]>([]);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterMotoboyId, setFilterMotoboyId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [masterSort, setMasterSort] = useState<MasterSortOption>('DATE_DESC');

  // Consolidated Reports state (Clientes / Motoboys)
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [reportFilterStart, setReportFilterStart] = useState('');
  const [reportFilterEnd, setReportFilterEnd] = useState('');
  const [reportSort, setReportSort] = useState<ReportSortOption>('CREATED_DESC');
  const [selectedReport, setSelectedReport] = useState<ReportDTO | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<OrderDTO[]>([]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [openMenuReportId, setOpenMenuReportId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setOpenMenuReportId(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenMenuReportId(null);
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

  // Aux lists & System Settings Commission Percentage
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [motoboys, setMotoboys] = useState<MotoboyDTO[]>([]);
  const [commissionPct, setCommissionPct] = useState<number>(70);

  // Custom Report Modal
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customType, setCustomType] = useState<ReportType>('CLIENTE');
  const [customTargetId, setCustomTargetId] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customGeneratePo, setCustomGeneratePo] = useState(true);

  const loadAuxLists = useCallback(async () => {
    const [cRes, mRes, sRes] = await Promise.allSettled([
      api.get<ClientDTO[]>('/clients'),
      api.get<MotoboyDTO[]>('/motoboys'),
      api.get<SystemSettingsDTO>('/settings'),
    ]);
    if (cRes.status === 'fulfilled' && Array.isArray(cRes.value.data)) {
      setClients(cRes.value.data);
    }
    if (mRes.status === 'fulfilled' && Array.isArray(mRes.value.data)) {
      setMotoboys(mRes.value.data);
    }
    if (
      sRes.status === 'fulfilled' &&
      sRes.value.data?.defaultMotoboyCommissionPercentage != null
    ) {
      setCommissionPct(Number(sRes.value.data.defaultMotoboyCommissionPercentage));
    }
  }, []);

  // Merge API lists with any clients/motoboys present in loaded orders so filters are never empty
  const clientOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    clients.forEach((c) => {
      if (c.id && c.name) map.set(c.id, { id: c.id, name: c.name });
    });
    masterOrders.forEach((o) => {
      if (o.clientId && o.clientName && !map.has(o.clientId)) {
        map.set(o.clientId, { id: o.clientId, name: o.clientName });
      }
    });
    return Array.from(map.values());
  }, [clients, masterOrders]);

  const motoboyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    motoboys.forEach((m) => {
      if (m.id && m.name) map.set(m.id, { id: m.id, name: m.name });
    });
    masterOrders.forEach((o) => {
      if (o.motoboyId && o.motoboyName && !map.has(o.motoboyId)) {
        map.set(o.motoboyId, { id: o.motoboyId, name: o.motoboyName });
      }
    });
    return Array.from(map.values());
  }, [motoboys, masterOrders]);

  const loadMasterOrders = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterStart) params.startDate = new Date(`${filterStart}T00:00:00`).toISOString();
      if (filterEnd) params.endDate = new Date(`${filterEnd}T23:59:59`).toISOString();
      if (filterClientId) params.clientId = filterClientId;
      if (filterMotoboyId) params.motoboyId = filterMotoboyId;
      if (filterStatus) params.status = filterStatus;

      const res = await api.get<OrderDTO[]>('/orders/list', { params });
      setMasterOrders(res.data || []);
    } catch {
      setMasterOrders([]);
    }
  }, [filterStart, filterEnd, filterClientId, filterMotoboyId, filterStatus]);

  const loadReports = useCallback(async () => {
    try {
      const res = await api.get<ReportDTO[]>('/reports', {
        params: {
          type: subTab === 'MASTER' ? undefined : subTab,
        },
      });
      setReports(res.data || []);
    } catch {
      setReports([]);
    }
  }, [subTab]);

  useEffect(() => {
    loadAuxLists();
    if (subTab === 'MASTER') {
      loadMasterOrders();
    } else {
      loadReports();
    }
  }, [subTab, loadAuxLists, loadMasterOrders, loadReports]);

  // Queries orders directly using report.orderIds via GET /orders/by-ids for maximum performance
  const handleOpenDetail = async (report: ReportDTO) => {
    try {
      setSelectedReport(report);
      if (report.orderIds && report.orderIds.length > 0) {
        const res = await api.get<OrderDTO[]>('/orders/by-ids', {
          params: { ids: report.orderIds.join(',') },
        });
        setSelectedOrders(res.data || []);
      } else {
        setSelectedOrders([]);
      }
    } catch {
      alert('Não foi possível carregar os pedidos do relatório.');
    }
  };

  // PDF generation ONLY happens when clicking the "Gerar PDF" button!
  const handleDownloadPdf = async (report: ReportDTO) => {
    setDownloadingPdfId(report.id);
    try {
      const res = await api.get(`/reports/${report.id}/pdf`, {
        responseType: 'blob',
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeName = (report.targetEntityName || report.reportCode || 'RELATORIO')
        .toUpperCase()
        .replace(/\s+/g, '_');
      link.setAttribute('download', `${safeName}_${report.reportCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      alert('Erro ao gerar o PDF do relatório.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleDeleteReport = async (report: ReportDTO) => {
    try {
      await api.delete(`/reports/${report.id}`);
      if (selectedReport?.id === report.id) {
        setSelectedReport(null);
      }
      await loadReports();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao excluir relatório.');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Numero', 'Data', 'Cliente', 'Solicitante', 'Motoboy', 'Km', 'Valor', 'Repasse', 'Status'];
    const rows = masterOrders.map((o) => [
      o.orderNumber,
      formatDateTime(o.createdAt),
      `"${o.clientName || ''}"`,
      `"${o.requesterName || o.createdByUserName || ''}"`,
      `"${o.motoboyName || ''}"`,
      o.routeDistanceKm,
      o.amount,
      o.motoboyCommissionAmount,
      o.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'relatorio-busca-aberta-pedidos.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleCreateCustomReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startIso = new Date(`${customStart}T00:00:00`).toISOString();
      const endIso = new Date(`${customEnd}T23:59:59`).toISOString();
      const res = await api.post<ReportDTO>('/reports/custom', {
        type: customType,
        targetEntityId:
          customType === 'MASTER' || customType === 'EMPRESA' ? null : customTargetId,
        startDate: startIso,
        endDate: endIso,
        generatePaymentOrder: customType === 'CLIENTE' ? customGeneratePo : false,
      });
      setCustomModalOpen(false);
      setSubTab(customType === 'MASTER' ? 'CLIENTE' : customType);
      await loadReports();
      await handleOpenDetail(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao gerar relatório avulso.');
    }
  };

  const sortedMasterOrders = useMemo(() => {
    return [...masterOrders].sort((a, b) => {
      if (masterSort === 'DATE_DESC') return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
      if (masterSort === 'DATE_ASC') return toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
      if (masterSort === 'AMOUNT_DESC') return (b.amount || 0) - (a.amount || 0);
      return (a.amount || 0) - (b.amount || 0);
    });
  }, [masterOrders, masterSort]);

  const sortedAndFilteredReports = useMemo(() => {
    const startMs = reportFilterStart ? new Date(`${reportFilterStart}T00:00:00`).getTime() : null;
    const endMs = reportFilterEnd ? new Date(`${reportFilterEnd}T23:59:59`).getTime() : null;

    const filtered = reports.filter((r) => {
      const createdTs = toTimestamp(r.createdAt);
      if (startMs !== null && createdTs < startMs) return false;
      if (endMs !== null && createdTs > endMs) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const createdA = toTimestamp(a.createdAt);
      const createdB = toTimestamp(b.createdAt);
      const updatedA = toTimestamp(a.updatedAt || a.createdAt);
      const updatedB = toTimestamp(b.updatedAt || b.createdAt);

      if (reportSort === 'CREATED_DESC') return createdB - createdA;
      if (reportSort === 'CREATED_ASC') return createdA - createdB;
      if (reportSort === 'UPDATED_DESC') return updatedB - updatedA;
      if (reportSort === 'UPDATED_ASC') return updatedA - updatedB;
      if (reportSort === 'AMOUNT_DESC') return (b.totalAmount || 0) - (a.totalAmount || 0);
      return (a.totalAmount || 0) - (b.totalAmount || 0);
    });
  }, [reports, reportFilterStart, reportFilterEnd, reportSort]);

  // Group selectedOrders by date (dd/MM/yyyy) for the INCLOSET-style report preview
  const groupedSelectedOrders = selectedOrders.reduce<Record<string, OrderDTO[]>>((acc, order) => {
    const dateKey = formatFullDate(order.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});

  const totalGrossRevenue = selectedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalMotoboyShare = selectedOrders.reduce(
    (sum, o) => sum + (o.motoboyCommissionAmount || 0),
    0
  );
  const totalRdoShare = totalGrossRevenue - totalMotoboyShare;

  const rdoPct = Math.max(0, Number((100 - commissionPct).toFixed(1)));
  const motoboyPctLabel = Number.isInteger(commissionPct)
    ? `${commissionPct}%`
    : `${String(commissionPct).replace('.', ',')}%`;
  const rdoPctLabel = Number.isInteger(rdoPct)
    ? `${rdoPct}%`
    : `${String(rdoPct).replace('.', ',')}%`;

  return (
    <div className="space-y-5">
      {/* Top Sub-tabs & Custom Report Action */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSubTab('MASTER')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'MASTER'
                ? 'bg-[#D92D3A] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Busca Aberta
          </button>
          <button
            type="button"
            onClick={() => setSubTab('CLIENTE')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'CLIENTE'
                ? 'bg-[#D92D3A] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Relatórios de Clientes
          </button>
          <button
            type="button"
            onClick={() => setSubTab('MOTOBOY')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'MOTOBOY'
                ? 'bg-[#D92D3A] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Relatórios de Motoboys
          </button>
          {isMasterProfile && (
            <button
              type="button"
              onClick={() => setSubTab('EMPRESA')}
              className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                subTab === 'EMPRESA'
                  ? 'bg-[#D92D3A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Relatórios da Empresa (RDO)
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            loadAuxLists();
            setCustomTargetId(clientOptions[0]?.id || '');
            setCustomModalOpen(true);
          }}
          className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-full bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Emitir Relatório Avulso
        </button>
      </div>

      {/* Mode 1: MASTER (Open Line-by-line Search) */}
      {subTab === 'MASTER' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3.5 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 flex-1 w-full">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                  Início
                </label>
                <input
                  type="date"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                  Fim
                </label>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label
                  htmlFor="master-filter-client"
                  className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
                >
                  Cliente
                </label>
                <select
                  id="master-filter-client"
                  aria-label="Filtrar por Cliente"
                  value={filterClientId}
                  onFocus={() => {
                    if (clients.length === 0) loadAuxLists();
                  }}
                  onClick={() => {
                    if (clients.length === 0) loadAuxLists();
                  }}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="">Todos</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="master-filter-motoboy"
                  className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
                >
                  Motoboy
                </label>
                <select
                  id="master-filter-motoboy"
                  aria-label="Filtrar por Motoboy"
                  value={filterMotoboyId}
                  onFocus={() => {
                    if (motoboys.length === 0) loadAuxLists();
                  }}
                  onClick={() => {
                    if (motoboys.length === 0) loadAuxLists();
                  }}
                  onChange={(e) => setFilterMotoboyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="">Todos</option>
                  {motoboyOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-800 uppercase mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="">Todos</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="COLETADO">Coletado</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="AGUARDANDO_PAGAMENTO">Aguard. Pagamento</option>
                  <option value="PAGO">Pago</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="master-sort-select"
                  className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
                >
                  Ordenar por
                </label>
                <select
                  id="master-sort-select"
                  aria-label="Ordenar busca aberta por"
                  value={masterSort}
                  onChange={(e) => setMasterSort(e.target.value as MasterSortOption)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800"
                >
                  <option value="DATE_DESC">Data (Mais recente ↓)</option>
                  <option value="DATE_ASC">Data (Mais antiga ↑)</option>
                  <option value="AMOUNT_DESC">Valor (Maior ↓)</option>
                  <option value="AMOUNT_ASC">Valor (Menor ↑)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  loadAuxLists();
                  loadMasterOrders();
                }}
                title="Atualizar dados e filtros"
                className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
                  <th className="py-3 px-4">Nº Pedido</th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() =>
                        setMasterSort((prev) => (prev === 'DATE_DESC' ? 'DATE_ASC' : 'DATE_DESC'))
                      }
                      className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                    >
                      Data
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Motoboy</th>
                  <th className="py-3 px-4">Km</th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() =>
                        setMasterSort((prev) =>
                          prev === 'AMOUNT_DESC' ? 'AMOUNT_ASC' : 'AMOUNT_DESC'
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                    >
                      Valor
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Repasse</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700">
                {sortedMasterOrders.map((o, idx) => (
                  <tr
                    key={o.id}
                    className={`${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                    } border-b border-slate-100`}
                  >
                    <td className="py-3 px-4 font-bold">#{o.orderNumber}</td>
                    <td className="py-3 px-4">{formatDateTime(o.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold">{o.clientName}</td>
                    <td className="py-3 px-4">{o.requesterName || o.createdByUserName}</td>
                    <td className="py-3 px-4">{o.motoboyName}</td>
                    <td className="py-3 px-4">{o.routeDistanceKm} km</td>
                    <td className="py-3 px-4 font-bold">{formatCurrency(o.amount)}</td>
                    <td className="py-3 px-4 text-blue-600 font-semibold">
                      {formatCurrency(o.motoboyCommissionAmount)}
                    </td>
                    <td className="py-3 px-4">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode 2, 3 & 4: Consolidated Reports (Clientes / Motoboys / Empresa RDO) */}
      {(subTab === 'CLIENTE' || subTab === 'MOTOBOY' || subTab === 'EMPRESA') && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 space-y-4 p-3.5 sm:p-5">
          {/* Filter & Sorting Bar for Relatórios de Clientes e Motoboys */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-wrap items-end gap-3 w-full lg:w-auto flex-1">
              <div>
                <label
                  htmlFor="rep-filter-start"
                  className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
                >
                  Data Inicial
                </label>
                <input
                  id="rep-filter-start"
                  type="date"
                  value={reportFilterStart}
                  onChange={(e) => setReportFilterStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label
                  htmlFor="rep-filter-end"
                  className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
                >
                  Data Final
                </label>
                <input
                  id="rep-filter-end"
                  type="date"
                  value={reportFilterEnd}
                  onChange={(e) => setReportFilterEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label
                  htmlFor="rep-sort-select"
                  className="block text-xs font-extrabold text-slate-800 uppercase mb-1"
                >
                  Ordenar por
                </label>
                <select
                  id="rep-sort-select"
                  aria-label="Ordenar relatórios por"
                  value={reportSort}
                  onChange={(e) => setReportSort(e.target.value as ReportSortOption)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="CREATED_DESC">Data de Criação (Mais recente ↓)</option>
                  <option value="CREATED_ASC">Data de Criação (Mais antiga ↑)</option>
                  <option value="UPDATED_DESC">Data de Alteração (Mais recente ↓)</option>
                  <option value="UPDATED_ASC">Data de Alteração (Mais antiga ↑)</option>
                  <option value="AMOUNT_DESC">Valor (Maior ↓)</option>
                  <option value="AMOUNT_ASC">Valor (Menor ↑)</option>
                </select>
              </div>

              {(reportFilterStart || reportFilterEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setReportFilterStart('');
                    setReportFilterEnd('');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  Limpar Datas
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadReports}
              title="Atualizar relatórios"
              className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[740px] text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-[11px] font-extrabold text-slate-800 uppercase">
                  <th className="py-2.5 px-2.5">Código</th>
                  <th className="py-2.5 px-2.5">
                    {subTab === 'CLIENTE'
                      ? 'Cliente'
                      : subTab === 'MOTOBOY'
                      ? 'Motoboy (Vínculo)'
                      : 'Empresa (RDO)'}
                  </th>
                  <th className="py-2.5 px-2.5">Período</th>
                  <th className="py-2.5 px-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setReportSort((prev) =>
                          prev === 'CREATED_DESC' ? 'CREATED_ASC' : 'CREATED_DESC'
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                    >
                      Criação
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setReportSort((prev) =>
                          prev === 'UPDATED_DESC' ? 'UPDATED_ASC' : 'UPDATED_DESC'
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                    >
                      Alteração
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5">Total Entregas</th>
                  <th className="py-2.5 px-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setReportSort((prev) =>
                          prev === 'AMOUNT_DESC' ? 'AMOUNT_ASC' : 'AMOUNT_DESC'
                        )
                      }
                      className="inline-flex items-center gap-1 uppercase font-extrabold text-slate-800 hover:text-[#D92D3A] cursor-pointer"
                    >
                      {subTab === 'CLIENTE'
                        ? 'Valor Faturado'
                        : subTab === 'MOTOBOY'
                        ? 'Total Repasse'
                        : 'Receita Total'}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  {subTab === 'CLIENTE' && <th className="py-2.5 px-2.5">Status da OP</th>}
                  {subTab === 'EMPRESA' && <th className="py-2.5 px-2.5">Lucro (Pagos)</th>}
                  {subTab === 'EMPRESA' && <th className="py-2.5 px-2.5">E-mail Master</th>}
                  <th className="py-2.5 px-2.5 text-center w-14">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-700">
                {sortedAndFilteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Nenhum relatório gerado nesta categoria. Clique em &quot;Emitir Relatório
                      Avulso&quot; para consolidar um período.
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredReports.map((rep, idx) => {
                    const isMenuOpen = openMenuReportId === rep.id;
                    return (
                      <tr
                        key={rep.id}
                        className={`${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                        } border-b border-slate-100 hover:bg-red-50/30 transition-colors`}
                      >
                        <td className="py-2.5 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                          {rep.reportCode}
                        </td>
                        <td className="py-2.5 px-2.5 font-semibold max-w-[170px] truncate" title={rep.targetEntityName}>
                          {rep.targetEntityName}{' '}
                          <span className="text-[10px] text-slate-500">
                            ({rep.targetEntitySubtype})
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {formatDateShort(rep.periodStart)} a {formatDateShort(rep.periodEnd)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                          {formatDateTime(rep.createdAt)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                          {formatDateTime(rep.updatedAt || rep.createdAt)}
                        </td>
                        <td className="py-2.5 px-2.5 font-bold whitespace-nowrap">
                          {rep.orderIds?.length ?? rep.totalOrders} ped. ({rep.totalDistanceKm} km)
                        </td>
                        <td className="py-2.5 px-2.5 font-extrabold text-slate-900 whitespace-nowrap">
                          {formatCurrency(rep.totalAmount)}
                        </td>
                        {subTab === 'CLIENTE' && (
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              {rep.paymentOrderStatus || 'CONSULTIVO'}
                            </span>
                          </td>
                        )}
                        {subTab === 'EMPRESA' && (
                          <td className="py-2.5 px-2.5 font-extrabold text-emerald-700 whitespace-nowrap">
                            {formatCurrency(rep.companySummary?.netProfit ?? 0)}
                          </td>
                        )}
                        {subTab === 'EMPRESA' && (
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {rep.companySummary?.emailSentToMaster
                                ? `Enviado (${rep.companySummary.masterEmailRecipient || 'Master'})`
                                : 'Consolidado'}
                            </span>
                          </td>
                        )}
                        <td className="py-2 px-2.5 text-center relative">
                          <div
                            ref={isMenuOpen ? menuContainerRef : undefined}
                            className="inline-block relative"
                          >
                            <button
                              type="button"
                              data-testid={`report-actions-trigger-${idx}`}
                              aria-label="Abrir ações do relatório"
                              onClick={(e) => {
                                if (openMenuReportId === rep.id) {
                                  setOpenMenuReportId(null);
                                  return;
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight =
                                  rep.type === 'MOTOBOY' || rep.type === 'EMPRESA' ? 132 : 88;
                                const openUpwards =
                                  window.innerHeight > 0 &&
                                  rect.bottom + menuHeight + 12 > window.innerHeight &&
                                  rect.top > menuHeight;
                                setMenuPosition({
                                  top: openUpwards ? rect.top - menuHeight - 6 : rect.bottom + 6,
                                  right: Math.max(12, window.innerWidth - rect.right),
                                });
                                setOpenMenuReportId(rep.id);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                data-testid={`report-actions-menu-${idx}`}
                                style={{
                                  top: `${menuPosition.top}px`,
                                  right: `${menuPosition.right}px`,
                                }}
                                className="fixed w-44 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-[100] text-left"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuReportId(null);
                                    handleOpenDetail(rep);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 shrink-0 text-slate-500" />
                                  <span>Ver Relatório</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={downloadingPdfId === rep.id}
                                  onClick={() => {
                                    setOpenMenuReportId(null);
                                    handleDownloadPdf(rep);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-[#D92D3A] hover:bg-red-50 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                                >
                                  <Download className="w-4 h-4 shrink-0" />
                                  <span>
                                    {downloadingPdfId === rep.id ? 'Gerando...' : 'Gerar PDF'}
                                  </span>
                                </button>

                                {(rep.type === 'MOTOBOY' || rep.type === 'EMPRESA') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuReportId(null);
                                      handleDeleteReport(rep);
                                    }}
                                    className="w-full px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 border-t border-slate-100 mt-1 pt-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 shrink-0" />
                                    <span>Excluir</span>
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
        </div>
      )}

      {/* INCLOSET-style On-Screen Report Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#FAF9F8] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Dark Navy Banner matching INCLOSET PDF */}
            <div className="bg-[#1A2035] text-white px-4 py-3.5 sm:px-7 sm:py-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-slate-200" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-base font-extrabold tracking-wide uppercase truncate">
                    {selectedReport.targetEntityName} (
                    {formatFullDate(selectedReport.periodStart)} A{' '}
                    {formatFullDate(selectedReport.periodEnd)})
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {formatFullDate(selectedReport.periodStart)} a{' '}
                    {formatFullDate(selectedReport.periodEnd)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedReport)}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Gerar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body matching INCLOSET PDF structure */}
            <div className="p-3.5 sm:p-7 overflow-y-auto space-y-5 sm:space-y-6">
              {/* 1. Informações */}
              <div>
                <h4 className="text-xs font-bold text-[#1A2035] mb-3 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Informações
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white border border-rose-100 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase">TIPO:</span>
                    <span className="font-bold text-[#1A2035] lowercase">
                      {selectedReport.type === 'CLIENTE'
                        ? 'clientes'
                        : selectedReport.type === 'MOTOBOY'
                        ? 'motoboys'
                        : 'empresa (rdo)'}
                    </span>
                  </div>
                  <div className="bg-white border border-rose-100 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase">PERÍODO:</span>
                    <span className="font-bold text-[#1A2035] text-right">
                      {formatFullDate(selectedReport.periodStart)} a{' '}
                      {formatFullDate(selectedReport.periodEnd)}
                    </span>
                  </div>
                  <div className="bg-white border border-rose-100 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase">GERADO POR:</span>
                    <span className="font-bold text-[#1A2035]">
                      {selectedReport.generatedByUserName || 'Sistema'}
                    </span>
                  </div>
                  <div className="bg-white border border-rose-100 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 uppercase">HORA:</span>
                    <span className="font-bold text-[#1A2035]">
                      {formatDateTime(selectedReport.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* EMPRESA (RDO) Specific Section: RESUMO GERAL (8 cards) + Agregado por Motoboy */}
              {selectedReport.type === 'EMPRESA' && selectedReport.companySummary && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-[#1A2035] uppercase tracking-wider">
                      RESUMO GERAL
                    </h4>
                    {selectedReport.companySummary.emailSentToMaster && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                        Enviado por e-mail para o Master (
                        {selectedReport.companySummary.masterEmailRecipient || 'admin@rodo.com'})
                      </span>
                    )}
                  </div>

                  {/* 8 RESUMO GERAL Cards matching Financial RDO screen */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 uppercase">Receitas</p>
                      <p className="text-base font-extrabold text-slate-900">
                        {formatCurrency(selectedReport.companySummary.totalRevenue)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {`Valor total de pedidos (${selectedReport.companySummary.totalOrders})`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                      <p className="text-xs font-extrabold text-emerald-900 uppercase">
                        Já Recebido
                      </p>
                      <p className="text-base font-extrabold text-emerald-800">
                        {formatCurrency(selectedReport.companySummary.paidRevenue)}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-700">
                        {`${selectedReport.companySummary.paidOrdersCount} pagos em caixa`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                      <p className="text-xs font-extrabold text-amber-900 uppercase">A Receber</p>
                      <p className="text-base font-extrabold text-amber-800">
                        {formatCurrency(selectedReport.companySummary.pendingRevenue)}
                      </p>
                      <p className="text-[11px] font-bold text-amber-800">
                        {`${selectedReport.companySummary.pendingOrdersCount} a receber (não pagos)`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 uppercase">Lucro</p>
                      <p className="text-base font-extrabold text-slate-900">
                        {formatCurrency(selectedReport.companySummary.netProfit)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Somente sobre pedidos pagos
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 uppercase">Repasses</p>
                      <p className="text-base font-extrabold text-slate-900">
                        {formatCurrency(selectedReport.companySummary.totalCommissions)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {`Pagos: ${formatCurrency(selectedReport.companySummary.paidCommissions)}`}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 uppercase">Despesas</p>
                      <p className="text-base font-extrabold text-purple-700">
                        {formatCurrency(selectedReport.companySummary.totalExpenses)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        Lançamentos do período
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 uppercase">Colaborador</p>
                      <p className="text-base font-extrabold text-blue-600">
                        {formatCurrency(selectedReport.companySummary.collaboratorShare)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">Comissão motoboys</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                      <p className="text-xs font-extrabold text-slate-800 uppercase">Registros</p>
                      <p className="text-base font-extrabold text-amber-800">
                        {selectedReport.companySummary.totalOrders}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600">
                        {`${selectedReport.companySummary.paidOrdersCount} pagos • ${selectedReport.companySummary.pendingOrdersCount} pendentes`}
                      </p>
                    </div>
                  </div>

                  {/* Agregado por Motoboy (Valores a Pagar no Dia) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-[#1A2035] uppercase">
                      Agregado por Motoboy (Valores a Pagar no Dia)
                    </h4>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 border-b-2 border-slate-200 font-extrabold text-[#1A2035] uppercase">
                            <th className="py-2.5 px-4">Motoboy</th>
                            <th className="py-2.5 px-4">Vínculo</th>
                            <th className="py-2.5 px-4">Qtd. Pedidos</th>
                            <th className="py-2.5 px-4">Km Total</th>
                            <th className="py-2.5 px-4">Valor Bruto Corridas</th>
                            <th className="py-2.5 px-4">Valor a Pagar ao Motoboy</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {(selectedReport.companySummary.motoboyAggregates || []).map((agg) => (
                            <tr
                              key={agg.motoboyId}
                              className="border-b border-slate-100 last:border-0"
                            >
                              <td className="py-2.5 px-4 font-bold text-slate-900">
                                {agg.motoboyName}
                              </td>
                              <td className="py-2.5 px-4 font-semibold">{agg.motoboyType}</td>
                              <td className="py-2.5 px-4 font-bold">
                                {agg.totalOrders} pedidos
                              </td>
                              <td className="py-2.5 px-4">{agg.totalDistanceKm} km</td>
                              <td className="py-2.5 px-4 font-semibold">
                                {formatCurrency(agg.grossAmount)}
                              </td>
                              <td className="py-2.5 px-4 font-extrabold text-emerald-700">
                                {formatCurrency(agg.amountToPay)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-emerald-50/80 font-extrabold text-[#1A2035] border-t-2 border-emerald-200">
                            <td colSpan={2} className="py-3 px-4 uppercase">
                              VALOR FINAL DE TODOS OS MOTOBOYS JUNTOS NO DIA
                            </td>
                            <td className="py-3 px-4">
                              {selectedReport.companySummary.totalOrders} pedidos
                            </td>
                            <td className="py-3 px-4">-</td>
                            <td className="py-3 px-4">
                              {formatCurrency(selectedReport.companySummary.totalRevenue)}
                            </td>
                            <td className="py-3 px-4 text-emerald-800 text-sm">
                              {formatCurrency(
                                selectedReport.companySummary.totalMotoboysAmountToPay
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Clientes (1) / Motoboys (1) */}
              <div>
                <h4 className="text-xs font-bold text-[#1A2035] mb-2">
                  {selectedReport.type === 'MOTOBOY' ? 'Motoboys (1)' : 'Clientes (1)'}
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <div className="px-4 py-2 bg-slate-50 font-bold text-[#1A2035] border-b border-slate-100">
                    Username
                  </div>
                  <div className="px-4 py-2.5 text-slate-700 font-medium">
                    {selectedReport.targetEntityName}
                  </div>
                </div>
              </div>

              {/* 3. Pedidos (N) grouped by Date */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#1A2035]">
                  Pedidos ({selectedOrders.length})
                </h4>

                {Object.entries(groupedSelectedOrders).map(([dateKey, dayOrders]) => {
                  const daySubtotal = dayOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
                  return (
                    <div
                      key={dateKey}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <div className="px-4 py-2.5 bg-[#EEF2F6] flex items-center justify-between text-xs">
                        <span className="font-bold text-[#1A2035]">■ {dateKey}</span>
                        <span className="text-slate-500">
                          {dayOrders.length}{' '}
                          {dayOrders.length === 1 ? 'registro' : 'registros'} • Subtotal:{' '}
                          <strong className="text-emerald-700">
                            {formatCurrency(daySubtotal)}
                          </strong>
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[#1A2035] font-bold">
                              <th className="py-2.5 px-4">Cliente</th>
                              <th className="py-2.5 px-4">Solicitante</th>
                              <th className="py-2.5 px-4">Endereço</th>
                              <th className="py-2.5 px-4">Valor Corrida</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700">
                            {dayOrders.map((ord) => (
                              <tr key={ord.id} className="border-b border-slate-100 last:border-0">
                                <td className="py-2.5 px-4 font-medium">{ord.clientName}</td>
                                <td className="py-2.5 px-4">
                                  {ord.requesterName || ord.createdByUserName}
                                </td>
                                <td className="py-2.5 px-4">
                                  {ord.destinationAddress?.street}, {ord.destinationAddress?.number}{' '}
                                  {ord.destinationAddress?.neighborhood}
                                </td>
                                <td className="py-2.5 px-4 font-semibold">
                                  {formatCurrency(ord.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Yellow TOTAL GERAL POR PERÍODO box */}
                <div className="px-5 py-3.5 rounded-xl bg-amber-50/70 border border-amber-400 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1A2035] uppercase">
                    TOTAL GERAL POR PERÍODO
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {formatCurrency(totalGrossRevenue)}
                  </span>
                </div>
              </div>

              {/* 4. Resumo por Cliente / Motoboy */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-[#1A2035]">
                  {selectedReport.type === 'MOTOBOY' ? 'Resumo por Motoboy' : 'Resumo por Cliente'}
                </h4>

                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-950 leading-relaxed">
                  <strong>Regra de divisão da corrida:</strong> do valor total de cada corrida,{' '}
                  <strong>{motoboyPctLabel}</strong> é destinado ao motoboy e{' '}
                  <strong>{rdoPctLabel}</strong> é retido pela RDO (empresa). O &quot;Valor Total
                  Receita&quot; representa a soma bruta das corridas; &quot;Valor Motoboy&quot; e
                  &quot;Valor RDO&quot; são os valores já calculados conforme essa divisão.
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-bold text-[#1A2035]">
                        <th className="py-2.5 px-4">
                          {selectedReport.type === 'MOTOBOY' ? 'motoboy' : 'cliente'}
                        </th>
                        <th className="py-2.5 px-4">Qtd. Corridas</th>
                        <th className="py-2.5 px-4">Valor Total Receita</th>
                        <th className="py-2.5 px-4">{`Valor Motoboy (${motoboyPctLabel})`}</th>
                        <th className="py-2.5 px-4">{`Valor RDO (${rdoPctLabel})`}</th>
                        <th className="py-2.5 px-4">Total Calculado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-2.5 px-4">{selectedReport.targetEntityName}</td>
                        <td className="py-2.5 px-4">{selectedOrders.length}</td>
                        <td className="py-2.5 px-4">{formatCurrency(totalGrossRevenue)}</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-700">
                          {formatCurrency(totalMotoboyShare)}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-blue-600">
                          {formatCurrency(totalRdoShare)}
                        </td>
                        <td className="py-2.5 px-4">{formatCurrency(totalGrossRevenue)}</td>
                      </tr>
                      <tr className="font-bold text-[#1A2035] bg-slate-50/60">
                        <td className="py-2.5 px-4">TOTAL GERAL</td>
                        <td className="py-2.5 px-4">-</td>
                        <td className="py-2.5 px-4">{formatCurrency(totalGrossRevenue)}</td>
                        <td className="py-2.5 px-4 text-emerald-700">
                          {formatCurrency(totalMotoboyShare)}
                        </td>
                        <td className="py-2.5 px-4 text-blue-600">
                          {formatCurrency(totalRdoShare)}
                        </td>
                        <td className="py-2.5 px-4">{formatCurrency(totalGrossRevenue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bottom Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-800">
                      {`VALOR MOTOBOY (${motoboyPctLabel})`}
                    </span>
                    <span className="text-sm font-extrabold text-emerald-800">
                      {formatCurrency(totalMotoboyShare)}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-800">
                      {`VALOR RDO (${rdoPctLabel})`}
                    </span>
                    <span className="text-sm font-extrabold text-emerald-800">
                      {formatCurrency(totalRdoShare)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">TOTAL DE REGISTROS</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {selectedOrders.length}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-rose-900">
                      SOMA VALOR SERVIÇO
                    </span>
                    <span className="text-sm font-extrabold text-rose-900">
                      {formatCurrency(totalGrossRevenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Report Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Emitir Relatório Avulso</h3>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipo de Relatório
                </label>
                <select
                  value={customType}
                  onChange={(e) => {
                    const next = e.target.value as ReportType;
                    setCustomType(next);
                    if (next === 'CLIENTE') setCustomTargetId(clientOptions[0]?.id || '');
                    if (next === 'MOTOBOY') setCustomTargetId(motoboyOptions[0]?.id || '');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="CLIENTE">Cliente</option>
                  <option value="MOTOBOY">Motoboy</option>
                  {isMasterProfile && (
                    <option value="EMPRESA">Empresa (Resumo Geral RDO)</option>
                  )}
                </select>
              </div>

              {customType === 'CLIENTE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                  <select
                    required
                    value={customTargetId}
                    onChange={(e) => setCustomTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {customType === 'MOTOBOY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Motoboy</label>
                  <select
                    required
                    value={customTargetId}
                    onChange={(e) => setCustomTargetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    {motoboyOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Data Início *
                  </label>
                  <input
                    type="date"
                    required
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    required
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {customType === 'CLIENTE' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customGeneratePo}
                    onChange={(e) => setCustomGeneratePo(e.target.checked)}
                    className="rounded text-[#D92D3A]"
                  />
                  Gerar Ordem de Pagamento vinculada (Fechamento Financeiro)
                </label>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#D92D3A] text-white text-xs font-bold cursor-pointer"
                >
                  Consolidar Relatório
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
