import { MdOutlineFileDownload } from "react-icons/md";

export default function Navbar() {
  return (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-medium">CleanApp Report</h1>
        <p className="text-md text-gray-600">Dolder Grand Hotel & Resort</p>
        <p className="text-xs text-gray-500">
          Zurich, Switzerland • 47.3566°N, 8.5696°E
        </p>
      </div>

      <div className="h-12">
        <div className="flex gap-4 h-full items-center">
          <div className="flex flex-col items-end text-sm">
            <p className="text-gray-500">Last updated</p>
            <p className="">Jun 30, 2025, 1:55 PM</p>
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
