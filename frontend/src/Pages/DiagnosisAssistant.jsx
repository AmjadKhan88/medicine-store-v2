import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdAdd, MdClose, MdDelete, MdRefresh,
  MdWarning, MdHistory, MdPerson, MdSend,
  MdArrowBack, MdLocalHospital, MdScience,
  MdMedicalServices, MdInfo,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import {useWindowWidth} from '../hooks/useWindowWidth';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtDT = d => d ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const PRIORITY_CFG = {
  Urgent: { bg: '#fee2e2', color: '#ef4444', border: '#fca5a5' },
  Routine: { bg: '#dbeafe', color: '#3b82f6', border: '#93c5fd' },
  Optional: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
};

const ACTION_CFG = {
  Immediate: { bg: '#fee2e2', color: '#dc2626' },
  Urgent: { bg: '#fef3c7', color: '#f59e0b' },
  Monitor: { bg: '#dbeafe', color: '#3b82f6' },
};

const CONFIDENCE_CFG = {
  high: { bg: '#d1fae5', color: '#10b981' },
  medium: { bg: '#fef3c7', color: '#f59e0b' },
  low: { bg: '#fee2e2', color: '#ef4444' },
};

const SYMPTOMS_BY_SYSTEM = {
  General: ['Fever', 'Weight loss', 'Fatigue', 'Night sweats', 'Loss of appetite', 'Chills', 'Malaise'],
  Respiratory: ['Cough', 'Shortness of breath', 'Haemoptysis', 'Chest pain', 'Wheezing', 'Sputum production'],
  Cardiovascular: ['Chest pain', 'Palpitations', 'Leg swelling', 'Orthopnoea', 'PND', 'Syncope'],
  GI: ['Nausea', 'Vomiting', 'Diarrhoea', 'Constipation', 'Abdominal pain', 'Blood in stool', 'Jaundice', 'Haematemesis'],
  Neurological: ['Headache', 'Dizziness', 'Confusion', 'Seizure', 'Weakness', 'Numbness', 'Visual changes'],
  Urological: ['Dysuria', 'Frequency', 'Haematuria', 'Flank pain', 'Discharge'],
  Musculoskeletal: ['Joint pain', 'Joint swelling', 'Back pain', 'Muscle pain', 'Morning stiffness'],
  Skin: ['Rash', 'Itching', 'Jaundice', 'Pallor', 'Cyanosis', 'Oedema'],
  ENT: ['Sore throat', 'Ear pain', 'Nasal discharge', 'Epistaxis', 'Hoarseness'],
};

const COMMON_CONDITIONS = [
  'Diabetes Mellitus Type 2', 'Hypertension', 'Ischaemic Heart Disease', 'Asthma', 'COPD',
  'Chronic Kidney Disease', 'Hepatitis B', 'Hepatitis C', 'Tuberculosis', 'Hypothyroidism',
  'Epilepsy', 'Peptic Ulcer Disease', 'Anxiety/Depression', 'Osteoarthritis', 'Rheumatoid Arthritis',
];

