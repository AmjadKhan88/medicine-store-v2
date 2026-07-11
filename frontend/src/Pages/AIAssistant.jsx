import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  MdSend, MdAutoAwesome, MdPerson, MdRefresh,
  MdInventory
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAI } from '../context/AIContext';
import AIModelSelector from '../Components/AIModelSelector';
import {useWindowWidth} from "../hooks/useWindowWidth.js"

const QUICK_QUESTIONS = [
  'What are the side effects of Augmentin 625mg?',
  'What medicines interact with Metformin?',
  'What is the difference between Paracetamol and Ibuprofen?',
  'What are common antibiotics for respiratory infections?',
  'Can Aspirin and Warfarin be taken together?',
  'What medicines should not be taken on empty stomach?',
  'What are symptoms of Paracetamol overdose?',
  'What is the pediatric dose for Amoxicillin?',
];


/* ── Reorder Suggestions Panel ── */
function ReorderPanel({ onClose }) {
  const { selectedModel }   = useAI();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/ai/reorder-suggestions?modelKey=${selectedModel}`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load suggestions'))
      .finally(() => setLoading(false));
  }, [selectedModel]);

  const PRIORITY_STYLE = {
    high:   { color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: 'High'   },
    medium: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: 'Medium' },
    low:    { color: 'var(--success)', bg: 'var(--success-bg)', label: 'Low'    },
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdInventory style={{ color: 'var(--accent)' }} />
          <div className="card-title">Smart Reorder Suggestions</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><MdRefresh size={16} /></button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
          <MdAutoAwesome className="spin" size={28} style={{ display: 'block', margin: '0 auto 8px' }} />
          Analyzing sales patterns...
        </div>
      ) : data?.suggestions ? (
        <>
          {/* Summary */}
          {data.suggestions.summary && (
            <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--accent)' }}>
              {data.suggestions.summary}
            </div>
          )}

          {/* Urgent reorders */}
          {data.suggestions.urgent?.length > 0 ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                RECOMMENDED REORDERS ({data.suggestions.urgent.length})
              </div>
              {data.suggestions.urgent.map((item, i) => {
                const ps = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.medium;
                return (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.medicineName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.reason}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ background: ps.bg, color: ps.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, display: 'block', marginBottom: 4 }}>
                          {ps.label} Priority
                        </span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order: {item.suggestedQty} units</div>
                        {item.estimatedCost && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.estimatedCost}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {data.suggestions.totalEstimatedReorderCost && (
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Estimated total: {data.suggestions.totalEstimatedReorderCost}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--success)', padding: '20px 0', fontWeight: 600 }}>
              ✅ No urgent reorders needed at this time
            </div>
          )}

          {/* Insights */}
          {data.suggestions.insights?.length > 0 && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                💡 INSIGHTS
              </div>
              {data.suggestions.insights.map((ins, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span> {ins}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
          Could not generate suggestions. Make sure you have sales history.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN AI ASSISTANT PAGE
═══════════════════════════════════════════ */
export default function AIAssistant() {
  const { selectedModel, models } = useAI();
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);
  const width = useWindowWidth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    inputRef.current?.focus();

    const userMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await API.post('/ai/ask', {
        message:   msg,
        history:   messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        modelKey:  selectedModel,
      });

      setMessages(prev => [...prev, {
        role:    'assistant',
        content: data.response,
        model:   data.model,
        time:    new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: `Sorry, I encountered an error: ${err.response?.data?.message || err.message}. Please check your API key configuration.`,
        error:   true,
        time:    new Date(),
      }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const modelLabel = models[selectedModel]?.label || selectedModel;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding:   width < 460 ? '8px 5px'   :  '16px 24px',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--bg-secondary)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexShrink:     0,
        gap:     width < 460 ? 8 : 16,
        flexWrap:       'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: width < 460 ? 10 : 18}}>
            <MdAutoAwesome size={22} style={{ color: 'var(--accent)' }} />
            AI Medicine Assistant
          </div>
          <div style={{ fontSize: width < 460 ? 8 : 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Ask about medicines, side effects, interactions and more
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{fontSize: width < 460 ? 8 : 12}}
            onClick={() => setShowReorder(p => !p)}
          >
            <MdInventory size={width < 460 ? 10 : 15} />
            {showReorder ? 'Hide' : 'Smart'} Reorder
          </button>
          <AIModelSelector compact />
        </div>
      </div>

      {/* ── Reorder panel ── */}
      {showReorder && (
        <div style={{ padding: '16px 24px 0', flexShrink: 0, maxHeight: 400, overflowY: 'auto' }}>
          <ReorderPanel onClose={() => setShowReorder(false)} />
        </div>
      )}

      {/* ── Chat area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* Welcome */}
        {messages.length === 0 && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom:width < 460 ? 15 : 32 }}>
              <div style={{
                width: width < 460 ? 50 : 72, height: width < 460 ? 50 : 72, borderRadius: '50%',
                background: 'var(--accent-light)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: width < 460 ? 20 : 32, margin: '0 auto 16px',
              }}>
                💊
              </div>
              <div style={{ fontWeight: width < 460 ? 600 : 800, fontSize: width < 460 ? 13 : 20, marginBottom: 6 }}>How can I help you today?</div>
              <div style={{ color: 'var(--text-muted)', fontSize: width < 460 ? 9 : 14 }}>
                Using <strong>{modelLabel}</strong> — ask about medicines, side effects, interactions or dosages
              </div>
            </div>

            {/* Quick question chips */}
            <div style={{ marginBottom: width < 460 ? 12 : 24 }}>
              <div style={{ fontSize: width < 460 ? 8 : 12, fontWeight:width < 460 ? 500 : 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Quick Questions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => send(q)}
                    style={{
                      padding:      '7px 14px',
                      borderRadius: 99,
                      border:       '1.5px solid var(--border)',
                      background:   'var(--card-bg)',
                      color:        'var(--text-secondary)',
                      fontSize: width < 460 ? 9 :    13,
                      cursor:       'pointer',
                      transition:   'var(--transition)',
                      fontFamily:   'var(--font-main)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: '💊', title: 'Medicine Info',    desc: 'Side effects, dosages, uses' },
                { icon: '⚠️', title: 'Drug Interactions', desc: 'Check if medicines are safe together' },
                { icon: '📦', title: 'Inventory Insights', desc: 'Reorder suggestions based on sales' },
                { icon: '🔍', title: 'Generic Alternatives', desc: 'Find cheaper or available substitutes' },
              ].map((f, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize:width < 460 ? 18 : 22, marginBottom: 6 }}>{f.icon}</div>
                  <div style={{ fontWeight:width < 460 ? 500 : 700, fontSize: width < 460 ? 10 : 14, marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: width < 460 ? 9 : 12, color: 'var(--text-muted)' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display:       'flex',
              gap:           12,
              marginBottom:  20,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              {/* Avatar */}
              <div style={{
                width:          36, height: 36,
                borderRadius:   '50%',
                background:     msg.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
                display:        'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink:     0, fontSize: 16,
                border:         '1px solid var(--border)',
              }}>
                {msg.role === 'user' ? <MdPerson style={{ color: '#fff' }} /> : '💊'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth:     '78%',
                padding:      '12px 16px',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background:   msg.role === 'user' ? 'var(--accent)' : 'var(--card-bg)',
                color:        msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                border:       msg.role === 'user' ? 'none' : '1px solid var(--border)',
                fontSize:     14,
                lineHeight:   1.6,
                boxShadow:    'var(--shadow-sm)',
              }}>
                {/* {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content} */}
                {msg.role === 'assistant' ? <div className="ai-content"><Markdown>{msg.content}</Markdown></div>: msg.content}

                {/* Meta */}
                <div style={{
                  marginTop:  8,
                  fontSize:   11,
                  color:      msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                  display:    'flex',
                  alignItems: 'center',
                  gap:        6,
                  flexWrap:   'wrap',
                }}>
                  {msg.time?.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  {msg.model && (
                    <span style={{
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      padding: '1px 6px', borderRadius: 99, fontWeight: 600,
                    }}>
                      {msg.model}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>💊</div>
              <div style={{
                padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--text-muted)',
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding:  width < 460 ? '8px 10px'  :  '16px 24px',
        borderTop:    '1px solid var(--border)',
        background:   'var(--bg-secondary)',
        flexShrink:   0,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: width < 460 ? 8 : 12, color: 'var(--text-muted)', marginBottom: 8,
                fontFamily: 'var(--font-main)', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <MdRefresh size={width < 460 ? 10 : 13} /> Clear conversation
            </button>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              rows={width < 460 ? 1 : 2}
              className="form-control"
              placeholder={`Ask about medicines... (using ${modelLabel})`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              style={{ resize: 'none', lineHeight: width < 460 ? 1.3 : 1.5, flex: 1, minHeight: width < 460 ? 70 : 90, fontSize: width < 460 ? 10 : 14 }}
            />
            <button
              className="btn btn-primary btn-icon"
              style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0 }}
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              {loading ? <span className="spin" style={{ display: 'inline-block', fontSize: width < 460 ? 10 : 12 }}>⏳</span> : <MdSend size={width < 460 ? 13 : 18} />}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            AI responses are for reference only. Always verify with professional judgment.
          </div>
        </div>
      </div>

      {/* Typing animation */}
      <style>{`@keyframes pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}