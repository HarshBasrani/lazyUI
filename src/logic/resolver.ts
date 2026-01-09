import defaultTheme from '../assets/tailwind-defaults.json';
import { ExtractedTruth } from './extractor';

export interface ResolvedTruth {
  colors: Record<string, string>;
  spacing: Record<string, string>;
}

/**
 * Resolves final truth by merging or replacing defaults based on source
 * Logic: If override exists, use it as base. Otherwise use defaults. Then merge extend on top.
 */
export function resolveTruth(userTruth: ExtractedTruth): ResolvedTruth {
  let finalColors: Record<string, string>;
  let finalSpacing: Record<string, string>;

  // Handle colors
  if (Object.keys(userTruth.override.colors).length > 0) {
    // Override exists: use override as base, then merge extend
    finalColors = {
      ...userTruth.override.colors,
      ...userTruth.extend.colors,
    };
  } else {
    // No override: use defaults as base, then merge extend
    finalColors = {
      ...defaultTheme.colors,
      ...userTruth.extend.colors,
    };
  }

  // Handle spacing
  if (Object.keys(userTruth.override.spacing).length > 0) {
    // Override exists: use override as base, then merge extend
    finalSpacing = {
      ...userTruth.override.spacing,
      ...userTruth.extend.spacing,
    };
  } else {
    // No override: use defaults as base, then merge extend
    finalSpacing = {
      ...defaultTheme.spacing,
      ...userTruth.extend.spacing,
    };
  }

  return {
    colors: finalColors,
    spacing: finalSpacing,
  };
}
