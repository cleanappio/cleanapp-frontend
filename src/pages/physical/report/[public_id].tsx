import PublicReportDetailPage from "@/components/report/PublicReportDetailPage";
import Seo from "@/components/Seo";
import { makeReportSeoProps, type ReportSeoProps } from "@/lib/report-seo";

export const getServerSideProps = makeReportSeoProps("physical");

export default function PhysicalReportDetailPage({ seo }: ReportSeoProps) {
  return (
    <>
      <Seo
        title={seo.title}
        description={seo.description}
        image={seo.image ?? undefined}
        noindex={!seo.found}
      />
      <PublicReportDetailPage expectedClassification="physical" />
    </>
  );
}
