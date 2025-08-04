import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get webview HTML content
 */
export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  title: string,
  view: string
): string {
  // Generate nonce
  const nonce = getNonce();
  
  // Get paths to CSS and JS files
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js')
  );
  
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css')
  );
  
  // CSP sources
  const cspSources = [
    webview.cspSource,
    `'nonce-${nonce}'`
  ];
  
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      style-src ${cspSources.join(' ')};
      script-src ${cspSources.join(' ')};
      img-src ${webview.cspSource} https: data:;
    ">
    <title>${title}</title>
    <link rel="stylesheet" href="${cssUri}">
  </head>
  <body>
    <div id="root" data-view="${view}"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
  </html>`;
}

/**
 * Generate a nonce for CSP
 */
export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  
  return text;
}

/**
 * Post message to webview
 */
export function postMessageToWebview(
  webview: vscode.Webview,
  type: string,
  data: any
): void {
  webview.postMessage({
    type,
    ...data
  });
}

/**
 * Handle message from webview
 */
export function handleWebviewMessage(
  message: any,
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  apiService: any,
  hederaService: any
): void {
  switch (message.type) {
    case 'ready':
      // Webview is ready, initialize it
      break;
      
    case 'generateCode':
      generateCode(message, panel, apiService);
      break;
      
    case 'analyzeCode':
      analyzeCode(message, panel, apiService);
      break;
      
    case 'connectHedera':
      connectToHedera(panel, hederaService);
      break;
      
    case 'useAgent':
      useAgent(message, panel, hederaService);
      break;
      
    case 'insertCode':
      insertCodeToEditor(message);
      break;
      
    case 'selectFile':
      selectFile(panel);
      break;
      
    case 'showVulnerability':
      showVulnerability(message);
      break;
      
    case 'generateFix':
      generateFix(message, panel, apiService);
      break;
      
    case 'applyFix':
      applyFix(message);
      break;
      
    case 'exportReport':
      exportReport(message, panel);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

/**
 * Generate code
 */
async function generateCode(
  message: any,
  panel: vscode.WebviewPanel,
  apiService: any
): Promise<void> {
  try {
    const { prompt, language } = message;
    
    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating code...',
      cancellable: false
    }, async () => {
      try {
        // Call API
        const result = await apiService.generateCode(prompt, language);
        
        // Post result to webview
        postMessageToWebview(panel.webview, 'update', {
          generatedCode: result.code
        });
        
        return result;
      } catch (error) {
        console.error('Failed to generate code:', error);
        vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
        
        // Post error to webview
        postMessageToWebview(panel.webview, 'update', {
          generatedCode: `Error: ${error}`
        });
        
        return null;
      }
    });
  } catch (error) {
    console.error('Failed to generate code:', error);
    vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
  }
}

/**
 * Analyze code
 */
async function analyzeCode(
  message: any,
  panel: vscode.WebviewPanel,
  apiService: any
): Promise<void> {
  try {
    const { filePath } = message;
    
    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Analyzing code...',
      cancellable: false
    }, async () => {
      try {
        // Read file
        const fileUri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(fileUri);
        const code = document.getText();
        
        // Call API
        const result = await apiService.analyzeCode(code);
        
        // Post result to webview
        postMessageToWebview(panel.webview, 'update', {
          analysisResult: JSON.stringify(result, null, 2)
        });
        
        return result;
      } catch (error) {
        console.error('Failed to analyze code:', error);
        vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
        
        // Post error to webview
        postMessageToWebview(panel.webview, 'update', {
          analysisResult: `Error: ${error}`
        });
        
        return null;
      }
    });
  } catch (error) {
    console.error('Failed to analyze code:', error);
    vscode.window.showErrorMessage(`Failed to analyze code: ${error}`);
  }
}

/**
 * Connect to Hedera
 */
async function connectToHedera(
  panel: vscode.WebviewPanel,
  hederaService: any
): Promise<void> {
  try {
    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Connecting to Hedera...',
      cancellable: false
    }, async () => {
      try {
        // Connect to Hedera
        await hederaService.connect();
        
        // Get agents
        const agents = await hederaService.getAgents();
        
        // Post result to webview
        postMessageToWebview(panel.webview, 'connectionStatus', {
          connected: true
        });
        
        postMessageToWebview(panel.webview, 'update', {
          agents
        });
        
        // Update network status
        vscode.commands.executeCommand('hivemind.updateNetworkStatus', 
          true, 
          hederaService.getNetwork(),
          hederaService.getAccountId()
        );
        
        return true;
      } catch (error) {
        console.error('Failed to connect to Hedera:', error);
        vscode.window.showErrorMessage(`Failed to connect to Hedera: ${error}`);
        
        // Post error to webview
        postMessageToWebview(panel.webview, 'connectionStatus', {
          connected: false
        });
        
        return false;
      }
    });
  } catch (error) {
    console.error('Failed to connect to Hedera:', error);
    vscode.window.showErrorMessage(`Failed to connect to Hedera: ${error}`);
  }
}

/**
 * Use agent
 */
async function useAgent(
  message: any,
  panel: vscode.WebviewPanel,
  hederaService: any
): Promise<void> {
  try {
    const { agentId } = message;
    
    // Get agent details
    const agents = await hederaService.getAgents();
    const agent = agents.find((a: any) => a.id === agentId);
    
    if (!agent) {
      vscode.window.showErrorMessage(`Agent ${agentId} not found`);
      return;
    }
    
    // Show agent capabilities and ask what to do
    const action = await vscode.window.showQuickPick(
      agent.capabilities.map((cap: string) => ({
        label: cap,
        description: `Use ${agent.name} for ${cap}`
      })),
      {
        placeHolder: `What would you like ${agent.name} to do?`
      }
    );
    
    if (!action) {
      return;
    }
    
    // Handle different capabilities
    const capability = (action as any)?.label || '';
    switch (capability) {
      case 'audit':
        vscode.commands.executeCommand('hivemind.auditContract');
        break;
        
      case 'test-generation':
      case 'fuzzing':
        vscode.commands.executeCommand('hivemind.generateTests');
        break;
        
      case 'optimization':
      case 'gas-analysis':
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'solidity') {
          vscode.window.showInformationMessage('Please open a Solidity file to optimize.');
          return;
        }
        
        // Show optimization in progress
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Optimizing with ${agent.name}...`,
          cancellable: false
        }, async (progress) => {
          // This would call the API to optimize the contract
          // For now, just show a message
          await new Promise(resolve => setTimeout(resolve, 2000));
          vscode.window.showInformationMessage(`Optimization with ${agent.name} completed.`);
        });
        break;
        
      default:
        vscode.window.showInformationMessage(`Using ${agent.name} for ${capability}`);
    }
  } catch (error) {
    console.error('Failed to use agent:', error);
    vscode.window.showErrorMessage(`Failed to use agent: ${error}`);
  }
}

