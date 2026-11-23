import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  CreditCard,
  Download,
  Receipt,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
} from 'lucide-react';
import { apiRequest, formatInr } from '../lib/api';
import type { LoanApplication, TransactionRecord } from '../types';

interface WalletPaymentsProps {
  applications: LoanApplication[];
  transactions: TransactionRecord[];
  onRefresh: () => Promise<void>;
}

const METHODS: Array<{
  id: 'upi' | 'gpay' | 'phonepe' | 'bank_transfer';
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'upi', label: 'UPI ID', subtitle: 'Instant Sandbox VPA Verification', icon: Wallet },
  { id: 'gpay', label: 'Google Pay', subtitle: 'Sandbox UPI Intent', icon: Smartphone },
  { id: 'phonepe', label: 'PhonePe', subtitle: 'Sandbox UPI Collect', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank Transfer', subtitle: 'NEFT / IMPS Sandbox Reference', icon: Building },
];

export const WalletPaymentsView: React.FC<WalletPaymentsProps> = ({
  applications,
  transactions,
  onRefresh,
}) => {
  const payableLoans = applications.filter((a) =>
    ['approved', 'disbursement_pending', 'disbursed'].includes(a.status)
  );
  const [selectedLoanId, setSelectedLoanId] = useState<number>(payableLoans[0]?.id || 0);
  const activeLoan = payableLoans.find((a) => a.id === selectedLoanId) || payableLoans[0] || null;

  const remaining = activeLoan
    ? Math.max(0, activeLoan.totalRepayableInr - activeLoan.repaidAmountInr)
    : 0;

  const [amount, setAmount] = useState<string>(
    activeLoan ? String(Math.min(activeLoan.monthlyEmiInr, remaining || activeLoan.monthlyEmiInr)) : '1000'
  );
  const [method, setMethod] = useState<'upi' | 'gpay' | 'phonepe' | 'bank_transfer'>('upi');
  const [payerHandle, setPayerHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingOrder, setPendingOrder] = useState<{
    orderId: string;
    txnRef: string;
    amountInr: number;
    orderSignature: string;
    applicationNumber: string;
  } | null>(null);

  const [receiptModal, setReceiptModal] = useState<TransactionRecord['receipt'] | null>(null);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoan) return;
    setError(null);
    setLoading(true);
    try {
      const order = await apiRequest<{
        orderId: string;
        txnRef: string;
        amountInr: number;
        orderSignature: string;
        applicationNumber: string;
      }>('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({
          applicationId: activeLoan.id,
          amountInr: Number(amount),
          paymentMethod: method,
          payerHandle,
        }),
      });
      setPendingOrder(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initiate sandbox order.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySandboxOrder = async (sandboxOutcome: 'success' | 'fail') => {
    if (!pendingOrder) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest<{
        status: string;
        receipt: TransactionRecord['receipt'];
      }>('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: pendingOrder.orderId,
          orderSignature: pendingOrder.orderSignature,
          sandboxOutcome,
        }),
      });
      setPendingOrder(null);
      setReceiptModal(res.receipt);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = (receipt: TransactionRecord['receipt']) => {
    const text = [
      'INDIA LOAN — SANDBOX PAYMENT RECEIPT',
      '====================================',
      `Receipt ID   : ${receipt.receiptId || 'N/A'}`,
      `Transaction  : ${receipt.txnRef || 'N/A'}`,
      `Order ID     : ${receipt.orderId || 'N/A'}`,
      `Amount       : ₹${receipt.amountInr || 0}`,
      `Method       : ${String(receipt.paymentMethod || '').toUpperCase()}`,
      `Status       : ${receipt.status || 'N/A'}`,
      `Gateway Mode : ${receipt.gatewayMode || 'SANDBOX'}`,
      `Verified At  : ${receipt.verifiedAt || ''}`,
      '',
      receipt.disclaimer || 'Sandbox Mode Receipt',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.txnRef || 'receipt'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-24 md:pb-12">
      <div className="bg-gradient-to-r from-[#071A4B] to-[#155EEF] text-white px-4 py-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold">Wallet & Repayments</h1>
            <p className="text-xs text-blue-100 mt-0.5">
              Pay EMIs and review verified payment receipts
            </p>
          </div>
          <div className="rounded-xl bg-amber-400/15 border border-amber-300/30 px-3.5 py-2 text-xs text-amber-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Sandbox Gateway Mode Active — No real bank debits</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Checkout Card */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-display font-bold text-[#0A215C] mb-1">
            Make an EMI Repayment
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Select an approved loan and verify through the signed Sandbox Payment Gateway.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          {!activeLoan ? (
            <div className="rounded-2xl bg-[#F8FAFC] border border-dashed border-slate-300 p-6 text-center">
              <Wallet className="w-9 h-9 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#0A215C]">No Active Approved Loans</p>
              <p className="text-xs text-slate-500 mt-1">
                Repayments become available once a loan application reaches the Approved or Disbursed
                stage.
              </p>
            </div>
          ) : pendingOrder ? (
            /* Signed Sandbox Verification Step */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-4"
            >
              <div>
                <p className="text-xs font-bold text-[#155EEF]">Sandbox Gateway Authorization</p>
                <h3 className="text-lg font-display font-bold text-[#0A215C] mt-0.5 tabular-nums">
                  {formatInr(pendingOrder.amountInr)}
                </h3>
                <p className="text-xs text-slate-600 font-mono-num mt-1">
                  Order: {pendingOrder.orderId} · Ref: {pendingOrder.txnRef}
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                This payment order is signed by the server. Choose a sandbox gateway verification outcome
                below to test receipt generation and ledger updates:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleVerifySandboxOrder('success')}
                  className="py-3 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Sandbox Success</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void handleVerifySandboxOrder('fail')}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Simulate Gateway Failure</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="rounded-2xl bg-[#071A4B] text-white p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-blue-200">Selected Loan</p>
                  <select
                    value={activeLoan.id}
                    onChange={(e) => {
                      const next = payableLoans.find((l) => l.id === Number(e.target.value));
                      if (next) {
                        setSelectedLoanId(next.id);
                        setAmount(String(next.monthlyEmiInr));
                      }
                    }}
                    className="bg-transparent text-sm font-bold text-white focus:outline-none mt-0.5"
                  >
                    {payableLoans.map((l) => (
                      <option key={l.id} value={l.id} className="text-slate-900">
                        {l.applicationNumber} — {l.productTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-blue-200">Remaining</p>
                  <p className="text-base font-display font-bold tabular-nums">
                    {formatInr(remaining)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Repayment Amount (₹)
                </label>
                <input
                  type="number"
                  min={100}
                  max={Math.max(remaining, 100)}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono-num focus:border-[#155EEF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {METHODS.map((m) => {
                    const Icon = m.icon;
                    const active = method === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors min-h-[54px] ${
                          active
                            ? 'border-[#155EEF] bg-blue-50/70'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl ${
                            active ? 'bg-[#155EEF] text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0A215C]">{m.label}</p>
                          <p className="text-[11px] text-slate-500">{m.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {method === 'bank_transfer' ? 'Reference / IFSC Note (Optional)' : 'UPI ID / Handle (Optional)'}
                </label>
                <input
                  type="text"
                  value={payerHandle}
                  onChange={(e) => setPayerHandle(e.target.value)}
                  placeholder={method === 'bank_transfer' ? 'IMPS / NEFT Ref' : 'name@upi'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#155EEF] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || remaining === 0}
                className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {remaining === 0
                  ? 'Loan Fully Repaid'
                  : loading
                  ? 'Creating Sandbox Order...'
                  : `Proceed to Pay ${formatInr(Number(amount) || 0)} (Sandbox)`}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                <span>HMAC-verified sandbox gateway checkout</span>
              </div>
            </form>
          )}
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-display font-bold text-[#0A215C]">Transaction History</h2>
              <p className="text-xs text-slate-500">Server-verified sandbox repayment records</p>
            </div>
            <Receipt className="w-5 h-5 text-slate-400" />
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono-num font-bold text-[#0A215C]">{txn.txnRef}</span>
                      <span className="text-slate-400">·</span>
                      <span className="uppercase font-semibold text-slate-600">
                        {txn.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {txn.applicationNumber} · {new Date(txn.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-mono-num font-bold text-[#0A215C]">
                      {formatInr(txn.amountInr)}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span
                        className={`text-[11px] font-semibold ${
                          txn.status === 'verified_success'
                            ? 'text-[#10B981]'
                            : txn.status === 'failed'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {txn.status === 'verified_success'
                          ? 'Sandbox Verified'
                          : txn.status === 'failed'
                          ? 'Failed'
                          : 'Pending'}
                      </span>
                      {txn.receipt?.receiptId && (
                        <button
                          type="button"
                          onClick={() => setReceiptModal(txn.receipt)}
                          className="text-[11px] font-bold text-[#155EEF] hover:underline"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {receiptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            <div
              className={`p-6 text-center text-white ${
                receiptModal.status === 'verified_success'
                  ? 'bg-gradient-to-br from-[#059669] to-[#10B981]'
                  : 'bg-gradient-to-br from-red-700 to-red-600'
              }`}
            >
              {receiptModal.status === 'verified_success' ? (
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
              ) : (
                <XCircle className="w-12 h-12 mx-auto mb-2" />
              )}
              <h3 className="text-xl font-display font-bold">
                {receiptModal.status === 'verified_success'
                  ? 'Sandbox Payment Verified'
                  : 'Sandbox Payment Failed'}
              </h3>
              <p className="text-xs text-white/90 mt-1">{receiptModal.disclaimer}</p>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt ID</span>
                <span className="font-mono-num font-bold text-[#0A215C]">
                  {receiptModal.receiptId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono-num font-semibold text-slate-900">
                  {receiptModal.txnRef}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-mono-num font-bold text-[#0A215C]">
                  {formatInr(receiptModal.amountInr || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="uppercase font-semibold text-slate-900">
                  {String(receiptModal.paymentMethod || '').replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway Mode</span>
                <span className="font-mono-num text-amber-700 font-semibold">SANDBOX</span>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => downloadReceipt(receiptModal)}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-semibold hover:bg-slate-50 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModal(null)}
                  className="py-2.5 rounded-xl bg-[#0A215C] hover:bg-[#155EEF] text-white font-semibold min-h-[44px]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
