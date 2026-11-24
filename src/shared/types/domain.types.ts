export type UserRole = 'MASTER' | 'ATENDENTE';

export type BillingCycleType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type DayOfWeekEnum =
  | 'SEGUNDA'
  | 'TERCA'
  | 'QUARTA'
  | 'QUINTA'
  | 'SEXTA'
  | 'SABADO'
  | 'DOMINGO';

export type MotoboyType = 'FIXO' | 'TERCEIRIZADO';

export type OrderStatus =
  | 'PENDENTE'
  | 'COLETADO'
  | 'ENTREGUE'
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'CANCELADO';

export type PaymentOrderStatus = 'AGUARDANDO_PAGAMENTO' | 'PAGO';

export type ReportType = 'CLIENTE' | 'MOTOBOY' | 'MASTER' | 'EMPRESA';

export interface AuthUser {
  token: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AddressDTO {
  street: string;
  number: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
}

export interface BillingCycleDTO {
  type: BillingCycleType;
  startDayOfWeek?: DayOfWeekEnum;
  endDayOfWeek?: DayOfWeekEnum;
}

export interface ClientDTO {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  baseAddress: AddressDTO;
  billingCycle: BillingCycleDTO;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MotoboyDTO {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  type: MotoboyType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  motoboyId: string;
  motoboyName: string;
  requesterName?: string;
  createdByUserId: string;
  createdByUserName: string;
  originAddress: AddressDTO;
  destinationAddress: AddressDTO;
  routeDistanceKm: number;
  amount: number;
  motoboyCommissionAmount: number;
  status: OrderStatus;
  paymentOrderId?: string;
  createdAt: string;
  collectedAt?: string;
  deliveredAt?: string;
  paidAt?: string;
  updatedAt: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaymentOrderDTO {
  id: string;
  reportId: string;
  clientId: string;
  clientName: string;
  orderIds: string[];
  totalAmount: number;
  status: PaymentOrderStatus;
  issueDate: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummaryDTO {
  totalRevenue: number;
  totalCommissions: number;
  companyShare: number;
  collaboratorShare: number;
  totalOrders: number;
  netBalance: number;
  totalExpenses?: number;
  paidRevenue?: number;
  pendingRevenue?: number;
  paidCommissions?: number;
  paidOrdersCount?: number;
  pendingOrdersCount?: number;
}

export interface ExpenseDTO {
  id: string;
  expenseDate: string;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRequestDTO {
  expenseDate: string;
  amount: number;
  description: string;
}

export interface MotoboyReportAggregateDTO {
  motoboyId: string;
  motoboyName: string;
  motoboyType: string;
  totalOrders: number;
  totalDistanceKm: number;
  grossAmount: number;
  amountToPay: number;
}

export interface CompanyReportSummaryDTO {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  netProfit: number;
  totalCommissions: number;
  paidCommissions: number;
  totalExpenses: number;
  collaboratorShare: number;
  totalOrders: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  motoboyAggregates: MotoboyReportAggregateDTO[];
  totalMotoboysAmountToPay: number;
  emailSentToMaster?: boolean;
  masterEmailRecipient?: string;
}

export interface ReportDTO {
  id: string;
  reportCode: string;
  type: ReportType;
  targetEntityId?: string;
  targetEntityName: string;
  targetEntitySubtype: string;
  orderIds: string[];
  periodStart: string;
  periodEnd: string;
  totalOrders: number;
  totalAmount: number;
  totalDistanceKm: number;
  paymentOrderId?: string;
  paymentOrderStatus?: PaymentOrderStatus;
  generatedByUserId: string;
  generatedByUserName?: string;
  createdAt: string;
  updatedAt?: string;
  companySummary?: CompanyReportSummaryDTO;
}

export interface ReportDetailDTO {
  report: ReportDTO;
  orders: OrderDTO[];
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettingsDTO {
  id: string;
  pricePerKm: number;
  baseRate: number;
  defaultMotoboyCommissionPercentage: number;
  updatedByUserId: string;
  updatedAt: string;
  dailyJobExecutedToday?: boolean;
  lastDailyJobExecutionDate?: string;
  dailyJobExecutionTime?: string;
}
