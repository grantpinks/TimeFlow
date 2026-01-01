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
  { backgroundColor: '#cfe2f3', textColor: '#0b5394' }, // Light Blue
  { backgroundColor: '#d9ead3', textColor: '#38761d' }, // Light Green
  { backgroundColor: '#fff2cc', textColor: '#7f6000' }, // Light Yellow
  { backgroundColor: '#fce5cd', textColor: '#b45f06' }, // Light Orange
  { backgroundColor: '#f4cccc', textColor: '#990000' }, // Light Red
  { backgroundColor: '#d9d2e9', textColor: '#674ea7' }, // Light Purple
  { backgroundColor: '#d0e0e3', textColor: '#0c343d' }, // Light Cyan
  { backgroundColor: '#ead1dc', textColor: '#783f04' }, // Light Magenta
  { backgroundColor: '#c9daf8', textColor: '#1155cc' }, // Cornflower Blue
  { backgroundColor: '#b6d7a8', textColor: '#274e13' }, // Light Green 2
  { backgroundColor: '#ffe599', textColor: '#bf9000' }, // Light Cornsilk Yellow
  { backgroundColor: '#f9cb9c', textColor: '#b45f06' }, // Light Coral
  { backgroundColor: '#ea9999', textColor: '#990000' }, // Light Red 2
  { backgroundColor: '#b4a7d6', textColor: '#351c75' }, // Light Purple 2
  { backgroundColor: '#a2c4c9', textColor: '#0c343d' }, // Light Cyan 2
  { backgroundColor: '#d5a6bd', textColor: '#783f04' }, // Light Magenta 2
  { backgroundColor: '#9fc5e8', textColor: '#0b5394' }, // Light Sky Blue
  { backgroundColor: '#93c47d', textColor: '#38761d' }, // Light Green 3
  { backgroundColor: '#ffd966', textColor: '#7f6000' }, // Light Orange Yellow
  { backgroundColor: '#f6b26b', textColor: '#b45f06' }, // Light Orange 2
  { backgroundColor: '#e06666', textColor: '#990000' }, // Light Red 3
  { backgroundColor: '#8e7cc3', textColor: '#351c75' }, // Light Purple 3
  { backgroundColor: '#76a5af', textColor: '#0c343d' }, // Light Cyan 3
  { backgroundColor: '#c27ba0', textColor: '#783f04' }, // Light Magenta 3
  { backgroundColor: '#a4c2f4', textColor: '#0b5394' }, // Cerulean
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

  return closestColor;
}

/**
 * Get Gmail color by exact backgroundColor match
 * Useful for user manual override selection
 */
export function getGmailColorByBackground(backgroundColor: string): GmailColor | undefined {
  return GMAIL_LABEL_COLORS.find(
    (color) => color.backgroundColor.toLowerCase() === backgroundColor.toLowerCase()
  );
}
