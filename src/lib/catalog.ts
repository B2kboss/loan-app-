import type { LoanProduct } from '../types';

export const DEFAULT_LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 1,
    slug: 'starter-5k',
    title: 'Starter Micro Loan',
    amountInr: 5000,
    minTenureMonths: 3,
    maxTenureMonths: 6,
    interestRateMonthly: 1.5,
    aprPercent: 18.0,
    processingFeeInr: 150,
    eligibilitySummary:
      'Indian citizen aged 21–58 · Min. monthly income ₹12,000 · Valid PAN & Aadhaar KYC',
    badgeLabel: 'Popular Starter',
    features: [
      '₹0 upfront activation deposit',
      '1.50% per month (18% p.a. reducing)',
      'Flexible 3 to 6 month EMI tenure',
      '₹150 + GST processing deducted at disbursal',
    ],
    isActive: true,
  },
  {
    id: 2,
    slug: 'flexi-10k',
    title: 'Flexi Personal Loan',
    amountInr: 10000,
    minTenureMonths: 3,
    maxTenureMonths: 9,
    interestRateMonthly: 1.75,
    aprPercent: 21.0,
    processingFeeInr: 250,
    eligibilitySummary:
      'Salaried or self-employed aged 21–58 · Min. monthly income ₹18,000 · Active bank account',
    badgeLabel: 'Best Value',
    features: [
      '₹0 upfront activation deposit',
      '1.75% per month (21% p.a. reducing)',
      'Flexible 3 to 9 month EMI tenure',
      '₹250 + GST processing deducted at disbursal',
    ],
    isActive: true,
  },
  {
    id: 3,
    slug: 'growth-15k',
    title: 'Growth Personal Loan',
    amountInr: 15000,
    minTenureMonths: 6,
    maxTenureMonths: 12,
    interestRateMonthly: 1.9,
    aprPercent: 22.8,
    processingFeeInr: 350,
    eligibilitySummary:
      'Salaried or self-employed aged 21–58 · Min. monthly income ₹25,000 · PAN & bank verification',
    badgeLabel: 'Higher Limit',
    features: [
      '₹0 upfront activation deposit',
      '1.90% per month (22.8% p.a. reducing)',
      'Flexible 6 to 12 month EMI tenure',
      '₹350 + GST processing deducted at disbursal',
    ],
    isActive: true,
  },
];

export const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  support_email: 'support@indialoan.in',
  support_phone: '+91 1800-000-2407',
  grievance_officer: 'Nodal Grievance Desk · grievance@indialoan.in',
  lending_partner_notice:
    'Sandbox & Demo Platform: Lending partner registration details and live NBFC co-lending disclosures are displayed only upon verified partner onboarding.',
  sandbox_gateway_enabled: 'true',
  hero_notice: 'Digital KYC · Key Fact Statement Provided Before Acceptance',
  company_address: 'Level 6, Connaught Place Financial Centre, New Delhi 110001',
};
