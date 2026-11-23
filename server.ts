import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  clearSessionCookie,
  createSessionToken,
  extractSession,
  hashPassword,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  sha256Hex,
  signHmac,
  verifyPassword,
  type AuthRequest,
} from './src/server/auth.ts';
import { calculateLoanBreakdown, db, initDatabase } from './src/server/db.ts';

initDatabase();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

const ALLOWED_STAGES = [
  'application_submitted',
  'verification_in_progress',
  'under_review',
  'approved',
  'disbursement_pending',
  'disbursed',
  'rejected',
] as const;

const STAGE_LABELS: Record<string, string> = {
  application_submitted: 'Application Submitted',
  verification_in_progress: 'Verification in Progress',
  under_review: 'Under Review',
  approved: 'Approved',
  disbursement_pending: 'Disbursement Pending',
  disbursed: 'Disbursed',
  rejected: 'Application Declined',
};

function sanitizeUser(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    mobile: row.mobile,
    email: row.email,
    role: row.role,
    mobileVerified: Boolean(row.mobile_verified),
    panMasked: row.pan_masked || '',
    city: row.city || '',
    state: row.state || '',
    employmentType: row.employment_type || '',
    monthlyIncome: Number(row.monthly_income || 0),
    createdAt: row.created_at,
  };
}

function normalizeMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

// ---------- HEALTH & PUBLIC ----------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'India Loan Platform' });
});

app.get('/api/products', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM loan_products WHERE is_active = 1 ORDER BY amount_inr ASC')
    .all() as Array<Record<string, unknown>>;

  res.json(
    rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      amountInr: Number(p.amount_inr),
      minTenureMonths: Number(p.min_tenure_months),
      maxTenureMonths: Number(p.max_tenure_months),
      interestRateMonthly: Number(p.interest_rate_monthly),
      aprPercent: Number(p.apr_percent),
      processingFeeInr: Number(p.processing_fee_inr),
      eligibilitySummary: p.eligibility_summary,
      badgeLabel: p.badge_label,
      features: JSON.parse(String(p.features_json || '[]')),
      isActive: Boolean(p.is_active),
    }))
  );
});

