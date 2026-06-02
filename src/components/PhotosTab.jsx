import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { identifyPhoto } from '../lib/identify';
import { CATEGORY_ICONS } from '../data/trip';
import { THEME } from '../config/theme';

function truncateEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 6)}...@${domain}`;
}

export default function PhotosTab({ day, userEmail }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const dayNumber = day?.n;

  useEffect(() => {
    if (!dayNumber) return;
    const req = { active: true };
    fetchPhotos(req);
    // Ignore an in-flight fetch's result if the day changes before it resolves
    return () => { req.active = false; };
  }, [dayNumber]);

  // Live updates: photos added/identified/removed by other travelers on this day
  useRealtime(
    `photos-day-${dayNumber}`,
    dayNumber ? { table: 'trip_photos', filter: `day_number=eq.${dayNumber}` } : {},
    {
      onInsert: (row) =>
        setPhotos(prev => (
          prev.some(p => p.id === row.id)
            ? prev
            // Show a spinner for photos still awaiting AI identification
            : [{ ...row, _loading: !row.identified_at }, ...prev]
        )),
      onUpdate: (row) =>
        setPhotos(prev => prev.map(p =>
          p.id === row.id ? { ...p, ...row, _loading: false, _failed: false } : p
        )),
      onDelete: (oldRow) =>
        setPhotos(prev => prev.filter(p => p.id !== oldRow.id)),
    }
  );

  if (!day || !dayNumber) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: THEME.blueMuted }}>
        No day selected.
      </div>
    );
  }

  async function fetchPhotos(req = { active: true }) {
    setLoading(true);
    const { data, error } = await supabase
      .from('trip_photos')
      .select('*')
      .eq('day_number', day.n)
      .order('created_at', { ascending: false });

    if (!req.active) return; // a newer day was selected; drop this stale result

    if (!error && data) {
      // Mark photos as needing retry if they haven't been identified
      // and were created more than 2 minutes ago
      const now = new Date();
      const photosWithState = data.map(photo => {
        const createdAt = new Date(photo.created_at);
        const ageMinutes = (now - createdAt) / 1000 / 60;
        const needsRetry = !photo.identified_at && ageMinutes > 2;
        return {
          ...photo,
          _failed: needsRetry,
          title: needsRetry ? (photo.title === 'Identifying...' ? 'Photo' : photo.title) : photo.title,
          description: needsRetry ? 'Identification failed — tap to retry.' : photo.description,
        };
      });
      setPhotos(photosWithState);
    }
    setLoading(false);
  }

  function getPhotoUrl(storagePath) {
    return `${supabaseUrl}/storage/v1/object/public/photos/${storagePath}`;
  }

  const handlePhotos = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setErrorMsg('');
    setUploading(true);

    const dayContext = `Day ${day.n} (${day.weekday} ${day.date}) — ${day.title} · ${day.route}`;
    let failures = 0;

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${day.n}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        failures++;
        continue;
      }

      // Create photo record with placeholder data
      const { data: photoRecord, error: insertError } = await supabase
        .from('trip_photos')
        .insert({
          day_number: day.n,
          author_email: userEmail,
          storage_path: fileName,
          title: 'Identifying...',
          location: 'Analyzing photo',
          description: '',
          tags: [],
          category: 'landmark',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        failures++;
        continue;
      }

      // Add to local state immediately (optimistic UI)
      setPhotos(prev => [{ ...photoRecord, _loading: true }, ...prev]);

      // Call identify API
      try {
        const result = await identifyPhoto(photoRecord.id, fileName, dayContext);

        // Update local state with AI results
        setPhotos(prev => prev.map(p =>
          p.id === photoRecord.id
            ? { ...p, ...result, _loading: false }
            : p
        ));
      } catch (err) {
        console.error('Identify error:', err);
        failures++;

        // Update local state to show failure
        setPhotos(prev => prev.map(p =>
          p.id === photoRecord.id
            ? {
                ...p,
                title: file.name.split('.')[0] || 'Photo',
                location: '—',
                description: 'Identification failed — tap to retry.',
                _loading: false,
                _failed: true,
              }
            : p
        ));
      }
    }

    if (failures > 0) {
      setErrorMsg(`${failures} photo${failures > 1 ? 's' : ''} couldn't be fully processed. They're saved — you can try again later.`);
    }
    setUploading(false);
  }, [day, userEmail]);

  async function retryIdentify(photo) {
    const dayContext = `Day ${day.n} (${day.weekday} ${day.date}) — ${day.title} · ${day.route}`;

    setPhotos(prev => prev.map(p =>
      p.id === photo.id ? { ...p, _loading: true, _failed: false } : p
    ));

    try {
      const result = await identifyPhoto(photo.id, photo.storage_path, dayContext);
      setPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, ...result, _loading: false } : p
      ));
    } catch (err) {
      console.error('Retry identify error:', err);
      setPhotos(prev => prev.map(p =>
        p.id === photo.id
          ? { ...p, _loading: false, _failed: true, description: 'Identification failed — tap to retry.' }
          : p
      ));
    }
  }

  async function deletePhoto(photo) {
    // Delete from storage
    await supabase.storage.from('photos').remove([photo.storage_path]);

    // Delete from database
    const { error } = await supabase
      .from('trip_photos')
      .delete()
      .eq('id', photo.id);

    if (!error) {
      setPhotos(photos.filter(p => p.id !== photo.id));
    }
  }

  function startEdit(photo) {
    setEditingId(photo.id);
    setDraft({
      title: photo.title || '',
      location: photo.location || '',
      description: photo.description || '',
      category: photo.category || 'landmark',
      tags: (photo.tags || []).join(', '),
      people: (photo.people || []).join(', '),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  // Split a comma-separated input into a clean array
  function splitList(s) {
    return (s || '').split(',').map(x => x.trim()).filter(Boolean);
  }

  async function saveEdit(photo) {
    if (!draft) return;
    setSavingEdit(true);
    const updates = {
      title: draft.title.trim() || 'Untitled',
      location: draft.location.trim(),
      description: draft.description.trim(),
      category: draft.category,
      tags: splitList(draft.tags),
      people: splitList(draft.people),
      verified: true, // human-confirmed; feeds future identifications
    };
    const { error } = await supabase
      .from('trip_photos')
      .update(updates)
      .eq('id', photo.id);

    if (!error) {
      setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, ...updates } : p)));
      cancelEdit();
    }
    setSavingEdit(false);
  }

  const editInputStyle = {
    width: '100%', boxSizing: 'border-box', marginBottom: '0.4rem',
    background: THEME.rgba(THEME.base.white, 0.05),
    border: `1px solid ${THEME.rgba(THEME.base.gold, 0.2)}`,
    borderRadius: '6px', padding: '0.4rem 0.6rem',
    color: THEME.parchment, fontFamily: 'inherit', fontSize: '0.8rem', outline: 'none',
  };

  return (
    <div>
      <div style={{
        border: `2px dashed ${THEME.rgba(THEME.base.goldDeep, 0.3)}`,
        borderRadius: '12px', padding: '2rem', textAlign: 'center',
        background: THEME.rgba(THEME.base.goldDeep, 0.03), marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
        <div style={{ color: THEME.gold, fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.3rem' }}>
          {uploading ? '🔍 Processing photos...' : 'Add Photos'}
        </div>
        <div style={{ color: THEME.blueMuted, fontSize: '0.75rem', marginBottom: '1rem' }}>
          Claude will identify landmarks, food, and places
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={e => {
            const files = [...e.target.files];
            if (files.length > 0) handlePhotos(files);
            e.target.value = '';
          }}
          style={{
            display: 'block', margin: '0 auto',
            color: THEME.gold, fontFamily: 'inherit', fontSize: '0.85rem',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.5 : 1,
          }}
        />
      </div>

      {errorMsg && (
        <div style={{
          background: THEME.rgba(THEME.base.red, 0.12),
          border: `1px solid ${THEME.rgba(THEME.base.red, 0.3)}`,
          borderRadius: '10px', padding: '0.8rem 1rem',
          color: THEME.error, fontSize: '0.8rem',
          marginBottom: '1rem', lineHeight: 1.5,
        }}>⚠️ {errorMsg}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: THEME.blueMuted, fontSize: '0.9rem' }}>
          Loading photos...
        </div>
      ) : photos.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {photos.map(photo => (
            <div key={photo.id} style={{
              background: THEME.rgba(THEME.base.white, 0.04),
              border: `1px solid ${THEME.rgba(THEME.base.gold, 0.1)}`,
              borderRadius: '12px', overflow: 'hidden',
              cursor: photo._failed ? 'pointer' : 'default',
            }}
            onClick={() => photo._failed && retryIdentify(photo)}
            >
              <img
                src={getPhotoUrl(photo.storage_path)}
                alt={photo.title}
                style={{
                  width: '100%', height: '180px', objectFit: 'cover', display: 'block',
                }}
              />
              <div style={{ padding: '1rem' }} onClick={editingId === photo.id ? (e) => e.stopPropagation() : undefined}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.3rem'
                }}>
                  <div style={{ fontSize: '0.65rem', color: THEME.blueMuted }}>
                    {truncateEmail(photo.author_email)}
                  </div>
                  {!photo._loading && editingId !== photo.id && (
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(photo); }}
                        title="Edit / correct"
                        style={{
                          background: 'none', border: 'none', color: THEME.blueMuted,
                          cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.3rem',
                        }}
                      >
                        ✎
                      </button>
                      {photo.author_email === userEmail && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePhoto(photo); }}
                          style={{
                            background: 'none', border: 'none', color: THEME.blueMuted,
                            cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.3rem',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {editingId === photo.id ? (
                  <div>
                    <input style={editInputStyle} value={draft.title}
                      onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
                    <input style={editInputStyle} value={draft.location}
                      onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="Location" />
                    <textarea style={{ ...editInputStyle, resize: 'vertical', lineHeight: 1.4 }} rows={3} value={draft.description}
                      onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
                    <select style={editInputStyle} value={draft.category}
                      onChange={e => setDraft({ ...draft, category: e.target.value })}>
                      {Object.keys(CATEGORY_ICONS).map(c => (
                        <option key={c} value={c}>{(CATEGORY_ICONS[c] || '')} {c}</option>
                      ))}
                    </select>
                    <input style={editInputStyle} value={draft.people}
                      onChange={e => setDraft({ ...draft, people: e.target.value })} placeholder="People (comma-separated)" />
                    <input style={editInputStyle} value={draft.tags}
                      onChange={e => setDraft({ ...draft, tags: e.target.value })} placeholder="Tags (comma-separated)" />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                      <button onClick={() => saveEdit(photo)} disabled={savingEdit} style={{
                        padding: '0.4rem 1rem', border: 'none', borderRadius: '6px',
                        background: savingEdit ? THEME.rgba(THEME.base.gold, 0.3) : `linear-gradient(135deg, ${THEME.gold}, ${THEME.goldLight})`,
                        color: THEME.bgDeep, fontWeight: 700, fontFamily: 'inherit', fontSize: '0.75rem',
                        cursor: savingEdit ? 'not-allowed' : 'pointer',
                      }}>{savingEdit ? 'Saving...' : 'Save'}</button>
                      <button onClick={cancelEdit} disabled={savingEdit} style={{
                        padding: '0.4rem 1rem', borderRadius: '6px',
                        background: 'none', border: `1px solid ${THEME.rgba(THEME.base.gold, 0.2)}`,
                        color: THEME.blue, fontFamily: 'inherit', fontSize: '0.75rem', cursor: 'pointer',
                      }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div style={{ fontSize: '0.95rem', color: THEME.cream, fontWeight: 600 }}>
                        {photo._loading ? <span style={{ opacity: 0.6 }}>✨ Identifying...</span> : photo.title}
                      </div>
                      <div style={{ fontSize: '1.2rem' }}>{photo._loading ? '⏳' : (CATEGORY_ICONS[photo.category] || '📸')}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: THEME.gold, marginBottom: '0.5rem' }}>
                      📍 {photo.location}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: THEME.blue, lineHeight: 1.5 }}>
                      {photo.description}
                    </div>
                    {photo.people?.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: THEME.sand, marginTop: '0.5rem' }}>
                        👤 {photo.people.join(', ')}
                      </div>
                    )}
                    {photo.tags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.7rem' }}>
                        {photo.tags.map(tag => (
                          <span key={tag} style={{
                            padding: '0.2rem 0.5rem',
                            background: THEME.rgba(THEME.base.goldDeep, 0.1),
                            border: `1px solid ${THEME.rgba(THEME.base.goldDeep, 0.2)}`,
                            borderRadius: '20px', fontSize: '0.65rem',
                            color: THEME.goldMuted, letterSpacing: '0.05em',
                          }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: THEME.blueDim, fontSize: '0.9rem' }}>
          No photos for {day.date} yet.<br />
          <span style={{ fontSize: '0.8rem' }}>Upload above to auto-identify.</span>
        </div>
      )}
    </div>
  );
}
