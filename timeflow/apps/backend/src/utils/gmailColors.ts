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
  { backgroundColor: '#e7e7e7', textColor: '#000000' }, // Light gray
  { backgroundColor: '#b6cff5', textColor: '#000000' }, // Light blue
  { backgroundColor: '#98d7e4', textColor: '#000000' }, // Light teal
  { backgroundColor: '#e3d7ff', textColor: '#000000' }, // Light purple
  { backgroundColor: '#fbd3e0', textColor: '#000000' }, // Light pink
  { backgroundColor: '#f2b2a8', textColor: '#000000' }, // Light coral
  { backgroundColor: '#c2c2c2', textColor: '#000000' }, // Dark gray
  { backgroundColor: '#4986e7', textColor: '#ffffff' }, // Dark blue
  { backgroundColor: '#2da2bb', textColor: '#ffffff' }, // Dark teal
  { backgroundColor: '#b99aff', textColor: '#000000' }, // Dark purple
  { backgroundColor: '#f691b2', textColor: '#000000' }, // Coral pink
  { backgroundColor: '#fb4c2f', textColor: '#ffffff' }, // Bright red
  { backgroundColor: '#ffc8af', textColor: '#000000' }, // Peach
  { backgroundColor: '#ffdeb5', textColor: '#000000' }, // Beige
  { backgroundColor: '#fbe983', textColor: '#000000' }, // Yellow
  { backgroundColor: '#fdedc1', textColor: '#000000' }, // Light yellow
  { backgroundColor: '#b3efd3', textColor: '#000000' }, // Soft green
  { backgroundColor: '#a2dcc1', textColor: '#000000' }, // Pale green
  { backgroundColor: '#ff7537', textColor: '#ffffff' }, // Orange
  { backgroundColor: '#ffad46', textColor: '#000000' }, // Amber
  { backgroundColor: '#ebdbde', textColor: '#000000' }, // Mauve gray
  { backgroundColor: '#cca6ac', textColor: '#000000' }, // Dusty rose
  { backgroundColor: '#42d692', textColor: '#000000' }, // Bright green
  { backgroundColor: '#16a765', textColor: '#ffffff' }, // Dark green
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
