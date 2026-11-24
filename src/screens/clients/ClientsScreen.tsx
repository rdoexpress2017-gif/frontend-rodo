import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, X } from 'lucide-react';
import {
  BillingCycleType,
  ClientDTO,
  DayOfWeekEnum,
} from '../../shared/types/domain.types';
import { api } from '../../shared/services/api';

export const ClientsScreen: React.FC = () => {
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientDTO | null>(null);

  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Belo Horizonte');
  const [state, setState] = useState('MG');
  const [zipCode, setZipCode] = useState('');
  const [cycleType, setCycleType] = useState<BillingCycleType>('DAILY');
  const [startDay, setStartDay] = useState<DayOfWeekEnum>('SEGUNDA');
  const [endDay, setEndDay] = useState<DayOfWeekEnum>('SEXTA');

  const loadClients = useCallback(async () => {
    const res = await api.get<ClientDTO[]>('/clients');
    setClients(res.data || []);
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const openModal = (client?: ClientDTO) => {
    if (client) {
      setEditing(client);
      setName(client.name);
      setDocument(client.document);
      setEmail(client.email || '');
      setPhone(client.phone);
      setStreet(client.baseAddress?.street || '');
      setNumber(client.baseAddress?.number || '');
      setNeighborhood(client.baseAddress?.neighborhood || '');
      setCity(client.baseAddress?.city || 'Belo Horizonte');
      setState(client.baseAddress?.state || 'MG');
      setZipCode(client.baseAddress?.zipCode || '');
      setCycleType(client.billingCycle?.type || 'DAILY');
      setStartDay(client.billingCycle?.startDayOfWeek || 'SEGUNDA');
      setEndDay(client.billingCycle?.endDayOfWeek || 'SEXTA');
    } else {
      setEditing(null);
      setName('');
      setDocument('');
      setEmail('');
      setPhone('');
      setStreet('');
      setNumber('');
      setNeighborhood('');
      setCity('Belo Horizonte');
      setState('MG');
      setZipCode('');
      setCycleType('DAILY');
      setStartDay('SEGUNDA');
      setEndDay('SEXTA');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      document,
      email,
      phone,
      baseAddress: { street, number, neighborhood, city, state, zipCode },
      billingCycle: {
        type: cycleType,
        startDayOfWeek: cycleType === 'WEEKLY' ? startDay : null,
        endDayOfWeek: cycleType === 'WEEKLY' ? endDay : null,
      },
      active: true,
    };
    if (editing) {
      await api.put(`/clients/${editing.id}`, payload);
    } else {
      await api.post('/clients', payload);
    }
    setModalOpen(false);
    loadClients();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => openModal()}
          className="px-5 py-2.5 rounded-full bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
              <th className="py-3.5 px-4">Estabelecimento</th>
              <th className="py-3.5 px-4">CPF / CNPJ</th>
              <th className="py-3.5 px-4">WhatsApp</th>
              <th className="py-3.5 px-4">Endereço Base</th>
              <th className="py-3.5 px-4">Ciclo de Faturamento</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-700">
            {clients.map((c, idx) => (
              <tr
                key={c.id}
                className={`${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                } border-b border-slate-100`}
              >
                <td className="py-3.5 px-4 font-bold text-slate-900">{c.name}</td>
                <td className="py-3.5 px-4">{c.document}</td>
                <td className="py-3.5 px-4">{c.phone}</td>
                <td className="py-3.5 px-4">
                  {c.baseAddress?.street}, {c.baseAddress?.number} - {c.baseAddress?.neighborhood}
                </td>
                <td className="py-3.5 px-4">
                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-[#D92D3A] text-[11px] font-bold">
                    {c.billingCycle?.type}
                    {c.billingCycle?.type === 'WEEKLY'
                      ? ` (${c.billingCycle.startDayOfWeek} a ${c.billingCycle.endDayOfWeek})`
                      : ''}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => openModal(c)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editing ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Razão Social / Nome Fantasia *
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    CPF / CNPJ *
                  </label>
                  <input
                    required
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    WhatsApp *
                  </label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Rua (Endereço Base) *
                  </label>
                  <input
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Número *
                  </label>
                  <input
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bairro</label>
                  <input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cidade *
                  </label>
                  <input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ciclo Faturamento *
                  </label>
                  <select
                    value={cycleType}
                    onChange={(e) => setCycleType(e.target.value as BillingCycleType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="DAILY">Diário (DAILY)</option>
                    <option value="WEEKLY">Semanal (WEEKLY)</option>
                    <option value="MONTHLY">Mensal (MONTHLY)</option>
                  </select>
                </div>
              </div>

              {cycleType === 'WEEKLY' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Dia Inicial
                    </label>
                    <select
                      value={startDay}
                      onChange={(e) => setStartDay(e.target.value as DayOfWeekEnum)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="SEGUNDA">Segunda-feira</option>
                      <option value="TERCA">Terça-feira</option>
                      <option value="QUARTA">Quarta-feira</option>
                      <option value="QUINTA">Quinta-feira</option>
                      <option value="SEXTA">Sexta-feira</option>
                      <option value="SABADO">Sábado</option>
                      <option value="DOMINGO">Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Dia de Fechamento (17:30)
                    </label>
                    <select
                      value={endDay}
                      onChange={(e) => setEndDay(e.target.value as DayOfWeekEnum)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="SEGUNDA">Segunda-feira</option>
                      <option value="TERCA">Terça-feira</option>
                      <option value="QUARTA">Quarta-feira</option>
                      <option value="QUINTA">Quinta-feira</option>
                      <option value="SEXTA">Sexta-feira</option>
                      <option value="SABADO">Sábado</option>
                      <option value="DOMINGO">Domingo</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D92D3A] text-white text-xs font-bold cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
