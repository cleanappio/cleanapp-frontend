import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("solutions/property-managers")!;

export default function PropertyManagersPage() {
  return <LandingPage page={page} />;
}
