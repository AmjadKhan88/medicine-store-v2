import { useState, useEffect } from 'react';
import { MdSwapHoriz, MdInfoOutline, MdAdd } from 'react-icons/md';
import API from '../utils/api';

const PKR = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;

/**
 * Shows substitute medicines for a given medicine ID.
 * Used when a medicine is out of stock / expired / low stock.
 *
 * Props:
 *  - medicineId: string (required)
 *  - onSelectSubstitute: (medicine) => void  (optional — for "use this instead" actions)
 *  - compact: boolean (smaller inline version)
 */
export default function SubstitutesPanel({ medicineId, onSelectSubstitute, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!medicineId) return;
    setLoading(true);
    API.get(`/medicines/${medicineId}/substitutes`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [medicineId]);

  if (loading) {
    return (
      <div style={{ padding: compact ? 8 : 16, color: 'var(--text-muted)', fontSize: 13 }}>
        Checking for alternatives...
      </div>
    );
  }

  if (!data || !data.hasAlternatives) {
    return (
      <div style={{
        padding: compact ? 10 : 16,
        background: 'var(--warning-bg)',
        border: '1px solid var(--warning)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--warning)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 4 }}>
          <MdInfoOutline size={16} /> No alternatives available in stock
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>
          Link substitute medicines from the <strong>Medicines</strong> page (🔄 icon) so doctors see alternatives here next time.
        </div>
      </div>
    );
  }

  const groups = [
    { items: data.manual, label: 'Recommended Substitute', badge: 'badge-accent' },
    { items: data.sameGeneric, label: 'Same Active Ingredient', badge: 'badge-success' },
    { items: data.sameCategory, label: 'Similar Category', badge: 'badge-info' },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{
      background: 'var(--accent-light)',
      border: '1px solid var(--accent)',
      borderRadius: 10,
      padding: compact ? 10 : 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontWeight: 700, fontSize: compact ? 12 : 13,
        color: 'var(--accent)', marginBottom: 10,
      }}>
        <MdSwapHoriz size={16} /> Available Alternatives
      </div>

      {groups.map((group, gi) => (
        <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? 10 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {group.label}
          </div>
          {group.items.map(m => (
            <div key={m._id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--card-bg)', borderRadius: 8,
              padding: '8px 10px', marginBottom: 5,
              border: '1px solid var(--border-light)',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {m.genericName && `${m.genericName} · `}
                  Stock: {m.stock} {m.unit} · {PKR(m.salePrice)}
                </div>
              </div>
              {onSelectSubstitute && (
                <button
                  onClick={() => onSelectSubstitute(m)}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <MdAdd size={14} /> Use This
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}