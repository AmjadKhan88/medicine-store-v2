import React, { useState, useEffect } from 'react';
import './EliteHMSLoader.css'
const EliteHMSLoader = () => {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let val = 0;
    const step = () => {
      val += 0.8 + Math.random() * 1.2;
      if (val > 100) val = 100;
      setPercent(Math.round(val));
      if (val < 100) {
        const delay = 120 + Math.random() * 180;
        setTimeout(step, delay);
      }
    };
    step();
  }, []);

  return (
    <div className="loader-wrapper" role="status" aria-label="Loading EliteHMS">
      {/* Floating glow orbs (light theme) */}
      <div className="glow-orbs" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>

      {/* Medical Cross */}
      <div className="cross-container">
        <div className="medical-cross">
          <div className="bar bar-v"></div>
          <div className="bar bar-h"></div>
          <div className="shine"></div>
        </div>
        <div className="cross-ring"></div>
      </div>

      {/* Heartbeat line */}
      <div className="heartbeat-wrap">
        <div className="heartbeat-line">
          <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#2563eb" />
                <stop offset="40%"  stopColor="#3b82f6" />
                <stop offset="70%"  stopColor="#0d9488" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <path d="M 0 20 L 30 20 L 42 6 L 54 34 L 66 6 L 78 20 L 110 20 L 122 8 L 134 32 L 146 8 L 158 20 L 200 20" />
          </svg>
          <div className="pulse-dot"></div>
        </div>
      </div>

      {/* Brand */}
      <div className="brand">
        <h1>Elite<span className="accent">HMS</span></h1>
        <div className="tagline">Hospital &bull; Pharmacy &bull; Management</div>
      </div>

      {/* Loading Dots */}
      <div className="dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-fill"></div>
      </div>
      <div className="percent">Loading &bull; {percent}%</div>
    </div>
  );
};

export default EliteHMSLoader;