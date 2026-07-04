import { useAI } from '../context/AIContext';
import { MdAutoAwesome } from 'react-icons/md';

const PROVIDER_COLORS = {
  gemini: { color: '#4285F4', bg: '#e8f0fe', label: 'Google' },
  groq:   { color: '#f55036', bg: '#fce8e6', label: 'Groq'   },
};

export default function AIModelSelector({ compact = false }) {
  const { selectedModel, changeModel, models } = useAI();

  const grouped = Object.entries(models).reduce((acc, [key, m]) => {
    const provider = key.startsWith('gemini') ? 'gemini' : 'groq';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push({ key, ...m });
    return acc;
  }, {});

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MdAutoAwesome size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <select
          className="form-control"
          style={{ fontSize: 12, padding: '5px 10px', width: 'auto', minWidth: 180 }}
          value={selectedModel}
          onChange={e => changeModel(e.target.value)}
        >
          {Object.entries(grouped).map(([provider, mods]) => (
            <optgroup key={provider} label={PROVIDER_COLORS[provider]?.label || provider}>
              {mods.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    );
  }

  // Full version — used in Settings and AI page header
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {Object.entries(grouped).map(([provider, mods]) => {
        const pc = PROVIDER_COLORS[provider] || {};
        return mods.map(m => (
          <button
            key={m.key}
            onClick={() => changeModel(m.key)}
            style={{
              padding:      '7px 14px',
              borderRadius: 10,
              border:       `2px solid ${selectedModel === m.key ? pc.color : 'var(--border)'}`,
              background:   selectedModel === m.key ? pc.bg  : 'var(--card-bg)',
              color:        selectedModel === m.key ? pc.color: 'var(--text-secondary)',
              fontSize:     13,
              fontWeight:   selectedModel === m.key ? 700 : 500,
              cursor:       'pointer',
              transition:   'var(--transition)',
              fontFamily:   'var(--font-main)',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
            }}
          >
            <span style={{ fontSize: 15 }}>{provider === 'gemini' ? '✦' : '⚡'}</span>
            {m.label}
          </button>
        ));
      })}
    </div>
  );
}