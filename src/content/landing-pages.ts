/**
 * Search intent pages: answer a concrete question, then offer a reporting action.
 * Search terms document hypotheses, not measured demand or ranking promises.
 * Keep visible claims consistent with the reporting receipt and product evidence.
 */
export type LandingSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  links?: { label: string; href: string }[];
  example?: { label: string; text: string };
};

export type LandingPageContent = {
  slug: string;
  navLabel: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  keywords: string[];
  sections: LandingSection[];
  faqs: { question: string; answer: string }[];
  related: string[];
  audience?: "reporter" | "organization";
  reportKind?: "physical" | "digital";
  guide?: boolean;
  breadcrumb?: string;
  evidenceLink?: { label: string; href: string };
};

const WHAT_HAPPENS_NEXT: LandingSection = {
  heading: "What happens after you submit",
  paragraphs: [
    "CleanApp accepts your report and returns a receipt. AI structures the observation, identifies relevant brands or places and helps group related reports. CleanApp works to route that information to relevant recipients, who can investigate and respond. Keep your receipt to check the status available for your report.",
  ],
};

export const LANDING_PAGES: LandingPageContent[] = [
  {
    slug: "incident-reporting",
    navLabel: "Report an incident",
    title: "Report an Incident with a Photo | CleanApp",
    description: "Saw damage, a near miss or another problem? Document what happened with a photo and context. Report an incident to CleanApp in your browser.",
    h1: "Something happened. Make a useful record.",
    lead: "A damaged stair, a spill in a shop or a product that failed: record what you noticed, even when you do not know which team to tell.",
    keywords: ["report an incident", "incident reporting", "near miss report"],
    sections: [
      {
        heading: "What to include in an incident report",
        paragraphs: ["Describe what you observed in plain language. Separate what you saw from what you think caused it."],
        bullets: [
          "A photo of the problem and enough surrounding context to identify it.",
          "Where and when it happened, including a site, store or product name if known.",
          "What happened and what was affected. Say if the condition is still present.",
          "Relevant detail that is not visible in the photo, without including other people's private information.",
        ],
      },
      WHAT_HAPPENS_NEXT,
      {
        heading: "For teams responsible for a place or product",
        paragraphs: ["Customers, visitors and contractors may notice issues outside an internal reporting process. CleanApp brings physical and digital observations into a common reporting platform, with maps and organization views. Explore the relevant solution and current plans to evaluate the fit for your team."],
      },
    ],
    faqs: [
      { question: "Can I report a near miss?", answer: "Yes. Describe the condition and what nearly happened. A useful near-miss report explains the risk without presenting an injury or outcome that did not occur." },
      { question: "What happens after an incident report?", answer: "CleanApp records the observation, analyzes its text and images and works to route it to relevant recipients. Keep your receipt to check available status." },
      { question: "Is CleanApp an emergency service?", answer: "No. If someone needs urgent help or there is immediate danger, contact the appropriate local emergency service." },
    ],
    related: ["hazard-reporting", "bug-reporting", "solutions/workplace-safety"],
  },
  {
    slug: "hazard-reporting",
    navLabel: "Report a hazard",
    title: "Report a Safety Hazard | CleanApp",
    description: "Report a blocked exit, damaged railing, spill or other safety concern. Add a photo, location and what makes the condition hazardous.",
    h1: "Spotted a hazard? Show what needs attention.",
    lead: "A photo can make a blocked exit, broken railing or slippery floor easier to understand. Add where it is and who or what is affected.",
    keywords: ["report a safety hazard", "report a hazard", "blocked exit", "broken railing"],
    reportKind: "physical",
    sections: [
      {
        heading: "Describe the condition and the risk",
        paragraphs: ["The most useful report helps another person find and assess the condition. Do not move closer or recreate an unsafe situation to get a photo."],
        bullets: ["Show the hazard and its surroundings, where you can do so safely.", "Give a precise location: floor, entrance, aisle, nearby sign or map position.", "Explain the obstacle or potential harm, such as a loose handrail on the only staircase.", "State when you saw it and whether it appeared temporary or ongoing."],
      },
      {
        heading: "Unsure who manages the location?",
        paragraphs: ["You can still document what you saw. Include any building, business or place name you know. A visible sign, nearby landmark or map position helps CleanApp associate the observation with the relevant place."],
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "Can a visitor report a hazard?", answer: "Yes. You do not have to be an employee to submit an observation to CleanApp. Include enough context for someone unfamiliar with the site to find it." },
      { question: "Should I wait for CleanApp if someone is in immediate danger?", answer: "No. Contact the appropriate emergency service or on-site team for urgent assistance. CleanApp is a reporting platform, not an emergency dispatch service." },
    ],
    related: ["report-an-accessibility-barrier", "incident-reporting", "solutions/property-managers", "solutions/workplace-safety"],
  },
  {
    slug: "bug-reporting",
    navLabel: "Report a software bug",
    title: "Report a Bug on a Website or App | CleanApp",
    description: "Found a broken website, crashing app or failed checkout? Report the problem with a screenshot, affected product and steps that explain what went wrong.",
    h1: "The website is broken. The feedback form is missing.",
    lead: "Record the bug in CleanApp with a screenshot and a short explanation. You can report a product you use without being part of its development team.",
    keywords: ["report a website bug", "report an app bug", "website not working", "bug reporting"],
    reportKind: "digital",
    sections: [
      {
        heading: "A screenshot is the start of a useful bug report",
        paragraphs: ["Show the failure, then explain the action that led to it. A screenshot by itself may not reveal the cause or let someone reproduce the problem."],
        bullets: ["Name the website or app and include the affected URL when relevant.", "Explain what you tried to do, what you expected and what happened instead.", "Add the device, browser or app version if you know them.", "Remove passwords, account details and other private information from the screenshot."],
      },
      {
        heading: "One place to document a problem you encountered",
        paragraphs: ["CleanApp accepts digital observations as well as physical ones. AI helps structure the issue, identify the relevant brand and connect related reports, then CleanApp works to route the information to the right recipients."],
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "How do I report a bug when there is no feedback form?", answer: "Name the website or app, show the problem and explain what led to it. Submit that observation to CleanApp, which uses AI to structure it and identify relevant recipients." },
      { question: "Is CleanApp a bug tracker like Jira?", answer: "CleanApp is a public reporting platform for problems people encounter across products and places. It is not a replacement for a development team's internal issue workflow." },
      { question: "Can AI reconstruct a bug from a screenshot?", answer: "AI can help describe what is visible, but a screenshot does not establish the full sequence or root cause. Include your own steps, expected result and actual result." },
    ],
    related: ["report-a-website-problem", "report-an-accessibility-barrier", "solutions/brands"],
  },
  {
    slug: "litter-reporting",
    navLabel: "Report litter or waste",
    title: "Report Litter, Waste or an Overflowing Bin | CleanApp",
    description: "Document litter, overflowing bins and dumped waste with a photo and location. Help make a local environmental problem visible through CleanApp.",
    h1: "Litter has a location. Give it a record.",
    lead: "Show the waste, where it is and the scale of the problem. A clear observation is more useful than a complaint with no location.",
    keywords: ["report litter", "overflowing bin", "report dumped rubbish", "litter reporting"],
    reportKind: "physical",
    sections: [
      {
        heading: "What makes a useful litter report",
        paragraphs: ["Capture the litter and its setting. Include an address, landmark or map position and distinguish an overflowing bin from scattered waste or a larger dumping site."],
        bullets: ["Describe the approximate amount and type of waste you can see.", "Mention blocked paths, nearby drains or other visible impacts.", "Include branding only when it is actually visible; packaging does not establish who discarded it.", "Do not handle unknown waste to improve a photo."],
      },
      {
        heading: "For a larger dumping site",
        paragraphs: ["Illegal dumping needs different context from a single dropped wrapper. The dedicated guide explains what to record about access, extent and repeated dumping."],
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "Can I report an overflowing public bin?", answer: "Yes. Show the bin and its surroundings, add its location and describe the visible overflow. Include a bin number or nearby landmark if there is one." },
      { question: "Does branding on litter prove who dropped it?", answer: "No. A visible logo can identify packaging, but it does not establish who discarded it or who is legally responsible for the location." },
    ],
    related: ["report-illegal-dumping", "report-a-pothole", "solutions/cities", "solutions/brands"],
  },
  {
    slug: "report-a-problem",
    navLabel: "Report a problem",
    title: "Report a Problem — Physical or Digital | CleanApp",
    description: "Something broken, unsafe or not working? Report a physical or digital problem to CleanApp with a photo or screenshot, even when you do not know whom to tell.",
    h1: "Something's wrong. You don't know who to tell.",
    lead: "A pothole, a broken entrance, a crashing website. Tell us what happened. Add a photo or screenshot if it helps.",
    keywords: ["report a problem", "who do I report this to", "report an issue"],
    sections: [
      {
        heading: "Start with the problem, not a department",
        paragraphs: ["You do not need to choose a corporate team or understand a city's org chart to document an observation. Identify the place or product, show the problem and explain the effect it had."],
        bullets: ["Physical: streets, buildings, litter, damaged products and access barriers.", "Digital: broken websites, app errors, failed flows and inaccessible interfaces."],
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "What if I do not know who is responsible?", answer: "Include the location or the website or app name and describe what you observed. CleanApp's analysis helps identify relevant places, brands and recipients." },
      { question: "Can I report in a browser?", answer: "Yes. Describe the problem, add a photo or screenshot if it helps and send it from this page. The iOS and Android apps are also available." },
      { question: "How do I check what happened to my report?", answer: "Keep the receipt returned after submission. It links to the status available for your report and, when available, its public report page." },
    ],
    related: ["report-a-pothole", "report-illegal-dumping", "report-a-website-problem", "report-an-accessibility-barrier"],
  },
  {
    slug: "solutions/cities",
    navLabel: "Cities & communities",
    audience: "organization",
    title: "Community Problem Reporting for Cities | CleanApp",
    description: "Explore a public reporting channel for local problems: potholes, litter, damaged infrastructure and access barriers. See CleanApp's maps and organization plans.",
    h1: "See the problems residents already notice.",
    lead: "A broken streetlight, a blocked path, waste beside a park. CleanApp gives local observations a common place to start, beyond a city's existing forms and phone lines.",
    keywords: ["community issue reporting", "citizen reporting", "municipal issue reporting"],
    evidenceLink: { label: "Explore public reports on the map", href: "/?tab=physical" },
    sections: [
      {
        heading: "A resident starts with a place and a problem",
        paragraphs: ["People do not always know which department manages a road, bin or public entrance. Photo and location context can make their observations easier for a city team to assess. CleanApp's public map provides another way to explore reported conditions."],
      },
      {
        heading: "Evaluate the operational fit",
        paragraphs: ["Start with an area your team looks after. Explore reports, map context and AI-assisted analysis, then decide how incoming observations will reach the people who review local issues. Current organization plans describe the available scope."],
        bullets: ["Define the geography and report types your team is responsible for.", "Agree how observations will be reviewed and checked against existing requests.", "Discuss the handoff to your existing request-management process.", "Measure useful reports and follow-through, alongside report counts."],
      },
      {
        heading: "Try a review with one real place",
        paragraphs: ["Open the public map and choose an area your team knows. Inspect an individual observation: can someone locate the condition from the image and description? Check its date, distinguish the reporter's words from AI analysis, and decide whether it belongs in your team's remit. Compare it with existing requests before treating it as a new job."],
        bullets: ["A map marker is an observation, not confirmation that a repair request exists.", "Several observations may concern one condition; they are not necessarily separate incidents.", "Record the next operational step and its owner in your established process."],
        links: [{ label: "Open the public physical-report map", href: "/?tab=physical" }],
      },
      {
        heading: "Set clear expectations for residents",
        paragraphs: ["CleanApp is an independent reporting platform. It can help residents document an observation alongside the city's designated process for official requests."],
      },
    ],
    faqs: [
      { question: "Is CleanApp the city's official 311 service?", answer: "No. CleanApp is independent. Residents should use the city's designated process when an official request or urgent response is needed." },
      { question: "Can a city connect CleanApp to an existing work-order system?", answer: "Discuss your current tools and required handoff with the CleanApp team. The integration and operational process should be agreed for your deployment." },
    ],
    related: ["report-a-pothole", "report-illegal-dumping", "report-an-accessibility-barrier", "litter-reporting"],
  },
  {
    slug: "solutions/brands",
    navLabel: "Brands & product teams",
    audience: "organization",
    title: "Physical & Digital Issue Reports for Brands | CleanApp",
    description: "Evaluate customer problem reports with original source context, AI-assisted analysis and related evidence. Explore CleanApp's public brand views and organization plans.",
    h1: "Your brand exists on shelves, streets and screens.",
    lead: "A broken checkout and damaged packaging are different problems with a common need: a clear observation that helps the right team understand what happened.",
    keywords: ["product issue reporting", "brand issue monitoring", "customer problem reports", "customer feedback outside support channels"],
    evidenceLink: { label: "Explore public OpenAI reports", href: "/digital/openai" },
    sections: [
      {
        heading: "Observations beyond your feedback form",
        paragraphs: ["CleanApp accepts reports about physical products and locations as well as websites and apps. AI-assisted classification and brand identification organize those observations; related reports can reveal recurring problems across the customer experience."],
      },
      {
        heading: "Assess the evidence before acting",
        paragraphs: ["Begin with the original observation and any linked source. Check what the person actually experienced, when it happened and which product or place it concerns. An AI summary helps you navigate the evidence; check the underlying report before relying on its interpretation."],
        bullets: ["Personal experiences and news or discussion answer different questions. Use the source-type filters to inspect them separately.", "A brand association identifies a possible subject. It does not prove fault, ownership or legal responsibility.", "Related observations can suggest a pattern to investigate. Their number alone does not establish how widespread an issue is."],
      },
      {
        heading: "Walk through a public brand view",
        paragraphs: ["Use the public OpenAI report view as a product walkthrough. Inspect a report and its source context, compare personal experiences with news and discussion, then examine the related evidence. The example is a public product surface; it does not imply that OpenAI is a CleanApp customer or endorses the service."],
        bullets: ["Identify the concrete task or product affected, rather than starting with a sentiment score.", "Separate the observation from the AI interpretation and note any missing context.", "Decide what your product, support or operations team would need to check next."],
        links: [{ label: "Open public reports associated with OpenAI", href: "/digital/openai" }],
      },
      {
        heading: "Evaluate CleanApp for your team",
        paragraphs: ["Use a small set of reports to test the fit for your team. Can a reviewer find the original evidence, distinguish a personal experience from coverage, and identify a useful next step? Review current plans and discuss the brands, places and available coverage you need before choosing a workflow."],
        bullets: ["Compare physical and digital observations relevant to your brand.", "Check the quality of the supporting evidence and attribution.", "Choose the relevant brands and places, and agree how your team reviews reports.", "Track investigated issues and useful follow-up."],
      },
    ],
    faqs: [
      { question: "Does a brand match prove the brand caused the problem?", answer: "No. A logo, storefront or interface can help identify the subject of an observation. It does not establish cause, ownership or legal responsibility." },
      { question: "Does CleanApp capture every issue about our brand?", answer: "No. CleanApp can only work with the observations and data it receives. Public reporting is a source of evidence, not a complete census of customer problems." },
      { question: "How does this fit alongside social listening and customer support?", answer: "Use CleanApp to inspect problem observations and related evidence about products and places. Compare that evidence with the feedback and requests your team already receives. Coverage, access and any connection to existing tools should be checked for your deployment." },
    ],
    related: ["bug-reporting", "report-a-website-problem", "litter-reporting", "incident-reporting"],
  },
  {
    slug: "solutions/property-managers",
    navLabel: "Property & facilities teams",
    audience: "organization",
    title: "Property & Building Problem Reporting | CleanApp",
    description: "Help tenants, visitors and staff document building problems. Explore photo reporting for maintenance issues, damaged entrances and accessibility barriers.",
    h1: "The person who sees the problem may be a visitor.",
    lead: "A broken door, a leak or a blocked entrance can be spotted by anyone on site. Give the observation enough context for a property team to investigate.",
    keywords: ["building issue reporting", "report building maintenance", "property problem reporting"],
    evidenceLink: { label: "Explore physical problem reports", href: "/?tab=physical" },
    sections: [
      {
        heading: "Make a building issue findable",
        paragraphs: ["An address alone may not identify a problem in a large building. Encourage people to add the entrance, floor, unit or nearby feature, along with a photo of the condition and a short description of its impact."],
      },
      {
        heading: "Connect public observations to a responsible workflow",
        paragraphs: ["CleanApp offers reporting and organization views; the operational response still needs an owner. Decide which team reviews reports, checks the location and creates a maintenance request when appropriate. Confirm any required connection to your existing tools before rollout."],
      },
      {
        heading: "Check whether a report is ready for a site visit",
        paragraphs: ["Use the public map to inspect the context an observation provides. For your own properties, a reviewer should be able to identify the building, entrance or floor, understand the visible condition and decide what needs checking. A public example demonstrates the reporting format; it does not establish coverage of your buildings."],
        bullets: ["Check the observation date and whether the same condition is already recorded.", "Confirm the site and affected route before assigning work.", "Keep the repair decision and completion record in your designated maintenance process."],
        links: [{ label: "Inspect public physical reports", href: "/?tab=physical" }],
      },
      {
        heading: "Be explicit about sensitive information",
        paragraphs: ["A maintenance photo can inadvertently include a resident, door code or private interior. Ask reporters to include only what is needed to show the issue. Discuss visibility and data requirements with CleanApp before using the service for sensitive operational reports."],
      },
    ],
    faqs: [
      { question: "Can a tenant report a building problem?", answer: "Yes. A tenant, visitor or member of staff can submit an observation to CleanApp. For an official repair request or urgent building problem, also use the property's designated contact process." },
      { question: "Does a CleanApp report create a maintenance work order?", answer: "Agree the review process with your property team and discuss any required handoff to existing maintenance tools with CleanApp." },
    ],
    related: ["hazard-reporting", "report-an-accessibility-barrier", "incident-reporting"],
  },
  {
    slug: "solutions/workplace-safety",
    navLabel: "Safety teams",
    audience: "organization",
    title: "Hazard & Near-Miss Observations for Safety Teams | CleanApp",
    description: "Explore a photo-based channel for hazards and near misses noticed by staff, contractors and visitors. Evaluate CleanApp alongside your safety workflow.",
    h1: "A useful safety observation starts with what someone saw.",
    lead: "People on site can notice a damaged guard, blocked route or near miss before a safety team does. Capture the condition and the context needed to review it.",
    keywords: ["hazard observation reporting", "near miss reporting", "workplace safety reporting"],
    evidenceLink: { label: "Inspect public physical observations", href: "/?tab=physical" },
    sections: [
      {
        heading: "Document the observation clearly",
        paragraphs: ["Describe the location, the visible condition, who or what could be affected and when it was observed. Distinguish an ongoing hazard from an event that has already happened. AI-assisted analysis can help organize a report; a qualified person still needs to assess it."],
      },
      {
        heading: "Agree the response before introducing a new channel",
        paragraphs: ["Identify who reviews observations and how urgent conditions reach the on-site team. Confirm visibility, data handling and any required connection to an existing safety process with CleanApp before deployment."],
      },
      {
        heading: "Evaluate the evidence a reviewer would receive",
        paragraphs: ["Explore a physical observation on the public map and consider what a safety reviewer could establish from it. The location, time, description and image may help identify a condition; an image or AI summary cannot establish everything happening on site. Check what is missing before deciding whether an inspection or another action is needed."],
        links: [{ label: "Open public physical observations", href: "/?tab=physical" }],
      },
      {
        heading: "Keep formal safety obligations in the established process",
        paragraphs: ["Keep urgent escalation, formal incident records and required notifications in your established safety process. Use CleanApp to add observations from people who notice conditions on site."],
      },
    ],
    faqs: [
      { question: "Can AI determine whether a workplace is safe?", answer: "No. A report and its AI analysis describe limited evidence. They do not replace an on-site assessment, a competent safety professional or the organization's established process." },
      { question: "Does CleanApp replace our safety management system?", answer: "CleanApp adds a reporting channel for observations on site. Discuss how those observations should reach your safety team and any existing tools." },
    ],
    related: ["hazard-reporting", "incident-reporting", "solutions/property-managers"],
  },
  {
    slug: "report-a-pothole",
    navLabel: "Report a pothole",
    guide: true,
    reportKind: "physical",
    title: "How to Report a Pothole | CleanApp",
    description: "Report a pothole with a photo, road location, direction and nearby landmark. Learn which details help make a damaged-road observation useful.",
    h1: "Report a pothole someone can actually find.",
    lead: "“There's a pothole on the main road” leaves a lot to guess. Show the damage and add the road, direction and nearest identifiable point.",
    keywords: ["report a pothole", "who do I report a pothole to", "report road damage"],
    sections: [
      {
        heading: "Locate the damage precisely",
        paragraphs: ["Record the street or road name, nearest junction or address and the side or lane affected. If you use a map position, check that it points to the damage rather than where you happened to be standing."],
        bullets: ["Add the direction of travel and a fixed landmark.", "Describe the visible extent without stepping into traffic to measure it.", "Say whether the surface is broken, sunken or filled with water.", "Record when you saw it; avoid presenting an old photo as a current observation."],
      },
      {
        heading: "Who receives a pothole report?",
        paragraphs: ["The relevant road operator depends on the location and road. For an official repair request, use the responsible local authority or road operator's reporting channel. CleanApp provides another place to document the observation when you do not know where to start.", "In England or Wales, GOV.UK offers a postcode lookup for the local council. Motorways and the A roads managed by National Highways in England have a separate reporting route. GOV.UK also links to the services for Scotland and Northern Ireland. Elsewhere, look for the road operator's official damaged-road or public-works reporting service."],
        links: [{ label: "GOV.UK: find the official pothole reporting route", href: "https://www.gov.uk/report-pothole" }],
      },
      {
        heading: "An example with enough detail to locate it",
        paragraphs: ["Use this fictional example as a guide to the level of detail. Replace the place, time and description with what you actually observed; leave out measurements or causes you cannot establish."],
        example: { label: "Fictional example — road damage", text: "At 8:20 this morning I saw broken, sunken road surface on Example Road, in the lane heading toward Sample Street, just before the bus stop. Water covered part of the damage, so I could not see its depth. The photo shows the road surface and the bus-stop sign from the pavement." },
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "Can I report a pothole without knowing which authority owns the road?", answer: "Yes. Give the road location, nearest landmark and what you observed. CleanApp uses that context to help identify the relevant place and recipients." },
      { question: "What if there is already a pothole report nearby?", answer: "Check the public map for context. If you add a new observation, include the date and explain any changed condition so it can be distinguished from an older report." },
      { question: "Does a CleanApp receipt mean the road operator received a repair request?", answer: "A receipt confirms that CleanApp accepted the submission. It does not by itself confirm delivery to the road operator, a scheduled repair or a completed fix. Use the operator's designated channel when you need an official request." },
    ],
    related: ["report-a-problem", "hazard-reporting", "solutions/cities"],
  },
  {
    slug: "report-illegal-dumping",
    navLabel: "Report illegal dumping",
    guide: true,
    reportKind: "physical",
    title: "How to Report Illegal Dumping or Fly-Tipping | CleanApp",
    description: "Document dumped rubbish or fly-tipping with its location, visible waste and extent. Report an observation without guessing who left it there.",
    h1: "Found dumped waste? Document the place and the extent.",
    lead: "A pile of bags, discarded furniture or repeated dumping needs more context than a single piece of litter. Show what is there and how someone can locate it.",
    keywords: ["report illegal dumping", "report fly tipping", "dumped rubbish"],
    sections: [
      {
        heading: "Show the site without disturbing the waste",
        paragraphs: ["A wider photo helps show the extent and surroundings. A second view can clarify the type of material, where it is visible from a safe position."],
        bullets: ["Add a road, track, entrance or nearby landmark and check the map location.", "Describe the visible waste and approximate extent; do not open bags to identify it.", "Mention blocked access, a nearby waterway or other visible impact.", "State when you saw it and whether you personally observed repeated dumping."],
      },
      {
        heading: "Who should I tell about dumped waste?",
        paragraphs: ["Start with the official waste or environmental reporting service for the place where the waste is located. In England, Scotland and Wales, GOV.UK directs small-scale fly-tipping reports to the local council's environmental health team. For large-scale dumping in England, it provides Environment Agency reporting instructions. Northern Ireland has separate guidance.", "CleanApp can document what you observed alongside that official process. Include the location even if you do not know the landowner or which authority is responsible."],
        links: [{ label: "GOV.UK: official fly-tipping reporting guidance", href: "https://www.gov.uk/report-flytipping" }],
      },
      {
        heading: "Report observations, not assumptions about a person",
        paragraphs: ["Do not identify someone as responsible merely because a name or brand appears on discarded material. Keep the report focused on what you actually saw. Use the relevant authority's designated process if you need to submit evidence of an alleged offense."],
      },
      {
        heading: "A useful report describes what is visible",
        paragraphs: ["This fictional example records the site and uncertainty without guessing who left the waste or what is inside the bags."],
        example: { label: "Fictional example — dumped waste", text: "At 4 pm today I saw about six tied bags and a broken chair beside the north entrance to Example Park, next to the sign on Sample Road. The pile partly blocks the entrance. I could not see what was inside the bags and did not open them. I did not see anyone leave the waste." },
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "Is fly-tipping the same reporting topic as illegal dumping?", answer: "Fly-tipping is a term commonly used for dumped waste. In your report, focus on the actual location, material and extent rather than needing to choose a legal classification." },
      { question: "Should I remove or inspect the dumped material first?", answer: "You do not need to handle waste to report it. Document what is visible and include any uncertainty about the contents." },
    ],
    related: ["litter-reporting", "report-a-problem", "solutions/cities"],
  },
  {
    slug: "report-a-website-problem",
    navLabel: "Report a broken website",
    guide: true,
    reportKind: "digital",
    title: "How to Report a Broken Website or App | CleanApp",
    description: "A page will not load, checkout fails or an app crashes? Capture the affected URL, screenshot and steps to explain the problem through CleanApp.",
    h1: "Show where the website stopped working.",
    lead: "A failed checkout, a button that does nothing or an app that closes unexpectedly: explain the task you were trying to complete and where it failed.",
    keywords: ["report broken website", "report website problem", "checkout not working", "app keeps crashing"],
    sections: [
      {
        heading: "Include enough context to investigate",
        paragraphs: ["Capture the error or broken state and add the page URL or app name. Explain the sequence in your own words; a screenshot cannot establish the steps by itself."],
        bullets: ["What you tried: for example, selecting delivery and pressing Continue.", "What you expected and what happened instead, including the exact error text if useful.", "When it happened and whether it happened more than once.", "Device, browser and app version when known; never include login credentials."],
      },
      {
        heading: "Find the website or app's support channel",
        paragraphs: ["For a website, look for Help, Contact or Support on the service's own site. Name the affected page and explain the task that failed. For an account-specific response, contact that service directly as well as documenting the problem.", "On iPhone or iPad, open the app's App Store page, scroll to Ratings & Reviews and choose App Support. On Android, open the app's details page in Google Play and choose App support to find the developer's contact information. Apple and Google both direct users to the app developer for problems inside the app."],
        links: [{ label: "Apple: contact an app developer", href: "https://support.apple.com/en-au/102435" }, { label: "Google Play: contact an Android app's developer", href: "https://support.google.com/googleplay/answer/113418?hl=en-gb" }],
      },
      {
        heading: "Turn “checkout is broken” into a useful report",
        paragraphs: ["This fictional example describes the observed failure without claiming to know its cause. A text report is enough to start; add a screenshot when it helps show the problem."],
        example: { label: "Fictional example — failed website checkout", text: "On https://example.com/checkout at about 2 pm today, I selected a delivery option and pressed Continue. I expected to see the payment step, but the page stayed on delivery and displayed ‘Something went wrong’. The same thing happened when I tried once more. I was using Safari on an iPhone; I do not know the browser version. The screenshot shows the error with my personal details removed." },
      },
      {
        heading: "If the problem involves an order or payment",
        paragraphs: ["A CleanApp report documents the issue. For an account-specific response, order change or payment question, also contact the service's official support. Do not include card details, passwords or private account information in a public problem report."],
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "Can I report a broken website that is not mine?", answer: "Yes. Include the affected service, what you tried and what happened. CleanApp helps structure observations from people who use a product, even when they are outside its development team." },
      { question: "Can CleanApp recover a failed purchase or refund?", answer: "A problem report is not an account support request or a refund process. Contact the merchant or service through its official support channel for help with a specific transaction." },
      { question: "Do I need technical knowledge or a screenshot to report an app problem?", answer: "No. Describe the app or website, what you tried, what you expected and what happened instead. Include an error message or screenshot if it helps, and leave unknown device or version details unknown." },
    ],
    related: ["bug-reporting", "report-an-accessibility-barrier", "solutions/brands"],
  },
  {
    slug: "report-an-accessibility-barrier",
    navLabel: "Report an access barrier",
    guide: true,
    title: "How to Report an Accessibility Barrier | CleanApp",
    description: "Document a blocked entrance, unusable control or other physical or digital access barrier. Explain the task, the obstacle and its impact.",
    h1: "What should be accessible isn't. Make the barrier clear.",
    lead: "A blocked ramp and a form that cannot be used with a keyboard are different barriers. A useful report explains what someone was trying to do and what prevented it.",
    keywords: ["report accessibility issue", "report blocked wheelchair access", "website accessibility problem"],
    sections: [
      {
        heading: "For a physical access barrier",
        paragraphs: ["Show the route, entrance, facility or control and identify its exact location. Explain the practical obstacle: for example, a bin blocking the step-free entrance or a lift unavailable on the only accessible route."],
        bullets: ["Name the entrance, floor or part of the route affected.", "Describe the task or journey that could not be completed.", "Say whether another usable route was visible, without assuming it meets everyone's needs."],
      },
      {
        heading: "For a website or app barrier",
        paragraphs: ["Include the affected page or screen, the task and the point where progress stops. Mention a keyboard, screen reader, zoom setting or other relevant setup if you choose to share it. A screenshot may need a written explanation when the problem is not visible."],
      },
      {
        heading: "Tell the organization what task was blocked",
        paragraphs: ["For a building or public place, use the site operator's designated accessibility or facilities contact when you need an official access request. Identify the entrance, route or facility and explain what prevented use.", "For a website, W3C's accessibility guidance recommends contacting the organization responsible for the site. Look for its accessibility contact, page owner or support channel. Include the page URL, the task and the barrier; add browser or assistive technology details if you know them. Keep a record of your message so you can follow up."],
        links: [{ label: "W3C WAI: contacting organizations about inaccessible websites", href: "https://www.w3.org/WAI/teach-advocate/contact-inaccessible-websites/" }],
      },
      {
        heading: "Explain the interaction an image cannot show",
        paragraphs: ["A written explanation matters when a screenshot looks normal. This fictional example describes the point where a keyboard task stops."],
        example: { label: "Fictional example — keyboard access barrier", text: "On https://example.com/contact today, I used Tab to move through the contact form. I could enter my name and message, but I could not reach the Send button with the keyboard. I expected to submit the form without a mouse. I was using Firefox on a Windows laptop. I do not know whether the same problem happens with other setups." },
      },
      {
        heading: "Describe the impact without disclosing a diagnosis",
        paragraphs: ["Focus on the barrier and its effect on the task or route. You do not need to share a diagnosis to make that experience clear. For an official accessibility request, also use the organization's designated contact process."],
      },
      WHAT_HAPPENS_NEXT,
    ],
    faqs: [
      { question: "Can I report an accessibility problem that is not visible in a screenshot?", answer: "Yes. Explain the task, the interaction and what prevented completion. For a digital report, include the page and relevant setup; the written context can be essential when an image does not show the barrier." },
      { question: "Do I need to share a disability or diagnosis?", answer: "No. Focus on the barrier and its effect on the task or route. Include only the personal information you choose to share and that is necessary to understand the observation." },
    ],
    related: ["hazard-reporting", "bug-reporting", "solutions/property-managers", "solutions/brands"],
  },
];

export function getLandingPage(slug: string): LandingPageContent | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug);
}

export function reportingHref(page: LandingPageContent): string {
  return `/report-a-problem${page.reportKind ? `?kind=${page.reportKind}` : ""}`;
}
