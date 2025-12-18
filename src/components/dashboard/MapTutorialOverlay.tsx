"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

interface MapTutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function MapTutorialOverlay({ isOpen, onClose, onComplete }: MapTutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [searchBoxPos, setSearchBoxPos] = useState<ElementPosition | null>(null);
  const [drawToolsPos, setDrawToolsPos] = useState<ElementPosition | null>(null);

  const steps = [
    {
      id: 0,
      title: "How to monitor locations in CleanApp",
      description: "Type any address, city, or landmark for insights",
      targetId: "tutorial-search-box",
    },
    {
      id: 1,
      title: "Draw your monitoring area",
      description: "Use the drawing tools to outline the exact area you want to track",
      targetId: "tutorial-draw-tools",
    },
  ];

  // Find elements and get their positions
  const updatePositions = useCallback(() => {
    const searchBox = document.getElementById("tutorial-search-box");
    const drawTools = document.getElementById("tutorial-draw-tools");

    if (searchBox) {
      const rect = searchBox.getBoundingClientRect();
      setSearchBoxPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    if (drawTools) {
      const rect = drawTools.getBoundingClientRect();
      setDrawToolsPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      // Small delay to let the map render first
      const timer = setTimeout(updatePositions, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, updatePositions]);

  // Update positions on resize
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [isOpen, updatePositions]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  if (!isOpen) return null;

  const currentTarget = currentStep === 0 ? searchBoxPos : drawToolsPos;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">

      {/* Dynamic Halo - Positioned exactly over the target element */}
      <AnimatePresence>
        {currentTarget && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute pointer-events-none"
            style={{
              top: currentTarget.top - 6,
              left: currentTarget.left - 6,
              width: currentTarget.width + 12,
              height: currentTarget.height + 12,
            }}
          >
            {/* Solid border */}
            <motion.div
              className="absolute inset-0 rounded-lg border-2 border-green-400"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(74, 222, 128, 0.6)",
                  "0 0 0 12px rgba(74, 222, 128, 0)",
                  "0 0 0 0 rgba(74, 222, 128, 0.6)"
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {/* Outer glow ring */}
            <motion.div
              className="absolute inset-[-6px] rounded-xl border-2 border-green-400/40"
              animate={{
                scale: [1, 1.03, 1],
                opacity: [0.4, 0.7, 0.4]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arrow pointing to target - positioned dynamically */}
      <AnimatePresence>
        {currentTarget && (
          <motion.div
            key={`arrow-${currentStep}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", damping: 20 }}
            className="absolute pointer-events-auto"
            style={{
              top: currentTarget.top + currentTarget.height / 2 - 20,
              left: currentTarget.left - 280,
            }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-xl shadow-2xl font-semibold text-base whitespace-nowrap"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {currentStep === 0 ? "👆 Type address or location" : "✏️ Draw your area"}
              </motion.div>
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <svg className="w-10 h-10 text-green-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center tutorial panel with white fuzzy border */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative pointer-events-auto"
        >
          {/* White fuzzy glow border - 100% brighter */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              boxShadow: "0 0 80px 30px rgba(255, 255, 255, 0.4), 0 0 120px 60px rgba(255, 255, 255, 0.2)",
            }}
          />

          <div className="relative bg-gray-900/95 backdrop-blur-md rounded-2xl px-8 py-6 shadow-2xl border border-white/20 flex items-center gap-6 min-w-[480px]">
            {/* Progress dots */}
            <div className="flex flex-col gap-2">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-colors ${index === currentStep ? "bg-green-500" : index < currentStep ? "bg-green-500/50" : "bg-gray-600"
                    }`}
                  animate={index === currentStep ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.5 }}
                />
              ))}
            </div>

            {/* Step info */}
            <div className="text-white flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  <p className="font-bold text-xl mb-1">{steps[currentStep].title}</p>
                  <p className="text-gray-400 text-sm">{steps[currentStep].description}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-sm transition-colors px-3 py-1"
              >
                Skip
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg transition-all"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Got it!
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Close button (top left) */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 pointer-events-auto text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}
