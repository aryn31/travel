/**
 * Seed authors and their stories.
 *
 * These are deliberately about people and good days rather than logistics --
 * an earlier version read like a guidebook (timetables, what it cost), which
 * is not what anyone actually writes about a trip afterwards.
 *
 * Each image carries a `query` used to find a real photograph of that place
 * on Wikimedia Commons at seed time.
 */

export type SeedBlock =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "quote"; text: string }
  | { t: "list"; items: string[] }
  | { t: "img"; query: string; alt: string };

export type SeedStory = {
  title: string;
  place: string;
  country: string;
  daysAgo: number | null; // null = draft
  coverQuery: string;
  blocks: SeedBlock[];
};

export type SeedAuthor = {
  handle: string;
  name: string;
  email: string;
  bio: string;
  home: string;
  stories: SeedStory[];
};

export const AUTHORS: SeedAuthor[] = [
  {
    handle: "mira",
    name: "Mira Oyelaran",
    email: "mira@seed.local",
    bio: "I mostly write about the people who feed me. Coastlines, markets, and long afternoons.",
    home: "Nigeria",
    stories: [
      {
        title: "The Wedding I Wasn't Invited To",
        place: "Cape Coast",
        country: "GH",
        daysAgo: 3,
        coverQuery: "Cape Coast Ghana town view",
        blocks: [
          { t: "p", text: "I was walking back to my room with a bag of oranges when a woman in green took my arm and said, quite firmly, that I was late. I tried to explain that she had the wrong person. She said she knew, and that I was still late." },
          { t: "img", query: "Cape Coast Castle Ghana", alt: "Cape Coast, white walls above the water" },
          { t: "p", text: "Her name was Adjoa and her cousin was getting married in twenty minutes, and there was, in her view, no sensible reason for a person with no other plans to be standing outside a wedding rather than inside one. The oranges were taken off me and put somewhere safe. I never saw them again." },
          { t: "h", text: "What I remember" },
          { t: "p", text: "The bride's mother crying before anything had even happened. A boy of about six conducting the drummers with total seriousness and no authority whatsoever. Adjoa introducing me to roughly forty people as her friend from Nigeria, which by then was true." },
          { t: "quote", text: "You were standing there. What were we supposed to do, leave you standing there?" },
          { t: "p", text: "I danced badly for two hours. Somebody's grandmother corrected my footwork by holding both my hands and moving them, the way you would teach a child, and everyone found this extremely funny, including me." },
          { t: "p", text: "I left at nine and walked back along the sea road. It remains, without much competition, the best afternoon I have had anywhere." },
        ],
      },
      {
        title: "Learning to Fry Plantain Properly, at Forty-One",
        place: "Accra",
        country: "GH",
        daysAgo: 19,
        coverQuery: "Accra Ghana skyline",
        blocks: [
          { t: "p", text: "I have been frying plantain badly my entire adult life and did not know it until a woman called Efua watched me do it and made a small noise." },
          { t: "img", query: "Makola Market Accra", alt: "A market stall in Accra, plantain stacked in the shade" },
          { t: "p", text: "She sells outside a barber's shop near Osu and I had been buying from her every morning for a week. When I mentioned I cooked it at home she asked, politely, how. I told her. The noise she made was not rude. It was the noise of someone hearing that a friend has been walking around with their shoes on the wrong feet." },
          { t: "h", text: "The corrections, in order" },
          { t: "list", items: [
            "Riper than you think. Black skin. If it looks like you have left it too long, it is ready.",
            "Cut on the diagonal, thicker than you have been cutting them.",
            "Salt before, not after.",
            "Do not crowd the pan. This was said twice.",
          ] },
          { t: "p", text: "She let me do a batch under supervision. The first four were wrong and she made me eat them anyway, as a lesson. The next four were right and she nodded once and went back to serving people, and I have honestly not felt that pleased with myself in years." },
        ],
      },
      {
        title: "Eleven Days Down the Coast",
        place: "Ouidah",
        country: "BJ",
        daysAgo: 45,
        coverQuery: "Ouidah Benin beach",
        blocks: [
          { t: "p", text: "The plan fitted on the back of a receipt: Accra to Ouidah without flying, stopping wherever the road gave me a reason. It took eleven days. The reasons were almost entirely people." },
          { t: "img", query: "Lomé Togo beach", alt: "The beach road at Lomé, palms and surf" },
          { t: "h", text: "The man at the border who would not let me be confused" },
          { t: "p", text: "The Ghana–Togo crossing at Aflao is a street with a line drawn across it, and I stood in the middle of it for a while looking at the wrong building. A man selling phone credit watched this for about ninety seconds, then closed his stall, walked me to the correct window, waited for the stamp, walked me back out, and reopened his stall. He would not take anything for it. He seemed faintly annoyed that I had offered." },
          { t: "h", text: "The pirogue to Togoville" },
          { t: "p", text: "Forty minutes across the lake, poled standing up the whole way by a boatman who hummed continuously and tunelessly. On the far side an old man showed me the cathedral, the sacred forest and the German monument, in that order, with identical enthusiasm for all three, and was visibly delighted that I had come on a Tuesday when nobody comes." },
          { t: "img", query: "Lake Togo", alt: "Lake Togo in the late afternoon, flat water" },
          { t: "quote", text: "Tuesday is better. On Sunday you have to share it." },
          { t: "h", text: "Grand-Popo, where I stayed two nights longer than planned" },
          { t: "p", text: "Because a family running a place by the river mouth asked where I was going next, and when I said I wasn't sure, treated that as an invitation to feed me for two days. Their daughter was revising for exams and practised her English on me, mercilessly, correcting my French in return. It was a fair trade and she got the better of it." },
          { t: "p", text: "Ouidah at the end was quiet and heavy and I am still working out what to say about it. But the eleven days before it were the warmest I have been anywhere, and none of that was in the plan, because none of it could have been." },
        ],
      },
    ],
  },

  {
    handle: "tomas",
    name: "Tomás Iriarte",
    email: "tomas@seed.local",
    bio: "Long bus journeys and whatever gets eaten at the end of them. Mostly the Andes.",
    home: "Argentina",
    stories: [
      {
        title: "The Best Meal of My Life Was in a Bus Station",
        place: "Salta",
        country: "AR",
        daysAgo: 6,
        coverQuery: "Salta Argentina plaza cathedral",
        blocks: [
          { t: "p", text: "It was eleven at night, the bus was three hours late, and the only thing open in the terminal at Salta was a counter with four stools and a woman who had clearly decided to stay open specifically because the bus was late." },
          { t: "img", query: "Salta Argentina street night", alt: "Salta at night, the low colonial streets" },
          { t: "p", text: "She made me a locro. Not from a menu — there was no menu. She asked if I had eaten, I said no, and she made me a locro the way you would make it for somebody in your kitchen who had turned up unexpectedly." },
          { t: "quote", text: "You cannot get on a bus like that. Sit." },
          { t: "p", text: "It was enormous and took twenty minutes to eat and she stood on the other side of the counter the whole time, wiping things that were already clean, asking where I was from and telling me about her son in Córdoba. When I tried to pay she charged me what I am fairly sure was less than the ingredients cost." },
          { t: "p", text: "I have eaten in some genuinely excellent restaurants in this country. I think about that counter more than all of them put together." },
        ],
      },
      {
        title: "Nine Strangers and a Broken Down Bus",
        place: "Purmamarca",
        country: "AR",
        daysAgo: 27,
        coverQuery: "Purmamarca Jujuy Argentina",
        blocks: [
          { t: "p", text: "The bus died about forty minutes outside Purmamarca, on a stretch of road with a coloured mountain on one side and nothing at all on the other. The driver made a phone call, told us it would be two hours, and lit a cigarette with the calm of a man who has said this many times." },
          { t: "img", query: "Cerro de los Siete Colores Purmamarca", alt: "The Hill of Seven Colours above Purmamarca" },
          { t: "p", text: "There were nine of us. Within about ten minutes somebody had produced a thermos and a gourd, and the mate started going round, which in Argentina is less a drink than a procedure for making strangers into a group." },
          { t: "h", text: "The two hours" },
          { t: "p", text: "A woman going to see her mother in Tilcara explained the geology of the hill to us, incorrectly and with total confidence, until an actual geology student on his way back to university corrected her, and they argued happily for a quarter of an hour. A boy fell asleep on his father's shoulder. The light went from white to gold to pink across the whole mountain, slowly, while we sat on the verge and watched it because there was nothing else to do." },
          { t: "quote", text: "If the bus had worked we would have driven straight past this at seventy." },
          { t: "p", text: "The replacement arrived at dusk. Everyone was slightly disappointed." },
        ],
      },
    ],
  },

  {
    handle: "seokjin",
    name: "Seok-jin Park",
    email: "seokjin@seed.local",
    bio: "Trains, ferries, islands. Trying to get from Seoul to Lisbon without flying, and talking to everyone on the way.",
    home: "South Korea",
    stories: [
      {
        title: "The Ajumma Who Adopted Me for a Day",
        place: "Busan",
        country: "KR",
        daysAgo: 8,
        coverQuery: "Busan South Korea",
        blocks: [
          { t: "p", text: "I asked a woman at Jagalchi market which of two fish was better. This was a mistake, in the sense that it cost me the entire rest of my day, and not a mistake in any other sense at all." },
          { t: "img", query: "Jagalchi Market Busan", alt: "Jagalchi fish market, tanks and low stools" },
          { t: "p", text: "She did not answer. She took both fish off the seller, held them up, said something rapid that made the seller laugh and look slightly ashamed, put one back, and handed me the other. Then she asked if I knew how to cook it. I said not really. She said, of course not, and that was that." },
          { t: "h", text: "What followed" },
          { t: "p", text: "Her name was Mrs Bae. We went to two more stalls for things I apparently also needed. She disapproved of my choice of guesthouse, my jacket, and the fact that I was travelling alone at my age, and she said all of this while buying me things." },
          { t: "p", text: "We cooked at her daughter's flat because mine had no kitchen. Her daughter came home halfway through, found a stranger at the stove, and was entirely unsurprised, which told me a great deal about how often this happens." },
          { t: "quote", text: "Eat. You are too thin for a person who is going to Europe on a boat." },
          { t: "p", text: "I have her number. She has sent me two messages since, both of them asking whether I am eating." },
        ],
      },
      {
        title: "A Card Game on the East Sea",
        place: "Vladivostok",
        country: "RU",
        daysAgo: 38,
        coverQuery: "Vladivostok Russia",
        blocks: [
          { t: "p", text: "The ferry from Donghae to Vladivostok takes about a day, and I had a berth in a six-person cabin with four Russian traders and one very quiet Korean man who lay down when we cleared the breakwater and did not get up again." },
          { t: "img", query: "Golden Bridge Vladivostok", alt: "Vladivostok from the water, the bridge over the bay" },
          { t: "p", text: "The traders had a card game. I never understood the rules, and I want to be clear that this was not a language problem — I am fairly sure the rules changed depending on who was winning, and that this was the point." },
          { t: "p", text: "Around midnight the sea got rough enough that cards started sliding off the little table, and instead of stopping they simply moved the whole game onto the floor and carried on, and somebody produced a bottle, and at some point I was taught to say something in Russian that made all four of them laugh very hard and that I have deliberately never looked up." },
          { t: "quote", text: "You do not need to know the rules. You need to know when to put a card down." },
          { t: "p", text: "In the morning Vladivostok came up out of the mist looking like a city drawn from a half-remembered description of San Francisco, and the four of them shook my hand one at a time on the car deck, seriously, like it had been a longer voyage than it was." },
        ],
      },
      {
        title: "Watching the Sunrise with Forty Strangers",
        place: "Ulleungdo",
        country: "KR",
        daysAgo: 71,
        coverQuery: "Ulleungdo South Korea",
        blocks: [
          { t: "p", text: "Somebody on the ferry mentioned that people walk up to the eastern point for sunrise. I assumed this meant a handful of people. At five in the morning there were about forty of us on the path, in silence, in a queue, like a very calm and slightly sleepy procession." },
          { t: "img", query: "Ulleungdo island cliffs", alt: "Ulleungdo's cliffs dropping into the sea" },
          { t: "p", text: "Nobody talked on the way up. At the top an older man handed round boiled eggs from a plastic bag to anyone who wanted one, which he had clearly brought for exactly this purpose, and which felt like the most organised act of kindness I have ever witnessed." },
          { t: "p", text: "The sun came up out of an empty sea with nothing between us and Japan. Forty people watched it without taking out their phones for the first minute or so, which I noticed, and which I have thought about since." },
        ],
      },
    ],
  },

  {
    handle: "nadia",
    name: "Nadia Haddad",
    email: "nadia@seed.local",
    bio: "Port cities and long lunches. Based in Marseille, usually not in Marseille.",
    home: "France",
    stories: [
      {
        title: "The Fisherman Who Made Me Lunch",
        place: "Essaouira",
        country: "MA",
        daysAgo: 11,
        coverQuery: "Essaouira Morocco harbour",
        blocks: [
          { t: "p", text: "The rule at the Essaouira harbour grills is that you buy the fish and they cook it. What is not written anywhere is that if you look uncertain for long enough, somebody will simply take over." },
          { t: "img", query: "Essaouira fishing boats", alt: "Blue fishing boats crowded into Essaouira harbour" },
          { t: "p", text: "His name was Hicham, he had already sold his catch, and he had nothing in particular to do. He picked the sardines. He argued about the sardines. He walked them to the grill, said something to the man there, and then sat down opposite me as though we had arranged this weeks ago." },
          { t: "img", query: "grilled sardines Morocco", alt: "Sardines on the grill, lemon blackening beside them" },
          { t: "quote", text: "You were going to buy the ones at the front. Never buy the ones at the front." },
          { t: "p", text: "We ate with our hands off paper, in the wind, and he told me about his brother in Marseille — twenty minutes from where I live — and made me promise to call him, and I did, and I have since had dinner at his brother's house twice." },
          { t: "p", text: "It cost about three euros. I have spent a great deal more on a great deal less." },
        ],
      },
      {
        title: "Sunday Lunch in Naples, Four Hours Long",
        place: "Naples",
        country: "IT",
        daysAgo: 33,
        coverQuery: "Naples Italy",
        blocks: [
          { t: "p", text: "I was renting a room above a bakery in Sanità, and on my second Sunday the woman who owned the bakery knocked and said lunch was at one. Not asked. Said." },
          { t: "img", query: "Rione Sanità Naples", alt: "A street in the Sanità, washing strung between balconies" },
          { t: "p", text: "There were fourteen people and one table that was not built for fourteen people. I was put between a nine-year-old and a great-uncle, neither of whom spoke any English, both of whom talked to me continuously for four hours." },
          { t: "h", text: "Things that happened" },
          { t: "list", items: [
            "Three separate people told me I was too thin. This appears to be universal.",
            "A disagreement about a football match from 1990, conducted at full volume, resolved by the great-uncle standing up and leaving the room, and then coming back.",
            "The nine-year-old taught me eleven Neapolitan words, of which I later learned four were rude.",
          ] },
          { t: "quote", text: "Everyone warns you about Naples. They are describing a city they spent one afternoon in." },
          { t: "p", text: "I stayed three more weeks and had lunch there every Sunday. The bakery opened at four in the morning and I learned to sleep through it by the second week, and to miss it by the fourth." },
        ],
      },
      {
        title: "A Week of Trains and the People on Them",
        place: "Sicily",
        country: "IT",
        daysAgo: 84,
        coverQuery: "Sicily coast Italy",
        blocks: [
          { t: "p", text: "Sicilian trains are slow, infrequent, and occasionally imaginary. I spent a week using nothing else, and the reason I would do it again has almost nothing to do with the trains." },
          { t: "img", query: "Cefalù Sicily", alt: "Cefalù from the water, the cathedral above the old town" },
          { t: "h", text: "The driver who stopped for coffee" },
          { t: "p", text: "The Circumetnea is a single-carriage narrow-gauge line that goes around Etna through lava fields and pistachio groves. At Randazzo the driver got out and had a coffee. Not a scheduled stop for coffee — a scheduled stop, during which he had one. Two passengers joined him. The train left when he was finished, and nobody except me found this remarkable." },
          { t: "img", query: "Mount Etna Sicily", alt: "Etna from the train, snow above a hazy coast" },
          { t: "h", text: "The woman with the peaches" },
          { t: "p", text: "Between Taormina and Catania a woman got on with a crate of peaches, sat opposite me, looked at me for about a stop and a half, and then handed me one without saying anything. When I tried to thank her she waved it off like I had thanked her for the weather." },
          { t: "quote", text: "The volcano does not appear. At some point you realise you have been looking at it for ten minutes." },
          { t: "p", text: "Six trains, one bus I had to take because a train simply did not exist that day, and four conversations I could not have had in a car. I saw less of Sicily than driving would have shown me and noticed considerably more of it." },
        ],
      },
    ],
  },

  {
    handle: "ellis",
    name: "Ellis Warr",
    email: "ellis@seed.local",
    bio: "Walking, mostly in the rain, mostly in Scotland and Wales. Bristol.",
    home: "United Kingdom",
    stories: [
      {
        title: "Five of Us in a Bothy in the Rain",
        place: "Knoydart",
        country: "GB",
        daysAgo: 16,
        coverQuery: "Knoydart mountains Scotland",
        blocks: [
          { t: "p", text: "Sourlies bothy sits at the head of Loch Nevis and can only be reached on foot or by boat. I arrived wet through at six in the evening, having fallen over twice, and found four people already there and a fire already going." },
          { t: "img", query: "Loch Nevis Scotland view", alt: "Loch Nevis, mountains dropping straight into the water" },
          { t: "p", text: "Nobody asked my name for about an hour. Somebody handed me a mug of tea roughly forty seconds after I came through the door, which is the correct order of operations." },
          { t: "h", text: "The evening" },
          { t: "p", text: "A German couple on their honeymoon, walking the whole trail, extremely organised. A man from Glasgow who had come in by boat with a disproportionate amount of whisky and no real plan. A woman who said almost nothing for two hours and then told the single funniest story I have heard about a stag party in Fort William." },
          { t: "p", text: "We dried things that would not dry. The rain did not stop once. At some point the Glaswegian produced a harmonica, played it badly for ninety seconds, was booed, and put it away with great dignity." },
          { t: "quote", text: "There is no bad weather. Only people who have not been handed a mug of tea yet." },
          { t: "p", text: "In the morning everyone left in four different directions within twenty minutes of each other, and that was that. I have never seen any of them again. It remains one of the best nights I have had indoors or out." },
        ],
      },
      {
        title: "The Man Who Walked With Me for Six Miles",
        place: "Rhinogydd",
        country: "GB",
        daysAgo: 58,
        coverQuery: "Rhinog mountains Wales",
        blocks: [
          { t: "p", text: "The Rhinogydd are the least walked mountains in Snowdonia, the ground is appalling, and in four days I saw two people. One of them was lost. The other one was Gareth." },
          { t: "img", query: "Snowdonia mountains Wales view", alt: "Heather and broken rock, cloud on the ridge" },
          { t: "p", text: "He appeared out of the cloud somewhere near Rhinog Fawr, said the visibility was a disgrace, and then walked with me for six miles without either of us suggesting it. He was seventy-one. He had been coming here since he was nineteen." },
          { t: "p", text: "He told me which boulder fields to avoid, which ones the map lies about, and where the old drovers' road runs under the heather if you know to look for the stones. None of this is written down anywhere I have found." },
          { t: "quote", text: "The map is honest about the height. It is a complete liar about the ground." },
          { t: "p", text: "At the col he turned north and I turned south and he said good luck without breaking stride. I did not get his surname. I have looked for him on two subsequent trips." },
        ],
      },
      {
        title: "Winter coast path, notes so far",
        place: "Pembrokeshire",
        country: "GB",
        daysAgo: null,
        coverQuery: "Pembrokeshire coast path",
        blocks: [
          { t: "p", text: "Draft — three sections walked, six to go. Mostly a list of which pubs were open in February, which turns out to be the real route-planning problem, and of the landlady at Solva who let me dry my boots by her fire for an hour." },
        ],
      },
    ],
  },
];
