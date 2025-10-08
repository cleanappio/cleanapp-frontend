import { TableRowProps } from "../types";

const formatMessage = (message: string) => {
  // Split the message at "Learn more: " to separate text and link
  const parts = message.split("Learn more: ");
  if (parts.length === 2) {
    const textPart = parts[0];
    const linkPart = parts[1];

    return (
      <>
        {textPart}Learn more:{" "}
        <a
          href={linkPart}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {linkPart}
        </a>
      </>
    );
  }

  // Fallback if format doesn't match expected pattern
  return message;
};

export const TableRow = ({ item, isLast, lastElementRef }: TableRowProps) => {
  return (
    <div
      ref={isLast ? lastElementRef : null}
      className="grid grid-cols-[1fr_1fr_3fr] gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="font-medium text-gray-900">{item.brand}</div>
      <div className="text-blue-600 font-mono text-sm">{item.epc}</div>
      <div className="text-gray-600 text-sm">{formatMessage(item.message)}</div>
    </div>
  );
};
