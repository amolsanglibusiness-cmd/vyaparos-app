'use client';

import { useEffect, useState } from 'react';

const SPLASH_DURATION_MS = 3400;

export function VihaanSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), SPLASH_DURATION_MS - 500);
    const hideTimer = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Vihaan"
      role="status"
      className={`vihaan-splash ${fading ? 'vihaan-splash--fade' : ''}`}
    >
      <img
        src="/vihaan-splash.gif"
        alt="Vihaan"
        className="vihaan-splash__animation"
        draggable={false}
      />

      <div className="vihaan-splash__fallback" aria-hidden="true">
        <img src="/icons/icon-512.png" alt="" className="vihaan-splash__icon" />
        <div className="vihaan-splash__name">Vihaan</div>
      </div>
    </div>
  );
}
