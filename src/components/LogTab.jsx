import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function truncateEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 6)}...@${domain}`;
}

export default function LogTab({ day, userEmail }) {
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [day.n]);

  async function fetchNotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trip_notes')
      .select('*')
      .eq('day_number', day.n)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898', fontSize: '0.9rem' }}>
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
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#4a6888', fontSize: '0.9rem' }}>
          📓 No notes yet for {day.date}.<br />
          <span style={{ fontSize: '0.8rem' }}>Start writing above.</span>
        </div>
      )}
    </div>
  );
}
