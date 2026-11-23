import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bell,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Headphones,
  Plus,
  RefreshCw,
  ShieldAlert,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { apiRequest, formatInr } from '../lib/api';
import type {
  AppPage,
  DashboardSummary,
  LoanApplication,
  LoanProduct,
  NotificationItem,
} from '../types';

interface DashboardProps {
  summary: DashboardSummary | null;
  applications: LoanApplication[];
  products: LoanProduct[];
  notifications: NotificationItem[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onApplyProduct: (product: LoanProduct) => void;
  onNavigate: (page: AppPage) => void;
}

const TRACKING_STAGES = [
  { key: 'application_submitted', label: 'Application Submitted' },
  { key: 'verification_in_progress', label: 'Verification in Progress' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'disbursement_pending', label: 'Disbursement Pending' },
  { key: 'disbursed', label: 'Disbursed' },
];

export const DashboardView: React.FC<DashboardProps> = ({
  summary,
  applications,
  products,
  notifications,
  loading,
  onRefresh,
  onApplyProduct,
  onNavigate,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<number | null>(
    applications[0]?.id ?? null
  );
  const [otpInput, setOtpInput] = useState('');
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);

  const activeApp =
    applications.find((a) => a.id === selectedAppId) || applications[0] || null;

  const handleSendMobileOtp = async () => {
    if (!summary?.user?.mobile) return;
    setOtpMsg(null);
    try {
      const res = await apiRequest<{ sandboxOtpPreview?: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ mobile: summary.user.mobile, purpose: 'mobile_verify' }),
      });
      setSandboxOtp(res.sandboxOtpPreview || null);
      setOtpMsg('6-digit OTP generated for your mobile number.');
    } catch (err) {
      setOtpMsg(err instanceof Error ? err.message : 'Unable to send OTP.');
    }
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.user?.mobile) return;
    try {
      await apiRequest('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          mobile: summary.user.mobile,
          code: otpInput,
          purpose: 'mobile_verify',
        }),
      });
      setOtpInput('');
      setSandboxOtp(null);
      setOtpMsg('Mobile number verified.');
      await onRefresh();
    } catch (err) {
      setOtpMsg(err instanceof Error ? err.message : 'Verification failed.');
    }
  };

  const handleMarkRead = async (id: number) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await onRefresh();
  };

  const handleMarkAllRead = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'POST' });
    await onRefresh();
  };

  if (loading && !summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-36 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-36 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="h-36 rounded-2xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  const user = summary?.user;
  const metrics = summary?.metrics;

  // Chart calculations for repayment progress donut
  const totalRepayable = metrics?.totalRepayableInr || 0;
  const totalRepaid = metrics?.totalRepaidInr || 0;
  const repaidPercent =
    totalRepayable > 0 ? Math.min(100, Math.round((totalRepaid / totalRepayable) * 100)) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (repaidPercent / 100) * circumference;

  const currentStageIndex = activeApp
    ? TRACKING_STAGES.findIndex((s) => s.key === activeApp.status)
    : -1;

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-24 md:pb-12">
      {/* App-Style Deep Navy Hero Header */}
      <div className="bg-gradient-to-br from-[#071A4B] via-[#0D2B7A] to-[#155EEF] text-white pt-6 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-blue-200">Welcome back</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold mt-0.5">
                Hello, {user?.fullName?.split(' ')[0] || 'Borrower'}
              </h1>
              <p className="text-xs text-blue-100/80 mt-1">
                +91 {user?.mobile} ·{' '}
                {user?.mobileVerified ? 'Mobile Verified' : 'Mobile Verification Pending'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Primary Featured Card (Matching Reference App Dashboard) */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 p-5 sm:p-6 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-blue-200 font-medium">Available Credit Plans</p>
                  <p className="text-3xl sm:text-4xl font-display font-extrabold tabular-nums mt-1">
                    Up to {formatInr(15000)}
                  </p>
                  <p className="text-xs text-blue-100/80 mt-1">
                    Approved Total: {formatInr(metrics?.approvedAmountInr || 0)} · Balance:{' '}
                    {formatInr(metrics?.remainingBalanceInr || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onApplyProduct(products[0])}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm shadow-lg transition-colors min-h-[44px] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply Now</span>
                </button>
              </div>

              {/* 4 Quick Action Tiles */}
              <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'My Loans', icon: Briefcase, page: 'loans' as AppPage },
                  { label: 'Repayment', icon: CreditCard, page: 'wallet' as AppPage },
                  { label: 'Support', icon: Headphones, page: 'support' as AppPage },
                  { label: 'Profile', icon: UserIcon, page: 'profile' as AppPage },
                ].map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.label}
                      type="button"
                      onClick={() => onNavigate(qa.page)}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 py-3 px-2 transition-colors min-h-[64px]"
                    >
                      <Icon className="w-4 h-4 text-emerald-300" />
                      <span className="text-[11px] font-medium text-white whitespace-nowrap">
                        {qa.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Repayment Analytics Card */}
            <div className="lg:col-span-5 rounded-3xl bg-white text-[#0A215C] p-5 sm:p-6 shadow-xl flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">Repayment Progress</p>
                <p className="text-2xl font-display font-extrabold tabular-nums mt-1">
                  {formatInr(totalRepaid)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  of {formatInr(totalRepayable)} total repayable
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('wallet')}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#155EEF] hover:underline"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Pay EMI via Sandbox UPI</span>
                </button>
              </div>

              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute text-sm font-mono-num font-bold text-[#0A215C]">
                  {repaidPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 space-y-6">
        {/* Pending Mobile Verification Banner */}
        {user && !user.mobileVerified && (
          <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0A215C]">Verify Your Mobile Number</h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Complete OTP verification for +91 {user.mobile} to strengthen account security.
                  </p>
                  {sandboxOtp && (
                    <p className="text-xs text-[#155EEF] font-semibold mt-1">
                      Sandbox OTP Code: <span className="font-mono-num">{sandboxOtp}</span>
                    </p>
                  )}
                  {otpMsg && <p className="text-xs text-slate-700 mt-1">{otpMsg}</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendMobileOtp}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
                >
                  Send OTP
                </button>
                <form onSubmit={handleVerifyMobileOtp} className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit OTP"
                    className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold min-h-[40px]"
                  >
                    Verify
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Loan Tracker + Notifications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Loan Applications & Visual 6-Stage Tracker */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0A215C]">
                  Loan Status & Live Tracking
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time progress synced directly from backend verification records
                </p>
              </div>
              {applications.length > 1 && (
                <select
                  value={activeApp?.id || ''}
                  onChange={(e) => setSelectedAppId(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#0A215C]"
                >
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.applicationNumber} ({formatInr(a.requestedAmount)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeApp ? (
              <div>
                <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-num font-semibold text-[#155EEF]">
                        {activeApp.applicationNumber}
                      </span>
                      <span>·</span>
                      <span>{activeApp.productTitle}</span>
                    </div>
                    <p className="text-2xl font-display font-extrabold text-[#0A215C] tabular-nums mt-1">
                      {formatInr(activeApp.requestedAmount)}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                      EMI: {formatInr(activeApp.monthlyEmiInr)}/mo · {activeApp.tenureMonths} months ·
                      Net Disbursal: {formatInr(activeApp.netDisbursalInr)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-lg ${
                        activeApp.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : activeApp.status === 'disbursed' || activeApp.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-blue-50 text-[#155EEF]'
                      }`}
                    >
                      {activeApp.statusLabel}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">
                      Repaid: {formatInr(activeApp.repaidAmountInr)} /{' '}
                      {formatInr(activeApp.totalRepayableInr)}
                    </p>
                  </div>
                </div>

                {/* Visual 6-Stage Pipeline */}
                {activeApp.status === 'rejected' ? (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-800">
                    <p className="font-bold">Application Declined</p>
                    <p className="mt-1">
                      {activeApp.adminNotes ||
                        'Your application did not meet current credit criteria. Contact support for clarification.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {TRACKING_STAGES.map((stage, idx) => {
                      const isDone = currentStageIndex >= idx;
                      const isCurrent = currentStageIndex === idx;
                      const matchingLog = activeApp.timeline.find((t) => t.stage === stage.key);
                      return (
                        <div key={stage.key} className="flex items-start gap-3.5">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                isDone
                                  ? 'bg-[#10B981] text-white'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                            >
                              {isDone ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            </div>
                            {idx < TRACKING_STAGES.length - 1 && (
                              <div
                                className={`w-0.5 h-6 mt-1 ${
                                  currentStageIndex > idx ? 'bg-[#10B981]' : 'bg-slate-200'
                                }`}
                              />
                            )}
                          </div>
                          <div className="pt-0.5">
                            <p
                              className={`text-sm font-semibold ${
                                isDone ? 'text-[#0A215C]' : 'text-slate-400'
                              }`}
                            >
                              {stage.label}
                            </p>
                            {matchingLog ? (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {matchingLog.note} ·{' '}
                                <span className="font-mono-num">
                                  {new Date(matchingLog.created_at).toLocaleDateString('en-IN')}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 mt-0.5">Pending</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 px-4 bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-300">
                <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#0A215C]">No Loan Applications Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Select a package from ₹5,000 to ₹15,000 and complete the 5-step digital KYC form to
                  track your application here.
                </p>
                <button
                  type="button"
                  onClick={() => onApplyProduct(products[0])}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold"
                >
                  <span>Start Loan Application</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Notifications & Available Packages */}
          <div className="lg:col-span-5 space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#155EEF]" />
                  <h2 className="text-base font-display font-bold text-[#0A215C]">Notifications</h2>
                </div>
                {notifications.some((n) => !n.isRead) && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-[#155EEF] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No notifications yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && void handleMarkRead(n.id)}
                      className={`rounded-xl p-3 border text-xs transition-colors cursor-pointer ${
                        n.isRead
                          ? 'bg-white border-slate-100 text-slate-600'
                          : 'bg-blue-50/70 border-blue-200 text-[#0A215C]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold">{n.title}</p>
                        {!n.isRead && <span className="text-[10px] font-semibold text-[#155EEF]">New</span>}
                      </div>
                      <p className="mt-1 text-slate-600 leading-snug">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Loan Products Quick List */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
              <h2 className="text-base font-display font-bold text-[#0A215C] mb-3">
                Available Loan Products
              </h2>
              <div className="space-y-2.5">
                {products.map((p) => (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -1 }}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3.5 hover:border-[#155EEF] transition-colors"
                  >
                    <div>
                      <p className="text-base font-display font-extrabold text-[#0A215C] tabular-nums">
                        {formatInr(p.amountInr)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.title} · {p.interestRateMonthly}%/mo · {p.minTenureMonths}–{p.maxTenureMonths} mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyProduct(p)}
                      className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold whitespace-nowrap min-h-[40px]"
                    >
                      Apply
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
