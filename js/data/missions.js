"use strict";
// =================== CHAPTER 1 MISSIONS ===================
// Step types:
//   go      – reach POI `to`. Options: timer ("auto" | seconds), wait (seconds in
//             the zone), need/pay (money), cargo (start a fragile meter),
//             choice (dialog decision on arrival), skipIf(run).
//   multi   – visit every stop in any order, paying `cost` at each.
//   collect – pick up `count` items scattered inside `area`.
// Every mission has two bonus goals: completion = ★, each bonus = +★.
const NAR = L2("Narrator", "Erzähler");
const KLEIN = L2("Mr Klein (landlord)", "Herr Klein (Vermieter)");
const LENA = L2("Lena (classmate)", "Lena (Kommilitonin)");
const ADITI = "Aditi";
const OMA = "Oma Hilde";
const AMT = L2("Citizens’ Office", "Bürgeramt");

const MISSIONS = [
  // ------------------------------------------------------------------ 1
  {
    id: "anmeldung",
    title: L2("Registration", "Die Anmeldung"),
    blurb: L2(
      "In Germany you only exist once the Bürgeramt says so. Get registered.",
      "In Deutschland existierst du erst, wenn das Bürgeramt es sagt. Melde dich an.",
    ),
    intro: [
      [
        NAR,
        L2(
          "Kaiserslautern Hauptbahnhof. One backpack, one flat-share contract, zero registration.",
          "Hauptbahnhof Kaiserslautern. Ein Rucksack, ein WG-Vertrag, null Anmeldung.",
        ),
      ],
      [
        NAR,
        L2(
          "Head to the Rathaus. It is the tallest building in town; you cannot miss it.",
          "Ab zum Rathaus. Es ist das höchste Gebäude der Stadt, nicht zu übersehen.",
        ),
      ],
    ],
    steps: [
      {
        type: "go",
        to: "rathaus",
        text: L2("Go to the Bürgeramt in the Rathaus", "Geh zum Bürgeramt im Rathaus"),
        choice: {
          who: AMT,
          text: L2(
            "Ticket number 347. We are currently serving number 12.",
            "Wartenummer 347. Wir rufen gerade die 12 auf.",
          ),
          opts: [
            {
              label: L2("Take a number and wait", "Nummer ziehen und warten"),
              reply: [[L2("You", "Du"), L2("I’ll wait. Patience is a virtue.", "Ich warte. Geduld ist eine Tugend.")]],
            },
            {
              label: L2("Pay €5 for the express counter", "5 € für den Expressschalter zahlen"),
              fn: (R) => {
                R.flags.express = true;
                P.money -= 5;
              },
              reply: [[AMT, L2("Express fee received. Very efficient of you.", "Expressgebühr erhalten. Sehr effizient.")]],
            },
          ],
        },
        done: [
          [
            AMT,
            L2(
              "… but you need a Wohnungsgeberbestätigung, a signed confirmation from your landlord. Next, please.",
              "… aber Sie brauchen eine Wohnungsgeberbestätigung von Ihrem Vermieter. Nächster, bitte.",
            ),
          ],
        ],
      },
      {
        type: "go",
        to: "wg",
        text: L2("Get the landlord’s confirmation at your WG", "Hol die Wohnungsgeberbestätigung in deiner WG"),
        done: [
          [
            KLEIN,
            L2(
              "Confirmation? No problem, here. The deposit is three months’ rent. Totally normal.",
              "Bestätigung? Kein Problem, hier. Die Kaution sind drei Kaltmieten. Ganz normal.",
            ),
          ],
          [
            KLEIN,
            L2(
              "Take my old bike out front. It squeaks, but it rides.",
              "Nimm mein altes Fahrrad vor der Tür. Es quietscht, aber es fährt.",
            ),
          ],
        ],
      },
      {
        type: "go",
        to: "rathaus",
        text: L2("Back to the Bürgeramt", "Zurück zum Bürgeramt"),
      },
      {
        type: "go",
        to: "rathaus",
        wait: 10,
        skipIf: (R) => R.flags.express,
        text: L2("Wait for your number", "Warte, bis deine Nummer kommt"),
        waitText: (s) =>
          L2(
            `Now serving ${347 - Math.ceil(s / 2)}…`,
            `Aufgerufen: ${347 - Math.ceil(s / 2)} …`,
          ),
        done: [
          [AMT, L2("Number 347. … Stamped. Welcome to Kaiserslautern!", "Nummer 347. … Gestempelt. Willkommen in Kaiserslautern!")],
          [
            L2("Mum (WhatsApp)", "Mama (WhatsApp)"),
            L2("Did you eat? Sending €50 for food. Not for beer.", "Hast du gegessen? Ich schick dir 50 € fürs Essen. Nicht für Bier."),
          ],
        ],
      },
    ],
    bonus: [
      { text: L2("Done in under 4:00", "Unter 4:00 geschafft"), check: (R) => R.t < 240 },
      { text: L2("No trouble with the law", "Kein Ärger"), check: (R) => R.maxAerger === 0 },
    ],
    reward: 50,
  },
  // ------------------------------------------------------------------ 2
  {
    id: "kaution",
    title: L2("Three Months’ Rent", "Drei Kaltmieten"),
    blurb: L2(
      "Earn the first €300 of the deposit. Deliver food, return bottles, hustle.",
      "Verdiene die ersten 300 € der Kaution. Essen ausliefern, Pfand sammeln, ranklotzen.",
    ),
    intro: [
      [KLEIN, L2("The first €300 of the deposit by Friday, please.", "Die ersten 300 € der Kaution bis Freitag, bitte.")],
      [
        NAR,
        L2(
          "Open the phone (P or the phone button) and take delivery jobs. Rain pays 25% extra. Bottles help too.",
          "Öffne das Handy (P oder Handy-Knopf) und nimm Lieferjobs an. Regen bringt 25 % extra. Pfand hilft auch.",
        ),
      ],
    ],
    steps: [
      {
        type: "go",
        to: "wg",
        need: 300,
        pay: 300,
        text: L2("Have €300, then pay at your WG", "Hab 300 € und zahl in deiner WG"),
        done: [[KLEIN, L2("Wonderful. Only €1,200 to go. Kidding. Mostly.", "Wunderbar. Nur noch 1.200 €. Spaß. Größtenteils.")]],
      },
    ],
    bonus: [
      { text: L2("Finish 3 jobs during the mission", "3 Jobs während der Mission"), check: (R) => R.jobs >= 3, live: (R) => `${Math.min(3, R.jobs)}/3` },
      { text: L2("Collect 10 bottles during the mission", "10 Pfandflaschen sammeln"), check: (R) => R.bottles >= 10, live: (R) => `${Math.min(10, R.bottles)}/10` },
    ],
    reward: 0,
  },
  // ------------------------------------------------------------------ 3
  {
    id: "schnitzel",
    title: L2("Schnitzel Day", "Schnitzeltag"),
    blurb: L2("The Mensa has Schnitzel today. It always runs out.", "Heute gibt’s Schnitzel in der Mensa. Es ist immer zu schnell weg."),
    intro: [
      [LENA, L2("Schnitzel day at the Mensa! If you’re late it’s gone. Go, go, go!", "Schnitzeltag in der Mensa! Wer zu spät kommt, kriegt nix. Los, los, los!")],
    ],
    steps: [
      {
        type: "go",
        to: "mensa",
        timer: "auto",
        text: L2("Reach the Mensa before the Schnitzel runs out", "Erreiche die Mensa, bevor das Schnitzel aus ist"),
        timeout: L2("The last Schnitzel just left the counter.", "Das letzte Schnitzel ist weg."),
        choice: {
          who: L2("Mensa till", "Mensa-Kasse"),
          text: L2("Schnitzel? Sold out. Since 11:42. Semolina pudding with cherries instead?", "Schnitzel? Aus. Seit 11:42. Grießbrei mit Kirschen?"),
          opts: [
            {
              label: L2("Yes please (€2.40, +30 energy)", "Ja, bitte (2,40 €, +30 Energie)"),
              fn: () => {
                P.money -= 2.4;
                P.energy = Math.min(100, P.energy + 30);
              },
              reply: [[LENA, L2("Classic. Grießbrei is the real Lautern experience.", "Klassiker. Grießbrei ist das echte Lautern-Erlebnis.")]],
            },
            {
              label: L2("No thanks, I’ll suffer", "Nein danke, ich leide lieber"),
              reply: [[LENA, L2("Bold. I’ll eat yours then.", "Mutig. Dann ess ich deins.")]],
            },
          ],
        },
      },
    ],
    bonus: [
      { text: L2("Arrive with 15 s to spare", "Mit 15 s Reserve ankommen"), check: (R) => R.timeLeft >= 15 },
      {
        text: L2("Arrive by bike or e-scooter", "Mit Rad oder E-Scooter ankommen"),
        check: (R) => R.vehicle === "bike" || R.vehicle === "escooter",
      },
    ],
    reward: 40,
  },
  // ------------------------------------------------------------------ 4
  {
    id: "bummelbahn",
    title: L2("The Slow Train", "Die Bummelbahn"),
    blurb: L2("Pick up your friend from the train. Allegedly on time.", "Hol deine Freundin vom Zug ab. Angeblich pünktlich."),
    intro: [
      [
        L2("Aditi (WhatsApp)", "Aditi (WhatsApp)"),
        L2("My train reaches the Hbf in 10 minutes! Pick me up? I want to see the Gartenschau.", "Mein Zug ist in 10 Minuten am Hbf! Holst du mich ab? Ich will zur Gartenschau."),
      ],
    ],
    steps: [
      {
        type: "go",
        to: "hbf",
        text: L2("Go to the Hauptbahnhof", "Geh zum Hauptbahnhof"),
        done: [
          [
            L2("Announcement", "Durchsage"),
            L2(
              "Information on RE 4: about 20 minutes late today. Reason: operational delays.",
              "Information zu RE 4: heute circa 20 Minuten später. Grund: Verzögerungen im Betriebsablauf.",
            ),
          ],
        ],
      },
      {
        type: "go",
        to: "hbf",
        wait: 12,
        text: L2("Wait on the platform", "Warte am Bahnsteig"),
        waitText: (s) =>
          s > 8
            ? L2("RE 4: +20 min", "RE 4: +20 Min.")
            : s > 4
              ? L2("RE 4: +25 min … wait, it’s coming!", "RE 4: +25 Min. … Moment, er kommt!")
              : L2("RE 4 arriving on platform 2", "RE 4 fährt ein auf Gleis 2"),
        done: [[ADITI, L2("Only 25 minutes late. Around here that counts as on time. Let’s go!", "Nur 25 Minuten zu spät. Hier gilt das als pünktlich. Los!")]],
      },
      {
        type: "go",
        to: "garten",
        timer: "auto",
        cargo: { label: L2("Aditi’s comfort", "Aditis Laune"), mul: 0.22 },
        text: L2("Take Aditi to the Gartenschau. Drive smoothly!", "Bring Aditi zur Gartenschau. Fahr sanft!"),
        timeout: L2("The Gartenschau closed. Aditi is not impressed.", "Die Gartenschau hat zu. Aditi ist nicht begeistert."),
        broken: L2("Aditi got out and is taking the bus. Too much crashing.", "Aditi ist ausgestiegen und nimmt den Bus. Zu viele Unfälle."),
        done: [[ADITI, L2("A Japanese garden AND dinosaurs. Okay, Lautern, I see you.", "Ein japanischer Garten UND Dinosaurier. Okay, Lautern, ich seh dich.")]],
      },
    ],
    bonus: [
      { text: L2("Keep Aditi’s comfort above 80%", "Aditis Laune über 80 %"), check: (R) => R.integrity >= 80 },
      { text: L2("No red lights run", "Keine rote Ampel überfahren"), check: (R) => R.redlights === 0 },
    ],
    reward: 80,
  },
  // ------------------------------------------------------------------ 5
  {
    id: "wgparty",
    title: L2("WG Party Run", "Einkauf für die WG-Party"),
    blurb: L2("Three shops, one shopping list, guests arriving at eight.", "Drei Läden, eine Einkaufsliste, Gäste um acht."),
    intro: [
      [
        L2("WG group chat", "WG-Gruppenchat"),
        L2(
          "Party tonight!! Someone get pretzels, Lyoner and Schorle. You’re closest. Thanks!! ❤️",
          "Party heute Abend!! Jemand muss Brezeln, Lyoner und Schorle holen. Du bist am nächsten. Danke!! ❤️",
        ),
      ],
      [NAR, L2("Visit the three shops in any order, then get home before the guests do.", "Klappere die drei Läden in beliebiger Reihenfolge ab und sei vor den Gästen zu Hause.")],
    ],
    timeLimit: 210,
    timeout: L2("The guests arrived to an empty fridge.", "Die Gäste standen vor einem leeren Kühlschrank."),
    steps: [
      {
        type: "multi",
        text: L2("Shopping list", "Einkaufsliste"),
        stops: [
          { to: "baecker", cost: 4, label: L2("12 pretzels", "12 Brezeln") },
          { to: "metzger", cost: 6, label: L2("Lyoner sausage", "Lyoner") },
          { to: "wein", cost: 5, label: L2("Schorle crate", "Kiste Schorle") },
        ],
      },
      {
        type: "go",
        to: "wg",
        text: L2("Bring everything home to the WG", "Bring alles nach Hause in die WG"),
        done: [
          [L2("Flatmate Jonas", "Mitbewohner Jonas"), L2("Legend! You even got the good Lyoner.", "Legende! Sogar die gute Lyoner.")],
          [L2("Flatmate Jonas", "Mitbewohner Jonas"), L2("Here’s the money back, plus a bit for the effort.", "Hier ist das Geld zurück, plus was für die Mühe.")],
        ],
      },
    ],
    bonus: [
      { text: L2("Home with 60 s to spare", "Mit 60 s Reserve zu Hause"), check: (R) => R.timeLeft >= 60 },
      { text: L2("No trouble with the law", "Kein Ärger"), check: (R) => R.maxAerger === 0 },
    ],
    reward: 15 + 70,
  },
  // ------------------------------------------------------------------ 6
  {
    id: "saumagen",
    title: L2("Saumagen for Oma Hilde", "Saumagen für Oma Hilde"),
    blurb: L2("A Palatinate delicacy, delivered in one piece.", "Eine Pfälzer Delikatesse, unbeschädigt geliefert."),
    intro: [
      [OMA, L2("Dear, could you fetch me a Saumagen? Butcher on Eisenbahnstraße. But don’t squash it!", "Bub, kannsch mer en Saumage hole? Metzgerei an de Eisenbahnstroß. Aber net verdrücke!")],
      [NAR, L2("Saumagen: stuffed pork stomach, the Palatinate’s pride. Crashes damage the cargo.", "Saumagen: der Stolz der Pfalz. Unfälle beschädigen die Ladung.")],
    ],
    steps: [
      {
        type: "go",
        to: "metzger",
        text: L2("Pick up the Saumagen at the butcher", "Hol den Saumagen bei der Metzgerei"),
        done: [[L2("Butcher", "Metzger"), L2("One Saumagen, fresh. Careful, this is cultural heritage.", "Ein Saumagen, frisch. Vorsichtig, des is Kulturgut.")]],
      },
      {
        type: "go",
        to: "oma",
        cargo: { label: L2("Saumagen", "Saumagen"), mul: 0.14 },
        text: L2("Bring it to Oma Hilde at the Stiftsplatz. Fragile!", "Bring ihn zu Oma Hilde am Stiftsplatz. Zerbrechlich!"),
        broken: L2("The Saumagen is ruined.", "Der Saumagen ist hinüber."),
        choice: {
          who: OMA,
          text: L2("Oh, it’s still whole! You’re a good one. Here, €120 for your deposit.", "Ei, der is jo noch ganz! Du bisch en Gude. Do, 120 € fer dei Kaution."),
          opts: [
            { label: L2("Thank you, Oma!", "Danke, Oma!") },
            {
              label: L2("Keep it. Just feed me.", "Behalt’s. Gib mir lieber was zu essen."),
              fn: (R) => {
                R.rewardOverride = 40;
                P.energy = 100;
              },
              reply: [[OMA, L2("Such manners! Sit, sit. Dampfnudeln for you. And €40, no arguing.", "So e Benehme! Hock dich hie. Dampfnudle for dich. Un 40 €, ke Widerred.")]],
            },
          ],
        },
      },
    ],
    bonus: [
      { text: L2("Saumagen above 90%", "Saumagen über 90 %"), check: (R) => R.integrity >= 90 },
      { text: L2("Done in under 2:30", "Unter 2:30 geschafft"), check: (R) => R.t < 150 },
    ],
    reward: 120,
  },
  // ------------------------------------------------------------------ 7
  {
    id: "pfandrallye",
    title: L2("Bottle Rally", "Pfand-Rallye"),
    blurb: L2("Last night’s party left bottles all over the Stadtpark. Money on the ground.", "Die Party von gestern hat den Stadtpark mit Flaschen gepflastert. Geld auf der Straße."),
    intro: [
      [LENA, L2("The park is full of empties after last night. Grab 8 before the collectors do, then cash them in. We split!", "Im Park liegen überall Leergut-Flaschen. Schnapp dir 8, bevor die Sammler kommen, dann ab zum Automaten. Wir teilen!")],
    ],
    timeLimit: 150,
    timeout: L2("The professional collectors beat you to it.", "Die Profi-Sammler waren schneller."),
    steps: [
      {
        type: "collect",
        count: 8,
        area: { x1: 31, y1: 45, x2: 47, y2: 57 },
        label: L2("bottles", "Flaschen"),
        text: L2("Collect the marked bottles around the Stadtpark", "Sammle die markierten Flaschen rund um den Stadtpark"),
      },
      {
        type: "go",
        to: "pfand",
        text: L2("Cash them in at the Globo bottle return", "Lös sie am Globo-Pfandautomaten ein"),
        done: [[LENA, L2("Teamwork! Half for you, half for my Mensa card.", "Teamwork! Halbe-halbe, meine Hälfte geht auf die Mensakarte.")]],
      },
    ],
    bonus: [
      { text: L2("All bottles within 75 s", "Alle Flaschen in 75 s"), check: (R) => R.collectTime > 0 && R.collectTime <= 75 },
      { text: L2("No crashes", "Keine Unfälle"), check: (R) => R.crashes === 0 },
    ],
    reward: 45,
  },
  // ------------------------------------------------------------------ 8
  {
    id: "betze",
    title: L2("The Betze Is Burning", "Der Betze brennt"),
    blurb: L2("Matchday. Kickoff waits for nobody.", "Spieltag. Der Anpfiff wartet auf niemanden."),
    intro: [
      [LENA, L2("Home game today! The whole city wears red. Meet me on the Betzenberg before kickoff!", "Heimspiel heute! Die ganze Stadt trägt Rot. Treffen auf dem Betzenberg vor dem Anpfiff!")],
      [NAR, L2("Expect crowds and slow traffic. Fans have right of way. Mostly.", "Rechne mit Menschenmassen und Stau. Fans haben Vorfahrt. Meistens.")],
    ],
    steps: [
      {
        type: "go",
        to: "stadion",
        timer: "auto",
        timerBonus: 10,
        matchday: true,
        text: L2("Reach the stadium before kickoff", "Erreiche das Stadion vor dem Anpfiff"),
        timeout: L2("Kickoff without you. The Betze sings anyway.", "Anpfiff ohne dich. Der Betze singt trotzdem."),
        done: [[L2("Stadium", "Stadion"), L2("One hill, one city, one song. The whole Betze is singing. You made it.", "Ein Berg, eine Stadt, ein Lied. Der ganze Betze singt. Du hast es geschafft.")]],
      },
    ],
    bonus: [
      { text: L2("Arrive with 20 s to spare", "Mit 20 s Reserve ankommen"), check: (R) => R.timeLeft >= 20 },
      { text: L2("No trouble with the law", "Kein Ärger"), check: (R) => R.maxAerger === 0 },
    ],
    reward: 150,
    finale: true,
  },
];
