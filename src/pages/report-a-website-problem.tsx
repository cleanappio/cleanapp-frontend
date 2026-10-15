import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("report-a-website-problem")!;

export default function ProblemGuidePage() {
  return <LandingPage page={page} />;
}
