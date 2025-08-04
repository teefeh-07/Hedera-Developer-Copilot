import * as vscode from 'vscode';
import { ApiService } from '../services/apiService';

/**
 * Tree item representing a vulnerability in the Audit Dashboard
 */
export class VulnerabilityTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly severity: string,
    public readonly location: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
    this.tooltip = description;
    
    // Set context value for when clause in package.json
    this.contextValue = 'vulnerability';
    
    // Set icon based on severity
    switch (severity.toLowerCase()) {
      case 'critical':
        this.iconPath = new vscode.ThemeIcon('error');
        break;
      case 'high':
        this.iconPath = new vscode.ThemeIcon('warning');
        break;
      case 'medium':
        this.iconPath = new vscode.ThemeIcon('info');
        break;
      case 'low':
        this.iconPath = new vscode.ThemeIcon('note');
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('circle-outline');
    }
  }
}

/**
 * Tree item representing a contract in the Audit Dashboard
 */
export class ContractTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly vulnerabilities: any[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
    this.tooltip = filePath;
    this.description = `${vulnerabilities.length} vulnerabilities`;
    
    // Set context value for when clause in package.json
    this.contextValue = 'contract';
    
    // Set icon
    this.iconPath = new vscode.ThemeIcon('file-code');
    
    // Set command to open file when clicked
    this.command = {
      command: 'vscode.open',
      title: 'Open Contract',
      arguments: [vscode.Uri.file(filePath)]
    };
  }
}

/**
 * Tree data provider for the Audit Dashboard view
 */
export class AuditDashboardProvider implements vscode.TreeDataProvider<ContractTreeItem | VulnerabilityTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ContractTreeItem | VulnerabilityTreeItem | undefined | null | void> = new vscode.EventEmitter<ContractTreeItem | VulnerabilityTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ContractTreeItem | VulnerabilityTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private auditResults: Map<string, any> = new Map();

  constructor(private apiService: ApiService) {
    // Register refresh command
    vscode.commands.registerCommand('hivemindAuditDashboard.refresh', () => {
      this.refresh();
    });
    
    // Register show vulnerability command
    vscode.commands.registerCommand('hivemindAuditDashboard.showVulnerability', (filePath: string, location: string) => {
      this.showVulnerability(filePath, location);
    });
    
    // Register fix vulnerability command
    vscode.commands.registerCommand('hivemindAuditDashboard.fixVulnerability', (filePath: string, vulnerability: any) => {
      this.fixVulnerability(filePath, vulnerability);
    });
    
    // Listen for audit results
    vscode.commands.registerCommand('hivemindAuditDashboard.updateResults', (filePath: string, results: any) => {
      this.updateAuditResults(filePath, results);
    });
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Update audit results for a file
   */
  updateAuditResults(filePath: string, results: any): void {
    this.auditResults.set(filePath, results);
    this.refresh();
  }

  /**
   * Get tree item for a given element
   */
  getTreeItem(element: ContractTreeItem | VulnerabilityTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a given element
   */
  async getChildren(element?: ContractTreeItem | VulnerabilityTreeItem): Promise<(ContractTreeItem | VulnerabilityTreeItem)[]> {
    // If no element is provided, return contract items
    if (!element) {
      // Return contract items
      const contracts: ContractTreeItem[] = [];
      
      this.auditResults.forEach((results, filePath) => {
        const fileName = filePath.split('/').pop() || filePath;
        const vulnerabilities = results.static_analysis || [];
        
        contracts.push(new ContractTreeItem(
          fileName,
          filePath,
          vulnerabilities,
          vscode.TreeItemCollapsibleState.Collapsed
        ));
      });
      
      return contracts;
    }
    
    // If element is a contract, return its vulnerabilities
    if (element instanceof ContractTreeItem) {
      const vulnerabilities = element.vulnerabilities;
      
      return vulnerabilities.map(vuln => new VulnerabilityTreeItem(
        vuln.title,
        vuln.description,
        vuln.severity,
        vuln.location || 'Unknown',
        vscode.TreeItemCollapsibleState.None
      ));
    }
    
    // Otherwise, return empty array
    return [];
  }

  /**
   * Show a vulnerability in the editor
   */
  private async showVulnerability(filePath: string, location: string): Promise<void> {
    try {
      // Open the file
      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);
      
      // Parse location (format: "line X" or "lines X-Y")
      const lineMatch = location.match(/line[s]?\s+(\d+)(?:-(\d+))?/i);
      if (lineMatch) {
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
      }
    } catch (error) {
      console.error('Failed to show vulnerability:', error);
      vscode.window.showErrorMessage(`Failed to show vulnerability: ${error}`);
    }
  }

  /**
   * Fix a vulnerability
   */
  private async fixVulnerability(filePath: string, vulnerability: any): Promise<void> {
    try {
      // Open the file
      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);
      
      // Show fix in progress
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Generating fix for ${vulnerability.title}...`,
        cancellable: false
      }, async (progress) => {
        try {
          // Generate fix
          const result = await this.apiService.generateCode(
            `Fix the following vulnerability in this Solidity code: ${vulnerability.description}\n\nCode:\n${document.getText()}`,
            'solidity'
          );
          
          // Show the fix in a diff editor
          const fixUri = vscode.Uri.parse(`untitled:${filePath}.fix.sol`);
          const fixDocument = await vscode.workspace.openTextDocument(fixUri);
          const fixEditor = await vscode.window.showTextDocument(fixDocument);
          
          // Insert the fix
          const edit = new vscode.WorkspaceEdit();
          edit.insert(fixUri, new vscode.Position(0, 0), result.code);
          await vscode.workspace.applyEdit(edit);
          
          // Show diff
          vscode.commands.executeCommand('vscode.diff', 
            document.uri, 
            fixDocument.uri, 
            `Original vs. Fixed: ${vulnerability.title}`
          );
          
          return result;
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to generate fix: ${error}`);
          return null;
        }
      });
    } catch (error) {
      console.error('Failed to fix vulnerability:', error);
      vscode.window.showErrorMessage(`Failed to fix vulnerability: ${error}`);
    }
  }
}
