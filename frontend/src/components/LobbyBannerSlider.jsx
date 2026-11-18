import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

const DEFAULT_SLIDES = [
  {
    id: 1,
    theme: 'gold-exclusive',
    tag: 'CKASH EXCLUSIVE',
    headline: 'আপনার এক্সক্লুসিভ লিংক',
    subline: 'শেয়ার করুন এবং মিলিয়নিয়ার হয়ে উঠুন',
    ctaText: 'এখনই খেলুন',
    ctaLink: '/games',
    badge: 'HOT OFFER',
    chips: ['WhatsApp', 'Telegram', 'Facebook', 'Messenger'],
  },
  {
    id: 2,
    theme: 'crimson-aviator',
    tag: 'SPRIBE OFFICIAL',
    headline: 'Aviator Fly & Win',
    subline: 'বিমান ক্র্যাশ হওয়ার আগেই ক্যাশআউট করুন',
    ctaText: 'Play Aviator',
    ctaLink: '/aviator',
    badge: '99% RTP',
    chips: ['Instant Cashout', '24/7 Live'],
  },
  {
    id: 3,
    theme: 'teal-bonus',
    tag: 'NEW MEMBER',
    headline: 'প্রথম ডিপোজিটে ১০০% বোনাস',
    subline: 'সর্বোচ্চ ৳৫,০০০ পর্যন্ত ওয়েলকাম বোনাস পান',
    ctaText: 'ডিপোজিট করুন',
    ctaLink: '/wallet',
    badge: '৳5000 BONUS',
    chips: ['bKash', 'Nagad', 'Rocket'],
  },
];

export function LobbyBannerSlider({ slides = DEFAULT_SLIDES }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const activeSlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES;

  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, activeSlides.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
  };

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  return (
    <div
      className="lobby-slider-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`lobby-slide-card theme-${currentSlide.theme || 'gold-exclusive'}`}>
        {/* Background glow & accents */}
        <div className="lobby-slide-backdrop" />

        {/* Decorative corner artwork */}
        <div className="lobby-slide-art-left">
          <span className="cash-stack-glow">💰</span>
        </div>
        <div className="lobby-slide-art-right">
          <span className="trophy-sparkle">👑</span>
        </div>

        {/* Main Content Area */}
        <div className="lobby-slide-content">
          <div className="lobby-slide-top-tags">
            <span className="lobby-slide-brand-badge">
              <span className="crown-icon">👑</span> CkasH
            </span>
            {currentSlide.badge && (
              <span className="lobby-slide-hot-badge">{currentSlide.badge}</span>
            )}
          </div>

          <h2 className="lobby-slide-headline">{currentSlide.headline}</h2>
          <p className="lobby-slide-subline">{currentSlide.subline}</p>

          {currentSlide.chips && (
            <div className="lobby-slide-share-chips">
              {currentSlide.chips.map((chip, idx) => (
                <span key={idx} className="share-chip">
                  <span className="share-chip-dot" />
                  {chip}
                </span>
              ))}
            </div>
          )}

          <div className="lobby-slide-actions">
            <button
              type="button"
              className="lobby-slide-cta-btn"
              onClick={() => navigate(currentSlide.ctaLink || '/games')}
            >
              <span>{currentSlide.ctaText || 'এখনই খেলুন'}</span>
              <span className="cta-arrow">➜</span>
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          type="button"
          className="slider-nav-btn prev"
          onClick={goToPrev}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          type="button"
          className="slider-nav-btn next"
          onClick={goToNext}
          aria-label="Next slide"
        >
          ›
        </button>

        {/* Dot Indicators */}
        <div className="slider-dots-wrapper">
          {activeSlides.map((s, idx) => (
            <button
              key={s.id || idx}
              type="button"
              className={`slider-dot${idx === currentIndex ? ' active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
