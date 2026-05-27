export default function DayCard({ day }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,200,80,0.15)',
      borderRadius: '12px',
      padding: '1.2rem 1.4rem',
      marginBottom: '1.2rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ color: '#c8a84b', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Day {day.n} · {day.weekday}, {day.date}
          </div>
          <div style={{ fontSize: '1.4rem', color: '#f5e6c8', marginTop: '0.2rem' }}>{day.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#8bacc8', marginTop: '0.1rem' }}>📍 {day.route}</div>
        </div>
        {day.featured && (
          <div style={{
            fontSize: '0.6rem', color: '#c8a84b', letterSpacing: '0.15em',
            background: 'rgba(200,168,75,0.1)', border: '1px solid rgba(200,168,75,0.3)',
            padding: '0.3rem 0.6rem', borderRadius: '20px', fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>
            {day.featured}
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.85rem', color: '#a8c0d8', fontStyle: 'italic', lineHeight: 1.5, marginTop: '0.6rem', borderTop: '1px solid rgba(200,168,75,0.1)', paddingTop: '0.6rem' }}>
        {day.hero}
      </div>
    </div>
  );
}
