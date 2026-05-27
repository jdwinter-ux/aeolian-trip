import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Helper to process attachments into Claude content blocks
async function processAttachments(attachments, supabase) {
  if (!attachments || attachments.length === 0) return [];

  const contentBlocks = [];

  for (const att of attachments) {
    try {
      // Only process images for now
      if (att.type?.startsWith('image/')) {
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .download(att.storage_path);

        if (error) {
          console.error('Failed to download attachment:', error);
          continue;
        }

        const arrayBuffer = await data.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        // Compress and resize to fit under 5MB limit
        // Use higher resolution and quality for better recognition
        const compressedBuffer = await sharp(imageBuffer)
          .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 90 })
          .toBuffer();

        const base64 = compressedBuffer.toString('base64');
        console.log(`Chat image compressed: ${imageBuffer.length} -> ${compressedBuffer.length} bytes`);

        contentBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64,
          },
        });
      }
      // For PDFs and text files, we could extract text content here in the future
    } catch (err) {
      console.error('Error processing attachment:', err);
    }
  }

  return contentBlocks;
}

// Trip data for context
const TRIP = {
  title: "Aeolian Islands",
  subtitle: "Aboard M/Y TWINS",
  dates: "June 12–19, 2025",
  startDate: new Date('2025-06-12'),
  days: [
    { n: 1, date: "Jun 12", title: "The Welcome", route: "Milazzo → Lipari" },
    { n: 2, date: "Jun 13", title: "Panarea", route: "Canneto → Panarea → Stromboli" },
    { n: 3, date: "Jun 14", title: "Fire & Water", route: "Stromboli → Salina" },
    { n: 4, date: "Jun 15", title: "A Slow Sunday", route: "Salina" },
    { n: 5, date: "Jun 16", title: "The Wild West", route: "Salina → Filicudi" },
    { n: 6, date: "Jun 17", title: "Lipari West Side", route: "Filicudi → Lipari (west)" },
    { n: 7, date: "Jun 18", title: "Vulcano", route: "Lipari → Vulcano" },
    { n: 8, date: "Jun 19", title: "Departure", route: "Vulcano → Lipari → Milazzo" },
  ],
};

function getCurrentDay() {
  const now = new Date();
  const start = TRIP.startDate;
  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { dayNumber: 0, description: `Trip starts in ${-diffDays} days` };
  if (diffDays >= TRIP.days.length) return { dayNumber: TRIP.days.length, description: 'Trip has ended' };

  const day = TRIP.days[diffDays];
  return {
    dayNumber: day.n,
    description: `Day ${day.n} (${day.date}) — ${day.title}: ${day.route}`,
  };
}

function buildSystemPrompt(context) {
  const { currentDay, photos, notes, itinerary } = context;

  let photoSummary = 'No photos uploaded yet.';
  if (photos && photos.length > 0) {
    photoSummary = photos.map(p =>
      `- "${p.title}" at ${p.location}: ${p.description}`
    ).join('\n');
  }

  let notesSummary = 'No journal notes yet.';
  if (notes && notes.length > 0) {
    notesSummary = notes.map(n =>
      `- Day ${n.day_number}: "${n.body.slice(0, 100)}${n.body.length > 100 ? '...' : ''}"`
    ).join('\n');
  }

  let itinerarySummary = TRIP.days.map(d =>
    `Day ${d.n} (${d.date}): ${d.title} — ${d.route}`
  ).join('\n');

  return `You are Marco, an enthusiastic local from the Aeolian Islands. You're warm, knowledgeable, and passionate about these volcanic islands off Sicily's north coast. You're an expert in:
- Local history (Greek, Roman, and Norman influences)
- Geography and geology (the volcanic archipelago)
- Food and wine (capers, Malvasia, fresh seafood)
- Culture and traditions
- Hidden gems and local tips

You occasionally use Italian phrases with translations, like "Perfetto! (Perfect!)" or "Che bello! (How beautiful!)". You're helping a group of travelers on a yacht charter aboard M/Y TWINS, June 12-19, 2025.

CURRENT CONTEXT:
- Today: ${currentDay.description}
- Trip dates: ${TRIP.dates}

ITINERARY:
${itinerarySummary}

PHOTOS THE GROUP HAS TAKEN:
${photoSummary}

RECENT JOURNAL NOTES:
${notesSummary}

Be helpful, specific, and enthusiastic! Share local tips, restaurant recommendations, and hidden gems. Reference the group's photos and notes when relevant to make the conversation personal. Keep responses conversational and not too long unless they ask for detailed information.`;
}

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

  const { message, attachments } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Validate message length (prevent abuse)
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  if (trimmedMessage.length > 4000) {
    return res.status(400).json({ error: 'Message too long (max 4000 characters)' });
  }

  try {
    // Fetch context data in parallel
    const [photosResult, notesResult, chatHistoryResult] = await Promise.all([
      // Get all photos with descriptions
      supabase
        .from('trip_photos')
        .select('title, location, description, day_number, category')
        .not('identified_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50),

      // Get recent notes
      supabase
        .from('trip_notes')
        .select('day_number, body, created_at')
        .order('created_at', { ascending: false })
        .limit(20),

      // Get recent chat history
      supabase
        .from('trip_chat')
        .select('role, content, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const photos = photosResult.data || [];
    const notes = notesResult.data || [];
    const chatHistory = (chatHistoryResult.data || []).reverse(); // Oldest first

    // Build context
    const currentDay = getCurrentDay();
    const systemPrompt = buildSystemPrompt({
      currentDay,
      photos,
      notes,
      itinerary: TRIP.days,
    });

    // Build messages array with history
    const messages = [];
    for (const msg of chatHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Process any attachments (images, etc.)
    const attachmentBlocks = await processAttachments(attachments, supabase);

    // Build user message content (text + any images)
    let userContent;
    if (attachmentBlocks.length > 0) {
      // Multi-part message with images and text
      userContent = [
        ...attachmentBlocks,
        { type: 'text', text: trimmedMessage },
      ];
    } else {
      userContent = trimmedMessage;
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: userContent,
    });

    // Store user message first
    const { data: userMsgData, error: userMsgError } = await supabase
      .from('trip_chat')
      .insert({
        role: 'user',
        author_email: user.email,
        content: trimmedMessage,
        attachments: attachments || null,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error storing user message:', userMsgError);
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    const assistantMessage = response.content.find(b => b.type === 'text')?.text || '';

    // Store assistant response
    const { data: assistantMsgData, error: assistantMsgError } = await supabase
      .from('trip_chat')
      .insert({
        role: 'assistant',
        author_email: null,
        content: assistantMessage,
        attachments: null,
      })
      .select()
      .single();

    if (assistantMsgError) {
      console.error('Error storing assistant message:', assistantMsgError);
    }

    return res.status(200).json({
      response: assistantMessage,
      message_id: assistantMsgData?.id,
    });

  } catch (error) {
    console.error('Chat error:', error);

    // Handle specific error types
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Marco is busy right now. Please try again in a moment.',
      });
    }

    if (error.status === 401 || error.status === 403) {
      return res.status(500).json({
        error: 'Configuration error. Please contact support.',
      });
    }

    return res.status(500).json({
      error: 'Failed to get response from Marco. Please try again.',
    });
  }
}
