import { useState } from 'react';
import { MdWarning, MdCheckCircle, MdAutoAwesome, MdClose } from 'react-icons/md';
import API from '../utils/api';
import { useAI } from '../context/AIContext';
import AIModelSelector from './AIModelSelector';

const SEVERITY_STYLE = {
  major:    { bg: 'var(--danger-bg)',  color: 'var(--danger)',  icon: '🚨', label: 'Major'    },
  moderate: { bg: 'var(--warning-bg)', color: 'var(--warning)', icon: '⚠️', label: 'Moderate' },
  minor:    { bg: 'var(--info-bg)',    color: 'var(--info)',    icon: 'ℹ️', label: 'Minor'    },
  none:     { bg: 'var(--success-bg)', color: 'var(--success)', icon: '✅', label: 'None'     },
};

export default function DrugInteractionChecker({ medicineIds, medicineNames }) {
  const { selectedModel } = useAI();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow]       = useState(false);

  const checkInteractions = async () => {
    if (medicineIds.length < 2) return;
    setLoading(true); setShow(true);
    try {
      const { data } = await API.post('/ai/check-interactions', {
        medicines: medicineIds,
        modelKey:  selectedModel,
      });
      setResult(data);
    } catch (err) {
      setResult({ safe: true, interactions: [], severity: 'none', summary: 'Could not check interactions — please verify manually.' });
    } finally { setLoading(false); }
  };

  if (medicineIds.length < 2) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {!show ? (
        <button
          className="btn btn-secondary btn-sm"
          onClick={checkInteractions}
          style={{ fontSize: 12 }}
        >
          <MdAutoAwesome size={14} style={{ color: 'var(--accent)' }} />
          Check Drug Interactions ({medicineIds.length} medicines)
        </button>
      ) : (
        <div style={{
          border:       `1px solid ${result?.safe !== false ? 'var(--border)' : 'var(--danger)'}`,
          borderRadius: 12,
          overflow:     'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding:        '10px 14px',
            background:     result?.safe === false ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13 }}>
              <MdAutoAwesome size={15} style={{ color: 'var(--accent)' }} />
              Drug Interaction Check
              {loading && <span className="text-muted text-sm" style={{ fontWeight: 400 }}>Analyzing...</span>}
            </div>
            <button
              onClick={() => { setShow(false); setResult(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-main)' }}
            >
              <MdClose size={16} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '12px 14px', background: 'var(--card-bg)' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                ⏳ Checking {medicineNames.join(', ')} for interactions...
              </div>
            ) : result ? (
              <>
                {/* Overall status */}
                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                  padding:      '10px 12px',
                  borderRadius: 8,
                  marginBottom: result.interactions?.length > 0 ? 12 : 0,
                  background:   result.safe !== false ? 'var(--success-bg)' : 'var(--danger-bg)',
                }}>
                  {result.safe !== false
                    ? <MdCheckCircle size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                    : <MdWarning     size={18} style={{ color: 'var(--danger)',  flexShrink: 0 }} />}
                  <div style={{ fontSize: 13, color: result.safe !== false ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {result.summary}
                  </div>
                </div>

                {/* Interactions */}
                {result.interactions?.map((interaction, i) => {
                  const sty = SEVERITY_STYLE[interaction.severity] || SEVERITY_STYLE.minor;
                  return (
                    <div key={i} style={{
                      border:       `1px solid ${sty.color}30`,
                      borderRadius: 8,
                      padding:      '10px 12px',
                      marginBottom: 8,
                      background:   sty.bg,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span>{sty.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: sty.color }}>{sty.label} Interaction</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
                          {interaction.drug1} + {interaction.drug2}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        {interaction.effect}
                      </div>
                      {interaction.recommendation && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: sty.color }}>
                          💡 {interaction.recommendation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}