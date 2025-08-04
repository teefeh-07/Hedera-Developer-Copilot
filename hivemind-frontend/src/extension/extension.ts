import * as vscode from 'vscode';
import { AgentHubPanel } from '../components/agentHubPanel';
import { AuditDashboardPanel } from '../components/auditDashboardPanel';
import { AgentExplorerProvider } from '../components/agentExplorerProvider';
import { AuditDashboardProvider } from '../components/auditDashboardProvider';
import { TransactionCenterProvider } from '../components/transactionCenterProvider';
import { ApiService } from '../services/apiService';
import { HederaService } from '../services/hederaService';
import { NetworkStatusBar } from '../components/networkStatusBar';
import { AgentStatusBar } from '../components/agentStatusBar';
import { SolidityAuditProvider } from '../services/solidityAuditProvider';

let apiService: ApiService;
let hederaService: HederaService;
let networkStatusBar: NetworkStatusBar;
let agentStatusBar: AgentStatusBar;

export async function activate(context: vscode.ExtensionContext) {
  console.log('HiveMind Copilot extension is now active');

  // Initialize services
  apiService = new ApiService(); // Will use default configuration
  hederaService = new HederaService(context);
  
  // Initialize status bars
  networkStatusBar = new NetworkStatusBar(context);
  agentStatusBar = new AgentStatusBar(context);
  
  // Register tree data providers
  const agentExplorerProvider = new AgentExplorerProvider(hederaService);
  vscode.window.registerTreeDataProvider('hivemindAgentExplorer', agentExplorerProvider);
  
  const auditDashboardProvider = new AuditDashboardProvider(apiService);
  vscode.window.registerTreeDataProvider('hivemindAuditDashboard', auditDashboardProvider);
  
  const transactionCenterProvider = new TransactionCenterProvider(hederaService);
  vscode.window.registerTreeDataProvider('hivemindTransactionCenter', transactionCenterProvider);
  
  // Register Solidity audit provider
  const solidityAuditProvider = new SolidityAuditProvider(apiService);
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('hivemind.showAgentHub', () => {
      AgentHubPanel.createOrShow(context.extensionUri, apiService, hederaService);
    }),
    
    vscode.commands.registerCommand('hivemind.auditContract', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'solidity') {
        const code = editor.document.getText();
        const fileName = editor.document.fileName;
        
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Auditing smart contract...",
          cancellable: true
        }, async (progress, token) => {
          try {
            const result = await apiService.auditContract(code);
            
            // Show audit results in dashboard
            vscode.commands.executeCommand('hivemind.showAuditDashboard', result);
            
            // Add diagnostics to the editor
            solidityAuditProvider.updateDiagnostics(editor.document, result);
            
            return result;
          } catch (error) {
            vscode.window.showErrorMessage(`Audit failed: ${error}`);
            return null;
          }
        });
      } else {
        vscode.window.showInformationMessage('Please open a Solidity file to audit.');
      }
    }),
    
    vscode.commands.registerCommand('hivemind.generateTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'solidity') {
        const code = editor.document.getText();
        
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Generating tests...",
          cancellable: true
        }, async (progress, token) => {
          try {
            const result = await apiService.generateTests(code);
            
            // Create a new file with the generated tests
            const testFilePath = editor.document.uri.fsPath.replace('.sol', '.test.js');
            const testFileUri = vscode.Uri.file(testFilePath);
            
            const edit = new vscode.WorkspaceEdit();
            edit.createFile(testFileUri, { overwrite: true });
            await vscode.workspace.applyEdit(edit);
            
            const testDoc = await vscode.workspace.openTextDocument(testFileUri);
            const testEditor = await vscode.window.showTextDocument(testDoc);
            
            const editTest = new vscode.WorkspaceEdit();
            editTest.insert(testFileUri, new vscode.Position(0, 0), result.tests);
            await vscode.workspace.applyEdit(editTest);
            
            return result;
          } catch (error) {
            vscode.window.showErrorMessage(`Test generation failed: ${error}`);
            return null;
          }
        });
      } else {
        vscode.window.showInformationMessage('Please open a Solidity file to generate tests.');
      }
    }),
    
    vscode.commands.registerCommand('hivemind.deployContract', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'solidity') {
        const code = editor.document.getText();
        
        // Check if connected to Hedera
        if (!hederaService.isConnected()) {
          const connect = await vscode.window.showInformationMessage(
            'You need to connect to Hedera to deploy contracts.',
            'Connect',
            'Cancel'
          );
          
          if (connect === 'Connect') {
            vscode.commands.executeCommand('hivemind.connectHedera');
            return;
          } else {
            return;
          }
        }
        
        // Ask for network confirmation
        const network = hederaService.getCurrentNetwork();
        const confirm = await vscode.window.showWarningMessage(
          `Deploy to ${network}?`,
          { modal: true },
          'Deploy',
          'Cancel'
        );
        
        if (confirm !== 'Deploy') {
          return;
        }
        
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Deploying to ${network}...`,
          cancellable: true
        }, async (progress, token) => {
          try {
            const result = await apiService.deployContract(code);
            
            vscode.window.showInformationMessage(
              `Contract deployed successfully!\nAddress: ${result.contract_address}\nTransaction: ${result.transaction_hash}`
            );
            
            // Update transaction center
            vscode.commands.executeCommand('hivemindTransactionCenter.refresh');
            
            return result;
          } catch (error) {
            vscode.window.showErrorMessage(`Deployment failed: ${error}`);
            return null;
          }
        });
      } else {
        vscode.window.showInformationMessage('Please open a Solidity file to deploy.');
      }
    }),
    
    vscode.commands.registerCommand('hivemind.showAuditDashboard', (auditResult) => {
      AuditDashboardPanel.createOrShow(context.extensionUri, apiService, auditResult);
    }),
    
    vscode.commands.registerCommand('hivemind.connectHedera', async () => {
      const network = await vscode.window.showQuickPick(
        ['testnet', 'mainnet'],
        { placeHolder: 'Select Hedera network' }
      );
      
      if (!network) {
        return;
      }
      
      // Check for credentials
      const config = vscode.workspace.getConfiguration('hivemind');
      let accountId = config.get<string>('hederaAccountId');
      let privateKey = config.get<string>('hederaPrivateKey');
      
      if (!accountId || !privateKey) {
        // Prompt for credentials
        accountId = await vscode.window.showInputBox({
          prompt: 'Enter your Hedera account ID',
          placeHolder: '0.0.12345'
        });
        
        if (!accountId) {
          return;
        }
        
        privateKey = await vscode.window.showInputBox({
          prompt: 'Enter your Hedera private key',
          password: true
        });
        
        if (!privateKey) {
          return;
        }
        
        // Save to configuration
        await config.update('hederaAccountId', accountId, true);
        await config.update('hederaPrivateKey', privateKey, true);
      }
      
      // Connect to network
      try {
        await hederaService.connect(
          network as string || 'testnet',
          accountId || '',
          privateKey || ''
        );
        vscode.window.showInformationMessage(`Connected to Hedera ${network}`);
        
        // Refresh views
        vscode.commands.executeCommand('hivemindAgentExplorer.refresh');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to connect: ${error}`);
      }
    })
  );
  
  // Register document listeners for Solidity audit on save
  if (vscode.workspace.getConfiguration('hivemind').get('solidityAuditOnSave')) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        if (document.languageId === 'solidity') {
          vscode.commands.executeCommand('hivemind.auditContract');
        }
      })
    );
  }
}

export function deactivate() {
  // Clean up resources
  if (hederaService) {
    hederaService.disconnect();
  }
}
