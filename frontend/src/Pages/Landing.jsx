import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
const FEATURE_GROUPS = [
  {
    group: '💊 Pharmacy Core',
    color: '#0ea5e9',
    features: [
      { icon: '💊', title: 'Medicine Inventory', desc: 'Barcode/QR scanner, batch tracking, expiry dates, low-stock alerts. Manage 500+ medicines effortlessly.' },
      { icon: '👥', title: 'Patient Management', desc: 'Auto Patient ID, allergy banner (never missed), blood group, full financial history per patient.' },
      { icon: '🧾', title: 'Billing & Invoices', desc: 'One-click billing with JazzCash, EasyPaisa, cash or insurance. Stock auto-deducted. WhatsApp invoice sharing.' },
      { icon: '📋', title: 'Prescriptions', desc: 'Digital prescriptions with repeat refills. Full prescription history per patient linked to bills.' },
      { icon: '📅', title: 'Appointments', desc: 'Doctor schedule management. Status flow: Scheduled → Confirmed → Completed. Visit notes attached.' },
      { icon: '🔬', title: 'Lab Tests', desc: 'Lab order management with critical value alerts. Auto-appear in patient EMR timeline.' },
    ],
  },
  {
    group: '🏥 Hospital Modules',
    color: '#10b981',
    features: [
      { icon: '🛏', title: 'Ward & Bed Management', desc: 'Color-coded bed map. Real-time occupancy. Status: Available → Occupied → Cleaning → Maintenance.' },
      { icon: '🏥', title: 'IPD Management', desc: 'Full admission-to-discharge workflow. Medicine orders, MAR sheets, charges, final bill generation.' },
      { icon: '🩺', title: 'OPD Queue (TV Display)', desc: 'Token system with priority: Urgent > VIP > Normal. Voice announcements. Any TV works as display.' },
      { icon: '👩‍⚕️', title: 'Nurse Station', desc: 'MAR sheet with Given/Skipped/Refused tracking. Critical vital alerts. Medicine requests to pharmacy.' },
      { icon: '🫀', title: 'OT Scheduling', desc: 'Conflict-detection booking. 12-item pre-op checklist. Team assignments. Post-op notes.' },
      { icon: '🩸', title: 'Blood Bank', desc: '56-day donor eligibility tracking. Critical stock alerts. Auto-charge to IPD bill on issue.' },
      { icon: '🖼', title: 'Radiology Module', desc: 'Image uploads via Cloudinary. PACS-lite viewer. Public share link for specialist referrals.' },
      { icon: '❤️', title: 'Vital Signs', desc: '12 parameters tracked. Critical threshold auto-alerts. Recharts trend graphs. Print-ready charts.' },
    ],
  },
  {
    group: '🤖 AI-Powered Features',
    color: '#8b5cf6',
    features: [
      { icon: '🧠', title: 'AI Diagnosis Assistant', desc: 'Gemini + Groq powered. 3-tier differential diagnoses with probability. Pakistan-specific clinical protocols. Red flag detection.' },
      { icon: '📸', title: 'Prescription OCR', desc: 'Scan handwritten prescriptions with your phone camera. Gemini Vision extracts medicines and matches inventory.' },
      { icon: '📈', title: 'Demand Forecasting', desc: 'AI predicts next month demand per medicine. Pakistan seasonality factors. One-click purchase order from predictions.' },
      { icon: '🔍', title: 'Patient Deduplication', desc: 'Levenshtein + CNIC + phone matching. Auto-detects duplicate patient records. Merge with full data re-pointing.' },
      { icon: '🧠', title: 'RAG Knowledge Base', desc: 'Upload medicine monographs, protocols, service info. AI retrieves relevant context for every staff query. 3-tier search.' },
    ],
  },
  {
    group: '💰 Finance & Compliance',
    color: '#f59e0b',
    features: [
      { icon: '💰', title: 'Accounting (P&L)', desc: 'Revenue vs COGS vs expenses. Gross and net margins. FBR/GST tax summary. Excel export for FBR IRIS.' },
      { icon: '🛡', title: 'Insurance Panels', desc: 'Jubilee, EFU, EOBI, PESSI. Coverage calculator. Claim status: Draft → Submitted → Approved → Paid.' },
      { icon: '💳', title: 'Payroll & Salaries', desc: 'Pakistan income tax slabs. EOBI auto-deduction (₨570). Advance management. Payslip PDF + WhatsApp.' },
      { icon: '📜', title: 'DRAP Compliance', desc: 'Controlled medicines register. Batch tracking. Expiry destruction records. One-click inspection-ready PDF report.' },
    ],
  },
  {
    group: '📲 Communication & Growth',
    color: '#ec4899',
    features: [
      { icon: '📲', title: 'WhatsApp Broadcast', desc: '8 audience filters: by condition, city, blood group, balance. Personalized messages. Built-in templates for Eid, health tips.' },
      { icon: '⭐', title: 'Patient Feedback', desc: '5-category star ratings via WhatsApp link. Negative feedback fires instant alert. Doctor leaderboard by rating.' },
      { icon: '📅', title: 'Online Booking', desc: 'Public booking page for your clinic (no login needed). Real-time slot availability. Instant WhatsApp confirmation.' },
      { icon: '📂', title: 'Electronic Medical Records', desc: 'Unified timeline: bills + prescriptions + labs + admissions + vitals in one chronological view.' },
    ],
  },
];

