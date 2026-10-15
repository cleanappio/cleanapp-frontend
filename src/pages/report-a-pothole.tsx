import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("report-a-pothole")!;

export default function ProblemGuidePage() {
  return <LandingPage page={page} />;
}
