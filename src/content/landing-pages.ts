/**
 * Keyword-targeted marketing pages. Each entry renders through
 * <LandingPage /> and is also used to build the sitemap, footer link hub
 * and llms.txt, so adding a page here is the only step needed.
 *
 * Keyword strategy (primary → supporting):
 *  - incident-reporting   "incident reporting app/software", "report an incident"
 *  - hazard-reporting     "hazard reporting app", "report a hazard", "safety hazard reporting"
 *  - bug-reporting        "bug reporting app/tool", "report a bug", "website bug report"
 *  - litter-reporting     "litter reporting app", "report illegal dumping", "pollution reporting"
 *  - report-a-problem     "report a problem", "report an issue", "report graffiti/pothole"
 *  - solutions/*          commercial-intent pages per buyer (cities, brands, property, safety)
 */

export type LandingSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LandingPageContent = {
  slug: string; // site path without leading slash, e.g. "incident-reporting"
  navLabel: string; // short label for footer / nav
  title: string; // <title>, ≤ 60 chars ideally
  description: string; // meta description, ≤ 160 chars
  h1: string;
  lead: string;
  keywords: string[]; // for meta keywords + llms.txt; not a ranking factor, documentation only
  sections: LandingSection[];
  faqs: { question: string; answer: string }[];
  related: string[]; // slugs
  breadcrumb?: string; // parent label for /solutions/* pages
};

const HOW_IT_WORKS: LandingSection = {
  heading: "How CleanApp reporting works",
  paragraphs: [
    "CleanApp removes every step that normally stops people from reporting. There are no forms, no account walls and no \"which department do I email?\" guesswork.",
  ],
  bullets: [
    "Snap: open CleanApp and take one photo (or screenshot) of the problem. Location, time and device context are captured automatically.",
    "Analyze: CleanApp AI classifies the report as a physical hazard or digital bug, scores severity, detects the brand or property involved and writes a plain-language summary.",
    "Route: the report is matched to the brand, property owner, facility manager or city department responsible and delivered through their preferred channel.",
    "Resolve: organizations track incidents on a live map and dashboard, spot hotspots and close the loop. Reporters earn rewards for verified reports.",
  ],
};

