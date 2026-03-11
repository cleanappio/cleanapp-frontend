"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useIsMobile } from "./GlobeView";
import PublicLatestReports from "./PublicLatestReports";
import { PublicDiscoveryCard } from "@/types/public-discovery";
import { useEffect } from "react";

export function PublicCollapsibleLatestReports({
  items,
  loading,
  error,
  onItemClick,
  isMenuOpen = false,
}: {
  items: PublicDiscoveryCard[];
  loading: boolean;
  error?: string | null;
  onItemClick: (item: PublicDiscoveryCard) => void | Promise<void>;
  isMenuOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(!isMenuOpen);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;
    setIsOpen(!isMenuOpen);
  }, [isMenuOpen, isMobile]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`absolute ${
        isMobile ? "left-4 bottom-12" : "left-10 bottom-10"
      } bg-gradient-to-b from-[#14213d] to-black text-white border border-slate-700 rounded-full text-center flex flex-col h-[60px] w-[60px] z-20`}
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-center h-[60px] w-[60px]">
          <ChevronsUpDown />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <PublicLatestReports
          items={items}
          loading={loading}
          error={error}
          onItemClick={onItemClick}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
