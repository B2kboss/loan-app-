import React from 'react';
import {
  Bell,
  Briefcase,
  Headphones,
  Home,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import type { AppPage, User } from '../types';
import { IndiaLoanLogo } from './IndiaLoanLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface NavigationProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage, sectionId?: string) => void;
  user: User | null;
  unreadNotifications: number;
  onLogout: () => void;
}

export const TopNavigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  user,
  unreadNotifications,
  onLogout,
}) => {
  const navLinks: Array<{ label: string; page: AppPage; section?: string }> = [
    { label: 'Home', page: 'home', section: 'hero-top' },
    { label: 'Loans', page: 'home', section: 'loan-packages' },
    { label: 'About Us', page: 'about' },
    { label: 'How It Works', page: 'home', section: 'how-it-works' },
    { label: 'FAQ', page: 'home', section: 'faq-section' },
    { label: 'Contact', page: 'home', section: 'contact-section' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#071A4B]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => onNavigate('home', 'hero-top')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg"
        >
          <IndiaLoanLogo variant="light" size="sm" />
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-blue-100">
          {navLinks.map((item) => {
            const active =
              (item.page === currentPage && !item.section) ||
              (currentPage === 'home' && item.label === 'Home');
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.page, item.section)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-white relative ${
                  active ? 'text-white font-semibold' : 'text-blue-100/90'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {user.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {user.role === 'admin' ? 'Admin' : 'Dashboard'}
                </span>
                {unreadNotifications > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#10B981] text-[10px] font-bold text-white tabular-nums">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {user.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  aria-label="Notifications"
                  className="md:hidden relative p-2 rounded-lg bg-white/10 hover:bg-white/20 min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#10B981]" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10 text-xs font-medium text-blue-100 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-white/25 hover:bg-white/10 text-xs sm:text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-xs sm:text-sm font-semibold text-white transition-colors shadow-sm whitespace-nowrap shrink-0 min-h-[38px]"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  user: User | null;
}

export const MobileBottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate, user }) => {
  const tabs: Array<{
    id: string;
    label: string;
    page: AppPage;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', label: 'Home', page: user ? 'dashboard' : 'home', icon: Home },
    { id: 'loans', label: 'Loans', page: 'loans', icon: Briefcase },
    { id: 'wallet', label: 'Wallet', page: 'wallet', icon: Wallet },
    { id: 'support', label: 'Support', page: 'support', icon: Headphones },
    { id: 'profile', label: 'Profile', page: user ? 'profile' : 'auth', icon: UserIcon },
  ];

  return (
    <nav
      aria-label="Mobile app navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_20px_rgba(10,33,92,0.06)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            currentPage === tab.page ||
            (tab.id === 'loans' && currentPage === 'apply') ||
            (tab.id === 'home' && !user && currentPage === 'home');

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.page)}
              className={`relative flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                isActive ? 'text-[#155EEF]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-[#155EEF]" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
