import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../utils/api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'long', year:'numeric' }) : '—';

const STAR_LABELS = { 1:'Very Poor', 2:'Poor', 3:'Average', 4:'Good', 5:'Excellent' };
const STAR_COLORS = { 1:'#ef4444', 2:'#f97316', 3:'#f59e0b', 4:'#84cc16', 5:'#10b981' };

function StarRating({ value, onChange, label, disabled = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  const color = STAR_COLORS[display] || '#94a3b8';

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#374151' }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => !disabled && onChange(star)}
            style={{
              background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
              fontSize: 36, padding: '2px 3px', lineHeight: 1,
              color:  star <= display ? color : '#d1d5db',
              transform: star <= display && !disabled ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.1s',
            }}>
            ★
          </button>
        ))}
        {display > 0 && (
          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 700, color }}>
            {STAR_LABELS[display]}
          </span>
        )}
      </div>
    </div>
  );
}

export default function FeedbackForm() {
  const { token } = useParams();
  const [formData, setFormData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [submitted,setSubmitted]= useState(false);

  const [ratings, setRatings] = useState({
    overallRating:     0,
    doctorRating:      0,
    staffRating:       0,
    cleanlinessRating: 0,
    waitTimeRating:    0,
  });
  const [review,      setReview]      = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    API.get(`/feedback/form/${token}`)
      .then(({ data }) => setFormData(data.form))
      .catch(err => setError(err.response?.data?.message || 'Link not found or expired'))
      .finally(() => setLoading(false));
  }, [token]);

  const setRating = (key, val) => setRatings(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!ratings.overallRating) {
      alert('Please give an overall rating'); return;
    }
    setSaving(true);
    try {
      await API.post(`/feedback/submit/${token}`, { ...ratings, review, isAnonymous });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSaving(false); }
  };

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 18, color: '#6b7280' }}>Loading feedback form...</div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{ minHeight: '100vh', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Link Not Available</div>
      <div style={{ fontSize: 15, color: '#6b7280' }}>{error}</div>
    </div>
  );

  /* ── Submitted ── */
  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#064e3b', marginBottom: 12 }}>شکریہ! Thank You!</div>
      <div style={{ fontSize: 16, color: '#065f46', maxWidth: 400, lineHeight: 1.7 }}>
        Your feedback has been recorded. We truly value your opinion and will use it to improve our services.
      </div>
      <div style={{ marginTop: 24, fontSize: 14, color: '#6b7280' }}>
        You may close this page.
      </div>
    </div>
  );

  const overallColor = ratings.overallRating ? STAR_COLORS[ratings.overallRating] : '#0ea5e9';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: overallColor || '#0ea5e9', padding: '28px 0', textAlign: 'center', transition: 'background 0.5s' }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>{formData.storeName}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>Rate Your Experience</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
          {formData.doctorName && `Dr. ${formData.doctorName}`}
          {formData.visitDate  && ` · ${fmtDate(formData.visitDate)}`}
        </div>
        {formData.patientName && (
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
            For: {formData.patientName}
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px 48px' }}>

        {/* Overall rating — big and prominent */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, color: '#111' }}>Overall Experience</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>How was your overall experience?</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} type="button"
                onMouseEnter={() => {}}
                onClick={() => setRating('overallRating', star)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 52, padding: '2px 4px', lineHeight: 1,
                  color:     star <= ratings.overallRating ? STAR_COLORS[ratings.overallRating] : '#e5e7eb',
                  transform: star <= ratings.overallRating ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s',
                }}>
                ★
              </button>
            ))}
          </div>
          {ratings.overallRating > 0 && (
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, color: STAR_COLORS[ratings.overallRating] }}>
              {STAR_LABELS[ratings.overallRating]}
            </div>
          )}
        </div>

        {/* Category ratings */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 20px 12px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#111' }}>Rate Specific Areas <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>(optional)</span></div>
          <StarRating label="👨‍⚕️ Doctor / Physician"     value={ratings.doctorRating}      onChange={v => setRating('doctorRating', v)} />
          <StarRating label="👩‍💼 Staff & Receptionist"   value={ratings.staffRating}       onChange={v => setRating('staffRating', v)} />
          <StarRating label="🧹 Cleanliness & Facility" value={ratings.cleanlinessRating} onChange={v => setRating('cleanlinessRating', v)} />
          <StarRating label="⏱ Wait Time"               value={ratings.waitTimeRating}    onChange={v => setRating('waitTimeRating', v)} />
        </div>

        {/* Written review */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#111' }}>
            Write a Review <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>(optional)</span>
          </div>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Share your experience — what went well? What could be improved?"
            style={{
              width: '100%', borderRadius: 10, border: '1.5px solid #e2e8f0',
              padding: '12px 14px', fontSize: 14, resize: 'vertical',
              outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>{review.length}/1000</div>

          {/* Anonymous toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 12, fontSize: 14, color: '#374151' }}>
            <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
            <span>Submit anonymously — don't show my name</span>
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || !ratings.overallRating}
          style={{
            width: '100%', padding: '16px', borderRadius: 12, border: 'none',
            background: ratings.overallRating ? overallColor : '#94a3b8',
            color: '#fff', fontWeight: 800, fontSize: 17,
            cursor: (!ratings.overallRating || saving) ? 'not-allowed' : 'pointer',
            transition: 'background 0.3s',
          }}>
          {saving ? '⏳ Submitting...' : ratings.overallRating ? `Submit ${STAR_LABELS[ratings.overallRating]} Review ★` : 'Please select a rating'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
          🔒 Your feedback is confidential and helps us improve. Powered by MediStore.
        </div>
      </div>
    </div>
  );
}