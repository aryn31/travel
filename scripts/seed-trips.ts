/**
 * Longer-form trip narratives, keyed by author handle. The vignettes in
 * seed-content.ts all land at "1 min", which makes every list look identical
 * and hides how the layout copes with a real 2,000-word account. These are
 * full trips: getting there, the days in order, and what it cost you.
 */
import type { SeedStory } from "./seed-content";

export const TRIP_STORIES: Record<string, SeedStory[]> = {
  mira: [
    {
      title: "Eleven Days Down the Coast: Accra to Ouidah",
      place: "Ouidah",
      country: "BJ",
      daysAgo: 12,
      blocks: [
        { t: "p", text: "The plan, such as it was, fitted on the back of a receipt: get from Accra to Ouidah without flying, take as long as it takes, and stop wherever the road gives you a reason. It took eleven days. The reasons were mostly food." },
        { t: "img", alt: "The coast road east of Accra, palms and a hard blue sea" },
        { t: "p", text: "Three borders in eleven days sounds like a lot until you see how close together they sit. Ghana into Togo is forty kilometres of coast. Togo into Benin is less. You can cross two countries in an afternoon and still be looking at the same ocean, and that is the strange thing about this stretch — the colonial borders cut across a coastline that has been one continuous conversation for centuries." },

        { t: "h", text: "Days one to three: Accra, and leaving it" },
        { t: "p", text: "I gave myself two days in Accra and used both of them badly, in the good way. Jamestown in the morning, when the boats come in and the whole beach is working. Makola in the afternoon, which I do not recommend unless you enjoy being moved through a crowd like water through a pipe." },
        { t: "p", text: "The tro-tro station at Tudu is the real departure point for anything east. There are no timetables. There is a man shouting the destination, and when the bus is full it goes. I waited fifty minutes for Aflao, which is the border, and the man shouting was cheerful about it the entire time." },
        { t: "quote", text: "It leaves when it leaves. Sit down, you will not miss it." },

        { t: "h", text: "Day four: the Aflao crossing" },
        { t: "p", text: "The Ghana–Togo border at Aflao is a street. Not a metaphor — an actual street, with shops on both sides, and somewhere in the middle of it a line that changes which currency people quote at you. The formalities took twenty minutes on the Ghana side and ten on the Togo side, and then I was in Lomé, which begins immediately. There is no approach to Lomé. You cross the border and you are in the capital." },
        { t: "img", alt: "Motorbike taxis waiting at the Lomé side of the crossing" },
        { t: "p", text: "Lomé's beach road runs the whole length of the city with the port at one end and the Ghana border at the other. I walked it twice. Both times a zemidjan driver slowed alongside to ask, with genuine confusion, why." },

        { t: "h", text: "Days five to seven: Togoville and the lake" },
        { t: "p", text: "Thirty kilometres inland, Lake Togo is the reason the country has its name, and Togoville on the north shore is where the German treaty was signed in 1884 — a fact the village mentions the way you might mention a distant relative who caused some trouble." },
        { t: "p", text: "You cross by pirogue. It takes forty minutes and costs almost nothing, and the boatman poles standing up the entire way. On the far side a man showed me the cathedral, the sacred forest, and the monument, in that order, with equal enthusiasm for all three." },
        { t: "list", items: [
          "Stay overnight if you can. The day-trippers leave at four and the lake goes completely still.",
          "The pirogue does not run in heavy wind. Ask before you commit to a return that evening.",
          "Bring small notes. Nobody at any point in eleven days had change for anything.",
        ] },

        { t: "h", text: "Days eight to eleven: into Benin, and Ouidah" },
        { t: "p", text: "The Togo–Benin border at Hillacondji is quieter than Aflao and slower for it — the officials have time to be thorough because nobody is queueing behind you. Then Grand-Popo, which is a beach and a river mouth and almost nothing else, and which I had meant to pass through in an afternoon. I stayed two nights." },
        { t: "img", alt: "The river mouth at Grand-Popo, late afternoon" },
        { t: "p", text: "Ouidah is the end of the road in more than one sense. The Route des Esclaves runs four kilometres from the town to the beach, and at the end of it stands the Door of No Return, facing an ocean that a million people were forced across. You walk it in an hour. It is not a thing you visit so much as a thing you submit to." },
        { t: "p", text: "I sat on the sand afterwards for a long time and did not take a photograph, which is the only editorial decision in this piece I am completely sure about." },

        { t: "h", text: "What it cost" },
        { t: "p", text: "Eleven days, three countries, roughly £240 including everything — transport, rooms, food, the two nights I had not planned in Grand-Popo. Nothing was booked in advance. Nothing needed to be. The single most useful thing I carried was a phrasebook of about forty words of French, used badly, to universal patience." },
      ],
    },
  ],

  tomas: [
    {
      title: "Twenty-Two Hours to Bariloche",
      place: "Bariloche",
      country: "AR",
      daysAgo: 34,
      blocks: [
        { t: "p", text: "There is a flight from Buenos Aires to Bariloche that takes two hours and twenty minutes. I took the bus, which takes twenty-two, because I wanted to see the thing that everybody flies over: the middle." },
        { t: "img", alt: "Retiro bus terminal at night, platforms lit under a low roof" },

        { t: "h", text: "The seat" },
        { t: "p", text: "Argentine long-distance buses have a class called cama suite, which reclines to fully flat and comes with a meal and, on some companies, a glass of appalling sparkling wine. It costs about a third of the flight. I have slept worse on aeroplanes and paid more for the privilege." },
        { t: "p", text: "The bus left Retiro at six in the evening. By nine the city was gone and the pampas had started, and the pampas do not stop. For six hours there is nothing outside the window but flat dark and the occasional set of headlights going the other way." },

        { t: "h", text: "Somewhere around Neuquén" },
        { t: "p", text: "I woke at six with the blind half up and the landscape completely changed. The grass had gone. In its place: scrub, red rock, and a horizon that had acquired teeth. This is where Patagonia starts, and it starts abruptly, the way a room gets cold when a door opens." },
        { t: "img", alt: "Patagonian steppe from the bus window, scrub and red rock" },
        { t: "quote", text: "Nobody flies over Patagonia and understands how big it is. You have to be bored by it first." },
        { t: "p", text: "For the next eight hours the view changed about four times. Steppe, then a river valley with poplars planted in windbreak rows, then steppe again, then — suddenly, ridiculously — lakes and pines and mountains with snow on them, and the bus came down into Bariloche past water the colour of a swimming pool." },

        { t: "h", text: "Was it worth it" },
        { t: "p", text: "Twenty-two hours to save about ninety pounds is not a good hourly rate. But I arrived understanding where I was in a way that no flight has ever given me: I had watched the country change under me for a thousand kilometres, and when someone in Bariloche said the word Patagonia I had a picture in my head that I had earned." },
        { t: "list", items: [
          "Book cama suite, not semi-cama. The price difference is small and the sleep difference is not.",
          "Sit on the left going south for the afternoon light on the cordillera.",
          "The onboard food is a formality. Buy something at Retiro.",
        ] },
      ],
    },
  ],

  seokjin: [
    {
      title: "No Flights: Seoul to Vladivostok, and What Came After",
      place: "Vladivostok",
      country: "RU",
      daysAgo: 52,
      blocks: [
        { t: "p", text: "The project is to get from Seoul to Lisbon without flying. This is the first leg, and it is the one everybody assumes is impossible, because a glance at a map suggests that leaving Korea by land means crossing a border that has been shut since 1953." },
        { t: "p", text: "It does. So you leave by sea." },
        { t: "img", alt: "The ferry terminal at Donghae, gantries and a grey morning" },

        { t: "h", text: "The boat" },
        { t: "p", text: "The DBS Ferry runs from Donghae on the east coast to Vladivostok, via Sakaiminato in Japan, once a week. It takes about twenty-four hours to Russia if the weather behaves. The East Sea in autumn does not reliably behave." },
        { t: "p", text: "I had a berth in a six-person cabin with four Russian traders and a Korean man who did not speak for the entire crossing and who I suspect was seasick from the moment we cleared the breakwater. The traders were delightful. They had a card game I never understood and a bottle they were generous with." },
        { t: "quote", text: "Twenty-four hours is short for a sea crossing and long for a room with six people in it." },

        { t: "h", text: "Arriving" },
        { t: "p", text: "Vladivostok from the water looks like San Francisco drawn from memory — hills, a long suspension bridge, cranes. Immigration took ninety minutes and consisted mostly of waiting while someone found the right stamp." },
        { t: "img", alt: "The Golden Bridge over the Zolotoy Rog, seen from the water" },
        { t: "p", text: "And then you are standing at kilometre 9,288, which is the far end of the Trans-Siberian, marked by a stone obelisk at the end of the platform that people photograph with the seriousness of a summit marker. Which, in a way, it is. Everything west of here is one railway." },

        { t: "h", text: "What the leg actually costs" },
        { t: "list", items: [
          "Ferry, Donghae to Vladivostok, berth in a shared cabin: about £160.",
          "Two nights in Donghae waiting for a weekly sailing: unavoidable, budget for it.",
          "Russian visa: the genuinely hard part, and the reason this leg needs three months of lead time, not three weeks.",
        ] },
        { t: "p", text: "People ask whether the no-flying rule is a gimmick. It might be. But a flight from Seoul to Vladivostok is two hours of nothing, and this was four days of a sea I had only ever seen from the shore, a card game I lost repeatedly, and an obelisk at the end of a platform that made the whole continent feel suddenly, alarmingly connected." },
        { t: "h", text: "Next leg" },
        { t: "p", text: "Vladivostok to Irkutsk, three nights on the train, in a month. I am told to bring slippers and not to be the person who does not bring food to share." },
      ],
    },
  ],

  nadia: [
    {
      title: "A Week of Trains Through Sicily",
      place: "Sicily",
      country: "IT",
      daysAgo: 68,
      blocks: [
        { t: "p", text: "Sicilian trains have a reputation, and the reputation is that they are slow, infrequent, and occasionally imaginary. All three are true. I spent a week using nothing else and would do it again immediately." },
        { t: "img", alt: "A single-carriage train waiting at a small Sicilian station" },
        { t: "p", text: "The case for the train here is not speed. It is that the line hugs the coast for most of its length, at a height of about four metres, so for hours at a time there is nothing between you and the Tyrrhenian but a window and some salt." },

        { t: "h", text: "Palermo to Cefalù" },
        { t: "p", text: "Forty-five minutes, several times a day, and the best value in Italian transport. Cefalù is a cathedral, a crescent of beach and a rock, arranged so neatly that it looks staged. Go early; by noon the day-trippers from Palermo have arrived and the old town becomes a queue with buildings on either side." },

        { t: "h", text: "Cefalù to Catania, the long way" },
        { t: "p", text: "This is where the network starts testing you. The direct-ish route runs along the north coast to Messina and then down the east, four and a half hours with a change, and the timetable is a suggestion. What you get in return is the run south from Messina with Calabria across the strait on one side and, eventually, Etna filling the entire window on the other." },
        { t: "img", alt: "Etna from the train, snow on the summit above a hazy coast" },
        { t: "quote", text: "The volcano does not appear. It is simply, at some point, already there, and you realise you have been looking at it for ten minutes." },

        { t: "h", text: "The Circumetnea" },
        { t: "p", text: "A separate narrow-gauge line that goes around Etna rather than past it — three and a half hours, one carriage, through lava fields and pistachio groves and towns built entirely from black stone. It is the single best train journey in Sicily and almost nobody takes it, because it does not go anywhere you need to be." },
        { t: "p", text: "The driver stopped at Randazzo for a coffee. Not a scheduled stop for coffee — a scheduled stop, during which he got off and had a coffee. Two passengers joined him. The train left when he was finished." },

        { t: "h", text: "Practicalities" },
        { t: "list", items: [
          "Buy tickets at the machine or the counter; regional trains are not bookable in advance and do not need to be.",
          "Validate the paper ticket before boarding. The fine for not doing so is enforced with enthusiasm.",
          "Sunday services thin out to almost nothing. Plan the week around it or lose a day.",
          "Sit on the right from Messina to Catania.",
        ] },
        { t: "p", text: "Seven days, six trains, one bus I had to take because a train simply did not exist that day. I saw less of Sicily than a car would have shown me and considerably more of it than I would have noticed." },
      ],
    },
  ],

  ellis: [
    {
      title: "The Cape Wrath Trail, In Pieces",
      place: "Cape Wrath",
      country: "GB",
      daysAgo: 96,
      blocks: [
        { t: "p", text: "The Cape Wrath Trail is not a trail. There is no waymarking, no official route, and in several places no path. It runs roughly two hundred miles from Fort William to the northwest corner of Scotland, and the standard advice is to allow three weeks and expect to be wet for most of them." },
        { t: "p", text: "I do not have three weeks. I have had, over two years, four separate weeks, and I have walked it in pieces, out of order, in whatever weather the calendar handed me." },
        { t: "img", alt: "Glen Dessarry under low cloud, the path lost in wet ground" },

        { t: "h", text: "Section one: Fort William to Glenfinnan" },
        { t: "p", text: "Everyone starts here and everyone is cheerful, because the first day is easy and the ferry across Loch Linnhe feels like a ceremony. By Cona Glen the ground has already started doing the thing it will do for two hundred miles, which is absorb water and give none of it back." },

        { t: "h", text: "Section two: Glen Dessarry, and the bit nobody enjoys" },
        { t: "p", text: "The stretch from Glenfinnan to Sourlies is where the trail stops being a walk and becomes a negotiation. Glen Dessarry in rain is a bog with ambitions. It took nine hours to cover fourteen miles and I fell over twice, once quite slowly, in full view of two people who were kind enough to wait until I was upright before laughing." },
        { t: "quote", text: "There is no bad weather, only inadequate expectations." },
        { t: "p", text: "Sourlies bothy sits at the head of Loch Nevis and can only be reached on foot or by boat. There were five of us that night, drying things that would not dry, and it was one of the best evenings I have had anywhere." },

        { t: "h", text: "Section three: Knoydart to Shiel Bridge" },
        { t: "img", alt: "Barisdale Bay at low tide, mountains dropping straight into the sea" },
        { t: "p", text: "Knoydart calls itself Britain's last wilderness, which is marketing, but only just. There is one village, no road to it, and a pub that is genuinely the remotest on the mainland. The walk over Mam Barrisdale and down to Barisdale Bay is the most beautiful thing on the whole route and I have now done it twice in cloud." },

        { t: "h", text: "Section four: the north, and the lighthouse" },
        { t: "p", text: "The last days are a different landscape entirely — no more steep-sided glens, just enormous open country with single mountains standing in it like furniture in an empty room. Suilven. Arkle. Foinaven. And then Sandwood Bay, which you reach after four miles of moor and which is, without qualification, the finest beach in Britain." },
        { t: "img", alt: "Sandwood Bay, empty sand and the sea stack at the south end" },
        { t: "p", text: "From Sandwood it is eight miles of pathless moor to the lighthouse at Cape Wrath. There is no ceremony at the end. There is a lighthouse, a small café that may or may not be open, and a minibus that takes you back across the bombing range to the ferry." },

        { t: "h", text: "What I would tell someone starting" },
        { t: "list", items: [
          "Waterproof socks are not a gimmick. Your boots will be full of water by day two regardless.",
          "Bothies are not accommodation, they are shelter. Carry a tent anyway.",
          "The Harvey maps cover the route properly; the OS ones will have you navigating across three sheets.",
          "Doing it in pieces is not cheating. It is the reason I have finished it and most people I met that first week have not.",
        ] },
      ],
    },
  ],
};
