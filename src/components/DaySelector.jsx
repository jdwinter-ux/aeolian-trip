import { TRIP } from '../data/trip';

export default function DaySelector({ activeDay, setActiveDay }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', minWidth: 'max-content' }}>
        {TRIP.days.map((d, i) => (
          <button key={i} onClick={() => setActiveDay(i)} style={{
            padding: '0.5rem 0.75rem',
            background: activeDay === i
              ? 'linear-gradient(135deg, #c8a84b, #e8c87a)'
              : 'rgba(255,255,255,0.05)',
            border: activeDay === i ? 'none' : '1px solid rgba(255,200,80,0.2)',
            borderRadius: '8px',
            color: activeDay === i ? '#0a1628' : '#a8c0d8',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '0.7rem', fontWeight: activeDay === i ? 700 : 400,
            whiteSpace: 'nowrap', transition: 'all 0.2s',
            letterSpacing: '0.05em', textAlign: 'center',
            minWidth: '80px',
          }}>
            <div style={{ fontSize: '0.6rem', opacity: 0.7, letterSpacing: '0.1em' }}>{d.weekday}</div>
            <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{d.date}</div>
            <div style={{ fontSize: '0.6rem', opacity: 0.8, marginTop: '0.1rem' }}>{d.title.length > 12 ? d.title.slice(0, 12) + '…' : d.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
