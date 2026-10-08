import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("report-a-problem")!;

export default function ReportAProblemPage() {
  return <LandingPage page={page} />;
}
