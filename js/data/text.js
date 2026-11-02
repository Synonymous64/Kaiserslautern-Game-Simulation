"use strict";
// =================== TEXT POOLS (EN / DE) ===================
// German side is Pfälzisch dialect where it is flavour; English side translates.
const L2 = (en, de) => ({ en, de });

const PED_LINES = [
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
];
const ANGRY = [
  L2("Are you crazy?!", "Ei, spinnsch du?!"),
  L2("Watch where you’re going!", "Pass doch uff!"),
  L2("You idiot!", "Du Dabbes!"),
  L2("I’m calling the Ordnungsamt!", "Ich ruf’s Ordnungsamt!"),
  L2("Stop honking!", "Hubbe net so!"),
];
const FAN = [
  L2("The Betze is on fire!", "Betze brennt!"),
  L2("Red Devils!", "Rote Teufel!"),
  L2("One hill, one city!", "Ein Berg, eine Stadt!"),
  L2("We’re winning today!", "Heut gewinne mer!"),
];
const HONKED = [
  L2("Stop honking!", "Hubbe net so!"),
  L2("I’m going, I’m going.", "Ich geh jo schon."),
  L2("Huh?", "Hä?"),
  L2("Quiet!", "Ruhe!"),
];
const TIPS = [
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
const ORDERS = [
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
const STREETS = [...new Set(SEGS.map((s) => s.n))].concat([
  "Fackelstraße",
  "Marktstraße",
  "Riesenstraße",
  "Schillerstraße",
  "Glockenstraße",
]);
// Ärger (wanted) levels
const AL = [
  L2("", ""),
  L2("Whistle", "Pfiff"),
  L2("Ticket", "Knöllchen"),
  L2("Ordnungsamt", "Ordnungsamt"),
  L2("Patrol", "Streife"),
  L2("Front page", "Titelseite"),
];
