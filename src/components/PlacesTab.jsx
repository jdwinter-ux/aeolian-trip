import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { DAY_DETAILS } from '../data/dayDetails';

function truncateEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 6)}...@${domain}`;
}

export default function PlacesTab({ day, userEmail }) {
  const details = DAY_DETAILS[day.n];

  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [notesLoading, setNotesLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.n]);

  // Live updates: notes added/removed by other travelers on this day
  useRealtime(
    `notes-day-${day.n}`,
    { table: 'trip_notes', filter: `day_number=eq.${day.n}` },
    {
      onInsert: (row) =>
        setNotes(prev => (prev.some(n => n.id === row.id) ? prev : [...prev, row])),
      onDelete: (oldRow) =>
        setNotes(prev => prev.filter(n => n.id !== oldRow.id)),
    }
  );

  async function fetchNotes() {
    setNotesLoading(true);
    const { data, error } = await supabase
      .from('trip_notes')
      .select('*')
      .eq('day_number', day.n)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNotes(data);
    }
    setNotesLoading(false);
  }

  async function saveNote() {
    if (!noteInput.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('trip_notes')
      .insert({
        day_number: day.n,
        author_email: userEmail,
        body: noteInput.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([...notes, data]);
      setNoteInput('');
    }
    setSaving(false);
  }

  async function deleteNote(noteId) {
    const { error } = await supabase
      .from('trip_notes')
      .delete()
      .eq('id', noteId);

    if (!error) {
      setNotes(notes.filter(n => n.id !== noteId));
    }
  }

  return (
    <div>
      {details ? (
        <>
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
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898' }}>
          No information available for this day.
        </div>
      )}

      {/* Shared notes */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,200,80,0.12)' }}>
        <div style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#c8a84b',
          marginBottom: '1rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          📓 Traveler Notes
        </div>

        <div style={{ marginBottom: '1.2rem' }}>
          <textarea
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            placeholder="Add a note for this day..."
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,200,80,0.2)',
              borderRadius: '10px', padding: '0.9rem 1rem',
              color: '#e8dcc8', fontFamily: 'inherit', fontSize: '0.9rem',
              resize: 'none', outline: 'none', lineHeight: 1.6,
            }}
          />
          <button
            onClick={saveNote}
            disabled={saving || !noteInput.trim()}
            style={{
              marginTop: '0.6rem', padding: '0.6rem 1.5rem',
              background: saving ? 'rgba(200,168,75,0.3)' : 'linear-gradient(135deg, #c8a84b, #e8c87a)',
              border: 'none', borderRadius: '8px',
              color: '#0a1628', fontWeight: 700, fontFamily: 'inherit',
              fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer',
              letterSpacing: '0.05em',
              opacity: !noteInput.trim() ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>

        {notesLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#6a8898', fontSize: '0.9rem' }}>
            Loading notes...
          </div>
        ) : notes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {notes.map(note => (
              <div key={note.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,200,80,0.1)',
                borderRadius: '10px', padding: '1rem 1.2rem',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#c8a84b', letterSpacing: '0.05em' }}>
                    {truncateEmail(note.author_email)}
                  </div>
                  {note.author_email === userEmail && (
                    <button
                      onClick={() => deleteNote(note.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6a8898',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.4rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{
                  whiteSpace: 'pre-wrap', lineHeight: 1.8,
                  fontSize: '0.9rem', color: '#d8c8a8',
                }}>
                  {note.body}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: '#4a6888',
                  marginTop: '0.6rem',
                }}>
                  {new Date(note.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#4a6888', fontSize: '0.9rem' }}>
            No notes yet for {day.date}.<br />
            <span style={{ fontSize: '0.8rem' }}>Start writing above.</span>
          </div>
        )}
      </div>
    </div>
  );
}
