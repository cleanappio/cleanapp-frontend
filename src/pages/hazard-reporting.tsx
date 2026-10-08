import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("hazard-reporting")!;

export default function HazardReportingPage() {
  return <LandingPage page={page} />;
}
