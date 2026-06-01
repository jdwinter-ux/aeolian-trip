import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { identifyPhoto } from '../lib/identify';
import { CATEGORY_ICONS } from '../data/trip';

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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const dayNumber = day?.n;

  useEffect(() => {
    if (dayNumber) {
      fetchPhotos();
    }
  }, [dayNumber]);

  // Live updates: photos added/identified/removed by other travelers on this day
  useRealtime(
    `photos-day-${dayNumber}`,
    dayNumber ? { table: 'trip_photos', filter: `day_number=eq.${dayNumber}` } : {},
    {
      onInsert: (row) =>
        setPhotos(prev => (prev.some(p => p.id === row.id) ? prev : [row, ...prev])),
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
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898' }}>
        No day selected.
      </div>
    );
  }

  async function fetchPhotos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trip_photos')
      .select('*')
      .eq('day_number', day.n)
      .order('created_at', { ascending: false });

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

  return (
    <div>
      <div style={{
        border: '2px dashed rgba(200,168,75,0.3)',
        borderRadius: '12px', padding: '2rem', textAlign: 'center',
        background: 'rgba(200,168,75,0.03)', marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
        <div style={{ color: '#c8a84b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.3rem' }}>
          {uploading ? '🔍 Processing photos...' : 'Add Photos'}
        </div>
        <div style={{ color: '#6a8898', fontSize: '0.75rem', marginBottom: '1rem' }}>
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
            color: '#c8a84b', fontFamily: 'inherit', fontSize: '0.85rem',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.5 : 1,
          }}
        />
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(220,80,60,0.12)',
          border: '1px solid rgba(220,80,60,0.3)',
          borderRadius: '10px', padding: '0.8rem 1rem',
          color: '#f0a090', fontSize: '0.8rem',
          marginBottom: '1rem', lineHeight: 1.5,
        }}>⚠️ {errorMsg}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6a8898', fontSize: '0.9rem' }}>
          Loading photos...
        </div>
      ) : photos.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {photos.map(photo => (
            <div key={photo.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,200,80,0.1)',
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
              <div style={{ padding: '1rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.3rem'
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#6a8898' }}>
                    {truncateEmail(photo.author_email)}
                  </div>
                  {photo.author_email === userEmail && !photo._loading && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePhoto(photo); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6a8898',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: '0.1rem 0.3rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.95rem', color: '#f5e6c8', fontWeight: 600 }}>
                    {photo._loading ? <span style={{ opacity: 0.6 }}>✨ Identifying...</span> : photo.title}
                  </div>
                  <div style={{ fontSize: '1.2rem' }}>{photo._loading ? '⏳' : (CATEGORY_ICONS[photo.category] || '📸')}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#c8a84b', marginBottom: '0.5rem' }}>
                  📍 {photo.location}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8bacc8', lineHeight: 1.5 }}>
                  {photo.description}
                </div>
                {photo.tags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.7rem' }}>
                    {photo.tags.map(tag => (
                      <span key={tag} style={{
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(200,168,75,0.1)',
                        border: '1px solid rgba(200,168,75,0.2)',
                        borderRadius: '20px', fontSize: '0.65rem',
                        color: '#a89860', letterSpacing: '0.05em',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#4a6888', fontSize: '0.9rem' }}>
          No photos for {day.date} yet.<br />
          <span style={{ fontSize: '0.8rem' }}>Upload above to auto-identify.</span>
        </div>
      )}
    </div>
  );
}
