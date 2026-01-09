export interface ValidationResult {
  isValid: boolean;
  code: string;
  errors: string[];
}

interface ResolvedTruth {
  colors: Record<string, string>;
  spacing: Record<string, string>;
}

// Scoped prefixes with strict vs loose validation
const SCOPED_PREFIXES = {
  // Colors - STRICT validation against resolvedTruth.colors
  colors: ['bg-', 'text-', 'border-', 'ring-', 'divide-'],

  // Spacing - STRICT validation against resolvedTruth.spacing
  spacing: ['p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-', 'm-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-', 'gap-', 'gap-x-', 'gap-y-', 'space-x-', 'space-y-'],

  // Layout - LOOSE validation (prefix only)
  layout: [
    'flex', 'flex-', 'grid', 'grid-', 'block', 'hidden', 'inline', 'inline-block', 'inline-flex', 'inline-grid',
    'w-', 'h-', 'min-w-', 'max-w-', 'min-h-', 'max-h-',
    'justify-', 'items-', 'content-', 'self-', 'col-', 'row-',
    'relative', 'absolute', 'fixed', 'sticky',
    'top-', 'bottom-', 'left-', 'right-', 'inset-',
    'z-', 'flex-wrap', 'order-', 'overflow-',
    'border-t-', 'border-b-', 'border-l-', 'border-r-', 'border-x-', 'border-y-'
  ],

  // Typography - LOOSE validation (prefix only)
  typography: [
    'font-', 'leading-', 'tracking-', 'text-',
    'uppercase', 'lowercase', 'capitalize', 'normal-case',
    'list-', 'italic', 'underline',
    'text-center', 'text-left', 'text-right'
  ],

  // Decoration - LOOSE validation (prefix only)
  decoration: [
    'rounded-', 'rounded', 'shadow-', 'shadow',
    'opacity-', 'cursor-',
    'border-t', 'border-b', 'border-l', 'border-r',
    'ring-', 'outline-', 'transition-', 'duration-'
  ],
};

// Standard keywords for sizing (w-, h-, etc.) that don't need config validation
const STANDARD_SIZE_KEYWORDS = ['full', 'screen', 'min', 'max', 'fit', 'auto', 'px'];

// Standard text sizes (for text-xl, text-sm, etc.)
const TEXT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];

// Standard border widths (for border-4, border-2, etc.)
const BORDER_WIDTHS = ['0', '2', '4', '8'];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the top 3 closest matches from a list of options
 */
function findClosest(target: string, options: string[]): string[] {
  const distances = options.map(option => ({
    option,
    distance: levenshtein(target, option)
  }));

  distances.sort((a, b) => a.distance - b.distance);

  return distances.slice(0, 3).map(d => d.option);
}

/**
 * Extracts class names from code using regex
 */
