import { MdOutlineFileDownload } from "react-icons/md";
import { LatestReport } from "./GlobeView";

interface NavbarProps {
  reportItem?: LatestReport | null;
}

export default function Navbar({ reportItem }: NavbarProps) {
  // Get the title from the report analysis, fallback to a default
  const title = reportItem?.analysis?.title || "CleanApp Report";

  // Get coordinates from the report, fallback to default
  const latitude = reportItem?.report?.latitude || 47.3566;
  const longitude = reportItem?.report?.longitude || 8.5696;

  // Get timestamp from the report, fallback to current time
  const timestamp = reportItem?.report?.timestamp
    ? new Date(reportItem.report.timestamp).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-1">
        <p className="text-md text-gray-600">{title}</p>
        <p className="text-xs text-gray-500">
          {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
        </p>
      </div>

      <div className="h-12">
        <div className="flex gap-4 h-full items-center">
          <div className="flex flex-col items-end text-sm">
            <p className="text-gray-500">Last updated</p>
            <p className="">{timestamp}</p>
          </div>
          <div className="w-[1px] h-full bg-gray-200"></div>

          <div className="bg-green-700 text-white rounded-md px-4 py-2 flex items-center gap-3">
            <MdOutlineFileDownload size={20} />
            <p>Export Report</p>
          </div>
        </div>
      </div>
    </div>
  );
}
