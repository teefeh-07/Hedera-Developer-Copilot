import * as vscode from 'vscode';
import { AgentExplorerProvider } from './components/agentExplorerProvider';
import { AuditDashboardProvider } from './components/auditDashboardProvider';
import { TransactionCenterProvider } from './components/transactionCenterProvider';
import { ChatViewProvider } from './components/chatViewProvider';
import { NetworkStatusBar } from './components/networkStatusBar';
import { AgentStatusBar } from './components/agentStatusBar';
import { SolidityAuditProvider } from './services/solidityAuditProvider';
import { ApiService } from './services/apiService';
import { MockApiService } from './services/mockApiService';
import { HederaService } from './services/hederaService';
import { ConfigUtils } from './utils/configUtils';
import { DeploymentUtils } from './utils/deploymentUtils';
import { SolidityUtils } from './utils/solidityUtils';
import { getWebviewContent } from './utils/webviewUtils';

// Extension activation context
let apiService: ApiService;
let hederaService: HederaService;
let solidityAuditProvider: SolidityAuditProvider;
let networkStatusBar: NetworkStatusBar;
let agentStatusBar: AgentStatusBar;
let agentHubPanel: vscode.WebviewPanel | undefined;
let auditDashboardPanel: vscode.WebviewPanel | undefined;

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Activating HiveMind Copilot extension');

  // Initialize services
  // Use mock API service for testing if in development mode
  const isDevMode = process.env.VSCODE_DEBUG_MODE === 'true';
  apiService = isDevMode ? new MockApiService() : new ApiService(ConfigUtils.getApiBaseUrl());
  hederaService = new HederaService(context);

  // Initialize providers
  const agentExplorerProvider = new AgentExplorerProvider(hederaService);
  const auditDashboardProvider = new AuditDashboardProvider(apiService);
  const transactionCenterProvider = new TransactionCenterProvider(hederaService);
  const chatViewProvider = new ChatViewProvider(context.extensionUri, apiService);
  solidityAuditProvider = new SolidityAuditProvider(apiService);

  // Register tree data providers
  vscode.window.registerTreeDataProvider('hivemindAgentExplorer', agentExplorerProvider);
  vscode.window.registerTreeDataProvider('hivemindAuditDashboard', auditDashboardProvider);
  vscode.window.registerTreeDataProvider('hivemindTransactionCenter', transactionCenterProvider);
  
  // Register webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider)
  );

  // Create status bars
  networkStatusBar = new NetworkStatusBar(context);
  agentStatusBar = new AgentStatusBar(context);

  // Register diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('hivemind-solidity');
  context.subscriptions.push(diagnosticCollection);
  // Set up diagnostic collection for audit provider
  // solidityAuditProvider.setDiagnosticCollection(diagnosticCollection);

  // Register commands
  registerCommands(context);

  // Initialize status bars
  // networkStatusBar.update();
  // agentStatusBar.update();

  console.log('HiveMind Copilot extension activated');
}

/**
 * Register all commands
 */
