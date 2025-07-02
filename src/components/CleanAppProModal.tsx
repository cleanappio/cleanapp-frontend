import ReportOverview from "@/components/ReportOverview";
import RecentReports from "@/components/RecentReports";
import LatestReports from "@/components/LatestReports";
import React, { useState } from "react";
import { LatestReport } from "@/components/GlobeView";
import { X } from "lucide-react";

interface CleanAppProModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportItem: LatestReport | null;
  allReports: LatestReport[];
  onReportChange: (report: LatestReport) => void;
}

const CleanAppProModal: React.FC<CleanAppProModalProps> = ({ 
  isOpen, 
  onClose, 
  reportItem,
  allReports,
  onReportChange
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleCloseModal = () => {
    setIsClosing(true);
    // Add a small delay to allow for smooth transition
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  // Prevent closing when clicking on the modal content itself
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Semi-transparent overlay */}
      <div className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleCloseModal} />
      
      {/* Modal content */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleModalContentClick}>
        <div className="fixed top-[0px] left-[50px] right-[50px] bottom-[0px] overflow-y-auto scrollbar-hide">
          {/* Close button */}
          <button
            onClick={handleCloseModal}
            className="fixed top-[20px] right-[20px] z-60 p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 sm:mt-4 lg:mt-8">
            <ReportOverview reportItem={reportItem} />
            <RecentReports reportItem={reportItem} />
          </div>
        </div>

        {/* Latest Reports in fixed position outside scrollable container */}
        <LatestReports
          reports={allReports}
          loading={false}
          onReportClick={onReportChange}
          isModalActive={true}
          selectedReport={reportItem}
        />
      </div>
    </>
  );
};

export default CleanAppProModal; 