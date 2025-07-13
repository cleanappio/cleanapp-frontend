/**
 * Returns a color based on a value from 0.0 to 1.0
 * 0.0 = green (good)
 * 0.25 = yellow (warning)
 * 0.5 = orange (caution)
 * 0.75 = red (danger)
 * 1.0 = dark red (critical)
 */
export function getColorByValue(value: number): string {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  
  let color: string;
  
  if (clampedValue <= 0.25) {
    // Green to Yellow (0.0 - 0.25)
    const ratio = clampedValue / 0.25;
    color = `rgb(${Math.round(34 + ratio * 221)}, ${Math.round(197 + ratio * 58)}, ${Math.round(94 - ratio * 94)})`;
  } else if (clampedValue <= 0.5) {
    // Yellow to Orange (0.25 - 0.5)
    const ratio = (clampedValue - 0.25) / 0.25;
    color = `rgb(${Math.round(255 + ratio * 0)}, ${Math.round(255 - ratio * 128)}, ${Math.round(0 + ratio * 0)})`;
  } else if (clampedValue <= 0.75) {
    // Orange to Red (0.5 - 0.75)
    const ratio = (clampedValue - 0.5) / 0.25;
    color = `rgb(${Math.round(255 + ratio * 0)}, ${Math.round(127 - ratio * 127)}, ${Math.round(0 + ratio * 0)})`;
  } else {
    // Red to Dark Red (0.75 - 1.0)
    const ratio = (clampedValue - 0.75) / 0.25;
    color = `rgb(${Math.round(255 - ratio * 127)}, ${Math.round(0 + ratio * 0)}, ${Math.round(0 + ratio * 0)})`;
  }
  
  return color;
}

/**
 * Alternative implementation using predefined color stops
 * Returns a color based on a value from 0.0 to 1.0
 */
export function getColorByValueSimple(value: number): string {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));
  
  const colors = [
    '#00ff00', // green
    '#ffff00', // yellow
    '#ffa500', // orange
    '#ff0000', // red
    '#770000'  // dark red
  ];
  
  const stops = [0, 0.25, 0.5, 0.75, 1];
  
  // Find the appropriate color segment
  for (let i = 0; i < stops.length - 1; i++) {
    if (clampedValue >= stops[i] && clampedValue <= stops[i + 1]) {
      const ratio = (clampedValue - stops[i]) / (stops[i + 1] - stops[i]);
      return interpolateColor(colors[i], colors[i + 1], ratio);
    }
  }
  
  return colors[colors.length - 1]; // fallback to last color
}

/**
 * Helper function to interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, ratio: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
} 