export const LANDING_PAGES: LandingPageContent[] = [
  {
    slug: "incident-reporting",
    navLabel: "Incident Reporting",
    title: "Incident Reporting App – Report Any Incident in One Tap | CleanApp",
    description:
      "CleanApp is a free incident reporting app. Photograph the incident, AI classifies it and routes it to the responsible organization. Live incident maps and dashboards for teams.",
    h1: "Incident reporting app: one photo, zero paperwork",
    lead:
      "CleanApp is the fastest way to report an incident. Take a photo, and CleanApp's AI turns it into a structured incident report with location, severity, classification and the organization responsible — then routes it to them automatically.",
    keywords: [
      "incident reporting app",
      "incident reporting software",
      "incident report app",
      "report an incident",
      "mobile incident reporting",
      "incident reporting system",
      "incident management app",
      "near miss reporting app",
    ],
    sections: [
      {
        heading: "Why most incident reporting systems fail",
        paragraphs: [
          "Traditional incident reporting software assumes the reporter is an employee, logged in, at a desk, willing to fill a twelve-field form. In reality, the person who notices a spill in aisle four, a broken railing on a stairwell or a checkout page that crashes is usually a customer, a visitor or a passer-by. If reporting takes more than a few seconds, the incident goes unreported until it becomes a claim.",
          "CleanApp was built for that reality. Anyone can report an incident with a single photo, and the AI does the data entry. Organizations receive clean, structured incident data from the people who actually see problems first.",
        ],
      },
      HOW_IT_WORKS,
      {
        heading: "What you can report with CleanApp",
        paragraphs: [
          "CleanApp accepts any kind of incident, physical or digital. Common report types include:",
        ],
        bullets: [
          "Safety incidents and near misses: slips, trips, falls, blocked exits, unsafe equipment, exposed wiring.",
          "Property damage: broken fixtures, vandalism, water damage, structural issues.",
          "Environmental incidents: litter, illegal dumping, spills, overflowing bins, pollution.",
          "Security incidents: unsecured doors, broken locks, suspicious activity around a site.",
          "Digital incidents: app crashes, broken checkout flows, error pages, misleading UI, accessibility failures.",
          "Product and brand incidents: damaged packaging, recalled products on shelves, mislabeled goods.",
        ],
      },
      {
        heading: "Incident reporting software for organizations",
        paragraphs: [
          "For brands, property managers, facilities teams and cities, CleanApp is an incident reporting system that never needs onboarding on the reporter side. Every report that mentions your brand, lands on your property or falls inside your service area appears on your dashboard in real time.",
          "CleanApp Pro and Enterprise plans add live alerts, AI-powered insights, incident hotspot tracking, multi-site coverage, custom dashboards and risk-hotspot forecasting, so you can move from reacting to incidents to preventing them.",
        ],
      },
      {
        heading: "Free for reporters, rewarding by design",
        paragraphs: [
          "Reporting on CleanApp is free and always will be. Verified reports earn rewards, which is why CleanApp's community keeps reporting incidents long after a typical corporate app has been forgotten. More reports means earlier warning for the organizations that subscribe.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is an incident reporting app?",
        answer:
          "An incident reporting app lets people document an incident — an injury, hazard, damage, near miss or digital failure — from a mobile device, usually with a photo, location and description, and sends it to the organization responsible for resolving it. CleanApp does this with a single photo and uses AI to fill in the rest.",
      },
      {
        question: "Is CleanApp free to use for incident reporting?",
        answer:
          "Yes. Submitting incident reports on CleanApp is free on iOS, Android and the web. Organizations that want live alerts, dashboards and AI insights subscribe to CleanApp Pro or Enterprise.",
      },
      {
        question: "Do reporters need an account?",
        answer:
          "No. CleanApp is designed so that anyone — customers, visitors, residents, contractors — can report an incident instantly without creating an account or filling out a form.",
      },
      {
        question: "How does CleanApp know who to send an incident to?",
        answer:
          "CleanApp's AI analyzes the photo and location to detect the brand, property or city area involved, then matches the incident to the responsible organization and delivers it through their preferred channel, including email, dashboard and API.",
      },
      {
        question: "Can CleanApp replace our existing incident management software?",
        answer:
          "For many teams, yes. For others, CleanApp works as the intake layer: it captures incidents from everyone, not just employees, and feeds structured data into your existing EHS, CMMS or ticketing systems.",
      },
    ],
    related: ["hazard-reporting", "bug-reporting", "solutions/workplace-safety", "solutions/cities"],
  },
  {
    slug: "hazard-reporting",
    navLabel: "Hazard Reporting",
    title: "Hazard Reporting App – Report Safety Hazards Instantly | CleanApp",
    description:
      "Report a hazard in seconds with CleanApp. Photo-based hazard reporting with AI severity scoring, GPS location and automatic routing to the responsible property owner, employer or city.",
    h1: "Hazard reporting app: see something, snap it, it's handled",
    lead:
      "CleanApp is a hazard reporting app for everyone, not just employees. Photograph a safety hazard and CleanApp scores its severity, pinpoints the location and routes the report to whoever is responsible for fixing it.",
    keywords: [
      "hazard reporting app",
      "hazard reporting system",
      "report a hazard",
      "safety hazard reporting",
      "workplace hazard reporting app",
      "hazard identification app",
      "safety observation app",
      "public safety hazard report",
    ],
    sections: [
      {
        heading: "Hazard reporting that works outside the org chart",
        paragraphs: [
          "Most hazard reporting systems live inside a company's safety software. They are invisible to the customers, tenants, residents and contractors who encounter most hazards first. A hazard that nobody can easily report is a hazard that stays in place.",
          "CleanApp opens hazard reporting to the public while giving organizations the structured data they need: hazard type, severity, exact location, timestamp and photo evidence, all generated by AI from a single image.",
        ],
      },
      HOW_IT_WORKS,
      {
        heading: "Types of hazards people report on CleanApp",
        paragraphs: ["CleanApp's AI recognizes and classifies a wide range of physical hazards, including:"],
        bullets: [
          "Trip and fall hazards: broken pavement, loose tiles, cables across walkways, missing handrails.",
          "Fire and electrical hazards: blocked fire exits, exposed wiring, damaged outlets, overloaded sockets.",
          "Structural hazards: cracked walls, loose signage, damaged balconies, unstable scaffolding.",
          "Environmental hazards: chemical spills, illegal dumping, overflowing waste, standing water, sharps.",
          "Road and public-space hazards: potholes, broken streetlights, damaged crossings, fallen trees.",
          "Equipment hazards: unguarded machinery, damaged playground equipment, faulty elevators.",
        ],
      },
      {
        heading: "Severity scoring and hazard hotspots",
        paragraphs: [
          "Every hazard report gets an AI-generated hazard probability and severity level, so safety teams can triage the critical few before the trivial many. Over time, CleanApp's live map reveals hazard hotspots — the stairwell, loading dock or intersection that keeps generating reports — so you can fix root causes instead of symptoms.",
        ],
      },
      {
        heading: "Built for safety teams, property owners and cities",
        paragraphs: [
          "Whether you run EHS for a manufacturer, manage a portfolio of buildings or operate a city's public works department, CleanApp gives you a public hazard reporting channel with zero reporter onboarding, plus dashboards, alerts and exports for your own workflow.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I report a safety hazard with CleanApp?",
        answer:
          "Open CleanApp, take a photo of the hazard and submit. CleanApp captures your location automatically, scores the hazard's severity and sends the report to the organization responsible. No form and no account required.",
      },
      {
        question: "Can employees use CleanApp for workplace hazard reporting?",
        answer:
          "Yes. CleanApp works as a workplace hazard reporting app for employees and contractors, and also captures hazards reported by customers and visitors who would never install an internal safety app.",
      },
      {
        question: "Is hazard reporting on CleanApp anonymous?",
        answer:
          "Reporters do not need an account to submit a hazard report. Organizations receive the photo, location, AI analysis and timestamp, not the reporter's identity, unless the reporter chooses to share contact details.",
      },
      {
        question: "What happens after I report a hazard?",
        answer:
          "CleanApp's AI classifies the hazard, scores its severity and routes it to the responsible party. Subscribed organizations see it instantly on their live map and dashboard. You can track reports in your CleanApp history.",
      },
    ],
    related: ["incident-reporting", "report-a-problem", "solutions/workplace-safety", "solutions/property-managers"],
  },
  {
    slug: "bug-reporting",
    navLabel: "Bug Reporting",
    title: "Bug Reporting App – Report Bugs on Any Website or App | CleanApp",
    description:
      "Report a bug on any app or website with one screenshot. CleanApp's AI identifies the product, classifies the bug and delivers it to the company responsible. Free for reporters.",
    h1: "Bug reporting app for every website and app you use",
    lead:
      "Found a broken checkout, a crashing app or a misleading button? CleanApp is a bug reporting tool that works on any product, not just the ones with a feedback form. Screenshot it, and CleanApp identifies the brand, classifies the bug and sends it to the team that can fix it.",
    keywords: [
      "bug reporting app",
      "bug reporting tool",
      "report a bug",
      "website bug report",
      "app bug report",
      "digital issue reporting",
      "user feedback app",
      "report broken website",
    ],
    sections: [
      {
        heading: "The bug reporting gap",
        paragraphs: [
          "Bug reporting tools built for QA teams — bug trackers, session replay, in-app SDKs — only capture issues inside the products that installed them. The vast majority of bugs users encounter every day are in products with no feedback channel at all, or a support form so painful nobody uses it.",
          "CleanApp fills that gap. It is a universal bug reporting app: one screenshot of any website, mobile app, kiosk, ATM, smart TV interface or in-car screen becomes a structured bug report delivered to the company responsible.",
        ],
      },
      {
        heading: "How bug reporting works on CleanApp",
        paragraphs: ["Reporting a digital bug takes seconds and requires no technical knowledge."],
        bullets: [
          "Capture: take a screenshot or photo of the bug — an error message, a broken layout, a payment that failed, a dark pattern.",
          "Analyze: CleanApp AI detects the brand or product, classifies the issue (crash, UI defect, broken flow, content error, accessibility failure, security concern), scores severity and writes a reproducible summary.",
          "Route: the report is delivered to the responsible company through CleanApp's brand dashboard, email or API.",
          "Reward: verified bug reports earn CleanApp rewards.",
        ],
      },
      {
        heading: "Bug reports your product team will actually use",
        paragraphs: [
          "Brands that subscribe to CleanApp get a live feed of digital issue reports about their products from real users in the wild, with AI classification, severity, affected surface and trend analysis. It is the user feedback you cannot get from analytics, delivered without building or maintaining your own feedback tooling.",
          "Reports are grouped by brand, so you see every bug reported about your website, apps and devices in one place, alongside physical reports about your stores, packaging and signage.",
        ],
      },
      {
        heading: "Beyond bugs: digital hazards",
        paragraphs: [
          "CleanApp also captures digital hazards: phishing pages impersonating a brand, misleading subscription flows, broken privacy controls and scam ads. Treating these like physical hazards — report, classify, route — gives brands and regulators early warning from the public.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I report a bug on a website that has no contact form?",
        answer:
          "Take a screenshot and submit it through CleanApp. CleanApp's AI identifies the company from the screenshot and routes the bug report to them, so you do not need to find a contact address yourself.",
      },
      {
        question: "Is CleanApp a bug tracker like Jira?",
        answer:
          "No. CleanApp is a public-facing bug reporting app that captures issues from any user about any product. Subscribed brands can push CleanApp reports into their own bug tracker via dashboard exports and API.",
      },
      {
        question: "Can I report bugs in mobile apps, not just websites?",
        answer:
          "Yes. Any screen you can photograph or screenshot — mobile apps, web apps, kiosks, ATMs, vehicle infotainment, smart TVs — can be reported through CleanApp.",
      },
      {
        question: "Do I get rewarded for bug reports?",
        answer:
          "Yes. Verified reports on CleanApp, physical and digital, earn rewards. Rewards grow with report quality and the value of the issue to the organization that resolves it.",
      },
    ],
    related: ["incident-reporting", "solutions/brands", "report-a-problem", "hazard-reporting"],
  },
  {
    slug: "litter-reporting",
    navLabel: "Litter Reporting",
    title: "Litter Reporting App – Report Litter, Dumping & Pollution | CleanApp",
    description:
      "CleanApp is the litter reporting app that started it all. Photograph litter, illegal dumping or pollution; AI maps it and routes it to the responsible brand, property owner or city.",
    h1: "Litter reporting app: turn trash into data that gets it cleaned up",
    lead:
      "CleanApp began as a litter reporting app, and it is still the easiest way to report litter, illegal dumping, overflowing bins and pollution. Every photo becomes a geolocated, brand-attributed data point that cities, property owners and brands use to clean up faster.",
    keywords: [
      "litter reporting app",
      "trash reporting app",
      "report illegal dumping",
      "report litter",
      "pollution reporting app",
      "fly tipping reporting app",
      "overflowing bin report",
      "environmental reporting app",
    ],
    sections: [
      {
        heading: "Why 'trash is cash'",
        paragraphs: [
          "Litter is the most visible symptom of a broken feedback loop: the people who see it have no easy way to tell the people who can remove it. CleanApp closes that loop. Reporters earn rewards for documenting litter, and organizations pay for the resulting intelligence — where waste accumulates, which brands' packaging dominates it and which bins overflow every weekend.",
        ],
      },
      HOW_IT_WORKS,
      {
        heading: "What CleanApp detects in litter reports",
        paragraphs: ["CleanApp's AI analyzes each photo and extracts:"],
        bullets: [
          "Litter probability and hazard probability, so a sharps find is prioritized over a candy wrapper.",
          "Brand detection on packaging, enabling brand-level litter accountability and extended producer responsibility (EPR) reporting.",
          "Waste type: packaging, construction debris, electronics, organic waste, hazardous materials.",
          "Exact GPS location and time, feeding live litter maps and hotspot analysis.",
        ],
      },
      {
        heading: "For cities, waste contractors and brands",
        paragraphs: [
          "Cities use CleanApp as a public litter and illegal dumping reporting channel that costs nothing to deploy and needs no app of their own. Waste contractors use hotspot data to re-route collection. Brands use brand-level litter data to measure packaging impact, support EPR compliance and target clean-up sponsorships where their packaging actually ends up.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I report illegal dumping?",
        answer:
          "Open CleanApp, photograph the dumped waste and submit. CleanApp records the location, classifies the waste type and routes the report to the responsible municipality or property owner.",
      },
      {
        question: "Does CleanApp work in my city?",
        answer:
          "CleanApp accepts litter reports anywhere in the world. Reports are mapped publicly and routed to any organization that has claimed the area or brand. Cities and brands can subscribe to receive reports and dashboards for their territory.",
      },
      {
        question: "Can brands see litter reports that feature their packaging?",
        answer:
          "Yes. CleanApp's AI detects brands on packaging. Brands that subscribe see every litter report featuring their products, with location, volume trends and hotspot maps.",
      },
    ],
    related: ["report-a-problem", "hazard-reporting", "solutions/cities", "solutions/brands"],
  },
  {
    slug: "report-a-problem",
    navLabel: "Report a Problem",
    title: "Report a Problem – Potholes, Graffiti, Litter, Hazards & More | CleanApp",
    description:
      "Need to report a problem in your neighborhood, building or favorite app? CleanApp routes any photo report to the right city department, property owner or brand automatically.",
    h1: "Report a problem — anywhere, about anything, in one tap",
    lead:
      "Pothole, graffiti, broken streetlight, abandoned vehicle, overflowing bin, broken elevator, crashing app: CleanApp is the one place to report a problem without figuring out who to call. Take a photo; CleanApp works out who is responsible and sends it to them.",
    keywords: [
      "report a problem",
      "report an issue",
      "report graffiti",
      "report a pothole",
      "report broken streetlight",
      "report abandoned vehicle",
      "311 app alternative",
      "citizen reporting app",
      "community issue reporting",
    ],
    sections: [
      {
        heading: "One app instead of a dozen hotlines",
        paragraphs: [
          "Every city, utility, landlord and company has its own way to report a problem — a 311 line, a web form, a support email, a Facebook page. Nobody can remember all of them, so most problems go unreported. CleanApp replaces the directory with a single action: photograph the problem.",
          "CleanApp's AI determines whether the problem is physical or digital, what kind of issue it is, how severe it is and who is responsible — then delivers the report through that organization's preferred channel.",
        ],
      },
      {
        heading: "Problems people report every day",
        paragraphs: ["CleanApp handles the full range of everyday issues, including:"],
        bullets: [
          "Streets and public space: potholes, broken streetlights, damaged signs, graffiti, fly-tipping, blocked drains, fallen trees.",
          "Buildings and property: broken elevators, leaks, broken doors and locks, damaged stairs, pest sightings, unsafe balconies.",
          "Parks and nature: litter, vandalism, damaged play equipment, polluted waterways.",
          "Businesses and brands: damaged products on shelves, broken self-checkouts, misleading pricing, unsafe store conditions.",
          "Digital: broken websites, crashing apps, failed payments, scam pages, dark patterns.",
        ],
      },
      HOW_IT_WORKS,
      {
        heading: "A public map of what needs fixing",
        paragraphs: [
          "Every CleanApp report appears on a live public map. Residents can see what has been reported nearby, organizations can see what is being said about their property or brand, and journalists and researchers can study patterns in how places and products fail. Transparency is what turns a complaint into accountability.",
        ],
      },
    ],
    faqs: [
      {
        question: "Who receives my report?",
        answer:
          "CleanApp routes reports to the organization responsible for the location or brand in the photo — a city department, property manager, facilities team or brand. Organizations that subscribe receive reports in real time; others are contacted through public channels.",
      },
      {
        question: "Can I report a problem anonymously?",
        answer:
          "Yes. You do not need an account to submit a report. Organizations receive the photo, location and AI analysis, not your identity.",
      },
      {
        question: "Is CleanApp an official 311 service?",
        answer:
          "CleanApp is not operated by any government, but cities can subscribe to receive CleanApp reports for their territory, and many reports are forwarded to municipal channels. It works alongside 311 where one exists and replaces it where one does not.",
      },
    ],
    related: ["litter-reporting", "hazard-reporting", "bug-reporting", "solutions/cities"],
  },
  {
    slug: "solutions/cities",
    breadcrumb: "Solutions",
    navLabel: "For Cities",
    title: "Citizen Reporting App for Cities & Municipalities | CleanApp",
    description:
      "Give residents a one-tap way to report potholes, litter, graffiti and hazards. CleanApp delivers AI-classified, geolocated reports to the right department with live maps and hotspot analytics.",
    h1: "Citizen issue reporting for cities, without building an app",
    lead:
      "CleanApp gives every resident and visitor a one-tap channel to report problems in your city — and gives your departments structured, AI-classified, geolocated reports with severity scores, hotspot maps and trend dashboards. No procurement of a custom 311 app, no adoption campaign.",
    keywords: [
      "citizen reporting app",
      "311 app",
      "smart city issue reporting",
      "municipal reporting software",
      "report a problem to the city",
      "public works reporting app",
      "city maintenance request app",
    ],
    sections: [
      {
        heading: "The adoption problem with city apps",
        paragraphs: [
          "Cities spend heavily on custom reporting apps that few residents install and fewer keep. CleanApp flips the model: residents already use CleanApp to report problems anywhere, and your city simply subscribes to receive the reports inside its boundaries.",
        ],
      },
      {
        heading: "What your departments receive",
        paragraphs: ["Every report inside your service area arrives with:"],
        bullets: [
          "Photo evidence, exact GPS location and timestamp.",
          "AI classification (litter, hazard, infrastructure, vandalism, environmental) and severity score.",
          "A plain-language summary ready for a work order.",
          "Live map and dashboard views, hotspot detection and trend analysis by district and category.",
          "Exports and API access for integration with your CMMS, 311 or GIS systems.",
        ],
      },
      {
        heading: "Draw your area, start receiving reports",
        paragraphs: [
          "CleanApp lets municipalities define custom service areas directly on the map. Reports inside those areas route to the right department automatically. Multi-area and multi-department setups are supported on Enterprise plans, with dedicated account management and custom dashboards.",
        ],
      },
      {
        heading: "Litter, dumping and public safety intelligence",
        paragraphs: [
          "Because CleanApp detects brands on litter and scores hazard severity, cities get more than a complaint queue. They get data to support extended producer responsibility programs, prioritize public safety spending and demonstrate results to residents with a public map.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does CleanApp integrate with our 311 or work-order system?",
        answer:
          "Yes. CleanApp provides exports and API access so reports can flow into existing 311, CMMS, GIS and ticketing systems. Enterprise plans include integration support.",
      },
      {
        question: "What does CleanApp cost for a city?",
        answer:
          "Residents report for free. Cities subscribe to CleanApp Pro or Enterprise based on area coverage and features. See the pricing page or contact us for municipal pricing.",
      },
      {
        question: "Can residents see what has been reported?",
        answer:
          "Yes. CleanApp's public map shows reports in your city, which increases trust and reduces duplicate reports. Sensitive details can be withheld from public view.",
      },
    ],
    related: ["report-a-problem", "litter-reporting", "hazard-reporting", "solutions/property-managers"],
  },
  {
    slug: "solutions/brands",
    breadcrumb: "Solutions",
    navLabel: "For Brands",
    title: "Brand Issue Reporting & Feedback Intelligence | CleanApp for Brands",
    description:
      "See every physical and digital issue reported about your brand — damaged products, unsafe stores, app bugs, littered packaging — in one AI-powered dashboard. CleanApp for brands.",
    h1: "Every issue about your brand, reported by the public, in one dashboard",
    lead:
      "Customers see your brand's failures before you do: a broken self-checkout, a recalled product still on shelves, a checkout bug, your packaging on a beach. CleanApp captures those reports from anyone, anywhere, attributes them to your brand with AI and delivers them as risk intelligence.",
    keywords: [
      "brand feedback app",
      "product issue reporting",
      "customer complaint app",
      "brand risk monitoring",
      "product defect reporting app",
      "brand reputation intelligence",
      "retail incident reporting",
    ],
    sections: [
      {
        heading: "Feedback you cannot get from surveys",
        paragraphs: [
          "Surveys and support tickets only reach customers who are already engaged. CleanApp reaches everyone who photographs a problem involving your brand, whether they are your customer or not. Reports are classified as physical (stores, products, packaging, signage, vehicles) or digital (websites, apps, kiosks), scored for severity and summarized for action.",
        ],
      },
      {
        heading: "What CleanApp for Brands includes",
        paragraphs: [],
        bullets: [
          "Brand dashboard with live feed of every report attributed to your brand.",
          "AI insights: recurring issues, severity trends, affected locations and products.",
          "Incident hotspot tracking across stores, venues and regions.",
          "Digital issue reports for your websites and apps, grouped by surface.",
          "Litter and packaging attribution data for sustainability and EPR reporting.",
          "Alerts, exports and API access for your support, QA and risk teams.",
        ],
      },
      {
        heading: "From complaint to competitive advantage",
        paragraphs: [
          "Brands that resolve public reports quickly turn critics into advocates and avoid the claims, recalls and PR incidents that start as unreported problems. CleanApp's public map also means your responsiveness is visible, which is a reputation asset in itself.",
        ],
      },
    ],
    faqs: [
      {
        question: "How does CleanApp know a report is about my brand?",
        answer:
          "CleanApp's AI detects logos, product packaging, store signage, app interfaces and website layouts in report photos and screenshots, and attributes the report to the brand with a confidence score.",
      },
      {
        question: "Can we respond to reporters?",
        answer:
          "Reports are anonymous by default. Brands can publish responses and resolution status, and reporters who opt in to contact can be reached through CleanApp.",
      },
      {
        question: "Is there a free way to see reports about our brand?",
        answer:
          "Yes. CleanApp's public brand pages show a sample of recent reports. Subscribing to CleanApp Pro unlocks the full feed, alerts, AI insights and dashboards.",
      },
    ],
    related: ["bug-reporting", "incident-reporting", "litter-reporting", "solutions/property-managers"],
  },
  {
    slug: "solutions/property-managers",
    breadcrumb: "Solutions",
    navLabel: "For Property Managers",
    title: "Property & Facility Issue Reporting App | CleanApp for Property Managers",
    description:
      "Let tenants, visitors and staff report maintenance issues and hazards with one photo. CleanApp routes reports to your facilities team with AI severity scoring and live site maps.",
    h1: "Maintenance and hazard reporting for buildings, campuses and venues",
    lead:
      "Tenants, guests, contractors and staff notice leaks, broken lifts, blocked exits and trip hazards long before scheduled inspections do. CleanApp lets any of them report with one photo, and gives your facilities team AI-classified, severity-scored, location-pinned reports on a live map of every property you manage.",
    keywords: [
      "property maintenance reporting app",
      "facility issue reporting app",
      "tenant issue reporting app",
      "building hazard reporting",
      "facilities management incident app",
      "maintenance request app",
    ],
    sections: [
      {
        heading: "Reporting without tenant onboarding",
        paragraphs: [
          "Tenant portals and maintenance request apps fail because the people who notice problems are not always tenants, and tenants rarely remember their portal login. CleanApp needs no account: a QR code in the lobby or a sign in the car park is enough for anyone to report a problem in seconds.",
        ],
      },
      {
        heading: "Built for multi-site portfolios",
        paragraphs: ["CleanApp for property managers includes:"],
        bullets: [
          "Custom property areas drawn on the map, each routed to the right team.",
          "AI classification and severity scoring to prioritize safety hazards over cosmetic issues.",
          "Live site maps and hotspot analysis across the portfolio.",
          "Reports from anyone on site: tenants, visitors, contractors, security and cleaning staff.",
          "Exports and API access for CMMS and work-order systems.",
        ],
      },
      {
        heading: "Reduce liability with a documented hazard record",
        paragraphs: [
          "Every CleanApp report is time-stamped, geolocated and photo-documented. That record shows when a hazard was first reported and how quickly it was resolved — evidence that matters for insurance, compliance audits and litigation defense.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can we restrict reports to our own properties?",
        answer:
          "Yes. Draw your property boundaries in CleanApp and you will receive only reports inside them. Multi-property portfolios are supported on Enterprise plans.",
      },
      {
        question: "Does CleanApp integrate with our CMMS?",
        answer:
          "CleanApp provides exports and API access so reports can create work orders in your existing CMMS or ticketing system.",
      },
    ],
    related: ["hazard-reporting", "incident-reporting", "report-a-problem", "solutions/workplace-safety"],
  },
  {
    slug: "solutions/workplace-safety",
    breadcrumb: "Solutions",
    navLabel: "Workplace Safety",
    title: "Workplace Safety & EHS Incident Reporting App | CleanApp",
    description:
      "A workplace safety reporting app employees and contractors actually use: one photo for hazards, near misses and incidents, AI severity scoring, live site maps and EHS-ready exports.",
    h1: "Workplace safety reporting your whole site will actually use",
    lead:
      "Near misses go unreported because reporting is slow. CleanApp makes hazard, near-miss and incident reporting a single photo for employees, contractors and visitors, and gives EHS teams AI-classified, severity-scored data on a live site map.",
    keywords: [
      "workplace safety app",
      "EHS incident reporting app",
      "near miss reporting app",
      "safety observation app",
      "employee hazard reporting",
      "occupational safety reporting software",
      "contractor incident reporting",
    ],
    sections: [
      {
        heading: "Why near-miss reporting rates stay low",
        paragraphs: [
          "Safety teams know that near misses predict injuries, yet most EHS software makes reporting a near miss harder than ignoring it: log in, choose a form, fill a dozen fields. CleanApp reduces reporting to a photo. The AI generates the classification, severity and summary, so the reporter's job takes seconds and the safety team still gets structured data.",
        ],
      },
      {
        heading: "Covers everyone on site, not just payroll",
        paragraphs: [
          "Contractors, delivery drivers, temporary workers and visitors are often excluded from internal safety apps. With CleanApp, anyone on site can report without an account, which closes the biggest blind spot in most safety programs.",
        ],
      },
      {
        heading: "EHS features",
        paragraphs: [],
        bullets: [
          "Hazard, near-miss and incident reporting with photo evidence, GPS and timestamp.",
          "AI hazard probability and severity scoring for triage.",
          "Live site map, hotspot detection and trend dashboards.",
          "Multi-site coverage and custom dashboards on Enterprise plans.",
          "Exports and API access for your existing EHS management system.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does CleanApp replace our EHS management system?",
        answer:
          "CleanApp is the intake layer. It captures hazards, near misses and incidents from everyone on site and feeds structured reports into your EHS system through exports and API, or serves as a lightweight system on its own for smaller operations.",
      },
      {
        question: "Can reports be kept internal?",
        answer:
          "Enterprise plans support private reporting areas where reports are visible only to your organization.",
      },
    ],
    related: ["incident-reporting", "hazard-reporting", "solutions/property-managers", "solutions/cities"],
  },
];

export function getLandingPage(slug: string): LandingPageContent | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug);
}