app.get('/api/settings/public', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

// ---------- AUTHENTICATION ----------
app.post('/api/auth/signup', (req, res) => {
  const { fullName, mobile, email, password, acceptTerms } = req.body ?? {};
  const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
  const cleanMobile = normalizeMobile(typeof mobile === 'string' ? mobile : '');
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (cleanName.length < 2 || cleanName.length > 80) {
    return res.status(400).json({ error: 'Please enter your full name (2–80 characters).' });
  }
  if (!isValidIndianMobile(cleanMobile)) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  if (!acceptTerms) {
    return res.status(400).json({ error: 'Please accept the Terms & Conditions and Privacy Policy.' });
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE mobile = ? OR email = ?')
    .get(cleanMobile, cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this mobile number or email already exists.' });
  }

  const passwordHash = hashPassword(cleanPassword);
  const insert = db.prepare(`
    INSERT INTO users (full_name, mobile, email, password_hash, role, mobile_verified)
    VALUES (?, ?, ?, ?, 'user', 0)
  `);
  const result = insert.run(cleanName, cleanMobile, cleanEmail, passwordHash);
  const userId = Number(result.lastInsertRowid);

  // Create welcome notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, category)
    VALUES (?, ?, ?, 'info')
  `).run(
    userId,
    'Welcome to India Loan',
    'Complete your mobile OTP verification to unlock instant eligibility checks and 5-step loan applications.'
  );

  // Issue initial OTP for mobile verification
  const otpCode = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO otp_challenges (mobile, purpose, code_hash, expires_at)
    VALUES (?, 'mobile_verify', ?, ?)
  `).run(cleanMobile, sha256Hex(otpCode), expiresAt);

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  const token = createSessionToken({ uid: userId, role: 'user', email: cleanEmail });
  setSessionCookie(res, token);

  res.status(201).json({
    token,
    user: sanitizeUser(userRow),
    otpSent: true,
    sandboxOtpPreview: process.env.SMS_PROVIDER ? undefined : otpCode,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body ?? {};
  const rawId = typeof identifier === 'string' ? identifier.trim() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (!rawId || !cleanPassword) {
    return res.status(400).json({ error: 'Mobile number/email and password are required.' });
  }

  const normalizedMobile = normalizeMobile(rawId);
  const emailCandidate = rawId.toLowerCase();

  const userRow = db
    .prepare('SELECT * FROM users WHERE mobile = ? OR email = ?')
    .get(normalizedMobile, emailCandidate) as Record<string, unknown> | undefined;

  if (!userRow || !verifyPassword(cleanPassword, String(userRow.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your mobile/email and password.' });
  }

  const role = userRow.role === 'admin' ? 'admin' : 'user';
  const token = createSessionToken({
    uid: Number(userRow.id),
    role,
    email: String(userRow.email),
  });
  setSessionCookie(res, token);

  res.json({
    token,
    user: sanitizeUser(userRow),
  });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const session = extractSession(req);
  if (!session) {
    return res.json({ user: null });
  }
  if (session.uid === 0 && session.role === 'admin') {
    return res.json({
      user: {
        id: 0,
        fullName: 'Administrator',
        mobile: '',
        email: session.email,
        role: 'admin',
        mobileVerified: true,
      },
    });
  }
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.uid) as Record<string, unknown> | undefined;
  if (!userRow) {
    clearSessionCookie(res);
    return res.json({ user: null });
  }
  res.json({ user: sanitizeUser(userRow) });
});

app.put('/api/auth/profile', requireAuth, (req: AuthRequest, res) => {
  const { fullName, email, city, state, employmentType, monthlyIncome } = req.body ?? {};
  const uid = req.user!.uid;
  if (uid === 0) {
    return res.status(400).json({ error: 'System administrator profile is managed via settings.' });
  }

  const cleanName = typeof fullName === 'string' ? fullName.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const conflict = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(cleanEmail, uid);
  if (conflict) {
    return res.status(409).json({ error: 'This email address is already linked to another account.' });
  }

  db.prepare(`
    UPDATE users
    SET full_name = ?, email = ?, city = ?, state = ?, employment_type = ?, monthly_income = ?
    WHERE id = ?
  `).run(
    cleanName,
    cleanEmail,
    typeof city === 'string' ? city.trim().slice(0, 60) : '',
    typeof state === 'string' ? state.trim().slice(0, 60) : '',
    typeof employmentType === 'string' ? employmentType.trim().slice(0, 40) : '',
    Math.max(0, Number(monthlyIncome) || 0),
    uid
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(uid) as Record<string, unknown>;
  res.json({ user: sanitizeUser(updated) });
});

app.post('/api/auth/otp/send', (req, res) => {
  const { mobile, purpose } = req.body ?? {};
  const cleanMobile = normalizeMobile(typeof mobile === 'string' ? mobile : '');
  const cleanPurpose = purpose === 'reset' ? 'reset' : 'mobile_verify';

  if (!isValidIndianMobile(cleanMobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  }

  const user = db.prepare('SELECT id FROM users WHERE mobile = ?').get(cleanMobile);
  if (cleanPurpose === 'reset' && !user) {
    return res.status(404).json({ error: 'No account found with this registered mobile number.' });
  }

  const otpCode = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO otp_challenges (mobile, purpose, code_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(cleanMobile, cleanPurpose, sha256Hex(otpCode), expiresAt);

  res.json({
    ok: true,
    expiresInSeconds: 600,
    sandboxMode: !process.env.SMS_PROVIDER,
    sandboxOtpPreview: process.env.SMS_PROVIDER ? undefined : otpCode,
  });
});

app.post('/api/auth/otp/verify', (req, res) => {
  const { mobile, code, purpose } = req.body ?? {};
  const cleanMobile = normalizeMobile(typeof mobile === 'string' ? mobile : '');
  const cleanCode = typeof code === 'string' ? code.trim() : '';
  const cleanPurpose = purpose === 'reset' ? 'reset' : 'mobile_verify';

  if (!isValidIndianMobile(cleanMobile) || !/^\d{6}$/.test(cleanCode)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit mobile number and 6-digit OTP.' });
  }

  const challenge = db
    .prepare(`
      SELECT * FROM otp_challenges
      WHERE mobile = ? AND purpose = ? AND verified = 0
      ORDER BY id DESC LIMIT 1
    `)
    .get(cleanMobile, cleanPurpose) as Record<string, unknown> | undefined;

  if (!challenge) {
    return res.status(400).json({ error: 'No active OTP request found. Please request a new OTP.' });
  }

  if (Number(challenge.attempts) >= 5) {
    return res.status(429).json({ error: 'Too many invalid attempts. Please request a new OTP.' });
  }

  if (new Date(String(challenge.expires_at)).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This OTP has expired. Please request a new one.' });
  }

  if (sha256Hex(cleanCode) !== String(challenge.code_hash)) {
    db.prepare('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?').run(Number(challenge.id));
    return res.status(400).json({ error: 'Incorrect OTP code. Please try again.' });
  }

  let resetToken: string | undefined;
  if (cleanPurpose === 'reset') {
    resetToken = crypto.randomBytes(24).toString('hex');
    db.prepare('UPDATE otp_challenges SET verified = 1, reset_token_hash = ? WHERE id = ?').run(
      sha256Hex(resetToken),
      Number(challenge.id)
    );
  } else {
    db.prepare('UPDATE otp_challenges SET verified = 1 WHERE id = ?').run(Number(challenge.id));
    db.prepare('UPDATE users SET mobile_verified = 1 WHERE mobile = ?').run(cleanMobile);
  }

  const userRow = db.prepare('SELECT * FROM users WHERE mobile = ?').get(cleanMobile) as Record<string, unknown> | undefined;
  res.json({
    verified: true,
    resetToken,
    user: sanitizeUser(userRow),
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { mobile, resetToken, newPassword } = req.body ?? {};
  const cleanMobile = normalizeMobile(typeof mobile === 'string' ? mobile : '');
  const cleanToken = typeof resetToken === 'string' ? resetToken.trim() : '';
  const cleanPassword = typeof newPassword === 'string' ? newPassword : '';

  if (!isValidIndianMobile(cleanMobile) || !cleanToken || cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Valid mobile number, verification token, and password (8+ chars) are required.' });
  }

  const challenge = db
    .prepare(`
      SELECT * FROM otp_challenges
      WHERE mobile = ? AND purpose = 'reset' AND verified = 1 AND reset_token_hash = ?
      ORDER BY id DESC LIMIT 1
    `)
    .get(cleanMobile, sha256Hex(cleanToken)) as Record<string, unknown> | undefined;

  if (!challenge || new Date(String(challenge.expires_at)).getTime() + 10 * 60 * 1000 < Date.now()) {
    return res.status(400).json({ error: 'Password reset session expired. Please verify OTP again.' });
  }

  const passwordHash = hashPassword(cleanPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE mobile = ?').run(passwordHash, cleanMobile);
  db.prepare('UPDATE otp_challenges SET reset_token_hash = NULL WHERE id = ?').run(Number(challenge.id));

  res.json({ ok: true, message: 'Password updated successfully. You can now log in.' });
});

// ---------- LOAN APPLICATIONS & DASHBOARD ----------
app.post('/api/loans/applications', requireAuth, (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  if (uid === 0) {
    return res.status(403).json({ error: 'Please use a customer account to submit loan applications.' });
  }

  const { productId, tenureMonths, stepData, consentAccepted } = req.body ?? {};
  const product = db
    .prepare('SELECT * FROM loan_products WHERE id = ? AND is_active = 1')
    .get(Number(productId)) as Record<string, unknown> | undefined;

  if (!product) {
    return res.status(400).json({ error: 'Selected loan package is not available.' });
  }

  const minT = Number(product.min_tenure_months);
  const maxT = Number(product.max_tenure_months);
  const cleanTenure = Number(tenureMonths);
  if (!Number.isInteger(cleanTenure) || cleanTenure < minT || cleanTenure > maxT) {
    return res.status(400).json({ error: `Repayment period must be between ${minT} and ${maxT} months.` });
  }

  if (!consentAccepted) {
    return res.status(400).json({ error: 'Borrower consent and Key Fact Statement acknowledgement are required.' });
  }

  const personal = stepData?.personal ?? {};
  const address = stepData?.address ?? {};
  const employment = stepData?.employment ?? {};
  const bank = stepData?.bank ?? {};

  const fullName = String(personal.fullName || '').trim();
  const dob = String(personal.dob || '').trim();
  const pan = String(personal.pan || '').trim().toUpperCase();
  const street = String(address.street || '').trim();
  const city = String(address.city || '').trim();
  const state = String(address.state || '').trim();
  const pincode = String(address.pincode || '').trim();
  const empType = String(employment.employmentType || '').trim();
  const monthlyIncome = Number(employment.monthlyIncome || 0);
  const bankName = String(bank.bankName || '').trim();
  const accountNumber = String(bank.accountNumber || '').replace(/\s/g, '');
  const ifsc = String(bank.ifsc || '').trim().toUpperCase();

  if (fullName.length < 2 || !dob || !isValidPan(pan)) {
    return res.status(400).json({ error: 'Please complete valid Personal Information including PAN (e.g. ABCDE1234F).' });
  }
  if (street.length < 4 || city.length < 2 || state.length < 2 || !/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ error: 'Please enter a valid Address and 6-digit Indian PIN code.' });
  }
  if (!empType || monthlyIncome < 8000) {
    return res.status(400).json({ error: 'Please provide valid Employment details and monthly income (minimum ₹8,000).' });
  }
  if (bankName.length < 2 || !/^\d{9,18}$/.test(accountNumber) || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return res.status(400).json({ error: 'Please enter a valid Bank Name, 9–18 digit Account Number, and 11-character IFSC.' });
  }

  const breakdown = calculateLoanBreakdown(
    Number(product.amount_inr),
    cleanTenure,
    Number(product.interest_rate_monthly),
    Number(product.processing_fee_inr)
  );

  // Store masked sensitive identifiers only
  const panMasked = `${pan.slice(0, 2)}XXXXX${pan.slice(-3)}`;
  const accountMasked = `XXXXXX${accountNumber.slice(-4)}`;

  const sanitizedStepData = {
    personal: {
      fullName,
      dob,
      gender: String(personal.gender || 'Prefer not to say'),
      panMasked,
    },
    address: {
      street,
      city,
      state,
      pincode,
      residenceType: String(address.residenceType || 'Rented'),
    },
    employment: {
      employmentType: empType,
      employerName: String(employment.employerName || '').trim(),
      monthlyIncome,
      purpose: String(employment.purpose || 'Personal Need').trim(),
    },
    bank: {
      bankName,
      accountMasked,
      ifsc,
      accountHolderName: String(bank.accountHolderName || fullName).trim(),
    },
    consentAcceptedAt: new Date().toISOString(),
  };

  const appNumber = `IL-${new Date().getFullYear()}-${crypto.randomInt(10000, 99999)}`;

  const insertApp = db.prepare(`
    INSERT INTO loan_applications (
      application_number, user_id, product_id, requested_amount, tenure_months,
      interest_rate_monthly, processing_fee_inr, gst_inr, net_disbursal_inr,
      monthly_emi_inr, total_repayable_inr, status, step_data_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'application_submitted', ?)
  `);

  const resInsert = insertApp.run(
    appNumber,
    uid,
    Number(product.id),
    Number(product.amount_inr),
    cleanTenure,
    Number(product.interest_rate_monthly),
    breakdown.processingFeeInr,
    breakdown.gstInr,
    breakdown.netDisbursalInr,
    breakdown.monthlyEmiInr,
    breakdown.totalRepayableInr,
    JSON.stringify(sanitizedStepData)
  );

  const appId = Number(resInsert.lastInsertRowid);

  db.prepare(`
    INSERT INTO application_timeline (application_id, stage, label, note, actor)
    VALUES (?, 'application_submitted', 'Application Submitted', 'Digital KYC details and Key Fact Statement consent recorded.', 'Applicant')
  `).run(appId);

  db.prepare(`
    UPDATE users SET pan_masked = ?, city = ?, state = ?, employment_type = ?, monthly_income = ? WHERE id = ?
  `).run(panMasked, city, state, empType, monthlyIncome, uid);

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, category)
    VALUES (?, ?, ?, 'loan')
  `).run(
    uid,
    `Application ${appNumber} Submitted`,
    `Your ${product.title} application for ₹${Number(product.amount_inr).toLocaleString('en-IN')} has been received for verification.`
  );

  const createdApp = db.prepare('SELECT * FROM loan_applications WHERE id = ?').get(appId) as Record<string, unknown>;
  const timeline = db.prepare('SELECT * FROM application_timeline WHERE application_id = ? ORDER BY id ASC').all(appId);

  res.status(201).json({
    application: {
      ...createdApp,
      stepData: sanitizedStepData,
      productTitle: product.title,
      timeline,
    },
  });
});

app.get('/api/loans/applications', requireAuth, (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const rows = db
    .prepare(`
      SELECT a.*, p.title as product_title, p.apr_percent
      FROM loan_applications a
      JOIN loan_products p ON p.id = a.product_id
      WHERE a.user_id = ?
      ORDER BY a.id DESC
    `)
    .all(uid) as Array<Record<string, unknown>>;

  const timelineStmt = db.prepare('SELECT * FROM application_timeline WHERE application_id = ? ORDER BY id ASC');
  const applications = rows.map((row) => ({
    id: row.id,
    applicationNumber: row.application_number,
    productId: row.product_id,
    productTitle: row.product_title,
    aprPercent: Number(row.apr_percent),
    requestedAmount: Number(row.requested_amount),
    tenureMonths: Number(row.tenure_months),
    interestRateMonthly: Number(row.interest_rate_monthly),
    processingFeeInr: Number(row.processing_fee_inr),
    gstInr: Number(row.gst_inr),
    netDisbursalInr: Number(row.net_disbursal_inr),
    monthlyEmiInr: Number(row.monthly_emi_inr),
    totalRepayableInr: Number(row.total_repayable_inr),
    repaidAmountInr: Number(row.repaid_amount_inr),
    status: row.status,
    statusLabel: STAGE_LABELS[String(row.status)] || String(row.status),
    stepData: JSON.parse(String(row.step_data_json || '{}')),
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timeline: timelineStmt.all(Number(row.id)),
  }));

  res.json(applications);
});

app.get('/api/dashboard/summary', requireAuth, (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(uid) as Record<string, unknown> | undefined;

  const apps = db
    .prepare(`
      SELECT a.*, p.title as product_title, p.apr_percent
      FROM loan_applications a
      JOIN loan_products p ON p.id = a.product_id
      WHERE a.user_id = ?
      ORDER BY a.id DESC
    `)
    .all(uid) as Array<Record<string, unknown>>;

  const txns = db
    .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 10')
    .all(uid) as Array<Record<string, unknown>>;

  const unreadNotifs = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(uid) as { count: number };

  const activeLoan = apps.find((a) => a.status !== 'rejected') || apps[0] || null;
  const totalApproved = apps
    .filter((a) => ['approved', 'disbursement_pending', 'disbursed'].includes(String(a.status)))
    .reduce((sum, a) => sum + Number(a.requested_amount), 0);

  const totalRepaid = apps.reduce((sum, a) => sum + Number(a.repaid_amount_inr), 0);
  const totalRepayable = apps
    .filter((a) => ['approved', 'disbursement_pending', 'disbursed'].includes(String(a.status)))
    .reduce((sum, a) => sum + Number(a.total_repayable_inr), 0);

  res.json({
    user: sanitizeUser(userRow),
    metrics: {
      totalApplications: apps.length,
      approvedAmountInr: totalApproved,
      totalRepayableInr: totalRepayable,
      totalRepaidInr: totalRepaid,
      remainingBalanceInr: Math.max(0, totalRepayable - totalRepaid),
      unreadNotifications: unreadNotifs.count,
    },
    activeLoan: activeLoan
      ? {
          id: activeLoan.id,
          applicationNumber: activeLoan.application_number,
          productTitle: activeLoan.product_title,
          requestedAmount: Number(activeLoan.requested_amount),
          monthlyEmiInr: Number(activeLoan.monthly_emi_inr),
          totalRepayableInr: Number(activeLoan.total_repayable_inr),
          repaidAmountInr: Number(activeLoan.repaid_amount_inr),
          status: activeLoan.status,
          statusLabel: STAGE_LABELS[String(activeLoan.status)] || String(activeLoan.status),
        }
      : null,
    recentTransactions: txns.map((t) => ({
      id: t.id,
      txnRef: t.txn_ref,
      applicationId: t.application_id,
      amountInr: Number(t.amount_inr),
      paymentMethod: t.payment_method,
      gatewayMode: t.gateway_mode,
      status: t.status,
      createdAt: t.created_at,
    })),
  });
});

// ---------- SANDBOX PAYMENT GATEWAY ----------
app.post('/api/payments/create-order', requireAuth, (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const { applicationId, amountInr, paymentMethod, payerHandle } = req.body ?? {};

  const appRow = db
    .prepare('SELECT * FROM loan_applications WHERE id = ? AND user_id = ?')
    .get(Number(applicationId), uid) as Record<string, unknown> | undefined;

  if (!appRow) {
    return res.status(404).json({ error: 'Loan application not found for your account.' });
  }
  if (!['approved', 'disbursement_pending', 'disbursed'].includes(String(appRow.status))) {
    return res.status(400).json({ error: 'Repayments are enabled once a loan application is approved.' });
  }

  const remaining = Math.max(0, Number(appRow.total_repayable_inr) - Number(appRow.repaid_amount_inr));
  const cleanAmount = Math.round(Number(amountInr));
  if (!Number.isFinite(cleanAmount) || cleanAmount < 100 || cleanAmount > Math.max(remaining, 15000)) {
    return res.status(400).json({ error: `Enter a valid repayment amount between ₹100 and ₹${remaining.toLocaleString('en-IN')}.` });
  }

  const allowedMethods = ['upi', 'gpay', 'phonepe', 'bank_transfer'];
  if (!allowedMethods.includes(String(paymentMethod))) {
    return res.status(400).json({ error: 'Please select UPI, Google Pay, PhonePe, or Bank Transfer.' });
  }

  const txnRef = `TXN${Date.now().toString().slice(-6)}${crypto.randomInt(100, 999)}`;
  const orderId = `SBX_ORD_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const orderSignature = signHmac(`${orderId}:${uid}:${appRow.id}:${cleanAmount}`);

  db.prepare(`
    INSERT INTO transactions (
      txn_ref, user_id, application_id, amount_inr, payment_method,
      payer_handle, gateway_mode, gateway_order_id, gateway_signature, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'sandbox', ?, ?, 'pending')
  `).run(
    txnRef,
    uid,
    Number(appRow.id),
    cleanAmount,
    String(paymentMethod),
    typeof payerHandle === 'string' ? payerHandle.trim().slice(0, 64) : '',
    orderId,
    orderSignature
  );

  res.status(201).json({
    gatewayMode: 'sandbox',
    orderId,
    txnRef,
    amountInr: cleanAmount,
    orderSignature,
    applicationNumber: appRow.application_number,
  });
});

app.post('/api/payments/verify', requireAuth, (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const { orderId, orderSignature, sandboxOutcome } = req.body ?? {};

  const txn = db
    .prepare('SELECT * FROM transactions WHERE gateway_order_id = ? AND user_id = ?')
    .get(String(orderId || ''), uid) as Record<string, unknown> | undefined;

  if (!txn) {
    return res.status(404).json({ error: 'Sandbox payment order not found.' });
  }
  if (txn.status !== 'pending') {
    return res.status(400).json({ error: 'This payment order has already been finalized.' });
  }

  const expectedSig = signHmac(`${txn.gateway_order_id}:${uid}:${txn.application_id}:${txn.amount_inr}`);
  if (String(orderSignature || '') !== expectedSig) {
    return res.status(403).json({ error: 'Gateway signature mismatch. Payment verification rejected.' });
  }

  const outcome = sandboxOutcome === 'fail' ? 'failed' : 'verified_success';
  const receipt = {
    receiptId: `RCPT-${txn.txn_ref}`,
    txnRef: txn.txn_ref,
    orderId: txn.gateway_order_id,
    amountInr: Number(txn.amount_inr),
    paymentMethod: txn.payment_method,
    payerHandle: txn.payer_handle || 'Sandbox Test Handle',
    gatewayMode: 'SANDBOX_TEST_GATEWAY',
    status: outcome,
    verifiedAt: new Date().toISOString(),
    disclaimer: 'Sandbox Mode Transaction Receipt — No real bank debit was performed.',
  };

  db.prepare(`
    UPDATE transactions SET status = ?, receipt_json = ? WHERE id = ?
  `).run(outcome, JSON.stringify(receipt), Number(txn.id));

  if (outcome === 'verified_success') {
    db.prepare(`
      UPDATE loan_applications
      SET repaid_amount_inr = repaid_amount_inr + ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(Number(txn.amount_inr), Number(txn.application_id));

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, category)
      VALUES (?, ?, ?, 'payment')
    `).run(
      uid,
      `Sandbox Repayment Verified (${txn.txn_ref})`,
      `Sandbox gateway verified ₹${Number(txn.amount_inr).toLocaleString('en-IN')} via ${String(txn.payment_method).toUpperCase()}.`
    );
  } else {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, category)
      VALUES (?, ?, ?, 'warning')
    `).run(
      uid,
      `Sandbox Payment Failed (${txn.txn_ref})`,
      `Simulated gateway failure recorded for ₹${Number(txn.amount_inr).toLocaleString('en-IN')}.`
    );
  }

  res.json({
    status: outcome,
    receipt,
  });
});

app.get('/api/transactions', requireAuth, (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const rows = db
    .prepare(`
      SELECT t.*, a.application_number
      FROM transactions t
      JOIN loan_applications a ON a.id = t.application_id
      WHERE t.user_id = ?
      ORDER BY t.id DESC
    `)
    .all(uid) as Array<Record<string, unknown>>;

  res.json(
    rows.map((t) => ({
      id: t.id,
      txnRef: t.txn_ref,
      applicationId: t.application_id,
      applicationNumber: t.application_number,
      amountInr: Number(t.amount_inr),
      paymentMethod: t.payment_method,
      payerHandle: t.payer_handle,
      gatewayMode: t.gateway_mode,
      gatewayOrderId: t.gateway_order_id,
      status: t.status,
      receipt: JSON.parse(String(t.receipt_json || '{}')),
      createdAt: t.created_at,
    }))
  );
});

// ---------- NOTIFICATIONS & SUPPORT ----------
app.get('/api/notifications', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 40')
    .all(req.user!.uid) as Array<Record<string, unknown>>;
  res.json(
    rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      category: n.category,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    }))
  );
});

app.patch('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
    Number(req.params.id),
    req.user!.uid
  );
  res.json({ ok: true });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.uid);
  res.json({ ok: true });
});

app.get('/api/support/tickets', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY id DESC')
    .all(req.user!.uid) as Array<Record<string, unknown>>;
  res.json(
    rows.map((t) => ({
      id: t.id,
      ticketRef: t.ticket_ref,
      subject: t.subject,
      category: t.category,
      message: t.message,
      status: t.status,
      adminReply: t.admin_reply,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))
  );
});

app.post('/api/support/tickets', (req, res) => {
  const session = extractSession(req);
  const { name, email, mobile, subject, category, message } = req.body ?? {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanMobile = normalizeMobile(String(mobile || ''));
  const cleanSubject = String(subject || '').trim();
  const cleanMessage = String(message || '').trim();

  if (cleanName.length < 2 || !isValidEmail(cleanEmail) || cleanSubject.length < 3 || cleanMessage.length < 8) {
    return res.status(400).json({ error: 'Please provide your name, valid email, subject, and message (8+ chars).' });
  }

  const ticketRef = `SUP-${crypto.randomInt(10000, 99999)}`;
  db.prepare(`
    INSERT INTO support_tickets (ticket_ref, user_id, name, email, mobile, subject, category, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ticketRef,
    session && session.uid > 0 ? session.uid : null,
    cleanName,
    cleanEmail,
    cleanMobile,
    cleanSubject,
    String(category || 'General Support').slice(0, 40),
    cleanMessage.slice(0, 2000)
  );

  res.status(201).json({ ok: true, ticketRef });
});

// ---------- ADMIN AUTHENTICATION & MANAGEMENT ----------
app.get('/api/admin/bootstrap-status', (_req, res) => {
  const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  const claimed = db.prepare('SELECT id, email FROM admin_credentials WHERE id = 1').get() as
    | { id: number; email: string }
    | undefined;
  res.json({
    hasEnvPasscode,
    isClaimed: Boolean(claimed),
    claimedEmailHint: claimed ? claimed.email.replace(/(^.).*(@.*$)/, '$1***$2') : null,
  });
});

app.post('/api/admin/claim', (req, res) => {
  const hasEnvPasscode = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  if (hasEnvPasscode) {
    return res.status(403).json({ error: 'Admin passcode is configured via environment settings.' });
  }
  const existing = db.prepare('SELECT id FROM admin_credentials WHERE id = 1').get();
  if (existing) {
    return res.status(409).json({ error: 'Admin access has already been claimed. Please sign in.' });
  }

  const { email, password } = req.body ?? {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  if (!isValidEmail(cleanEmail) || cleanPassword.length < 8) {
    return res.status(400).json({ error: 'Provide a valid admin email and password (minimum 8 characters).' });
  }

  db.prepare('INSERT INTO admin_credentials (id, email, password_hash) VALUES (1, ?, ?)').run(
    cleanEmail,
    hashPassword(cleanPassword)
  );

  const token = createSessionToken({ uid: 0, role: 'admin', email: cleanEmail });
  setSessionCookie(res, token);
  res.status(201).json({
    token,
    admin: { id: 0, fullName: 'Administrator', email: cleanEmail, role: 'admin' },
  });
});

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode && envPasscode.length > 0) {
    const passBuf = Buffer.from(cleanPassword);
    const envBuf = Buffer.from(envPasscode);
    if (passBuf.length !== envBuf.length || !crypto.timingSafeEqual(passBuf, envBuf)) {
      return res.status(401).json({ error: 'Invalid administrator passcode.' });
    }
    const adminEmail = isValidEmail(cleanEmail) ? cleanEmail : 'admin@indialoan.in';
    const token = createSessionToken({ uid: 0, role: 'admin', email: adminEmail });
    setSessionCookie(res, token);
    return res.json({
      token,
      admin: { id: 0, fullName: 'Administrator', email: adminEmail, role: 'admin' },
    });
  }

  const claimed = db.prepare('SELECT * FROM admin_credentials WHERE id = 1').get() as
    | { id: number; email: string; password_hash: string }
    | undefined;

  if (!claimed) {
    return res.status(400).json({ error: 'Admin access has not been claimed yet. Complete first-run setup.' });
  }

  if (cleanEmail !== claimed.email || !verifyPassword(cleanPassword, claimed.password_hash)) {
    return res.status(401).json({ error: 'Invalid administrator email or password.' });
  }

  const token = createSessionToken({ uid: 0, role: 'admin', email: claimed.email });
  setSessionCookie(res, token);
  res.json({
    token,
    admin: { id: 0, fullName: 'Administrator', email: claimed.email, role: 'admin' },
  });
});

app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
  const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const verifiedUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE mobile_verified = 1').get() as { c: number }).c;
  const totalApps = (db.prepare('SELECT COUNT(*) as c FROM loan_applications').get() as { c: number }).c;
  const pendingApps = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM loan_applications WHERE status IN ('application_submitted', 'verification_in_progress', 'under_review')"
      )
      .get() as { c: number }
  ).c;
  const approvedApps = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM loan_applications WHERE status IN ('approved', 'disbursement_pending', 'disbursed')"
      )
      .get() as { c: number }
  ).c;
  const disbursedApps = (
    db.prepare("SELECT COUNT(*) as c FROM loan_applications WHERE status = 'disbursed'").get() as { c: number }
  ).c;
  const rejectedApps = (
    db.prepare("SELECT COUNT(*) as c FROM loan_applications WHERE status = 'rejected'").get() as { c: number }
  ).c;
  const totalDisbursedInr = (
    db
      .prepare("SELECT COALESCE(SUM(requested_amount), 0) as s FROM loan_applications WHERE status = 'disbursed'")
      .get() as { s: number }
  ).s;
  const totalRepaidInr = (
    db
      .prepare("SELECT COALESCE(SUM(amount_inr), 0) as s FROM transactions WHERE status = 'verified_success'")
      .get() as { s: number }
  ).s;
  const openTickets = (
    db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status != 'resolved'").get() as { c: number }
  ).c;

  const statusBreakdown = db
    .prepare('SELECT status, COUNT(*) as count FROM loan_applications GROUP BY status')
    .all() as Array<{ status: string; count: number }>;

  res.json({
    totalUsers: usersCount,
    verifiedUsers,
    totalApplications: totalApps,
    pendingApplications: pendingApps,
    approvedApplications: approvedApps,
    disbursedApplications: disbursedApps,
    rejectedApplications: rejectedApps,
    totalDisbursedInr,
    totalRepaidInr,
    openTickets,
    statusBreakdown,
  });
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  res.json(rows.map((u) => sanitizeUser(u)));
});

