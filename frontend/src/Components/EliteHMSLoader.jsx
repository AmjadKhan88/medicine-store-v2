import { useState, useEffect } from 'react';
import './EliteHMSLoader.css'
const EliteHMSLoader = () => {
  const [percent,    setPercent]    = useState(0);
  const [slowMsg,    setSlowMsg]    = useState(false);
  const [verySlowMsg,setVerySlowMsg]= useState(false);

  useEffect(() => {
    let val = 0;
    /* Progress animation — slows near 90% then pauses (realistic) */
    const step = () => {
      const speed = val < 70 ? 1.5 + Math.random() * 2 : 0.2 + Math.random() * 0.3;
      val += speed;
      if (val > 92) val = 92;   // pause at 92 — real completion sets it to 100
      setPercent(Math.round(val));
      if (val < 92) {
        const delay = val < 70 ? 80 + Math.random() * 120 : 300 + Math.random() * 400;
        setTimeout(step, delay);
      }
    };
    step();

    /* Show "taking longer than usual" message after 4s */
    const t1 = setTimeout(() => setSlowMsg(true), 4000);

    /* Show "server waking up" message after 10s */
    const t2 = setTimeout(() => setVerySlowMsg(true), 10000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="loader-wrapper" role="status" aria-label="Loading EliteHMS">
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

      {/* Progress */}
      <div className="progress-wrap">
        <div className="progress-fill"></div>
      </div>
      <div className="percent">Loading &bull; {percent}%</div>

      {/* Slow connection messages */}
      {slowMsg && !verySlowMsg && (
        <div style={{
          marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.5)',
          textAlign: 'center', animation: 'fadeIn 0.5s ease',
        }}>
          Connecting to server...
        </div>
      )}
      {verySlowMsg && (
        <div style={{
          marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)',
          textAlign: 'center', lineHeight: 1.6,
          animation: 'fadeIn 0.5s ease',
        }}>
          Server is waking up — usually takes 15-30 seconds on first visit.<br/>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Please wait or refresh the page.</span>
        </div>
      )}
    </div>
  );
};

export default EliteHMSLoader;