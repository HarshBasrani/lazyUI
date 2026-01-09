import * as vscode from 'vscode';
import { generateCompliantUI } from './controller/generator';
import { StrictComplianceError } from './controller/generator';
import { extractTruth } from './logic/extractor';
import { resolveTruth } from './logic/resolver';
import { ConfigParseError } from './logic/extractor';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('lazyui.generate', async () => {
    try {
      // Get user input
      const userInput = await vscode.window.showInputBox({
        prompt: 'Describe the UI component...',
        placeHolder: 'e.g., A blue button with white text',
      });

      if (!userInput) {
        return;
      }

      // Get active editor
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      // Get workspace root
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
      }

      const projectRoot = workspaceFolder.uri.fsPath;

      // Show progress and execute pipeline
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Consulting Strict Compiler...',
          cancellable: false,
        },
        async () => {
          // Pipeline: Extract -> Resolve -> Generate
          const userTruth = extractTruth(projectRoot);
          const resolvedTruth = resolveTruth(userTruth);
          
          // Capture context (before and after cursor)
          const position = editor.selection.active;
          const document = editor.document;
          
          // Get last 20 lines before cursor
          const prefixStartLine = Math.max(0, position.line - 20);
          const prefixRange = new vscode.Range(prefixStartLine, 0, position.line, position.character);
          const prefix = document.getText(prefixRange);
          
          // Get next 20 lines after cursor
          const suffixEndLine = Math.min(document.lineCount - 1, position.line + 20);
          const suffixRange = new vscode.Range(position.line, position.character, suffixEndLine, document.lineAt(suffixEndLine).text.length);
          const suffix = document.getText(suffixRange);
          
          const context = {
            prefix,
            suffix,
            language: document.languageId
          };
          
          const generatedCode = await generateCompliantUI(
            resolvedTruth,
            context,
            userInput
          );

          // Insert at cursor position
          await editor.edit((editBuilder) => {
            editBuilder.insert(position, generatedCode);
          });

          vscode.window.showInformationMessage('UI component generated successfully');
        }
      );
    } catch (error) {
      // Handle errors gracefully
      if (error instanceof StrictComplianceError) {
        vscode.window.showErrorMessage(
          `Strict Compliance Error: ${error.message}`,
          { modal: true }
        );
      } else if (error instanceof ConfigParseError) {
        vscode.window.showErrorMessage(
          `Config Parse Error: ${error.message}`,
          { modal: true }
        );
      } else if (error instanceof Error) {
        vscode.window.showErrorMessage(
          `Error: ${error.message}`,
          { modal: true }
        );
      } else {
        vscode.window.showErrorMessage(
          'An unknown error occurred',
          { modal: true }
        );
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
