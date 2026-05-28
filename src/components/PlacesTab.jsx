import { DAY_DETAILS } from '../data/dayDetails';

export default function PlacesTab({ day }) {
  const details = DAY_DETAILS[day.n];

  if (!details) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898' }}>
        No information available for this day.
      </div>
    );
  }

  return (
    <div>
      {/* Hero section */}
      <div style={{
        background: 'rgba(200,168,75,0.08)',
        borderLeft: '3px solid #c8a84b',
        borderRadius: '0 12px 12px 0',
        padding: '1.2rem 1.5rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontSize: '0.9rem',
          color: '#d8c8a8',
          lineHeight: 1.7,
          fontStyle: 'italic',
        }}>
          {details.hero}
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {details.sections.map((section, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,200,80,0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* Section header */}
            <div style={{
              padding: '0.8rem 1rem',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,200,80,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{section.icon}</span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#f5e6c8',
                letterSpacing: '0.02em',
              }}>
                {section.title}
              </span>
            </div>

            {/* Section content */}
            <div style={{
              padding: '1rem 1.2rem',
              fontSize: '0.85rem',
              color: '#b8c8d8',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {section.content}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {details.tips && details.tips.length > 0 && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem 1.2rem',
          background: 'rgba(139,172,200,0.08)',
          border: '1px solid rgba(139,172,200,0.15)',
          borderRadius: '12px',
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#8bacc8',
            marginBottom: '0.6rem',
            letterSpacing: '0.05em',
          }}>
            💡 TIPS FOR TODAY
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '1.2rem',
            fontSize: '0.8rem',
            color: '#9ab8c8',
            lineHeight: 1.8,
          }}>
            {details.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