function extractClasses(code: string): string[] {
  const classRegex = /className\s*=\s*{?["'`]([^"'`]+)["'`]}?|class\s*=\s*["']([^"']+)["']/g;
  const classes: string[] = [];
  let match;

  while ((match = classRegex.exec(code)) !== null) {
    const classString = match[1] || match[2];
    if (classString) {
      const tokens = classString.split(/\s+/).filter(Boolean);
      classes.push(...tokens);
    }
  }

  return classes;
}

/**
 * Finds the longest matching prefix for a class
 * Returns { category, prefix } or null
 */
function findLongestMatch(className: string): { category: string; prefix: string } | null {
  let longestMatch: { category: string; prefix: string } | null = null;
  let longestLength = 0;

  for (const [category, prefixes] of Object.entries(SCOPED_PREFIXES)) {
    for (const prefix of prefixes) {
      if (!prefix.endsWith('-')) {
        // Exact match
        if (className === prefix && prefix.length > longestLength) {
          longestMatch = { category, prefix };
          longestLength = prefix.length;
        }
      } else {
        // Prefix match
        if (className.startsWith(prefix) && prefix.length > longestLength) {
          longestMatch = { category, prefix };
          longestLength = prefix.length;
        }
      }
    }
  }

  return longestMatch;
}

/**
 * Extracts the value token from a Tailwind class
 * Example: 'bg-blue-500' with prefix 'bg-' -> 'blue-500'
 */
function extractToken(className: string, prefix: string): string {
  if (!prefix.endsWith('-')) {
    return ''; // Exact match, no token
  }
  return className.substring(prefix.length);
}

/**
 * Validates if a sizing class uses standard keywords
 */
function isStandardSizeKeyword(token: string): boolean {
  return STANDARD_SIZE_KEYWORDS.includes(token) || /^\d+\/\d+$/.test(token); // Also allow fractions like 1/2
}

/**
 * Main validation function with smart error recovery
 */
export function validateCode(code: string, resolvedTruth: ResolvedTruth): ValidationResult {
  const validClasses: string[] = [];
  const errors: string[] = [];
  let isValid = true;

  const classes = extractClasses(code);

  for (const className of classes) {
    // Step A: Check for arbitrary values (KILL immediately)
    if (className.includes('[') && className.includes(']')) {
      console.log('[Validator] Rejecting arbitrary:', className);
      errors.push(`Invalid arbitrary value: '${className}'. Arbitrary values are not allowed.`);
      isValid = false;
      continue;
    }

    // Step B: Find longest matching prefix
    const match = findLongestMatch(className);

    if (!match) {
      // Class doesn't match any allowed prefix - include in valid code (not validated)
      validClasses.push(className);
      continue;
    }

    const { category, prefix } = match;
    const token = extractToken(className, prefix);

    // Step C: Validate based on category
    if (category === 'colors') {
      // Special handling for text- prefix (could be size OR color)
      if (prefix === 'text-') {
        // First check if it's a text size
        if (TEXT_SIZES.includes(token)) {
          validClasses.push(className);
          continue;
        }
        // Otherwise check if it's a valid color
        if (token && !resolvedTruth.colors[token]) {
          console.log('[Validator] Rejecting text color:', className, 'token:', token);
          const suggestions = findClosest(token, Object.keys(resolvedTruth.colors));
          const suggestionText = suggestions.map(s => `'${prefix}${s}'`).join(', ');
          errors.push(`Invalid class '${className}'. Did you mean: ${suggestionText}?`);
          isValid = false;
        } else {
          validClasses.push(className);
        }
        continue;
      }

      // Special handling for border- prefix (could be width OR color)
      if (prefix === 'border-') {
        // First check if it's a border width
        if (BORDER_WIDTHS.includes(token)) {
          validClasses.push(className);
          continue;
        }
        // Otherwise check if it's a valid color
        if (token && !resolvedTruth.colors[token]) {
          console.log('[Validator] Rejecting border color:', className, 'token:', token);
          const suggestions = findClosest(token, Object.keys(resolvedTruth.colors));
          const suggestionText = suggestions.map(s => `'${prefix}${s}'`).join(', ');
          errors.push(`Invalid class '${className}'. Did you mean: ${suggestionText}?`);
          isValid = false;
        } else {
          validClasses.push(className);
        }
        continue;
      }

      // Standard color validation for other prefixes (bg-, ring-, divide-)
      if (token && !resolvedTruth.colors[token]) {
        console.log('[Validator] Rejecting color:', className, 'token:', token);
        const suggestions = findClosest(token, Object.keys(resolvedTruth.colors));
        const suggestionText = suggestions.map(s => `'${prefix}${s}'`).join(', ');
        errors.push(`Invalid class '${className}'. Did you mean: ${suggestionText}?`);
        isValid = false;
      } else {
        validClasses.push(className);
      }
    } else if (category === 'spacing') {
      // Strict validation against resolvedTruth.spacing
      if (token && !resolvedTruth.spacing[token]) {
        console.log('[Validator] Rejecting spacing:', className, 'token:', token);
        const suggestions = findClosest(token, Object.keys(resolvedTruth.spacing));
        const suggestionText = suggestions.map(s => `'${prefix}${s}'`).join(', ');
        errors.push(`Invalid class '${className}'. Did you mean: ${suggestionText}?`);
        isValid = false;
      } else {
        validClasses.push(className);
      }
    } else if (category === 'layout') {
      // For sizing (w-, h-, etc.), allow standard keywords + spacing config
      if (prefix.startsWith('w-') || prefix.startsWith('h-') || prefix.startsWith('min-') || prefix.startsWith('max-')) {
        if (token && !isStandardSizeKeyword(token) && !resolvedTruth.spacing[token]) {
          console.log('[Validator] Rejecting layout size:', className, 'token:', token);
          const spacingOptions = Object.keys(resolvedTruth.spacing);
          const allOptions = [...STANDARD_SIZE_KEYWORDS, ...spacingOptions];
          const suggestions = findClosest(token, allOptions);
          const suggestionText = suggestions.map(s => `'${prefix}${s}'`).join(', ');
          errors.push(`Invalid class '${className}'. Did you mean: ${suggestionText}?`);
          isValid = false;
        } else {
          validClasses.push(className);
        }
      } else if (prefix.startsWith('border-t-') || prefix.startsWith('border-b-') || prefix.startsWith('border-l-') || prefix.startsWith('border-r-') || prefix.startsWith('border-x-') || prefix.startsWith('border-y-')) {
        // For border-t-, border-b-, etc., validate token against spacing
        if (token && !resolvedTruth.spacing[token]) {
          console.log('[Validator] Rejecting border width:', className, 'token:', token);
          const suggestions = findClosest(token, Object.keys(resolvedTruth.spacing));
          const suggestionText = suggestions.map(s => `'${prefix}${s}'`).join(', ');
          errors.push(`Invalid class '${className}'. Did you mean: ${suggestionText}?`);
          isValid = false;
        } else {
          validClasses.push(className);
        }
      } else {
        // Other layout classes are allowed
        validClasses.push(className);
      }
    } else {
      // Typography and decoration: allowed without validation
      validClasses.push(className);
    }
  }

  return {
    isValid,
    code: validClasses.join(' '),
    errors
  };
}
