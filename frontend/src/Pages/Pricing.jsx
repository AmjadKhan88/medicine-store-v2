import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdWhatsapp } from 'react-icons/md';

const PLANS = [
  {
    id:    'pharmacy_basic',
    name:  'Pharmacy Basic',
    price: 1999,
    badge: null,
    color: '#0ea5e9',
    tier:  'pharmacy',
    icon:  '💊',
    ideal: 'Small pharmacies & medical stores',
    limits:'500 medicines · 300 patients · 3 staff',
    features: [
      { text:'Unlimited bills & invoices',              yes:true  },
      { text:'Medicine inventory & expiry alerts',       yes:true  },
      { text:'Patient management & prescriptions',       yes:true  },
      { text:'Purchase orders & supplier tracking',      yes:true  },
      { text:'Barcode / QR scanner',                    yes:true  },
      { text:'Duplicate patient detection',              yes:true  },
      { text:'Basic reports & PDF export',               yes:true  },
      { text:'Lab tests & appointments',                 yes:false },
      { text:'Advanced accounting (P&L)',                yes:false },
      { text:'OPD / clinic management',                 yes:false },
      { text:'IPD / hospital features',                 yes:false },
      { text:'AI features',                             yes:false },
    ],
  },
  {
    id:    'pharmacy_pro',
    name:  'Pharmacy Pro',
    price: 3999,
    badge: 'Most Popular',
    color: '#8b5cf6',
    tier:  'pharmacy',
    icon:  '🏪',
    ideal: 'Established pharmacies with labs & appointments',
    limits:'Unlimited medicines & patients · 5 staff',
    features: [
      { text:'Everything in Pharmacy Basic',             yes:true  },
      { text:'Lab test management',                      yes:true  },
      { text:'Appointment scheduling',                   yes:true  },
      { text:'Advanced accounting (P&L, margins)',       yes:true  },
      { text:'AI Prescription OCR scanner',              yes:true  },
      { text:'AI Demand forecasting',                    yes:true  },
      { text:'Two-factor authentication (2FA)',           yes:true  },
      { text:'OPD / clinic management',                 yes:false },
      { text:'IPD / hospital features',                 yes:false },
      { text:'AI Diagnosis Assistant',                  yes:false },
      { text:'Insurance panels & claims',               yes:false },
      { text:'Payroll & DRAP compliance',               yes:false },
    ],
  },
  {
    id:    'clinic',
    name:  'Clinic',
    price: 5999,
    badge: 'For Clinics',
    color: '#10b981',
    tier:  'clinic',
    icon:  '🏥',
    ideal: 'OPD clinics & diagnostic centers',
    limits:'Unlimited everything · 10 staff',
    features: [
      { text:'Everything in Pharmacy Pro',               yes:true  },
      { text:'OPD queue (TV display + voice)',           yes:true  },
      { text:'Doctor orders & nursing notes',            yes:true  },
      { text:'Electronic Medical Records (EMR)',          yes:true  },
      { text:'Vital signs monitoring & charts',          yes:true  },
      { text:'Patient feedback & ratings',               yes:true  },
      { text:'Online appointment booking (public page)', yes:true  },
      { text:'WhatsApp / SMS broadcast campaigns',       yes:true  },
      { text:'IPD / ward & bed management',             yes:false },
      { text:'OT scheduling & blood bank',              yes:false },
      { text:'Insurance panels & claims',               yes:false },
      { text:'Payroll & DRAP compliance',               yes:false },
    ],
  },
  {
    id:    'hospital_basic',
    name:  'Hospital Basic',
    price: 10999,
    badge: 'For Hospitals',
    color: '#f59e0b',
    tier:  'hospital',
    icon:  '🏨',
    ideal: 'Small & medium hospitals (< 50 beds)',
    limits:'Unlimited everything · 20 staff',
    features: [
      { text:'Everything in Clinic',                     yes:true  },
      { text:'IPD management (admission, discharge)',    yes:true  },
      { text:'Ward & bed management',                   yes:true  },
      { text:'Nurse station (MAR sheets, vitals)',       yes:true  },
      { text:'OT scheduling & pre-op checklists',       yes:true  },
      { text:'Blood bank management',                   yes:true  },
      { text:'Radiology module (PACS-lite)',             yes:true  },
      { text:'Insurance panels & claims',               yes:false },
      { text:'Salary & payroll management',             yes:false },
      { text:'DRAP compliance reports',                 yes:false },
      { text:'AI Diagnosis Assistant',                  yes:false },
    ],
  },
  {
    id:    'hospital_pro',
    name:  'Hospital Pro',
    price: 20999,
    badge: '🏆 Full Suite',
    color: '#dc2626',
    tier:  'hospital',
    icon:  '🏦',
    ideal: 'Full-service hospitals & multi-branch setups',
    limits:'Unlimited staff · Unlimited everything',
    features: [
      { text:'Everything in Hospital Basic',             yes:true  },
      { text:'Insurance & panel management (EOBI, EFU, Jubilee)', yes:true },
      { text:'Salary & payroll (Pakistan tax slabs)',    yes:true  },
      { text:'DRAP compliance reports (one-click)',      yes:true  },
      { text:'AI Diagnosis Assistant (Gemini)',          yes:true  },
      { text:'Advanced FBR/GST tax summary',             yes:true  },
      { text:'Dedicated account manager',               yes:true  },
      { text:'Custom onboarding & training session',    yes:true  },
      { text:'Priority 24/7 support',                   yes:true  },
    ],
  },
];

