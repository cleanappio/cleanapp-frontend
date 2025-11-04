"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";

interface TextToImageProps {
  text: string;
  className?: string;
  onImageGenerated?: (dataUri: string) => void;
}

const defaultConfig = {
  maxWidth: 600,
  fontSize: 20,
  fontFamily: "Arial, sans-serif",
  fontWeight: "normal",
  textColor: "#000000",
  textAlign: "center" as const,
  verticalAlign: "center" as const,
  lineHeight: 30,
  margin: 20,
  bgColor: "#fefae0",
};

// Pastel color palette for background generation
const PASTEL_COLORS = [
  "#caf0f8", // Light blue
  "#f4f1de", // Beige
  "#bde0fe", // Light violet
  "#e9edc9", // Light green
  "#ffe5ec", // Light pink
  "#f5ebe0", // Cream
  "#ffafcc", // Light coral
  "#d8e2dc", // Light grayish blue
  "#f0e68c", // Khaki
  "#ffffff", // White
  "#dbe7e4", // Light gray
] as const;

// Generate a deterministic color based on text content
const getColorForText = (text: string): string => {
  // Simple hash function to convert text to a number
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get a valid index
  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
};

export default function TextToImage({
  text,
  className = "",
  onImageGenerated,
}: TextToImageProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the background color to ensure consistency
  const backgroundColor = useMemo(() => getColorForText(text), [text]);

  // Simple text wrapping function
  const wrapText = useCallback(
    (text: string, maxWidth: number, fontSize: number) => {
      const avgCharWidth = fontSize * 0.9; // Conservative character width estimation
      const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

      const lines = text.split("\n");
      const wrappedLines: string[] = [];

      lines.forEach((line) => {
        if (line.length <= maxCharsPerLine) {
          wrappedLines.push(line);
        } else {
          const words = line.split(" ");
          let currentLine = "";

          words.forEach((word) => {
            const testLine = currentLine + (currentLine ? " " : "") + word;
            if (testLine.length <= maxCharsPerLine) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                wrappedLines.push(currentLine);
                currentLine = word;
              } else {
                wrappedLines.push(word);
              }
            }
          });

          if (currentLine) {
            wrappedLines.push(currentLine);
          }
        }
      });

      return wrappedLines.join("\n");
    },
    []
  );

  // Generate image using HTML5 Canvas API
  const generateImage = useCallback(async () => {
    if (!text.trim()) {
      setError("No text provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const maxWidth = defaultConfig.maxWidth || 600;
      const fontSize = defaultConfig.fontSize || 20;
      const lineHeight = defaultConfig.lineHeight || 30;
      const margin = defaultConfig.margin || 20;

      const wrappedText = wrapText(text, maxWidth, fontSize);
      const lines = wrappedText.split("\n");

      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Set canvas size
      const textWidth = maxWidth;
      const textHeight = lines.length * lineHeight + margin * 2;
      canvas.width = textWidth + margin * 2;
      canvas.height = textHeight;

      // Set font properties
      ctx.font = `${defaultConfig.fontWeight} ${fontSize}px ${defaultConfig.fontFamily}`;
      ctx.fillStyle = defaultConfig.textColor;
      ctx.textAlign = defaultConfig.textAlign;
      // Map verticalAlign to valid textBaseline values
      const textBaselineMap: Record<string, CanvasTextBaseline> = {
        top: "top",
        center: "middle",
        bottom: "bottom",
      };
      ctx.textBaseline = textBaselineMap[defaultConfig.verticalAlign] || "top";

      // Draw background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw text
      ctx.fillStyle = defaultConfig.textColor;
      lines.forEach((line, index) => {
        const x = canvas.width / 2;
        const y = margin + index * lineHeight;
        ctx.fillText(line, x, y);
      });

      // Convert to data URL
      const dataUri = canvas.toDataURL("image/png");

      setGeneratedImage(dataUri);

      if (onImageGenerated) {
        onImageGenerated(dataUri);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to generate image"
      );
    } finally {
      setIsLoading(false);
    }
  }, [text, wrapText, onImageGenerated, backgroundColor]);

  // Generate image when component mounts or text changes
  useEffect(() => {
    generateImage();
  }, [generateImage]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Generating image...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-4 bg-red-100 border border-red-400 text-red-700 rounded-md ${className}`}
      >
        Error: {error}
      </div>
    );
  }

  if (!generatedImage) {
    return null;
  }

  return (
    <div
      className={`${className} overflow-hidden flex items-center justify-center`}
    >
      <img
        src={generatedImage}
        alt="Generated text image"
        className="max-w-full h-auto"
        style={{
          maxHeight: "80vh",
          width: "100%",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