app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const { mobileVerified } = req.body ?? {};
  db.prepare('UPDATE users SET mobile_verified = ? WHERE id = ?').run(mobileVerified ? 1 : 0, userId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  res.json({ user: sanitizeUser(updated) });
});

app.get('/api/admin/applications', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT a.*, u.full_name as applicant_name, u.mobile as applicant_mobile, u.email as applicant_email,
             p.title as product_title
      FROM loan_applications a
      JOIN users u ON u.id = a.user_id
      JOIN loan_products p ON p.id = a.product_id
      ORDER BY a.id DESC
    `)
    .all() as Array<Record<string, unknown>>;

  const timelineStmt = db.prepare('SELECT * FROM application_timeline WHERE application_id = ? ORDER BY id ASC');
  res.json(
    rows.map((r) => ({
      id: r.id,
      applicationNumber: r.application_number,
      userId: r.user_id,
      applicantName: r.applicant_name,
      applicantMobile: r.applicant_mobile,
      applicantEmail: r.applicant_email,
      productTitle: r.product_title,
      requestedAmount: Number(r.requested_amount),
      tenureMonths: Number(r.tenure_months),
      monthlyEmiInr: Number(r.monthly_emi_inr),
      netDisbursalInr: Number(r.net_disbursal_inr),
      totalRepayableInr: Number(r.total_repayable_inr),
      repaidAmountInr: Number(r.repaid_amount_inr),
      status: r.status,
      statusLabel: STAGE_LABELS[String(r.status)] || String(r.status),
      stepData: JSON.parse(String(r.step_data_json || '{}')),
      adminNotes: r.admin_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      timeline: timelineStmt.all(Number(r.id)),
    }))
  );
});

app.patch('/api/admin/applications/:id/status', requireAdmin, (req, res) => {
  const appId = Number(req.params.id);
  const { status, note } = req.body ?? {};
  if (!ALLOWED_STAGES.includes(status)) {
    return res.status(400).json({ error: 'Invalid loan application status stage.' });
  }

  const appRow = db.prepare('SELECT * FROM loan_applications WHERE id = ?').get(appId) as
    | Record<string, unknown>
    | undefined;
  if (!appRow) {
    return res.status(404).json({ error: 'Loan application not found.' });
  }

  const cleanNote = String(note || '').trim().slice(0, 400);
  db.prepare(`
    UPDATE loan_applications SET status = ?, admin_notes = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, cleanNote, appId);

  const label = STAGE_LABELS[status] || status;
  db.prepare(`
    INSERT INTO application_timeline (application_id, stage, label, note, actor)
    VALUES (?, ?, ?, ?, 'Compliance & Credit Team')
  `).run(appId, status, label, cleanNote || `Status updated to ${label}.`);

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, category)
    VALUES (?, ?, ?, 'loan')
  `).run(
    Number(appRow.user_id),
    `Loan ${appRow.application_number}: ${label}`,
    cleanNote || `Your loan application status is now ${label}.`
  );

  res.json({ ok: true, status, label });
});

app.get('/api/admin/products', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM loan_products ORDER BY amount_inr ASC').all() as Array<Record<string, unknown>>;
  res.json(
    rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      amountInr: Number(p.amount_inr),
      minTenureMonths: Number(p.min_tenure_months),
      maxTenureMonths: Number(p.max_tenure_months),
      interestRateMonthly: Number(p.interest_rate_monthly),
      aprPercent: Number(p.apr_percent),
      processingFeeInr: Number(p.processing_fee_inr),
      eligibilitySummary: p.eligibility_summary,
      badgeLabel: p.badge_label,
      features: JSON.parse(String(p.features_json || '[]')),
      isActive: Boolean(p.is_active),
    }))
  );
});

app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
  const productId = Number(req.params.id);
  const { title, interestRateMonthly, processingFeeInr, eligibilitySummary, isActive } = req.body ?? {};

  const existing = db.prepare('SELECT * FROM loan_products WHERE id = ?').get(productId) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Loan product not found.' });
  }

  const rate = Number(interestRateMonthly ?? existing.interest_rate_monthly);
  const apr = Number((rate * 12).toFixed(2));
  const fee = Math.max(0, Number(processingFeeInr ?? existing.processing_fee_inr));

  db.prepare(`
    UPDATE loan_products
    SET title = ?, interest_rate_monthly = ?, apr_percent = ?, processing_fee_inr = ?, eligibility_summary = ?, is_active = ?
    WHERE id = ?
  `).run(
    String(title ?? existing.title).trim(),
    rate,
    apr,
    fee,
    String(eligibilitySummary ?? existing.eligibility_summary).trim(),
    isActive === undefined ? Number(existing.is_active) : isActive ? 1 : 0,
    productId
  );

  res.json({ ok: true });
});

app.get('/api/admin/transactions', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(`
      SELECT t.*, u.full_name as user_name, u.mobile as user_mobile, a.application_number
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      JOIN loan_applications a ON a.id = t.application_id
      ORDER BY t.id DESC
    `)
    .all() as Array<Record<string, unknown>>;

  res.json(
    rows.map((t) => ({
      id: t.id,
      txnRef: t.txn_ref,
      userName: t.user_name,
      userMobile: t.user_mobile,
      applicationNumber: t.application_number,
      amountInr: Number(t.amount_inr),
      paymentMethod: t.payment_method,
      gatewayMode: t.gateway_mode,
      status: t.status,
      createdAt: t.created_at,
    }))
  );
});

app.get('/api/admin/tickets', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM support_tickets ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  res.json(
    rows.map((t) => ({
      id: t.id,
      ticketRef: t.ticket_ref,
      userId: t.user_id,
      name: t.name,
      email: t.email,
      mobile: t.mobile,
      subject: t.subject,
      category: t.category,
      message: t.message,
      status: t.status,
      adminReply: t.admin_reply,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))
  );
});

app.patch('/api/admin/tickets/:id', requireAdmin, (req, res) => {
  const ticketId = Number(req.params.id);
  const { status, adminReply } = req.body ?? {};
  const validStatuses = ['open', 'in_progress', 'resolved'];
  if (!validStatuses.includes(String(status))) {
    return res.status(400).json({ error: 'Invalid ticket status.' });
  }

  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as
    | Record<string, unknown>
    | undefined;
  if (!ticket) {
    return res.status(404).json({ error: 'Support ticket not found.' });
  }

  db.prepare(`
    UPDATE support_tickets SET status = ?, admin_reply = ?, updated_at = datetime('now') WHERE id = ?
  `).run(String(status), String(adminReply || '').trim(), ticketId);

  if (ticket.user_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, category)
      VALUES (?, ?, ?, 'support')
    `).run(
      Number(ticket.user_id),
      `Support Ticket ${ticket.ticket_ref} Updated`,
      String(adminReply || `Your ticket status is now ${status}.`).trim()
    );
  }

  res.json({ ok: true });
});

