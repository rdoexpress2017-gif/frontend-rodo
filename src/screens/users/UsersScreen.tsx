import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { UserDTO, UserRole } from '../../shared/types/domain.types';
import { api } from '../../shared/services/api';

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDTO | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('ATENDENTE');

  const loadUsers = useCallback(async () => {
    const res = await api.get<UserDTO[]>('/users');
    setUsers(res.data || []);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openModal = (user?: UserDTO) => {
    if (user) {
      setEditing(user);
      setName(user.name);
      setEmail(user.email);
      setPassword('');
      setPhone(user.phone || '');
      setRole(user.role);
    } else {
      setEditing(null);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setRole('ATENDENTE');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, email, password, phone, role, active: true };
    if (editing) {
      await api.put(`/users/${editing.id}`, payload);
    } else {
      await api.post('/users', payload);
    }
    setModalOpen(false);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este usuário?')) return;
    await api.delete(`/users/${id}`);
    loadUsers();
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
          Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[580px] text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-xs font-extrabold text-slate-800 uppercase">
              <th className="py-3.5 px-4">Nome</th>
              <th className="py-3.5 px-4">E-mail</th>
              <th className="py-3.5 px-4">Telefone</th>
              <th className="py-3.5 px-4">Perfil</th>
              <th className="py-3.5 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-xs text-slate-700">
            {users.map((u, idx) => (
              <tr
                key={u.id}
                className={`${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                } border-b border-slate-100`}
              >
                <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                <td className="py-3.5 px-4">{u.email}</td>
                <td className="py-3.5 px-4">{u.phone}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      u.role === 'MASTER'
                        ? 'bg-red-100 text-[#D92D3A]'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openModal(u)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                {editing ? 'Editar Usuário' : 'Novo Usuário'}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Senha {editing ? '(Deixe em branco para manter)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editing}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Perfil *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="ATENDENTE">ATENDENTE</option>
                  <option value="MASTER">MASTER</option>
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
