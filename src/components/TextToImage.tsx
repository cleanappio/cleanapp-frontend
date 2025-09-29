import React, { useState, useCallback, useEffect, useMemo } from "react";
import { generate, GenerateOptions } from "text-to-image";

interface TextToImageProps {
  text: string;
  className?: string;
  onImageGenerated?: (dataUri: string) => void;
}

const defaultConfig: GenerateOptions = {
  maxWidth: 600,
  fontSize: 20,
  fontFamily: "Arial, sans-serif",
  fontWeight: "normal",
  textColor: "#000000",
  textAlign: "center",
  verticalAlign: "center",
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

  // Generate image when text changes
  const generateImage = useCallback(async () => {
    if (!text.trim()) {
      setError("No text provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const wrappedText = wrapText(
        text,
        defaultConfig.maxWidth || 600,
        defaultConfig.fontSize || 24
      );

      const dataUri = await generate(wrappedText, {
        ...defaultConfig,
        bgColor: backgroundColor,
      });

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
