import { BrandData } from "../types";

const BRANDS = [
  "Google",
  "Apple",
  "Microsoft",
  "Amazon",
  "Meta",
  "Tesla",
  "Netflix",
  "Spotify",
  "Uber",
  "Airbnb",
  "Stripe",
  "Shopify",
  "Slack",
  "Zoom",
  "Discord",
  "TikTok",
  "Instagram",
  "Twitter",
  "LinkedIn",
  "GitHub",
  "Figma",
  "Notion",
  "Linear",
  "Vercel",
];

const MESSAGES = [
  "Google got 1,247 CleanApp Reports about Google. Learn more: https://cleanapp.io/digital/google",
  "Apple got 892 CleanApp Reports about Apple. Learn more: https://cleanapp.io/digital/apple",
  "Microsoft got 1,156 CleanApp Reports about Microsoft. Learn more: https://cleanapp.io/digital/microsoft",
  "Amazon got 2,034 CleanApp Reports about Amazon. Learn more: https://cleanapp.io/digital/amazon",
  "Meta got 1,789 CleanApp Reports about Meta. Learn more: https://cleanapp.io/digital/meta",
  "Tesla got 1,423 CleanApp Reports about Tesla. Learn more: https://cleanapp.io/digital/tesla",
  "Netflix got 987 CleanApp Reports about Netflix. Learn more: https://cleanapp.io/digital/netflix",
  "Spotify got 1,345 CleanApp Reports about Spotify. Learn more: https://cleanapp.io/digital/spotify",
  "Uber got 1,678 CleanApp Reports about Uber. Learn more: https://cleanapp.io/digital/uber",
  "Airbnb got 1,234 CleanApp Reports about Airbnb. Learn more: https://cleanapp.io/digital/airbnb",
  "Stripe got 567 CleanApp Reports about Stripe. Learn more: https://cleanapp.io/digital/stripe",
  "Shopify got 1,456 CleanApp Reports about Shopify. Learn more: https://cleanapp.io/digital/shopify",
  "Slack got 1,123 CleanApp Reports about Slack. Learn more: https://cleanapp.io/digital/slack",
  "Zoom got 1,789 CleanApp Reports about Zoom. Learn more: https://cleanapp.io/digital/zoom",
  "Discord got 1,567 CleanApp Reports about Discord. Learn more: https://cleanapp.io/digital/discord",
  "TikTok got 2,345 CleanApp Reports about TikTok. Learn more: https://cleanapp.io/digital/tiktok",
  "Instagram got 2,123 CleanApp Reports about Instagram. Learn more: https://cleanapp.io/digital/instagram",
  "Twitter got 1,890 CleanApp Reports about Twitter. Learn more: https://cleanapp.io/digital/twitter",
  "LinkedIn got 1,234 CleanApp Reports about LinkedIn. Learn more: https://cleanapp.io/digital/linkedin",
  "GitHub got 1,456 CleanApp Reports about GitHub. Learn more: https://cleanapp.io/digital/github",
  "Figma got 789 CleanApp Reports about Figma. Learn more: https://cleanapp.io/digital/figma",
  "Notion got 1,123 CleanApp Reports about Notion. Learn more: https://cleanapp.io/digital/notion",
  "Linear got 456 CleanApp Reports about Linear. Learn more: https://cleanapp.io/digital/linear",
  "Vercel got 678 CleanApp Reports about Vercel. Learn more: https://cleanapp.io/digital/vercel",
];

export const generateMockData = (
  startId: number,
  count: number
): BrandData[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: startId + index,
    brand: BRANDS[(startId + index) % BRANDS.length],
    epc: `EPC-${String(startId + index).padStart(6, "0")}`,
    message: MESSAGES[(startId + index) % MESSAGES.length],
  }));
};
