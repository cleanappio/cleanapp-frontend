export interface BrandData {
  id: number;
  brand: string;
  epc: string;
  message: string;
}

export interface SearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export interface TableProps {
  data: BrandData[];
  loading: boolean;
  hasMore: boolean;
  lastElementRef: (node: HTMLDivElement) => void;
}

export interface TableRowProps {
  item: BrandData;
  isLast: boolean;
  lastElementRef: (node: HTMLDivElement) => void;
}
