import { SearchProps } from "../types";

export const SearchBar = ({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
}: SearchProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-2 sm:p-6 mb-2 sm:mb-6">
      <form onSubmit={onSearchSubmit} className="flex gap-4">
        <input
          type="text"
          placeholder="Search for EPC or brand..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
        >
          Search
        </button>
      </form>
    </div>
  );
};
