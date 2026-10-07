import LandingPage from "@/components/LandingPage";
import { getLandingPage } from "@/content/landing-pages";

const page = getLandingPage("solutions/cities")!;

export default function CitiesPage() {
  return <LandingPage page={page} />;
}
