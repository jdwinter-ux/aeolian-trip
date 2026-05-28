import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Island/stop coordinates
const LOCATIONS = {
  milazzo: { lat: 38.2242, lng: 15.2405, name: 'Milazzo', type: 'port' },
  lipari: { lat: 38.4674, lng: 14.9540, name: 'Lipari', type: 'island' },
  canneto: { lat: 38.4850, lng: 14.9650, name: 'Canneto Bay', type: 'anchorage' },
  panarea: { lat: 38.6367, lng: 15.0700, name: 'Panarea', type: 'island' },
  stromboli: { lat: 38.7890, lng: 15.2130, name: 'Stromboli', type: 'island' },
  salina: { lat: 38.5600, lng: 14.8680, name: 'Salina', type: 'island' },
  filicudi: { lat: 38.5620, lng: 14.5700, name: 'Filicudi', type: 'island' },
  vulcano: { lat: 38.4040, lng: 14.9620, name: 'Vulcano', type: 'island' },
};

// Route for each day
const DAILY_ROUTES = {
  1: ['milazzo', 'lipari', 'canneto'],
  2: ['canneto', 'panarea', 'stromboli'],
  3: ['stromboli', 'salina'],
  4: ['salina'], // Stay at Salina
  5: ['salina', 'filicudi'],
  6: ['filicudi', 'lipari'],
  7: ['lipari', 'vulcano'],
  8: ['vulcano', 'lipari', 'milazzo'],
};

// Full route coordinates for the polyline
const FULL_ROUTE = [
  LOCATIONS.milazzo,
  LOCATIONS.lipari,
  LOCATIONS.canneto,
  LOCATIONS.panarea,
  LOCATIONS.stromboli,
  LOCATIONS.salina,
  LOCATIONS.filicudi,
  LOCATIONS.lipari,
  LOCATIONS.vulcano,
  LOCATIONS.lipari,
  LOCATIONS.milazzo,
];

// Custom marker icons
function createIcon(color, isActive) {
  const size = isActive ? 14 : 10;
  const border = isActive ? 3 : 2;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: ${border}px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size + border * 2, size + border * 2],
    iconAnchor: [(size + border * 2) / 2, (size + border * 2) / 2],
  });
}

// Component to fit bounds when day changes
function FitBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
    }
  }, [locations, map]);

  return null;
}

export default function MapTab({ day }) {
  const dayNumber = day.n;
  const todayStops = DAILY_ROUTES[dayNumber] || [];
  const todayLocations = todayStops.map(key => LOCATIONS[key]);

  // Center on Aeolian Islands
  const center = [38.55, 14.95];

  // Get route up to current day
  const routeUpToToday = [];
  for (let d = 1; d <= dayNumber; d++) {
    const dayRoute = DAILY_ROUTES[d] || [];
    dayRoute.forEach(key => {
      const loc = LOCATIONS[key];
      // Avoid duplicate consecutive points
      if (routeUpToToday.length === 0 ||
          routeUpToToday[routeUpToToday.length - 1].name !== loc.name) {
        routeUpToToday.push(loc);
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Map container */}
      <div style={{
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,200,80,0.2)',
      }}>
        <MapContainer
          center={center}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Fit to today's locations */}
          <FitBounds locations={todayLocations.length > 1 ? todayLocations : Object.values(LOCATIONS)} />

          {/* Full route - faded */}
          <Polyline
            positions={FULL_ROUTE.map(loc => [loc.lat, loc.lng])}
            color="rgba(200,168,75,0.2)"
            weight={2}
            dashArray="5,10"
          />

          {/* Route completed so far */}
          <Polyline
            positions={routeUpToToday.map(loc => [loc.lat, loc.lng])}
            color="#c8a84b"
            weight={3}
          />

          {/* Today's route - highlighted */}
          {todayLocations.length > 1 && (
            <Polyline
              positions={todayLocations.map(loc => [loc.lat, loc.lng])}
              color="#e8c87a"
              weight={4}
            />
          )}

          {/* All location markers */}
          {Object.entries(LOCATIONS).map(([key, loc]) => {
            const isToday = todayStops.includes(key);
            const isPast = routeUpToToday.some(r => r.name === loc.name);

            let color = 'rgba(139,172,200,0.6)'; // Future - gray
            if (isToday) color = '#e8c87a'; // Today - gold
            else if (isPast) color = '#c8a84b'; // Past - darker gold

            return (
              <Marker
                key={key}
                position={[loc.lat, loc.lng]}
                icon={createIcon(color, isToday)}
              >
                <Popup>
                  <div style={{ fontFamily: 'Georgia, serif', textAlign: 'center' }}>
                    <strong>{loc.name}</strong>
                    {isToday && <div style={{ fontSize: '0.8em', color: '#666' }}>Today</div>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.8rem 1rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        fontSize: '0.75rem',
        color: '#8bacc8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, background: '#e8c87a', borderRadius: '50%', border: '2px solid white' }} />
          <span>Today</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 10, height: 10, background: '#c8a84b', borderRadius: '50%', border: '2px solid white' }} />
          <span>Visited</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 10, height: 10, background: 'rgba(139,172,200,0.6)', borderRadius: '50%', border: '2px solid white' }} />
          <span>Upcoming</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 20, height: 3, background: '#c8a84b' }} />
          <span>Route taken</span>
        </div>
      </div>

      {/* Today's stops */}
      <div style={{
        padding: '1rem',
        background: 'rgba(200,168,75,0.08)',
        borderRadius: '10px',
        borderLeft: '3px solid #c8a84b',
      }}>
        <div style={{ fontSize: '0.7rem', color: '#c8a84b', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
          DAY {dayNumber} ROUTE
        </div>
        <div style={{ fontSize: '0.95rem', color: '#f5e6c8' }}>
          {todayLocations.map((loc, i) => (
            <span key={loc.name}>
              {i > 0 && <span style={{ color: '#6a8898' }}> → </span>}
              {loc.name}
            </span>
          ))}
        </div>
      </div>

      {/* Island list */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.6rem',
      }}>
        {Object.entries(LOCATIONS)
          .filter(([_, loc]) => loc.type === 'island')
          .map(([key, loc]) => {
            const isToday = todayStops.includes(key);
            const isPast = routeUpToToday.some(r => r.name === loc.name);

            return (
              <div
                key={key}
                style={{
                  padding: '0.6rem 0.8rem',
                  background: isToday ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isToday ? 'rgba(200,168,75,0.3)' : 'rgba(255,200,80,0.1)'}`,
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: isToday ? '#e8c87a' : isPast ? '#c8a84b' : '#6a8898',
                }}
              >
                {isToday && '📍 '}{loc.name}
              </div>
            );
          })}
      </div>
    </div>
  );
}
