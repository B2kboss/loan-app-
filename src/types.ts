export type AppPage =
  | 'home'
  | 'loans'
  | 'about'
  | 'how-it-works'
  | 'faq'
  | 'contact'
  | 'auth'
  | 'apply'
  | 'dashboard'
  | 'wallet'
  | 'support'
  | 'profile'
  | 'privacy'
  | 'terms'
  | 'eligibility'
  | 'admin';

export interface User {
  id: number;
  fullName: string;
  mobile: string;
  email: string;
  role: 'user' | 'admin';
  mobileVerified: boolean;
  panMasked?: string;
  city?: string;
  state?: string;
  employmentType?: string;
  monthlyIncome?: number;
  createdAt?: string;
}

export interface LoanProduct {
  id: number;
  slug: string;
  title: string;
  amountInr: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  interestRateMonthly: number;
  aprPercent: number;
  processingFeeInr: number;
  eligibilitySummary: string;
  badgeLabel: string;
  features: string[];
  isActive: boolean;
}

export interface TimelineEntry {
  id: number;
  application_id: number;
  stage: string;
  label: string;
  note: string;
  actor: string;
  created_at: string;
}

export interface LoanApplication {
  id: number;
  applicationNumber: string;
  productId: number;
  productTitle: string;
  aprPercent: number;
  requestedAmount: number;
  tenureMonths: number;
  interestRateMonthly: number;
  processingFeeInr: number;
  gstInr: number;
  netDisbursalInr: number;
  monthlyEmiInr: number;
  totalRepayableInr: number;
  repaidAmountInr: number;
  status: string;
  statusLabel: string;
  stepData: {
    personal?: { fullName?: string; dob?: string; gender?: string; panMasked?: string };
    address?: { street?: string; city?: string; state?: string; pincode?: string; residenceType?: string };
    employment?: { employmentType?: string; employerName?: string; monthlyIncome?: number; purpose?: string };
    bank?: { bankName?: string; accountMasked?: string; ifsc?: string; accountHolderName?: string };
    consentAcceptedAt?: string;
  };
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEntry[];
}

export interface TransactionRecord {
  id: number;
  txnRef: string;
  applicationId: number;
  applicationNumber: string;
  amountInr: number;
  paymentMethod: 'upi' | 'gpay' | 'phonepe' | 'bank_transfer';
  payerHandle: string;
  gatewayMode: string;
  gatewayOrderId: string;
  status: 'pending' | 'verified_success' | 'failed';
  receipt: {
    receiptId?: string;
    txnRef?: string;
    orderId?: string;
    amountInr?: number;
    paymentMethod?: string;
    payerHandle?: string;
    gatewayMode?: string;
    status?: string;
    verifiedAt?: string;
    disclaimer?: string;
  };
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  ticketRef: string;
  userId?: number | null;
  name?: string;
  email?: string;
  mobile?: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  adminReply: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  user: User;
  metrics: {
    totalApplications: number;
    approvedAmountInr: number;
    totalRepayableInr: number;
    totalRepaidInr: number;
    remainingBalanceInr: number;
    unreadNotifications: number;
  };
  activeLoan: {
    id: number;
    applicationNumber: string;
    productTitle: string;
    requestedAmount: number;
    monthlyEmiInr: number;
    totalRepayableInr: number;
    repaidAmountInr: number;
    status: string;
    statusLabel: string;
  } | null;
  recentTransactions: Array<{
    id: number;
    txnRef: string;
    applicationId: number;
    amountInr: number;
    paymentMethod: string;
    gatewayMode: string;
    status: string;
    createdAt: string;
  }>;
}
