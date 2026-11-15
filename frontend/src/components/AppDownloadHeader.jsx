import { useState } from 'react';
import { Icon } from './Icon';

export function AppDownloadHeader() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

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
          href="#download"
          className="app-download-btn"
          onClick={(e) => {
            e.preventDefault();
            alert('অফিশিয়াল অ্যাপ শীঘ্রই ডাউনলোডযোগ্য হবে!');
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
