import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  // Create Supabase client with service role for admin access
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

    // Convert to base64
    const arrayBuffer = await photoData.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Determine media type
    const extension = storage_path.split('.').pop().toLowerCase();
    const mediaTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const mediaType = mediaTypes[extension] || 'image/jpeg';

    // Call Anthropic API
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
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `You are an Aeolian Islands travel expert. This photo was taken on ${day_context}. Respond with ONLY a JSON object (no markdown):
{
  "title": "short name for this photo",
  "location": "specific place / landmark identified",
  "description": "2-3 sentence vivid travel description",
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
      // Still return the parsed result even if update fails
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
