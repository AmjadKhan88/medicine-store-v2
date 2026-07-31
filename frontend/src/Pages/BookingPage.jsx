import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FULL_DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmtDate  = d => {
  const dt = new Date(d);
  return `${FULL_DAYS[dt.getDay()]}, ${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ════════════════════════════════
   CANCEL PAGE
════════════════════════════════ */
function CancelPage({ slug, cancelToken }) {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  const [error,   setError]   = useState(null);
  const [reason,  setReason]  = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    API.get(`/booking/public/cancel/${cancelToken}`)
      .then(({ data }) => {
        if (data.appointment.status === 'Cancelled') {
          setCancelled(true);
        } else {
          setInfo(data.appointment);
        }
      })
      .catch(err => setError(err.response?.data?.message || 'Booking not found'))
      .finally(() => setLoading(false));
  }, [cancelToken]);

  const handleCancel = async () => {
    setSaving(true);
    try {
      await API.post(`/booking/public/cancel/${cancelToken}`, { reason });
      setCancelled(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <ShortLoader/>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:24, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>❌</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#dc2626' }}>Unable to Cancel</div>
      <div style={{ color:'#6b7280', marginTop:8 }}>{error}</div>
    </div>
  );

  if (cancelled) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #fef2f2, #fff1f2)', padding:24, textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:24, fontWeight:800, color:'#dc2626', marginBottom:8 }}>Appointment Cancelled</div>
      <div style={{ color:'#6b7280', fontSize:15, lineHeight:1.7 }}>
        Your appointment has been cancelled. We hope to see you again soon!
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'32px 28px', maxWidth:420, width:'100%', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:48 }}>📅</div>
          <div style={{ fontWeight:800, fontSize:20, marginTop:8, color:'#111' }}>Cancel Appointment</div>
          <div style={{ color:'#6b7280', fontSize:14, marginTop:4 }}>{info?.clinicName}</div>
        </div>

        <div style={{ background:'#fef2f2', borderRadius:12, padding:16, marginBottom:20 }}>
          {[
            ['Patient',  info?.patientName],
            ['Doctor',   `Dr. ${info?.doctorName}`],
            ['Date',     fmtDate(info?.date)],
            ['Time',     info?.timeSlot],
          ].map(([k, v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:14, padding:'5px 0', borderBottom:'1px solid #fecaca' }}>
              <span style={{ color:'#9f1239' }}>{k}</span>
              <span style={{ fontWeight:600, color:'#dc2626' }}>{v}</span>
            </div>
          ))}
        </div>

        {info?.cancellationHours > 0 && (
          <div style={{ fontSize:12, color:'#f59e0b', marginBottom:12 }}>
            ⚠️ Appointments must be cancelled at least {info.cancellationHours} hour{info.cancellationHours !== 1 ? 's' : ''} before the scheduled time.
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>
            Reason for cancellation (optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            placeholder="Feeling better, schedule conflict, etc."
            style={{ width:'100%', borderRadius:10, border:'1.5px solid #e5e7eb', padding:'10px 12px', fontSize:13, fontFamily:'inherit', boxSizing:'border-box', resize:'none' }}
          />
        </div>

        <button
          onClick={handleCancel} disabled={saving}
          style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: saving?'#94a3b8':'#ef4444', color:'#fff', fontWeight:800, fontSize:16, cursor: saving?'not-allowed':'pointer' }}>
          {saving ? 'Cancelling...' : 'Confirm Cancellation'}
        </button>

        <div style={{ textAlign:'center', marginTop:12 }}>
          <a href={`/book/${slug}`} style={{ fontSize:13, color:'#0ea5e9', textDecoration:'none' }}>
            ← Book a new appointment instead
          </a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN BOOKING PAGE
════════════════════════════════ */
export default function BookingPage() {
  const { slug, cancelToken } = useParams();
  const [searchParams] = useSearchParams();

  /* ── Cancel flow ── */
  if (cancelToken) return <CancelPage slug={slug} cancelToken={cancelToken} />;

  const [config,      setConfig]      = useState(null);
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(true);

  const [step,        setStep]        = useState(1);   // 1=doctor, 2=date, 3=time, 4=details, 5=confirm
  const [selDoctor,   setSelDoctor]   = useState(null);
  const [selDate,     setSelDate]     = useState('');
  const [selSlot,     setSelSlot]     = useState('');
  const [slots,       setSlots]       = useState([]);
  const [slotsLoading,setSlotsLoading]= useState(false);
  const [form,        setForm]        = useState({ patientName:'', patientPhone:'', appointmentType:'Checkup', notes:'' });
  const [booking,     setBooking]     = useState(null);    // confirmation data
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* Load config */
  useEffect(() => {
    API.get(`/booking/public/${slug}`)
      .then(({ data }) => setConfig(data.config))
      .catch(err => setError(err.response?.data?.message || 'Booking page not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  /* Load slots when date+doctor chosen */
  useEffect(() => {
    if (!selDoctor || !selDate) return;
    setSlotsLoading(true);
    API.get('/booking/public/slots', { params: { slug, doctorId: selDoctor._id, date: selDate } })
      .then(({ data }) => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selDoctor, selDate, slug]);

  /* Build available dates (next 30 days, doctor's available days) */
  const buildDates = useCallback(() => {
    if (!selDoctor) return [];
    const dates = [];
    const today  = new Date(todayStr());
    const max    = config?.advanceBookingDays || 30;
    const start  = config?.allowSameDayBooking ? 0 : 1;

    for (let i = start; i <= max; i++) {
      const d   = addDays(todayStr(), i);
      const dow = new Date(d).getDay();
      if (selDoctor.availableDays.includes(dow)) {
        dates.push(d);
      }
    }
    return dates;
  }, [selDoctor, config]);

  const handleSubmit = async () => {
    if (!form.patientName.trim() || !form.patientPhone.trim()) {
      setSubmitError('Name and phone number are required'); return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data } = await API.post('/booking/public/book', {
        slug,
        doctorId:     selDoctor._id,
        date:         selDate,
        timeSlot:     selSlot,
        patientName:  form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        appointmentType: form.appointmentType,
        notes:        form.notes.trim(),
      });
      setBooking(data.booking);
      setStep(5);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const sendWhatsApp = () => {
    if (!form.patientPhone) return;
    const phone = form.patientPhone.replace(/[^0-9]/g, '');
    const formatted = phone.startsWith('0') ? `92${phone.slice(1)}` : `92${phone}`;
    const msg = encodeURIComponent(booking?.confirmationMsg || '');
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank', 'noopener');
  };

  /* Loading / Error */
  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f0f9ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:48 }}>🏥</div>
        <div style={{ color:'#6b7280', marginTop:8 }}>Loading booking page...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#fef2f2', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>
      <div style={{ fontSize:22, fontWeight:700, color:'#dc2626', marginBottom:8 }}>Page Not Available</div>
      <div style={{ color:'#6b7280' }}>{error}</div>
    </div>
  );

  const STEP_LABELS = ['Doctor','Date','Time','Your Details','Confirmed!'];
  const accentColor = '#0ea5e9';

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg, ${accentColor}, #0284c7)`, padding:'28px 20px', textAlign:'center', color:'#fff' }}>
        {config?.logo && <img src={config.logo} alt="logo" style={{ height:56, borderRadius:12, marginBottom:12 }} />}
        <div style={{ fontSize:26, fontWeight:900 }}>{config?.clinicName || 'Book Appointment'}</div>
        {config?.tagline && <div style={{ fontSize:14, opacity:0.85, marginTop:4 }}>{config.tagline}</div>}
        {config?.address && <div style={{ fontSize:13, opacity:0.7, marginTop:3 }}>📍 {config.address}</div>}
      </div>

      {/* Step indicator */}
      {step < 5 && (
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'12px 20px', display:'flex', justifyContent:'center', gap:0, overflowX:'auto' }}>
          {STEP_LABELS.slice(0,4).map((label, i) => (
            <div key={label} style={{ display:'flex', alignItems:'center' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:60 }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%',
                  background: step > i+1 ? '#10b981' : step === i+1 ? accentColor : '#e5e7eb',
                  color:      step >= i+1 ? '#fff' : '#6b7280',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700,
                }}>
                  {step > i+1 ? '✓' : i+1}
                </div>
                <div style={{ fontSize:10, color: step === i+1 ? accentColor : '#6b7280', marginTop:3, fontWeight: step===i+1?700:400 }}>
                  {label}
                </div>
              </div>
              {i < 3 && <div style={{ width:40, height:1, background: step > i+1 ? '#10b981' : '#e5e7eb', margin:'0 4px', marginBottom:14 }} />}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 16px 48px' }}>

        {/* ── STEP 1: Choose Doctor ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:16, color:'#111' }}>Choose a Doctor</h2>
            {config?.doctors?.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#6b7280' }}>No doctors available for online booking at this time.</div>
            ) : (
              config?.doctors?.map(doctor => (
                <div key={doctor._id}
                  onClick={() => { setSelDoctor(doctor); setSelDate(''); setSelSlot(''); setStep(2); }}
                  style={{
                    background:'#fff', border:'2px solid #e5e7eb', borderRadius:16, padding:'18px 20px',
                    marginBottom:12, cursor:'pointer', display:'flex', alignItems:'center', gap:16,
                    transition:'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none'; }}>

                  {/* Avatar */}
                  <div style={{
                    width:56, height:56, borderRadius:'50%',
                    background: accentColor+'20', color:accentColor,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:22, flexShrink:0,
                  }}>
                    {doctor.photo
                      ? <img src={doctor.photo} alt={doctor.name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
                      : doctor.name[0]}
                  </div>

                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:16 }}>Dr. {doctor.name}</div>
                    <div style={{ fontSize:13, color:'#6b7280', marginTop:2 }}>
                      {doctor.specialization}{doctor.qualification ? ` · ${doctor.qualification}` : ''}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, background:'#f0fdf4', color:'#10b981', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>
                        Available: {doctor.availableDays.map(d => DAY_NAMES[d]).join(', ')}
                      </span>
                      {doctor.consultFee > 0 && (
                        <span style={{ fontSize:11, background:'#fff7ed', color:'#f59e0b', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>
                          ₨{doctor.consultFee}
                        </span>
                      )}
                    </div>
                    {doctor.bio && <div style={{ fontSize:12, color:'#6b7280', marginTop:6 }}>{doctor.bio}</div>}
                  </div>
                  <div style={{ color:'#94a3b8', fontSize:20 }}>›</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── STEP 2: Choose Date ── */}
        {step === 2 && selDoctor && (
          <div>
            <button onClick={() => setStep(1)} style={{ background:'none', border:'none', color:'#0ea5e9', cursor:'pointer', fontSize:14, marginBottom:12, padding:0 }}>
              ← Dr. {selDoctor.name}
            </button>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:16, color:'#111' }}>Select a Date</h2>

            {/* Available days legend */}
            <div style={{ fontSize:13, color:'#6b7280', marginBottom:12 }}>
              Dr. {selDoctor.name} is available on: <strong>{selDoctor.availableDays.map(d => FULL_DAYS[d]).join(', ')}</strong>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(90px,1fr))', gap:8 }}>
              {buildDates().slice(0, 21).map(date => {
                const dt  = new Date(date);
                const dow = dt.getDay();
                const isSelected = date === selDate;
                return (
                  <button key={date}
                    onClick={() => { setSelDate(date); setSelSlot(''); setStep(3); }}
                    style={{
                      background: isSelected ? accentColor : '#fff',
                      border: `2px solid ${isSelected ? accentColor : '#e5e7eb'}`,
                      borderRadius: 12, padding: '12px 8px', cursor: 'pointer', textAlign: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = accentColor)}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = '#e5e7eb')}>
                    <div style={{ fontSize:11, color: isSelected?'rgba(255,255,255,0.8)':'#6b7280', fontWeight:600 }}>{DAY_NAMES[dow]}</div>
                    <div style={{ fontSize:20, fontWeight:800, color: isSelected?'#fff':'#111', lineHeight:1.2, marginTop:2 }}>{dt.getDate()}</div>
                    <div style={{ fontSize:10, color: isSelected?'rgba(255,255,255,0.7)':'#94a3b8' }}>{MONTH_NAMES[dt.getMonth()].slice(0,3)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: Choose Time Slot ── */}
        {step === 3 && selDoctor && selDate && (
          <div>
            <button onClick={() => setStep(2)} style={{ background:'none', border:'none', color:'#0ea5e9', cursor:'pointer', fontSize:14, marginBottom:12, padding:0 }}>
              ← {fmtDate(selDate)}
            </button>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:4, color:'#111' }}>Select a Time Slot</h2>
            <div style={{ fontSize:14, color:'#6b7280', marginBottom:16 }}>
              Dr. {selDoctor.name} · {fmtDate(selDate)}
            </div>

            {slotsLoading ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#6b7280' }}>Loading available slots...</div>
            ) : slots.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>😔</div>
                <div style={{ color:'#6b7280' }}>No slots available on this date. Please select another date.</div>
                <button onClick={() => setStep(2)} style={{ marginTop:12, background:accentColor, color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontWeight:700 }}>
                  Choose Another Date
                </button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px,1fr))', gap:8 }}>
                {slots.map(slot => {
                  const isSelected = selSlot === slot.time;
                  return (
                    <button key={slot.time}
                      disabled={!slot.isAvailable}
                      onClick={() => { if (slot.isAvailable) { setSelSlot(slot.time); setStep(4); } }}
                      style={{
                        background: isSelected ? accentColor : slot.isAvailable ? '#fff' : '#f9fafb',
                        border:     `2px solid ${isSelected ? accentColor : slot.isAvailable ? '#e5e7eb' : '#f3f4f6'}`,
                        borderRadius: 12, padding:'14px 8px', cursor: slot.isAvailable?'pointer':'not-allowed',
                        textAlign:'center', opacity: slot.isAvailable ? 1 : 0.5, transition:'all 0.15s',
                      }}
                      onMouseEnter={e => slot.isAvailable && !isSelected && (e.currentTarget.style.borderColor = accentColor)}
                      onMouseLeave={e => slot.isAvailable && !isSelected && (e.currentTarget.style.borderColor = '#e5e7eb')}>
                      <div style={{ fontWeight:700, fontSize:14, color: isSelected ? '#fff' : slot.isAvailable ? '#111' : '#94a3b8' }}>
                        {slot.time}
                      </div>
                      {!slot.isAvailable && (
                        <div style={{ fontSize:10, color:'#f59e0b', marginTop:3 }}>{slot.isPast ? 'Passed' : 'Full'}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Patient Details ── */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} style={{ background:'none', border:'none', color:'#0ea5e9', cursor:'pointer', fontSize:14, marginBottom:12, padding:0 }}>
              ← {selSlot}
            </button>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:16, color:'#111' }}>Your Details</h2>

            {/* Appointment summary */}
            <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:14, padding:16, marginBottom:20 }}>
              <div style={{ fontWeight:700, color:'#0369a1', marginBottom:8 }}>Appointment Summary</div>
              {[
                ['Doctor', `Dr. ${selDoctor?.name}`],
                ['Date',   fmtDate(selDate)],
                ['Time',   selSlot],
                ['Fee',    selDoctor?.consultFee > 0 ? `₨${selDoctor.consultFee}` : 'Free'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0' }}>
                  <span style={{ color:'#0369a1' }}>{k}</span>
                  <span style={{ fontWeight:700, color:'#0c4a6e' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:14, fontWeight:700, display:'block', marginBottom:6, color:'#374151' }}>Full Name *</label>
              <input
                value={form.patientName}
                onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))}
                placeholder="Muhammad Ali Khan"
                style={{ width:'100%', borderRadius:12, border:'2px solid #e5e7eb', padding:'14px 16px', fontSize:15, outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
                autoFocus
              />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:14, fontWeight:700, display:'block', marginBottom:6, color:'#374151' }}>Phone Number *</label>
              <input
                value={form.patientPhone}
                onChange={e => setForm(p => ({ ...p, patientPhone: e.target.value }))}
                placeholder="0300-1234567"
                type="tel"
                style={{ width:'100%', borderRadius:12, border:'2px solid #e5e7eb', padding:'14px 16px', fontSize:15, outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
              />
              <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>
                📱 Your booking confirmation will be shared via WhatsApp
              </div>
            </div>

            {(config?.appointmentTypes?.length > 1) && (
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:14, fontWeight:700, display:'block', marginBottom:6, color:'#374151' }}>Visit Type</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {config.appointmentTypes.map(type => (
                    <button key={type}
                      onClick={() => setForm(p => ({ ...p, appointmentType: type }))}
                      style={{
                        padding:'8px 16px', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600,
                        background: form.appointmentType === type ? accentColor : '#f1f5f9',
                        color:      form.appointmentType === type ? '#fff'       : '#374151',
                        border:     `2px solid ${form.appointmentType === type ? accentColor : 'transparent'}`,
                      }}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:14, fontWeight:700, display:'block', marginBottom:6, color:'#374151' }}>
                Notes for Doctor <span style={{ fontWeight:400, color:'#9ca3af' }}>(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Chief complaint or reason for visit..."
                style={{ width:'100%', borderRadius:12, border:'2px solid #e5e7eb', padding:'12px 16px', fontSize:14, fontFamily:'inherit', boxSizing:'border-box', resize:'none', outline:'none', transition:'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = accentColor}
                onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {submitError && (
              <div style={{ background:'#fee2e2', color:'#dc2626', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:14 }}>
                ❌ {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.patientName.trim() || !form.patientPhone.trim()}
              style={{
                width:'100%', padding:'16px', borderRadius:14, border:'none',
                background: (!form.patientName.trim() || !form.patientPhone.trim() || submitting) ? '#94a3b8' : accentColor,
                color:'#fff', fontWeight:800, fontSize:17,
                cursor: (!form.patientName.trim() || !form.patientPhone.trim() || submitting) ? 'not-allowed' : 'pointer',
              }}>
              {submitting ? '⏳ Confirming...' : '✓ Confirm Appointment'}
            </button>
          </div>
        )}

        {/* ── STEP 5: Confirmation ── */}
        {step === 5 && booking && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:80, marginBottom:12 }}>🎉</div>
            <div style={{ fontWeight:900, fontSize:26, color:'#10b981', marginBottom:8 }}>Appointment Confirmed!</div>
            <div style={{ color:'#6b7280', fontSize:15, marginBottom:24 }}>
              We'll see you soon, {booking.patientName.split(' ')[0]}!
            </div>

            {/* Booking details card */}
            <div style={{ background:'#fff', border:'2px solid #10b981', borderRadius:18, padding:'20px 24px', marginBottom:20, textAlign:'left' }}>
              {[
                ['👨‍⚕️ Doctor',   `Dr. ${booking.doctorName}`],
                ['📅 Date',    fmtDate(booking.date)],
                ['⏰ Time',    booking.timeSlot],
                ['🏥 Clinic',  booking.clinicName || 'Our Clinic'],
                ['📍 Address', booking.clinicAddress],
                ['📞 Phone',   booking.clinicPhone],
                ['💰 Fee',     booking.consultFee > 0 ? `₨${booking.consultFee}` : 'Free consultation'],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #dcfce7', fontSize:14 }}>
                  <span style={{ color:'#374151', fontWeight:600 }}>{k}</span>
                  <span style={{ color:'#111', fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp confirmation */}
            <button
              onClick={sendWhatsApp}
              style={{ width:'100%', padding:'15px', borderRadius:14, border:'none', background:'#25d366', color:'#fff', fontWeight:800, fontSize:16, cursor:'pointer', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              💬 Send Confirmation via WhatsApp
            </button>

            <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, background:'#f9fafb', borderRadius:12, padding:14, textAlign:'left' }}>
              <div style={{ fontWeight:700, marginBottom:6, color:'#374151' }}>📋 Confirmation Message (Copy & Send):</div>
              <div style={{ whiteSpace:'pre-wrap', fontSize:12 }}>{booking.confirmationMsg}</div>
            </div>

            {/* Cancel link */}
            <div style={{ marginTop:16, fontSize:13, color:'#94a3b8' }}>
              Need to cancel?{' '}
              <a href={booking.cancelLink} style={{ color:'#ef4444', textDecoration:'none', fontWeight:600 }}>
                Click here to cancel appointment
              </a>
            </div>

            {/* Book another */}
            <button
              onClick={() => { setStep(1); setSelDoctor(null); setSelDate(''); setSelSlot(''); setForm({ patientName:'', patientPhone:'', appointmentType:'Checkup', notes:'' }); setBooking(null); }}
              style={{ marginTop:16, background:'none', border:'2px solid #e5e7eb', borderRadius:12, padding:'12px 24px', cursor:'pointer', fontSize:14, color:'#374151', fontWeight:600 }}>
              📅 Book Another Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}