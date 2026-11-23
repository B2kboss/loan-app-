import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Briefcase,
  CreditCard,
  Headphones,
  Lock,
  LogOut,
  Package,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { apiRequest, formatInr, setAuthToken } from '../lib/api';
import type { AppPage, LoanProduct, SupportTicket, User } from '../types';

interface AdminDashboardProps {
  user: User | null;
  onAdminLogin: (adminUser: User) => void;
  onLogout: () => void;
  onNavigate: (page: AppPage) => void;
  onRefreshPublic: () => Promise<void>;
}

interface AdminAnalytics {
  totalUsers: number;
  verifiedUsers: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  disbursedApplications: number;
  rejectedApplications: number;
  totalDisbursedInr: number;
  totalRepaidInr: number;
  openTickets: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

interface AdminApplicationRow {
  id: number;
  applicationNumber: string;
  userId: number;
  applicantName: string;
  applicantMobile: string;
  applicantEmail: string;
  productTitle: string;
  requestedAmount: number;
  tenureMonths: number;
  monthlyEmiInr: number;
  netDisbursalInr: number;
  status: string;
  statusLabel: string;
  adminNotes: string;
  stepData: Record<string, Record<string, string | number>>;
  createdAt: string;
}

interface AdminTxnRow {
  id: number;
  txnRef: string;
  userName: string;
  userMobile: string;
  applicationNumber: string;
  amountInr: number;
  paymentMethod: string;
  gatewayMode: string;
  status: string;
  createdAt: string;
}

type AdminTab =
  | 'analytics'
  | 'applications'
  | 'users'
  | 'products'
  | 'transactions'
  | 'tickets'
  | 'notifications'
  | 'settings';

export const AdminDashboardView: React.FC<AdminDashboardProps> = ({
  user,
  onAdminLogin,
  onLogout,
  onNavigate,
  onRefreshPublic,
}) => {
  const [bootstrap, setBootstrap] = useState<{
    hasEnvPasscode: boolean;
    isClaimed: boolean;
    claimedEmailHint: string | null;
  } | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>('analytics');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [applications, setApplications] = useState<AdminApplicationRow[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [transactions, setTransactions] = useState<AdminTxnRow[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  // Action states
  const [selectedApp, setSelectedApp] = useState<AdminApplicationRow | null>(null);
  const [newStatus, setNewStatus] = useState('verification_in_progress');
  const [statusNote, setStatusNote] = useState('');
  const [ticketReplyMap, setTicketReplyMap] = useState<Record<number, string>>({});
  const [broadcastForm, setBroadcastForm] = useState({ userId: '', title: '', message: '' });
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      apiRequest<{ hasEnvPasscode: boolean; isClaimed: boolean; claimedEmailHint: string | null }>(
        '/api/admin/bootstrap-status'
      )
        .then(setBootstrap)
        .catch(() => {});
    }
  }, [isAdmin]);

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [an, apps, usrs, prods, txns, tks, sets] = await Promise.all([
        apiRequest<AdminAnalytics>('/api/admin/analytics'),
        apiRequest<AdminApplicationRow[]>('/api/admin/applications'),
        apiRequest<User[]>('/api/admin/users'),
        apiRequest<LoanProduct[]>('/api/admin/products'),
        apiRequest<AdminTxnRow[]>('/api/admin/transactions'),
        apiRequest<SupportTicket[]>('/api/admin/tickets'),
        apiRequest<Array<{ key: string; value: string }>>('/api/admin/settings'),
      ]);
      setAnalytics(an);
      setApplications(apps);
      setUsersList(usrs);
      setProducts(prods);
      setTransactions(txns);
      setTickets(tks);
      const map: Record<string, string> = {};
      for (const s of sets) map[s.key] = s.value;
      setSettingsMap(map);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadAdminData();
    }
  }, [isAdmin]);

  const handleClaimOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint =
        bootstrap && !bootstrap.hasEnvPasscode && !bootstrap.isClaimed
          ? '/api/admin/claim'
          : '/api/admin/login';
      const res = await apiRequest<{ token: string; admin: User }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      setAuthToken(res.token);
      onAdminLogin(res.admin);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateAppStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setActionMsg(null);
    try {
      await apiRequest(`/api/admin/applications/${selectedApp.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, note: statusNote }),
      });
      setSelectedApp(null);
      setStatusNote('');
      setActionMsg('Loan application status updated and user notified.');
      await loadAdminData();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleToggleUserVerified = async (u: User) => {
    await apiRequest(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ mobileVerified: !u.mobileVerified }),
    });
    await loadAdminData();
  };

  const handleSaveProduct = async (p: LoanProduct) => {
    await apiRequest(`/api/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: p.title,
        interestRateMonthly: p.interestRateMonthly,
        processingFeeInr: p.processingFeeInr,
        eligibilitySummary: p.eligibilitySummary,
        isActive: p.isActive,
      }),
    });
    setActionMsg(`Saved changes to ${p.title}.`);
    await Promise.all([loadAdminData(), onRefreshPublic()]);
  };

  const handleResolveTicket = async (t: SupportTicket, status: 'in_progress' | 'resolved') => {
    await apiRequest(`/api/admin/tickets/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminReply: ticketReplyMap[t.id] ?? t.adminReply }),
    });
    setActionMsg(`Ticket ${t.ticketRef} updated to ${status}.`);
    await loadAdminData();
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ count: number }>('/api/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        userId: broadcastForm.userId ? Number(broadcastForm.userId) : undefined,
        title: broadcastForm.title,
        message: broadcastForm.message,
      }),
    });
    setBroadcastForm({ userId: '', title: '', message: '' });
    setActionMsg(`Notification delivered to ${res.count} user(s).`);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: settingsMap }),
    });
    setActionMsg('Website settings saved.');
    await onRefreshPublic();
  };

  // ADMIN LOGIN / FIRST-RUN CLAIM GATE
  if (!isAdmin) {
    const isFirstRunClaim = Boolean(bootstrap && !bootstrap.hasEnvPasscode && !bootstrap.isClaimed);
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-[#071A4B] via-[#0D2B7A] to-[#0B1736] py-12 px-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-[#071A4B] px-6 py-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-[#10B981]" />
              <div>
                <h1 className="text-lg font-display font-bold">
                  {isFirstRunClaim ? 'Claim Admin Console' : 'Admin Console Sign In'}
                </h1>
                <p className="text-xs text-blue-200">India Loan Operations Portal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              aria-label="Back to site"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleClaimOrLogin} className="p-6 space-y-4">
            {isFirstRunClaim && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-[#0A215C] leading-relaxed">
                <strong>First-Run Admin Setup:</strong> No administrator password is set yet. Enter
                your admin email and choose a strong password (8+ characters) to claim ownership of
                this Admin Console.
              </div>
            )}

            {bootstrap?.claimedEmailHint && !bootstrap.hasEnvPasscode && (
              <p className="text-xs text-slate-500">
                Registered admin: <span className="font-mono-num">{bootstrap.claimedEmailHint}</span>
              </p>
            )}

            {authError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700">
                {authError}
              </div>
            )}

            {!bootstrap?.hasEnvPasscode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="admin@indialoan.in"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {bootstrap?.hasEnvPasscode ? 'Admin Passcode' : 'Admin Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={bootstrap?.hasEnvPasscode ? 1 : 8}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-[#0A215C] hover:bg-[#155EEF] text-white font-semibold text-sm min-h-[44px]"
            >
              {authLoading
                ? 'Authenticating...'
                : isFirstRunClaim
                ? 'Claim & Open Admin Panel'
                : 'Sign In to Admin Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'products', label: 'Loan Products', icon: Package },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'tickets', label: 'Support', icon: Headphones },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-20 md:pb-10">
      <div className="bg-[#071A4B] text-white px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#10B981]" />
            <div>
              <h1 className="text-lg font-display font-bold">India Loan Admin Console</h1>
              <p className="text-xs text-blue-200">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadAdminData()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold text-red-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[42px] ${
                    active
                      ? 'bg-[#0A215C] text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A215C]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9 space-y-5">
          {actionMsg && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800 font-medium">
              {actionMsg}
            </div>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && analytics && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Registered Users', val: analytics.totalUsers },
                  { label: 'Loan Applications', val: analytics.totalApplications },
                  { label: 'Pending Review', val: analytics.pendingApplications },
                  { label: 'Approved / Active', val: analytics.approvedApplications },
                  { label: 'Disbursed Loans', val: analytics.disbursedApplications },
                  { label: 'Rejected', val: analytics.rejectedApplications },
                  { label: 'Total Disbursed', val: formatInr(analytics.totalDisbursedInr) },
                  { label: 'Repayments Verified', val: formatInr(analytics.totalRepaidInr) },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs text-slate-500">{kpi.label}</p>
                    <p className="text-xl sm:text-2xl font-display font-extrabold text-[#0A215C] tabular-nums mt-1">
                      {kpi.val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="text-sm font-bold text-[#0A215C] mb-4">
                  Application Pipeline Distribution
                </h2>
                {analytics.statusBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500">No applications submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.statusBreakdown.map((item) => {
                      const pct = Math.round(
                        (item.count / Math.max(1, analytics.totalApplications)) * 100
                      );
                      return (
                        <div key={item.status} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold capitalize text-slate-700">
                              {item.status.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono-num text-slate-600">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#155EEF]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPLICATIONS */}
          {tab === 'applications' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
              <h2 className="text-base font-bold text-[#0A215C] mb-4">Loan Applications</h2>
              {applications.length === 0 ? (
                <p className="text-xs text-slate-500">No applications yet.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2.5 pr-3">App #</th>
                      <th className="py-2.5 pr-3">Applicant</th>
                      <th className="py-2.5 pr-3">Amount</th>
                      <th className="py-2.5 pr-3">Stage</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-3 font-mono-num font-bold text-[#155EEF]">
                          {a.applicationNumber}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-[#0A215C]">{a.applicantName}</p>
                          <p className="text-slate-500">+91 {a.applicantMobile}</p>
                        </td>
                        <td className="py-3 pr-3 font-mono-num font-bold">
                          {formatInr(a.requestedAmount)}
                        </td>
                        <td className="py-3 pr-3 font-semibold text-slate-700">{a.statusLabel}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedApp(a);
                              setNewStatus(a.status);
                              setStatusNote(a.adminNotes || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0A215C] text-white font-semibold hover:bg-[#155EEF]"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
              <h2 className="text-base font-bold text-[#0A215C] mb-4">Registered Users</h2>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2.5 pr-3">Name</th>
                    <th className="py-2.5 pr-3">Mobile</th>
                    <th className="py-2.5 pr-3">Email</th>
                    <th className="py-2.5 pr-3">Verified</th>
                    <th className="py-2.5 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 pr-3 font-semibold text-[#0A215C]">{u.fullName}</td>
                      <td className="py-3 pr-3 font-mono-num">+91 {u.mobile}</td>
                      <td className="py-3 pr-3 text-slate-600">{u.email}</td>
                      <td className="py-3 pr-3">{u.mobileVerified ? 'Yes' : 'Pending'}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleToggleUserVerified(u)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 font-semibold"
                        >
                          {u.mobileVerified ? 'Mark Unverified' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PRODUCTS */}
          {tab === 'products' && (
            <div className="space-y-4">
              {products.map((p, idx) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0A215C]">
                      {p.title} ({formatInr(p.amountInr)})
                    </h3>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={(e) => {
                          const next = [...products];
                          next[idx] = { ...p, isActive: e.target.checked };
                          setProducts(next);
                        }}
                      />
                      <span>Active</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={p.title}
                        onChange={(e) => {
                          const next = [...products];
                          next[idx] = { ...p, title: e.target.value };
                          setProducts(next);
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Monthly Rate (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={p.interestRateMonthly}
                        onChange={(e) => {
                          const next = [...products];
                          next[idx] = { ...p, interestRateMonthly: Number(e.target.value) };
                          setProducts(next);
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Processing Fee (₹)</label>
                      <input
                        type="number"
                        value={p.processingFeeInr}
                        onChange={(e) => {
                          const next = [...products];
                          next[idx] = { ...p, processingFeeInr: Number(e.target.value) };
                          setProducts(next);
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono-num"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveProduct(products[idx])}
                    className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold"
                  >
                    Save Product
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TRANSACTIONS */}
          {tab === 'transactions' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
              <h2 className="text-base font-bold text-[#0A215C] mb-4">Transaction Records</h2>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Method</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="py-2.5 pr-3 font-mono-num font-bold">{t.txnRef}</td>
                      <td className="py-2.5 pr-3">{t.userName}</td>
                      <td className="py-2.5 pr-3 uppercase">{t.paymentMethod}</td>
                      <td className="py-2.5 pr-3 font-mono-num font-bold">{formatInr(t.amountInr)}</td>
                      <td className="py-2.5 font-semibold">{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SUPPORT TICKETS */}
          {tab === 'tickets' && (
            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-xs text-slate-500">
                  No support tickets yet.
                </div>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 text-xs space-y-3">
                    <div className="flex justify-between">
                      <span className="font-mono-num font-bold text-[#155EEF]">{t.ticketRef}</span>
                      <span className="font-semibold capitalize">{t.status}</span>
                    </div>
                    <p className="font-bold text-[#0A215C] text-sm">{t.subject}</p>
                    <p className="text-slate-600">{t.message}</p>
                    <p className="text-slate-400">
                      From: {t.name} ({t.email})
                    </p>
                    <textarea
                      rows={2}
                      value={ticketReplyMap[t.id] ?? t.adminReply}
                      onChange={(e) => setTicketReplyMap({ ...ticketReplyMap, [t.id]: e.target.value })}
                      placeholder="Write reply to borrower..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleResolveTicket(t, 'in_progress')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold"
                      >
                        Mark In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResolveTicket(t, 'resolved')}
                        className="px-3 py-1.5 rounded-lg bg-[#10B981] text-white font-semibold"
                      >
                        Resolve & Send Reply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <form
              onSubmit={handleBroadcast}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-xs"
            >
              <h2 className="text-base font-bold text-[#0A215C]">Broadcast User Notification</h2>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Target User ID (leave blank to notify all users)
                </label>
                <input
                  type="number"
                  value={broadcastForm.userId}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, userId: e.target.value })}
                  placeholder="Optional user ID"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Message</label>
                <textarea
                  rows={3}
                  required
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#155EEF] text-white font-semibold"
              >
                <Send className="w-4 h-4" />
                <span>Send Notification</span>
              </button>
            </form>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 text-xs"
            >
              <h2 className="text-base font-bold text-[#0A215C]">Website & Compliance Settings</h2>
              {Object.entries(settingsMap).map(([key, val]) => (
                <div key={key}>
                  <label className="block font-semibold text-slate-600 mb-1">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setSettingsMap({ ...settingsMap, [key]: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5"
                  />
                </div>
              ))}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white font-semibold"
              >
                Save Website Settings
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Application Review Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleUpdateAppStatus}
            className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 text-xs"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-display font-bold text-[#0A215C]">
                  Review {selectedApp.applicationNumber}
                </h3>
                <p className="text-slate-500">
                  {selectedApp.applicantName} · {formatInr(selectedApp.requestedAmount)} (
                  {selectedApp.tenureMonths} mo)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                Close
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p>
                <strong>PAN:</strong> {String(selectedApp.stepData?.personal?.panMasked || 'N/A')} ·{' '}
                <strong>City:</strong> {String(selectedApp.stepData?.address?.city || '')}
              </p>
              <p>
                <strong>Employment:</strong>{' '}
                {String(selectedApp.stepData?.employment?.employmentType || '')} (₹
                {String(selectedApp.stepData?.employment?.monthlyIncome || 0)}/mo)
              </p>
              <p>
                <strong>Bank:</strong> {String(selectedApp.stepData?.bank?.bankName || '')} ·{' '}
                {String(selectedApp.stepData?.bank?.accountMasked || '')} ·{' '}
                {String(selectedApp.stepData?.bank?.ifsc || '')}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Update Stage</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-white"
              >
                <option value="application_submitted">Application Submitted</option>
                <option value="verification_in_progress">Verification in Progress</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="disbursement_pending">Disbursement Pending</option>
                <option value="disbursed">Disbursed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reviewer Note</label>
              <textarea
                rows={2}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Note shown in borrower timeline..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#10B981] text-white font-semibold"
              >
                Save Stage
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
