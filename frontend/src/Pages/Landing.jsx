import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  MdMedicalServices, MdPeople, MdReceipt, MdWarning,
  MdBarChart, MdInventory, MdCheckCircle, MdArrowForward,
  MdStar, MdWhatsapp, MdMenu, MdClose,
} from 'react-icons/md';

const PKR = (n) => `₨ ${Number(n).toLocaleString('en-PK')}`;

export default function Landing() {
  const navigate     = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled]     = useState(false);



  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    { icon: <MdMedicalServices />, title: 'Medicine Inventory', desc: 'Add, track and manage thousands of medicines with batch numbers, expiry dates and stock levels.' },
    { icon: <MdWarning />,         title: 'Expiry Alerts',       desc: 'Get automatic alerts for expired and soon-to-expire medicines. Download PDF reports instantly.' },
    { icon: <MdPeople />,          title: 'Patient Records',     desc: 'Maintain complete patient profiles, medical history, allergies and visit records.' },
    { icon: <MdReceipt />,         title: 'Billing & Invoices',  desc: 'Create professional invoices, track payments, and manage outstanding balances.' },
    { icon: <MdInventory />,       title: 'Purchase Orders',     desc: 'Manage supplier orders, receive stock, and track what you owe to suppliers.' },
    { icon: <MdBarChart />,        title: 'Reports & Analytics', desc: 'Revenue trends, top medicines, patient spending — filter by any date range and export.' },
  ];

  const plans = [
    {
      key: 'free', name: 'Free Trial', price: 0, badge: '14 Days',
      color: '#6366f1',
      features: ['50 medicines', '20 patients', '1 user', '50 bills/month', 'All features unlocked'],
    },
    {
      key: 'basic', name: 'Basic', price: 2999, badge: '🔥 Most Popular',
      color: '#0ea5e9',
      features: ['500 medicines', '200 patients', '3 staff members', 'Unlimited bills', 'PDF invoices & reports', 'WhatsApp reminders'],
    },
    {
      key: 'pro', name: 'Pro', price: 5999, badge: 'Best Value',
      color: '#8b5cf6',
      features: ['Unlimited everything', 'Unlimited staff', 'Advanced analytics', 'Audit log', 'Data backup & restore', 'Priority support'],
    },
  ];

  const testimonials = [
    { name: 'Dr. Tariq Hassan', store: 'Al-Shifa Medical, Peshawar',    text: 'MediStore ne hamari pharmacy completely badal di. Expiry alerts aur WhatsApp reminders bohat helpful hain.' },
    { name: 'Dr. Fatima Malik', store: 'Malik Pharmacy, Lahore',        text: 'Patient records aur billing ek jagah — staff bhi easily use kar leta hai. Highly recommended!' },
    { name: 'Imran Pharmacy',   store: 'City Medical Store, Islamabad', text: 'Reports feature bohat achi hai. Ab pata chalta hai konsi dawa zyada bikti hai aur kahan loss ho raha hai.' },
  ];

  const stats = [
    { value: '500+', label: 'Pharmacies Using' },
    { value: '50K+', label: 'Medicines Tracked' },
    { value: '100K+', label: 'Invoices Generated' },
    { value: '99.9%', label: 'Uptime' },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#fff', color: '#0f172a' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position:   'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #e2e8f0' : 'none',
        transition: 'all 0.3s',
        padding: '0 5%',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Medi<span style={{ color: '#0ea5e9' }}>Store</span>
          </div>
          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
            {['Features', 'Pricing', 'Testimonials'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                style={{ fontSize: 14, fontWeight: 600, color: '#475569', textDecoration: 'none' }}>
                {item}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link to="/login"
              style={{ fontSize: 14, fontWeight: 600, color: '#475569', textDecoration: 'none', padding: '8px 16px' }}>
              Sign In
            </Link>
            <button onClick={() => navigate('/register')}
              style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        padding: '140px 5% 100px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 99, padding: '6px 16px', marginBottom: 24 }}>
            <MdStar size={14} style={{ color: '#0ea5e9' }} />
            <span style={{ fontSize: 13, color: '#7dd3fc', fontWeight: 600 }}>Trusted by 500+ Pakistani Pharmacies</span>
          </div>

          <h1 style={{ fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: -1.5, margin: '0 0 20px' }}>
            Complete Pharmacy<br />
            Management System
            <span style={{ color: '#0ea5e9' }}> for Pakistan</span>
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 40px' }}>
            Manage medicines, patients, billing and staff from one professional dashboard.
            Expiry alerts, WhatsApp reminders, PDF invoices — everything your pharmacy needs.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')}
              style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              Start Free Trial — 14 Days Free <MdArrowForward />
            </button>
            <button onClick={() => navigate('/login')}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '15px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Sign In
            </button>
          </div>

          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {['No credit card needed', '14-day free trial', 'Cancel anytime'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                <MdCheckCircle size={14} style={{ color: '#22c55e' }} /> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div style={{ maxWidth: 900, margin: '60px auto 0', background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
          {/* Mockup titlebar */}
          <div style={{ background: '#0f172a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
            <div style={{ flex: 1, background: '#1e293b', borderRadius: 6, height: 24, marginLeft: 12 }} />
          </div>
          {/* Mockup stats */}
          <div style={{ padding: 28, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { label: 'Total Medicines', value: '248',       color: '#0ea5e9' },
              { label: 'Total Patients',  value: '1,045',     color: '#22c55e' },
              { label: "Today's Revenue", value: '₨ 18,500',  color: '#8b5cf6' },
              { label: 'Expiry Alerts',   value: '3 Urgent',  color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', border: `1px solid ${s.color}30` }}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '32px 5%' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, textAlign: 'center' }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0ea5e9' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '90px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Features</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Everything your pharmacy needs</h2>
            <p style={{ color: '#64748b', fontSize: 16, marginTop: 12 }}>From inventory to invoicing — all in one professional system</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.background = '#f0f9ff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontSize: 22, marginBottom: 16 }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</div>
                <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: '90px 5%', background: '#f8fafc' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, margin: 0 }}>Simple, transparent pricing</h2>
            <p style={{ color: '#64748b', fontSize: 16, marginTop: 12 }}>
              Pay via JazzCash, EasyPaisa or Bank Transfer · Activate within 24 hours
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {plans.map((p, i) => (
              <div key={i} style={{
                background: p.key === 'basic' ? p.color : '#fff',
                color:      p.key === 'basic' ? '#fff'   : '#0f172a',
                borderRadius: 20, padding: 32,
                border: `2px solid ${p.key === 'basic' ? p.color : '#e2e8f0'}`,
                position: 'relative',
                transform: p.key === 'basic' ? 'scale(1.05)' : 'none',
                boxShadow: p.key === 'basic' ? `0 20px 50px ${p.color}40` : 'none',
              }}>
                {p.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: p.key === 'basic' ? '#0f172a' : p.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {p.badge}
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 34, fontWeight: 800, marginBottom: 20 }}>
                  {p.price === 0 ? 'Free' : PKR(p.price)}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.7 }}>{p.price > 0 ? '/month' : ''}</span>
                </div>
                {p.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8, opacity: 0.9 }}>
                    <MdCheckCircle size={16} style={{ color: p.key === 'basic' ? '#fff' : p.color, flexShrink: 0 }} /> {f}
                  </div>
                ))}
                <button onClick={() => navigate('/register')}
                  style={{ marginTop: 28, width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, background: p.key === 'basic' ? '#fff' : p.color, color: p.key === 'basic' ? p.color : '#fff', fontFamily: 'inherit' }}>
                  {p.price === 0 ? 'Start Free Trial' : `Get ${p.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" style={{ padding: '90px 5%' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Testimonials</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, margin: 0 }}>Trusted by pharmacists across Pakistan</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 16, padding: 28, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                  {[...Array(5)].map((_, si) => <MdStar key={si} size={16} style={{ color: '#f59e0b' }} />)}
                </div>
                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>"{t.text}"</p>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{t.store}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', padding: '80px 5%', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', margin: '0 0 16px' }}>
            Start managing your pharmacy today
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 36 }}>
            Join 500+ pharmacies using MediStore. Free for 14 days — no card required.
          </p>
          <button onClick={() => navigate('/register')}
            style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 44px', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Create Free Account <MdArrowForward />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0f172a', color: '#64748b', padding: '40px 5%', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          Medi<span style={{ color: '#0ea5e9' }}>Store</span>
        </div>
        <div style={{ fontSize: 13, marginBottom: 16 }}>
          Professional Medicine Store Management · Made for Pakistani Pharmacies
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 13 }}>
          <Link to="/login"    style={{ color: '#64748b', textDecoration: 'none' }}>Sign In</Link>
          <Link to="/register" style={{ color: '#64748b', textDecoration: 'none' }}>Register</Link>
          <a href="mailto:support@medistore.pk" style={{ color: '#64748b', textDecoration: 'none' }}>Support</a>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: '#334155' }}>
          © {new Date().getFullYear()} MediStore. All rights reserved.
        </div>
      </footer>
    </div>
  );
}