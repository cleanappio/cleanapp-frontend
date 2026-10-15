import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("report-illegal-dumping")!;

export default function ProblemGuidePage() {
  return <LandingPage page={page} />;
}
