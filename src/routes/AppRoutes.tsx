import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { AppShellLayout } from '../shared/components/AppShellLayout';
import { LoginScreen } from '../screens/login/LoginScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { ClientsScreen } from '../screens/clients/ClientsScreen';
import { MotoboysScreen } from '../screens/motoboys/MotoboysScreen';
import { FinancialScreen } from '../screens/financial/FinancialScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { UsersScreen } from '../screens/users/UsersScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

export const AppRoutes: React.FC = () => {
  const { user, isMaster } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShellLayout />}>
        {/* Main default landing screen is Pedidos as requested */}
        <Route path="/" element={<Navigate to="/pedidos" replace />} />
        <Route path="/pedidos" element={<OrdersScreen />} />
        <Route path="/clientes" element={<ClientsScreen />} />
        <Route path="/motoboys" element={<MotoboysScreen />} />
        <Route path="/financeiro" element={<FinancialScreen />} />
        <Route path="/relatorios" element={<ReportsScreen />} />
        {isMaster && <Route path="/usuarios" element={<UsersScreen />} />}
        {isMaster && <Route path="/configuracoes" element={<SettingsScreen />} />}
        <Route path="*" element={<Navigate to="/pedidos" replace />} />
      </Route>
    </Routes>
  );
};
