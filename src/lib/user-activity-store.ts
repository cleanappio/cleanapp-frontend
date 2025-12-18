import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActivityItem {
  name: string;
  timestamp: number;
}

interface UserActivityState {
  recentBrands: ActivityItem[];
  recentLocations: ActivityItem[];

  // Actions
  trackBrandSearch: (brandName: string) => void;
  trackLocationView: (locationName: string) => void;
  clearActivity: () => void;

  // Getters
  getRecentBrands: (days?: number) => ActivityItem[];
  getRecentLocations: (days?: number) => ActivityItem[];
}

const MAX_ITEMS = 10;
const DEFAULT_DAYS = 7;

export const useUserActivityStore = create<UserActivityState>()(
  persist(
    (set, get) => ({
      recentBrands: [],
      recentLocations: [],

      trackBrandSearch: (brandName: string) => {
        const now = Date.now();
        set((state) => {
          // Remove existing entry for this brand if it exists
          const filtered = state.recentBrands.filter(
            (b) => b.name.toLowerCase() !== brandName.toLowerCase()
          );
          // Add to front
          const updated = [{ name: brandName, timestamp: now }, ...filtered].slice(0, MAX_ITEMS);
          return { recentBrands: updated };
        });
      },

      trackLocationView: (locationName: string) => {
        const now = Date.now();
        set((state) => {
          // Remove existing entry for this location if it exists
          const filtered = state.recentLocations.filter(
            (l) => l.name.toLowerCase() !== locationName.toLowerCase()
          );
          // Add to front
          const updated = [{ name: locationName, timestamp: now }, ...filtered].slice(0, MAX_ITEMS);
          return { recentLocations: updated };
        });
      },

      clearActivity: () => {
        set({ recentBrands: [], recentLocations: [] });
      },

      getRecentBrands: (days = DEFAULT_DAYS) => {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return get().recentBrands.filter((b) => b.timestamp > cutoff);
      },

      getRecentLocations: (days = DEFAULT_DAYS) => {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return get().recentLocations.filter((l) => l.timestamp > cutoff);
      },
    }),
    {
      name: 'cleanapp-user-activity',
    }
  )
);
