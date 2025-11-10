import React, { useState, useEffect } from "react";
import { Area } from "@/lib/areas-api-client";

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
  }, [isOpen, areaName, contactEmail]);

  const handleSubmit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const updatedArea: Area = {
      ...initialArea,
      name: areaName || `Custom Area ${Date.now()}`,
      description: initialArea.description || "", // Ensure description is always an empty string, never null
      contact_emails: contactEmail
        ? [{ email: contactEmail, consent_report: true }]
        : [],
    };

    onSubmit(updatedArea);

    // Reset form
    setAreaName("");
    setContactEmail("");
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    onClose();
    setAreaName("");
    setContactEmail("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={handleCancel}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Create Custom Area</h2>

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
      </div>
    </div>
  );
}
