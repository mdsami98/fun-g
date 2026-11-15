import { Icon } from './Icon';

export function MarqueeNotice() {
  const notices = [
    '🔥 ১ম ডিপোজিটে ১০০% ওয়েলকাম বোনাস উপভোগ করুন!',
    '💰 বন্ধুদের রেফার করুন এবং পান প্রতি রেফারে ৳৫০০ বোনাস!',
    '🎁 ভিআইপি ক্লাবে জয়েন করে দৈনিক ৫% পর্যন্ত ক্যাশব্যাক পান!',
    '🚀 Aviator এ খেলুন এবং জিতে নিন আনলিমিটেড মাল্টিপ্লায়ার!',
  ];

  return (
    <div className="lobby-marquee-bar">
      <div className="marquee-icon-box">
        <span className="bell-glow" />
        <span className="bell-emoji">🔔</span>
      </div>

      <div className="marquee-track-container">
        <div className="marquee-track">
          <span className="marquee-content">{notices.join('  •  ')}</span>
          <span className="marquee-content" aria-hidden="true">
            {notices.join('  •  ')}
          </span>
        </div>
      </div>

      <div className="marquee-app-badge-box">
        <a
          href="#app"
          className="marquee-app-pill"
          onClick={(e) => {
            e.preventDefault();
            alert('অফিশিয়াল অ্যাপ ডাউনলোড শীঘ্রই শুরু হবে!');
          }}
        >
          <span className="marquee-down-arrow">⬇</span>
          <span className="marquee-app-text">APP</span>
        </a>
      </div>
    </div>
  );
}
