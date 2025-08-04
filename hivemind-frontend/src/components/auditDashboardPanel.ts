import * as vscode from 'vscode';
import { ApiService } from '../services/apiService';
import { getNonce } from '../utils/security';

/**
 * Audit Dashboard Panel for displaying smart contract audit results
 */
export class AuditDashboardPanel {
  public static currentPanel: AuditDashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private apiService: ApiService,
    private auditResult: any
  ) {
    this._panel = panel;

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri, auditResult);

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'fixVulnerability':
            try {
              const editor = vscode.window.activeTextEditor;
              if (!editor) {
                this._panel.webview.postMessage({
                  command: 'error',
                  message: 'No active editor'
                });
                return;
              }

              // Get the vulnerability details
              const vulnerability = message.vulnerability;
              
              // Generate a fix for the vulnerability
              const fixResult = await this.apiService.generateCode(
                `Fix the following vulnerability in this Solidity code: ${vulnerability.description}\n\nCode:\n${editor.document.getText()}`,
                'solidity'
              );
              
              // Send the fix back to the webview
              this._panel.webview.postMessage({
                command: 'fixGenerated',
                fix: fixResult.code,
                vulnerabilityId: vulnerability.id
              });
            } catch (error) {
              this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to generate fix: ${error}`
              });
            }
            break;

          case 'applyFix':
            try {
              const editor = vscode.window.activeTextEditor;
              if (!editor) {
                this._panel.webview.postMessage({
                  command: 'error',
                  message: 'No active editor'
                });
                return;
              }

              // Apply the fix to the editor
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                editor.document.uri,
                new vscode.Range(
                  new vscode.Position(0, 0),
                  new vscode.Position(editor.document.lineCount, 0)
                ),
                message.fix
              );
              
              await vscode.workspace.applyEdit(edit);
              
              // Notify the webview that the fix was applied
              this._panel.webview.postMessage({
                command: 'fixApplied',
                vulnerabilityId: message.vulnerabilityId
              });
              
              // Re-audit the contract
              vscode.commands.executeCommand('hivemind.auditContract');
            } catch (error) {
              this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to apply fix: ${error}`
              });
            }
            break;

          case 'ignoreVulnerability':
            // Mark the vulnerability as ignored
            this._panel.webview.postMessage({
              command: 'vulnerabilityIgnored',
              vulnerabilityId: message.vulnerabilityId
            });
            break;
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * Create or show Audit Dashboard Panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    apiService: ApiService,
    auditResult: any
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and update the audit result
    if (AuditDashboardPanel.currentPanel) {
      AuditDashboardPanel.currentPanel._panel.reveal(column);
      AuditDashboardPanel.currentPanel._panel.webview.html = 
        AuditDashboardPanel.currentPanel._getHtmlForWebview(
          AuditDashboardPanel.currentPanel._panel.webview, 
          extensionUri, 
          auditResult
        );
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'hivemindAuditDashboard',
      'HiveMind Audit Dashboard',
      column || vscode.ViewColumn.One,
      {
        // Enable JavaScript in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the extension's directory
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(extensionUri, 'media')
        ],
        // Retain context when hidden
        retainContextWhenHidden: true
      }
    );

    AuditDashboardPanel.currentPanel = new AuditDashboardPanel(panel, extensionUri, apiService, auditResult);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    AuditDashboardPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Get HTML content for webview
   */
  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, auditResult: any): string {
    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    // Format the audit result for display
    const staticAnalysis = auditResult?.static_analysis || [];
    const aiAnalysis = auditResult?.ai_analysis || '';
    
    // Calculate severity counts
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    staticAnalysis.forEach((vuln: any) => {
      const severity = vuln.severity.toLowerCase();
      if (severityCounts[severity as keyof typeof severityCounts] !== undefined) {
        severityCounts[severity as keyof typeof severityCounts]++;
      }
    });
    
    // Format vulnerabilities for display
    const vulnerabilitiesHtml = staticAnalysis.map((vuln: any, index: number) => {
      const severityClass = vuln.severity.toLowerCase();
      return `
        <div class="vulnerability-card" data-id="${index}">
          <div class="vulnerability-header">
            <div class="vulnerability-severity ${severityClass}">${vuln.severity}</div>
            <div class="vulnerability-title">${vuln.title}</div>
          </div>
          <div class="vulnerability-details">
            <div class="vulnerability-description">${vuln.description}</div>
            <div class="vulnerability-location">
              <strong>Location:</strong> ${vuln.location || 'Not specified'}
            </div>
            <div class="vulnerability-actions">
              <button class="fix-btn" data-id="${index}">Generate Fix</button>
              <button class="ignore-btn" data-id="${index}">Ignore</button>
            </div>
            <div class="fix-container" id="fix-container-${index}" style="display: none;">
              <h4>Suggested Fix:</h4>
              <pre class="fix-code" id="fix-code-${index}"></pre>
              <button class="apply-fix-btn" data-id="${index}">Apply Fix</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>HiveMind Audit Dashboard</title>
      <style>
        body {
          padding: 0;
          margin: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        
        .container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .header {
          margin-bottom: 20px;
        }
        
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        
        .summary {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .summary-card {
          flex: 1;
          padding: 16px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .summary-card.critical {
          background-color: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
        }
        
        .summary-card.high {
          background-color: rgba(255, 165, 0, 0.1);
          border: 1px solid rgba(255, 165, 0, 0.3);
        }
        
        .summary-card.medium {
          background-color: rgba(255, 255, 0, 0.1);
          border: 1px solid rgba(255, 255, 0, 0.3);
        }
        
        .summary-card.low {
          background-color: rgba(0, 0, 255, 0.1);
          border: 1px solid rgba(0, 0, 255, 0.3);
        }
        
        .summary-card.info {
          background-color: rgba(128, 128, 128, 0.1);
          border: 1px solid rgba(128, 128, 128, 0.3);
        }
        
        .summary-count {
          font-size: 24px;
          font-weight: bold;
        }
        
        .summary-label {
          font-size: 14px;
          text-transform: uppercase;
        }
        
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--vscode-panel-border);
          margin-bottom: 20px;
        }
        
        .tab {
          padding: 8px 16px;
          cursor: pointer;
          border: none;
          background: none;
          color: var(--vscode-foreground);
          font-size: 14px;
          outline: none;
        }
        
        .tab.active {
          border-bottom: 2px solid var(--vscode-focusBorder);
          font-weight: bold;
        }
        
        .tab-content {
          display: none;
          flex: 1;
          overflow: auto;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .vulnerability-card {
          margin-bottom: 16px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .vulnerability-header {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          background-color: var(--vscode-panel-background);
          cursor: pointer;
        }
        
        .vulnerability-severity {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          margin-right: 12px;
          text-transform: uppercase;
        }
        
        .vulnerability-severity.critical {
          background-color: rgba(255, 0, 0, 0.2);
          color: #ff0000;
        }
        
        .vulnerability-severity.high {
          background-color: rgba(255, 165, 0, 0.2);
          color: #ff8c00;
        }
        
        .vulnerability-severity.medium {
          background-color: rgba(255, 255, 0, 0.2);
          color: #cccc00;
        }
        
        .vulnerability-severity.low {
          background-color: rgba(0, 0, 255, 0.2);
          color: #0000ff;
        }
        
        .vulnerability-severity.info {
          background-color: rgba(128, 128, 128, 0.2);
          color: #808080;
        }
        
        .vulnerability-title {
          font-weight: bold;
        }
        
        .vulnerability-details {
          padding: 16px;
          border-top: 1px solid var(--vscode-panel-border);
        }
        
        .vulnerability-description {
          margin-bottom: 12px;
        }
        
        .vulnerability-location {
          margin-bottom: 12px;
          font-size: 14px;
        }
        
        .vulnerability-actions {
          display: flex;
          gap: 8px;
        }
        
        button {
          padding: 6px 12px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 2px;
          cursor: pointer;
        }
        
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .fix-container {
          margin-top: 16px;
          padding: 12px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
        }
        
        .fix-code {
          margin: 0;
          padding: 12px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          white-space: pre-wrap;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
          overflow: auto;
          max-height: 300px;
        }
        
        .ai-analysis {
          white-space: pre-wrap;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
          padding: 16px;
          background-color: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: auto;
        }
        
        .error-message {
          color: var(--vscode-errorForeground);
          margin-top: 8px;
        }
        
        .ignored {
          opacity: 0.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Smart Contract Security Audit</h1>
        </div>
        
        <div class="summary">
          <div class="summary-card critical">
            <div class="summary-count">${severityCounts.critical}</div>
            <div class="summary-label">Critical</div>
          </div>
          <div class="summary-card high">
            <div class="summary-count">${severityCounts.high}</div>
            <div class="summary-label">High</div>
          </div>
          <div class="summary-card medium">
            <div class="summary-count">${severityCounts.medium}</div>
            <div class="summary-label">Medium</div>
          </div>
          <div class="summary-card low">
            <div class="summary-count">${severityCounts.low}</div>
            <div class="summary-label">Low</div>
          </div>
          <div class="summary-card info">
            <div class="summary-count">${severityCounts.info}</div>
            <div class="summary-label">Info</div>
          </div>
        </div>
        
        <div class="tabs">
          <button class="tab active" data-tab="vulnerabilities">Vulnerabilities</button>
          <button class="tab" data-tab="aiAnalysis">AI Analysis</button>
        </div>
        
        <div id="vulnerabilitiesTab" class="tab-content active">
          ${vulnerabilitiesHtml || '<p>No vulnerabilities found.</p>'}
        </div>
        
        <div id="aiAnalysisTab" class="tab-content">
          <div class="ai-analysis">${aiAnalysis || 'No AI analysis available.'}</div>
        </div>
      </div>
      
      <script nonce="${nonce}">
        (function() {
          const vscode = acquireVsCodeApi();
          
          // DOM Elements
          const tabs = document.querySelectorAll('.tab');
          const tabContents = document.querySelectorAll('.tab-content');
          const vulnerabilityHeaders = document.querySelectorAll('.vulnerability-header');
          const fixButtons = document.querySelectorAll('.fix-btn');
          const ignoreButtons = document.querySelectorAll('.ignore-btn');
          const applyFixButtons = document.querySelectorAll('.apply-fix-btn');
          
          // Tab switching
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              tabs.forEach(t => t.classList.remove('active'));
              tabContents.forEach(c => c.classList.remove('active'));
              
              tab.classList.add('active');
              document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
            });
          });
          
          // Vulnerability card expansion
          vulnerabilityHeaders.forEach(header => {
            header.addEventListener('click', () => {
              const details = header.nextElementSibling;
              details.style.display = details.style.display === 'none' ? 'block' : 'none';
            });
          });
          
          // Fix button
          fixButtons.forEach(button => {
            button.addEventListener('click', () => {
              const id = button.dataset.id;
              const vulnerability = ${JSON.stringify(staticAnalysis)}[id];
              
              button.disabled = true;
              button.textContent = 'Generating...';
              
              vscode.postMessage({
                command: 'fixVulnerability',
                vulnerability: {
                  id,
                  ...vulnerability
                }
              });
            });
          });
          
          // Ignore button
          ignoreButtons.forEach(button => {
            button.addEventListener('click', () => {
              const id = button.dataset.id;
              
              vscode.postMessage({
                command: 'ignoreVulnerability',
                vulnerabilityId: id
              });
            });
          });
          
          // Apply fix button
          applyFixButtons.forEach(button => {
            button.addEventListener('click', () => {
              const id = button.dataset.id;
              const fixCode = document.getElementById('fix-code-' + id).textContent;
              
              button.disabled = true;
              button.textContent = 'Applying...';
              
              vscode.postMessage({
                command: 'applyFix',
                fix: fixCode,
                vulnerabilityId: id
              });
            });
          });
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'fixGenerated':
                const fixContainer = document.getElementById('fix-container-' + message.vulnerabilityId);
                const fixCode = document.getElementById('fix-code-' + message.vulnerabilityId);
                const fixBtn = document.querySelector('.fix-btn[data-id="' + message.vulnerabilityId + '"]');
                
                fixCode.textContent = message.fix;
                fixContainer.style.display = 'block';
                fixBtn.disabled = false;
                fixBtn.textContent = 'Generate Fix';
                break;
                
              case 'fixApplied':
                const applyFixBtn = document.querySelector('.apply-fix-btn[data-id="' + message.vulnerabilityId + '"]');
                applyFixBtn.disabled = false;
                applyFixBtn.textContent = 'Fix Applied';
                break;
                
              case 'vulnerabilityIgnored':
                const card = document.querySelector('.vulnerability-card[data-id="' + message.vulnerabilityId + '"]');
                card.classList.add('ignored');
                break;
                
              case 'error':
                showError(message.message);
                // Reset buttons
                document.querySelectorAll('.fix-btn').forEach(btn => {
                  btn.disabled = false;
                  btn.textContent = 'Generate Fix';
                });
                document.querySelectorAll('.apply-fix-btn').forEach(btn => {
                  btn.disabled = false;
                  btn.textContent = 'Apply Fix';
                });
                break;
            }
          });
          
          // Helper functions
          function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            
            // Remove any existing error messages
            document.querySelectorAll('.error-message').forEach(el => el.remove());
            
            // Add the new error message
            document.querySelector('.container').appendChild(errorDiv);
            
            // Remove after 5 seconds
            setTimeout(() => {
              errorDiv.remove();
            }, 5000);
          }
        })();
      </script>
    </body>
    </html>`;
  }
}
