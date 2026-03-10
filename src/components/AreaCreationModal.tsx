import React, { useState, useEffect, useCallback } from "react";
import { Area } from "@/lib/areas-api-client";
import CaseWorkspacePanel from "@/components/cases/CaseWorkspacePanel";

interface AreaCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (area: Area) => void;
  initialArea: Area;
}

export default function AreaCreationModal({
  isOpen,
  onClose,
  onSubmit,
  initialArea,
}: AreaCreationModalProps) {
  const [areaName, setAreaName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [showClusterAnalysis, setShowClusterAnalysis] = useState(false);

  const handleSubmit = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();

      const updatedArea: Area = {
        ...initialArea,
        name: areaName || `Custom Area ${Date.now()}`,
        description: initialArea.description || "",
        contact_emails: contactEmail
          ? [{ email: contactEmail, consent_report: true }]
          : [],
      };

      onSubmit(updatedArea);
      setAreaName("");
      setContactEmail("");
      setShowClusterAnalysis(false);
    },
    [areaName, contactEmail, initialArea, onSubmit]
  );

  const handleCancel = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      onClose();
      setAreaName("");
      setContactEmail("");
      setShowClusterAnalysis(false);
    },
    [onClose]
  );

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      } else if (e.key === "Enter" && areaName.trim() && contactEmail.trim()) {
        handleSubmit();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [areaName, contactEmail, handleCancel, handleSubmit, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={handleCancel}
    >
      <div
        className={`bg-white rounded-lg p-6 w-full mx-4 ${
          showClusterAnalysis ? "max-w-6xl" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Create Custom Area</h2>

        <div
          className={`space-y-4 ${
            showClusterAnalysis ? "lg:grid lg:grid-cols-[0.9fr,1.1fr] lg:gap-6 lg:space-y-0" : ""
          }`}
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="areaName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Area Name *
              </label>
              <input
                type="text"
                id="areaName"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  areaName.trim() ? "border-green-300" : "border-gray-300"
                }`}
                placeholder="Enter area name"
              />
            </div>

            <div>
              <label
                htmlFor="contactEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact
              </label>
              <input
                type="text"
                id="contactEmail"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  contactEmail.trim() ? "border-green-300" : "border-gray-300"
                }`}
                placeholder="Email, Ethereum address, or social media link"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cluster analysis
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Review incident hypotheses for this polygon before saving the
                    area.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClusterAnalysis((current) => !current)}
                  className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  {showClusterAnalysis ? "Hide analysis" : "Analyze cluster"}
                </button>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!areaName.trim() || !contactEmail.trim()}
                className={`flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  areaName.trim() && contactEmail.trim()
                    ? "text-white bg-blue-600 hover:bg-blue-700"
                    : "text-gray-400 bg-gray-300 cursor-not-allowed"
                }`}
              >
                Create Area
              </button>
            </div>
          </div>

          {showClusterAnalysis && (
            <div className="min-w-0">
              <CaseWorkspacePanel
                scopeLabel={areaName.trim() || initialArea.name || "Selected area"}
                scopeType="area"
                geometry={initialArea.coordinates}
                variant="embedded"
                onClose={() => setShowClusterAnalysis(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
