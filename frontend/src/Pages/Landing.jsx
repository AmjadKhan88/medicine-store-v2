import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MdMedicalServices, MdPeople, MdReceipt, MdWarning,
  MdBarChart, MdSecurity, MdSmartphone, MdChat,
  MdCheckCircle, MdMenu, MdClose, MdArrowForward,
  MdStar, MdWhatsapp, MdEmail, MdPhone,
} from 'react-icons/md';

const PKR = (n) => `₨ ${Number(n).toLocaleString('en-PK')}`;

/* ── Responsive hook ── */
function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}

/* ── Data ── */
const FEATURES = [
  { icon: <MdMedicalServices size={26} />, title: 'Medicine Inventory', desc: 'Track stock, batch numbers, expiry dates and get instant low-stock alerts.', color: '#0ea5e9' },
  { icon: <MdPeople size={26} />, title: 'Patient Records', desc: 'Complete profiles with allergies, blood group, medical history and portal links.', color: '#10b981' },
  { icon: <MdReceipt size={26} />, title: 'Billing & Invoices', desc: 'Fast invoicing with A4 and thermal templates. JazzCash, EasyPaisa, Cash.', color: '#f59e0b' },
  { icon: <MdWarning size={26} />, title: 'Expiry Alerts', desc: 'Weekly email + push digest every Monday. Export PDF or Excel report.', color: '#ef4444' },
  { icon: <MdBarChart size={26} />, title: 'Reports & Analytics', desc: 'Revenue trends, top medicines, patient spending. Export CSV or PDF.', color: '#8b5cf6' },
  { icon: <MdSecurity size={26} />, title: 'Role Management', desc: 'Admin, Doctor and Pharmacist roles with separate permissions.', color: '#ec4899' },
  { icon: <MdSmartphone size={26} />, title: 'PWA — Works Offline', desc: 'Install on Android or iPhone. Works even without internet.', color: '#06b6d4' },
  { icon: <MdChat size={26} />, title: 'AI Medicine Assistant', desc: 'Gemini + Groq powered. Check drug interactions, get dosage info instantly.', color: '#f97316' },
];

const PLANS = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    desc: 'Try every feature free. No credit card needed.',
    features: ['50 medicines', '20 patients', '50 bills/month', '1 user account', 'All features unlocked'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Basic',
    price: '₨2,999',
    period: 'per month',
    desc: 'For growing pharmacies with a small team.',
    features: ['500 medicines', '200 patients', '3 staff members', 'Unlimited bills', 'PDF invoices & reports', 'WhatsApp reminders', 'Expiry alerts'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '₨5,999',
    period: 'per month',
    desc: 'For busy pharmacies needing unlimited everything.',
    features: ['Unlimited medicines', 'Unlimited patients', 'Unlimited staff', 'Unlimited bills', 'AI medicine assistant', 'Audit log & backup', 'Priority support'],
    cta: 'Go Pro',
    highlight: false,
  },
];

const TESTIMONIALS = [
  { name: 'Dr. Tariq Mehmood', role: 'Pharmacy Owner, Peshawar', rating: 5, text: 'MediStore completely replaced our paper system. Expiry alerts save us thousands every month. The thermal invoice printing works perfectly.' },
  { name: 'Dr. Fatima Siddiqui', role: 'Clinic Owner, Lahore', rating: 5, text: 'The AI drug interaction checker is a game changer. I can check interactions in seconds before dispensing. My patients trust me more now.' },
  { name: 'Ahmed Khan', role: 'Medical Store, Karachi', rating: 5, text: 'JazzCash and EasyPaisa payment tracking is exactly what we needed. No more lost receipts. WhatsApp reminders for dues are brilliant.' },
];

