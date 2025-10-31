/**
 * Converts a bytes array to a data URL that can be used in img src
 * @param bytes - Array of numbers representing image bytes
 * @param mimeType - MIME type of the image (default: image/jpeg)
 * @returns Data URL string
 */
export function bytesToDataUrl(
  bytes: number[],
  mimeType: string = "image/jpeg"
): string {
  try {
    // Convert number array to Uint8Array
    const uint8Array = new Uint8Array(bytes);

    // Convert to base64 in chunks to avoid stack overflow with large arrays
    const chunkSize = 8192; // Process 8KB at a time
    let binaryString = "";

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      // Use Array.from to convert typed array to regular array for apply()
      binaryString += String.fromCharCode.apply(null, Array.from(chunk) as any);
    }

    // Convert to base64
    const base64 = btoa(binaryString);

    // Return data URL
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting bytes to data URL:", error);
    return "";
  }
}

/**
 * Converts image data to a displayable format
 * @param imageData - Can be bytes array, base64 string, URL string, or null
 * @returns Displayable image URL or empty string
 */
export function getDisplayableImage(
  imageData: number[] | string | null
): string {
  if (!imageData) {
    return "";
  }

  if (typeof imageData === "string") {
    // If it's already a data URL or a normal URL, return as is
    if (imageData.startsWith("data:") || imageData.startsWith("http")) {
      return imageData;
    }
    // Otherwise, treat as base64-encoded JPEG
    return `data:image/jpeg;base64,${imageData}`;
  }

  if (Array.isArray(imageData)) {
    // If it's a bytes array, convert to data URL
    return bytesToDataUrl(imageData);
  }

  return "";
}
