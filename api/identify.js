import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

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

    // Compress and resize image to fit under 5MB limit
    // Max dimension 1600px, quality 80%
    const compressedBuffer = await sharp(imageBuffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = compressedBuffer.toString('base64');
    console.log(`Image compressed: ${imageBuffer.length} -> ${compressedBuffer.length} bytes`);

    // Call Anthropic API with current model
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
