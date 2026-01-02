/**
 * Gmail Label Color Palette Utility
 *
 * Gmail only supports a fixed set of 25 background colors for labels.
 * This utility maps arbitrary hex colors to the closest Gmail standard color.
 */

export interface GmailColor {
  backgroundColor: string;
  textColor: string;
}

/**
 * Gmail's standard label color palette
 * Source: Gmail Label API documentation
 */
export const GMAIL_LABEL_COLORS: GmailColor[] = [
  { backgroundColor: '#cfe2f3', textColor: '#000000' }, // Light Blue
  { backgroundColor: '#d9ead3', textColor: '#000000' }, // Light Green
  { backgroundColor: '#fff2cc', textColor: '#000000' }, // Light Yellow
  { backgroundColor: '#fce5cd', textColor: '#000000' }, // Light Orange
  { backgroundColor: '#f4cccc', textColor: '#000000' }, // Light Red
  { backgroundColor: '#d9d2e9', textColor: '#000000' }, // Light Purple
  { backgroundColor: '#d0e0e3', textColor: '#000000' }, // Light Cyan
  { backgroundColor: '#ead1dc', textColor: '#000000' }, // Light Magenta
  { backgroundColor: '#c9daf8', textColor: '#000000' }, // Cornflower Blue
  { backgroundColor: '#b6d7a8', textColor: '#000000' }, // Light Green 2
  { backgroundColor: '#ffe599', textColor: '#000000' }, // Light Cornsilk Yellow
  { backgroundColor: '#f9cb9c', textColor: '#000000' }, // Light Coral
  { backgroundColor: '#ea9999', textColor: '#000000' }, // Light Red 2
  { backgroundColor: '#b4a7d6', textColor: '#000000' }, // Light Purple 2
  { backgroundColor: '#a2c4c9', textColor: '#000000' }, // Light Cyan 2
  { backgroundColor: '#d5a6bd', textColor: '#000000' }, // Light Magenta 2
  { backgroundColor: '#9fc5e8', textColor: '#000000' }, // Light Sky Blue
  { backgroundColor: '#93c47d', textColor: '#000000' }, // Light Green 3
  { backgroundColor: '#ffd966', textColor: '#000000' }, // Light Orange Yellow
  { backgroundColor: '#f6b26b', textColor: '#000000' }, // Light Orange 2
  { backgroundColor: '#e06666', textColor: '#000000' }, // Light Red 3
  { backgroundColor: '#8e7cc3', textColor: '#ffffff' }, // Light Purple 3
  { backgroundColor: '#76a5af', textColor: '#000000' }, // Light Cyan 3
  { backgroundColor: '#c27ba0', textColor: '#ffffff' }, // Light Magenta 3
  { backgroundColor: '#a4c2f4', textColor: '#000000' }, // Cerulean
];

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
}

function getReadableTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
}

/**
 * Find the closest Gmail standard color to a given hex color
 *
 * @param hexColor - The hex color to map (e.g., "#0BAF9A")
 * @returns The closest Gmail standard color
 */
export function findClosestGmailColor(hexColor: string): GmailColor {
  const inputRgb = hexToRgb(hexColor);

  if (!inputRgb) {
    // Default to first color if invalid hex
    return GMAIL_LABEL_COLORS[0];
  }

  let closestColor = GMAIL_LABEL_COLORS[0];
  let minDistance = Infinity;

  for (const gmailColor of GMAIL_LABEL_COLORS) {
    const gmailRgb = hexToRgb(gmailColor.backgroundColor);

    if (!gmailRgb) continue;

    const distance = colorDistance(inputRgb, gmailRgb);

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = gmailColor;
    }
  }

  return {
    backgroundColor: closestColor.backgroundColor,
    textColor: getReadableTextColor(closestColor.backgroundColor),
  };
}

/**
 * Get Gmail color by exact backgroundColor match
 * Useful for user manual override selection
 */
export function getGmailColorByBackground(backgroundColor: string): GmailColor | undefined {
  const match = GMAIL_LABEL_COLORS.find(
    (color) => color.backgroundColor.toLowerCase() === backgroundColor.toLowerCase()
  );
  if (!match) return undefined;
  return {
    backgroundColor: match.backgroundColor,
    textColor: getReadableTextColor(match.backgroundColor),
  };
}