const plans = [
    {
      key: 'trial',
      name: 'Free Trial',
      price: 0,
      period: '14 days',
      badge: 'No Card Needed',
      color: '#6366f1',
      icon: '🎯',
      ideal: 'Try everything free',
      features: [
        '100 medicines · 50 patients',
        '3 staff members',
        '100 bills/month',
        'All Hospital Pro features unlocked',
        'No credit card required',
      ],
    },
    {
      key: 'pharmacy_basic',
      name: 'Pharmacy Basic',
      price: 1999,
      period: '/month',
      badge: null,
      color: '#0ea5e9',
      icon: '💊',
      ideal: 'Small pharmacies & medical stores',
      features: [
        '500 medicines · 300 patients',
        '3 staff members · Unlimited bills',
        'Barcode scanner & expiry alerts',
        'Prescriptions & purchase orders',
        'Basic reports & PDF invoices',
      ],
    },
    {
      key: 'pharmacy_pro',
      name: 'Pharmacy Pro',
      price: 3999,
      period: '/month',
      badge: '🔥 Popular',
      color: '#8b5cf6',
      icon: '🏪',
      ideal: 'Established pharmacies',
      features: [
        'Unlimited medicines & patients',
        '5 staff members',
        'Everything in Pharmacy Basic',
        'Lab tests & appointments',
        'AI Prescription OCR & Demand AI',
        'Advanced accounting (P&L)',
      ],
    },
    {
      key: 'clinic',
      name: 'Clinic',
      price: 5999,
      period: '/month',
      badge: 'For Clinics',
      color: '#10b981',
      icon: '🏥',
      ideal: 'OPD clinics & diagnostic centers',
      features: [
        'Unlimited everything · 10 staff',
        'Everything in Pharmacy Pro',
        'OPD Queue + TV Display',
        'EMR & Vital Signs monitoring',
        'Online appointment booking',
        'WhatsApp broadcast campaigns',
      ],
    },
    {
      key: 'hospital_basic',
      name: 'Hospital Basic',
      price: 10999,
      period: '/month',
      badge: 'For Hospitals',
      color: '#f59e0b',
      icon: '🏨',
      ideal: 'Small & medium hospitals',
      features: [
        'Unlimited everything · 20 staff',
        'Everything in Clinic',
        'IPD management (admit → discharge)',
        'Ward & bed management',
        'Nurse station + MAR sheets',
        'OT scheduling · Blood bank · Radiology',
      ],
    },
    {
      key: 'hospital_pro',
      name: 'Hospital Pro',
      price: 20999,
      period: '/month',
      badge: '🏆 Full Suite',
      color: '#dc2626',
      icon: '🏦',
      ideal: 'Full-service hospitals',
      features: [
        'Unlimited staff & everything',
        'Everything in Hospital Basic',
        'Insurance panels (EOBI, EFU, Jubilee)',
        'Payroll + Pakistan tax slabs',
        'DRAP compliance reports',
        'AI Diagnosis Assistant (Gemini)',
      ],
    },
  ];



