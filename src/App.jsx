import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useRealtime } from './lib/useRealtime';
import { TRIP } from './data/trip';
import LoginScreen from './components/LoginScreen';
import DaySelector from './components/DaySelector';
import DayCard from './components/DayCard';
import PlanTab from './components/PlanTab';
import PlacesTab from './components/PlacesTab';
import PhotosTab from './components/PhotosTab';
import ChatTab from './components/ChatTab';
import MapTab from './components/MapTab';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [tab, setTab] = useState('plan');
  const [totalPhotos, setTotalPhotos] = useState(0);

  const day = TRIP.days[activeDay];
  const userEmail = session?.user?.email;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchTotalPhotos();
    }
  }, [session]);

  // Keep the header photo count live as photos are added/removed anywhere
  useRealtime(
    'header-photo-count',
    session ? { table: 'trip_photos' } : {},
    {
      onInsert: () => fetchTotalPhotos(),
      onDelete: () => fetchTotalPhotos(),
    }
  );

  async function fetchTotalPhotos() {
    const { count } = await supabase
      .from('trip_photos')
      .select('*', { count: 'exact', head: true });
    setTotalPhotos(count || 0);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0a1628 0%, #0d2444 40%, #0a1628 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8bacc8',
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a1628 0%, #0d2444 40%, #0a1628 100%)',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: '#e8dcc8',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative backgrounds */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: '180px',
        background: 'linear-gradient(180deg, transparent, rgba(0,80,160,0.15))',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', top: 0, right: '-100px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(255,180,50,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        padding: '2rem 1.5rem 1rem',
        borderBottom: '1px solid rgba(255,200,80,0.2)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.25em', color: '#c8a84b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                ⚓ Voyage Journal
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 400, color: '#f5e6c8', letterSpacing: '0.02em' }}>
                {TRIP.title}
              </h1>
              <div style={{ fontSize: '0.85rem', color: '#8bacc8', marginTop: '0.3rem', letterSpacing: '0.1em' }}>
                {TRIP.subtitle} &nbsp;·&nbsp; {TRIP.dates}
              </div>
              {totalPhotos > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#6a8898', marginTop: '0.4rem' }}>
                  {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''} logged
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#6a8898', marginBottom: '0.3rem' }}>
                {userEmail}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,200,80,0.2)',
                  borderRadius: '6px',
                  padding: '0.3rem 0.7rem',
                  color: '#8bacc8',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.2rem 1rem 4rem', position: 'relative', zIndex: 1 }}>
        {/* Day selector */}
        <DaySelector activeDay={activeDay} setActiveDay={setActiveDay} />

        {/* Active day card */}
        <DayCard day={day} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '1.2rem', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px' }}>
          {[['plan', '🗺️ Plan'], ['map', '🧭 Map'], ['places', '📍 Places'], ['photos', '📷 Photos'], ['chat', '💬 Chat']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: '0.6rem', border: 'none', borderRadius: '8px',
              background: tab === key ? 'rgba(200,168,75,0.2)' : 'transparent',
              color: tab === key ? '#c8a84b' : '#8bacc8',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
              letterSpacing: '0.05em', transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'plan' && <PlanTab day={day} />}
        {tab === 'map' && <MapTab day={day} />}
        {tab === 'places' && <PlacesTab day={day} userEmail={userEmail} />}
        {tab === 'photos' && <PhotosTab day={day} userEmail={userEmail} />}
        {tab === 'chat' && <ChatTab userEmail={userEmail} />}
      </main>
    </div>
  );
}
