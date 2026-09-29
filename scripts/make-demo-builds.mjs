/**
 * Writes supabase/seed/demo_community_builds.sql: fifteen example builds
 * (lifted trucks, cars, motorcycles) owned by demo accounts on
 * @buildtag.example. Some are written like a shop built them, some like a
 * first-time owner typed them on a phone.
 *
 *   node scripts/make-demo-builds.mjs
 *
 * No scans, likes or clicks are seeded: those counters only ever show real
 * activity. No product links either, so nothing points at an unverified page.
 * Photos: `pnpm images <name>` (Unsplash, plates blurred), see fetch-images.mjs.
 */
import { writeFileSync } from "node:fs";

const NOTE = "BuildTags example account.";

/** mods: [category, brand, part, description, price|null, installed by] */
const BUILDS = [
  {
    img: "whiteout", w: 2000, h: 1500,
    owner: { user: "hd_whiteout", name: "Marcus D.", loc: "Cincinnati, OH", bio: "Diesel, big wheels, clean paint. Show truck that still tows the camper." },
    year: 2016, make: "Ram", model: "2500", trim: "Laramie Mega Cab", nick: "WHITEOUT", slug: "whiteout-2016-ram-2500",
    hp: 520, hpType: "WHP", tq: 1080, miles: 88400, started: 2019, dyno: "Dynojet 224xLC", cost: 41200,
    desc: "6.7 Cummins on a 10 inch lift and 26x14 forged wheels. Built as a show truck, but it still pulls a 32 foot camper every summer, so the tune is conservative and the EGTs stay in check.\n\nLift, steering and gears were done at the shop. Turbo, tune and lighting I did in my own garage over two winters.",
    caption: "Rain day outside the dealership", alt: "White lifted Ram 2500 on polished wheels in a wet parking lot",
    socials: [["instagram", "hd_whiteout"], ["youtube", "hdwhiteout"]],
    mods: [
      ["suspension", "McGaughy's", "10 in. Lift Kit, 4-Link", "Powder coated white to match.", 4200, "Shop install"],
      ["suspension", "Fox", "2.5 Performance Elite Reservoir Shocks", "Front and rear.", 2600, "Shop install"],
      ["suspension", "PSC", "Steering Gear Box and Hydro Assist", "Needed for 40s.", 1850, "Shop install"],
      ["wheels", "American Force", "26x14 Forged, Polished", "", 9800, "Shop install"],
      ["tires", "Fury", "Country Hunter M/T 40x15.50R26", "", 3400, "Shop install"],
      ["drivetrain", "Yukon", "4.56 Ring and Pinion, front and rear", "", 2900, "Shop install"],
      ["forced_induction", "Fleece Performance", "63 mm Cheetah Turbo", "Drop-in, spools like stock.", 2100, "Self"],
      ["ecu_tuning", "EFILive", "Custom Tow and Street Tunes", "Two tunes on a switch.", 900, "Self"],
      ["intake", "S&B", "Cold Air Intake", "", 380, "Self"],
      ["exhaust", "MBRP", "5 in. Turbo-Back, Polished Tip", "", 760, "Self"],
      ["transmission", "BD Diesel", "Built 68RFE with Triple Disc Converter", "", 6900, "Shop install"],
      ["fuel_system", "FASS", "Titanium 165 GPH Lift Pump", "", 720, "Self"],
      ["lighting", "Alpharex", "NOVA LED Projector Headlights", "", 1100, "Self"],
      ["exterior", "AMP Research", "PowerStep XL Running Boards", "", 1700, "Self"],
      ["exterior", "A.R.E.", "Painted Fiberglass Bed Cap", "", 2400, "Shop install"],
    ],
  },
  {
    img: "cheeto", w: 2000, h: 1498,
    owner: { user: "taco_tuesday_17", name: "Jordan", loc: "Tulsa, OK", bio: "first truck. learning as i go" },
    year: 2017, make: "Toyota", model: "Tacoma", trim: "TRD Sport", nick: "Cheeto", slug: "cheeto-2017-toyota-tacoma",
    hp: null, tq: null, miles: 71200, started: 2023, dyno: "", cost: null,
    desc: "my first truck!! bought it stock last year. lift and tires so far, saving up for bumpers next. yes it rubs a little at full lock",
    caption: "by the old tracks", alt: "Orange lifted Toyota Tacoma on mud tires beside railroad tracks",
    socials: [],
    mods: [
      ["suspension", "Rough Country", "6 inch lift", "", null, "local shop"],
      ["tires", "", "35s mud tires", "loud on the highway lol", null, "local shop"],
      ["wheels", "Fuel", "black wheels 20in", "", null, ""],
      ["exterior", "", "window tint", "", null, ""],
    ],
  },
  {
    img: "trailhead", w: 2000, h: 1334,
    owner: { user: "trailhead_jk", name: "Sam and Priya R.", loc: "Moab, UT", bio: "Weekend trips, long dirt roads, bad coffee. We keep a log of every trail." },
    year: 2016, make: "Jeep", model: "Wrangler Unlimited", trim: "Rubicon", nick: "TRAILHEAD", slug: "trailhead-2016-jeep-wrangler-unlimited",
    hp: null, tq: null, miles: 96300, started: 2017, dyno: "", cost: 23800,
    desc: "Overland build that sleeps two and carries four days of water. Everything on it has been used on a trail, nothing is for looks.\n\nWeight was the hard part. With the tent, fridge and full tanks it needed heavier springs and a regear to be pleasant on the highway again.",
    caption: "Camp above the lake, last light", alt: "Jeep Wrangler with roof lights and a rooftop tent at sunset",
    socials: [["instagram", "trailhead_jk"]],
    mods: [
      ["suspension", "AEV", "3.5 in. DualSport RS Lift", "", 2300, "Self"],
      ["tires", "BFGoodrich", "KM3 Mud-Terrain 35x12.50R17", "Five, with a matching spare.", 1900, "Tire shop"],
      ["wheels", "Method Race Wheels", "701 Trail Series 17x8.5", "", 1450, "Tire shop"],
      ["drivetrain", "Yukon", "4.88 Gears", "", 2100, "Shop install"],
      ["exterior", "ARB", "Deluxe Winch Bumper", "", 1500, "Self"],
      ["electronics", "Warn", "Zeon 10-S Winch", "Synthetic line.", 1600, "Self"],
      ["lighting", "Baja Designs", "LP6 Pro, amber, roof mounted x5", "", 2400, "Self"],
      ["lighting", "Baja Designs", "Squadron Sport Fog Pocket Kit", "", 480, "Self"],
      ["exterior", "Gobi", "Stealth Roof Rack", "", 1900, "Self"],
      ["exterior", "iKamper", "Skycamp Mini Rooftop Tent", "", 3700, "Self"],
      ["electronics", "Dometic", "CFX3 45 Fridge on a Slide", "", 1100, "Self"],
      ["electronics", "sPOD", "BantamX Switch Panel", "", 900, "Self"],
      ["electronics", "Midland", "MXT275 GMRS Radio", "", 180, "Self"],
      ["safety", "MAXTRAX", "MKII Recovery Boards", "", 300, "Self"],
    ],
  },
  {
    img: "raptor", w: 2000, h: 1334,
    owner: { user: "desert_runner", name: "Cole M.", loc: "Midland, TX", bio: "Raptor, dirt, repeat." },
    year: 2019, make: "Ford", model: "F-150 Raptor", trim: "SuperCrew", nick: "", slug: "2019-ford-f-150-raptor-desert-runner",
    hp: 480, hpType: "WHP", tq: 560, miles: 54100, started: 2020, dyno: "", cost: null,
    desc: "Mostly stock because Ford got it right. Tune, tires and lights. It goes out to the lease roads every weekend.",
    caption: "Out past the lease road", alt: "White Ford F-150 Raptor parked on red dirt under storm clouds",
    socials: [],
    mods: [
      ["ecu_tuning", "COBB", "Accessport, 93 octane map", "", 975, "Self"],
      ["tires", "Milestar", "Patagonia M/T 37x12.50R17", "", 1500, "Tire shop"],
      ["wheels", "Method Race Wheels", "305 NV, matte black", "", 1300, "Tire shop"],
      ["lighting", "Rigid", "Triple Fog Light Kit", "", 1100, "Self"],
      ["intake", "aFe", "Momentum GT Intake", "", 450, "Self"],
      ["exterior", "", "Front window tint and ceramic coat", "", null, "Detail shop"],
    ],
  },
  {
    img: "silverado", w: 2000, h: 1334,
    owner: { user: "bigred_chevy", name: "Tyler", loc: "Rockford, IL", bio: "" },
    year: 2014, make: "Chevrolet", model: "Silverado 1500", trim: "LT", nick: "Big Red", slug: "big-red-2014-chevrolet-silverado-1500",
    hp: null, tq: null, miles: 132000, started: 2022, dyno: "", cost: null,
    desc: "Dads old truck, mine now. Leveled it and put bigger tires on. Want to do exhaust next but not sure which one, open to ideas",
    caption: "", alt: "Dark red Chevrolet Silverado on a leaf covered dirt road",
    socials: [],
    mods: [
      ["suspension", "", "2 inch leveling kit", "", 120, "me and my buddy"],
      ["tires", "", "33 inch mud tires", "", null, ""],
      ["wheels", "", "chrome wheels", "came off another truck", null, ""],
    ],
  },
  {
    img: "ctr", w: 2000, h: 1334,
    owner: { user: "fk8_sonic", name: "Alex T.", loc: "Virginia Beach, VA", bio: "FK8 track build. Time attack, data logs and tire bills." },
    year: 2019, make: "Honda", model: "Civic Type R", trim: "FK8", nick: "SONIC", slug: "sonic-2019-honda-civic-type-r",
    hp: 402, hpType: "WHP", tq: 410, miles: 38700, started: 2019, dyno: "Dynapack", cost: 19600,
    desc: "Street legal time attack car. Best lap at VIR Full is 2:07.4 on 200 treadwear tires.\n\nPower is kept where the stock block is happy. Most of the money went into cooling, brakes and alignment parts, because that is what makes a front-drive car fast for more than two laps.",
    caption: "Beach day between events", alt: "Sonic Gray Honda Civic Type R on bronze wheels parked on a beach",
    socials: [["instagram", "fk8_sonic"], ["youtube", "fk8sonic"]],
    mods: [
      ["ecu_tuning", "Hondata", "FlashPro, custom E30 tune", "Tuned on a hub dyno, 24 psi.", 1400, "Tuner"],
      ["forced_induction", "PRL Motorsports", "P600 Drop-In Turbo", "", 2300, "Self"],
      ["intake", "PRL Motorsports", "High Volume Intake", "", 480, "Self"],
      ["cooling", "PRL Motorsports", "Front Mount Intercooler", "", 900, "Self"],
      ["cooling", "Koyorad", "Aluminum Radiator", "", 520, "Self"],
      ["cooling", "Acuity", "Oil Cooler Kit", "", 780, "Self"],
      ["exhaust", "RV6", "Catted Downpipe and Front Pipe", "", 1150, "Self"],
      ["fuel_system", "PRL Motorsports", "Flex Fuel Kit", "", 320, "Self"],
      ["suspension", "Ohlins", "Road and Track Coilovers", "", 2900, "Self"],
      ["suspension", "SPC", "Adjustable Front Ball Joints and Rear Camber Arms", "-3.2 front, -2.0 rear.", 620, "Alignment shop"],
      ["brakes", "Paragon", "2-Piece Front Rotors", "", 1100, "Self"],
      ["brakes", "Ferodo", "DS1.11 Pads and SRF Fluid", "", 640, "Self"],
      ["wheels", "Volk Racing", "TE37 Saga 18x9.5 +45, bronze", "", 3600, "Self"],
      ["tires", "Bridgestone", "Potenza RE-71RS 265/35R18", "", 1300, "Tire shop"],
      ["interior", "Recaro", "Pole Position with Schroth Harness", "Driver side only.", 1900, "Self"],
      ["electronics", "AiM", "Solo 2 DL", "", 700, "Self"],
    ],
  },
  {
    img: "sti", w: 2000, h: 1333,
    owner: { user: "wrb_boxer", name: "Dani K.", loc: "Calgary, AB", bio: "Subaru owner, reluctant mechanic." },
    year: 2016, make: "Subaru", model: "WRX", trim: "Premium", nick: "BLUEBERRY", slug: "blueberry-2016-subaru-wrx",
    hp: 318, hpType: "WHP", tq: 340, miles: 84500, started: 2018, dyno: "Mustang AWD", cost: null,
    desc: "Daily through Calgary winters, car shows in the summer. Stage 2 with a protune. The wing is a lot, I know.",
    caption: "Parkade shoot", alt: "Blue Subaru WRX with a rear wing and polished wheels in a parking garage",
    socials: [["instagram", "wrb_boxer"]],
    mods: [
      ["ecu_tuning", "COBB", "Accessport V3 with protune", "", 1200, "Tuner"],
      ["intake", "COBB", "SF Intake and Airbox", "", 420, "Self"],
      ["exhaust", "Invidia", "Q300 Cat-Back", "", 900, "Self"],
      ["exhaust", "Grimmspeed", "Catted J-Pipe", "", 850, "Self"],
      ["cooling", "Grimmspeed", "Top Mount Intercooler", "", 900, "Self"],
      ["suspension", "BC Racing", "BR Series Coilovers", "", 1200, "Self"],
      ["wheels", "Work", "Emotion D9R 18x9.5", "", 2800, "Tire shop"],
      ["tires", "Michelin", "Pilot Sport 4S 265/35R18", "Winters on the stock wheels.", 1300, "Tire shop"],
      ["aero", "APR Performance", "GTC-300 Carbon Wing", "", 1500, "Self"],
      ["aero", "", "Front Splitter and Side Skirt Extensions", "", 450, "Self"],
      ["lighting", "", "Custom retrofit headlights, red demon eyes", "", 700, "Retrofit shop"],
    ],
  },
  {
    img: "mustang", w: 2000, h: 1333,
    owner: { user: "orangefury_gt", name: "Chris", loc: "Knoxville, TN", bio: "5.0" },
    year: 2019, make: "Ford", model: "Mustang", trim: "GT Premium", nick: "", slug: "2019-ford-mustang-gt-orange-fury",
    hp: 460, hpType: "HP", tq: 420, miles: 29800, started: 2024, dyno: "", cost: null,
    desc: "Orange Fury GT, 10 speed. Just started modding it. Wheels and springs done, exhaust is next",
    caption: "back road", alt: "Orange Ford Mustang GT on gray wheels on a tree lined road",
    socials: [["instagram", "orangefury_gt"]],
    mods: [
      ["wheels", "", "20 inch wheels gunmetal", "", 1400, ""],
      ["suspension", "Eibach", "lowering springs", "", 330, "shop"],
      ["intake", "K&N", "cold air intake", "", null, "me"],
      ["exterior", "", "roof wrap black", "", null, ""],
    ],
  },
  {
    img: "nismo", w: 2000, h: 1335,
    owner: { user: "z34_nismo", name: "Kenji W.", loc: "Seattle, WA", bio: "Naturally aspirated and staying that way." },
    year: 2016, make: "Nissan", model: "370Z", trim: "NISMO", nick: "", slug: "2016-nissan-370z-nismo-z34",
    hp: 322, hpType: "WHP", tq: 262, miles: 47200, started: 2020, dyno: "Dynojet", cost: null,
    desc: "NA bolt-ons and a tune. The goal is a car that sounds right and does not overheat on a canyon run, which on a Z means oil cooler first.",
    caption: "", alt: "White Nissan 370Z NISMO on bronze wheels between two industrial buildings",
    socials: [],
    mods: [
      ["cooling", "Z1 Motorsports", "34 Row Oil Cooler Kit", "", 650, "Self"],
      ["intake", "Stillen", "Gen 3 Long Tube Intake", "", 600, "Self"],
      ["exhaust", "Fast Intentions", "Cat-Back with Resonated Test Pipes", "", 1900, "Self"],
      ["ecu_tuning", "EcuTek", "Custom Tune", "", 900, "Tuner"],
      ["transmission", "Z1 Motorsports", "Clutch and Flywheel, CSC Elimination Kit", "", 1500, "Shop install"],
      ["wheels", "", "Bronze mesh 19x9.5 / 19x10.5", "", 1600, "Tire shop"],
      ["tires", "Falken", "Azenis FK510", "", 950, "Tire shop"],
    ],
  },
  {
    img: "m3", w: 2000, h: 1334,
    owner: { user: "f80_nardo", name: "Lukas B.", loc: "Asheville, NC", bio: "F80 M3 Competition. Built with the shop, driven on mountain roads." },
    year: 2018, make: "BMW", model: "M3", trim: "Competition", nick: "NARDO", slug: "nardo-2018-bmw-m3",
    hp: 598, hpType: "WHP", tq: 585, miles: 41900, started: 2019, dyno: "Dynojet 424x", cost: 31500,
    desc: "S55 on upgraded turbos and E50. The brief was OEM-plus: nothing on the outside that BMW did not make, everything underneath that they should have.\n\nCrank hub is pinned. Charge pipes, heat exchanger and fueling were done before the power went up, not after.",
    caption: "First cold morning of the season", alt: "Gray BMW M3 on black wheels parked on a forest road covered in autumn leaves",
    socials: [["instagram", "f80_nardo"], ["tiktok", "f80nardo"]],
    mods: [
      ["forced_induction", "Pure Turbos", "Stage 2 Turbo Upgrade", "", 4200, "Shop install"],
      ["engine", "Vargas Turbo Technologies", "Pinned Crank Hub", "Done with the turbos.", 2600, "Shop install"],
      ["ecu_tuning", "bootmod3", "Custom E50 Tune", "", 1300, "Tuner"],
      ["fuel_system", "Dorch Engineering", "Stage 2 HPFP", "", 1500, "Shop install"],
      ["intake", "Eventuri", "Carbon Intake System", "", 1900, "Self"],
      ["cooling", "CSF", "Top Mount Charge-Air Cooler", "", 1600, "Shop install"],
      ["cooling", "CSF", "Front Mount Heat Exchanger", "", 900, "Shop install"],
      ["intake", "Evolution Racewerks", "Charge Pipes and J-Pipe", "", 650, "Self"],
      ["exhaust", "Akrapovic", "Evolution Line Titanium", "", 6200, "Shop install"],
      ["exhaust", "Active Autowerke", "Catted Downpipes", "", 1900, "Shop install"],
      ["suspension", "KW", "V3 Clubsport Coilovers", "", 3900, "Shop install"],
      ["brakes", "M Performance", "Carbon Ceramic Brakes", "Factory option.", null, "Factory"],
      ["wheels", "BBS", "FI-R 19x9.5 / 20x10.5", "", 8200, "Tire shop"],
      ["tires", "Michelin", "Pilot Sport Cup 2", "", 1900, "Tire shop"],
      ["aero", "M Performance", "Carbon Front Splitter and Mirror Caps", "", 1800, "Self"],
    ],
  },
  {
    img: "miata", w: 2000, h: 1333,
    owner: { user: "rainy_na6", name: "Mia", loc: "Portland, OR", bio: "slow car fast. 1.6 forever" },
    year: 1992, make: "Mazda", model: "MX-5 Miata", trim: "", nick: "Tomato", slug: "tomato-1992-mazda-mx-5-miata",
    hp: null, tq: null, miles: 187000, started: 2023, dyno: "", cost: 2100,
    desc: "$3500 craigslist miata. It leaks a little. Budget build, mostly used parts from the forums. Doing my first autocross in the spring!",
    caption: "got caught in the rain with the hardtop on thankfully", alt: "Red first generation Mazda Miata with pop-up headlights on in heavy rain at night",
    socials: [],
    mods: [
      ["suspension", "Raceland", "coilovers", "used, from a friend", 250, "me + youtube"],
      ["wheels", "", "15x8 black wheels", "marketplace find", 400, ""],
      ["tires", "Falken", "RT660 205/50R15", "", 620, "tire shop"],
      ["exterior", "", "hardtop", "best thing i bought", 800, ""],
      ["interior", "", "roll bar", "for autocross tech", null, "friend's garage"],
      ["other", "", "new timing belt + water pump", "not a mod but it counts", null, "me"],
    ],
  },
  {
    img: "scat", w: 2000, h: 1334,
    owner: { user: "scatpack_gray", name: "Devon H.", loc: "Atlanta, GA", bio: "392 widebody. Weekends at the strip." },
    year: 2020, make: "Dodge", model: "Challenger", trim: "R/T Scat Pack Widebody", nick: "SMOKE", slug: "smoke-2020-dodge-challenger",
    hp: 462, hpType: "WHP", tq: 448, miles: 33500, started: 2021, dyno: "Dynojet", cost: null,
    desc: "Bolt-on 392. Runs 11.9 at 117 on drag radials. Cam is next once the warranty runs out.",
    caption: "", alt: "Gray Dodge Challenger Scat Pack Widebody parked beside a stone building",
    socials: [["instagram", "scatpack_gray"]],
    mods: [
      ["exhaust", "American Racing Headers", "1-7/8 in. Long Tubes with Catted Mids", "", 2400, "Shop install"],
      ["exhaust", "Corsa", "Xtreme Cat-Back", "", 1900, "Self"],
      ["intake", "JLT", "Cold Air Intake", "", 400, "Self"],
      ["ecu_tuning", "HP Tuners", "Custom 93 Tune, unlocked PCM", "", 1100, "Tuner"],
      ["drivetrain", "", "One-Piece Aluminum Driveshaft", "", 1200, "Shop install"],
      ["tires", "Mickey Thompson", "ET Street R 305/35R20, rear", "", 800, "Tire shop"],
      ["wheels", "", "20x11 Satin Black Flow Formed", "", 1800, "Tire shop"],
      ["fuel_system", "", "Catch Can", "", 180, "Self"],
    ],
  },
  {
    img: "r6", w: 2000, h: 1334,
    owner: { user: "apex_r6", name: "Nico F.", loc: "Salt Lake City, UT", bio: "Track days at UMC. Street miles to get there." },
    year: 2019, make: "Yamaha", model: "YZF-R6", trim: "", nick: "RAVEN", slug: "raven-2019-yamaha-yzf-r6",
    hp: 118, hpType: "WHP", tq: 44, miles: 11200, started: 2020, dyno: "Dynojet 250i", cost: 9800,
    desc: "Track bike that keeps its plate. Suspension was set up for my weight by a tuner at the track, which was worth more than every power part combined.\n\nGeared down one in front, up two in the rear.",
    caption: "Canyon stop on the way home", alt: "Black Yamaha YZF-R6 parked in front of snow capped mountains",
    socials: [["instagram", "apex_r6"]],
    mods: [
      ["exhaust", "Akrapovic", "Racing Line Full Titanium System", "", 2300, "Self"],
      ["ecu_tuning", "FTECU", "ECU Flash with Quickshifter and Autoblip", "", 750, "Tuner"],
      ["intake", "Sprint Filter", "P08 Race Air Filter", "", 120, "Self"],
      ["suspension", "Ohlins", "TTX GP Rear Shock", "", 1600, "Suspension tuner"],
      ["suspension", "Ohlins", "NIX 30 Fork Cartridge Kit", "", 1500, "Suspension tuner"],
      ["brakes", "Brembo", "RCS 19 Master Cylinder", "", 380, "Self"],
      ["brakes", "Vesrah", "RJL Pads and Spiegler Lines", "", 420, "Self"],
      ["drivetrain", "Vortex", "520 Conversion, -1 / +2", "", 260, "Self"],
      ["tires", "Pirelli", "Diablo Supercorsa SP V3", "", 450, "Self"],
      ["safety", "Woodcraft", "Rearsets, Clip-Ons and Case Covers", "", 900, "Self"],
      ["exterior", "", "Fender Eliminator and Smoked Screen", "", 190, "Self"],
    ],
  },
  {
    img: "ninja", w: 2000, h: 1334,
    owner: { user: "first_ninja400", name: "Bri", loc: "Tampa, FL", bio: "new rider, got my endorsement in march" },
    year: 2022, make: "Kawasaki", model: "Ninja 400", trim: "ABS", nick: "", slug: "2022-kawasaki-ninja-400-first-bike",
    hp: null, tq: null, miles: 3400, started: 2024, dyno: "", cost: null,
    desc: "First bike. Took the MSF course and bought this the next week. Only a few things done so far, mostly stuff that protects it when I drop it (already did once in the driveway)",
    caption: "", alt: "Black Kawasaki Ninja 400 with an aftermarket exhaust in front of palm trees",
    socials: [],
    mods: [
      ["exhaust", "", "slip on exhaust", "sounds way better", 300, "my brother"],
      ["safety", "", "frame sliders", "", 90, "me"],
      ["exterior", "", "fender eliminator", "", null, "me"],
      ["electronics", "", "phone mount", "", 40, ""],
    ],
  },
  {
    img: "iron", w: 2000, h: 1333,
    owner: { user: "iron883_ray", name: "Ray", loc: "Greenville, SC", bio: "Iron 883. Rides to work, rides on Sunday." },
    year: 2018, make: "Harley-Davidson", model: "Iron 883", trim: "", nick: "", slug: "2018-harley-davidson-iron-883-ray",
    hp: null, tq: null, miles: 14800, started: 2021, dyno: "", cost: null,
    desc: "Blacked out Sportster. Did the intake and pipes myself and had the dealer flash it. Seat and shocks made the biggest difference, the stock ones were rough.",
    caption: "Behind the shop", alt: "Matte black Harley-Davidson Iron 883 parked by a brick wall",
    socials: [],
    mods: [
      ["exhaust", "Vance & Hines", "Short Shots Staggered, black", "", 600, "Self"],
      ["intake", "Arlen Ness", "Big Sucker Stage 1 Air Cleaner", "", 250, "Self"],
      ["ecu_tuning", "Screamin' Eagle", "Stage 1 Flash", "", 300, "Dealer"],
      ["suspension", "Progressive Suspension", "412 Series Rear Shocks", "", 330, "Self"],
      ["interior", "Saddlemen", "Step-Up Seat", "", 400, "Self"],
      ["lighting", "", "LED Headlight and Turn Signals", "", 220, "Self"],
    ],
  },
];

