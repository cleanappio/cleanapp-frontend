import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("incident-reporting")!;

export default function IncidentReportingPage() {
  return <LandingPage page={page} />;
}
