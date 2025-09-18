import React, { useState, useCallback, useEffect } from "react";
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
};

export default function TextToImage({
  text,
  className = "",
  onImageGenerated,
}: TextToImageProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const dataUri = await generate(wrappedText, defaultConfig);

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
  }, [text, wrapText, onImageGenerated]);

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
