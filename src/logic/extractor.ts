import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export class ConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigParseError';
  }
}

export interface ExtractedTruth {
  extend: { colors: Record<string, string>; spacing: Record<string, string> };
  override: { colors: Record<string, string>; spacing: Record<string, string> };
}

/**
 * Recursively flattens nested objects with dash notation
 * Example: { primary: { DEFAULT: '#000', light: '#fff' } } => { 'primary-DEFAULT': '#000', 'primary-light': '#fff' }
 */
function flattenObject(obj: any, prefix: string = ''): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (typeof value === 'string') {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Extract object literal from AST node
 */
function extractObjectFromNode(node: any): any {
  if (node.type === 'ObjectExpression') {
    const obj: any = {};
    for (const prop of node.properties) {
      if (prop.type === 'ObjectProperty' || prop.type === 'Property') {
        const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
        obj[key] = extractObjectFromNode(prop.value);
      } else if (prop.type === 'SpreadElement') {
        // Skip spread elements for strict extraction
        continue;
      }
    }
    return obj;
  } else if (node.type === 'StringLiteral') {
    return node.value;
  } else if (node.type === 'NumericLiteral') {
    return String(node.value);
  } else if (node.type === 'TemplateLiteral') {
    // Simple template literal with no expressions
    if (node.expressions.length === 0 && node.quasis.length === 1) {
      return node.quasis[0].value.cooked;
    }
  }
  return null;
}

/**
 * Verify that a path is within theme.extend or theme
 * Returns 'extend' | 'root' | null
 */
function verifyAncestry(path: any[], targetKey: 'colors' | 'spacing'): 'extend' | 'root' | null {
  // Valid paths: theme.extend.colors, theme.extend.spacing, theme.colors, theme.spacing
  const pathStr = path.join('.');
  if (pathStr === `theme.extend.${targetKey}`) {
    return 'extend';
  } else if (pathStr === `theme.${targetKey}`) {
    return 'root';
  }
  return null;
}

/**
 * Main extraction function
 */
export function extractTruth(projectRoot: string): ExtractedTruth {
  const configFiles = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs'];
  let configPath: string | null = null;

  for (const file of configFiles) {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (!configPath) {
    throw new ConfigParseError('No tailwind config file found');
  }

  let code: string;
  try {
    code = fs.readFileSync(configPath, 'utf-8');
  } catch (error) {
    throw new ConfigParseError(`Failed to read config file: ${error}`);
  }

  let ast: any;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch (error) {
    throw new ConfigParseError(`Failed to parse config file: ${error}`);
  }

  const extendColors: any = {};
  const extendSpacing: any = {};
  const overrideColors: any = {};
  const overrideSpacing: any = {};

  try {
    traverse(ast, {
      ObjectProperty(nodePath: any) {
        const key = nodePath.node.key.name || nodePath.node.key.value;
        
        if (key === 'colors' || key === 'spacing') {
          // Build ancestry path
          const ancestryPath: string[] = [];
          let current = nodePath.parentPath;
          
          while (current) {
            if (current.node.type === 'ObjectProperty' || current.node.type === 'Property') {
              const parentKey = current.node.key.name || current.node.key.value;
              ancestryPath.unshift(parentKey);
            }
            current = current.parentPath;
          }
          
          ancestryPath.push(key);
          
          // Verify ancestry (C1)
          const source = verifyAncestry(ancestryPath, key);
          if (source) {
            const extracted = extractObjectFromNode(nodePath.node.value);
            if (extracted) {
              if (key === 'colors') {
                if (source === 'extend') {
                  Object.assign(extendColors, extracted);
                } else {
                  Object.assign(overrideColors, extracted);
                }
              } else if (key === 'spacing') {
                if (source === 'extend') {
                  Object.assign(extendSpacing, extracted);
                } else {
                  Object.assign(overrideSpacing, extracted);
                }
              }
            }
          }
        }
      },
    });
  } catch (error) {
    throw new ConfigParseError(`Failed to traverse AST: ${error}`);
  }

  // Flatten extracted objects (C2)
  const flatExtendColors = flattenObject(extendColors);
  const flatExtendSpacing = flattenObject(extendSpacing);
  const flatOverrideColors = flattenObject(overrideColors);
  const flatOverrideSpacing = flattenObject(overrideSpacing);

  return {
    extend: {
      colors: flatExtendColors,
      spacing: flatExtendSpacing,
    },
    override: {
      colors: flatOverrideColors,
      spacing: flatOverrideSpacing,
    },
  };
}