function registerCommands(context: vscode.ExtensionContext) {
  // Agent Hub commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.showAgentHub', () => {
      showAgentHub(context.extensionUri);
    }),
    vscode.commands.registerCommand('hivemind.auditContract', () => {
      auditSolidityContract(context, apiService, solidityAuditProvider);
    }),
    vscode.commands.registerCommand('hivemind.generateTests', () => {
      generateContractTests(context, apiService);
    }),
    vscode.commands.registerCommand('hivemind.deployContract', () => {
      deployContract(context, apiService, hederaService);
    }),
    vscode.commands.registerCommand('hivemind.showAuditDashboard', () => {
      showAuditDashboard(context.extensionUri);
    }),
    vscode.commands.registerCommand('hivemind.showChat', () => {
      // Focus on the chat view
      vscode.commands.executeCommand('workbench.view.extension.hivemind-sidebar');
      vscode.commands.executeCommand('hivemindChat.focus');
    }),
    vscode.commands.registerCommand('hivemind.testChat', () => {
      // Run manual chat interface test
      try {
        const { testChat } = require('./test/manualChatTest');
        testChat();
        vscode.window.showInformationMessage('Manual chat test started. Check the console for instructions.');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Chat test failed: ${errorMessage}`);
        console.error('Chat test error:', err);
      }
    })
  );

  // Test generation commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.generateTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'solidity') {
        const filePath = editor.document.uri.fsPath;
        await generateTests(filePath);
      } else {
        vscode.window.showErrorMessage('Please open a Solidity file to generate tests');
      }
    })
  );

  // Deployment commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.deployContract', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'solidity') {
        const filePath = editor.document.uri.fsPath;
        await DeploymentUtils.deployContract(filePath, apiService, hederaService);
      } else {
        vscode.window.showErrorMessage('Please open a Solidity file to deploy');
      }
    })
  );

  // Hedera connection commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.connectHedera', async () => {
      try {
        await hederaService.connect(
          ConfigUtils.getHederaNetwork(),
          ConfigUtils.getHederaAccountId(),
          ConfigUtils.getHederaPrivateKey()
        );
        // networkStatusBar.update();
        vscode.window.showInformationMessage('Connected to Hedera network');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to connect to Hedera: ${error}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.disconnectHedera', () => {
      hederaService.disconnect();
      // networkStatusBar.update();
      vscode.window.showInformationMessage('Disconnected from Hedera network');
    })
  );

  // Configuration commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.configureSettings', async () => {
      await ConfigUtils.showConfigurationUI();
      
      // Update services with new configuration
      apiService.setBaseUrl(ConfigUtils.getApiBaseUrl());
      hederaService.updateConfig(
        ConfigUtils.getHederaAccountId(),
        ConfigUtils.getHederaPrivateKey(),
        ConfigUtils.getHederaNetwork(),
        ConfigUtils.getHederaTopicId(),
        ConfigUtils.getRpcUrl()
      );
      
      // Update UI
      // networkStatusBar.update();
    })
  );

  // Tree view refresh commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemindAgentExplorer.refresh', () => {
      vscode.commands.executeCommand('hivemindAgentExplorer.refreshEntry');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hivemindAuditDashboard.refresh', () => {
      vscode.commands.executeCommand('hivemindAuditDashboard.refreshEntry');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('hivemindTransactionCenter.refresh', () => {
      vscode.commands.executeCommand('hivemindTransactionCenter.refreshEntry');
    })
  );
}

/**
 * Show Agent Hub webview panel
 */
function showAgentHub(extensionUri: vscode.Uri) {
  if (agentHubPanel) {
    agentHubPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  agentHubPanel = vscode.window.createWebviewPanel(
    'hivemindAgentHub',
    'HiveMind Agent Hub',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'dist'),
        vscode.Uri.joinPath(extensionUri, 'media')
      ]
    }
  );

  agentHubPanel.webview.html = getWebviewContent(
    agentHubPanel.webview,
    extensionUri,
    'Agent Hub',
    'agentHub'
  );

  // Handle messages from the webview
  agentHubPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'generateCode':
          generateCode(message.prompt, message.language);
          break;
        case 'analyzeCode':
          analyzeCode(message.code, message.language);
          break;
        case 'useAgent':
          useAgent(message.agentId, message.prompt);
          break;
        case 'connectHedera':
          vscode.commands.executeCommand('hivemind.connectHedera');
          break;
        case 'getAgents':
          const agents = await hederaService.getAgents();
          agentHubPanel?.webview.postMessage({ command: 'agentsLoaded', agents });
          break;
      }
    },
    undefined,
    []
  );

  agentHubPanel.onDidDispose(
    () => {
      agentHubPanel = undefined;
    },
    null,
    []
  );
}

/**
 * Show Audit Dashboard webview panel
 */
function showAuditDashboard(extensionUri: vscode.Uri) {
  if (auditDashboardPanel) {
    auditDashboardPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  auditDashboardPanel = vscode.window.createWebviewPanel(
    'hivemindAuditDashboard',
    'HiveMind Audit Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'dist'),
        vscode.Uri.joinPath(extensionUri, 'media')
      ]
    }
  );

  auditDashboardPanel.webview.html = getWebviewContent(
    auditDashboardPanel.webview,
    extensionUri,
    'Audit Dashboard',
    'auditDashboard'
  );

  // Handle messages from the webview
  auditDashboardPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'getVulnerabilities':
          const vulnerabilities = await solidityAuditProvider.getVulnerabilities();
          auditDashboardPanel?.webview.postMessage({ 
            command: 'vulnerabilitiesLoaded', 
            vulnerabilities 
          });
          break;
        case 'fixVulnerability':
          fixVulnerability(message.vulnerabilityId, message.fix);
          break;
        case 'showVulnerability':
          showVulnerability(message.vulnerabilityId);
          break;
        case 'exportReport':
          exportReport(message.format);
          break;
      }
    },
    undefined,
    []
  );

  auditDashboardPanel.onDidDispose(
    () => {
      auditDashboardPanel = undefined;
    },
    null,
    []
  );
}

/**
 * Generate code using AI agent
 */
async function generateCode(prompt: string, language: string) {
  try {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating code...',
      cancellable: false
    }, async (progress) => {
      const result = await apiService.generateCode(prompt, language);
      
      if (result.success) {
        const document = await vscode.workspace.openTextDocument({
          language,
          content: result.code
        });
        await vscode.window.showTextDocument(document);
      } else {
        vscode.window.showErrorMessage(`Failed to generate code: ${result.error}`);
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating code: ${error}`);
  }
}

