import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("solutions/brands")!;

export default function BrandsPage() {
  return <LandingPage page={page} />;
}
