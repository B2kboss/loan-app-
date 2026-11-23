import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'india_loan.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      mobile_verified INTEGER NOT NULL DEFAULT 0,
      pan_masked TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      employment_type TEXT DEFAULT '',
      monthly_income INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      verified INTEGER NOT NULL DEFAULT 0,
      reset_token_hash TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loan_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      amount_inr INTEGER NOT NULL,
      min_tenure_months INTEGER NOT NULL,
      max_tenure_months INTEGER NOT NULL,
      interest_rate_monthly REAL NOT NULL,
      apr_percent REAL NOT NULL,
      processing_fee_inr INTEGER NOT NULL,
      eligibility_summary TEXT NOT NULL,
      badge_label TEXT NOT NULL DEFAULT '',
      features_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loan_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES loan_products(id),
      requested_amount INTEGER NOT NULL,
      tenure_months INTEGER NOT NULL,
      interest_rate_monthly REAL NOT NULL,
      processing_fee_inr INTEGER NOT NULL,
      gst_inr INTEGER NOT NULL,
      net_disbursal_inr INTEGER NOT NULL,
      monthly_emi_inr INTEGER NOT NULL,
      total_repayable_inr INTEGER NOT NULL,
      repaid_amount_inr INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'application_submitted',
      step_data_json TEXT NOT NULL,
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS application_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      label TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      actor TEXT NOT NULL DEFAULT 'System',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txn_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id INTEGER NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
      amount_inr INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      payer_handle TEXT NOT NULL DEFAULT '',
      gateway_mode TEXT NOT NULL DEFAULT 'sandbox',
      gateway_order_id TEXT NOT NULL,
      gateway_signature TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      receipt_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_ref TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General Inquiry',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_reply TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const productCount = db.prepare('SELECT COUNT(*) as count FROM loan_products').get() as { count: number };
  if (productCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO loan_products (
        slug, title, amount_inr, min_tenure_months, max_tenure_months,
        interest_rate_monthly, apr_percent, processing_fee_inr,
        eligibility_summary, badge_label, features_json, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertProduct.run(
      'starter-5k',
      'Starter Micro Loan',
      5000,
      3,
      6,
      1.5,
      18.0,
      150,
      'Indian citizen aged 21–58 · Min. monthly income ₹12,000 · Valid PAN & Aadhaar KYC',
      'Popular Starter',
      JSON.stringify([
        '₹0 upfront activation deposit',
        '1.50% per month (18% p.a. reducing)',
        'Flexible 3 to 6 month EMI tenure',
        '₹150 + GST processing deducted at disbursal',
      ])
    );

    insertProduct.run(
      'flexi-10k',
      'Flexi Personal Loan',
      10000,
      3,
      9,
      1.75,
      21.0,
      250,
      'Salaried or self-employed aged 21–58 · Min. monthly income ₹18,000 · Active bank account',
      'Best Value',
      JSON.stringify([
        '₹0 upfront activation deposit',
        '1.75% per month (21% p.a. reducing)',
        'Flexible 3 to 9 month EMI tenure',
        '₹250 + GST processing deducted at disbursal',
      ])
    );

    insertProduct.run(
      'growth-15k',
      'Growth Personal Loan',
      15000,
      6,
      12,
      1.9,
      22.8,
      350,
      'Salaried or self-employed aged 21–58 · Min. monthly income ₹25,000 · PAN & bank verification',
      'Higher Limit',
      JSON.stringify([
        '₹0 upfront activation deposit',
        '1.90% per month (22.8% p.a. reducing)',
        'Flexible 6 to 12 month EMI tenure',
        '₹350 + GST processing deducted at disbursal',
      ])
    );
  }

  const defaultSettings: Array<[string, string]> = [
    ['support_email', 'support@indialoan.in'],
    ['support_phone', '+91 1800-000-2407'],
    ['grievance_officer', 'Nodal Grievance Desk · grievance@indialoan.in'],
    ['lending_partner_notice', 'Sandbox & Demo Platform: Lending partner registration details and live NBFC co-lending disclosures are displayed only upon verified partner onboarding.'],
    ['sandbox_gateway_enabled', 'true'],
    ['hero_notice', 'Digital KYC · Key Fact Statement Provided Before Acceptance'],
    ['company_address', 'Level 6, Connaught Place Financial Centre, New Delhi 110001'],
  ];

  const upsertSetting = db.prepare(`
    INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);
  for (const [k, v] of defaultSettings) {
    upsertSetting.run(k, v);
  }
}

export function calculateLoanBreakdown(
  principal: number,
  tenureMonths: number,
  monthlyRatePercent: number,
  processingFeeInr: number
) {
  const r = monthlyRatePercent / 100;
  const n = Math.max(1, tenureMonths);
  const emi =
    r === 0
      ? Math.round(principal / n)
      : Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  const totalRepayable = emi * n;
  const gstInr = Math.round(processingFeeInr * 0.18);
  const netDisbursal = Math.max(0, principal - processingFeeInr - gstInr);

  return {
    monthlyEmiInr: emi,
    totalRepayableInr: totalRepayable,
    processingFeeInr,
    gstInr,
    netDisbursalInr: netDisbursal,
    totalInterestInr: Math.max(0, totalRepayable - principal),
  };
}
