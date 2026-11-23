import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import { apiRequest, setAuthToken } from '../lib/api';
import type { AppPage, User } from '../types';
import { IndiaLoanLogo } from './IndiaLoanLogo';

interface AuthViewProps {
  onSuccess: (user: User) => void;
  onNavigate: (page: AppPage) => void;
}

type AuthMode = 'login' | 'signup' | 'otp' | 'forgot' | 'reset';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onNavigate }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // OTP / Reset state
  const [otpMobile, setOtpMobile] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'mobile_verify' | 'reset'>('mobile_verify');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password: loginPassword }),
      });
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{
        token: string;
        user: User;
        otpSent: boolean;
        sandboxOtpPreview?: string;
      }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          mobile,
          email,
          password: signupPassword,
          acceptTerms,
        }),
      });
      setAuthToken(res.token);
      setPendingUser(res.user);
      setOtpMobile(res.user.mobile);
      setOtpPurpose('mobile_verify');
      setSandboxOtp(res.sandboxOtpPreview || null);
      setNotice('Account created. Enter the 6-digit OTP to verify your mobile number.');
      setMode('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ sandboxOtpPreview?: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ mobile: otpMobile, purpose: 'reset' }),
      });
      setOtpPurpose('reset');
      setSandboxOtp(res.sandboxOtpPreview || null);
      setNotice('OTP sent to your registered mobile number.');
      setMode('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ sandboxOtpPreview?: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ mobile: otpMobile, purpose: otpPurpose }),
      });
      setSandboxOtp(res.sandboxOtpPreview || null);
      setNotice('A fresh 6-digit OTP has been generated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ verified: boolean; resetToken?: string; user?: User }>(
        '/api/auth/otp/verify',
        {
          method: 'POST',
          body: JSON.stringify({ mobile: otpMobile, code: otpCode, purpose: otpPurpose }),
        }
      );
      if (otpPurpose === 'reset' && res.resetToken) {
        setResetToken(res.resetToken);
        setNotice('OTP verified. Choose your new password.');
        setMode('reset');
      } else if (res.user) {
        onSuccess(res.user);
      } else if (pendingUser) {
        onSuccess({ ...pendingUser, mobileVerified: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ mobile: otpMobile, resetToken, newPassword }),
      });
      setNotice('Password updated! Log in with your new credentials.');
      setSandboxOtp(null);
      setOtpCode('');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#071A4B] via-[#0D2B7A] to-[#F4F7FB] py-8 px-4 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Top Navy App Header */}
        <div className="bg-gradient-to-br from-[#071A4B] via-[#0D2B7A] to-[#155EEF] px-6 py-7 text-white text-center relative">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex justify-center mb-3">
            <IndiaLoanLogo variant="light" size="md" />
          </div>
          <h1 className="text-xl font-display font-bold">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'otp' && 'Verify Mobile Number'}
            {mode === 'forgot' && 'Forgot Password'}
            {mode === 'reset' && 'Set New Password'}
          </h1>
          <p className="text-xs text-blue-100/85 mt-1">
            {mode === 'login' && 'Login to manage your loans, tracking & repayments'}
            {mode === 'signup' && 'Get started in minutes with verified mobile KYC'}
            {mode === 'otp' && `Enter the 6-digit OTP sent to +91 ${otpMobile}`}
            {mode === 'forgot' && 'Enter your registered +91 mobile number'}
            {mode === 'reset' && 'Create a strong password (minimum 8 characters)'}
          </p>
        </div>

        <div className="p-6 sm:p-7">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800">
              {notice}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="9876543210 or email@example.com"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setMode('forgot');
                    }}
                    className="text-xs font-semibold text-[#155EEF] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#155EEF] hover:bg-[#0D2B7A] text-white font-semibold text-sm transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>

              <p className="text-center text-xs text-slate-600 pt-2">
                New to India Loan?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setMode('signup');
                  }}
                  className="font-bold text-[#155EEF] hover:underline"
                >
                  Create an Account
                </button>
              </p>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name (as per PAN)</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-r-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 accent-[#10B981]"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('terms')}
                    className="text-[#155EEF] font-semibold hover:underline"
                  >
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('privacy')}
                    className="text-[#155EEF] font-semibold hover:underline"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading ? 'Creating Account...' : 'Sign Up & Send OTP'}
              </button>

              <p className="text-center text-xs text-slate-600 pt-1">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setNotice(null);
                    setMode('login');
                  }}
                  className="font-bold text-[#155EEF] hover:underline"
                >
                  Login
                </button>
              </p>
            </form>
          )}

          {/* OTP VERIFICATION */}
          {mode === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {sandboxOtp && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-[#0A215C]">
                  <p className="font-semibold">Sandbox OTP Preview (SMS Gateway Test Mode)</p>
                  <p className="mt-1">
                    Use verification code:{' '}
                    <span className="font-mono-num font-bold text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-blue-200">
                      {sandboxOtp}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-base tracking-[0.25em] font-mono-num focus:border-[#155EEF] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-semibold text-[#155EEF] hover:underline"
                >
                  Resend OTP
                </button>
                {pendingUser && otpPurpose === 'mobile_verify' && (
                  <button
                    type="button"
                    onClick={() => onSuccess(pendingUser)}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Verify later in Dashboard
                  </button>
                )}
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registered Mobile Number (+91)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={otpMobile}
                  onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#155EEF] hover:bg-[#0D2B7A] text-white font-semibold text-sm transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading ? 'Sending OTP...' : 'Send Reset OTP'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs font-semibold text-slate-600 hover:text-[#0A215C]"
              >
                Back to Login
              </button>
            </form>
          )}

          {/* RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password (8+ characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Salted scrypt hashing · Signed session verification</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
