/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { LandingPage } from './components/LandingPage';
import { LoanApplicationWizard } from './components/LoanApplicationWizard';
import { MobileBottomNav, TopNavigation } from './components/Navigation';
import { OfflineIndicator } from './components/PWAInstallButton';
import { SplashScreen } from './components/SplashScreen';
import { InfoPageView, ProfileView, SupportCenterView } from './components/SupportProfilePages';
import { WalletPaymentsView } from './components/WalletPaymentsView';
import { apiRequest, setAuthToken } from './lib/api';
import { DEFAULT_LOAN_PRODUCTS, DEFAULT_SITE_SETTINGS } from './lib/catalog';
import type {
  AppPage,
  DashboardSummary,
  LoanApplication,
  LoanProduct,
  NotificationItem,
  TransactionRecord,
  User,
} from './types';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState<AppPage>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    return 'home';
  });

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<LoanProduct[]>(DEFAULT_LOAN_PRODUCTS);
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SITE_SETTINGS);
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadPublic = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prods, pubSettings] = await Promise.all([
        apiRequest<LoanProduct[]>('/api/products'),
        apiRequest<Record<string, string>>('/api/settings/public'),
      ]);
      if (Array.isArray(prods) && prods.length > 0) {
        setProducts(prods);
      }
      if (pubSettings && typeof pubSettings === 'object' && Object.keys(pubSettings).length > 0) {
        setSettings(pubSettings);
      }
    } catch {
      // Retain default catalog when offline or on static-only host
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadUserWorkspace = useCallback(async (currentUser: User | null) => {
    if (!currentUser || currentUser.role === 'admin') {
      setSummary(null);
      setApplications([]);
      setTransactions([]);
      setNotifications([]);
      return;
    }
    setLoadingUserData(true);
    try {
      const [sum, apps, txns, notifs] = await Promise.all([
        apiRequest<DashboardSummary>('/api/dashboard/summary'),
        apiRequest<LoanApplication[]>('/api/loans/applications'),
        apiRequest<TransactionRecord[]>('/api/transactions'),
        apiRequest<NotificationItem[]>('/api/notifications'),
      ]);
      setSummary(sum);
      setApplications(apps);
      setTransactions(txns);
      setNotifications(notifs);
    } catch {
      // handled gracefully
    } finally {
      setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 600);
    void loadPublic();
    apiRequest<{ user: User | null }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        if (res.user && res.user.role !== 'admin') {
          void loadUserWorkspace(res.user);
        }
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, [loadPublic, loadUserWorkspace]);

  const handleNavigate = (nextPage: AppPage, sectionId?: string) => {
    if ((nextPage === 'dashboard' || nextPage === 'apply' || nextPage === 'wallet' || nextPage === 'profile') && !user) {
      setPage('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPage(nextPage);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleApplyProduct = (product: LoanProduct) => {
    setSelectedProduct(product);
    if (!user) {
      setPage('auth');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setPage('apply');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    void loadUserWorkspace(loggedInUser);
    if (selectedProduct) {
      setPage('apply');
    } else {
      setPage(loggedInUser.role === 'admin' ? 'admin' : 'dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken(null);
    setUser(null);
    setSummary(null);
    setApplications([]);
    setTransactions([]);
    setNotifications([]);
    setPage('home');
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB]">
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>

      <TopNavigation
        currentPage={page}
        onNavigate={handleNavigate}
        user={user}
        unreadNotifications={unreadCount}
        onLogout={() => void handleLogout()}
      />

      <main className="flex-1">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {page === 'home' && (
            <LandingPage
              products={products}
              loadingProducts={loadingProducts}
              onRetryProducts={() => void loadPublic()}
              settings={settings}
              onApplyProduct={handleApplyProduct}
              onNavigate={handleNavigate}
            />
          )}

          {page === 'auth' && (
            <AuthView onSuccess={handleAuthSuccess} onNavigate={handleNavigate} />
          )}

          {page === 'apply' && user && (
            <LoanApplicationWizard
              user={user}
              products={products}
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
              onSubmitted={() => {
                setSelectedProduct(null);
                void loadUserWorkspace(user);
                setPage('dashboard');
              }}
              onCancel={() => handleNavigate(user ? 'dashboard' : 'home')}
            />
          )}

          {page === 'dashboard' && user && (
            <DashboardView
              summary={summary}
              applications={applications}
              products={products}
              notifications={notifications}
              loading={loadingUserData}
              onRefresh={() => loadUserWorkspace(user)}
              onApplyProduct={handleApplyProduct}
              onNavigate={handleNavigate}
            />
          )}

          {page === 'wallet' && user && (
            <WalletPaymentsView
              applications={applications}
              transactions={transactions}
              onRefresh={() => loadUserWorkspace(user)}
            />
          )}

          {page === 'support' && (
            <SupportCenterView user={user} settings={settings} onNavigate={handleNavigate} />
          )}

          {page === 'profile' && user && (
            <ProfileView
              user={user}
              onUpdated={(updated) => setUser(updated)}
              onLogout={() => void handleLogout()}
            />
          )}

          {(page === 'about' ||
            page === 'eligibility' ||
            page === 'privacy' ||
            page === 'terms' ||
            page === 'loans' ||
            page === 'how-it-works' ||
            page === 'faq' ||
            page === 'contact') && (
            <InfoPageView
              page={page}
              products={products}
              loadingProducts={loadingProducts}
              onRetryProducts={() => void loadPublic()}
              settings={settings}
              onApplyProduct={handleApplyProduct}
              onNavigate={handleNavigate}
            />
          )}

          {page === 'admin' && (
            <AdminDashboardView
              user={user}
              onAdminLogin={(adminUser) => {
                setUser(adminUser);
                setPage('admin');
              }}
              onLogout={() => void handleLogout()}
              onNavigate={handleNavigate}
              onRefreshPublic={loadPublic}
            />
          )}
        </motion.div>
      </main>

      {page !== 'admin' && (
        <MobileBottomNav currentPage={page} onNavigate={handleNavigate} user={user} />
      )}

      <OfflineIndicator />
    </div>
  );
}
