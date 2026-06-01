// All geographic data for the trip, in one place.
//  - MAP_LOCATIONS / DAILY_ROUTES / FULL_ROUTE / MAP_CENTER drive the Map tab.
//  - DAY_LOCATIONS gives the photo-identification API per-day location context.
// Shared by src/components/MapTab.jsx and api/identify.js.

// Island/stop coordinates for the map
export const MAP_LOCATIONS = {
  milazzo: { lat: 38.2242, lng: 15.2405, name: 'Milazzo', type: 'port' },
  lipari: { lat: 38.4674, lng: 14.9540, name: 'Lipari', type: 'island' },
  canneto: { lat: 38.4850, lng: 14.9650, name: 'Canneto Bay', type: 'anchorage' },
  panarea: { lat: 38.6367, lng: 15.0700, name: 'Panarea', type: 'island' },
  stromboli: { lat: 38.7890, lng: 15.2130, name: 'Stromboli', type: 'island' },
  salina: { lat: 38.5600, lng: 14.8680, name: 'Salina', type: 'island' },
  filicudi: { lat: 38.5620, lng: 14.5700, name: 'Filicudi', type: 'island' },
  vulcano: { lat: 38.4040, lng: 14.9620, name: 'Vulcano', type: 'island' },
};

// Route stops for each day (keys into MAP_LOCATIONS)
export const DAILY_ROUTES = {
  1: ['milazzo', 'lipari', 'canneto'],
  2: ['canneto', 'panarea', 'stromboli'],
  3: ['stromboli', 'salina'],
  4: ['salina'], // Stay at Salina
  5: ['salina', 'filicudi'],
  6: ['filicudi', 'lipari'],
  7: ['lipari', 'vulcano'],
  8: ['vulcano', 'lipari', 'milazzo'],
};

// Full ordered route for the overview polyline
export const FULL_ROUTE = [
  MAP_LOCATIONS.milazzo,
  MAP_LOCATIONS.lipari,
  MAP_LOCATIONS.canneto,
  MAP_LOCATIONS.panarea,
  MAP_LOCATIONS.stromboli,
  MAP_LOCATIONS.salina,
  MAP_LOCATIONS.filicudi,
  MAP_LOCATIONS.lipari,
  MAP_LOCATIONS.vulcano,
  MAP_LOCATIONS.lipari,
  MAP_LOCATIONS.milazzo,
];

// Default map center [lat, lng]
export const MAP_CENTER = [38.55, 14.95];

// Per-day location knowledge to prime AI photo identification
export const DAY_LOCATIONS = {
  1: {
    islands: ['Lipari'],
    landmarks: ['Marina Lunga port', 'Canneto Bay', 'pumice beach', 'obsidian beach'],
    activities: ['boarding yacht', 'welcome dinner'],
  },
  2: {
    islands: ['Panarea', 'Stromboli'],
    landmarks: ['Punta Milazzese', 'Bronze Age village', 'Cala Junco cove', 'San Pietro village', 'Lisca Bianca'],
    activities: ['hiking', 'swimming', 'watching volcano'],
  },
  3: {
    islands: ['Stromboli', 'Salina'],
    landmarks: ['Sciara del Fuoco', 'Stromboli volcano', 'Malfa village', 'Signum restaurant'],
    activities: ['volcano hike', 'Michelin dinner'],
  },
  4: {
    islands: ['Salina'],
    landmarks: ['Monte Fossa delle Felci', 'Lingua salt lake', 'Da Alfredo', 'Pollara cove', 'Il Postino filming location'],
    activities: ['granita tasting', 'wine tasting', 'Malvasia', 'capers'],
  },
  5: {
    islands: ['Filicudi'],
    landmarks: ['La Canna rock spire', 'Zucco Grande abandoned village', 'Grotta del Bue Marino', 'Pecorini a Mare'],
    activities: ['hiking', 'deep water swimming', 'sea cave visit'],
  },
  6: {
    islands: ['Lipari'],
    landmarks: ['Quattrocchi viewpoint', 'Cave di Caolino quarries', 'Valle Muria black sand beach'],
    activities: ['biking', 'hiking', 'cannoli tableside'],
  },
  7: {
    islands: ['Vulcano'],
    landmarks: ['Gran Cratere', 'Vulcanello peninsula', 'Gelso beach', 'Il Cappero restaurant', 'Therasia Resort', 'Faraglioni sea stacks'],
    activities: ['crater rim hike', 'fumaroles', 'Michelin dinner'],
  },
  8: {
    islands: ['Vulcano', 'Lipari', 'Milazzo'],
    landmarks: ['Marina Lunga', 'Milazzo port'],
    activities: ['departure', 'disembarkation'],
  },
};
