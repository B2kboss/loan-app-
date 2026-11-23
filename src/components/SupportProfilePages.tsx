import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Headphones,
  LogOut,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { apiRequest, formatInr } from '../lib/api';
import type { AppPage, LoanProduct, SupportTicket, User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

/* ---------------- CUSTOMER SUPPORT ---------------- */
export const SupportCenterView: React.FC<{
  user: User | null;
  settings: Record<string, string>;
  onNavigate: (page: AppPage) => void;
}> = ({ user, settings, onNavigate }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Loan Status');
  const [message, setMessage] = useState('');
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    try {
      const data = await apiRequest<SupportTicket[]>('/api/support/tickets');
      setTickets(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadTickets();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await apiRequest<{ ticketRef: string }>('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ name, email, mobile, subject, category, message }),
      });
      setStatusMsg(`Ticket ${res.ticketRef} created. Our team will respond via your dashboard.`);
      setSubject('');
      setMessage('');
      await loadTickets();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Unable to submit ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-24 md:pb-12">
      <div className="bg-gradient-to-r from-[#071A4B] to-[#155EEF] text-white px-4 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Headphones className="w-6 h-6 text-emerald-300" />
            <div>
              <h1 className="text-xl font-display font-bold">Customer Support & Grievance Desk</h1>
              <p className="text-xs text-blue-100">
                Transparent complaint handling and direct assistance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('faq')}
            className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            View FAQ
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <img
              src="/src/assets/images/support_specialist_1795455755759.jpg"
              alt="Support Advisor"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
            />
            <div>
              <h2 className="text-base font-display font-bold text-[#0A215C]">Raise a Support Ticket</h2>
              <p className="text-xs text-slate-500">
                {settings.support_email || 'support@indialoan.in'} ·{' '}
                {settings.support_phone || '+91 1800-000-2407'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white"
                >
                  <option>Loan Status</option>
                  <option>EMI & Repayment</option>
                  <option>KYC Verification</option>
                  <option>Grievance Redressal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Details</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or issue clearly..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>

            {statusMsg && (
              <p className="text-xs bg-blue-50 text-[#0A215C] rounded-xl px-3.5 py-2.5">{statusMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit Ticket'}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-display font-bold text-[#0A215C] mb-3">
              Your Support Tickets
            </h2>
            {!user ? (
              <p className="text-xs text-slate-500">
                Log in to track your support tickets and read official team replies.
              </p>
            ) : tickets.length === 0 ? (
              <p className="text-xs text-slate-500">No support tickets raised yet.</p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-200 p-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-num font-bold text-[#155EEF]">{t.ticketRef}</span>
                      <span className="font-semibold capitalize text-slate-700">
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="font-bold text-[#0A215C] mt-1">{t.subject}</p>
                    <p className="text-slate-600 mt-1">{t.message}</p>
                    {t.adminReply && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-emerald-800 bg-emerald-50/60 rounded-xl p-2.5">
                        <strong>Team Reply:</strong> {t.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-xs text-slate-600 space-y-2">
            <h3 className="text-sm font-bold text-[#0A215C]">Escalation & Grievance Redressal</h3>
            <p>{settings.grievance_officer || 'Nodal Grievance Desk · grievance@indialoan.in'}</p>
            <p className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#155EEF]" />
              <span>{settings.support_phone || '+91 1800-000-2407'} (Mon–Sat, 9:30 AM – 6:30 PM IST)</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#155EEF]" />
              <span>{settings.support_email || 'support@indialoan.in'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- USER PROFILE ---------------- */
export const ProfileView: React.FC<{
  user: User;
  onUpdated: (user: User) => void;
  onLogout: () => void;
}> = ({ user, onUpdated, onLogout }) => {
  const [form, setForm] = useState({
    fullName: user.fullName || '',
    email: user.email || '',
    city: user.city || '',
    state: user.state || '',
    employmentType: user.employmentType || '',
    monthlyIncome: String(user.monthlyIncome || ''),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          monthlyIncome: Number(form.monthlyIncome) || 0,
        }),
      });
      onUpdated(res.user);
      setMsg('Profile updated successfully.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-24 md:pb-12">
      <div className="bg-gradient-to-r from-[#071A4B] to-[#0D2B7A] text-white px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">{user.fullName}</h1>
              <p className="text-xs text-blue-100">
                +91 {user.mobile} · {user.mobileVerified ? 'Verified Mobile' : 'Unverified Mobile'}
              </p>
            </div>
          </div>
          <PWAInstallButton compact />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-5">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4"
        >
          <h2 className="text-base font-display font-bold text-[#0A215C]">Profile Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment</label>
              <input
                type="text"
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Income (₹)</label>
              <input
                type="number"
                value={form.monthlyIncome}
                onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num"
              />
            </div>
          </div>

          {user.panMasked && (
            <p className="text-xs text-slate-500">
              KYC PAN on file: <span className="font-mono-num font-semibold">{user.panMasked}</span>
            </p>
          )}

          {msg && <p className="text-xs text-[#155EEF] font-medium">{msg}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#155EEF] hover:bg-[#0D2B7A] text-white text-sm font-semibold min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold min-h-[44px]"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------------- INFORMATIONAL PAGES (About, Eligibility, Privacy, Terms, Loans Catalog) ---------------- */
export const InfoPageView: React.FC<{
  page: 'about' | 'eligibility' | 'privacy' | 'terms' | 'loans' | 'how-it-works' | 'faq' | 'contact';
  products: LoanProduct[];
  loadingProducts?: boolean;
  onRetryProducts?: () => void;
  settings: Record<string, string>;
  onApplyProduct: (p: LoanProduct) => void;
  onNavigate: (page: AppPage) => void;
}> = ({ page, products, loadingProducts = false, onRetryProducts, settings, onApplyProduct, onNavigate }) => {
  const [loanFilter, setLoanFilter] = useState<'all' | 'popular' | 'higher'>('all');

  const filteredProducts = products.filter((pkg) => {
    if (loanFilter === 'popular') return pkg.amountInr <= 10000;
    if (loanFilter === 'higher') return pkg.amountInr >= 10000;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-24 md:pb-12">
      <div className="bg-gradient-to-r from-[#071A4B] to-[#0D2B7A] text-white px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold capitalize">
              {page === 'about' && 'About India Loan'}
              {page === 'eligibility' && 'Loan Eligibility Criteria'}
              {page === 'privacy' && 'Privacy Policy'}
              {page === 'terms' && 'Terms & Conditions'}
              {page === 'loans' && 'Loan Packages'}
              {page === 'how-it-works' && 'How India Loan Works'}
              {page === 'faq' && 'Frequently Asked Questions'}
              {page === 'contact' && 'Contact India Loan'}
            </h1>
            <p className="text-xs text-blue-100/80">
              {page === 'loans'
                ? 'Choose the best plan for your needs'
                : 'India Loan · Your Dreams, Our Support'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-5 space-y-5">
        {page === 'loans' && (
          <div className="space-y-4">
            {/* Segmented Filter Tabs matching reference mobile app */}
            <div className="inline-flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
              {[
                { id: 'all' as const, label: 'All Plans' },
                { id: 'popular' as const, label: 'Popular' },
                { id: 'higher' as const, label: 'Higher Amount' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLoanFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[38px] ${
                    loanFilter === tab.id
                      ? 'bg-[#155EEF] text-white'
                      : 'text-slate-600 hover:text-[#0A215C]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingProducts && products.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                <p className="text-sm font-semibold text-[#0A215C]">No loan packages loaded yet.</p>
                {onRetryProducts && (
                  <button
                    type="button"
                    onClick={onRetryProducts}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#155EEF] text-white text-xs font-semibold"
                  >
                    Reload Packages
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredProducts.map((pkg) => {
                  const gst = Math.round(pkg.processingFeeInr * 0.18);
                  return (
                    <div
                      key={pkg.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#155EEF]">{pkg.badgeLabel || 'Personal Plan'}</span>
                          <span className="text-slate-500 tabular-nums">
                            {pkg.minTenureMonths}–{pkg.maxTenureMonths} Months
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between gap-2">
                          <h2 className="text-3xl font-display font-extrabold text-[#0A215C] tabular-nums">
                            {formatInr(pkg.amountInr)}
                          </h2>
                          <span className="text-xs font-medium text-slate-500 tabular-nums">
                            {pkg.interestRateMonthly}%/mo ({pkg.aprPercent}% APR)
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{pkg.title}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
                          <div className="flex justify-between">
                            <span>Upfront Activation Deposit</span>
                            <span className="font-bold text-[#10B981]">₹0 (None)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Processing Fee (at disbursal)</span>
                            <span className="font-semibold text-slate-900 tabular-nums">
                              {formatInr(pkg.processingFeeInr)} + {formatInr(gst)} GST
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 bg-slate-50 rounded-xl p-2.5">
                          {pkg.eligibilitySummary}
                        </p>
                        <ul className="mt-3 space-y-1.5 text-xs text-slate-700">
                          {pkg.features.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyProduct(pkg)}
                        className="mt-5 w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm min-h-[44px]"
                      >
                        Apply Now →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {page === 'about' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 text-sm text-slate-700 leading-relaxed">
            <img
              src="/src/assets/images/about_india_fintech_1795455755505.jpg"
              alt="About India Loan"
              referrerPolicy="no-referrer"
              className="w-full h-64 object-cover rounded-2xl border border-slate-200"
            />
            <h2 className="text-xl font-display font-bold text-[#0A215C]">
              Built for Transparent Short-Term Personal Credit
            </h2>
            <p>
              India Loan provides structured personal loans of ₹5,000, ₹10,000, and ₹15,000 with
              clear Key Fact Statements before borrowers accept terms. We prioritize fair practices,
              minimal required KYC collection, and real-time stage tracking.
            </p>
            <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 text-xs">
              <strong className="text-[#0A215C]">Regulatory & Partner Notice:</strong>{' '}
              {settings.lending_partner_notice}
            </div>
          </div>
        )}

        {page === 'eligibility' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-slate-700">
            <h2 className="text-xl font-display font-bold text-[#0A215C]">
              Standard Eligibility Requirements
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-1 shrink-0" />
                <span>Indian resident aged 21 to 58 years at the time of application.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-1 shrink-0" />
                <span>Valid 10-character PAN and active +91 mobile number verified by OTP.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-1 shrink-0" />
                <span>Verifiable monthly income: ₹12,000+ (₹5,000 plan), ₹18,000+ (₹10,000 plan), ₹25,000+ (₹15,000 plan).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-1 shrink-0" />
                <span>Active Indian bank account with valid 11-character IFSC for disbursal.</span>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => onApplyProduct(products[0])}
              className="mt-4 px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold"
            >
              Start Application
            </button>
          </div>
        )}

        {page === 'privacy' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
            <div className="flex items-center gap-2 text-[#0A215C]">
              <ShieldCheck className="w-5 h-5 text-[#10B981]" />
              <h2 className="text-xl font-display font-bold">Data Privacy & Security Policy</h2>
            </div>
            <p>
              India Loan collects only necessary identity, address, employment, and bank payout
              information required for credit underwriting and EMI servicing, strictly with your
              explicit digital consent.
            </p>
            <p>
              Passwords are salted and hashed with scrypt. PAN numbers and bank account numbers are
              masked prior to database persistence. We never sell personal borrower data to
              unauthorized third parties.
            </p>
            <p className="text-xs text-slate-500">
              Data requests & grievances: {settings.grievance_officer || 'grievance@indialoan.in'}
            </p>
          </div>
        )}

        {page === 'terms' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-display font-bold text-[#0A215C]">
              Terms & Conditions of Service
            </h2>
            <p>
              All loan offers are subject to KYC verification and credit review. India Loan does
              not charge upfront activation deposits. Processing fees and applicable GST are
              disclosed in the Key Fact Statement before submission and deducted at disbursal.
            </p>
            <p>
              Repayments processed in Sandbox Gateway mode are test transactions for platform
              demonstration and verification; no live bank debits occur unless a verified
              production gateway is configured.
            </p>
          </div>
        )}

        {page === 'how-it-works' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 text-sm text-slate-700">
            <h2 className="text-xl font-display font-bold text-[#0A215C]">
              Four Transparent Steps
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { step: '01', title: 'Sign Up & Verify Mobile', desc: 'Register with your +91 mobile number and confirm via 6-digit OTP.' },
                { step: '02', title: '5-Step Digital KYC', desc: 'Complete Personal, Address, Employment, Bank, and Review steps.' },
                { step: '03', title: 'Key Fact Statement', desc: 'Inspect your exact EMI, APR, processing fee, and net disbursal before submitting.' },
                { step: '04', title: 'Track & Repay', desc: 'Monitor all 6 approval stages live and pay EMIs via Sandbox UPI in your Wallet.' },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                  <p className="font-mono-num text-xs font-bold text-[#155EEF]">{item.step}</p>
                  <h3 className="text-base font-bold text-[#0A215C] mt-1">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onApplyProduct(products[0])}
              className="px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-semibold"
            >
              Apply Now
            </button>
          </div>
        )}

        {page === 'faq' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-slate-700">
            <h2 className="text-xl font-display font-bold text-[#0A215C]">
              Frequently Asked Questions
            </h2>
            {[
              {
                q: 'Are there any upfront deposit fees?',
                a: 'No. India Loan never charges upfront deposits to unlock or activate a loan. Applicable processing fees and GST are deducted transparently at disbursal.',
              },
              {
                q: 'What loan amounts are available?',
                a: 'Starter ₹5,000, Flexi ₹10,000, and Growth ₹15,000 personal loans with 3 to 12 month tenures.',
              },
              {
                q: 'How are repayments tested?',
                a: 'The Wallet supports UPI, Google Pay, PhonePe, and Bank Transfer in Sandbox Gateway Mode with HMAC-verified receipts.',
              },
            ].map((item) => (
              <div key={item.q} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-[#0A215C]">{item.q}</h3>
                <p className="text-xs text-slate-600 mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        )}

        {page === 'contact' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 text-sm text-slate-700">
            <h2 className="text-xl font-display font-bold text-[#0A215C]">Contact India Loan</h2>
            <p>Email: {settings.support_email || 'support@indialoan.in'}</p>
            <p>Helpline: {settings.support_phone || '+91 1800-000-2407'}</p>
            <p>Office: {settings.company_address || 'Connaught Place Financial Centre, New Delhi 110001'}</p>
            <button
              type="button"
              onClick={() => onNavigate('support')}
              className="px-5 py-2.5 rounded-xl bg-[#155EEF] text-white text-xs font-semibold"
            >
              Open Support Ticket Desk
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