const TESTIMONIALS = [
  { name: 'Dr. Tariq Mehmood', role: 'Pharmacy Owner, Peshawar', rating: 5, text: 'MediStore completely replaced our paper system. Expiry alerts save us thousands every month. The thermal invoice printing works perfectly.' },
  { name: 'Dr. Fatima Siddiqui', role: 'Clinic Owner, Lahore', rating: 5, text: 'The AI drug interaction checker is a game changer. I can check interactions in seconds before dispensing. My patients trust me more now.' },
  { name: 'Ahmed Khan', role: 'Medical Store, Karachi', rating: 5, text: 'JazzCash and EasyPaisa payment tracking is exactly what we needed. No more lost receipts. WhatsApp reminders for dues are brilliant.' },
];

const STATS = [
  { value: '500+', label: 'Pharmacies & Hospitals' },
  { value: '30+',  label: 'Modules Built'          },
  { value: '200K+',label: 'Invoices Generated'     },
  { value: '99.9%',label: 'Uptime'                 },
];

/* ── Plan Card Component ── */
function PlanCard({ plan: p, billingAnnual, annualPrice, navigate }) {
  const isHighlighted = p.key === 'pharmacy_pro';
  const displayPrice  = billingAnnual && p.price > 0 ? annualPrice(p.price) : p.price;

  return (
    <div style={{
      background:    isHighlighted ? p.color : '#fff',
      color:         isHighlighted ? '#fff'  : '#0f172a',
      borderRadius:  18,
      padding:       28,
      border:        `2px solid ${isHighlighted ? p.color : '#e2e8f0'}`,
      position:      'relative',
      boxShadow:     isHighlighted ? `0 20px 50px ${p.color}35` : 'none',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {/* Badge */}
      {p.badge && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: isHighlighted ? '#0f172a' : p.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>
          {p.badge}
        </div>
      )}

      {/* Plan header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 26 }}>{p.icon}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 1 }}>{p.ideal}</div>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 20 }}>
        {p.price === 0 ? (
          <div style={{ fontSize: 32, fontWeight: 900 }}>Free<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.7 }}> · {p.period}</span></div>
        ) : (
          <>
            <div style={{ fontSize: 32, fontWeight: 900 }}>
              ₨{displayPrice.toLocaleString()}
              <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>/month</span>
            </div>
            {billingAnnual && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                ₨{(displayPrice * 12).toLocaleString()}/year · Save ₨{((p.price - displayPrice) * 12).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <div style={{ flex: 1 }}>
        {p.features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, marginBottom: 8 }}>
            <MdCheckCircle size={15} style={{ color: isHighlighted ? '#fff' : p.color, flexShrink: 0, marginTop: 1 }} />
            <span style={{ opacity: 0.9 }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={() => navigate('/register')}
        style={{ marginTop: 24, width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', background: isHighlighted ? '#fff' : p.color, color: isHighlighted ? p.color : '#fff', transition: 'opacity 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
        {p.price === 0 ? 'Start Free Trial — No Card Needed' : `Get ${p.name}`}
      </button>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const navigate = useNavigate();
  const width = useWidth();
  const isMobile = width < 768;
  const isTablet = width < 1024;

  const annualPrice = (p) => Math.round(p * 0.83); // 2 months free

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
      minHeight: '100vh', display: 'flex', alignItems: isTablet ? 'top' : 'center',
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
              Hospital & Pharmacy Management{' '}
              <span style={{ color: '#0ea5e9' }}>Built for Pakistan</span>
            </h1>
            <p style={s.heroSub}>
              From a single pharmacy to a multi-department hospital — one platform covers
              medicine inventory, IPD/OPD, nurses, billing, AI diagnosis and DRAP compliance.
              Built for Pakistan with JazzCash & EasyPaisa support.
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
            <div style={{ display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap' }}>
              {[
                '✓ JazzCash & EasyPaisa',
                '✓ IPD + OPD + Nurse Station',
                '✓ AI Diagnosis (Gemini)',
                '✓ DRAP Compliance Reports',
                '✓ Works Offline (PWA)',
              ].map(t => (
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
      <section id="features" style={{ background: '#f8fafc', padding: isMobile ? '60px 0' : '90px 0' }}>
        <div style={s.container}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={s.sectionBadge}>30+ Features</span>
            <h2 style={s.sectionTitle}>Everything from a pharmacy to a full hospital</h2>
            <p style={{ ...s.sectionSub, margin: '0 auto' }}>
              One platform covers your entire healthcare operation — from dispensing medicines
              to managing IPD patients, nurses, OT scheduling and AI-powered diagnostics.
            </p>
          </div>

          {FEATURE_GROUPS.map(group => (
            <div key={group.group} style={{ marginBottom: 52 }}>
              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>{group.group}</div>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* Feature cards grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr 1fr' : 'repeat(3, 1fr)',
                gap: 16,
              }}>
                {group.features.map(f => (
                  <div key={f.title}
                    style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', border: '1px solid #e2e8f0', display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${group.color}18`; e.currentTarget.style.borderColor = group.color + '50'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: group.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {f.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{f.title}</div>
                      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Feature count badge */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ display: 'inline-flex', gap: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 32px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[['30+', 'Features'], ['5', 'Plan Tiers'], ['99.9%', 'Uptime'], ['24hr', 'Activation']].map(([val, label]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: '#0ea5e9' }}>{val}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
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
      <section id="pricing" style={{ padding: isMobile ? '60px 0' : '90px 0', background: '#fff' }}>
        <div style={s.container}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={s.sectionBadge}>Pricing</span>
            <h2 style={s.sectionTitle}>Plans for every size — from pharmacy to hospital</h2>
            <p style={{ ...s.sectionSub, margin: '0 auto 28px' }}>
              Pay via JazzCash, EasyPaisa or Bank Transfer. Activate within 24 hours.
            </p>

            {/* Annual / Monthly toggle */}
            <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 99, padding: 4, gap: 4 }}>
              {[['Monthly', false], ['Annual (Save 17%)', true]].map(([label, val]) => (
                <button key={String(val)} onClick={() => setBillingAnnual(val)}
                  style={{ padding: '8px 20px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', background: billingAnnual === val ? '#0ea5e9' : 'transparent', color: billingAnnual === val ? '#fff' : '#64748b', transition: 'all 0.2s' }}>
                  {label}
                  {val && !billingAnnual && <span style={{ marginLeft: 6, background: '#10b981', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 99 }}>2 months free</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Plans — first row: Trial + Pharmacy plans */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
              💊 Pharmacy Plans
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
              {plans.filter(p => ['trial','pharmacy_basic','pharmacy_pro'].includes(p.key)).map(p => (
                <PlanCard key={p.key} plan={p} billingAnnual={billingAnnual} annualPrice={annualPrice} navigate={navigate} />
              ))}
            </div>
          </div>

          {/* Plans — second row: Clinic + Hospital plans */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
              🏥 Clinic & Hospital Plans
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
              {plans.filter(p => ['clinic','hospital_basic','hospital_pro'].includes(p.key)).map(p => (
                <PlanCard key={p.key} plan={p} billingAnnual={billingAnnual} annualPrice={annualPrice} navigate={navigate} />
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div style={{ textAlign: 'center', marginTop: 36, padding: '16px 24px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8 }}>
              ✅ All plans include 14-day free trial &nbsp;·&nbsp;
              ✅ No contracts — cancel anytime &nbsp;·&nbsp;
              ✅ JazzCash · EasyPaisa · Bank Transfer &nbsp;·&nbsp;
              ✅ Activation within 24 hours &nbsp;·&nbsp;
              📞 Need help choosing?{' '}
              <a href="https://wa.me/923069534618" target="_blank" rel="noopener noreferrer"
                style={{ color: '#0ea5e9', fontWeight: 700, textDecoration: 'none' }}>
                Chat on WhatsApp
              </a>
            </div>
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
                Elite<span style={s.logoAccent}>HMS</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 280 }}>
                Complete hospital & pharmacy management system built for Pakistan.
                From small pharmacies to multi-department hospitals — one platform.
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