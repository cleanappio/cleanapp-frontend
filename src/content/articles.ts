/**
 * Practical selection guides. Existing slugs are retained for stable links.
 * These are editorial criteria, not rankings, a product survey or market data.
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
  datePublished: string;
  dateModified: string;
  readingMinutes: number;
  lead: string;
  sections: ArticleSection[];
  related: string[];
  sources?: { title: string; href: string }[];
};

export const ARTICLES: Article[] = [
  {
    slug: "best-incident-reporting-apps",
    title: "Choosing an incident reporting tool for staff and public reports",
    description: "Choose incident reporting tools by who reports, the evidence needed and the next handoff. A practical guide for teams looking after places and products.",
    datePublished: "2026-10-15",
    dateModified: "2026-10-15",
    readingMinutes: 3,
    lead: "Start with the person who notices the incident. An employee, contractor, customer and passer-by may need different ways to tell you what happened. Choose the reporting channel and the team's follow-up process together.",
    sections: [
      {
        heading: "Decide who needs to report",
        paragraphs: ["List the people who can encounter the problem and try the flow from their perspective. Can a visitor report without a work account? Can a member of staff identify the site and explain what happened from a phone?"],
        bullets: ["Internal reports may need employee identity, site-specific fields and access controls.", "Public observations need a clear starting point and enough context to identify the place or product.", "Sensitive incident records need an agreed process for visibility and personal information."],
      },
      {
        heading: "Separate capture from investigation",
        paragraphs: ["A useful intake flow records what was observed. Investigation adds review, responsibility and a decision about action. HSE's incident investigation workbook describes a process from gathering information through analysis and an action plan; receiving a report is the beginning of that work."],
      },
      {
        heading: "Test the handoff with a real scenario",
        paragraphs: ["Use a representative example such as a broken entrance or damaged product. Follow it from the first message to the person who reviews it."],
        bullets: ["Can the reviewer find the relevant place or product from the supplied context?", "Can they distinguish the original observation from an AI summary?", "What happens when the responsible team is unclear or a report is duplicated?", "Who records the response, and how is that information available to the reporter?", "Which handoffs to existing tools are available today and which need separate work?"],
      },
      {
        heading: "Where CleanApp fits",
        paragraphs: ["CleanApp accepts physical and digital observations in a browser or the mobile apps. A person can send a message, a photo or a screenshot. AI helps structure the observation, connect related reports and identify relevant brands, places and recipients.", "Reporting is free. Organization plans provide tools for working with reports about brands and places. Use the current pricing page and discuss your team's workflow when evaluating the fit."],
      },
      {
        heading: "Choose by the work you need to complete",
        paragraphs: ["Compare the reporter's experience, evidence quality and review process before choosing software. A public intake channel and an internal investigation system can serve different parts of the same workflow."],
      },
    ],
    related: ["/incident-reporting", "/solutions/workplace-safety", "/solutions/brands", "/pricing"],
    sources: [{ title: "HSE: Investigating accidents and incidents", href: "https://www.hse.gov.uk/pubns/books/hsg245.htm" }],
  },
  {
    slug: "best-hazard-reporting-apps",
    title: "Choosing a hazard reporting app for a workplace or public space",
    description: "Evaluate hazard reporting by location context, evidence, accessibility and the review process. A practical guide for workplaces, buildings and public spaces.",
    datePublished: "2026-10-15",
    dateModified: "2026-10-15",
    readingMinutes: 3,
    lead: "A hazard report needs to make a condition understandable and findable. Start with the people using the place, the context they can supply and the team that will review what they send.",
    sections: [
      {
        heading: "Make the location useful",
        paragraphs: ["A map point can help outdoors. Inside a building, an entrance, floor, aisle or nearby sign may be more useful. A good reporting flow lets people explain the location they know instead of requiring precision they cannot supply.", "Keep an unknown location unknown. A default map position is not evidence of where a hazard was observed."],
      },
      {
        heading: "Record the condition and its impact",
        paragraphs: ["Show or describe the obstacle and explain who or what it affects. A blocked ramp, damaged handrail and loose cable need different context. HSE's risk guidance separates identifying hazards from assessing and controlling risks; the observation gives the reviewing team a starting point."],
        bullets: ["A description that identifies the visible condition.", "A photo when it helps show the issue and can be taken safely.", "A findable location and when the condition was observed.", "The task or route affected, such as reaching the step-free entrance."],
      },
      {
        heading: "Check the review and response process",
        paragraphs: ["Decide who receives incoming observations and how urgent conditions reach the on-site team. Check what the tool actually records about review, notifications and follow-up. An AI severity estimate is one input to assessment; the responsible team still needs to investigate the condition."],
      },
      {
        heading: "Try CleanApp with the problem you noticed",
        paragraphs: ["Describe the issue in CleanApp's browser composer and add an image if it helps. AI structures the observation, connects related reports and helps identify relevant places, brands and recipients. Keep the receipt to check available status.", "For city-owned infrastructure, the designated authority's reporting channel is also useful when you need an official service request. GOV.UK's pothole service illustrates how reporting can depend on the road's location."],
      },
      {
        heading: "Evaluate a complete example",
        paragraphs: ["Test one building issue and one outdoor issue. Check whether a reviewer can find each condition, understand the impact and decide what happens next. Choose the reporting tool that fits that process."],
      },
    ],
    related: ["/hazard-reporting", "/report-an-accessibility-barrier", "/solutions/property-managers", "/report-a-problem"],
    sources: [
      { title: "HSE: Steps needed to manage risk", href: "https://www.hse.gov.uk/simple-health-safety/risk/steps-needed-to-manage-risk.htm" },
      { title: "GOV.UK: Report a pothole", href: "https://www.gov.uk/report-pothole" },
    ],
  },
  {
    slug: "best-bug-reporting-tools",
    title: "Choosing bug reporting tools: user observations and team workflows",
    description: "Compare the jobs of user feedback, technical capture and internal bug tracking. Learn what makes a website or app problem report useful.",
    datePublished: "2026-10-15",
    dateModified: "2026-10-15",
    readingMinutes: 3,
    lead: "Someone using an app needs a way to describe a failure. A product team needs enough context to investigate and track it. Those are connected jobs, with different requirements.",
    sections: [
      {
        heading: "Start with the user's observation",
        paragraphs: ["Record the product, the task and the point where it failed. A screenshot can show an error; a short explanation can supply what the image leaves out. Chrome's own feedback instructions ask for details and steps, with a screenshot or web address as optional context."],
        bullets: ["What were you trying to do?", "What did you expect and what happened instead?", "Which URL, app or screen was involved?", "Which device or browser did you use, if known?"],
      },
      {
        heading: "Decide what technical capture you need",
        paragraphs: ["For a product your team owns, evaluate whether you need a feedback form, browser capture, an in-app SDK or a combination. Test what each tool collects, how it handles sensitive information and whether the resulting context helps someone reproduce the issue."],
      },
      {
        heading: "Give investigation a place to happen",
        paragraphs: ["An internal tracker supports the team's work after intake: assigning an issue, prioritizing it and recording progress. Jira's bug-report template is one example, with fields for environment, reproduction steps and expected versus actual results.", "Ask how observations reach that workflow. Confirm a specific integration or handoff rather than assuming an external report automatically becomes a ticket."],
      },
      {
        heading: "Report a problem in a product you use",
        paragraphs: ["CleanApp provides a browser reporting flow for websites and apps, including products outside your own organization. Send a message, a screenshot or both. AI helps structure the observation, connect related reports and identify relevant brands and recipients.", "Include the steps in your own words. An image can show the result, but it cannot establish every action that led to it. For account support or a specific order, use the service's official support channel as well."],
      },
      {
        heading: "Test the report from both sides",
        paragraphs: ["Try reporting a failed checkout or an inaccessible form. Then give the result to someone who did not witness the problem. Can they identify the affected product, understand the failure and decide what to investigate? That is a useful basis for comparing tools."],
      },
    ],
    related: ["/bug-reporting", "/report-a-website-problem", "/solutions/brands", "/pricing"],
    sources: [
      { title: "Google Chrome: Report an issue or send feedback", href: "https://support.google.com/chrome/answer/95315?hl=en" },
      { title: "Atlassian: Jira bug-report template", href: "https://www.atlassian.com/software/jira/templates/bug-report" },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}
