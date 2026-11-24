import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ClientDTO, MotoboyDTO, OrderDTO } from '../../../shared/types/domain.types';
import { api } from '../../../shared/services/api';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: ClientDTO[];
  motoboys: MotoboyDTO[];
  editingOrder?: OrderDTO | null;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients,
  motoboys,
  editingOrder,
}) => {
  const [clientId, setClientId] = useState('');
  const [motoboyId, setMotoboyId] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [attendantName, setAttendantName] = useState('');
  const [originStreet, setOriginStreet] = useState('');
  const [originNumber, setOriginNumber] = useState('');
  const [originNeighborhood, setOriginNeighborhood] = useState('');
  const [originCity, setOriginCity] = useState('Belo Horizonte');
  const [originState, setOriginState] = useState('MG');
  const [destStreet, setDestStreet] = useState('');
  const [destNumber, setDestNumber] = useState('');
  const [destNeighborhood, setDestNeighborhood] = useState('');
  const [destCity, setDestCity] = useState('Belo Horizonte');
  const [destState, setDestState] = useState('MG');
  const [routeDistanceKm, setRouteDistanceKm] = useState('5.0');
  const [amount, setAmount] = useState('25.00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let loggedUserName = 'Atendente Logado';
    try {
      const saved = localStorage.getItem('rodo_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) loggedUserName = parsed.name;
      }
    } catch {
      // ignore
    }

    if (editingOrder) {
      setClientId(editingOrder.clientId);
      setMotoboyId(editingOrder.motoboyId);
      setRequesterName(editingOrder.requesterName ?? '');
      setAttendantName(editingOrder.createdByUserName || loggedUserName);
      setOriginStreet(editingOrder.originAddress?.street || '');
      setOriginNumber(editingOrder.originAddress?.number || '');
      setOriginNeighborhood(editingOrder.originAddress?.neighborhood || '');
      setOriginCity(editingOrder.originAddress?.city || 'Belo Horizonte');
      setOriginState(editingOrder.originAddress?.state || 'MG');
      setDestStreet(editingOrder.destinationAddress?.street || '');
      setDestNumber(editingOrder.destinationAddress?.number || '');
      setDestNeighborhood(editingOrder.destinationAddress?.neighborhood || '');
      setDestCity(editingOrder.destinationAddress?.city || 'Belo Horizonte');
      setDestState(editingOrder.destinationAddress?.state || 'MG');
      setRouteDistanceKm(String(editingOrder.routeDistanceKm || 5));
      setAmount(String(editingOrder.amount || 25));
    } else {
      const defaultClient = clients[0];
      setClientId(defaultClient?.id || '');
      setMotoboyId(motoboys[0]?.id || '');
      setRequesterName('');
      setAttendantName(loggedUserName);
      setOriginStreet(defaultClient?.baseAddress?.street || '');
      setOriginNumber(defaultClient?.baseAddress?.number || '');
      setOriginNeighborhood(defaultClient?.baseAddress?.neighborhood || '');
      setOriginCity(defaultClient?.baseAddress?.city || 'Belo Horizonte');
      setOriginState(defaultClient?.baseAddress?.state || 'MG');
      setDestStreet('');
      setDestNumber('');
      setDestNeighborhood('');
      setDestCity('Belo Horizonte');
      setDestState('MG');
      setRouteDistanceKm('5.0');
      setAmount('25.00');
    }
    setError(null);
  }, [editingOrder, clients, motoboys, isOpen]);

  const handleClientChange = (selectedId: string) => {
    setClientId(selectedId);
    const found = clients.find((c) => c.id === selectedId);
    if (found?.baseAddress && !editingOrder) {
      setOriginStreet(found.baseAddress.street || '');
      setOriginNumber(found.baseAddress.number || '');
      setOriginNeighborhood(found.baseAddress.neighborhood || '');
      setOriginCity(found.baseAddress.city || 'Belo Horizonte');
      setOriginState(found.baseAddress.state || 'MG');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      clientId,
      motoboyId,
      requesterName: requesterName.trim() || null,
      originAddress: {
        street: originStreet,
        number: originNumber,
        neighborhood: originNeighborhood,
        city: originCity,
        state: originState,
      },
      destinationAddress: {
        street: destStreet,
        number: destNumber,
        neighborhood: destNeighborhood,
        city: destCity,
        state: destState,
      },
      routeDistanceKm: parseFloat(routeDistanceKm),
      amount: parseFloat(amount),
    };

    try {
      if (editingOrder) {
        await api.put(`/orders/${editingOrder.id}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            {editingOrder ? `Editar Pedido #${editingOrder.orderNumber}` : 'Novo Pedido de Entrega'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-[#D92D3A] text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente *</label>
              <select
                required
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">Selecione um cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Motoboy *</label>
              <select
                required
                value={motoboyId}
                onChange={(e) => setMotoboyId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                <option value="">Selecione um motoboy</option>
                {motoboys.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="order-requester-name"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Nome do Solicitante (ex: Mariana, Loja)
              </label>
              <input
                id="order-requester-name"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Informe quem solicitou a corrida"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="order-attendant-name"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Atendente (Registrado por)
              </label>
              <input
                id="order-attendant-name"
                value={attendantName}
                readOnly
                disabled
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Origin Address */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase">Endereço de Coleta (Origem)</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Rua / Logradouro *</label>
                <input
                  required
                  value={originStreet}
                  onChange={(e) => setOriginStreet(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Número *</label>
                <input
                  required
                  value={originNumber}
                  onChange={(e) => setOriginNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Bairro</label>
                <input
                  value={originNeighborhood}
                  onChange={(e) => setOriginNeighborhood(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Destination Address */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase">Endereço de Entrega (Destino)</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[11px] text-slate-500 mb-1">Rua / Logradouro *</label>
                <input
                  required
                  value={destStreet}
                  onChange={(e) => setDestStreet(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Número *</label>
                <input
                  required
                  value={destNumber}
                  onChange={(e) => setDestNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Bairro</label>
                <input
                  value={destNeighborhood}
                  onChange={(e) => setDestNeighborhood(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Distance & Manual Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Distância da Rota (Km) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={routeDistanceKm}
                onChange={(e) => setRouteDistanceKm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Valor do Pedido (R$) * (Comissão calculada automaticamente)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold cursor-pointer"
            >
              {submitting ? 'Salvando...' : 'Salvar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
