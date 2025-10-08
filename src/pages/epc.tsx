"use client";

import { SearchBar, DataTable, ResultsCounter } from "../components/epc";
import { useBrandData } from "@/hooks/epc/useBrandData";
import { useSearch } from "@/hooks/epc/useSearch";
import { useInfiniteScroll } from "@/hooks/epc/useInfiniteScroll";
import Image from "next/image";

export default function Home() {
  const { data, loading, hasMore, loadMore } = useBrandData();
  const { searchTerm, filteredData, handleSearchChange, handleSearchSubmit } =
    useSearch(data);
  const { lastElementRef } = useInfiniteScroll(loading, hasMore, loadMore);

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col mb-8 gap-4 justify-center items-center">
          <div className="flex justify-center items-center mb-8 gap-4">
            <Image
              src="/cleanapp-sticker-logo.png"
              alt="CleanApp"
              width={100}
              height={100}
              priority
            />
            <h1 className="text-3xl font-bold text-gray-900">
              CleanApp Public Noticeboard
            </h1>
          </div>

          <p className="text-gray-600 text-center">
            <b>Ethereum Plus Codes (EPCs)</b> are like Google Plus Codes, but
            better. Every brand and place with CleanApp Reports automatically
            gets an EPC, a public address where anyone can send messages. Want
            to message the Eiffel Tower or Red Bull? With EPCs on CleanApp, you
            can.
          </p>
        </div>

        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
        />

        <DataTable
          data={filteredData}
          loading={loading}
          hasMore={hasMore}
          lastElementRef={lastElementRef}
        />

        <ResultsCounter count={filteredData.length} searchTerm={searchTerm} />
      </div>
    </div>
  );
}
