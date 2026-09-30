/** Seed authors and their stories. Prose is short but real -- lorem ipsum
 *  makes every layout look fine, which defeats the point of seeding. */

export type SeedBlock =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "quote"; text: string }
  | { t: "list"; items: string[] }
  | { t: "img"; alt: string };

export type SeedStory = {
  title: string;
  place: string;
  country: string;
  daysAgo: number | null; // null = draft
  blocks: SeedBlock[];
};

export type SeedAuthor = {
  handle: string;
  name: string;
  email: string;
  bio: string;
  home: string;
  hue: number;
  stories: SeedStory[];
};

export const AUTHORS: SeedAuthor[] = [
  {
    handle: "mira",
    name: "Mira Oyelaran",
    email: "mira@seed.local",
    bio: "Coastlines and the people who live on them. Currently working through West Africa, slowly.",
    home: "Nigeria",
    hue: 205,
    stories: [
      {
        title: "The Long Way to Cape Three Points",
        place: "Cape Three Points",
        country: "GH",
        daysAgo: 4,
        blocks: [
          { t: "p", text: "There is no good way to get to Cape Three Points, which is the entire reason to go. The tro-tro from Takoradi gives up at Agona Nkwanta and after that it is a question of who is driving where, and whether they like the look of you." },
          { t: "img", alt: "The track down to the cape, red earth between palms" },
          { t: "h", text: "The lighthouse" },
          { t: "p", text: "The lighthouse keeper has been there nineteen years. He let me climb it because I asked, and because it was four in the afternoon and nothing else was happening. From the top you can see the exact point where the coast stops running east and starts running north, which is the sort of geography you normally only meet on a map." },
          { t: "quote", text: "Everybody comes for the sunset. The sunrise is better and nobody is awake for it." },
          { t: "p", text: "He was right. I stayed two nights and only got up once, and I still think about it." },
        ],
      },
      {
        title: "Nine Hours in Abidjan",
        place: "Abidjan",
        country: "CI",
        daysAgo: 23,
        blocks: [
          { t: "p", text: "A layover long enough to leave the airport is a gift, provided you accept that you will see almost nothing and understand less. I had nine hours and a list of three places, and I got to one of them." },
          { t: "img", alt: "The lagoon at midday, boats crossing" },
          { t: "p", text: "The lagoon taxis cost less than a coffee and run whenever the boat is full, which is a scheduling philosophy I have come to prefer. On the water the city arranges itself into something legible: towers on one side, low tin roofs on the other, and everybody crossing between them all day long." },
        ],
      },
    ],
  },
  {
    handle: "tomas",
    name: "Tomás Iriarte",
    email: "tomas@seed.local",
    bio: "Mountains, buses, and the food you eat standing up. Writing mostly about the Andes.",
    home: "Argentina",
    hue: 25,
    stories: [
      {
        title: "Crossing at Paso de Jama",
        place: "Paso de Jama",
        country: "AR",
        daysAgo: 9,
        blocks: [
          { t: "p", text: "At four thousand metres the bus stops being a bus and becomes a small, badly heated room that happens to be moving. Everyone is quiet. Not out of awe — out of oxygen." },
          { t: "img", alt: "Salt flats on the altiplano, white to the horizon" },
          { t: "h", text: "What to bring" },
          { t: "list", items: ["More water than you think. The dry air does the work of a hot day.", "Coca leaves, which help, and which everyone offers you anyway.", "A jumper you can put on without standing up."] },
          { t: "p", text: "The border post itself is a low building with a flag and a queue, and on the far side the road drops into Chile for six hours without meeting a single town. It is the emptiest I have ever felt on a paved road." },
        ],
      },
      {
        title: "Empanadas, Ranked, Badly",
        place: "Salta",
        country: "AR",
        daysAgo: 41,
        blocks: [
          { t: "p", text: "I ate nineteen empanadas in Salta in four days and I am not qualified to rank them, which has never stopped anyone." },
          { t: "h", text: "The short version" },
          { t: "p", text: "Baked over fried, beef over everything, and the ones from the place with no sign near Mercado San Miguel over all of them. The woman making them has a rhythm you could set a metronome to and she does not look up." },
          { t: "img", alt: "A tray of empanadas coming out of the oven" },
        ],
      },
      {
        title: "Notes on a mountain I didn't climb",
        place: "Aconcagua",
        country: "AR",
        daysAgo: null,
        blocks: [
          { t: "p", text: "Draft. Went as far as Confluencia, turned around, and I'm still working out whether that's a story about a mountain or a story about knowing when to stop." },
        ],
      },
    ],
  },
  {
    handle: "seokjin",
    name: "Seok-jin Park",
    email: "seokjin@seed.local",
    bio: "Trains, ferries, and islands. Trying to get from Seoul to Lisbon without flying.",
    home: "South Korea",
    hue: 260,
    stories: [
      {
        title: "The Slow Ferry to Ulleungdo",
        place: "Ulleungdo",
        country: "KR",
        daysAgo: 2,
        blocks: [
          { t: "p", text: "Three hours from Mukho, and for two of them there is nothing at all — just the flat grey plate of the East Sea and a cabin full of people asleep on the floor because the seats are worse." },
          { t: "img", alt: "Ulleungdo rising out of the sea, cliffs straight from the water" },
          { t: "p", text: "Then the island arrives all at once. It does not fade in on the horizon the way mainland coasts do. It stands straight up out of the water, six hundred metres of it, and the boat turns along the cliffs to find the one flat place where a town could fit." },
          { t: "quote", text: "There is one road. It goes around. Eventually you come back." },
          { t: "h", text: "Getting around" },
          { t: "p", text: "The bus takes ninety minutes to circle the island and passes everything worth seeing, which makes it either the laziest sightseeing in Korea or the most efficient. I did it twice in opposite directions and they were different journeys." },
        ],
      },
      {
        title: "Sleeper Class, Seoul to Busan, the Old Way",
        place: "Busan",
        country: "KR",
        daysAgo: 62,
        blocks: [
          { t: "p", text: "The KTX does it in two and a half hours. The Mugunghwa takes five and a half and stops at places whose names I had never heard, and that is the point of it." },
          { t: "img", alt: "Rice fields from a train window at dusk" },
          { t: "p", text: "Somewhere around Daejeon the light goes orange and every window on the west side of the carriage turns into the same photograph. Nobody takes it. Everyone is on their phone. I took it." },
        ],
      },
    ],
  },
  {
    handle: "nadia",
    name: "Nadia Haddad",
    email: "nadia@seed.local",
    bio: "Port cities, markets, and long lunches. Based in Marseille, usually not in Marseille.",
    home: "France",
    hue: 160,
    stories: [
      {
        title: "A Morning at the Fish Market, Essaouira",
        place: "Essaouira",
        country: "MA",
        daysAgo: 15,
        blocks: [
          { t: "p", text: "The boats come in blue. Not painted blue in a photogenic way — blue because that is the paint the co-operative buys, and it has been the paint for forty years, and now it is the reason half the people on the quay are holding cameras." },
          { t: "img", alt: "Blue fishing boats crowded into the harbour" },
          { t: "h", text: "How it works" },
          { t: "p", text: "You pick the fish. They weigh it, you pay, and you carry it ten metres to a grill where a man cooks it for the price of a bus ticket and hands it back on paper with bread and a wedge of lemon. There is no menu because there is no decision to make." },
          { t: "img", alt: "Sardines on the grill, lemon halves blackening beside them" },
          { t: "p", text: "I ate standing up, facing the water, with the wind doing what the wind does in Essaouira, which is everything." },
        ],
      },
      {
        title: "The Wrong Side of Naples",
        place: "Naples",
        country: "IT",
        daysAgo: 88,
        blocks: [
          { t: "p", text: "Everyone warns you about Naples and everyone is describing a city they spent one afternoon in. I stayed three weeks in Sanità, above a bakery, and the worst thing that happened to me was the noise." },
          { t: "quote", text: "It is not dangerous. It is loud. People confuse the two." },
          { t: "p", text: "The bakery opened at four. I learned to sleep through it by the second week and to miss it by the fourth." },
        ],
      },
    ],
  },
  {
    handle: "ellis",
    name: "Ellis Warr",
    email: "ellis@seed.local",
    bio: "Walking routes, mostly in the rain. Bristol.",
    home: "United Kingdom",
    hue: 120,
    stories: [
      {
        title: "Four Days on the Rhinogydd",
        place: "Rhinogydd",
        country: "GB",
        daysAgo: 30,
        blocks: [
          { t: "p", text: "The Rhinogydd are the least walked mountains in Snowdonia and there is a reason: the ground is appalling. Heather to the knee, boulder fields under the heather, and no path worth the name for hours at a time." },
          { t: "img", alt: "Heather and broken rock, cloud sitting on the ridge" },
          { t: "p", text: "In four days I saw two people. Both were lost. One cheerfully." },
          { t: "h", text: "Would I go back" },
          { t: "p", text: "Yes, and I would take two extra days, and I would stop pretending the map's timings apply to terrain like this. Everything took half again as long as it should have and I was never once bored." },
        ],
      },
      {
        title: "The Severn Bore, Fourth Attempt",
        place: "Gloucestershire",
        country: "GB",
        daysAgo: 120,
        blocks: [
          { t: "p", text: "A tidal wave that runs up a river twice a day, and it had taken me three tries to stand in the right place at the right hour. The first two times I was a mile off. The third time I was on time and it was small." },
          { t: "img", alt: "The bore coming upriver, surfers ahead of it" },
          { t: "p", text: "The fourth time it arrived like a rumour that turned out to be true — a line across the water, then noise, then surfers going past at the speed of a bicycle, upstream, on a river that had been flowing the other way sixty seconds earlier." },
        ],
      },
      {
        title: "Winter coast path, notes so far",
        place: "Pembrokeshire",
        country: "GB",
        daysAgo: null,
        blocks: [
          { t: "p", text: "Draft — three sections walked, six to go. Mostly a list of which pubs were open in February, which turns out to be the real route-planning problem." },
        ],
      },
    ],
  },
];
