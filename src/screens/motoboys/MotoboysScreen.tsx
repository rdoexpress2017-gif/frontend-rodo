import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, X } from 'lucide-react';
import { MotoboyDTO, MotoboyType } from '../../shared/types/domain.types';
import { api } from '../../shared/services/api';

export const MotoboysScreen: React.FC = () => {
  const [motoboys, setMotoboys] = useState<MotoboyDTO[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MotoboyDTO | null>(null);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<MotoboyType>('FIXO');

  const loadMotoboys = useCallback(async () => {
    const res = await api.get<MotoboyDTO[]>('/motoboys');
    setMotoboys(res.data || []);
  }, []);

  useEffect(() => {
    loadMotoboys();
  }, [loadMotoboys]);

  const openModal = (motoboy?: MotoboyDTO) => {
    if (motoboy) {
      setEditing(motoboy);
      setName(motoboy.name);
      setCpf(motoboy.cpf);
      setPhone(motoboy.phone);
      setType(motoboy.type);
    } else {
      setEditing(null);
      setName('');
      setCpf('');
      setPhone('');
      setType('FIXO');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, cpf, phone, type, active: true };
    if (editing) {
      await api.put(`/motoboys/${editing.id}`, payload);
    } else {
      await api.post('/motoboys', payload);
    }
    setModalOpen(false);
    loadMotoboys();
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
          Novo Motoboy
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[540px] text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
              <th className="py-3.5 px-4">Nome</th>
              <th className="py-3.5 px-4">CPF</th>
              <th className="py-3.5 px-4">Telefone</th>
              <th className="py-3.5 px-4">Vínculo</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-700">
            {motoboys.map((m, idx) => (
              <tr
                key={m.id}
                className={`${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                } border-b border-slate-100`}
              >
                <td className="py-3.5 px-4 font-bold text-slate-900">{m.name}</td>
                <td className="py-3.5 px-4">{m.cpf}</td>
                <td className="py-3.5 px-4">{m.phone}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      m.type === 'FIXO'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {m.type}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => openModal(m)}
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editing ? 'Editar Motoboy' : 'Novo Motoboy'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CPF *</label>
                <input
                  required
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tipo de Vínculo *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MotoboyType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="FIXO">Fixo</option>
                  <option value="TERCEIRIZADO">Terceirizado</option>
                </select>
              </div>
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