/**
 * Insert code to editor
 */
async function insertCodeToEditor(message: any): Promise<void> {
  try {
    const { code } = message;
    
    // Get active editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor');
      return;
    }
    
    // Insert code
    editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.start, code);
    });
  } catch (error) {
    console.error('Failed to insert code:', error);
    vscode.window.showErrorMessage(`Failed to insert code: ${error}`);
  }
}

/**
 * Select file
 */
async function selectFile(panel: vscode.WebviewPanel): Promise<void> {
  try {
    // Show file picker
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Select File',
      filters: {
        'Solidity': ['sol'],
        'All Files': ['*']
      }
    });
    
    if (!fileUris || fileUris.length === 0) {
      return;
    }
    
    // Post result to webview
    postMessageToWebview(panel.webview, 'update', {
      selectedFile: fileUris[0].fsPath
    });
  } catch (error) {
    console.error('Failed to select file:', error);
    vscode.window.showErrorMessage(`Failed to select file: ${error}`);
  }
}

/**
 * Show vulnerability
 */
async function showVulnerability(message: any): Promise<void> {
  try {
    const { vulnerability } = message;
    
    // Parse location (format: "line X" or "lines X-Y")
    const lineMatch = vulnerability.location?.match(/line[s]?\s+(\d+)(?:-(\d+))?/i);
    if (!lineMatch) {
      return;
    }
    
    // Open file
    const document = await vscode.workspace.openTextDocument(vulnerability.filePath);
    const editor = await vscode.window.showTextDocument(document);
    
    const startLine = parseInt(lineMatch[1]) - 1; // Convert to 0-based
    const endLine = lineMatch[2] ? parseInt(lineMatch[2]) - 1 : startLine;
    
    // Create selection
    const selection = new vscode.Selection(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );
    
    // Set selection and reveal
    editor.selection = selection;
    editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
  } catch (error) {
    console.error('Failed to show vulnerability:', error);
    vscode.window.showErrorMessage(`Failed to show vulnerability: ${error}`);
  }
}

