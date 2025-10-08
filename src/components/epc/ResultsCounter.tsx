interface ResultsCounterProps {
  count: number;
  searchTerm: string;
}

export const ResultsCounter = ({ count, searchTerm }: ResultsCounterProps) => {
  return (
    <div className="mt-4 text-sm text-gray-600">
      Showing {count} results
      {searchTerm && ` for "${searchTerm}"`}
    </div>
  );
};
