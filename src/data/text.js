// =================== TEXT POOLS (EN / DE) ===================
// German side is Pfälzisch dialect where it is flavour; English side translates.
import { SEGS } from "../world/world.js";

export const L2 = (en, de) => ({ en, de });

export const PED_LINES = [
  L2("Hey, how’s it going?", "Ei gude wie?"),
  L2("Come on, let’s go!", "Alla hopp!"),
  L2("The train will be late anyway.", "Die Bahn kommt eh zu spät."),
  L2("The Betze is on fire!", "Betze brennt!"),
  L2("Got any bottles to return?", "Hesch Pfand?"),
  L2("It’s raining again.", "Es rejent schon widder."),
  L2("Everything’s closed on Sundays.", "Sonntags is alles zu."),
  L2("Potatoes with quark!", "Grumbeere mit Quark!"),
  L2("We’re from the Palatinate.", "Mir sin Pälzer."),
  L2("Deposit? Three months’ rent.", "Kaution? Drei Kaltmieten."),
  L2("Where’s Fackelstraße again?", "Wo is’n do die Fackelstroß?"),
  L2("Separate your rubbish, young one!", "Mülltrennung, junger Mensch!"),
  L2("Yep.", "Ei jo."),
  L2("Steamed dumplings today!", "Heit gibt’s Dampfnudle!"),
  L2("Is that your bike?", "Is des dei Fahrrad?"),
  L2("Lovely weather for a Schorle.", "Schee Wetter fer e Schorle."),
  L2("The bus? Maybe tomorrow.", "De Bus? Vielleicht morje."),
  L2("My wife says I talk too much. I disagree, at length.", "Mei Fraa sagt, ich babbel zu viel. Ich widerspreche ausführlich."),
  L2("My husband is doing Saumagen tonight. Pray for us.", "Mein Mann macht heut Saumagen. Betet für uns."),
  L2("My girlfriend parked the car. Somewhere.", "Mei Freundin hot’s Auto geparkt. Irgendwo."),
  L2("My boyfriend thinks Pfälzisch is a language. He’s right.", "Mein Freund meint, Pälzisch is e Sprooch. Recht hot er."),
  L2("Pride parade on Saturday! Bring glitter.", "Samstag is CSD! Glitzer mitbringe!"),
  L2("They/them, and today: very hungry.", "They/them, und heut: sehr hungrig."),
  L2("My dads still think the FCK goes up this year.", "Mei zwei Babbas glaawe, de FCK steigt dies Johr uff."),
  L2("I came for one semester. That was 1998.", "Ich bin for ee Semester kumme. Des war 1998."),
  L2("This Schorle is for medical reasons.", "Die Schorle is aus medizinische Gründ."),
  L2("I recycle. Mostly my old excuses.", "Ich recycle. Meischtens mei alde Ausrede."),
  L2("Is it Feierabend yet? No? Pity.", "Is schon Feierabend? Nää? Schad."),
  L2("I’m not lost, I’m exploring Lautern.", "Ich hab mich net verloff, ich erkunde Lautern."),
  L2("Grandma does yoga now. Grandpa does commentary.", "Oma macht jetzt Yoga. Opa kommentiert."),
  L2("Three euros for a coffee? In this economy?", "Drei Euro fer en Kaffee? Bei dene Preise?"),
  L2("Hi! Lovely earrings!", "Ei gude! Schee Ohrringe!"),
  L2("My cat runs this household. I just pay rent.", "Mei Katz regiert de Haushalt. Ich zahl nur Miete."),
];
/** Overheard when it rains. */
export const RAIN_LINES = [
  L2("Four o’clock. Of course it’s raining.", "Viere. Klar rejent’s."),
  L2("My umbrella has given up on life.", "Mei Schirm hot uffgebb."),
  L2("Wet socks. My favourite.", "Nasse Socke. Mei Lieblingsgefühl."),
  L2("Good for the vineyards, they say.", "Gut fer die Wingert, sage se."),
];
/** Overheard at night. */
export const NIGHT_LINES = [
  L2("One more Schorle and then home. Probably.", "Noch ee Schorle, dann hääm. Wahrscheinlich."),
  L2("Who’s up for Döner?", "Wer will noch Döner?"),
  L2("Shh! People are sleeping!", "Pssst! Do schlofe Leit!"),
  L2("The night bus is a myth.", "De Nachtbus is e Legende."),
];
/** You bumped into someone on foot. */
export const BUMPED = [
  L2("Hey, watch it!", "Hee, pass uff!"),
  L2("Ouch! My Saumagen!", "Autsch! Mei Saumage!"),
  L2("Sorry! Oh wait, that was you.", "Sorry! Ach ne, des warsch du."),
  L2("Eyes up, phone down!", "Aage uff, Handy weg!"),
  L2("Do I look like a revolving door?", "Seh ich aus wie e Drehtür?"),
  L2("Personal space, please!", "Abstand, bitte!"),
];
/** A driver whose way you blocked on foot. */
export const DRIVER_AT_PLAYER = [
  L2("Hey! It’s a road, not a catwalk!", "Hee! Des is e Strooß, ke Laufsteg!"),
  L2("Do you want to be a bonnet ornament?!", "Willsch du Kühlerfigur werre?!"),
  L2("The crossing is RIGHT THERE!", "Do vorne is de Zebrastreife!"),
  L2("Are you tired of living?!", "Ei, bisch du lebensmüd?!"),
  L2("Move it, I’m late for my Schorle!", "Mach Platz, mei Schorle wart!"),
  L2("Unbelievable. Every single day.", "Unglaablich. Jeden Daach."),
];
/** A driver at a jaywalking pedestrian. */
export const DRIVER_AT_PED = [
  L2("The light is red for YOU!", "Fer DICH is rot!"),
  L2("Look left, look right, then walk!", "Links gucke, rechts gucke, dann laafe!"),
  L2("I nearly had a heart attack!", "Ich hätt fast en Herzkasper kriet!"),
  L2("Typical Lautern!", "Typisch Lautern!"),
];
/** A jaywalker answering the honk. */
export const PED_ANSWER = [
  L2("Yeah, yeah, I’m going!", "Jo jo, ich geh jo schon!"),
  L2("Relax, it’s a 30 zone!", "Ganz ruhig, des is e Dreißiger-Zon!"),
  L2("Nobody’s in a hurry in Lautern!", "In Lautern hot’s keener eilig!"),
  L2("Honk at your own grandma!", "Hup doch dei Oma aa!"),
  L2("Sorry! Sorry!", "Entschuldigung! ’tschuldigung!"),
];
/** Drivers stuck behind your parked car. */
export const DRIVER_BLOCKED = [
  L2("Move your car, Sunday driver!", "Fahr weg, Sunndaagsfahrer!"),
  L2("Today would be nice!", "Heit wär schee!"),
  L2("Is this a car park now?!", "Is des jetzt en Parkplatz?!"),
  L2("I can wait. I can’t, actually.", "Ich kann waarde. Kann ich net."),
];
/** Two passers-by chatting: [opener, reply]. */
export const CONVOS = [
  [L2("Coming to the Pride parade?", "Kummsch zum CSD?"), L2("Obviously. My rainbow is ironed.", "Logisch. De Regenboge is gebügelt.")],
  [L2("Is the 105 coming?", "Kummt de 105?"), L2("Define ‘coming’.", "Was heeßt ‘kumme’?")],
  [L2("My boyfriend cooked for my parents.", "Mein Freund hot fer mei Eltern gekocht."), L2("Saumagen? Brave man. Marry him.", "Saumage? Mutiger Mann. Heirat’n.")],
  [L2("I’m Kim, they/them.", "Ich bin Kim, they/them."), L2("Gisela, she/her. And this is my Schorle.", "Gisela, sie/ihr. Un des is mei Schorle.")],
  [L2("Did you separate the rubbish?", "Hosch de Müll getrennt?"), L2("I separated it from my flat.", "Ich hab’n von meinere Wohnung getrennt.")],
  [L2("My wife wants a dog.", "Mei Fraa will en Hund."), L2("My husband wants a goat.", "Mein Mann will e Gääß.")],
  [L2("FCK wins on Saturday!", "Samstag gewinnt de FCK!"), L2("You say that every Saturday.", "Des sagsch du jeden Samstag.")],
  [L2("I’m learning German!", "Ich lern Deutsch!"), L2("Then why do you speak Pfälzisch?", "Un warum babbelsch du dann Pälzisch?")],
  [L2("Nice skirt!", "Schee Rock!"), L2("Thanks, it has pockets!", "Danke, der hot Tasche!")],
  [L2("My grandma got a tattoo.", "Mei Oma hot sich tätowiere losse."), L2("Of what?", "Was dann?"), L2("‘Saumagen forever’.", "‘Saumage forever’.")],
  [L2("Rent went up again.", "Die Miet is schon widder hoch."), L2("Three months’ deposit, too?", "Un drei Kaltmiete Kaution?")],
  [L2("Is that your wheelchair? Sick wheels!", "Is des dei Rollstuhl? Krasse Felge!"), L2("Custom rims. Faster than the bus.", "Sonderanfertigung. Schneller wie de Bus.")],
];
export const ANGRY = [
  L2("Are you crazy?!", "Ei, spinnsch du?!"),
  L2("Watch where you’re going!", "Pass doch uff!"),
  L2("You idiot!", "Du Dabbes!"),
  L2("I’m calling the Ordnungsamt!", "Ich ruf’s Ordnungsamt!"),
  L2("Stop honking!", "Hubbe net so!"),
];
export const FAN = [
  L2("The Betze is on fire!", "Betze brennt!"),
  L2("Red Devils!", "Rote Teufel!"),
  L2("One hill, one city!", "Ein Berg, eine Stadt!"),
  L2("We’re winning today!", "Heut gewinne mer!"),
];
export const HONKED = [
  L2("Stop honking!", "Hubbe net so!"),
  L2("I’m going, I’m going.", "Ich geh jo schon."),
  L2("Huh?", "Hä?"),
  L2("Quiet!", "Ruhe!"),
];
export const TIPS = [
  L2(
    "Three months’ rent as a deposit is normal here. Do not panic.",
    "Drei Kaltmieten Kaution sind hier normal. Keine Panik.",
  ),
  L2(
    "In Lautern it rains at four. Punctual, unlike the trains.",
    "In Lautern regnet’s um vier. Pünktlich, anders als die Bahn.",
  ),
  L2(
    "Bottles are money: 25 cents each at the Pfandautomat.",
    "Pfandflaschen sind Geld: 25 Cent pro Stück am Automaten.",
  ),
  L2(
    "The Rathaus is 84 metres tall. If you are lost, look up.",
    "Das Rathaus ist 84 Meter hoch. Wer sich verläuft, schaut nach oben.",
  ),
  L2(
    "The Mensa Schnitzel sells out at 11:42. Every time.",
    "Das Mensa-Schnitzel ist um 11:42 aus. Jedes Mal.",
  ),
  L2(
    "Traffic lights are real. So is the Blitzer on Mainzer Straße.",
    "Die Ampeln sind echt. Der Blitzer in der Mainzer Straße auch.",
  ),
  L2(
    "Wet roads stay slippery after the rain. Brake early.",
    "Nasse Straßen bleiben nach dem Regen rutschig. Früh bremsen.",
  ),
  L2(
    "Handbrake plus a hard turn makes the car drift.",
    "Handbremse plus scharfes Lenken bringt das Auto zum Driften.",
  ),
  L2(
    "Every mission has bonus goals. Three stars pay extra.",
    "Jede Mission hat Bonusziele. Drei Sterne bringen extra Geld.",
  ),
  L2(
    "Rain pays 25% extra on delivery jobs.",
    "Regen bringt 25 % Zuschlag bei Lieferjobs.",
  ),
];
export const ORDERS = [
  L2("2× döner, spicy, everything", "2× Döner, scharf, mit allem"),
  L2("Saumagen burger", "Saumagen-Burger"),
  L2("4× steamed dumplings with wine sauce", "4× Dampfnudeln mit Weinsoße"),
  L2("Palatinate-style pizza", "Pizza Pfälzer Art"),
  L2("Potatoes with quark", "Grumbeere mit Quark"),
  L2("Flammkuchen", "Flammkuchen"),
  L2("Wok noodles, 4th floor, no lift", "Wok-Nudeln, 4. OG ohne Aufzug"),
  L2("Bratwurst in a roll", "Bratwurst im Weck"),
  L2("Liver dumplings with sauerkraut", "Leberknödel mit Kraut"),
  L2("12 pretzels for a WG party", "12 Laugenbrezeln für die WG-Party"),
];
export const STREETS = [...new Set(SEGS.map((s) => s.n))].concat([
  "Fackelstraße",
  "Marktstraße",
  "Riesenstraße",
  "Schillerstraße",
  "Glockenstraße",
]);
// Ärger (wanted) levels
export const AL = [
  L2("", ""),
  L2("Whistle", "Pfiff"),
  L2("Ticket", "Knöllchen"),
  L2("Ordnungsamt", "Ordnungsamt"),
  L2("Patrol", "Streife"),
  L2("Front page", "Titelseite"),
];
