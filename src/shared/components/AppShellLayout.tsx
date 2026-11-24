import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Zap,
  Package,
  Building2,
  Bike,
  Wallet,
  FileBarChart,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  masterOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/pedidos',
    label: 'PEDIDOS',
    title: 'Pedidos',
    subtitle: 'Gestão operacional e acompanhamento de entregas',
    icon: <Package className="w-4 h-4" />,
  },
  {
    path: '/clientes',
    label: 'CLIENTES',
    title: 'Clientes',
    subtitle: 'Estabelecimentos parceiros e ciclos de faturamento',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    path: '/motoboys',
    label: 'MOTOBOYS',
    title: 'Motoboys',
    subtitle: 'Frota de entregadores fixos e terceirizados',
    icon: <Bike className="w-4 h-4" />,
  },
  {
    path: '/financeiro',
    label: 'FINANCEIRO',
    title: 'Financeiro',
    subtitle: 'Controle de fluxo financeiro e ordens de pagamento',
    icon: <Wallet className="w-4 h-4" />,
  },
  {
    path: '/relatorios',
    label: 'RELATÓRIOS',
    title: 'Relatórios',
    subtitle: 'Consolidação analítica, fechamentos e exportação PDF',
    icon: <FileBarChart className="w-4 h-4" />,
  },
  {
    path: '/usuarios',
    label: 'USUÁRIOS',
    title: 'Administração de Usuários',
    subtitle: 'Controle de atendentes e gestores Master',
    icon: <Users className="w-4 h-4" />,
    masterOnly: true,
  },
  {
    path: '/configuracoes',
    label: 'CONFIGURAÇÕES',
    title: 'Configurações Globais',
    subtitle: 'Parâmetros de comissão padrão, taxas e automação',
    icon: <Settings className="w-4 h-4" />,
    masterOnly: true,
  },
];

export const AppShellLayout: React.FC = () => {
  const { user, logout, isMaster } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const visibleItems = NAV_ITEMS.filter((item) => !item.masterOnly || isMaster);
  const activeItem =
    visibleItems.find((item) => location.pathname.startsWith(item.path)) || visibleItems[0];

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex bg-[#F4F6F8] text-slate-800 relative">
      {/* Mobile / Small Tablet Backdrop Overlay */}
      {sidebarOpen && (
        <div
          data-testid="mobile-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Left Sidebar following RDO Express layout - Slide-over drawer on mobile, sticky rail on tablet/desktop */}
      <aside
        data-testid="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-200 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 md:w-64' : '-translate-x-full md:w-20'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Brand Logo */}
          <div className="h-16 sm:h-20 px-5 sm:px-6 flex items-center justify-between gap-2.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[#D92D3A] shrink-0">
                <Zap className="w-5 h-5 fill-[#D92D3A]" />
              </div>
              <span
                className={`text-lg font-extrabold tracking-tight ${
                  sidebarOpen ? 'inline' : 'md:hidden'
                }`}
              >
                <span className="text-[#D92D3A]">RDO</span>{' '}
                <span className="text-slate-900">Express</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 sm:p-4 space-y-1.5">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wider transition-colors ${
                    isActive
                      ? 'bg-red-50 text-[#D92D3A]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`
                }
              >
                <span className="text-[#D92D3A] shrink-0">{item.icon}</span>
                <span className={sidebarOpen ? 'inline' : 'md:hidden'}>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Logout Button ("Encerrar") - always fixed within viewport bottom */}
        <div className="p-3 sm:p-4 border-t border-slate-100 shrink-0 bg-white">
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-full border border-[#D92D3A]/60 text-[#D92D3A] hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={sidebarOpen ? 'inline' : 'md:hidden'}>Encerrar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 sm:h-20 shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              aria-label="Alternar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                {activeItem?.title}
              </h1>
              <p className="hidden sm:block text-xs text-slate-400 truncate">
                {activeItem?.subtitle}
              </p>
            </div>
          </div>

          {/* Right User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight max-w-[120px] sm:max-w-none truncate">
                {user?.name || 'Usuário'}
              </p>
              <p className="text-[10px] sm:text-[11px] font-semibold italic text-[#D92D3A] uppercase">
                {user?.role === 'MASTER' ? 'ADMINISTRATIVO' : 'ATENDIMENTO'}
              </p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#D92D3A] to-rose-400 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-sm shrink-0">
              {(user?.name || 'R').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Central Screen Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
