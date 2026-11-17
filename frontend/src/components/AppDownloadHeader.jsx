import { useState } from 'react';
import { Icon } from './Icon';

export function AppDownloadHeader() {
  const [dismissed, setDismissed] = useState(false);
  const isInsideNativeApp = typeof window !== 'undefined' && Boolean(window.ReactNativeWebView);

  if (dismissed || isInsideNativeApp) return null;

  return (
    <div className="app-download-topbar">
      <div className="app-download-left">
        <div className="app-download-icon-box">
          <Icon name="game-controller" weight="fill" size={20} />
        </div>
        <div className="app-download-info">
          <div className="app-download-title">
            APP UP TO <span>৳888</span> &gt;&gt;&gt;
          </div>
          <div className="app-download-stars">★★★★★</div>
        </div>
      </div>

      <div className="app-download-right">
        <a
          href="/ckash-gaming.apk"
          download="ckash-gaming.apk"
          className="app-download-btn"
          onClick={(e) => {
            // If static APK is hosted, it downloads; otherwise notifies
            if (!e.currentTarget.getAttribute('href')?.endsWith('.apk')) {
              e.preventDefault();
              alert('অফিশিয়াল অ্যান্ড্রয়েড অ্যাপ ডাউনলোড প্রস্তুত হচ্ছে!');
            }
          }}
        >
          ডাউনলোড করুন
        </a>
        <button
          type="button"
          className="app-download-close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss app download notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
