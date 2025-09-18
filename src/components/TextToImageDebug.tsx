import React, { useState, useCallback } from "react";
import Image from "next/image";
import { generate, generateSync, GenerateOptions } from "text-to-image";

interface TextToImageProps {
  text?: string;
  onImageGenerated?: (dataUri: string) => void;
  className?: string;
  showControls?: boolean;
}

interface TextToImageState {
  inputText: string;
  generatedImage: string | null;
  isLoading: boolean;
  error: string | null;
  config: GenerateOptions;
  enableTextWrapping: boolean;
  aggressiveWrapping: boolean;
}

const defaultConfig: GenerateOptions = {
  maxWidth: 600, // Reduced for better text wrapping
  fontSize: 24,
  fontFamily: "Arial, sans-serif",
  fontWeight: "normal",
  textColor: "#000000",
  textAlign: "center",
  verticalAlign: "center",
  lineHeight: 30, // Pixel value for proper line spacing
  // Add margin for better text spacing
  margin: 20,
};

export default function TextToImage({
  text = "",
  onImageGenerated,
  className = "",
  showControls = true,
}: TextToImageProps) {
  const [state, setState] = useState<TextToImageState>({
    inputText: text,
    generatedImage: null,
    isLoading: false,
    error: null,
    config: defaultConfig,
    enableTextWrapping: true,
    aggressiveWrapping: true,
  });

  // Function to wrap text based on maxWidth and font size
  const wrapText = useCallback(
    (
      text: string,
      maxWidth: number,
      fontSize: number,
      aggressive: boolean = true
    ) => {
      // More conservative character width estimation for better wrapping
      // Different fonts have different character widths, so we'll be more aggressive
      const avgCharWidth = aggressive ? fontSize * 0.3 : fontSize * 0.5; // Even more aggressive if enabled
      const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

      // Force wrapping for very long text even if it seems to fit
      const forceWrapThreshold = aggressive
        ? Math.max(15, maxCharsPerLine * 0.6) // Very aggressive wrapping
        : Math.max(20, maxCharsPerLine * 0.8); // Normal wrapping

      // Split by existing line breaks first
      const lines = text.split("\n");
      const wrappedLines: string[] = [];

      lines.forEach((line) => {
        if (line.length <= forceWrapThreshold) {
          wrappedLines.push(line);
        } else {
          // Wrap this line more aggressively
          const words = line.split(" ");
          let currentLine = "";

          words.forEach((word) => {
            const testLine = currentLine + (currentLine ? " " : "") + word;
            if (testLine.length <= forceWrapThreshold) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                wrappedLines.push(currentLine);
                currentLine = word;
              } else {
                // Word is too long, force break it
                wrappedLines.push(word);
              }
            }
          });

          if (currentLine) {
            wrappedLines.push(currentLine);
          }
        }
      });

      const result = wrappedLines.join("\n");
      return result;
    },
    []
  );

  // Alternative text wrapping that ensures proper line breaks for text-to-image
  const wrapTextForImage = useCallback(
    (text: string, maxWidth: number, fontSize: number) => {
      // Very conservative character estimation for text-to-image package
      const avgCharWidth = fontSize * 0.3; // Even more conservative
      const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);

      console.log(
        `wrapTextForImage: maxWidth=${maxWidth}, fontSize=${fontSize}, maxCharsPerLine=${maxCharsPerLine}`
      );

      // Split by existing line breaks first
      const lines = text.split("\n");
      const wrappedLines: string[] = [];

      lines.forEach((line) => {
        if (line.length <= maxCharsPerLine) {
          wrappedLines.push(line);
        } else {
          // Wrap this line
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
                // Word is too long, force break it
                wrappedLines.push(word);
              }
            }
          });

          if (currentLine) {
            wrappedLines.push(currentLine);
          }
        }
      });

      const result = wrappedLines.join("\n");
      console.log(`wrapTextForImage result:`, result);
      return result;
    },
    []
  );

  // Calculate dynamic configuration based on text length
  const getDynamicConfig = useCallback(
    (text: string, baseConfig: GenerateOptions) => {
      const textLength = text.length;
      const wordCount = text.split(/\s+/).length;
      const lineCount = text.split("\n").length;

      // Adjust maxWidth based on text length - be more conservative for better wrapping
      let maxWidth = baseConfig.maxWidth || 800;
      if (textLength > 500) {
        maxWidth = Math.min(1000, Math.max(600, textLength * 1.5)); // Reduced multipliers
      } else if (textLength > 200) {
        maxWidth = Math.min(800, Math.max(500, textLength * 2)); // Reduced multipliers
      } else if (textLength < 50) {
        maxWidth = Math.max(300, textLength * 6); // Reduced multiplier
      }

      // Adjust font size based on text length and word count
      let fontSize = baseConfig.fontSize || 24;
      if (textLength > 1000) {
        fontSize = Math.max(16, fontSize * 0.8);
      } else if (textLength > 500) {
        fontSize = Math.max(18, fontSize * 0.9);
      } else if (textLength < 50) {
        fontSize = Math.min(48, fontSize * 1.5);
      }

      // Adjust line height for better readability with longer text
      // Use pixel values instead of multipliers for text-to-image package
      let lineHeight = baseConfig.lineHeight || 30;
      if (textLength > 500) {
        lineHeight = Math.max(25, lineHeight * 0.9); // Slightly tighter for long text
      } else if (textLength < 100) {
        lineHeight = Math.min(40, lineHeight * 1.2); // More spacing for short text
      }

      return {
        ...baseConfig,
        maxWidth,
        fontSize,
        lineHeight,
        // Ensure margin is included for multi-line text
        margin: baseConfig.margin || 20,
      };
    },
    []
  );

  const generateImage = useCallback(async () => {
    if (!state.inputText.trim()) {
      setState((prev) => ({ ...prev, error: "Please enter some text" }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const dynamicConfig = getDynamicConfig(state.inputText, state.config);
      const textToUse = state.enableTextWrapping
        ? wrapTextForImage(
            state.inputText,
            dynamicConfig.maxWidth,
            dynamicConfig.fontSize
          )
        : state.inputText;

      console.log("Text being sent to generate:", textToUse);
      console.log("Config being sent to generate:", dynamicConfig);

      const dataUri = await generate(textToUse, dynamicConfig);
      setState((prev) => ({
        ...prev,
        generatedImage: dataUri,
        isLoading: false,
      }));

      if (onImageGenerated) {
        onImageGenerated(dataUri);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
        isLoading: false,
      }));
    }
  }, [
    state.inputText,
    state.config,
    state.enableTextWrapping,
    onImageGenerated,
    getDynamicConfig,
    wrapTextForImage,
  ]);

  const generateImageSync = useCallback(() => {
    if (!state.inputText.trim()) {
      setState((prev) => ({ ...prev, error: "Please enter some text" }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const dynamicConfig = getDynamicConfig(state.inputText, state.config);
      const textToUse = state.enableTextWrapping
        ? wrapTextForImage(
            state.inputText,
            dynamicConfig.maxWidth,
            dynamicConfig.fontSize
          )
        : state.inputText;

      console.log("Text being sent to generateSync:", textToUse);
      console.log("Config being sent to generateSync:", dynamicConfig);

      // Create a sync-compatible config
      const syncConfig = {
        maxWidth: dynamicConfig.maxWidth,
        fontSize: dynamicConfig.fontSize,
        fontFamily: dynamicConfig.fontFamily,
        fontWeight: dynamicConfig.fontWeight,
        textColor: dynamicConfig.textColor,
        textAlign: dynamicConfig.textAlign,
        verticalAlign: dynamicConfig.verticalAlign,
        lineHeight: dynamicConfig.lineHeight,
        margin: dynamicConfig.margin,
      };

      const dataUri = generateSync(textToUse, syncConfig);
      setState((prev) => ({
        ...prev,
        generatedImage: dataUri,
        isLoading: false,
      }));

      if (onImageGenerated) {
        onImageGenerated(dataUri);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
        isLoading: false,
      }));
    }
  }, [
    state.inputText,
    state.config,
    state.enableTextWrapping,
    onImageGenerated,
    getDynamicConfig,
    wrapTextForImage,
  ]);

  const downloadImage = useCallback(() => {
    if (!state.generatedImage) return;

    const link = document.createElement("a");
    link.href = state.generatedImage;
    link.download = `text-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.generatedImage]);

  const updateConfig = useCallback((key: keyof GenerateOptions, value: any) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  }, []);

  return (
    <div className={`p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Text to Image Generator</h2>

        {/* Text Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Text:
          </label>
          <textarea
            value={state.inputText}
            onChange={(e) =>
              setState((prev) => ({ ...prev, inputText: e.target.value }))
            }
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Enter your text here..."
          />

          {/* Dynamic Configuration Preview */}
          {state.inputText.trim() && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Dynamic Configuration Preview:
              </h4>
              <div className="text-xs text-blue-700 space-y-1">
                {(() => {
                  const dynamicConfig = getDynamicConfig(
                    state.inputText,
                    state.config
                  );
                  const wrappedText = wrapText(
                    state.inputText,
                    dynamicConfig.maxWidth,
                    dynamicConfig.fontSize,
                    state.aggressiveWrapping
                  );
                  return (
                    <>
                      <p>
                        Max Width: {dynamicConfig.maxWidth}px (base:{" "}
                        {state.config.maxWidth}px)
                      </p>
                      <p>
                        Font Size: {dynamicConfig.fontSize}px (base:{" "}
                        {state.config.fontSize}px)
                      </p>
                      <p>
                        Line Height: {dynamicConfig.lineHeight}px (base:{" "}
                        {state.config.lineHeight}px)
                      </p>
                      <p>Text Length: {state.inputText.length} characters</p>
                      {state.enableTextWrapping && (
                        <p>Wrapped Lines: {wrappedText.split("\n").length}</p>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Text Wrapping Preview */}
              {state.enableTextWrapping && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-blue-800 mb-1">
                    Text Wrapping Preview:
                  </h5>
                  <div className="text-xs text-blue-600 bg-white p-2 rounded border max-h-20 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-mono">
                      {(() => {
                        const dynamicConfig = getDynamicConfig(
                          state.inputText,
                          state.config
                        );
                        return wrapText(
                          state.inputText,
                          dynamicConfig.maxWidth,
                          dynamicConfig.fontSize,
                          state.aggressiveWrapping
                        );
                      })()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Wrapping Controls */}
        <div className="mb-4 space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={state.enableTextWrapping}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  enableTextWrapping: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable Text Wrapping (Recommended for long text)
            </span>
          </label>

          {state.enableTextWrapping && (
            <label className="flex items-center space-x-2 ml-6">
              <input
                type="checkbox"
                checked={state.aggressiveWrapping}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    aggressiveWrapping: e.target.checked,
                  }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Aggressive Wrapping (More line breaks for better readability)
              </span>
            </label>
          )}
        </div>

        {/* Configuration Controls */}
        {showControls && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Size:
                </label>
                <input
                  type="number"
                  value={state.config.fontSize}
                  onChange={(e) =>
                    updateConfig("fontSize", parseInt(e.target.value) || 24)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="8"
                  max="200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Width:
                </label>
                <input
                  type="number"
                  value={state.config.maxWidth}
                  onChange={(e) =>
                    updateConfig("maxWidth", parseInt(e.target.value) || 800)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="100"
                  max="2000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Family:
                </label>
                <select
                  value={state.config.fontFamily}
                  onChange={(e) => updateConfig("fontFamily", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Times New Roman, serif">
                    Times New Roman
                  </option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Courier New, monospace">Courier New</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color:
                </label>
                <input
                  type="color"
                  value={state.config.textColor}
                  onChange={(e) => updateConfig("textColor", e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Align:
                </label>
                <select
                  value={state.config.textAlign}
                  onChange={(e) =>
                    updateConfig(
                      "textAlign",
                      e.target.value as "left" | "center" | "right"
                    )
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vertical Align:
                </label>
                <select
                  value={state.config.verticalAlign}
                  onChange={(e) =>
                    updateConfig(
                      "verticalAlign",
                      e.target.value as "top" | "center" | "bottom"
                    )
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line Height (pixels):
                </label>
                <input
                  type="number"
                  value={state.config.lineHeight}
                  onChange={(e) =>
                    updateConfig("lineHeight", parseInt(e.target.value) || 30)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="15"
                  max="60"
                />
              </div>
            </div>
          </div>
        )}

        {/* Text Length Presets */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Quick Text Examples:
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, inputText: "Hello World!" }))
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Short Text
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  inputText:
                    "This is a medium length text that will test the dynamic configuration system. It should adjust the font size and width appropriately for better readability.",
                }))
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Medium Text
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  inputText:
                    "This is a very long text that will test the dynamic configuration system with extensive content. The system should automatically adjust the font size, line height, and maximum width to ensure optimal readability and proper formatting. This text contains multiple sentences and should demonstrate how the component handles varying text lengths effectively. The dynamic configuration will scale down the font size and adjust the layout to accommodate the longer content while maintaining visual appeal and readability.",
                }))
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Long Text
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  inputText: "Line 1\nLine 2\nLine 3\nLine 4\nLine 5",
                }))
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Multi-line Text
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  inputText: "Test\nMulti-line\nText\nGeneration",
                }))
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Simple Multi-line
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  inputText: "Line 1\nLine 2\nLine 3",
                }))
              }
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Test 3 Lines
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={generateImage}
            disabled={state.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isLoading ? "Generating..." : "Generate Image (Async)"}
          </button>

          <button
            onClick={generateImageSync}
            disabled={state.isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isLoading ? "Generating..." : "Generate Image (Sync)"}
          </button>

          {state.generatedImage && (
            <button
              onClick={downloadImage}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Download Image
            </button>
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {state.error}
          </div>
        )}

        {/* Generated Image Display */}
        {state.generatedImage && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Generated Image:</h3>
            <div className="border border-gray-300 rounded-md p-4 bg-white overflow-auto">
              <div className="flex justify-center">
                <img
                  src={state.generatedImage}
                  alt="Generated text image"
                  className="max-w-full h-auto"
                  style={{
                    maxHeight: "80vh",
                    minHeight: "400px",
                    maxWidth: "100%",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600 text-center">
              <p>Text length: {state.inputText.length} characters</p>
              <p>
                Words:{" "}
                {
                  state.inputText.split(/\s+/).filter((word) => word.length > 0)
                    .length
                }
              </p>
              <p>Lines: {state.inputText.split("\n").length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
