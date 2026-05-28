export default function PlanTab({ day }) {
  if (!day || !day.timeline) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898' }}>
        No plan available for this day.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#8bacc8', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>
        ⏱ THE DAY AT A GLANCE
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
        {day.timeline.map(([time, what], i) => (
          <div key={i} style={{
            display: 'flex', gap: '0.8rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,200,80,0.1)',
            borderRadius: '8px',
            padding: '0.6rem 0.9rem',
          }}>
            <div style={{
              color: '#c8a84b', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.08em', minWidth: '90px', flexShrink: 0,
              paddingTop: '0.1rem',
            }}>
              {time.toUpperCase()}
            </div>
            <div style={{ color: '#d8c8a8', fontSize: '0.85rem', lineHeight: 1.5 }}>{what}</div>
          </div>
        ))}
      </div>

      {(day.activities.hiker || day.activities.biker) && (
        <>
          <div style={{ fontSize: '0.75rem', color: '#8bacc8', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>
            🥾 MORNING SPLIT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {day.activities.hiker && (
              <div style={{
                background: 'rgba(80,160,100,0.08)',
                border: '1px solid rgba(80,160,100,0.2)',
                borderRadius: '10px', padding: '0.8rem 1rem',
              }}>
                <div style={{ fontSize: '0.7rem', color: '#7fb38a', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
                  🥾 HIKERS
                </div>
                <div style={{ color: '#d8c8a8', fontSize: '0.85rem', lineHeight: 1.5 }}>{day.activities.hiker}</div>
              </div>
            )}
            {day.activities.biker && (
              <div style={{
                background: 'rgba(80,140,200,0.08)',
                border: '1px solid rgba(80,140,200,0.2)',
                borderRadius: '10px', padding: '0.8rem 1rem',
              }}>
                <div style={{ fontSize: '0.7rem', color: '#7fa3d8', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
                  🚴 BIKERS
                </div>
                <div style={{ color: '#d8c8a8', fontSize: '0.85rem', lineHeight: 1.5 }}>{day.activities.biker}</div>
              </div>
            )}
          </div>
        </>
      )}

      {day.activities.rendezvous && (
        <div style={{
          background: 'rgba(200,168,75,0.06)',
          border: '1px solid rgba(200,168,75,0.2)',
          borderRadius: '10px', padding: '0.8rem 1rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.7rem', color: '#c8a84b', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.3rem' }}>
            📍 RENDEZVOUS
          </div>
          <div style={{ color: '#d8c8a8', fontSize: '0.85rem', lineHeight: 1.5 }}>{day.activities.rendezvous}</div>
        </div>
      )}

      <div style={{ fontSize: '0.75rem', color: '#8bacc8', marginBottom: '0.8rem', letterSpacing: '0.08em' }}>
        🍽 MEALS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,200,80,0.1)',
          borderRadius: '8px', padding: '0.6rem 0.9rem',
          display: 'flex', gap: '0.8rem',
        }}>
          <div style={{ color: '#c8a84b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', minWidth: '60px', paddingTop: '0.1rem' }}>LUNCH</div>
          <div style={{ color: '#d8c8a8', fontSize: '0.85rem' }}>{day.meals.lunch}</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,200,80,0.1)',
          borderRadius: '8px', padding: '0.6rem 0.9rem',
          display: 'flex', gap: '0.8rem',
        }}>
          <div style={{ color: '#c8a84b', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', minWidth: '60px', paddingTop: '0.1rem' }}>DINNER</div>
          <div style={{ color: '#d8c8a8', fontSize: '0.85rem' }}>{day.meals.dinner}</div>
        </div>
      </div>
    </div>
  );
}