const ANNUAL_DISCOUNT = 0.17;  // 2 months free = ~17% off

export default function Pricing() {
  const [billing,   setBilling]   = useState('monthly');  // 'monthly' | 'annual'
  const [hoveredPlan,setHovered] = useState(null);
  const navigate = useNavigate();

  const price = (plan) => {
    const base = plan.price;
    if (billing === 'annual') return Math.round(base * (1 - ANNUAL_DISCOUNT));
    return base;
  };

  const annualTotal = (plan) => Math.round(price(plan) * 12);

  const whatsappInquiry = (plan) => {
    const msg = encodeURIComponent(
      `السلام علیکم!\n\nI'm interested in MediStore *${plan.name}* plan (₨${price(plan).toLocaleString()}/month).\n\nPlease guide me on how to subscribe.\n\nThank you!`
    );
    window.open(`https://wa.me/923XXXXXXXXX?text=${msg}`, '_blank', 'noopener');
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e3a5f)', color:'#fff', textAlign:'center', padding:'48px 20px 36px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#94a3b8', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
          MediStore Pakistan
        </div>
        <h1 style={{ fontSize:36, fontWeight:900, margin:'0 0 12px' }}>
          Transparent Pricing for Every Size
        </h1>
        <p style={{ fontSize:16, color:'#94a3b8', maxWidth:520, margin:'0 auto 28px' }}>
          From a single pharmacy to a multi-department hospital — one platform, all plans.
          Cancel anytime. No hidden fees. Prices in PKR.
        </p>

        {/* Billing toggle */}
        <div style={{ display:'inline-flex', background:'#1e293b', borderRadius:99, padding:4 }}>
          {['monthly','annual'].map(b => (
            <button key={b} onClick={() => setBilling(b)}
              style={{
                padding:'8px 24px', borderRadius:99, border:'none', cursor:'pointer',
                background:  billing===b ? '#0ea5e9' : 'transparent',
                color:       billing===b ? '#fff'    : '#94a3b8',
                fontWeight:  billing===b ? 700       : 500,
                fontSize:14, transition:'all 0.2s',
              }}>
              {b === 'monthly' ? 'Monthly' : 'Annual'}{b === 'annual' && <span style={{ marginLeft:6, background:'#10b981', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>Save 2 months!</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div style={{ maxWidth:1300, margin:'0 auto', padding:'40px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:20 }}>
          {PLANS.map(plan => {
            const isPopular  = plan.badge === 'Most Popular';
            const isHovered  = hoveredPlan === plan.id;
            const monthPrice = price(plan);

            return (
              <div key={plan.id}
                onMouseEnter={() => setHovered(plan.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background:   '#fff',
                  borderRadius: 20,
                  border:       `2px solid ${isPopular || isHovered ? plan.color : '#e2e8f0'}`,
                  boxShadow:    isPopular || isHovered ? `0 20px 40px ${plan.color}25` : '0 2px 8px rgba(0,0,0,0.06)',
                  overflow:     'hidden',
                  transform:    isHovered ? 'translateY(-6px)' : 'none',
                  transition:   'all 0.25s ease',
                  display:      'flex',
                  flexDirection:'column',
                  position:     'relative',
                }}>

                {/* Badge */}
                {plan.badge && (
                  <div style={{
                    position:'absolute', top:16, right:16,
                    background: plan.badge.includes('🏆') ? plan.color : isPopular ? '#fff' : plan.color+'20',
                    color:       plan.badge.includes('🏆') ? '#fff'    : isPopular ? plan.color : plan.color,
                    border:      isPopular ? `1px solid ${plan.color}` : 'none',
                    padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:800,
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div style={{ background:`${plan.color}12`, padding:'24px 22px 18px' }}>
                  <div style={{ fontSize:32, marginBottom:6 }}>{plan.icon}</div>
                  <div style={{ fontWeight:900, fontSize:18, color:'#0f172a', marginBottom:4 }}>{plan.name}</div>
                  <div style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>{plan.ideal}</div>

                  {/* Price */}
                  <div style={{ display:'flex', alignItems:'flex-end', gap:4, marginBottom:4 }}>
                    <span style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>₨</span>
                    <span style={{ fontSize:36, fontWeight:900, color:plan.color, lineHeight:1 }}>
                      {monthPrice.toLocaleString()}
                    </span>
                    <span style={{ fontSize:13, color:'#64748b', marginBottom:6 }}>/month</span>
                  </div>

                  {billing === 'annual' && (
                    <div style={{ fontSize:12, color:'#10b981', fontWeight:600 }}>
                      ₨{annualTotal(plan).toLocaleString()}/year · Save ₨{(plan.price * 12 - annualTotal(plan)).toLocaleString()}
                    </div>
                  )}

                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>{plan.limits}</div>
                </div>

                {/* Features */}
                <div style={{ padding:'18px 22px', flex:1 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8, fontSize:13 }}>
                      <span style={{
                        flexShrink:0, marginTop:1, fontSize:14,
                        color: f.yes ? plan.color : '#cbd5e1',
                      }}>
                        {f.yes ? '✓' : '✗'}
                      </span>
                      <span style={{ color: f.yes ? '#374151' : '#94a3b8', textDecoration: f.yes ? 'none' : 'none' }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div style={{ padding:'0 22px 22px' }}>
                  <button
                    onClick={() => whatsappInquiry(plan)}
                    style={{
                      width:'100%', padding:'13px', borderRadius:12, border:'none',
                      background: isPopular || isHovered ? plan.color : `${plan.color}15`,
                      color:      isPopular || isHovered ? '#fff'     : plan.color,
                      fontWeight:800, fontSize:14, cursor:'pointer', transition:'all 0.2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    }}>
                    <MdWhatsapp size={18} />
                    Subscribe via WhatsApp
                  </button>
                  <div style={{ textAlign:'center', fontSize:11, color:'#94a3b8', marginTop:8 }}>
                    14-day free trial · Cancel anytime
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trial CTA */}
        <div style={{ background:'linear-gradient(135deg,#0ea5e9,#8b5cf6)', borderRadius:20, padding:'32px 40px', marginTop:32, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:20 }}>
          <div style={{ color:'#fff' }}>
            <div style={{ fontWeight:900, fontSize:22, marginBottom:6 }}>
              Start your 14-day free trial — No credit card needed
            </div>
            <div style={{ fontSize:14, opacity:0.85 }}>
              All Hospital Pro features unlocked for 14 days. Explore the full system before deciding.
            </div>
          </div>
          <button onClick={() => navigate('/register')}
            style={{ background:'#fff', color:'#0ea5e9', border:'none', borderRadius:14, padding:'14px 32px', fontWeight:900, fontSize:16, cursor:'pointer', whiteSpace:'nowrap' }}>
            Start Free Trial →
          </button>
        </div>

        {/* Comparison table */}
        <div style={{ marginTop:48 }}>
          <h2 style={{ textAlign:'center', fontWeight:900, fontSize:24, marginBottom:28, color:'#0f172a' }}>
            Feature Comparison
          </h2>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #e2e8f0' }}>
                  <th style={{ padding:'12px 16px', textAlign:'left', fontWeight:700, color:'#374151', minWidth:200 }}>Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} style={{ padding:'12px 12px', textAlign:'center', fontWeight:700, color:p.color, minWidth:130 }}>
                      {p.icon} {p.name}<br/>
                      <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>₨{p.price.toLocaleString()}/mo</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { section:'Core Pharmacy', features:[
                    { name:'Billing & Invoices',           keys:['pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'Medicine Inventory',            keys:['pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'Patient Management',            keys:['pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'Prescriptions & POs',          keys:['pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'Expiry Alerts',                 keys:['pharmacy_basic','pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                  ]},
                  { section:'Pharmacy Pro Features', features:[
                    { name:'Lab Tests',                     keys:['pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'Appointments',                  keys:['pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'P&L Accounting',                keys:['pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'AI Prescription OCR',           keys:['pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                    { name:'Demand Forecasting (AI)',       keys:['pharmacy_pro','clinic','hospital_basic','hospital_pro'] },
                  ]},
                  { section:'Clinic Features', features:[
                    { name:'OPD Queue Management',          keys:['clinic','hospital_basic','hospital_pro'] },
                    { name:'EMR (Medical Records)',         keys:['clinic','hospital_basic','hospital_pro'] },
                    { name:'Vital Signs Charts',            keys:['clinic','hospital_basic','hospital_pro'] },
                    { name:'Online Booking (Public)',       keys:['clinic','hospital_basic','hospital_pro'] },
                    { name:'WhatsApp Broadcast',            keys:['clinic','hospital_basic','hospital_pro'] },
                    { name:'Patient Feedback',              keys:['clinic','hospital_basic','hospital_pro'] },
                  ]},
                  { section:'Hospital Basic Features', features:[
                    { name:'IPD Management',                keys:['hospital_basic','hospital_pro'] },
                    { name:'Ward & Bed Management',        keys:['hospital_basic','hospital_pro'] },
                    { name:'Nurse Station (MAR)',           keys:['hospital_basic','hospital_pro'] },
                    { name:'OT Scheduling',                 keys:['hospital_basic','hospital_pro'] },
                    { name:'Blood Bank',                    keys:['hospital_basic','hospital_pro'] },
                    { name:'Radiology (PACS-lite)',        keys:['hospital_basic','hospital_pro'] },
                  ]},
                  { section:'Hospital Pro Exclusive', features:[
                    { name:'Insurance Panels (EOBI, EFU)', keys:['hospital_pro'] },
                    { name:'Payroll (Pakistan tax slabs)', keys:['hospital_pro'] },
                    { name:'DRAP Compliance Reports',       keys:['hospital_pro'] },
                    { name:'AI Diagnosis Assistant',        keys:['hospital_pro'] },
                    { name:'Dedicated Account Manager',    keys:['hospital_pro'] },
                  ]},
                ].map(section => (
                  <>
                    <tr key={section.section} style={{ background:'#f8fafc' }}>
                      <td colSpan={6} style={{ padding:'10px 16px', fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:1, color:'#64748b' }}>
                        {section.section}
                      </td>
                    </tr>
                    {section.features.map(feature => (
                      <tr key={feature.name} style={{ borderBottom:'1px solid #f1f5f9' }}>
                        <td style={{ padding:'10px 16px', color:'#374151' }}>{feature.name}</td>
                        {PLANS.map(plan => {
                          const has = feature.keys.includes(plan.id);
                          return (
                            <td key={plan.id} style={{ padding:'10px 12px', textAlign:'center' }}>
                              {has
                                ? <span style={{ color:plan.color, fontSize:18 }}>✓</span>
                                : <span style={{ color:'#e2e8f0', fontSize:16 }}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop:48 }}>
          <h2 style={{ textAlign:'center', fontWeight:900, fontSize:24, marginBottom:28, color:'#0f172a' }}>Common Questions</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:900, margin:'0 auto' }}>
            {[
              { q:'Can I upgrade later?',          a:'Yes! Upgrade anytime. Your data carries over. If you upgrade mid-month, we calculate the prorated difference.' },
              { q:'How do I pay?',                 a:'JazzCash, EasyPaisa, bank transfer, or HBL. Send the screenshot to our WhatsApp number and we activate within 2 hours.' },
              { q:'Is my data safe?',              a:'All data is encrypted and hosted on Render (US cloud). Daily backups. We never share your data with anyone.' },
              { q:'Can I use it on mobile?',       a:'Yes — MediStore is fully responsive. Works on phone, tablet, and desktop. No app install needed.' },
              { q:'What if I need training?',      a:'Hospital Pro includes onboarding. All other plans get access to video tutorials and WhatsApp support.' },
              { q:'My staff speaks Urdu only?',    a:'All labels and UI are in English but we\'re adding Urdu support. Reach out for help in Urdu via WhatsApp.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #e2e8f0' }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:6, color:'#0f172a' }}>❓ {q}</div>
                <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}