/* ════════════════════════════════
   DISCLAIMER BANNER
════════════════════════════════ */
function DisclaimerBanner() {
  return (
    <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <MdWarning size={26} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 800, color: '#92400e', marginBottom: 4, fontSize: 14 }}>
          ⚕️ AI Clinical Decision Support — Not a Replacement for Clinical Judgment
        </div>
        <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>
          This AI assistant provides differential diagnoses and treatment suggestions to support — not replace — the physician's clinical judgment.
          Always perform a complete physical examination. Final diagnosis and treatment decisions must be made by a licensed physician.
          In emergencies, prioritize immediate patient stabilization.
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   RED FLAGS
════════════════════════════════ */
function RedFlagsSection({ flags }) {
  if (!flags?.length) return null;
  return (
    <div style={{ background: '#fff1f2', border: '2px solid #fda4af', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <MdWarning size={22} style={{ color: '#dc2626' }} />
        <div style={{ fontWeight: 800, color: '#dc2626', fontSize: 15 }}>
          🚨 Red Flag Symptoms — Require Immediate Attention
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {flags.map((f, i) => {
          const cfg = ACTION_CFG[f.action] || ACTION_CFG.Monitor;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #fda4af' }}>
              <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {f.action}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{f.symptom}</div>
                <div style={{ fontSize: 12, color: '#be123c', marginTop: 2 }}>{f.significance}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   DIFFERENTIALS
════════════════════════════════ */
function DifferentialsSection({ differentials }) {
  if (!differentials?.length) return null;
  const sorted = [...differentials].sort((a, b) => b.probability - a.probability);
  const maxProb = sorted[0]?.probability || 1;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <MdMedicalServices size={20} style={{ color: 'var(--accent)' }} />
        <div style={{ fontWeight: 800, fontSize: 15 }}>Differential Diagnoses</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((d, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', background: i === 0 ? 'var(--accent-light)' : 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: i === 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {i + 1}. {d.diagnosis}
                </span>
                {d.icd10 && (
                  <span style={{ fontSize: 11, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6 }}>
                    {d.icd10}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontWeight: 900, fontSize: 20, color: i === 0 ? 'var(--accent)' : '#f59e0b' }}>
                  {d.probability}%
                </span>
              </div>
            </div>

            {/* Probability bar */}
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(d.probability / maxProb) * 100}%`,
                background: i === 0 ? 'var(--accent)' : i === 1 ? '#f59e0b' : '#94a3b8',
                borderRadius: 99, transition: 'width 0.6s ease',
              }} />
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>{d.reasoning}</div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {d.supportingFeatures?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: 3 }}>Supporting</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {d.supportingFeatures.map((f, j) => (
                      <span key={j} style={{ background: '#d1fae5', color: '#166534', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>✓ {f}</span>
                    ))}
                  </div>
                </div>
              )}
              {d.againstFeatures?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 3 }}>Against</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {d.againstFeatures.map((f, j) => (
                      <span key={j} style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 6, fontSize: 11 }}>✗ {f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   INVESTIGATIONS
════════════════════════════════ */
function InvestigationsSection({ investigations }) {
  if (!investigations?.length) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <MdScience size={20} style={{ color: '#8b5cf6' }} />
        <div style={{ fontWeight: 800, fontSize: 15 }}>Recommended Investigations</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {investigations.map((inv, i) => {
          const cfg = PRIORITY_CFG[inv.priority] || PRIORITY_CFG.Routine;
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '10px 14px', background: cfg.bg + '40' }}>
              <span style={{ background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {inv.priority}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{inv.test}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{inv.rationale}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11 }}>
                  {inv.estimatedCost && <span style={{ color: '#0369a1' }}>💰 {inv.estimatedCost}</span>}
                  {inv.availableInPakistan === false && <span style={{ color: '#ef4444' }}>⚠️ May not be available locally</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   TREATMENT
════════════════════════════════ */
function TreatmentSection({ treatment }) {
  if (!treatment) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <MdLocalHospital size={20} style={{ color: '#10b981' }} />
        <div style={{ fontWeight: 800, fontSize: 15 }}>Treatment Plan</div>
      </div>

      {/* Immediate actions */}
      {treatment.immediate?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 6 }}>⚡ Immediate Actions</div>
          {treatment.immediate.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: '#dc2626', fontWeight: 700, flexShrink: 0 }}>→</span>
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Medications */}
      {treatment.medications?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0369a1', marginBottom: 8 }}>💊 Medications</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Drug</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Dose</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Frequency</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Duration</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {treatment.medications.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                      {m.drug}
                      {m.availableInPakistan === false && <span style={{ color: '#f59e0b', fontSize: 10, display: 'block' }}>⚠️ Check availability</span>}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{m.dose}</td>
                    <td style={{ padding: '8px 10px' }}>{m.frequency}</td>
                    <td style={{ padding: '8px 10px' }}>{m.duration}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Non-pharmacological */}
      {treatment.nonPharmacological?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#10b981', marginBottom: 6 }}>🌿 Non-pharmacological</div>
          {treatment.nonPharmacological.map((a, i) => (
            <div key={i} style={{ fontSize: 13, padding: '3px 0' }}>• {a}</div>
          ))}
        </div>
      )}

      {/* Follow-up */}
      {treatment.followUp && (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>📅 Follow-up Plan</div>
          <div style={{ fontSize: 13 }}>{treatment.followUp}</div>
        </div>
      )}

      {/* Referral */}
      {treatment.referral?.needed && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, color: '#ea580c', marginBottom: 4 }}>
            🏥 Referral Required — {treatment.referral.specialty}
          </div>
          <div style={{ fontSize: 13, color: '#7c2d12' }}>
            <strong>Urgency:</strong> {treatment.referral.urgency} · {treatment.referral.reason}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   FOLLOW-UP RESPONSE RENDERER
════════════════════════════════ */
function FollowUpRenderer({ text }) {
  // If it's JSON, parse and render structured
  let parsed = null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { }

  if (parsed) return <StructuredFollowUp data={parsed} />;

  // Plain text rendering with markdown-lite formatting
  const lines = text.split('\n');
  return (
    <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-primary)' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 8 }} />;

        // ## Heading
        if (trimmed.startsWith('## ')) {
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)', marginTop: 14, marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              {trimmed.slice(3)}
            </div>
          );
        }

        // ### Sub-heading
        if (trimmed.startsWith('### ')) {
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginTop: 10, marginBottom: 4 }}>
              {trimmed.slice(4)}
            </div>
          );
        }

        // Numbered list: 1. 2. 3.
        const numbered = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numbered) {
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                {numbered[1]}
              </span>
              <span>{renderInline(numbered[2])}</span>
            </div>
          );
        }

        // Bullet: • - *
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.slice(2);
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start', paddingLeft: 8 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 900, flexShrink: 0, marginTop: 2 }}>•</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        // Warning/alert line
        if (trimmed.startsWith('⚠️') || trimmed.startsWith('🚨') || trimmed.startsWith('❗')) {
          return (
            <div key={i} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 13, color: '#92400e' }}>
              {renderInline(trimmed)}
            </div>
          );
        }

        // Important/note line
        if (trimmed.startsWith('✅') || trimmed.startsWith('✓') || trimmed.startsWith('Note:') || trimmed.startsWith('NOTE:')) {
          return (
            <div key={i} style={{ background: '#f0fdf4', borderRadius: 8, padding: '6px 12px', marginBottom: 6, fontSize: 13, color: '#166534' }}>
              {renderInline(trimmed)}
            </div>
          );
        }

        // Regular paragraph
        return (
          <div key={i} style={{ marginBottom: 6 }}>
            {renderInline(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

/* ── Inline bold/italic rendering ── */
function renderInline(text) {
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

/* ── Structured JSON follow-up renderer ── */
function StructuredFollowUp({ data }) {
  const renderValue = (val, depth = 0) => {
    if (val === null || val === undefined) return <span className="text-muted">—</span>;
    if (typeof val === 'boolean') return <span style={{ color: val ? '#10b981' : '#ef4444', fontWeight: 700 }}>{val ? 'Yes' : 'No'}</span>;
    if (typeof val === 'string') return <span style={{ lineHeight: 1.7 }}>{val}</span>;
    if (typeof val === 'number') return <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{val}</span>;

    if (Array.isArray(val)) {
      return (
        <ul style={{ margin: '4px 0', paddingLeft: depth > 0 ? 16 : 0, listStyle: 'none' }}>
          {val.map((item, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 900, flexShrink: 0, marginTop: 2 }}>•</span>
              <span style={{ fontSize: 13, lineHeight: 1.6 }}>{renderValue(item, depth + 1)}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (typeof val === 'object') {
      return (
        <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
          {Object.entries(val).map(([k, v]) => {
            if (k === 'disclaimer') return null; // render disclaimer separately
            const label = k
              .replace(/([A-Z])/g, ' $1')
              .replace(/_/g, ' ')
              .replace(/^./, s => s.toUpperCase())
              .trim();

            const isSection = typeof v === 'object' && !Array.isArray(v) && v !== null;
            const isArray = Array.isArray(v);

            return (
              <div key={k} style={{ marginBottom: isSection ? 14 : 8 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: isSection ? 14 : 12,
                  color: isSection ? 'var(--accent)' : 'var(--text-muted)',
                  marginBottom: 4,
                  textTransform: isSection ? 'none' : 'uppercase',
                  letterSpacing: isSection ? 0 : 0.5,
                  paddingBottom: isSection ? 4 : 0,
                  borderBottom: isSection ? '1px solid var(--border)' : 'none',
                }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                  {renderValue(v, depth + 1)}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return <span>{String(val)}</span>;
  };

  // Special case: dietary advice structure (most common)
  if (data.dietaryAdvice) {
    const { whatToEat, whatToIgnoreOrAvoid } = data.dietaryAdvice;
    return (
      <div>
        {whatToEat?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#d1fae5', borderRadius: 8, padding: '4px 10px' }}>✅ What to Eat</span>
            </div>
            {whatToEat.map((cat, i) => (
              <div key={i} style={{ marginBottom: 12, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#166534', marginBottom: 6 }}>🥗 {cat.category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {cat.items?.map((item, j) => (
                    <span key={j} style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                      {item}
                    </span>
                  ))}
                </div>
                {cat.rationale && (
                  <div style={{ fontSize: 11, color: '#166534', fontStyle: 'italic', marginTop: 4 }}>
                    💡 {cat.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {whatToIgnoreOrAvoid?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#fee2e2', borderRadius: 8, padding: '4px 10px' }}>❌ Foods to Avoid</span>
            </div>
            {whatToIgnoreOrAvoid.map((cat, i) => (
              <div key={i} style={{ marginBottom: 10, background: '#fff5f5', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 6 }}>🚫 {cat.category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  {cat.items?.map((item, j) => (
                    <span key={j} style={{ background: '#fecaca', color: '#dc2626', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                      {item}
                    </span>
                  ))}
                </div>
                {cat.rationale && (
                  <div style={{ fontSize: 11, color: '#b91c1c', fontStyle: 'italic', marginTop: 4 }}>
                    ⚠️ {cat.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {data.pakistanSpecificNotes && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 4 }}>🇵🇰 Pakistan-Specific Notes</div>
            <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>{data.pakistanSpecificNotes}</div>
          </div>
        )}

        {data.disclaimer && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
            ⚕️ {data.disclaimer}
          </div>
        )}
      </div>
    );
  }

  // Generic structured JSON fallback
  return (
    <div style={{ fontSize: 13 }}>
      {renderValue(data)}
      {data.disclaimer && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          ⚕️ {data.disclaimer}
        </div>
      )}
    </div>
  );
}


/* ════════════════════════════════
   ANALYSIS RESULT VIEW
════════════════════════════════ */
function AnalysisView({ analysis, sessionId, onFollowUp, onNewCase }) {
  const [followUpQ, setFollowUpQ] = useState('');
  const [followUpRes, setFollowUpRes] = useState('');
  const [asking, setAsking] = useState(false);
  const chatRef = useRef(null);

  const width = useWindowWidth();

  const handleFollowUp = async () => {
    if (!followUpQ.trim()) return;
    setAsking(true);
    try {
      const { data } = await API.post('/diagnosis/followup', { sessionId, question: followUpQ.trim() });
      setFollowUpRes(data.response);
      setFollowUpQ('');
      onFollowUp?.();
      setTimeout(() => chatRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Follow-up failed');
    } finally { setAsking(false); }
  };

  const cc = CONFIDENCE_CFG[analysis.confidenceLevel] || CONFIDENCE_CFG.medium;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>AI Analysis Complete</div>
            <span style={{ background: cc.bg, color: cc.color, padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
              {analysis.confidenceLevel} confidence
            </span>
          </div>
          {analysis.summary && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4, maxWidth: 700, lineHeight: 1.6 }}>
              {analysis.summary}
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={onNewCase}><MdAdd /> New Case</button>
      </div>

      {/* Disclaimer */}
      <DisclaimerBanner />

      {/* Red flags first */}
      <RedFlagsSection flags={analysis.redFlags} />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: width < 801 ? '' : '1fr 1fr', gap: 16 }}>
        <div>
          <DifferentialsSection differentials={analysis.differentials} />
          {analysis.clinicalPearls?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <MdInfo size={18} style={{ color: '#8b5cf6' }} />
                <div style={{ fontWeight: 700 }}>Clinical Pearls</div>
              </div>
              {analysis.clinicalPearls.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 700, flexShrink: 0 }}>💡</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <InvestigationsSection investigations={analysis.investigations} />
          <TreatmentSection treatment={analysis.treatment} />
          {analysis.pakistanSpecificNotes && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 8 }}>🇵🇰 Pakistan-Specific Notes</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-muted)' }}>
                {analysis.pakistanSpecificNotes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up chat */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>💬 Ask a Follow-up Question</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          Examples: "What if the patient is pregnant?" · "Patient is allergic to penicillin, alternatives?" · "How to differentiate from dengue?"
        </div>

        {followUpRes && (
          <div ref={chatRef} style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>AI Clinical Response</span>
            </div>
            <FollowUpRenderer text={followUpRes} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-control"
            value={followUpQ}
            onChange={e => setFollowUpQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleFollowUp()}
            placeholder="Ask a follow-up question about this case..."
            disabled={asking}
          />
          <button className="btn btn-primary" onClick={handleFollowUp} disabled={asking || !followUpQ.trim()}>
            {asking ? '...' : <MdSend />}
          </button>
        </div>
      </div>

      {/* Final disclaimer */}
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16, padding: '10px 0' }}>
        ⚕️ {analysis.disclaimer}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   INPUT FORM
════════════════════════════════ */
function InputForm({ onResult }) {
  const [form, setForm] = useState({
    patientAge: '',
    patientGender: 'Male',
    patientName: '',
    chiefComplaint: '',
    duration: '',
    selectedSymptoms: [],
    customSymptom: '',
    bpSystolic: '', bpDiastolic: '', pulse: '', temp: '', spo2: '', rbs: '', weight: '',
    labResults: '',
    existingConditions: [],
    customCondition: '',
    currentMedications: '',
    allergies: '',
    additionalHistory: '',
  });
  const [activeSystem, setActiveSystem] = useState('General');
  const [loading, setLoading] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const toggleSymptom = sym => setForm(p => ({
    ...p,
    selectedSymptoms: p.selectedSymptoms.includes(sym)
      ? p.selectedSymptoms.filter(s => s !== sym)
      : [...p.selectedSymptoms, sym],
  }));

  const addCustomSymptom = () => {
    if (!form.customSymptom.trim()) return;
    setForm(p => ({ ...p, selectedSymptoms: [...p.selectedSymptoms, p.customSymptom.trim()], customSymptom: '' }));
  };

  const toggleCondition = c => setForm(p => ({
    ...p,
    existingConditions: p.existingConditions.includes(c)
      ? p.existingConditions.filter(x => x !== c)
      : [...p.existingConditions, c],
  }));

  const addCustomCondition = () => {
    if (!form.customCondition.trim()) return;
    setForm(p => ({ ...p, existingConditions: [...p.existingConditions, p.customCondition.trim()], customCondition: '' }));
  };

  const handleAnalyze = async () => {
    if (!form.chiefComplaint.trim()) { toast.error('Chief complaint is required'); return; }
    if (!form.patientAge) { toast.error('Patient age is required'); return; }
    if (form.selectedSymptoms.length === 0) { toast.error('Please add at least one symptom'); return; }

    setLoading(true);
    try {
      const vitals = {};
      if (form.bpSystolic && form.bpDiastolic) vitals.bp = `${form.bpSystolic}/${form.bpDiastolic} mmHg`;
      if (form.pulse) vitals.pulse = `${form.pulse} bpm`;
      if (form.temp) vitals.temp = `${form.temp}°C`;
      if (form.spo2) vitals.spo2 = `${form.spo2}%`;
      if (form.rbs) vitals.rbs = `${form.rbs} mg/dL`;
      if (form.weight) vitals.weight = `${form.weight} kg`;

      const { data } = await API.post('/diagnosis/analyze', {
        patientAge: Number(form.patientAge),
        patientGender: form.patientGender,
        patientName: form.patientName || 'Anonymous',
        chiefComplaint: form.chiefComplaint.trim(),
        duration: form.duration,
        symptoms: form.selectedSymptoms,
        vitals,
        labResults: form.labResults,
        existingConditions: form.existingConditions,
        currentMedications: form.currentMedications.split(',').map(s => s.trim()).filter(Boolean),
        allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
        additionalHistory: form.additionalHistory,
      }, {
        timeout: 120000, // override for this request
      });

      onResult(data.analysis, data.sessionId);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <DisclaimerBanner />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left column */}
        <div>
          {/* Patient basics */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>👤 Patient Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label required" style={{ fontSize: 11 }}>Age (years)</label>
                <input className="form-control" type="number" min="0" max="120" value={form.patientAge} onChange={fld('patientAge')} placeholder="45" autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Gender</label>
                <select className="form-control" value={form.patientGender} onChange={fld('patientGender')}>
                  {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Name (optional)</label>
                <input className="form-control" value={form.patientName} onChange={fld('patientName')} placeholder="Anonymous" />
              </div>
            </div>
          </div>

          {/* Chief complaint */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🩺 Chief Complaint</div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label required" style={{ fontSize: 11 }}>Chief Complaint</label>
              <input className="form-control" value={form.chiefComplaint} onChange={fld('chiefComplaint')} placeholder="e.g. Fever with cough for 5 days" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Duration</label>
              <input className="form-control" value={form.duration} onChange={fld('duration')} placeholder="e.g. 5 days, 2 weeks, 3 months" />
            </div>
          </div>

          {/* Vitals */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>❤️ Vitals (optional)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { key: 'bpSystolic', label: 'BP Systolic', placeholder: '120', unit: 'mmHg' },
                { key: 'bpDiastolic', label: 'BP Diastolic', placeholder: '80', unit: 'mmHg' },
                { key: 'pulse', label: 'Pulse', placeholder: '80', unit: 'bpm' },
                { key: 'temp', label: 'Temperature', placeholder: '37.0', unit: '°C' },
                { key: 'spo2', label: 'SpO2', placeholder: '98', unit: '%' },
                { key: 'rbs', label: 'RBS', placeholder: '120', unit: 'mg/dL' },
              ].map(v => (
                <div key={v.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>{v.label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input className="form-control" type="number" value={form[v.key]} onChange={fld(v.key)} placeholder={v.placeholder} style={{ fontSize: 13 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{v.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lab results */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🔬 Lab Results (optional)</div>
            <textarea className="form-control" rows={3} value={form.labResults} onChange={fld('labResults')}
              placeholder="e.g. CBC: Hb 9.5 g/dL, WBC 11,000 (neutrophils 80%), Platelets 450,000&#10;LFT: ALT 65 IU/L, AST 55 IU/L&#10;Blood culture: pending" />
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Symptoms */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>🤒 Symptoms {form.selectedSymptoms.length > 0 && <span style={{ fontSize: 12, color: 'var(--accent)' }}>({form.selectedSymptoms.length} selected)</span>}</div>

            {/* System tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {Object.keys(SYMPTOMS_BY_SYSTEM).map(sys => (
                <button key={sys}
                  onClick={() => setActiveSystem(sys)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: activeSystem === sys ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: activeSystem === sys ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${activeSystem === sys ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {sys}
                </button>
              ))}
            </div>

            {/* Symptom pills */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {SYMPTOMS_BY_SYSTEM[activeSystem].map(sym => (
                <button key={sym}
                  onClick={() => toggleSymptom(sym)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: form.selectedSymptoms.includes(sym) ? '#0ea5e9' : '#f1f5f9',
                    color: form.selectedSymptoms.includes(sym) ? '#fff' : '#374151',
                    border: `1px solid ${form.selectedSymptoms.includes(sym) ? '#0ea5e9' : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}>
                  {form.selectedSymptoms.includes(sym) && '✓ '}{sym}
                </button>
              ))}
            </div>

            {/* Custom symptom */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-control" value={form.customSymptom} onChange={fld('customSymptom')}
                onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                placeholder="Add custom symptom..." style={{ fontSize: 12 }} />
              <button className="btn btn-secondary btn-sm" onClick={addCustomSymptom}><MdAdd size={14} /></button>
            </div>

            {/* Selected symptoms display */}
            {form.selectedSymptoms.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {form.selectedSymptoms.map(sym => (
                  <span key={sym} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {sym}
                    <button onClick={() => toggleSymptom(sym)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: 0, lineHeight: 1, fontSize: 12 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Existing conditions */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>📋 Existing Conditions</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
              {COMMON_CONDITIONS.map(c => (
                <button key={c}
                  onClick={() => toggleCondition(c)}
                  style={{
                    padding: '4px 9px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: form.existingConditions.includes(c) ? '#7c3aed' : '#f5f3ff',
                    color: form.existingConditions.includes(c) ? '#fff' : '#5b21b6',
                    border: `1px solid ${form.existingConditions.includes(c) ? '#7c3aed' : '#ddd6fe'}`,
                  }}>
                  {form.existingConditions.includes(c) && '✓ '}{c.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="form-control" value={form.customCondition} onChange={fld('customCondition')}
                onKeyDown={e => e.key === 'Enter' && addCustomCondition()}
                placeholder="Add other condition..." style={{ fontSize: 12 }} />
              <button className="btn btn-secondary btn-sm" onClick={addCustomCondition}><MdAdd size={14} /></button>
            </div>
          </div>

          {/* Medications & allergies */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>💊 Medications & Allergies</div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Current Medications (comma-separated)</label>
              <input className="form-control" value={form.currentMedications} onChange={fld('currentMedications')}
                placeholder="Metformin 500mg BD, Amlodipine 5mg OD, Atorvastatin 20mg OD" />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Allergies (comma-separated)</label>
              <input className="form-control" value={form.allergies} onChange={fld('allergies')}
                placeholder="Penicillin, Aspirin (or NKDA)" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Additional History</label>
              <textarea className="form-control" rows={2} value={form.additionalHistory} onChange={fld('additionalHistory')}
                placeholder="Family history, social history, travel history, occupation, specific risk factors..." />
            </div>
          </div>
        </div>
      </div>

      {/* Analyze button */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 16, padding: '16px', fontSize: 17, fontWeight: 800, background: loading ? '#94a3b8' : undefined }}
        onClick={handleAnalyze}
        disabled={loading || !form.chiefComplaint || !form.patientAge || form.selectedSymptoms.length === 0}>
        {loading ? (
          <span>🧠 Gemini AI is analyzing the case... Please wait</span>
        ) : (
          <span>🧠 Analyze with AI — Get Differential Diagnoses</span>
        )}
      </button>
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
          Considering Pakistani epidemiology, drug availability, and clinical guidelines...
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   HISTORY PANEL
════════════════════════════════ */
function HistoryPanel({ onLoad }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/diagnosis', { params: { limit: 20 } })
      .then(({ data }) => setSessions(data.sessions || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this diagnosis session?')) return;
    try {
      await API.delete(`/diagnosis/${id}`);
      setSessions(p => p.filter(s => s._id !== id));
      toast.success('Deleted');
    } catch { }
  };

  if (loading) return <ShortLoader/>;

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent Sessions ({sessions.length})</div>
      {sessions.length === 0 ? (
        <div className="text-muted text-sm">No previous sessions</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sessions.map(s => (
            <div key={s._id}
              onClick={() => onLoad(s._id)}
              style={{ border: '1px solid var(--border)', borderLeft: `4px solid ${s.hasRedFlags ? '#ef4444' : s.hasReferral ? '#f59e0b' : 'var(--accent)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: 'var(--card-bg)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = s.hasRedFlags ? '#ef4444' : s.hasReferral ? '#f59e0b' : 'var(--border)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.chiefComplaint}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {s.patientAge}y {s.patientGender} · {fmtDT(s.createdAt)} · Dr. {s.doctorName}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {s.hasRedFlags && <span style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', padding: '1px 8px', borderRadius: 99, fontWeight: 700 }}>🚨 Red Flags</span>}
                    {s.hasReferral && <span style={{ fontSize: 10, background: '#fff7ed', color: '#f59e0b', padding: '1px 8px', borderRadius: 99, fontWeight: 700 }}>🏥 Referral</span>}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={e => handleDelete(s._id, e)}>
                  <MdDelete size={13} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function DiagnosisAssistant() {
  const [view, setView] = useState('form');    // 'form' | 'result' | 'history'
  const [analysis, setAnalysis] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const handleResult = (data, sid) => {
    setAnalysis(data);
    setSessionId(sid);
    setView('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadSession = async (id) => {
    setLoadingSession(true);
    try {
      const { data } = await API.get(`/diagnosis/${id}`);
      if (data.session?.lastAnalysis) {
        setAnalysis(data.session.lastAnalysis);
        setSessionId(data.session._id);
        setView('result');
      }
    } catch { toast.error('Failed to load session'); }
    finally { setLoadingSession(false); }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧠 AI Diagnosis Assistant</h1>
          <p>Gemini AI-powered clinical decision support — differential diagnoses, investigations, treatment guidelines</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view === 'result' && (
            <button className="btn btn-secondary" onClick={() => setView('form')}>
              <MdArrowBack /> New Case
            </button>
          )}
          <button
            className={`btn ${view === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView(view === 'history' ? 'form' : 'history')}>
            <MdHistory /> History
          </button>
        </div>
      </div>

      {/* Capability badges */}
      {view === 'form' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { icon: '🔴', label: 'Red flag detection', color: '#fef2f2' },
            { icon: '📊', label: 'Probability-ranked differentials', color: '#f0f9ff' },
            { icon: '🔬', label: 'Investigation recommendations', color: '#f5f3ff' },
            { icon: '💊', label: 'Treatment guidelines (Pakistan)', color: '#f0fdf4' },
            { icon: '🏥', label: 'Specialist referral advice', color: '#fffbeb' },
            { icon: '🇵🇰', label: 'Pakistan-specific context', color: '#fff1f2' },
          ].map(b => (
            <div key={b.label} style={{ background: b.color, borderRadius: 10, padding: '6px 14px', fontSize: 12, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
              {b.icon} {b.label}
            </div>
          ))}
        </div>
      )}

      {/* History view */}
      {view === 'history' && (
        <div style={{ maxWidth: 640 }}>
          {loadingSession ? (
            <div className="text-muted text-sm">Loading session...</div>
          ) : (
            <HistoryPanel onLoad={handleLoadSession} />
          )}
        </div>
      )}

      {/* Form view */}
      {view === 'form' && <InputForm onResult={handleResult} />}

      {/* Result view */}
      {view === 'result' && analysis && (
        <AnalysisView
          analysis={analysis}
          sessionId={sessionId}
          onNewCase={() => { setView('form'); setAnalysis(null); setSessionId(null); }}
          onFollowUp={() => { }}
        />
      )}
    </div>
  );
}