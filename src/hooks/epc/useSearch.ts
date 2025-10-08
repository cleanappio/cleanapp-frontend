import { useState, useEffect } from "react";
import { BrandData } from "../types";

export const useSearch = (data: BrandData[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState<BrandData[]>([]);

  // Filter data based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter(
        (item) =>
          item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.epc.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  return {
    searchTerm,
    filteredData,
    handleSearchChange,
    handleSearchSubmit,
  };
};
