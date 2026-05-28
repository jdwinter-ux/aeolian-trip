import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import exifr from 'exifr';

// Travelers on the trip - customize with actual names and descriptions
const TRAVELERS = [
  { name: 'Doug', description: 'Trip organizer' },
  { name: 'Jennifer', description: '' },
  // Add more travelers here with distinguishing features if helpful:
  // { name: 'Mike', description: 'tall, dark hair, usually wears sunglasses' },
];

// Detailed location knowledge per day for better recognition
const DAY_LOCATIONS = {
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

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !anthropicKey) {
    console.error('Missing env vars:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnthropicKey: !!anthropicKey,
    });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  // Create clients
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the JWT token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { photo_id, storage_path, day_context } = req.body;

  if (!photo_id || !storage_path || !day_context) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Download the photo from Supabase Storage
    const { data: photoData, error: downloadError } = await supabase.storage
      .from('photos')
      .download(storage_path);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return res.status(500).json({ error: 'Failed to download photo' });
    }

    // Convert to buffer
    const arrayBuffer = await photoData.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Extract EXIF data including GPS coordinates
    let exifData = null;
    let gpsInfo = '';
    try {
      exifData = await exifr.parse(imageBuffer, {
        gps: true,
        pick: ['latitude', 'longitude', 'DateTimeOriginal', 'Make', 'Model'],
      });
      if (exifData?.latitude && exifData?.longitude) {
        gpsInfo = `\nGPS coordinates: ${exifData.latitude.toFixed(4)}°N, ${exifData.longitude.toFixed(4)}°E`;
        console.log(`Photo GPS: ${exifData.latitude}, ${exifData.longitude}`);
      }
    } catch (exifErr) {
      console.log('No EXIF data available:', exifErr.message);
    }

    // Compress and resize image to fit under 5MB limit
    // Higher resolution and quality for better recognition
    const compressedBuffer = await sharp(imageBuffer)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64 = compressedBuffer.toString('base64');
    console.log(`Image compressed: ${imageBuffer.length} -> ${compressedBuffer.length} bytes`);

    // Extract day number from context for location lookup
    const dayMatch = day_context.match(/Day (\d+)/);
    const dayNumber = dayMatch ? parseInt(dayMatch[1]) : null;
    const dayLocations = dayNumber ? DAY_LOCATIONS[dayNumber] : null;

    // Build location context
    let locationContext = '';
    if (dayLocations) {
      locationContext = `
Known locations for this day:
- Islands: ${dayLocations.islands.join(', ')}
- Landmarks: ${dayLocations.landmarks.join(', ')}
- Activities: ${dayLocations.activities.join(', ')}`;
    }

    // Build traveler context
    const travelerList = TRAVELERS.map(t =>
      t.description ? `${t.name} (${t.description})` : t.name
    ).join(', ');
    const travelerContext = TRAVELERS.length > 0
      ? `\nTravelers on this trip: ${travelerList}. If you recognize any of them in the photo, mention them by name.`
      : '';

    // Call Anthropic API with enriched context
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `You are an Aeolian Islands travel expert helping identify photos from a yacht charter trip.

This photo was taken on ${day_context}.${gpsInfo}${locationContext}${travelerContext}

Identify the location, landmarks, food, or people in this photo. Be specific - use the known locations list to help identify places.

Respond with ONLY a JSON object (no markdown):
{
  "title": "short descriptive name (include people's names if recognized)",
  "location": "specific place / landmark identified",
  "description": "2-3 sentence vivid travel description mentioning people by name if present",
  "tags": ["tag1","tag2","tag3"],
  "category": one of "landmark","food","seascape","wildlife","people","architecture","activity","volcano"
}`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content.find(b => b.type === 'text')?.text || '{}';
    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : cleaned);

    // Update the photo record in the database
    const { error: updateError } = await supabase
      .from('trip_photos')
      .update({
        title: parsed.title || 'Untitled',
        location: parsed.location || 'Unknown location',
        description: parsed.description || '',
        tags: parsed.tags || [],
        category: parsed.category || 'landmark',
        identified_at: new Date().toISOString(),
      })
      .eq('id', photo_id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('Identification error:', error);
    return res.status(500).json({
      error: 'Identification failed',
      title: storage_path.split('/').pop()?.split('.')[0] || 'Photo',
      location: '—',
      description: 'AI identification failed. Tap to retry.',
      tags: [],
      category: 'landmark',
    });
  }
}
