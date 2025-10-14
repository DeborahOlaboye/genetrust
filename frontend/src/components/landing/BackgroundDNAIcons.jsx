import React, { useMemo } from 'react';

// Reusable floating DNA icons background
// Renders randomized SVG DNA/nucleotide icons with gentle motion
const palette = ['#8B5CF6', '#F472B6', '#F59E0B'];

const IconHelix = ({ color = '#8B5CF6' }) => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g-helix" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0" stopColor={color} />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.25" />
      </linearGradient>
    </defs>
    <path d="M16 8 C26 14, 30 18, 40 24 C30 30, 26 34, 16 40" stroke="url(#g-helix)" strokeWidth="3" strokeLinecap="round"/>
    <path d="M40 8 C30 14, 26 18, 16 24 C26 30, 30 34, 40 40" stroke={color} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round"/>
    <line x1="22" y1="16" x2="34" y2="16" stroke="#D6D7FF" strokeOpacity=".35" strokeWidth="2" />
    <line x1="20" y1="24" x2="36" y2="24" stroke="#D6D7FF" strokeOpacity=".35" strokeWidth="2" />
    <line x1="22" y1="32" x2="34" y2="32" stroke="#D6D7FF" strokeOpacity=".35" strokeWidth="2" />
  </svg>
);

const IconBasePair = ({ color = '#F472B6' }) => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="20" r="6" fill={color} opacity="0.6" />
    <circle cx="28" cy="20" r="6" fill={color} opacity="0.3" />
    <rect x="12" y="18.5" width="16" height="3" rx="1.5" fill="#D6D7FF" opacity="0.35" />
  </svg>
);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const BackgroundDNAIcons = ({ count = 24, zIndex = 0, className = '' }) => {
  const items = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const top = Math.random() * 100; // vh
      const left = Math.random() * 100; // vw
      const size = 0.7 + Math.random() * 1.3; // scale (slightly larger)
      const dur = 10 + Math.random() * 8; // seconds (faster)
      const delay = Math.random() * 10; // seconds
      const rotate = Math.random() * 360; // deg
      const color = pick(palette);
      const type = Math.random() > 0.5 ? 'helix' : 'pair';
      const sway = 8 + Math.random() * 8; // px (wider sway)

      return { id: i, top, left, size, dur, delay, rotate, color, type, sway };
    });
  }, [count]);

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} style={{ zIndex }}>
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            position: 'absolute',
            top: `${it.top}vh`,
            left: `${it.left}vw`,
            transform: `translate(-50%, -50%) scale(${it.size}) rotate(${it.rotate}deg)`,
          }}
        >
          <div
            className="dna-float dna-glow"
            style={{
              '--dur': `${it.dur}s`,
              '--delay': `${it.delay}s`,
              '--sway': `${it.sway}px`,
            }}
          >
            {it.type === 'helix' ? <IconHelix color={it.color} /> : <IconBasePair color={it.color} />}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BackgroundDNAIcons;
