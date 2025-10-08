import { useState, useEffect } from "react";
import { BrandData } from "@/types";
import { generateMockData } from "@/utils/mockData";

const ITEMS_PER_PAGE = 20;
const MAX_ITEMS = 200;

export const useBrandData = () => {
  const [data, setData] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load initial data
  useEffect(() => {
    const initialData = generateMockData(1, ITEMS_PER_PAGE);
    setData(initialData);
  }, []);

  // Load more data when page changes
  useEffect(() => {
    if (page > 1 && hasMore) {
      setLoading(true);
      // Simulate API delay
      setTimeout(() => {
        const currentItemCount = (page - 1) * ITEMS_PER_PAGE;
        const remainingItems = MAX_ITEMS - currentItemCount;
        const itemsToLoad = Math.min(ITEMS_PER_PAGE, remainingItems);

        if (itemsToLoad > 0) {
          const newData = generateMockData(currentItemCount + 1, itemsToLoad);
          setData((prevData) => [...prevData, ...newData]);

          // Check if we've reached the maximum
          if (currentItemCount + itemsToLoad >= MAX_ITEMS) {
            setHasMore(false);
          }
        } else {
          setHasMore(false);
        }

        setLoading(false);
      }, 1000);
    }
  }, [page, hasMore]);

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  return {
    data,
    loading,
    hasMore,
    loadMore,
  };
};
