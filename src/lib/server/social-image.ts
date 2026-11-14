import path from "node:path";
import sharp from "sharp";
import type { SocialPreview } from "@/lib/server/social-preview";

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
const FONT = path.join(process.cwd(), "public/fonts/InterVariable.ttf");

/** Pango markup is never allowed to interpret report text, URLs or brand names. */
export function escapePreviewText(text: string): string {
  return text.normalize("NFC").replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function typeLayer(text: string, color: string, size: number, width: number, height: number, weight = 600): Promise<Buffer> {
  let clean = Array.from(text.trim()).slice(0, 220).join("");
  if (Array.from(text.trim()).length > 220) clean = `${clean.trimEnd()}…`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, info } = await sharp({ text: {
      text: `<span foreground="${color}" weight="${weight}">${escapePreviewText(clean)}</span>`,
      font: `Inter Variable ${size}`, fontfile: FONT, rgba: true, width, spacing: 8, wrap: "word-char",
    } }).png().toBuffer({ resolveWithObject: true });
    if (info.height <= height) return data;
    size = Math.max(24, Math.floor(size * Math.min(0.88, height / info.height)));
  }
  // Fixed bounds even for unusually long words/Unicode. Preserve aspect ratio.
  return sharp({ text: { text: `<span foreground="${color}" weight="${weight}">${escapePreviewText(clean)}</span>`, font: `Inter Variable ${size}`, fontfile: FONT, rgba: true, width, wrap: "word-char" } })
    .resize({ width, height, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}

function motif(preview: SocialPreview, accent: string): string {
  if (preview.kind === "physical") return `<g fill="none" stroke="${accent}" opacity=".18" stroke-width="2"><path d="M790 630C740 470 1100 550 1060 290S1190 80 1280 0M840 630C790 450 1140 510 1100 290S1200 90 1310 0M890 630C840 450 1180 480 1140 290S1250 80 1340 0M940 630C890 450 1220 450 1180 290S1290 80 1380 0"/><circle cx="1050" cy="390" r="15"/><circle cx="1050" cy="390" r="48"/></g>`;
  if (preview.kind === "agents") return `<g fill="none" stroke="${accent}" stroke-width="5" opacity=".5"><path d="m955 220-55 65 55 65m100-130 55 65-55 65m-32-159-35 188"/><path d="M875 405h245" stroke-width="2"/></g>`;
  if (preview.kind === "brand") return `<g fill="none" stroke="${accent}" stroke-width="3" opacity=".65"><rect x="947" y="204" width="158" height="182" rx="4"/><path d="M930 223h-16v184h158v-15M897 244h-16v184h158v-15M972 249h103m-103 31h78m-78 31h103m-103 31h57"/></g>`;
  if (preview.kind === "case") return `<g fill="none" stroke="${accent}" opacity=".25" stroke-width="3"><path d="m915 220 155 55-80 155-75-210m75 210-125-80 205-75"/><circle cx="915" cy="220" r="12"/><circle cx="1070" cy="275" r="12"/><circle cx="990" cy="430" r="12"/><circle cx="865" cy="350" r="12"/></g>`;
  if (preview.kind === "editorial") return `<g stroke="${accent}" opacity=".14" stroke-width="3"><path d="M940 190h180m-180 40h180m-180 40h180m-180 40h180m-180 40h100"/></g>`;
  return `<g fill="none" stroke="${accent}" opacity=".16" stroke-width="3"><path d="M850 190h260v230H850zM880 230h160m-160 38h190m-190 38h135"/><circle cx="960" cy="368" r="5"/><circle cx="984" cy="368" r="5"/><circle cx="1008" cy="368" r="5"/></g>`;
}

/** All rasterization is local, deterministic and font-bundled. No external image/model request. */
export async function renderSocialImage(preview: SocialPreview): Promise<Buffer> {
  const light = ["agents", "editorial", "organization", "physical"].includes(preview.kind);
  const background = light ? (preview.kind === "editorial" ? "#f3efe5" : "#edf3eb") : "#101d19";
  const ink = light ? "#11251b" : "#f4f7ee";
  const muted = light ? "#45594c" : "#b6c8ba";
  const accent = light ? "#25734a" : "#a8e080";
  const brand = preview.kind === "brand";
  const titleWidth = brand || preview.kind === "agents" ? 790 : 1056;
  const titleTop = brand ? 210 : 206;
  const subtitleTop = brand ? 412 : 436;
  const base = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${background}"/><path d="M0 0h12v630H0z" fill="${accent}"/><path d="M64 125h1072M64 530h1072" stroke="${ink}" stroke-opacity=".2"/>${motif(preview, accent)}<path d="m64 64 16-20 15 20-15 20z" fill="${accent}"/></svg>`;
  const specs = [
    { text: "CleanApp", color: ink, size: 34, width: 270, height: 44, top: 47, left: 110, weight: 750 },
    { text: preview.label, color: muted, size: 23, width: 1056, height: 34, top: 158, left: 64, weight: 650 },
    { text: preview.title, color: ink, size: brand ? 158 : preview.kind === "agents" ? 100 : 82, width: titleWidth, height: brand ? 188 : 210, top: titleTop, left: 64, weight: 800 },
    { text: preview.subtitle, color: muted, size: 31, width: 1056, height: 70, top: subtitleTop, left: 64, weight: 450 },
    { text: preview.action, color: ink, size: 25, width: 750, height: 35, top: 562, left: 64, weight: 650 },
    { text: "cleanapp.io ↗", color: muted, size: 23, width: 240, height: 35, top: 562, left: 923, weight: 500 },
  ];
  const layers: sharp.OverlayOptions[] = [];
  // Sequential rasterization bounds per-request native allocation.
  for (const spec of specs) layers.push({ input: await typeLayer(spec.text, spec.color, spec.size, spec.width, spec.height, spec.weight), top: spec.top, left: spec.left });
  return sharp(Buffer.from(base)).composite(layers).png({ compressionLevel: 9, palette: false }).toBuffer();
}
