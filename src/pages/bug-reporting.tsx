import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("bug-reporting")!;

export default function BugReportingPage() {
  return <LandingPage page={page} />;
}
