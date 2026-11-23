import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  Landmark,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { apiRequest, formatInr } from '../lib/api';
import type { LoanApplication, LoanProduct, User } from '../types';

interface WizardProps {
  user: User;
  products: LoanProduct[];
  selectedProduct: LoanProduct | null;
  onSelectProduct: (p: LoanProduct) => void;
  onSubmitted: (app: LoanApplication) => void;
  onCancel: () => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const STEPS = [
  { id: 1, label: 'Personal', icon: UserCheck },
  { id: 2, label: 'Address', icon: MapPin },
  { id: 3, label: 'Employment', icon: Building2 },
  { id: 4, label: 'Bank', icon: Landmark },
  { id: 5, label: 'Review', icon: FileCheck2 },
];

export const LoanApplicationWizard: React.FC<WizardProps> = ({
  user,
  products,
  selectedProduct,
  onSelectProduct,
  onSubmitted,
  onCancel,
}) => {
  const activeProduct = selectedProduct || products[0];
  const [step, setStep] = useState(1);
  const [tenureMonths, setTenureMonths] = useState(activeProduct?.minTenureMonths || 3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    fullName: user.fullName || '',
    dob: '',
    gender: 'Male',
    pan: '',
  });

  const [address, setAddress] = useState({
    street: '',
    city: user.city || '',
    state: user.state || 'Delhi',
    pincode: '',
    residenceType: 'Rented',
  });

  const [employment, setEmployment] = useState({
    employmentType: user.employmentType || 'Salaried',
    employerName: '',
    monthlyIncome: user.monthlyIncome ? String(user.monthlyIncome) : '22000',
    purpose: 'Personal Expense',
  });

  const [bank, setBank] = useState({
    bankName: '',
    accountHolderName: user.fullName || '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: '',
  });

  const [consentAccepted, setConsentAccepted] = useState(false);

  const kfs = useMemo(() => {
    if (!activeProduct) return null;
    const principal = activeProduct.amountInr;
    const r = activeProduct.interestRateMonthly / 100;
    const n = Math.max(activeProduct.minTenureMonths, Math.min(activeProduct.maxTenureMonths, tenureMonths));
    const emi = Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    const totalRepayable = emi * n;
    const gst = Math.round(activeProduct.processingFeeInr * 0.18);
    const netDisbursal = Math.max(0, principal - activeProduct.processingFeeInr - gst);
    return {
      principal,
      tenure: n,
      emi,
      totalRepayable,
      totalInterest: Math.max(0, totalRepayable - principal),
      processingFee: activeProduct.processingFeeInr,
      gst,
      netDisbursal,
    };
  }, [activeProduct, tenureMonths]);

