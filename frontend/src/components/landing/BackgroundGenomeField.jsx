import React, { useEffect, useRef } from 'react';

/**
 * BackgroundGenomeField
 * Canvas-based background animation: flowing genome ribbons + nucleotides.
 * Lightweight, section-scoped, scroll-reactive, and palette-aware.
 */
const colors = {
  ribbonA: '#8B5CF6', // violet
  ribbonB: '#F472B6', // pink
  accent: '#F59E0B',  // amber
  subtle: 'rgba(214, 215, 255, 0.35)', // rung/particle
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const BackgroundGenomeField = ({
  opacity = 0.22,
  ribbons = 3,
  nucleotides = 70,
  speed = 0.3,          // base animation speed
  density = 1.0,        // 0.5..1.5 affects count
  parallax = 0.06,      // scroll coupling
  className = '',
}) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const pxRatioRef = useRef(1);
  const stateRef = useRef({ t: 0, w: 0, h: 0, scrollY: 0 });

  // Resize canvas to element size and device pixel ratio
  const fit = () => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    pxRatioRef.current = dpr;
    c.width = Math.max(1, Math.floor(rect.width * dpr));
    c.height = Math.max(1, Math.floor(rect.height * dpr));
    stateRef.current.w = c.width;
    stateRef.current.h = c.height;
  };

  // Draw a smooth ribbon path with vertical sine modulation
  const ribbonPath = (ctx, t, idx) => {
    const { w, h } = stateRef.current;
    const amp = h * (0.06 + 0.02 * idx);
    const yBase = h * (0.25 + (idx / (ribbons + 1))); // layered
    const freq = 0.0018 + idx * 0.0006;
    ctx.beginPath();
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const x = (w / steps) * i;
      const y = yBase + Math.sin((x + t * 1200) * freq) * amp;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  };

  // Render loop
  const draw = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = pxRatioRef.current;
    const { w, h, t, scrollY } = stateRef.current;

    // Parallax translate based on scroll
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = opacity;
    ctx.clearRect(0, 0, w, h);
    ctx.translate(0, -scrollY * parallax * dpr);

    // Background subtle vignette
    const gradBg = ctx.createRadialGradient(w * 0.7, h * 0.3, 20, w * 0.5, h * 0.5, Math.max(w, h));
    gradBg.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
    gradBg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradBg;
    ctx.fillRect(0, 0, w, h);

    // Ribbons
    for (let i = 0; i < ribbons; i++) {
      ribbonPath(ctx, t + i * 0.07, i);
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, colors.ribbonA);
      grad.addColorStop(1, colors.ribbonB);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = 'rgba(139, 92, 246, 0.25)';
      ctx.shadowBlur = 8 * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Base-pair rungs along the middle ribbon
    const middleIdx = Math.floor(ribbons / 2);
    const rungCount = Math.floor(40 * density);
    for (let i = 0; i < rungCount; i++) {
      const x = (w / rungCount) * i + ((t * 200) % (w / rungCount));
      const y = h * 0.5 + Math.sin((x + t * 1200) * 0.0022) * (h * 0.08);
      ctx.strokeStyle = colors.subtle;
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(x - 10 * dpr, y);
      ctx.lineTo(x + 10 * dpr, y);
      ctx.stroke();
    }

    // Nucleotides (small particles drifting upward)
    const nucCount = Math.floor(nucleotides * density);
    for (let i = 0; i < nucCount; i++) {
      const nx = (i * 977) % w; // pseudo-random spread
      const ny = ((i * 613) + (t * 60 * (1 + (i % 5) * 0.12))) % h;
      const r = (i % 3) + 1;
      ctx.beginPath();
      ctx.fillStyle = i % 2 === 0 ? colors.ribbonA : colors.ribbonB;
      ctx.globalAlpha = opacity * 1.2;
      ctx.arc(nx, h - ny, r * dpr, 0, Math.PI * 2);
      ctx.fill();
      if (i % 9 === 0) {
        // occasional amber spark
        ctx.globalAlpha = opacity * 0.9;
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(nx + 6, h - ny - 3, 1.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = opacity;
    }

    stateRef.current.t += 0.0015 * speed * (1 + scrollY * 0.0001);
    rafRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    fit();
    const onResize = () => fit();
    const onScroll = () => { stateRef.current.scrollY = window.scrollY || 0; };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full ${className}`} />
  );
};

export default BackgroundGenomeField;