const STATS = [
  { value: '500+', label: 'Pharmacies' },
  { value: '50K+', label: 'Medicines Tracked' },
  { value: '200K+', label: 'Invoices Generated' },
  { value: '99.9%', label: 'Uptime' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const width = useWidth();
  const isMobile = width < 768;
  const isTablet = width < 1024;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* ── styles ── */
  const s = {
    /* layout */
    container: { maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px' },
    section: { padding: isMobile ? '60px 0' : '90px 0' },

    /* nav */
    nav: {
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? '#fff' : 'rgba(15,23,42,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: scrolled ? '1px solid rgba(54, 52, 52, 0.08)' : 'none',
      transition: 'all 0.3s',
    },
    navInner: {
      maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 16px' : '0 32px',
      height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    logo: { fontSize: 22, fontWeight: 800, color: scrolled ? '#3f3d3d' : '#f3efef', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 },
    logoAccent: { color: '#0ea5e9' },
    navLinks: { display: 'flex', alignItems: 'center', gap: 28 },
    navLink: { color: scrolled ? 'rgba(36, 34, 34, 0.75)' : 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' },
    navCta: {
      background: '#0ea5e9', color: '#fff', padding: '8px 20px',
      borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 700,
      border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
    },
    navOutline: {
      background: 'transparent', color: scrolled ? 'black' : '#fff', padding: '8px 20px',
      borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
      border: scrolled ? '1px solid rgba(51, 49, 49, 0.25)' : '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
    },

    /* hero */
    hero: {
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      // background: 'linear-gradient(135deg, #0f172a 0%, #0c1a2e 50%, #0f172a 100%)',
      paddingTop: 80, paddingBottom: 40,
      position: 'relative', overflow: 'hidden',
      
    backgroundImage: 'linear-gradient(rgb(207 222 220 / .35) 1px, transparent 1px), linear-gradient(90deg, rgb(207 222 220 / .35) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
}
    ,
    heroBadge: {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)',
      color: '#0ea5e9', padding: '6px 14px', borderRadius: 99,
      fontSize: 13, fontWeight: 600, marginBottom: 24,
    },
    heroTitle: {
      fontSize: isMobile ? 32 : isTablet ? 44 : 56,
      fontWeight: 900, color: '#2e2d2d', lineHeight: 1.1,
      letterSpacing: '-1px', marginBottom: 20,
    },
    heroSub: {
      fontSize: isMobile ? 16 : 19, color: 'rgba(48, 47, 47, 0.65)',
      lineHeight: 1.7, marginBottom: 36,
      maxWidth: 560,
    },
    heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
    btnPrimary: {
      background: '#0ea5e9', color: '#fff',
      padding: isMobile ? '13px 24px' : '15px 32px',
      borderRadius: 10, fontSize: 15, fontWeight: 700,
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
      border: 'none', cursor: 'pointer', transition: 'all 0.2s',
    },
    btnOutline: {
      background: 'transparent', color: '#272525',
      padding: isMobile ? '13px 24px' : '15px 32px',
      borderRadius: 10, fontSize: 15, fontWeight: 600,
      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
      border: '1.5px solid rgba(70, 69, 69, 0.3)', cursor: 'pointer',
    },

    /* stats bar */
    statsBar: {
      background: 'rgba(14,165,233,0.08)',
      borderTop: '1px solid rgba(14,165,233,0.15)',
      borderBottom: '1px solid rgba(14,165,233,0.15)',
      padding: isMobile ? '28px 0' : '36px 0',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
      gap: isMobile ? 20 : 0,
    },
    statItem: { textAlign: 'center', padding: isMobile ? '0' : '0 24px' },
    statValue: { fontSize: isMobile ? 28 : 36, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 },
    statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: 500 },

    /* section titles */
    sectionBadge: {
      display: 'inline-block', background: 'rgba(14,165,233,0.12)',
      color: '#0ea5e9', padding: '5px 14px', borderRadius: 99,
      fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
    },
    sectionTitle: {
      fontSize: isMobile ? 26 : 38, fontWeight: 800,
      color: '#0f172a', lineHeight: 1.2, marginBottom: 14,
    },
    sectionTitleWhite: {
      fontSize: isMobile ? 26 : 38, fontWeight: 800,
      color: '#fff', lineHeight: 1.2, marginBottom: 14,
    },
    sectionSub: { fontSize: isMobile ? 15 : 17, color: '#64748b', lineHeight: 1.7, maxWidth: 560 },
    sectionSubWhite: { fontSize: isMobile ? 15 : 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 },

    /* features */
    featuresSection: { background: '#f8fafc', padding: isMobile ? '60px 0' : '90px 0' },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(4, 1fr)',
      gap: 20, marginTop: 48,
    },
    featureCard: {
      background: '#fff', borderRadius: 16, padding: 24,
      border: '1px solid #e2e8f0',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    featureIcon: {
      width: 52, height: 52, borderRadius: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    featureTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 8 },
    featureDesc: { fontSize: 14, color: '#64748b', lineHeight: 1.6 },

    /* pricing */
    pricingGrade:{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'none' : 'repeat(3, 1fr)',
      gap: 20 
    },
  
    /* testimonials */
    testimonialsSection: { background: '#f8fafc', padding: isMobile ? '60px 0' : '90px 0' },
    testimonialsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap: 24, marginTop: 48,
    },
    testimonialCard: {
      background: '#fff', borderRadius: 16, padding: 28,
      border: '1px solid #e2e8f0',
    },
    stars: { display: 'flex', gap: 4, marginBottom: 16 },
    testimonialText: { fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 20 },
    testimonialAuthor: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
    testimonialRole: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

    /* CTA */
    ctaSection: {
      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      padding: isMobile ? '60px 0' : '80px 0',
      textAlign: 'center',
    },
    ctaTitle: { fontSize: isMobile ? 26 : 40, fontWeight: 900, color: '#fff', marginBottom: 16 },
    ctaSub: { fontSize: isMobile ? 15 : 18, color: 'rgba(255,255,255,0.85)', marginBottom: 36 },
    ctaBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
    btnWhite: {
      background: '#fff', color: '#0ea5e9',
      padding: '14px 32px', borderRadius: 10,
      fontSize: 15, fontWeight: 700, textDecoration: 'none',
      display: 'inline-flex', alignItems: 'center', gap: 8,
    },
    btnTransparent: {
      background: 'rgba(255,255,255,0.15)', color: '#fff',
      padding: '14px 32px', borderRadius: 10,
      fontSize: 15, fontWeight: 600, textDecoration: 'none',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      border: '1.5px solid rgba(255,255,255,0.4)',
    },

    /* footer */
    footer: {
      background: '#0f172a',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: isMobile ? '40px 0 24px' : '56px 0 28px',
    },
    footerGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : '2fr 1fr 1fr 1fr',
      gap: isMobile ? 36 : 48, marginBottom: 48,
    },
    footerHeading: { fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
    footerLink: { display: 'block', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 14, marginBottom: 10 },
    footerBottom: {
      borderTop: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 24,
      display: 'flex', alignItems: 'center',
      justifyContent: isMobile ? 'center' : 'space-between',
      flexWrap: 'wrap', gap: 12,
    },
    footerCopy: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
  };


  /* ── Mobile menu ── */
  const MobileMenu = () => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      padding: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <span style={s.logo}>Medi<span style={s.logoAccent}>Store</span></span>
        <button onClick={() => setMenuOpen(false)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
          <MdClose size={28} />
        </button>
      </div>
      {['Features', 'Pricing', 'Testimonials'].map(label => (
        <a key={label} href={`#${label.toLowerCase()}`}
          onClick={() => setMenuOpen(false)}
          style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: 18, fontWeight: 600, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {label}
        </a>
      ))}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link to="/login" style={{ ...s.btnOutline, justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>
          Login
        </Link>
        <Link to="/register" style={{ ...s.btnPrimary, justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>
          Start Free Trial
        </Link>
      </div>
    </div>
  );

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

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={s.nav}>
        <div style={s.navInner}>
          <Link to="/" style={s.logo}>
            <MdMedicalServices size={22} style={{ color: '#0ea5e9' }} />
            Elite<span style={s.logoAccent}>HMS</span>
          </Link>

          {/* Desktop links */}
          {!isMobile && (
            <div style={s.navLinks}>
              <a href="#features" style={s.navLink}>Features</a>
              <a href="#pricing" style={s.navLink}>Pricing</a>
              <a href="#testimonials" style={s.navLink}>Reviews</a>
              <Link to="/login" style={s.navOutline}>Login</Link>
              <Link to="/register" style={s.navCta}>Start Free Trial</Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button onClick={() => setMenuOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
              <MdMenu size={26} />
            </button>
          )}
        </div>
      </nav>

      {menuOpen && <MobileMenu />}

      {/* ── Hero ── */}
      <section style={s.hero} >
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ ...s.container, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: isMobile ? '100%' : 800 }}>
            <div style={s.heroBadge}>
              <MdCheckCircle size={15} />
              Free 14-day trial — No credit card required
            </div>
            <h1 style={s.heroTitle}>
              Complete Pharmacy Management{' '}
              <span style={{ color: '#0ea5e9' }}>for Pakistan</span>
            </h1>
            <p style={s.heroSub}>
              Manage medicines, patients, billing and staff in one cloud-based platform.
              Built for Pakistani pharmacies with JazzCash, EasyPaisa and Urdu-friendly support.
            </p>
            <div style={s.heroBtns}>
              <Link to="/register" style={s.btnPrimary}>
                Start Free Trial <MdArrowForward />
              </Link>
              <Link to="/login" style={s.btnOutline}>
                Sign In
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 24, marginTop: 40, flexWrap: 'wrap' }}>
              {['✓ JazzCash & EasyPaisa', '✓ Works Offline (PWA)', '✓ AI Drug Interaction Check'].map(t => (
                <span key={t} style={{ fontSize: 13, color: 'rgba(32, 31, 31, 0.55)', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div style={{ background: '#0f172a' }}>
        <div style={s.statsBar}>
          <div style={s.container}>
            <div style={s.statsGrid}>
              {STATS.map(stat => (
                <div key={stat.label} style={s.statItem}>
                  <div style={s.statValue}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" style={s.featuresSection}>
        <div style={s.container}>
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <span style={s.sectionBadge}>Features</span>
            <h2 style={s.sectionTitle}>Everything your pharmacy needs</h2>
            <p style={s.sectionSub}>
              From medicine inventory to AI-powered drug interaction checking —
              MediStore covers every aspect of running a modern pharmacy.
            </p>
          </div>
          <div style={s.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.title} style={s.featureCard}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ ...s.featureIcon, background: f.color + '15', color: f.color }}>
                  {f.icon}
                </div>
                <div style={s.featureTitle}>{f.title}</div>
                <div style={s.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: '#fff', padding: isMobile ? '60px 0' : '90px 0' }}>
        <div style={s.container}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={s.sectionBadge}>How It Works</span>
            <h2 style={s.sectionTitle}>Up and running in minutes</h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? 32 : 16,
          }}>
            {[
              { step: '01', title: 'Register', desc: 'Create your account. Verify email. 14-day free trial starts instantly.' },
              { step: '02', title: 'Setup Store', desc: 'Add pharmacy name, logo and details. Takes under 5 minutes.' },
              { step: '03', title: 'Add Inventory', desc: 'Add medicines with AI auto-fill. Import existing stock from Excel.' },
              { step: '04', title: 'Start Billing', desc: 'Create invoices, print receipts and track every payment.' },
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center', padding: isMobile ? 0 : '0 16px', position: 'relative' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#e0f2fe', color: '#0ea5e9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 18, margin: '0 auto 16px',
                }}>
                  {item.step}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      {/* <section id="pricing" style={s.pricingSection}>
        <div style={s.container}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...s.sectionBadge, background: 'rgba(14,165,233,0.2)' }}>Pricing</span>
            <h2 style={s.sectionTitleWhite}>Simple pricing for Pakistani pharmacies</h2>
            <p style={s.sectionSubWhite}>
              Pay with JazzCash, EasyPaisa or bank transfer. No hidden fees.
            </p>
          </div>
          <div style={s.pricingGrid}>
            {PLANS.map(plan => {
              const card = plan.highlight ? s.pricingCardHighlight : s.pricingCard;
              const textColor = plan.highlight ? '#fff' : 'rgba(255,255,255,0.9)';
              const mutedColor = plan.highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)';
              return (
                <div key={plan.name} style={card}>
                  {plan.highlight && (
                    <div style={{
                      background: 'rgba(255,255,255,0.2)', borderRadius: 99,
                      padding: '3px 12px', fontSize: 11, fontWeight: 700,
                      color: '#fff', display: 'inline-block', marginBottom: 12,
                    }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div style={{ ...s.pricingName, color: mutedColor }}>{plan.name}</div>
                  <div style={{ ...s.pricingPrice, color: textColor }}>{plan.price}</div>
                  <div style={{ ...s.pricingPeriod, color: mutedColor }}>{plan.period}</div>
                  <div style={{ ...s.pricingDesc, color: mutedColor }}>{plan.desc}</div>
                  <div style={{ borderTop: plan.highlight ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                    {plan.features.map(f => (
                      <div key={f} style={s.pricingFeature}>
                        <MdCheckCircle size={17} style={{ color: plan.highlight ? '#fff' : '#0ea5e9', flexShrink: 0 }} />
                        <span style={{ color: textColor, fontSize: 14 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/register"
                    style={{
                      ...s.pricingBtn,
                      background: plan.highlight ? '#fff' : 'rgba(14,165,233,0.15)',
                      color: plan.highlight ? '#0ea5e9' : '#fff',
                      border: plan.highlight ? 'none' : '1px solid rgba(14,165,233,0.4)',
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section> */}
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
          <div style={s.pricingGrade} >
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
      <section id="testimonials" style={s.testimonialsSection}>
        <div style={s.container}>
          <div style={{ textAlign: isMobile ? 'center' : 'left', marginBottom: 0 }}>
            <span style={s.sectionBadge}>Reviews</span>
            <h2 style={s.sectionTitle}>Loved by Pakistani pharmacists</h2>
            <p style={s.sectionSub}>
              From Peshawar to Karachi, pharmacies trust MediStore to run their daily operations.
            </p>
          </div>
          <div style={s.testimonialsGrid}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={s.testimonialCard}>
                <div style={s.stars}>
                  {Array(t.rating).fill(0).map((_, i) => (
                    <MdStar key={i} size={18} style={{ color: '#f59e0b' }} />
                  ))}
                </div>
                <p style={s.testimonialText}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#e0f2fe', color: '#0ea5e9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, flexShrink: 0,
                  }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={s.testimonialAuthor}>{t.name}</div>
                    <div style={s.testimonialRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaSection}>
        <div style={s.container}>
          <h2 style={s.ctaTitle}>Ready to modernize your pharmacy?</h2>
          <p style={s.ctaSub}>
            Join 500+ pharmacies across Pakistan. Free 14-day trial. No credit card needed.
          </p>
          <div style={s.ctaBtns}>
            <Link to="/register" style={s.btnWhite}>
              Start Free Trial <MdArrowForward />
            </Link>
            <a
              href="https://wa.me/923069534618?text=Hi, I want to learn more about MediStore"
              target="_blank"
              rel="noopener noreferrer"
              style={s.btnTransparent}
            >
              <MdWhatsapp size={18} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.container}>
          <div style={s.footerGrid}>
            {/* Brand */}
            <div>
              <div style={{ ...s.logo, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MdMedicalServices size={20} style={{ color: '#0ea5e9' }} />
                Medi<span style={s.logoAccent}>Store</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 280 }}>
                Professional pharmacy management software built for the Pakistani market.
                Trusted by 500+ pharmacies nationwide.
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                <a href="mailto:amjadfast87@gmail.com" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                  <MdEmail size={20} />
                </a>
                <a href="tel:+923069534618" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                  <MdPhone size={20} />
                </a>
                <a href="https://wa.me/923069534618" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                  <MdWhatsapp size={20} />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <div style={s.footerHeading}>Product</div>
              {['Features', 'Pricing', 'Security', 'Updates'].map(l => (
                <a key={l} href="#" style={s.footerLink}>{l}</a>
              ))}
            </div>

            {/* Company */}
            <div>
              <div style={s.footerHeading}>Company</div>
              {['About Us', 'Blog', 'Careers', 'Contact'].map(l => (
                <a key={l} href="#" style={s.footerLink}>{l}</a>
              ))}
            </div>

            {/* Support */}
            <div>
              <div style={s.footerHeading}>Support</div>
              <a href="/login" style={s.footerLink}>Login</a>
              <a href="/register" style={s.footerLink}>Register</a>
              {['Documentation', 'Privacy Policy', 'Terms of Service'].map(l => (
                <a key={l} href="#" style={s.footerLink}>{l}</a>
              ))}
            </div>
          </div>

          <div style={s.footerBottom}>
            <span style={s.footerCopy}>© 2026 elitehms. All rights reserved. Made by Amjad Full-Stack Developer in Peshawar, Pakistan 🇵🇰</span>
            <span style={{ ...s.footerCopy }}>
              <a href="/privacy" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginRight: 16 }}>Privacy</a>
              <a href="/terms" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Terms</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}