  const validateStep = (targetStep: number): string | null => {
    if (targetStep === 1) {
      if (personal.fullName.trim().length < 2) return 'Enter your full legal name.';
      if (!personal.dob) return 'Select your date of birth.';
      const birth = new Date(personal.dob);
      const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (Number.isNaN(age) || age < 21 || age > 58) {
        return 'Applicant age must be between 21 and 58 years.';
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(personal.pan.trim().toUpperCase())) {
        return 'Enter a valid 10-character PAN (example: ABCDE1234F).';
      }
    }
    if (targetStep === 2) {
      if (address.street.trim().length < 5) return 'Enter your full street/house address.';
      if (address.city.trim().length < 2) return 'Enter your city.';
      if (!address.state) return 'Select your state.';
      if (!/^\d{6}$/.test(address.pincode.trim())) return 'Enter a valid 6-digit Indian PIN code.';
    }
    if (targetStep === 3) {
      if (!employment.employmentType) return 'Select your employment type.';
      if (employment.employerName.trim().length < 2) return 'Enter employer or business name.';
      const inc = Number(employment.monthlyIncome);
      if (!Number.isFinite(inc) || inc < 8000) {
        return 'Minimum monthly income must be at least ₹8,000.';
      }
    }
    if (targetStep === 4) {
      if (bank.bankName.trim().length < 2) return 'Enter your bank name.';
      if (bank.accountHolderName.trim().length < 2) return 'Enter bank account holder name.';
      if (!/^\d{9,18}$/.test(bank.accountNumber.trim())) {
        return 'Enter a valid 9 to 18 digit bank account number.';
      }
      if (bank.accountNumber.trim() !== bank.confirmAccountNumber.trim()) {
        return 'Bank account numbers do not match.';
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.trim().toUpperCase())) {
        return 'Enter a valid 11-character IFSC code (example: SBIN0001234).';
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(5, s + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !kfs) return;
    if (!consentAccepted) {
      setError('Please acknowledge the Key Fact Statement and consent terms.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ application: LoanApplication }>('/api/loans/applications', {
        method: 'POST',
        body: JSON.stringify({
          productId: activeProduct.id,
          tenureMonths: kfs.tenure,
          consentAccepted: true,
          stepData: {
            personal,
            address,
            employment: {
              ...employment,
              monthlyIncome: Number(employment.monthlyIncome),
            },
            bank: {
              bankName: bank.bankName,
              accountHolderName: bank.accountHolderName,
              accountNumber: bank.accountNumber,
              ifsc: bank.ifsc.toUpperCase(),
            },
          },
        }),
      });
      onSubmitted(res.application);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit loan application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeProduct || !kfs) return null;

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-24 md:pb-12">
      {/* Top App Bar */}
      <div className="bg-gradient-to-r from-[#071A4B] to-[#0D2B7A] text-white px-4 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold">Loan Application Form</h1>
              <p className="text-xs text-blue-100/80">
                {activeProduct.title} · {formatInr(activeProduct.amountInr)}
              </p>
            </div>
          </div>
          <select
            value={activeProduct.id}
            onChange={(e) => {
              const found = products.find((p) => p.id === Number(e.target.value));
              if (found) {
                onSelectProduct(found);
                setTenureMonths(found.minTenureMonths);
              }
            }}
            aria-label="Select loan package"
            className="rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold px-3 py-2 focus:outline-none"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id} className="text-slate-900">
                {formatInr(p.amountInr)} Plan
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        {/* 5-Step Progress Indicator */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 shadow-sm">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const completed = step > s.id;
              const current = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                    }}
                    className="flex flex-col items-center gap-1.5 min-w-[52px]"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        completed
                          ? 'bg-[#10B981] text-white'
                          : current
                          ? 'bg-[#155EEF] text-white ring-4 ring-blue-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {completed ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        current ? 'text-[#0A215C] font-bold' : completed ? 'text-[#10B981]' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mb-5 rounded ${
                        step > s.id ? 'bg-[#10B981]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Container */}
        <motion.form
          key={step}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm"
        >
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: PERSONAL */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0A215C]">
                  Step 1: Personal Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide details matching your official PAN record.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={personal.fullName}
                  onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })}
                  placeholder="Enter full name as per PAN"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={personal.dob}
                    onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Male', 'Female', 'Other'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setPersonal({ ...personal, gender: g })}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                          personal.gender === g
                            ? 'bg-[#0A215C] text-white border-[#0A215C]'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PAN Number (masked on storage)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={personal.pan}
                  onChange={(e) => setPersonal({ ...personal, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num uppercase focus:border-[#155EEF] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: ADDRESS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0A215C]">
                  Step 2: Address Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current residential address in India.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  House / Street / Locality
                </label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="Flat 402, Green Park Extension"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="New Delhi"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
                  <select
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none bg-white"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">6-Digit PIN Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                    placeholder="110016"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Residence Type</label>
                  <select
                    value={address.residenceType}
                    onChange={(e) => setAddress({ ...address, residenceType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none bg-white"
                  >
                    <option value="Rented">Rented</option>
                    <option value="Owned">Owned by Self / Family</option>
                    <option value="Company Provided">Company Provided</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EMPLOYMENT */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0A215C]">
                  Step 3: Employment Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Used strictly to verify repayment capacity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Salaried', 'Self-Employed', 'Freelancer'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEmployment({ ...employment, employmentType: type })}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                        employment.employmentType === type
                          ? 'bg-[#0A215C] text-white border-[#0A215C]'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Employer / Business Name
                </label>
                <input
                  type="text"
                  value={employment.employerName}
                  onChange={(e) => setEmployment({ ...employment, employerName: e.target.value })}
                  placeholder="Company or business name"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Monthly Net Income (₹)
                  </label>
                  <input
                    type="number"
                    min={8000}
                    value={employment.monthlyIncome}
                    onChange={(e) => setEmployment({ ...employment, monthlyIncome: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Loan Purpose</label>
                  <select
                    value={employment.purpose}
                    onChange={(e) => setEmployment({ ...employment, purpose: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none bg-white"
                  >
                    <option value="Personal Expense">Personal Expense</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Education / Upskilling">Education / Upskilling</option>
                    <option value="Home Repair">Home Repair</option>
                    <option value="Small Business Cashflow">Small Business Cashflow</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BANK */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0A215C]">
                  Step 4: Bank Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Account for loan disbursement. Account numbers are masked upon storage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bank Name</label>
                  <input
                    type="text"
                    value={bank.bankName}
                    onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India, HDFC"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Holder Name</label>
                  <input
                    type="text"
                    value={bank.accountHolderName}
                    onChange={(e) => setBank({ ...bank, accountHolderName: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account Number</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={bank.accountNumber}
                    onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, '') })}
                    placeholder="9 to 18 digits"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Account Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={bank.confirmAccountNumber}
                    onChange={(e) =>
                      setBank({ ...bank, confirmAccountNumber: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="Re-enter account number"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">IFSC Code</label>
                <input
                  type="text"
                  maxLength={11}
                  value={bank.ifsc}
                  onChange={(e) => setBank({ ...bank, ifsc: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num uppercase focus:border-[#155EEF] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & KFS */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0A215C]">
                  Step 5: Application Review & Key Fact Statement
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust your repayment tenure and confirm all transparent loan terms before submitting.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span>Repayment Period</span>
                  <span className="font-mono-num text-[#155EEF]">{kfs.tenure} Months</span>
                </div>
                <input
                  type="range"
                  min={activeProduct.minTenureMonths}
                  max={activeProduct.maxTenureMonths}
                  value={kfs.tenure}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full accent-[#155EEF]"
                />
              </div>

              {/* Key Fact Statement Table */}
              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 sm:p-5 space-y-2.5 text-xs">
                <p className="font-bold text-[#0A215C] text-sm mb-2">Key Fact Statement (KFS)</p>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sanctioned Loan Principal</span>
                  <span className="font-mono-num font-bold text-[#0A215C]">{formatInr(kfs.principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Interest Rate / APR</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {activeProduct.interestRateMonthly}% p.m. ({activeProduct.aprPercent}% APR)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Upfront Activation Deposit</span>
                  <span className="font-mono-num font-bold text-[#10B981]">₹0 (None)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Processing Fee + 18% GST (deducted at disbursal)</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatInr(kfs.processingFee)} + {formatInr(kfs.gst)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-[#0A215C]">Net Disbursal Amount</span>
                  <span className="font-mono-num font-bold text-[#10B981] text-sm">
                    {formatInr(kfs.netDisbursal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#0A215C]">Monthly EMI ({kfs.tenure} months)</span>
                  <span className="font-mono-num font-bold text-[#155EEF] text-sm">
                    {formatInr(kfs.emi)} / mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Repayable (Principal + Interest)</span>
                  <span className="font-mono-num font-bold text-slate-900">
                    {formatInr(kfs.totalRepayable)}
                  </span>
                </div>
              </div>

              {/* Summary Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white border border-slate-200 rounded-2xl p-4">
                <div>
                  <span className="text-slate-400">Applicant</span>
                  <p className="font-semibold text-slate-800">{personal.fullName}</p>
                  <p className="text-slate-500 font-mono-num">
                    PAN: {personal.pan.slice(0, 2)}XXXXX{personal.pan.slice(-3)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Disbursal Bank</span>
                  <p className="font-semibold text-slate-800">{bank.bankName}</p>
                  <p className="text-slate-500 font-mono-num">
                    A/C: XXXXXX{bank.accountNumber.slice(-4)} · {bank.ifsc}
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 accent-[#10B981]"
                />
                <span>
                  I confirm that the above KYC, employment, and bank details are accurate, and I
                  accept the Key Fact Statement and transparent repayment schedule.
                </span>
              </label>
            </div>
          )}

          {/* Footer Controls */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => (step === 1 ? onCancel() : setStep((s) => s - 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{step === 1 ? 'Cancel' : 'Previous'}</span>
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#155EEF] hover:bg-[#0D2B7A] text-white text-xs sm:text-sm font-semibold min-h-[44px]"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-semibold disabled:opacity-60 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Your personal information is encrypted and transmitted securely.</span>
          </div>
        </motion.form>
      </div>
    </div>
  );
};
