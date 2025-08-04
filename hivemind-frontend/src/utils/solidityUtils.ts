import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Utility functions for Solidity code
 */
export class SolidityUtils {
  /**
   * Find all Solidity files in a workspace folder
   */
  static async findSolidityFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.sol');
    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    return files.map(file => file.fsPath);
  }

  /**
   * Find all Solidity files in all workspace folders
   */
  static async findAllSolidityFiles(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }

    const filePromises = workspaceFolders.map(folder => this.findSolidityFiles(folder));
    const fileArrays = await Promise.all(filePromises);
    return fileArrays.flat();
  }

  /**
   * Parse Solidity file to extract contract name
   */
  static extractContractName(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const contractMatch = content.match(/contract\s+(\w+)/);
      if (contractMatch && contractMatch[1]) {
        return contractMatch[1];
      }
      return path.basename(filePath, '.sol');
    } catch (error) {
      console.error('Failed to extract contract name:', error);
      return path.basename(filePath, '.sol');
    }
  }

  /**
   * Parse Solidity file to extract imports
   */
  static extractImports(filePath: string): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /import\s+(?:["'](.+?)["']|{[^}]*}\s+from\s+["'](.+?)["'])/g;
      const imports: string[] = [];
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (importPath) {
          imports.push(importPath);
        }
      }

      return imports;
    } catch (error) {
      console.error('Failed to extract imports:', error);
      return [];
    }
  }

  /**
   * Parse Solidity file to extract function signatures
   */
  static extractFunctions(filePath: string): { name: string; signature: string; visibility: string }[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*(public|private|internal|external)?(?:\s+view|\s+pure|\s+payable)*\s*(?:returns\s*\([^)]*\))?\s*{/g;
      const functions: { name: string; signature: string; visibility: string }[] = [];
      let match;

      while ((match = functionRegex.exec(content)) !== null) {
        const name = match[1];
        const params = match[2].trim();
        const visibility = match[3] || 'public';
        const signature = `function ${name}(${params})`;
        functions.push({ name, signature, visibility });
      }

      return functions;
    } catch (error) {
      console.error('Failed to extract functions:', error);
      return [];
    }
  }

  /**
   * Parse Solidity file to extract state variables
   */
  static extractStateVariables(filePath: string): { name: string; type: string; visibility: string }[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const variableRegex = /(uint|int|bool|address|string|bytes\d*|mapping)\s*(?:\[\])?\s+(?:public|private|internal)?\s+(\w+)\s*;/g;
      const variables: { name: string; type: string; visibility: string }[] = [];
      let match;

      while ((match = variableRegex.exec(content)) !== null) {
        const type = match[1];
        const name = match[2];
        const visibility = content.substring(match.index, match.index + match[0].length).includes('public')
          ? 'public'
          : content.substring(match.index, match.index + match[0].length).includes('private')
          ? 'private'
          : 'internal';
        variables.push({ name, type, visibility });
      }

      return variables;
    } catch (error) {
      console.error('Failed to extract state variables:', error);
      return [];
    }
  }

  /**
   * Get contract dependencies
   */
  static async getContractDependencies(filePath: string): Promise<string[]> {
    const imports = this.extractImports(filePath);
    const dependencies: string[] = [];

    for (const importPath of imports) {
      // Handle relative imports
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const absolutePath = path.resolve(path.dirname(filePath), importPath);
        dependencies.push(absolutePath);
      } else {
        // Handle node_modules imports
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (const folder of workspaceFolders) {
            const nodeModulesPath = path.join(folder.uri.fsPath, 'node_modules', importPath);
            if (fs.existsSync(nodeModulesPath)) {
              dependencies.push(nodeModulesPath);
              break;
            }
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Check if a file is a Solidity file
   */
  static isSolidityFile(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.sol';
  }

  /**
   * Get current Solidity file
   */
  static getCurrentSolidityFile(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'solidity') {
      return editor.document.uri.fsPath;
    }
    return undefined;
  }

  /**
   * Format Solidity code
   */
  static formatSolidityCode(code: string): string {
    // This is a simple formatter, a real implementation would use a proper Solidity formatter
    // like prettier-plugin-solidity
    const lines = code.split('\n');
    let formattedCode = '';
    let indentLevel = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Decrease indent for closing braces
      if (trimmedLine.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Add indentation
      const indent = '    '.repeat(indentLevel);
      formattedCode += indent + trimmedLine + '\n';

      // Increase indent for opening braces
      if (trimmedLine.endsWith('{')) {
        indentLevel++;
      }
    }

    return formattedCode;
  }
}
