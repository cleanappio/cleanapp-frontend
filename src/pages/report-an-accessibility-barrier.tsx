import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("report-an-accessibility-barrier")!;

export default function ProblemGuidePage() {
  return <LandingPage page={page} />;
}