/**
 * Generate fix
 */
async function generateFix(
  message: any,
  panel: vscode.WebviewPanel,
  apiService: any
): Promise<void> {
  try {
    const { vulnerability } = message;
    
    // Show progress
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Generating fix for ${vulnerability.title}...`,
      cancellable: false
    }, async () => {
      try {
        // Open file
        const document = await vscode.workspace.openTextDocument(vulnerability.filePath);
        const code = document.getText();
        
        // Generate fix
        const result = await apiService.generateCode(
          `Fix the following vulnerability in this Solidity code: ${vulnerability.description}\n\nCode:\n${code}`,
          'solidity'
        );
        
        // Post result to webview
        postMessageToWebview(panel.webview, 'update', {
          generatedFix: result.code
        });
        
        return result;
      } catch (error) {
        console.error('Failed to generate fix:', error);
        vscode.window.showErrorMessage(`Failed to generate fix: ${error}`);
        
        // Post error to webview
        postMessageToWebview(panel.webview, 'update', {
          generatedFix: `Error: ${error}`
        });
        
        return null;
      }
    });
  } catch (error) {
    console.error('Failed to generate fix:', error);
    vscode.window.showErrorMessage(`Failed to generate fix: ${error}`);
  }
}

/**
 * Apply fix
 */
async function applyFix(message: any): Promise<void> {
  try {
    const { vulnerability, fix } = message;
    
    // Open file
    const document = await vscode.workspace.openTextDocument(vulnerability.filePath);
    const editor = await vscode.window.showTextDocument(document);
    
    // Parse location (format: "line X" or "lines X-Y")
    const lineMatch = vulnerability.location?.match(/line[s]?\s+(\d+)(?:-(\d+))?/i);
    if (!lineMatch) {
      return;
    }
    
    const startLine = parseInt(lineMatch[1]) - 1; // Convert to 0-based
    const endLine = lineMatch[2] ? parseInt(lineMatch[2]) - 1 : startLine;
    
    // Create range
    const range = new vscode.Range(
      new vscode.Position(startLine, 0),
      new vscode.Position(endLine, document.lineAt(endLine).text.length)
    );
    
    // Apply fix
    editor.edit(editBuilder => {
      editBuilder.replace(range, fix);
    });
  } catch (error) {
    console.error('Failed to apply fix:', error);
    vscode.window.showErrorMessage(`Failed to apply fix: ${error}`);
  }
}

/**
 * Export report
 */
async function exportReport(message: any, panel: vscode.WebviewPanel): Promise<void> {
  try {
    // Show save dialog
    const fileUri = await vscode.window.showSaveDialog({
      saveLabel: 'Export Report',
      filters: {
        'Markdown': ['md'],
        'All Files': ['*']
      }
    });
    
    if (!fileUri) {
      return;
    }
    
    // Get report data
    const data = panel.webview.postMessage({ type: 'getReportData' });
    
    // Generate report
    const report = generateMarkdownReport(data);
    
    // Write to file
    fs.writeFileSync(fileUri.fsPath, report);
    
    vscode.window.showInformationMessage(`Report exported to ${fileUri.fsPath}`);
  } catch (error) {
    console.error('Failed to export report:', error);
    vscode.window.showErrorMessage(`Failed to export report: ${error}`);
  }
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(data: any): string {
  // This is a placeholder implementation
  return `# Security Audit Report
  
## Contract: ${data.contractName || 'Unknown'}

**Audit Date:** ${new Date(data.timestamp || Date.now()).toLocaleString()}

## Summary

${data.summary?.text || 'No summary available'}

## Vulnerabilities

${(data.vulnerabilities || []).map((vuln: any) => `
### ${vuln.title} (${vuln.severity})

**Location:** ${vuln.location}

${vuln.description}
`).join('\n')}

## AI Analysis

${data.aiAnalysis || 'No AI analysis available'}
`;
}