/**
 * Analyze code using AI agent
 */
async function analyzeCode(code: string, language: string) {
  try {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Analyzing code...',
      cancellable: false
    }, async (progress) => {
      const result = await apiService.analyzeCode(code, language);
      
      if (result.success) {
        if (agentHubPanel) {
          agentHubPanel.webview.postMessage({ 
            command: 'analysisComplete', 
            analysis: result.analysis 
          });
        }
      } else {
        vscode.window.showErrorMessage(`Failed to analyze code: ${result.error}`);
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error analyzing code: ${error}`);
  }
}

/**
 * Use a specific agent for a task
 */
async function useAgent(agentId: string, prompt: string) {
  try {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Using agent...',
      cancellable: false
    }, async (progress) => {
      const result = await hederaService.useAgent(agentId, prompt);
      
      if (result.success) {
        if (agentHubPanel) {
          agentHubPanel.webview.postMessage({ 
            command: 'agentResponse', 
            response: result.response 
          });
        }
      } else {
        vscode.window.showErrorMessage(`Failed to use agent: ${result.error}`);
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error using agent: ${error}`);
  }
}

/**
 * Generate tests for a Solidity contract
 */
async function generateTests(filePath: string) {
  try {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Generating tests...',
      cancellable: false
    }, async (progress) => {
      // Read file content
      const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
      const code = Buffer.from(fileContent).toString('utf8');
      
      // Extract contract name
      const contractName = SolidityUtils.extractContractName(filePath);
      
      // Generate tests
      const result = await apiService.generateTests(code);
      
      if (result.success) {
        // Create test file
        const testFilePath = filePath.replace('.sol', '.test.js');
        const testFileUri = vscode.Uri.file(testFilePath);
        
        await vscode.workspace.fs.writeFile(
          testFileUri,
          Buffer.from(result.tests, 'utf8')
        );
        
        // Open test file
        const document = await vscode.workspace.openTextDocument(testFileUri);
        await vscode.window.showTextDocument(document);
        
        vscode.window.showInformationMessage('Tests generated successfully');
      } else {
        vscode.window.showErrorMessage(`Failed to generate tests: ${result.error}`);
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating tests: ${error}`);
  }
}

/**
 * Fix a vulnerability in the code
 */
async function fixVulnerability(vulnerabilityId: string, fix: string) {
  try {
    const vulnerability = await solidityAuditProvider.getVulnerabilityById(vulnerabilityId);
    
    if (!vulnerability) {
      vscode.window.showErrorMessage(`Vulnerability not found: ${vulnerabilityId}`);
      return;
    }
    
    // Open the file
    const document = await vscode.workspace.openTextDocument(vulnerability.file);
    const editor = await vscode.window.showTextDocument(document);
    
    // Create edit
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(
      new vscode.Position(vulnerability.line - 1, vulnerability.column),
      new vscode.Position(vulnerability.line - 1 + vulnerability.lineCount, 0)
    );
    
    edit.replace(document.uri, range, fix);
    
    // Apply edit
    await vscode.workspace.applyEdit(edit);
    
    // Update audit results
    await solidityAuditProvider.auditContract(vulnerability.file);
    vscode.commands.executeCommand('hivemindAuditDashboard.refresh');
    
    vscode.window.showInformationMessage(`Vulnerability fixed: ${vulnerability.title}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Error fixing vulnerability: ${error}`);
  }
}

/**
 * Show a vulnerability in the editor
 */
async function showVulnerability(vulnerabilityId: string) {
  try {
    const vulnerability = await solidityAuditProvider.getVulnerabilityById(vulnerabilityId);
    
    if (!vulnerability) {
      vscode.window.showErrorMessage(`Vulnerability not found: ${vulnerabilityId}`);
      return;
    }
    
    // Open the file
    const document = await vscode.workspace.openTextDocument(vulnerability.file);
    const editor = await vscode.window.showTextDocument(document);
    
    // Select the range
    const range = new vscode.Range(
      new vscode.Position(vulnerability.line - 1, vulnerability.column),
      new vscode.Position(vulnerability.line - 1 + vulnerability.lineCount, 0)
    );
    
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } catch (error) {
    vscode.window.showErrorMessage(`Error showing vulnerability: ${error}`);
  }
}

/**
 * Export audit report
 */
async function exportReport(format: string) {
  try {
    const vulnerabilities = await solidityAuditProvider.getVulnerabilities();
    
    if (!vulnerabilities || vulnerabilities.length === 0) {
      vscode.window.showInformationMessage('No vulnerabilities to export');
      return;
    }
    
    // Generate report content
    let content = '';
    
    if (format === 'markdown') {
      content = generateMarkdownReport(vulnerabilities);
    } else if (format === 'html') {
      content = generateHtmlReport(vulnerabilities);
    } else if (format === 'json') {
      content = JSON.stringify(vulnerabilities, null, 2);
    } else {
      vscode.window.showErrorMessage(`Unsupported report format: ${format}`);
      return;
    }
    
    // Save report
    const filters = { [format]: [`.${format}`] };
    const uri = await vscode.window.showSaveDialog({ filters });
    
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error exporting report: ${error}`);
  }
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(vulnerabilities: any[]): string {
  let report = '# Smart Contract Audit Report\n\n';
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  report += `Total vulnerabilities: ${vulnerabilities.length}\n\n`;
  
  // Group by severity
  const severities = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
  
  for (const severity of severities) {
    const vulns = vulnerabilities.filter(v => v.severity === severity);
    
    if (vulns.length > 0) {
      report += `## ${severity} Severity (${vulns.length})\n\n`;
      
      for (const vuln of vulns) {
        report += `### ${vuln.title}\n\n`;
        report += `**File:** ${vuln.file}\n\n`;
        report += `**Line:** ${vuln.line}\n\n`;
        report += `**Description:** ${vuln.description}\n\n`;
        report += `**Recommendation:** ${vuln.recommendation}\n\n`;
        report += '```solidity\n';
        report += vuln.code;
        report += '\n```\n\n';
      }
    }
  }
  
  return report;
}

/**
 * Generate HTML report
 */
function generateHtmlReport(vulnerabilities: any[]): string {
  let report = `<!DOCTYPE html>
<html>
<head>
  <title>Smart Contract Audit Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #777; }
    .critical { color: #d00; }
    .high { color: #f50; }
    .medium { color: #f90; }
    .low { color: #66c; }
    .info { color: #0a0; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    .vuln { border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Smart Contract Audit Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <p>Total vulnerabilities: ${vulnerabilities.length}</p>`;
  
  // Group by severity
  const severities = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
  
  for (const severity of severities) {
    const vulns = vulnerabilities.filter(v => v.severity === severity);
    
    if (vulns.length > 0) {
      const severityClass = severity.toLowerCase();
      report += `<h2 class="${severityClass}">${severity} Severity (${vulns.length})</h2>`;
      
      for (const vuln of vulns) {
        report += `<div class="vuln">
          <h3>${vuln.title}</h3>
          <p><strong>File:</strong> ${vuln.file}</p>
          <p><strong>Line:</strong> ${vuln.line}</p>
          <p><strong>Description:</strong> ${vuln.description}</p>
          <p><strong>Recommendation:</strong> ${vuln.recommendation}</p>
          <pre><code>${vuln.code}</code></pre>
        </div>`;
      }
    }
  }
  
  report += `</body></html>`;
  return report;
}

/**
 * Audit a Solidity contract
 */
async function auditSolidityContract(context: vscode.ExtensionContext, apiService: any, solidityAuditProvider: any) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'solidity') {
    vscode.window.showErrorMessage('Please open a Solidity file to audit');
    return;
  }

  try {
    const code = editor.document.getText();
    await solidityAuditProvider.auditContract(code);
    vscode.window.showInformationMessage('Contract audit completed');
  } catch (error) {
    vscode.window.showErrorMessage(`Audit failed: ${error}`);
  }
}

