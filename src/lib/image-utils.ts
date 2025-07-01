/**
 * Converts a bytes array to a data URL that can be used in img src
 * @param bytes - Array of numbers representing image bytes
 * @param mimeType - MIME type of the image (default: image/jpeg)
 * @returns Data URL string
 */
export function bytesToDataUrl(bytes: number[], mimeType: string = 'image/jpeg'): string {
  try {
    // Convert number array to Uint8Array
    const uint8Array = new Uint8Array(bytes);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...uint8Array));
    
    // Return data URL
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting bytes to data URL:', error);
    return '';
  }
}

/**
 * Converts image data to a displayable format
 * @param imageData - Can be bytes array, base64 string, URL string, or null
 * @returns Displayable image URL or empty string
 */
export function getDisplayableImage(imageData: number[] | string | null): string {
  if (!imageData) {
    console.log('No image data');
    return '';
  }
  
  if (typeof imageData === 'string') {
    console.log('Image data is a string');
    // If it's already a data URL or a normal URL, return as is
    if (imageData.startsWith('data:') || imageData.startsWith('http')) {
      console.log('Image data is a data URL or a normal URL');
      return imageData;
    }
    // Otherwise, treat as base64-encoded JPEG
    console.log('Image data is a base64 string');
    return `data:image/jpeg;base64,${imageData}`;
  }
  
  if (Array.isArray(imageData)) {
    console.log('Image data is a bytes array');
    // If it's a bytes array, convert to data URL
    return bytesToDataUrl(imageData);
  }
  
  console.log('Unknown image data type');
  return '';
} 