import * as vscode from 'vscode';
import { ApiService } from '../services/apiService';
import { HederaService } from '../services/hederaService';
import { getNonce } from '../utils/security';

/**
 * Agent Hub Panel for interacting with AI agents
 */
export class AgentHubPanel {
  public static currentPanel: AgentHubPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private apiService: ApiService,
    private hederaService: HederaService
  ) {
    this._panel = panel;

    // Set the webview's initial html content
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'generateCode':
            try {
              const result = await this.apiService.generateCode(
                message.prompt,
                message.language
              );
              this._panel.webview.postMessage({
                command: 'generatedCode',
                code: result.code
              });
            } catch (error) {
              this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to generate code: ${error}`
              });
            }
            break;

          case 'analyzeCode':
            try {
              const result = await this.apiService.analyzeCode(
                message.code,
                message.language
              );
              this._panel.webview.postMessage({
                command: 'analysisResult',
                analysis: result.analysis
              });
            } catch (error) {
              this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to analyze code: ${error}`
              });
            }
            break;

          case 'deployContract':
            try {
              const result = await this.apiService.deployContract(
                message.code,
                message.constructorParams
              );
              this._panel.webview.postMessage({
                command: 'deploymentResult',
                result
              });
            } catch (error) {
              this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to deploy contract: ${error}`
              });
            }
            break;

          case 'getAgents':
            try {
              if (!this.hederaService.isConnected()) {
                this._panel.webview.postMessage({
                  command: 'error',
                  message: 'Not connected to Hedera network'
                });
                return;
              }

              const agents = await this.hederaService.getAgents();
              this._panel.webview.postMessage({
                command: 'agentList',
                agents
              });
            } catch (error) {
              this._panel.webview.postMessage({
                command: 'error',
                message: `Failed to get agents: ${error}`
              });
            }
            break;

          case 'connectHedera':
            vscode.commands.executeCommand('hivemind.connectHedera');
            break;

          case 'getConnectionStatus':
            this._panel.webview.postMessage({
              command: 'connectionStatus',
              connected: this.hederaService.isConnected(),
              network: this.hederaService.getCurrentNetwork(),
              accountId: this.hederaService.getAccountId()
            });
            break;
        }
      },
      null,
      this._disposables
    );
  }

  /**
   * Create or show Agent Hub Panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    apiService: ApiService,
    hederaService: HederaService
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (AgentHubPanel.currentPanel) {
      AgentHubPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'hivemindAgentHub',
      'HiveMind Agent Hub',
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

    AgentHubPanel.currentPanel = new AgentHubPanel(panel, extensionUri, apiService, hederaService);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    AgentHubPanel.currentPanel = undefined;

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
  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    // Get path to webview bundle
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'webview.js')
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <title>HiveMind Agent Hub</title>
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        
        .connection-status {
          display: flex;
          align-items: center;
          font-size: 12px;
        }
        
        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 5px;
        }
        
        .connected {
          background-color: #3fb950;
        }
        
        .disconnected {
          background-color: #f85149;
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
          display: flex;
          flex-direction: column;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        label {
          display: block;
          margin-bottom: 8px;
        }
        
        input, select, textarea {
          width: 100%;
          padding: 8px;
          box-sizing: border-box;
          background-color: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          border-radius: 2px;
        }
        
        textarea {
          min-height: 200px;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
        }
        
        button {
          padding: 8px 16px;
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 2px;
          cursor: pointer;
        }
        
        button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
        
        .agent-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }
        
        .agent-card {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          padding: 16px;
        }
        
        .agent-card h3 {
          margin-top: 0;
          margin-bottom: 8px;
        }
        
        .agent-capabilities {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .capability-tag {
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 12px;
        }
        
        .agent-fee {
          font-size: 14px;
          margin-bottom: 16px;
        }
        
        .result-container {
          margin-top: 20px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          padding: 16px;
          background-color: var(--vscode-editor-background);
          overflow: auto;
        }
        
        .result-container pre {
          margin: 0;
          white-space: pre-wrap;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
        }
        
        .error-message {
          color: var(--vscode-errorForeground);
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HiveMind Agent Hub</h1>
          <div class="connection-status">
            <div id="statusIndicator" class="status-indicator disconnected"></div>
            <span id="connectionStatus">Disconnected</span>
          </div>
        </div>
        
        <div class="tabs">
          <button class="tab active" data-tab="generate">Generate Code</button>
          <button class="tab" data-tab="analyze">Analyze Code</button>
          <button class="tab" data-tab="agents">Agent Marketplace</button>
        </div>
        
        <div id="generateTab" class="tab-content active">
          <div class="form-group">
            <label for="prompt">Prompt:</label>
            <textarea id="prompt" placeholder="Describe the code you want to generate..."></textarea>
          </div>
          
          <div class="form-group">
            <label for="language">Language:</label>
            <select id="language">
              <option value="solidity">Solidity</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
          
          <button id="generateBtn">Generate Code</button>
          
          <div id="generateResult" class="result-container" style="display: none;">
            <pre id="generatedCode"></pre>
          </div>
        </div>
        
        <div id="analyzeTab" class="tab-content">
          <div class="form-group">
            <label for="codeToAnalyze">Code:</label>
            <textarea id="codeToAnalyze" placeholder="Paste your code here..."></textarea>
          </div>
          
          <div class="form-group">
            <label for="analyzeLanguage">Language:</label>
            <select id="analyzeLanguage">
              <option value="solidity">Solidity</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
          
          <button id="analyzeBtn">Analyze Code</button>
          
          <div id="analyzeResult" class="result-container" style="display: none;">
            <pre id="analysisOutput"></pre>
          </div>
        </div>
        
        <div id="agentsTab" class="tab-content">
          <div id="agentConnectionMessage">
            <p>Connect to Hedera to view available agents.</p>
            <button id="connectHederaBtn">Connect to Hedera</button>
          </div>
          
          <div id="agentListContainer" style="display: none;">
            <h2>Available Agents</h2>
            <div id="agentList" class="agent-list"></div>
          </div>
        </div>
      </div>
      
      <script nonce="${nonce}">
        (function() {
          const vscode = acquireVsCodeApi();
          
          // DOM Elements
          const tabs = document.querySelectorAll('.tab');
          const tabContents = document.querySelectorAll('.tab-content');
          const statusIndicator = document.getElementById('statusIndicator');
          const connectionStatus = document.getElementById('connectionStatus');
          const generateBtn = document.getElementById('generateBtn');
          const analyzeBtn = document.getElementById('analyzeBtn');
          const connectHederaBtn = document.getElementById('connectHederaBtn');
          const agentConnectionMessage = document.getElementById('agentConnectionMessage');
          const agentListContainer = document.getElementById('agentListContainer');
          
          // Tab switching
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              tabs.forEach(t => t.classList.remove('active'));
              tabContents.forEach(c => c.classList.remove('active'));
              
              tab.classList.add('active');
              document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
            });
          });
          
          // Generate code
          generateBtn.addEventListener('click', () => {
            const prompt = document.getElementById('prompt').value;
            const language = document.getElementById('language').value;
            
            if (!prompt) {
              showError('Please enter a prompt');
              return;
            }
            
            vscode.postMessage({
              command: 'generateCode',
              prompt,
              language
            });
            
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
          });
          
          // Analyze code
          analyzeBtn.addEventListener('click', () => {
            const code = document.getElementById('codeToAnalyze').value;
            const language = document.getElementById('analyzeLanguage').value;
            
            if (!code) {
              showError('Please enter code to analyze');
              return;
            }
            
            vscode.postMessage({
              command: 'analyzeCode',
              code,
              language
            });
            
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';
          });
          
          // Connect to Hedera
          connectHederaBtn.addEventListener('click', () => {
            vscode.postMessage({
              command: 'connectHedera'
            });
          });
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'generatedCode':
                document.getElementById('generatedCode').textContent = message.code;
                document.getElementById('generateResult').style.display = 'block';
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Code';
                break;
                
              case 'analysisResult':
                document.getElementById('analysisOutput').textContent = message.analysis;
                document.getElementById('analyzeResult').style.display = 'block';
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze Code';
                break;
                
              case 'connectionStatus':
                updateConnectionStatus(message.connected, message.network, message.accountId);
                break;
                
              case 'agentList':
                renderAgentList(message.agents);
                break;
                
              case 'error':
                showError(message.message);
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Code';
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze Code';
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
          
          function updateConnectionStatus(connected, network, accountId) {
            if (connected) {
              statusIndicator.classList.remove('disconnected');
              statusIndicator.classList.add('connected');
              connectionStatus.textContent = \`Connected to \${network} (\${accountId})\`;
              
              // Show agent list
              agentConnectionMessage.style.display = 'none';
              agentListContainer.style.display = 'block';
              
              // Get agents
              vscode.postMessage({
                command: 'getAgents'
              });
            } else {
              statusIndicator.classList.remove('connected');
              statusIndicator.classList.add('disconnected');
              connectionStatus.textContent = 'Disconnected';
              
              // Show connection message
              agentConnectionMessage.style.display = 'block';
              agentListContainer.style.display = 'none';
            }
          }
          
          function renderAgentList(agents) {
            const agentList = document.getElementById('agentList');
            agentList.innerHTML = '';
            
            agents.forEach(agent => {
              const agentCard = document.createElement('div');
              agentCard.className = 'agent-card';
              
              const name = document.createElement('h3');
              name.textContent = agent.name;
              
              const capabilities = document.createElement('div');
              capabilities.className = 'agent-capabilities';
              
              agent.capabilities.forEach(capability => {
                const tag = document.createElement('span');
                tag.className = 'capability-tag';
                tag.textContent = capability;
                capabilities.appendChild(tag);
              });
              
              const fee = document.createElement('div');
              fee.className = 'agent-fee';
              fee.textContent = \`Fee: \${agent.fee}\`;
              
              const useButton = document.createElement('button');
              useButton.textContent = 'Use Agent';
              useButton.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'useAgent',
                  agentId: agent.id
                });
              });
              
              agentCard.appendChild(name);
              agentCard.appendChild(capabilities);
              agentCard.appendChild(fee);
              agentCard.appendChild(useButton);
              
              agentList.appendChild(agentCard);
            });
          }
          
          // Initialize
          vscode.postMessage({
            command: 'getConnectionStatus'
          });
        })();
      </script>
    </body>
    </html>`;
  }
}
