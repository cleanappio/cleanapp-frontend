import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("solutions/workplace-safety")!;

export default function WorkplaceSafetyPage() {
  return <LandingPage page={page} />;
}
