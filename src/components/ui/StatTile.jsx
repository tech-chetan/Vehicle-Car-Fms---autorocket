// components/ui/StatTile.jsx
// Compact KPI card matching the stat cards used on Challan / Fastag pages

const StatTile = ({ label, value, sub, icon: Icon, color = '#059669', bg = '#ecfdf5' }) => (
  <div className="print-break" style={{
    background: '#ffffff', padding: '16px 20px', borderRadius: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0',
    borderLeftWidth: 4, borderLeftColor: color,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      {Icon && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          <Icon size={18} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 6, fontWeight: 600 }}>{sub}</div>}
  </div>
);

export default StatTile;
