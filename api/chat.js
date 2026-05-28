import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Helper to process attachments into Claude content blocks
async function processAttachments(attachments, supabase) {
  if (!attachments || attachments.length === 0) return { contentBlocks: [], failures: [] };

  const contentBlocks = [];
  const failures = [];

  for (const att of attachments) {
    try {
      // Only process images for now
      if (att.type?.startsWith('image/')) {
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .download(att.storage_path);

        if (error) {
          console.error('Failed to download attachment:', error);
          failures.push({ name: att.name, reason: 'download failed' });
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
      } else {
        // Track unsupported types
        failures.push({ name: att.name, reason: 'type not yet supported' });
      }
    } catch (err) {
      console.error('Error processing attachment:', err);
      failures.push({ name: att.name, reason: 'processing error' });
    }
  }

  return { contentBlocks, failures };
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
  const { currentDay, photos, notes, travelers, itinerary } = context;

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

  let travelersSummary = 'No travelers registered yet.';
  if (travelers && travelers.length > 0) {
    travelersSummary = travelers.map(t => {
      const parts = [t.name];
      if (t.role) parts.push(`(${t.role})`);
      if (t.description) parts.push(`- ${t.description}`);
      return parts.join(' ');
    }).join('\n');
  }

  let itinerarySummary = TRIP.days.map(d =>
    `Day ${d.n} (${d.date}): ${d.title} — ${d.route}`
  ).join('\n');

  return `You are Marco, an enthusiastic local from the Aeolian Islands. You're warm, knowledgeable, and passionate about these volcanic islands off Sicily's north coast. You occasionally use Italian phrases with translations, like "Perfetto! (Perfect!)" or "Che bello! (How beautiful!)".

You're helping a group of travelers on a yacht charter aboard M/Y TWINS, June 12-19, 2025.

=== THE BOAT: M/Y TWINS ===
- Motor yacht with stabilizers for smooth sailing
- Cruises at 12 knots
- Starlink internet, swim platform with e-foil and Seabobs
- Captain plus five crew including Chef Salvo
- 2 e-MTBs loaded at Lipari on Day 1
- European power outlets (Type C/F)

=== CHEF SALVO'S HIGHLIGHTS ===
Day 1 "Tradizione": Caponata, Pasta alla Norma, Parmigiana di Melanzane
Day 2: Crudo raw bar lunch; Involtini di Pesce Spada dinner under Stromboli
Day 5: Saffron seafood risotto; Market dinner (whatever Filicudi fishermen caught)
Day 6 SIGNATURE: Cannoli prepared fresh tableside - shells fried in lard, sheep's milk ricotta, Bronte pistachios

=== ISLAND KNOWLEDGE ===

LIPARI (The Hub): Largest island. Marina Lunga port. Canneto Bay has pumice & obsidian beach. Quattrocchi viewpoint ("Four Eyes") has best panorama. Valle Muria = black sand beach. Cave di Caolino = fumarole-stained quarries (red/orange/yellow rocks). Subba gelato since 1930.

PANAREA (Fashionable): Smallest at 3.4km². Bronze Age village at Punta Milazzese (c.1400 BCE) had Mycenaean Greek pottery - major trade route 600 years before Homer. Cala Junco = perfect turquoise swimming cove. San Pietro village is car-free. Hotel Raya = celebrity cocktails. Lisca Bianca islets have thermal springs ("swimming in champagne").

STROMBOLI (Lighthouse of Mediterranean): Erupting continuously 2,000-3,000+ years. Greeks called it Hephaestus's forge. Gave us term "Strombolian eruption." ~500 residents. Rossellini filmed here with Ingrid Bergman (1950). Sciara del Fuoco trail = 3hrs RT to viewpoint. Eruptions every 10-20 minutes at night.

SALINA (The Green Twin): Lushest island, two volcanic peaks. Famous for Malvasia delle Lipari wine (DOC 1973) and salt-cured capers from Pollara (world's best). Il Postino filmed at Pollara cove (1994). Monte Fossa delle Felci = 962m, highest in Aeolians. Da Alfredo in Lingua = best granita (try almond or fig with brioche). SIGNUM restaurant in Malfa = Michelin star, Chef Martina Caruso's "Spaghetti with Caper Milk."

FILICUDI (The Wild West): Remote, ~250 people. Bronze Age village at Capo Graziano. Mass emigration to Australia/Argentina in 1900s. Zucco Grande = abandoned village (2hr hike). La Canna = 71m basalt spire, legendary deep-water swimming. Grotta del Bue Marino = sea cave with electric blue water.

VULCANO (The Original): Gave the world the word "volcano." Romans believed Vulcan's forge was inside. Last erupted 1888-90. Vulcanello peninsula rose from sea in 183 BCE. Gran Cratere rim walk = 3hrs with active fumaroles. Valle dei Mostri = twisted lava formations. Skip mud baths (closed since 2020). IL CAPPERO at Therasia Resort = Michelin star, sunset over Faraglioni sea stacks.

=== WINES ===
Whites: Grillo, Catarratto, Salina Bianco
Reds: Nero d'Avola (Sicily's signature)
Dessert: Malvasia delle Lipari (amber, sun-dried grapes)
Fortified: Marsala (pairs with cannoli)

=== PRACTICAL ===
- Water temp: ~22°C/72°F in June
- Dress: Charter casual, soft-soled shoes on deck. Smart casual for Michelin dinners.
- Hiking: Closed-toe shoes essential for volcanic terrain, bring bandana for sulfur fumes

=== CURRENT TRIP STATUS ===
Today: ${currentDay.description}
Trip dates: ${TRIP.dates}

ITINERARY:
${itinerarySummary}

PHOTOS THE GROUP HAS TAKEN:
${photoSummary}

RECENT JOURNAL NOTES:
${notesSummary}

=== PEOPLE ON THIS TRIP ===
${travelersSummary}

=== MANAGING TRAVELERS ===
You can help manage the list of people on this trip. When someone asks you to add a person, update their description, or remove someone, use the appropriate tool. This helps with photo identification - the more details (physical description, usual clothing, etc.) the better for recognizing people in photos.

Be helpful, specific, and enthusiastic! Share local tips and hidden gems. Reference the group's photos and notes when relevant. Keep responses conversational unless they ask for detailed information.`;
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
    const [photosResult, notesResult, chatHistoryResult, travelersResult] = await Promise.all([
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

      // Get travelers
      supabase
        .from('trip_travelers')
        .select('id, name, role, description')
        .order('role', { ascending: true }),
    ]);

    const photos = photosResult.data || [];
    const notes = notesResult.data || [];
    const chatHistory = (chatHistoryResult.data || []).reverse(); // Oldest first
    const travelers = travelersResult.data || [];

    // Build context
    const currentDay = getCurrentDay();
    const systemPrompt = buildSystemPrompt({
      currentDay,
      photos,
      notes,
      travelers,
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
    const { contentBlocks: attachmentBlocks, failures: attachmentFailures } = await processAttachments(attachments, supabase);

    // Build user message content (text + any images)
    let userContent;
    let messageWithFailures = trimmedMessage;

    // If some attachments failed, note that in the message context
    if (attachmentFailures.length > 0) {
      const failureNote = `\n[Note: ${attachmentFailures.length} attachment(s) could not be processed]`;
      console.log('Attachment failures:', attachmentFailures);
      messageWithFailures += failureNote;
    }

    if (attachmentBlocks.length > 0) {
      // Multi-part message with images and text
      userContent = [
        ...attachmentBlocks,
        { type: 'text', text: messageWithFailures },
      ];
    } else {
      userContent = messageWithFailures;
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

    // Define tools for managing travelers
    const tools = [
      {
        name: 'add_traveler',
        description: 'Add a new person (guest or crew) to the trip. Use this when someone asks to add a person to the travelers list.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The person\'s name' },
            role: { type: 'string', description: 'Their role: guest, crew, captain, chef, etc.' },
            description: { type: 'string', description: 'Physical description or identifying features (hair color, height, usual clothing, etc.)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_traveler',
        description: 'Update an existing traveler\'s information. Use this to change their description or role.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The person\'s name to find and update' },
            role: { type: 'string', description: 'Updated role (optional)' },
            description: { type: 'string', description: 'Updated description (optional)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'remove_traveler',
        description: 'Remove a person from the travelers list.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'The person\'s name to remove' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_travelers',
        description: 'List all current travelers and crew. Use when someone asks who is on the trip.',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    // Call Claude API with tools
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
      tools: tools,
    });

    // Handle tool use if Claude wants to manage travelers
    let assistantMessage = '';
    while (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find(b => b.type === 'tool_use');
      if (!toolUseBlock) break;

      let toolResult = '';

      try {
        if (toolUseBlock.name === 'add_traveler') {
          const { name, role, description } = toolUseBlock.input;
          const { error } = await supabase
            .from('trip_travelers')
            .insert({ name, role: role || 'guest', description: description || null });
          toolResult = error ? `Error: ${error.message}` : `Added ${name} to the trip!`;
        }
        else if (toolUseBlock.name === 'update_traveler') {
          const { name, role, description } = toolUseBlock.input;
          const updates = {};
          if (role !== undefined) updates.role = role;
          if (description !== undefined) updates.description = description;
          updates.updated_at = new Date().toISOString();

          const { error } = await supabase
            .from('trip_travelers')
            .update(updates)
            .ilike('name', name);
          toolResult = error ? `Error: ${error.message}` : `Updated ${name}'s information.`;
        }
        else if (toolUseBlock.name === 'remove_traveler') {
          const { name } = toolUseBlock.input;
          const { error } = await supabase
            .from('trip_travelers')
            .delete()
            .ilike('name', name);
          toolResult = error ? `Error: ${error.message}` : `Removed ${name} from the trip.`;
        }
        else if (toolUseBlock.name === 'list_travelers') {
          const { data } = await supabase
            .from('trip_travelers')
            .select('name, role, description')
            .order('role', { ascending: true });
          if (data && data.length > 0) {
            toolResult = data.map(t => {
              const parts = [`${t.name} (${t.role || 'guest'})`];
              if (t.description) parts.push(`: ${t.description}`);
              return parts.join('');
            }).join('\n');
          } else {
            toolResult = 'No travelers registered yet.';
          }
        }
      } catch (err) {
        toolResult = `Error: ${err.message}`;
      }

      // Add the assistant's tool use and the result to messages
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: toolResult }],
      });

      // Continue the conversation
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
        tools: tools,
      });
    }

    // Get the final text response
    assistantMessage = response.content.find(b => b.type === 'text')?.text || '';

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
      attachment_failures: attachmentFailures.length > 0 ? attachmentFailures : undefined,
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
