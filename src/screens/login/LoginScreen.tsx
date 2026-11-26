import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { sessionExpired, redirectTo } = useMemo(() => {
    const searchStr = location.search || window.location.search;
    const params = new URLSearchParams(searchStr);
    const expired = params.get('expired') === 'true';
    const rawRedirect = params.get('redirect');
    const safeRedirect =
      rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('/login')
        ? rawRedirect
        : '/pedidos';
    return { sessionExpired: expired, redirectTo: safeRedirect };
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Usuario ou senha incorretos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 20% 20%, #b47b26 0%, #855512 55%, #5a3808 100%)',
      }}
    >
      {/* Decorative subtle background shapes reminiscent of delivery pins & parcels */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="w-28 h-28 rounded-2xl bg-amber-200/30 rotate-12 absolute top-14 left-20 blur-[1px]" />
        <div className="w-36 h-36 rounded-2xl bg-amber-100/20 -rotate-6 absolute bottom-16 right-20 blur-[1px]" />
        <div className="w-16 h-16 rounded-full border-8 border-red-800/60 absolute top-1/4 left-1/4" />
        <div className="w-16 h-16 rounded-full border-8 border-red-800/60 absolute bottom-1/4 right-1/4" />
      </div>

      {/* Centered White Login Card matching Screenshot 1 */}
      <div className="w-full max-w-[420px] bg-[#FAF9F8] rounded-3xl shadow-2xl px-10 py-12 relative z-10 text-center">
        {/* Red Lightning Circle Badge */}
        <div className="w-16 h-16 rounded-full bg-red-50/90 mx-auto mb-5 flex items-center justify-center shadow-inner">
          <Zap className="w-7 h-7 text-[#D92D3A] fill-[#D92D3A]" />
        </div>

        {/* RDO EXPRESS Title */}
        <h1 className="text-3xl font-bold tracking-wide mb-6">
          <span className="text-[#D92D3A]">RDO</span>{' '}
          <span className="text-slate-800 font-semibold">EXPRESS</span>
        </h1>

        {sessionExpired && (
          <div
            role="alert"
            className="mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2.5 text-left"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Sua sessão expirou. Faça login novamente para continuar.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail de acesso"
              className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full px-4 py-3.5 pr-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Mostrar ou ocultar senha"
            >
              {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl bg-[#D92D3A] hover:bg-[#c0222e] text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Acessando...' : 'Acessar Painel'}
          </button>

          {error && (
            <p className="text-center text-xs font-bold text-[#D92D3A] pt-2">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
};
