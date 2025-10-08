import { TableProps } from "../types";
import { TableRow } from "./TableRow";

export const DataTable = ({
  data,
  loading,
  hasMore,
  lastElementRef,
}: TableProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_1fr_3fr] gap-4 p-4 bg-gray-100 font-semibold text-gray-700 border-b">
        <div>Brand</div>
        <div>EPC (EOA)</div>
        <div>Message</div>
      </div>

      {/* Table Body */}
      <div className="max-h-full overflow-y-auto">
        {data.map((item, index) => (
          <TableRow
            key={item.id}
            item={item}
            isLast={index === data.length - 1}
            lastElementRef={lastElementRef}
          />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">Loading more...</span>
          </div>
        )}

        {/* End of data indicator */}
        {!hasMore && !loading && data.length > 0 && (
          <div className="flex justify-center items-center p-8">
            <span className="text-gray-500 text-sm">No more items to load</span>
          </div>
        )}
      </div>
    </div>
  );
};
