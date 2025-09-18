import React, { useState, useCallback, useEffect } from "react";

interface TextToImageServerlessProps {
  text: string;
  className?: string;
  onImageGenerated?: (dataUri: string) => void;
}

// Serverless-friendly text-to-image using CSS and canvas API
export default function TextToImageServerless({
  text,
  className = "",
  onImageGenerated,
}: TextToImageServerlessProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple text wrapping function
  const wrapText = useCallback(
    (text: string, maxWidth: number, fontSize: number) => {
      const avgCharWidth = fontSize * 0.6; // More conservative for CSS rendering
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
      const maxWidth = 600;
      const fontSize = 20;
      const lineHeight = 30;
      const margin = 20;

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
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Draw background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw text
      ctx.fillStyle = "#000000";
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