app.post('/api/admin/notifications/broadcast', requireAdmin, (req, res) => {
  const { userId, title, message, category } = req.body ?? {};
  const cleanTitle = String(title || '').trim();
  const cleanMessage = String(message || '').trim();
  if (cleanTitle.length < 2 || cleanMessage.length < 4) {
    return res.status(400).json({ error: 'Notification title and message are required.' });
  }

  if (userId) {
    db.prepare('INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)').run(
      Number(userId),
      cleanTitle,
      cleanMessage,
      String(category || 'info')
    );
    return res.json({ ok: true, count: 1 });
  }

  const users = db.prepare('SELECT id FROM users').all() as Array<{ id: number }>;
  const stmt = db.prepare('INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)');
  for (const u of users) {
    stmt.run(u.id, cleanTitle, cleanMessage, String(category || 'info'));
  }
  res.json({ ok: true, count: users.length });
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT key, value, updated_at FROM site_settings').all();
  res.json(rows);
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const updates = req.body?.settings;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload.' });
  }
  const stmt = db.prepare(`
    INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);
  for (const [k, v] of Object.entries(updates)) {
    if (typeof k === 'string' && typeof v === 'string') {
      stmt.run(k.slice(0, 64), v.slice(0, 600));
    }
  }
  res.json({ ok: true });
});

// ---------- VITE DEV / PROD STATIC ----------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`India Loan server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