/** One DO block that loads the given builds from an embedded JSON document. */
function sqlFor(builds) {
  const doc = builds.map((b) => ({
    email: `${b.owner.user}@buildtag.example`,
    user: b.owner.user,
    name: b.owner.name,
    bio: [b.owner.bio, NOTE].filter(Boolean).join(" "),
    loc: b.owner.loc,
    slug: b.slug,
    year: b.year,
    make: b.make,
    model: b.model,
    trim: b.trim,
    nick: b.nick,
    desc: b.desc,
    img: b.img,
    w: b.w,
    h: b.h,
    hp: b.hp,
    hpType: b.hpType ?? "WHP",
    tq: b.tq,
    miles: b.miles,
    started: b.started,
    cost: b.cost,
    dyno: b.dyno,
    caption: b.caption,
    alt: b.alt,
    socials: b.socials,
    mods: b.mods,
  }));
  const json = JSON.stringify(doc);
  if (json.includes("$j$")) throw new Error("JSON collides with the dollar quote");
  return `do $$
declare
  doc jsonb := $j$${json}$j$::jsonb;
  b jsonb;
  m jsonb;
  u uuid;
  v uuid;
  i integer;
begin
  for b in select * from jsonb_array_elements(doc) loop
    select id into u from auth.users where email = b->>'email';
    if u is null then
      u := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
      ) values (
        '00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated',
        b->>'email', extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('username', b->>'user', 'display_name', b->>'name', 'app', 'buildtag'),
        now(), now(), '', '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), u, u::text, jsonb_build_object('sub', u::text, 'email', b->>'email', 'email_verified', true), 'email', now(), now(), now());
    end if;
    insert into buildtag.profiles (id, username, display_name, bio, location_text)
    values (u, b->>'user', b->>'name', b->>'bio', b->>'loc')
    on conflict (id) do update set username = excluded.username, display_name = excluded.display_name, bio = excluded.bio, location_text = excluded.location_text;

    delete from buildtag.vehicles where slug = b->>'slug';
    insert into buildtag.vehicles (
      owner_id, slug, year, make, model, trim, nickname, description,
      hero_image_url, profile_image_url, location_text,
      horsepower, horsepower_type, torque, torque_unit, mileage, mileage_unit,
      build_started_year, build_cost, build_cost_public, dyno_type, visibility, status, show_owner_section
    ) values (
      u, b->>'slug', (b->>'year')::integer, b->>'make', b->>'model', b->>'trim', b->>'nick', b->>'desc',
      '/demo/' || (b->>'img') || '/full.webp', '/demo/' || (b->>'img') || '/full.webp', b->>'loc',
      (b->>'hp')::integer, (b->>'hpType')::buildtag.horsepower_type, (b->>'tq')::integer, 'LB_FT', (b->>'miles')::integer, 'MI',
      (b->>'started')::integer, (b->>'cost')::numeric, (b->>'cost') is not null, b->>'dyno', 'public', 'active', true
    ) returning id into v;

    insert into buildtag.vehicle_photos (vehicle_id, storage_path, caption, alt_text, width, height, sort_order)
    values (v, 'demo/' || (b->>'img'), b->>'caption', b->>'alt', (b->>'w')::integer, (b->>'h')::integer, 0);

    i := 0;
    for m in select * from jsonb_array_elements(b->'socials') loop
      insert into buildtag.social_links (owner_type, owner_id, platform, handle, url, sort_order)
      values ('vehicle', v, (m->>0)::buildtag.social_platform, m->>1, 'https://example.com/' || (m->>0) || '/' || (m->>1), i);
      i := i + 1;
    end loop;

    -- mods: [category, brand, part, description, price, installed by]
    i := 0;
    for m in select * from jsonb_array_elements(b->'mods') loop
      insert into buildtag.modifications (vehicle_id, category, brand, part_name, description, price, price_public, installed_by_text, sort_order)
      values (v, (m->>0)::buildtag.mod_category, m->>1, m->>2, m->>3, (m->>4)::numeric, (m->>4) is not null, m->>5, i);
      i := i + 1;
    end loop;
  end loop;
end $$;
`;
}

const header = `-- =============================================================================
-- BuildTags example builds: fifteen community-style builds on demo accounts
-- =============================================================================
-- GENERATED by scripts/make-demo-builds.mjs. Edit that file, not this one.
-- Idempotent: re-running replaces each example build. Owners are demo accounts
-- on @buildtag.example with random, unknown passwords; every owner bio carries
-- "${NOTE}". No scans, likes or clicks are seeded and no product links are set.
-- Photos live in /public/demo/<name> (pnpm images <name>, Unsplash, plates blurred).
-- =============================================================================

`;
writeFileSync("supabase/seed/demo_community_builds.sql", header + sqlFor(BUILDS));
// Optional: node scripts/make-demo-builds.mjs <dir> also writes the same SQL in parts of five builds.
const out = process.argv[2];
if (out) for (let p = 0; p < BUILDS.length; p += 5) writeFileSync(`${out}/part-${p / 5 + 1}.sql`, sqlFor(BUILDS.slice(p, p + 5)));
console.log(`${BUILDS.length} builds, ${BUILDS.reduce((a, b) => a + b.mods.length, 0)} mods`);
