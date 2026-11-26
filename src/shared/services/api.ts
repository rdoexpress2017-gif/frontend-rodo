import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

let isHandlingUnauthorized = false;

export const resetUnauthorizedLock = (): void => {
  isHandlingUnauthorized = false;
};

api.interceptors.request.use((config) => {
  const rawAuth = localStorage.getItem('rodo_auth');
  if (rawAuth) {
    try {
      const parsed = JSON.parse(rawAuth);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch {
      // ignore invalid storage
    }
  }
  return config;
});

export const handleUnauthorizedResponseError = (error: AxiosError): Promise<never> => {
  const status = error?.response?.status;
  const requestUrl = error?.config?.url ?? '';
  const isLoginRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/login');

  if (status === 401 && !isLoginRequest) {
    if (!isHandlingUnauthorized) {
      isHandlingUnauthorized = true;

      // 1. Limpa dados locais de autenticação
      localStorage.removeItem('rodo_auth');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // 2. Dispara evento global para limpar AuthContext / exibir aviso
      window.dispatchEvent(new CustomEvent('auth:session-expired'));

      // 3. Redireciona para o login preservando a rota atual (se não estiver já no /login)
      if (!window.location.pathname.startsWith('/login')) {
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?expired=true&redirect=${returnTo}`);
      }
    }

    // Retorna uma promise pendente para evitar "Uncaught (in promise) AxiosError" durante o redirect
    return new Promise<never>(() => {});
  }

  return Promise.reject(error);
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => handleUnauthorizedResponseError(error)
);

export const formatCurrency = (value?: number | null): string => {
  const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateShort = (iso?: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};
