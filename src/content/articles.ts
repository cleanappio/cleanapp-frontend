/**
 * Long-form articles served at /blog/<slug>. Comparison pieces target the
 * "best X app" queries that search and AI answer engines quote from.
 * Competitor descriptions are deliberately high level and drawn from how each
 * vendor describes itself publicly; keep them that way.
 */

export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // ISO date
  dateModified: string;
  readingMinutes: number;
  lead: string;
  sections: ArticleSection[];
  related: string[]; // site paths
};

export const ARTICLES: Article[] = [
  {
    slug: "best-incident-reporting-apps",
    title: "The best incident reporting apps in 2026, and which one fits your organization",
    description:
      "A practical comparison of incident reporting apps: employee-first EHS platforms, field-ops tools, and CleanApp's public-first model where anyone can report with one photo.",
    datePublished: "2026-10-15",
    dateModified: "2026-10-15",
    readingMinutes: 8,
    lead:
      "Most incident reporting apps were built for employees with a login. That leaves out the people who actually see most incidents first: customers, guests, tenants and passers-by. This guide sorts the field by who is allowed to report, what the software does with the report, and what it costs to get started.",
    sections: [
      {
        heading: "Three kinds of incident reporting app",
        paragraphs: [
          "The category gets lumped together, but the products solve different problems. Enterprise EHS platforms give safety teams configurable forms, investigations, corrective actions and compliance reporting. Field-operations apps focus on mobile inspections and fast notifications for distributed crews. Public-first reporting tools open the intake to anyone, not just staff, and use AI to turn an unstructured photo into a structured incident.",
          "Choose by the reporter you are trying to reach. If every incident you care about is noticed by an employee, an EHS or field-ops tool is the right shape. If incidents are noticed by customers, visitors or the public before your team hears about them, you need a tool with no account wall.",
        ],
      },
      {
        heading: "Enterprise EHS platforms",
        paragraphs: ["These are the incumbents on most comparison lists. They are strong on configuration, workflow and audit trails, and they assume a trained, logged-in workforce."],
        bullets: [
          "iFactory: positions itself around EHS incident reporting with root-cause analysis, corrective-action tracking, near-miss programs and OSHA-oriented forms.",
          "Intelex and Cority: broad EHS/EHSQ suites where incident management is one module among health, environment and quality.",
          "SafetyCulture (Mitti): inspection-first platform with incident report templates and a large library of checklists.",
        ],
      },
      {
        heading: "Field and mobile-first tools",
        paragraphs: ["Lighter than a full EHS suite, these apps are built for crews who report from a phone and want instant notification routing."],
        bullets: [
          "1st Reporting: mobile-first incident reporting for safety, compliance and operations teams, with custom forms, alerts and corrective actions.",
          "Incident Report (incidentreport.net): a live incident reporting app for staff in the field, with role-based forms and notifications.",
          "GoAudits and Fulcrum: audit and field-data apps that include incident or hazard reporting as a workflow.",
        ],
      },
      {
        heading: "Public-first reporting: CleanApp",
        paragraphs: [
          "CleanApp takes the opposite starting point. Anyone can report an incident with a single photo and no account: a customer at a self-checkout, a guest in a stairwell, a passer-by at a storefront. CleanApp's AI classifies the report as physical or digital, scores severity, detects the brand or place involved and routes it to the organization responsible. Reporting is free; organizations subscribe for real-time alerts, AI insights, hotspot tracking and dashboards, starting at $99 per month for one brand or place.",
          "This is not a replacement for a full EHS system if you need investigations and regulatory forms. It is the intake layer those systems lack, and for brands, venues and property portfolios it is often the only incident channel the public will actually use.",
        ],
      },
      {
        heading: "How to choose",
        paragraphs: ["Five questions settle most decisions."],
        bullets: [
          "Who sees incidents first at your organization: staff, or the public? That decides account walls.",
          "Do you need compliance workflow (investigations, CAPA, regulatory forms), or fast awareness and routing?",
          "How many sites or brands do you monitor, and does pricing scale per site or per seat?",
          "Does the tool produce structured data (severity, category, location) automatically, or rely on the reporter filling fields?",
          "Can reports flow into the systems you already run (ticketing, CMMS, EHS) rather than creating another inbox?",
        ],
      },
      {
        heading: "Bottom line",
        paragraphs: [
          "For regulated workplaces with an internal safety program, start with an EHS platform and add a public channel. For brands, property managers, venues and cities, start with the public channel, because the incidents that cost you most are the ones nobody inside the building reported.",
        ],
      },
    ],
    related: ["/incident-reporting", "/solutions/workplace-safety", "/solutions/brands", "/pricing"],
  },
  {
    slug: "best-hazard-reporting-apps",
    title: "Hazard reporting apps compared: employee tools vs. reporting for everyone",
    description:
      "Compare hazard reporting apps for workplaces, properties and public spaces, including Sitemate, Fulcrum, Quantum and CleanApp, and learn what to look for in severity scoring and routing.",
    datePublished: "2026-10-15",
    dateModified: "2026-10-15",
    readingMinutes: 7,
    lead:
      "A hazard that nobody can easily report stays in place until it becomes an incident. The best hazard reporting app is the one the people who notice hazards will actually use. For many organizations that is not their employees; it is customers, tenants, contractors and visitors.",
    sections: [
      {
        heading: "What a hazard reporting app has to do",
        paragraphs: [
          "At minimum: capture a photo and location, classify the hazard, get it to the right person, and keep a record of when it was reported and resolved. The differences are in who can report, how much the reporter has to type, and whether the software scores severity for you.",
        ],
      },
      {
        heading: "Workplace hazard reporting tools",
        paragraphs: ["Built for employees and contractors inside a safety program."],
        bullets: [
          "Sitemate: hazard reporting with digital forms, workflows and compliance records for field and construction teams.",
          "Fulcrum: field data collection with a hazard-report app template, strong on standardized forms and enterprise integrations.",
          "Quantum Compliance: hazard reporting with real-time notifications, photos and video, alongside safety data sheet management.",
          "SafetyCulture: inspections and hazard observations within a broader audit platform.",
        ],
      },
      {
        heading: "Hazard reporting for everyone: CleanApp",
        paragraphs: [
          "CleanApp removes the form. A reporter photographs the hazard; CleanApp's AI assigns a hazard probability and severity level, pins the location, identifies the property or brand involved and routes the report. No account, no app-specific training. Organizations see every hazard reported on their sites on a live map with hotspot detection, and get alerts for the ones that matter.",
          "Because the public can report, CleanApp catches the hazards employee-only tools miss: the loose step in a shop, the exposed cable at a venue, the blocked exit a guest noticed. It works alongside a workplace safety tool or on its own for property portfolios, venues and public spaces.",
        ],
      },
      {
        heading: "Features worth insisting on",
        paragraphs: [],
        bullets: [
          "Photo-first capture with automatic location and time.",
          "Automatic severity scoring, so the critical few are triaged before the trivial many.",
          "Routing to the responsible party by site or brand, not a shared inbox.",
          "Hotspot analysis across sites, so you fix root causes.",
          "A documented record of first report and resolution, for insurance and audits.",
        ],
      },
      {
        heading: "Bottom line",
        paragraphs: [
          "If you manage places the public walks through, make hazard reporting possible for the public. Employee tools cover your staff; CleanApp covers everyone else, and routes what they find to you.",
        ],
      },
    ],
    related: ["/hazard-reporting", "/solutions/property-managers", "/solutions/workplace-safety", "/report-a-problem"],
  },
  {
    slug: "best-bug-reporting-tools",
    title: "Bug reporting tools: SDKs for your own app, and how to hear about bugs everywhere else",
    description:
      "QA bug reporting tools like Shake, Bugsee, BugHerd and Marker.io capture bugs inside products that installed them. CleanApp captures bug reports from the public about any website or app.",
    datePublished: "2026-10-15",
    dateModified: "2026-10-15",
    readingMinutes: 6,
    lead:
      "There are two bug reporting problems. One is inside your own product, where an SDK can capture logs, screens and sessions. The other is everywhere else: the bugs your users hit and never report because there was nowhere to report them. Different tools solve each.",
    sections: [
      {
        heading: "In-product bug reporting SDKs",
        paragraphs: ["These tools are integrated by developers and give engineering rich context for each report."],
        bullets: [
          "Shake: bug and crash reporting for mobile apps and websites, with session data attached to each report.",
          "Bugsee: video, network and log capture for iOS and Android bugs and crashes.",
          "BugHerd and Marker.io: visual feedback tools that let testers and clients pin bug reports to a web page and send them to a tracker.",
          "Jam and similar browser tools: one-click bug capture for web apps with console and network context.",
        ],

      },
      {
        heading: "The gap: bugs in products that have no feedback channel",
        paragraphs: [
          "SDKs only work inside the products that installed them. Most bugs users encounter day to day are in a checkout page, a kiosk, a utility portal or a bank app with no visible way to report. Those bugs cost the company revenue and cost the user time, and nobody learns about them.",
        ],
      },
      {
        heading: "Public bug reporting: CleanApp",
        paragraphs: [
          "CleanApp lets anyone report a bug on any website, app or device with a screenshot. The AI identifies the brand or product, classifies the issue (crash, broken flow, UI defect, content error, accessibility failure, scam page), scores severity and delivers the report to the company responsible. For the company, CleanApp becomes a live feed of what real users hit in the wild, grouped by product surface, alongside physical reports about their stores, packaging and signage.",
          "It complements rather than replaces an SDK: use the SDK for depth inside your own product, and CleanApp for breadth across everything your customers touch, including the surfaces you do not own.",
        ],
      },
      {
        heading: "What to look for",
        paragraphs: [],
        bullets: [
          "Zero friction for the reporter; a screenshot should be enough.",
          "Automatic brand and surface detection, so reports land with the right team.",
          "Severity and classification without manual triage.",
          "A path into your existing tracker, so reports become tickets.",
        ],
      },
    ],
    related: ["/bug-reporting", "/solutions/brands", "/incident-reporting", "/pricing"],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