/**
 * Generate tests for a contract
 */
async function generateContractTests(context: vscode.ExtensionContext, apiService: any) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'solidity') {
    vscode.window.showErrorMessage('Please open a Solidity file to generate tests');
    return;
  }

  try {
    const code = editor.document.getText();
    const result = await apiService.generateTests(code);
    
    // Create new document with tests
    const testDocument = await vscode.workspace.openTextDocument({
      language: 'javascript',
      content: result.tests || '// Tests generated'
    });
    
    await vscode.window.showTextDocument(testDocument);
    vscode.window.showInformationMessage('Tests generated successfully');
  } catch (error) {
    vscode.window.showErrorMessage(`Test generation failed: ${error}`);
  }
}

/**
 * Deploy a contract
 */
async function deployContract(context: vscode.ExtensionContext, apiService: any, hederaService: any) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'solidity') {
    vscode.window.showErrorMessage('Please open a Solidity file to deploy');
    return;
  }

  try {
    const code = editor.document.getText();
    const result = await apiService.deployContract(code);
    
    if (result.contractId) {
      vscode.window.showInformationMessage(`Contract deployed: ${result.contractId}`);
    } else {
      vscode.window.showErrorMessage('Deployment failed');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Deployment failed: ${error}`);
  }
}

/**
 * Deactivate the extension
 */
export function deactivate() {
  // Clean up resources
  if (networkStatusBar) {
    networkStatusBar.dispose();
  }
  
  if (agentStatusBar) {
    agentStatusBar.dispose();
  }
  
  if (hederaService) {
    hederaService.disconnect();
  }
  
  console.log('HiveMind Copilot extension deactivated');
}
