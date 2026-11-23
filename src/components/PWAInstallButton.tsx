import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{compact ? 'App' : 'Install App'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        }`}
        title="Install India Loan App"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>{compact ? 'Get App' : 'Get App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-guide-title" className="text-lg font-bold text-[#0A215C]">
                  Install India Loan App
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add to your home screen for a full-screen mobile app experience.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {isIOS ? (
                <>
                  <p>1. Tap the <strong>Share</strong> icon in Safari’s bottom toolbar.</p>
                  <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                  <p>3. Tap <strong>Add</strong> to launch India Loan like a native iOS app.</p>
                </>
              ) : (
                <>
                  <p>1. Open your browser menu (three dots in the top-right corner).</p>
                  <p>2. Tap <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</p>
                  <p>3. Launch India Loan directly from your device home screen.</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#0A215C] hover:bg-[#155EEF] text-white font-semibold py-2.5 text-sm transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:right-auto z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Cached views are active. Reconnect to submit applications or payments.</span>
    </div>
  );
};
