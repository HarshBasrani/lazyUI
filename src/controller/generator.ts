import * as https from 'https';
import * as vscode from 'vscode';
import { validateCode } from '../logic/validator';
import { ResolvedTruth } from '../logic/resolver';

export class StrictComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StrictComplianceError';
  }
}
export interface CodeContext {
  prefix: string;
  suffix: string;
  language: string;
}
/**
 * Calculate Levenshtein distance for similarity checking
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
 * Helper function to capture code context around the cursor
 */
function captureContext(): { contextCode: string; languageId: string } {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return { contextCode: '', languageId: 'plaintext' };
  }

  const position = editor.selection.active;
  const currentLine = position.line;

  // Read the previous 20 lines of code before the cursor
  const startLine = Math.max(0, currentLine - 20);
  const endLine = currentLine;

  const range = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
  const contextCode = editor.document.getText(range);

  // Capture the language ID
  const languageId = editor.document.languageId;

  return { contextCode, languageId };
}

/**
 * Build context-aware system prompt
 */
function buildSystemPrompt(context: CodeContext, resolvedTruth: ResolvedTruth): string {
  const allowedColors = Object.keys(resolvedTruth.colors).slice(0, 20).join(', ');
  const allowedSpacing = Object.keys(resolvedTruth.spacing).slice(0, 15).join(', ');

  return `You are a strict UI component generator. Generate ONLY valid JSX code using allowed Tailwind classes.

ALLOWED COLORS: ${allowedColors}...
ALLOWED SPACING: ${allowedSpacing}...

CONTEXT AWARENESS:
Language: ${context.language}

[CODE BEFORE CURSOR]:
\`\`\`
${context.prefix}
\`\`\`

[CURSOR IS HERE]

[CODE AFTER CURSOR]:
\`\`\`
${context.suffix}
\`\`\`

INTELLIGENT PLACEMENT RULES:
1. Analyze where the [CURSOR] is relative to the code structure.
2. IF Inside an Object/Class: Generate properties/methods (e.g., "key: value,").
3. IF Outside an Object/Class: Do NOT generate properties. Generate standalone code (e.g., "object.key = value;") or a new variable.
4. IF Inside a List/Array: Generate items (e.g., "item,").
5. NEVER repeat the code from Before/After. Output ONLY the insertion.

STRICT RULES:
- NO arbitrary values like bg-[#fff] or w-[50px]
- ONLY use colors and spacing from the allowed lists above
- Use semantic class names (bg-, text-, p-, m-, etc.)
- Return ONLY the JSX code, no explanations`;
}
function postRequest(url: string, apiKey: string, data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${apiKey}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        console.log('[LazyUI Debug] Raw Response:', responseBody);
        console.log('[LazyUI Debug] Status Code:', res.statusCode);

        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          return;
        }

        try {
          const parsed = JSON.parse(responseBody);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Real LLM API call using VS Code configuration with conversation messages
 */
async function callLLM(messages: Array<{role: string; content: string}>, resolvedTruth: ResolvedTruth): Promise<string> {
  const config = vscode.workspace.getConfiguration('lazyui');
  const apiKey = config.get<string>('apiKey');
  const baseUrl = config.get<string>('baseUrl') || 'https://api.openai.com/v1';
  const model = config.get<string>('model') || 'gpt-4';

  console.log('[LazyUI Debug] Model:', model);
  console.log('[LazyUI Debug] Base URL:', baseUrl);

  if (!apiKey) {
    throw new Error('LazyUI API Key not configured. Set "lazyui.apiKey" in settings.');
  }

  // Construct full URL with endpoint
  const fullUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  console.log('[LazyUI Debug] Full URL:', fullUrl);

  // Construct the payload
  const payload = {
    model: model,
    messages: messages,
    temperature: 0.2,
  };

  console.log('[LazyUI Debug] Sending request...');

  // Make the API call
  let response;
  try {
    response = await postRequest(fullUrl, apiKey, payload);
  } catch (error) {
    throw new Error(`API request failed: ${error}`);
  }

  console.log('[LazyUI Debug] Full Response:', JSON.stringify(response, null, 2));

  // Check for API errors
  if (response.error) {
    throw new Error(`API Error: ${JSON.stringify(response.error)}`);
  }

  // Check if choices exist
  if (!response.choices || response.choices.length === 0) {
    throw new Error(`API returned 0 choices. Raw response: ${JSON.stringify(response)}`);
  }

  // Extract content
  let content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`No content in response. Raw response: ${JSON.stringify(response)}`);
  }

  console.log('[LazyUI Debug] Content received:', content);

  // Strip markdown code blocks
  content = content.replace(/```[\w]*\n?/g, '').trim();

  return content;
}

/**
 * Main generation function with smart validation retry loop
 */
/**
 * Main generation function with binocular vision (context-aware)
 */
export async function generateCompliantUI(
  resolvedTruth: ResolvedTruth,
  context: CodeContext,
  userPrompt: string
): Promise<string> {
  const maxAttempts = 3;
  
  // Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(context, resolvedTruth);
  
  // Initialize conversation with system and user prompts
  const messages: Array<{role: string; content: string}> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[LazyUI] Attempt ${attempt}/${maxAttempts}`);
    
    const generatedCode = await callLLM(messages, resolvedTruth);
    const validationResult = validateCode(generatedCode, resolvedTruth);

    if (validationResult.isValid) {
      console.log('[LazyUI] Validation PASSED');
      return validationResult.code;
    }

    // Log specific errors
    console.log('[LazyUI] Validation FAILED:');
    validationResult.errors.forEach(err => console.log(`  - ${err}`));

    // If this was the last attempt, return sanitized code with warning
    if (attempt === maxAttempts) {
      console.log('[LazyUI] Max attempts reached. Returning sanitized code.');
      vscode.window.showWarningMessage(
        `LazyUI: Generated code had violations. Returning sanitized version. Issues: ${validationResult.errors.length}`
      );
      return validationResult.code;
    }

    // Append errors as a new user message to guide the AI
    const errorFeedback = `Your code was rejected strictly. Fix these errors:\n- ${validationResult.errors.join('\n- ')}\n\nReturn ONLY the fixed JSX.`;
    messages.push({ role: 'user', content: errorFeedback });
  }

  // Fallback (should never reach here due to loop logic)
  throw new StrictComplianceError('Unexpected error in generation loop');
}
