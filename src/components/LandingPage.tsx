import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  Headphones,
  Lock,
  Play,
  Send,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { apiRequest, formatInr } from '../lib/api';
import type { AppPage, LoanProduct } from '../types';
import { IndiaLoanLogo } from './IndiaLoanLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface LandingPageProps {
  products: LoanProduct[];
  loadingProducts?: boolean;
  onRetryProducts?: () => void;
  settings: Record<string, string>;
  onApplyProduct: (product: LoanProduct) => void;
  onNavigate: (page: AppPage, sectionId?: string) => void;
}

const FAQS = [
  {
    q: 'How long does the application and verification process take?',
    a: 'Submitting the 5-step digital application takes under 5 minutes. Verification timelines depend on KYC document checks and bank account validation, with every stage visible live in your Loan Tracker.',
  },
  {
    q: 'Are there any upfront deposit fees required to activate a loan?',
    a: 'No. India Loan never asks for upfront deposits to unlock or activate a loan. Any applicable processing fee and GST are transparently displayed in your Key Fact Statement prior to acceptance.',
  },
  {
    q: 'What are the basic eligibility requirements?',
    a: 'Applicants must be Indian residents aged 21 to 58 years with a valid PAN, Aadhaar-linked mobile number, active Indian bank account with IFSC, and verifiable monthly income starting from ₹12,000.',
  },
  {
    q: 'How can I repay my monthly EMIs?',
    a: 'You can pay EMIs directly from the Wallet section using UPI, Google Pay, PhonePe, or Bank Transfer. Currently the platform runs in verified Sandbox Gateway mode for safe end-to-end testing.',
  },
  {
    q: 'How is my personal and banking data protected?',
    a: 'All traffic uses TLS encryption, passwords are salted and hashed via scrypt, and sensitive identifiers like PAN and bank account numbers are masked upon submission.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  products,
  loadingProducts = false,
  onRetryProducts,
  settings,
  onApplyProduct,
  onNavigate,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [eligAge, setEligAge] = useState(27);
  const [eligIncome, setEligIncome] = useState(22000);
  const [eligEmployment, setEligEmployment] = useState('Salaried');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    mobile: '',
    subject: '',
    message: '',
  });
  const [contactState, setContactState] = useState<{
    loading: boolean;
    success: string | null;
    error: string | null;
  }>({ loading: false, success: null, error: null });

  const eligibleMaxLoan =
    eligAge < 21 || eligAge > 58 || eligIncome < 12000
      ? 0
      : eligIncome >= 25000
      ? 15000
      : eligIncome >= 18000
      ? 10000
      : 5000;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactState({ loading: true, success: null, error: null });
    try {
      const res = await apiRequest<{ ok: boolean; ticketRef: string }>('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ ...contactForm, category: 'Website Contact' }),
      });
      setContactState({
        loading: false,
        success: `Message received. Reference ID: ${res.ticketRef}. Our support team will respond shortly.`,
        error: null,
      });
      setContactForm({ name: '', email: '', mobile: '', subject: '', message: '' });
    } catch (err) {
      setContactState({
        loading: false,
        success: null,
        error: err instanceof Error ? err.message : 'Unable to send message.',
      });
    }
  };

  return (
    <div id="hero-top" className="min-h-screen bg-[#F4F7FB]">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#071A4B] via-[#0D2B7A] to-[#155EEF] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Copy */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center z-10"
            >
              <p className="text-xs sm:text-sm font-medium text-emerald-300 tracking-wide mb-3">
                {settings.hero_notice || 'Digital KYC · Key Fact Statement Provided Before Acceptance'}
              </p>

              <h1
                className="font-display font-extrabold tracking-tight text-white leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
              >
                India Loan
              </h1>
              <p className="mt-2 text-xl sm:text-2xl font-display font-semibold text-blue-100">
                Your Dreams, Our Support
              </p>

              <p className="mt-4 text-sm sm:text-base text-blue-100/90 max-w-xl leading-relaxed">
                Access transparent short-term personal credit from ₹5,000 to ₹15,000 with clear
                interest disclosures, zero upfront activation deposits, and live application tracking.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-blue-100">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  100% Online Process
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  Transparent KFS Terms
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  Encrypted Verification
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'loan-packages')}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm sm:text-base shadow-lg shadow-emerald-950/25 transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'how-it-works')}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm sm:text-base transition-all whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>How It Works</span>
                </button>
                <div className="sm:hidden">
                  <PWAInstallButton />
                </div>
              </div>
            </motion.div>

            {/* Right Visual Anchor */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl min-h-[260px] sm:min-h-[340px] lg:min-h-[400px] bg-[#0A215C]"
            >
              <img
                src="/src/assets/images/hero_india_loan_1795455754559.jpg"
                alt="Young Indian professional holding smartphone with India Loan app in front of India Gate"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A4B]/90 via-[#071A4B]/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap items-end justify-between gap-4">
                <div className="rounded-2xl bg-[#071A4B]/80 backdrop-blur-md border border-white/15 px-4 py-3">
                  <p className="text-[11px] font-medium text-emerald-300">Digital Lending Transparency</p>
                  <p className="text-sm sm:text-base font-bold text-white tabular-nums mt-0.5">
                    ₹5,000 – ₹15,000 · 3 to 12 Month Tenure
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('eligibility')}
                  className="px-4 py-2.5 rounded-xl bg-white text-[#0A215C] hover:bg-blue-50 text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Check Eligibility
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4-COLUMN TRUST & BENEFIT STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 lg:-mt-6 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-200/80">
          {[
            {
              icon: Clock,
              title: 'Streamlined KYC',
              desc: 'Complete digital application in 5 steps',
              color: 'text-[#155EEF] bg-blue-50',
            },
            {
              icon: FileCheck2,
              title: 'Zero Hidden Charges',
              desc: 'Full Key Fact Statement shown upfront',
              color: 'text-[#10B981] bg-emerald-50',
            },
            {
              icon: Lock,
              title: '256-bit Encryption',
              desc: 'Masked PAN & bank credential handling',
              color: 'text-[#0A215C] bg-slate-100',
            },
            {
              icon: Headphones,
              title: 'Dedicated Support',
              desc: 'Grievance desk & in-app ticket tracking',
              color: 'text-[#155EEF] bg-blue-50',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0A215C]">{item.title}</h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* THREE LOAN PACKAGES */}
      <section id="loan-packages" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold text-[#155EEF] tracking-wide">
              Personal Credit Plans
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0A215C] mt-1">
              Our Loan Packages
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              Choose the plan aligned with your needs. No upfront activation deposit is ever required—all
              interest rates, processing charges, and repayment terms are disclosed upfront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('eligibility')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#155EEF] hover:text-[#0A215C] whitespace-nowrap shrink-0"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculate EMI & Eligibility</span>
          </button>
        </div>

        {loadingProducts && products.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center">
            <p className="text-sm font-semibold text-[#0A215C]">
              Loan packages are temporarily unavailable.
            </p>
            {onRetryProducts && (
              <button
                type="button"
                onClick={onRetryProducts}
                className="mt-3 px-4 py-2 rounded-xl bg-[#155EEF] text-white text-xs font-semibold"
              >
                Retry Loading Packages
              </button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((pkg) => {
            const sampleTenure = pkg.minTenureMonths;
            const r = pkg.interestRateMonthly / 100;
            const sampleEmi = Math.round(
              (pkg.amountInr * r * Math.pow(1 + r, sampleTenure)) /
                (Math.pow(1 + r, sampleTenure) - 1)
            );
            const gst = Math.round(pkg.processingFeeInr * 0.18);

            return (
              <div
                key={pkg.id}
                className="flex flex-col justify-between bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-[#155EEF]">{pkg.badgeLabel || 'Personal Loan'}</span>
                    <span>·</span>
                    <span>{pkg.minTenureMonths}–{pkg.maxTenureMonths} Months</span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-3xl font-display font-extrabold text-[#0A215C] tabular-nums">
                      {formatInr(pkg.amountInr)}
                    </h3>
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      {pkg.interestRateMonthly}% / mo ({pkg.aprPercent}% APR)
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{pkg.title}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Repayment Period</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {pkg.minTenureMonths} to {pkg.maxTenureMonths} Months
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Sample EMI ({sampleTenure} mo)</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatInr(sampleEmi)} / mo
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Processing Fee (at disbursal)</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatInr(pkg.processingFeeInr)} + {formatInr(gst)} GST
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Upfront Activation Fee</span>
                      <span className="font-semibold text-[#10B981] tabular-nums">₹0 (None)</span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-3">
                    <strong className="text-slate-700">Eligibility:</strong> {pkg.eligibilitySummary}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {pkg.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onApplyProduct(pkg)}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors shadow-sm min-h-[44px]"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-white border-y border-slate-200/80 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#155EEF]">Simple Digital Process</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0A215C] mt-1">
              How It Works
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Four clear steps from mobile verification to transparent loan tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Verify Mobile & Sign Up',
                desc: 'Create your India Loan profile and verify your +91 mobile number via 6-digit OTP.',
                icon: Smartphone,
                tint: 'bg-blue-50 text-[#155EEF]',
              },
              {
                step: '02',
                title: 'Complete 5-Step KYC',
                desc: 'Enter personal, address, employment, and bank details with validated formats.',
                icon: FileCheck2,
                tint: 'bg-emerald-50 text-[#10B981]',
              },
              {
                step: '03',
                title: 'Review Key Fact Statement',
                desc: 'Inspect your exact EMI, APR, processing fee, and net disbursal before submitting.',
                icon: BadgeCheck,
                tint: 'bg-indigo-50 text-[#0D2B7A]',
              },
              {
                step: '04',
                title: 'Track & Repay via UPI',
                desc: 'Follow live approval stages and manage repayments inside your app dashboard.',
                icon: Wallet,
                tint: 'bg-amber-50 text-amber-600',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${item.tint}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono-num text-sm font-bold text-slate-400">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#0A215C]">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE INDIA LOAN + ELIGIBILITY CHECKER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Why Choose Us */}
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold text-[#155EEF]">Built on Clarity</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0A215C] mt-1">
              Why Choose India Loan?
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 mb-6">
              Designed for responsible short-term personal borrowing with transparent cost breakdowns.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Key Fact Statement Upfront',
                  desc: 'See exact monthly EMI, APR, GST, and net disbursal amount before you confirm.',
                },
                {
                  title: 'No Mandatory Deposit Trap',
                  desc: 'We never ask borrowers to pay upfront deposits to unlock a loan sanction.',
                },
                {
                  title: 'Real-Time 6-Stage Tracking',
                  desc: 'Monitor Submitted, Verification, Review, Approved, and Disbursal stages live.',
                },
                {
                  title: 'Mobile-First PWA App',
                  desc: 'Installable directly on Android and iOS for fast thumb-friendly management.',
                },
                {
                  title: 'Protected Data Handling',
                  desc: 'PAN and bank account numbers are masked at submission and encrypted in transit.',
                },
                {
                  title: 'Structured Grievance Desk',
                  desc: 'Raise support tickets directly in-app with documented response timelines.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="bg-white rounded-2xl border border-slate-200 p-5"
                >
                  <h3 className="text-sm font-bold text-[#0A215C]">{card.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Eligibility Estimator */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#071A4B] to-[#0D2B7A] text-white rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center gap-2.5 text-emerald-300 text-xs font-semibold mb-2">
              <Calculator className="w-4 h-4" />
              <span>Instant Eligibility Estimator</span>
            </div>
            <h3 className="text-xl font-display font-bold">Check Your Eligible Plan</h3>
            <p className="text-xs text-blue-100/80 mt-1">
              Adjust your age and monthly income to preview eligible packages.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-blue-100">Applicant Age</span>
                  <span className="font-mono-num font-semibold">{eligAge} yrs</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={65}
                  value={eligAge}
                  onChange={(e) => setEligAge(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-blue-100">Monthly Income</span>
                  <span className="font-mono-num font-semibold">{formatInr(eligIncome)}</span>
                </div>
                <input
                  type="range"
                  min={8000}
                  max={60000}
                  step={1000}
                  value={eligIncome}
                  onChange={(e) => setEligIncome(Number(e.target.value))}
                  className="w-full accent-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-xs text-blue-100 mb-1.5">Employment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Salaried', 'Self-Employed', 'Freelancer'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEligEmployment(type)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium transition-colors ${
                        eligEmployment === type
                          ? 'bg-[#10B981] text-white'
                          : 'bg-white/10 text-blue-100 hover:bg-white/20'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 mt-2">
                {eligibleMaxLoan > 0 ? (
                  <>
                    <p className="text-xs text-emerald-300 font-medium">
                      Eligible Up To ({eligEmployment})
                    </p>
                    <p className="text-2xl font-display font-extrabold text-white tabular-nums mt-1">
                      {formatInr(eligibleMaxLoan)}
                    </p>
                    <p className="text-xs text-blue-100/80 mt-1">
                      Subject to PAN, address, and bank account verification.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-amber-300 font-semibold">Not Currently Eligible</p>
                    <p className="text-xs text-blue-100/90 mt-1">
                      Applicants must be aged 21–58 with minimum ₹12,000 monthly income.
                    </p>
                  </>
                )}
              </div>

              {eligibleMaxLoan > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const matched =
                      products.find((p) => p.amountInr === eligibleMaxLoan) || products[0];
                    if (matched) onApplyProduct(matched);
                  }}
                  className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>Proceed with {formatInr(eligibleMaxLoan)} Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT INDIA LOAN */}
      <section className="bg-white border-y border-slate-200/80 py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-slate-200 min-h-[260px]">
              <img
                src="/src/assets/images/about_india_fintech_1795455755505.jpg"
                alt="Indian family reviewing transparent personal finance plan on tablet"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-semibold text-[#155EEF]">About India Loan</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0A215C] mt-1">
                Responsible Credit Built for Everyday Needs
              </h2>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                India Loan simplifies short-term personal credit for salaried professionals,
                self-employed earners, and small households across India. Our platform eliminates
                opaque paperwork and upfront deposit schemes, replacing them with clear Key Fact
                Statements, encrypted KYC verification, and straightforward EMI schedules.
              </p>
              <div className="mt-5 rounded-2xl bg-[#F4F7FB] border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-center gap-2 font-semibold text-[#0A215C] mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Transparency & Compliance Disclosure</span>
                </div>
                {settings.lending_partner_notice}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-[#0A215C] text-xs font-semibold text-[#0A215C] transition-colors"
                >
                  Read About Us
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:border-[#0A215C] text-xs font-semibold text-[#0A215C] transition-colors"
                >
                  Privacy & Fair Practices
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + CONTACT US */}
      <section id="faq-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FAQ */}
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold text-[#155EEF]">Clear Answers</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0A215C] mt-1 mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {FAQS.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={item.q}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left min-h-[48px]"
                    >
                      <span className="text-sm font-semibold text-[#0A215C]">{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-[#155EEF]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Us */}
          <div id="contact-section" className="lg:col-span-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="/src/assets/images/support_specialist_1795455755759.jpg"
                  alt="India Loan Support Specialist"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                />
                <div>
                  <h2 className="text-xl font-display font-bold text-[#0A215C]">
                    Contact Support
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {settings.support_email || 'support@indialoan.in'} ·{' '}
                    {settings.support_phone || '+91 1800-000-2407'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Enter your name"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mobile (+91)</label>
                    <input
                      type="tel"
                      value={contactForm.mobile}
                      onChange={(e) => setContactForm({ ...contactForm, mobile: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      placeholder="Loan inquiry or support"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
                  <textarea
                    rows={3}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="How can our team assist you?"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>

                {contactState.error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">
                    {contactState.error}
                  </p>
                )}
                {contactState.success && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3.5 py-2.5">
                    {contactState.success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={contactState.loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A215C] hover:bg-[#155EEF] text-white font-semibold py-3 text-sm transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>{contactState.loading ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#071A4B] text-blue-100 border-t border-white/10 pb-20 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <IndiaLoanLogo variant="light" size="md" />
              <p className="mt-3 text-xs text-blue-200/80 max-w-md leading-relaxed">
                Your Dreams, Our Support. Transparent personal lending platform with digital KYC,
                clear Key Fact Statements, and sandbox UPI repayment testing.
              </p>
              <p className="mt-3 text-xs text-blue-200/70">
                {settings.company_address || 'Connaught Place Financial Centre, New Delhi 110001'}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Platform
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <button type="button" onClick={() => onNavigate('about')} className="hover:text-white">
                    About India Loan
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('eligibility')} className="hover:text-white">
                    Loan Eligibility
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('how-it-works')} className="hover:text-white">
                    How It Works
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('support')} className="hover:text-white">
                    Customer Support
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
                Legal & Portal
              </h3>
              <ul className="space-y-2 text-xs">
                <li>
                  <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-white">
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('terms')} className="hover:text-white">
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('faq')} className="hover:text-white">
                    FAQ & Grievance Desk
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('admin')} className="text-emerald-300 hover:text-emerald-200 font-semibold">
                    Admin Console
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-200/70">
            <p>© {new Date().getFullYear()} India Loan. All rights reserved.</p>
            <p>{settings.grievance_officer || 'Grievance Desk · grievance@indialoan.in'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
