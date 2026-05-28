// Detailed trip context for Marco AI guide
// Extracted from trip planning documents

export const TRIP_CONTEXT = {
  // === THE BOAT ===
  boat: {
    name: "M/Y TWINS",
    type: "Motor Yacht",
    cruisingSpeed: "12 knots",
    features: [
      "Stabilizers for smooth sailing",
      "Starlink internet for video calls",
      "Swim platform with water toys",
      "E-foil and Seabobs",
      "Sundeck and aft deck",
      "European power outlets (Type C/F)"
    ],
    crew: "Captain plus five crew including Chef Salvo",
    bikes: "2 e-MTBs loaded at Lipari on Day 1"
  },

  // === CHEF SALVO'S SIGNATURE DISHES ===
  culinaryHighlights: {
    day1: {
      theme: "Tradizione - Sicilian Trinity",
      dishes: [
        "Caponata - sweet-and-sour eggplant antipasto",
        "Pasta alla Norma - pasta with tomato, fried eggplant, basil, salted ricotta (Catania's signature)",
        "Parmigiana di Melanzane - the Sicilian original"
      ]
    },
    day2: {
      lunch: "Crudo raw bar with sliced raw fish, citrus, olive oil, grilled vegetables",
      dinner: "Involtini di Pesce Spada - swordfish rolls stuffed with breadcrumbs, pine nuts, raisins, herbs"
    },
    day5: {
      lunch: "Saffron seafood risotto - arborio, saffron, mixed seafood, parsley, lemon",
      dinner: "Market dinner - whatever the Filicudi fisherman brought in (likely Amberjack/Ricciola or Dentice)"
    },
    day6: {
      lunch: "Sunday lunch style - slow-cooked ragu or pasta al forno",
      dessert: "SIGNATURE MOMENT: Cannoli prepared fresh tableside - shells fried in lard, filled with sheep's milk ricotta, candied citrus, Bronte pistachios"
    }
  },

  // === ISLAND PROFILES ===
  islands: {
    lipari: {
      nickname: "The Hub",
      highlights: [
        "Largest of the seven islands",
        "Marina Lunga - main port, e-MTB rental",
        "Canneto Bay - pumice and obsidian beach, exceptionally clear water",
        "Quattrocchi viewpoint - 'Four Eyes' panorama of Vulcano and faraglioni",
        "Valle Muria Beach - black sand, dramatic cliffs",
        "Cave di Pomice - white pumice quarries sliding into turquoise water",
        "Cave di Caolino - kaolin quarries with fumarole-stained rocks (red, orange, yellow, white)",
        "Subba gelato - family-run since 1930"
      ]
    },
    panarea: {
      nickname: "The Fashionable One",
      size: "3.4 km² - smallest island",
      history: "Bronze Age village at Punta Milazzese (c. 1400 BCE) - 23 oval huts with Mycenaean Greek pottery, major trade route node 600 years before Homer",
      highlights: [
        "Punta Milazzese - Bronze Age ruins with Stromboli views (45 min hike each way)",
        "Cala Junco - near-perfect turquoise swimming cove",
        "San Pietro village - whitewashed houses, bougainvillea, car-free",
        "Hotel Raya terrace - legendary celebrity cocktail spot",
        "Lisca Bianca & Bottaro islets - thermal springs, snorkeling 'like swimming in champagne'"
      ],
      modern: "Most fashionable island in Italy - Dolce & Gabbana, Armani, yacht crowds"
    },
    stromboli: {
      nickname: "Lighthouse of the Mediterranean",
      volcanism: "Erupting continuously for 2,000-3,000+ years. Gave us the term 'Strombolian eruption'",
      mythology: "Greeks: forge of Hephaestus. Romans: Vulcan's workshop",
      population: "~500 residents in two whitewashed villages",
      film: "Roberto Rossellini filmed 'Stromboli' (1950) with Ingrid Bergman",
      highlights: [
        "Sciara del Fuoco trail - 400m observatory trail to viewpoint (3 hrs RT)",
        "View the 'Stream of Fire' - black volcanic slope where glowing lava tumbles to sea",
        "Eruptions every 10-20 minutes at night",
        "Best viewed from boat at sunset/evening"
      ]
    },
    salina: {
      nickname: "The Green Twin",
      greekName: "Didyme ('the twin') - named for two volcanic peaks",
      fame: "Lushest island - forests, vineyards, natural springs",
      products: [
        "Malvasia delle Lipari - amber dessert wine from sun-dried grapes (DOC since 1973)",
        "Salt-cured capers from Pollara - considered world's best"
      ],
      film: "Il Postino (1994) filmed almost entirely in Pollara cove",
      highlights: [
        "Monte Fossa delle Felci - 962m, highest point in Aeolians (3 hrs RT)",
        "Lingua village - salt lake, Da Alfredo granita (try almond or fig with brioche col tuppo)",
        "Malfa village - Hauner and Caravaglio wineries",
        "Pollara cove - half-submerged volcanic crater, Il Postino beach, spectacular sunset"
      ],
      restaurants: {
        signum: {
          type: "Michelin Star",
          location: "Hotel Signum, Malfa",
          chef: "Martina Caruso - Italy's best young female chef, starred at age 26 (2016)",
          signature: "Spaghetti with Caper Milk - emulsion of Salina capers",
          dress: "Smart casual - linen, sundress, closed shoes"
        }
      }
    },
    filicudi: {
      nickname: "The Wild West",
      population: "~250 - remote, rugged, timeless",
      history: "Bronze Age village at Capo Graziano (27 huts, better preserved than Panarea's). Mass emigration to Australia/Argentina in early 1900s after phylloxera blight",
      character: "No nightlife, no proper roads in interior - treasured for that",
      highlights: [
        "Zucco Grande - abandoned village reclaimed by prickly pears (2 hr hike up)",
        "Pecorini a Mare - tiny fishing hamlet of ~50 people, time stops here",
        "La Canna - 71m basalt spire, deep water swim/snorkel, water drops to 100m+",
        "Grotta del Bue Marino - sea cave, once home to Mediterranean monk seal, electric blue water"
      ]
    },
    vulcano: {
      nickname: "The Original",
      etymology: "Gave the world the word 'volcano' - Romans believed Vulcan's forge was inside",
      volcanism: "Last erupted 1888-90, gave us term 'Vulcanian eruption' (more violent than Strombolian)",
      vulcanello: "Smaller peninsula raised from seafloor in 183 BCE in single eruption recorded by Romans",
      highlights: [
        "Gran Cratere rim walk - 1 hr up through ash, 45 min rim walk with active fumaroles (3 hrs total)",
        "Vulcanello peninsula - flat, lunar, 2,200 years old",
        "Valle dei Mostri - 'Valley of Monsters', twisted lava formations",
        "Spiaggia Sabbie Nere - black sand beach",
        "Gelso - quiet black sand beach on south side"
      ],
      note: "Skip the sulfur mud baths - closed since 2020 for safety",
      restaurants: {
        ilCappero: {
          type: "Michelin Star",
          location: "Therasia Resort, heights above Vulcano harbor",
          view: "Terrace overlooks Faraglioni sea stacks at sunset - unmatched in the islands",
          recommendation: "Arrive 1 hour before sunset for aperitivo - light show is the real first course",
          sister: "I Tenerumi - vegetarian tasting menu, also world-class",
          dress: "Smart casual to slightly elevated"
        }
      }
    },
    alicudi: {
      note: "Skipped on this itinerary - no roads, no bikes possible"
    }
  },

  // === PRACTICAL TIPS ===
  tips: {
    dress: "Charter casual. Linen/resort wear for evening. Soft-soled shoes for deck (hard soles scuff teak)",
    power: "European outlets (Type C/F) - bring adapters",
    connectivity: "Phone coverage solid throughout; Starlink onboard for video calls",
    water: "~22°C / 72°F in June",
    hiking: "Closed-toe shoes essential for volcanic terrain. Bring water, sun protection, bandana for sulfur fumes",
    dining: "Michelin dinners: smart casual, linen/sundress, closed shoes preferred"
  },

  // === KEY LANDMARKS & ACTIVITIES ===
  mustSee: [
    "Stromboli eruptions at night from the boat",
    "Cala Junco swimming cove (Panarea)",
    "Quattrocchi viewpoint (Lipari)",
    "Gran Cratere rim walk with active fumaroles (Vulcano)",
    "La Canna deep water swim (Filicudi)",
    "Pollara sunset - Il Postino cove (Salina)",
    "Tableside cannoli preparation (Day 6)"
  ],

  // === WINES TO KNOW ===
  wines: {
    whites: ["Grillo", "Catarratto", "Salina Bianco"],
    reds: ["Nero d'Avola - Sicily's signature red"],
    dessert: ["Malvasia delle Lipari - amber, from sun-dried grapes"],
    fortified: ["Marsala - pairs with cannoli"]
  },

  // === HISTORICAL CONTEXT ===
  history: {
    bronzeAge: "Panarea and Filicudi had sophisticated villages c. 1400 BCE on Mediterranean trade routes",
    greek: "Named islands, believed Stromboli was Hephaestus's forge",
    roman: "Named Vulcano for Vulcan; witnessed Vulcanello rise from sea in 183 BCE",
    medieval: "Norman castles (Castello di Milazzo)",
    modern: "Rossellini's Stromboli (1950), Il Postino (1994)"
  }
};
