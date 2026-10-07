import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("litter-reporting")!;

export default function LitterReportingPage() {
  return <LandingPage page={page} />;
}
