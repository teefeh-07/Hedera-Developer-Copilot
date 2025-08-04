import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Tree data provider for Audit Dashboard sidebar view
 */
export class AuditDashboardProvider implements vscode.TreeDataProvider<AuditTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AuditTreeItem | undefined | null | void> = new vscode.EventEmitter<AuditTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AuditTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private vulnerabilities: any[] = [];
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(context: vscode.ExtensionContext) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('hivemind-solidity-audit');
    context.subscriptions.push(this.diagnosticCollection);
  }

  refresh(vulnerabilities: any[] = []): void {
    this.vulnerabilities = vulnerabilities;
    this._onDidChangeTreeData.fire();
    this.updateDiagnostics();
  }

  getTreeItem(element: AuditTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AuditTreeItem): Promise<AuditTreeItem[]> {
    if (this.vulnerabilities.length === 0) {
      return [new AuditTreeItem(
        'No Vulnerabilities Found',
        'Run an audit to check for vulnerabilities',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'hivemind.auditContract',
          title: 'Audit Contract',
          tooltip: 'Run a security audit on the current contract'
        }
      )];
    }

    if (!element) {
      // Root level - group by severity
      const severities = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
      return severities.map(severity => {
        const vulnsForSeverity = this.vulnerabilities.filter(v => 
          v.severity.toLowerCase() === severity.toLowerCase()
        );
        
        if (vulnsForSeverity.length === 0) {
          return null;
        }
        
        return new AuditTreeItem(
          `${severity} (${vulnsForSeverity.length})`,
          `${vulnsForSeverity.length} ${severity.toLowerCase()} severity issues`,
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          `severity-${severity.toLowerCase()}`,
          this.getSeverityIcon(severity)
        );
      }).filter(Boolean) as AuditTreeItem[];
    } else if (element.contextValue?.startsWith('severity-')) {
      // Show vulnerabilities for this severity
      const severity = element.contextValue.replace('severity-', '');
      const vulnsForSeverity = this.vulnerabilities.filter(v => 
        v.severity.toLowerCase() === severity.toLowerCase()
      );
      
      return vulnsForSeverity.map(vuln => new AuditTreeItem(
        vuln.title || 'Unnamed Vulnerability',
        `${vuln.location?.file || 'Unknown file'}:${vuln.location?.line || '?'}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'hivemind.showVulnerability',
          title: 'Show Vulnerability',
          arguments: [vuln.id]
        },
        'vulnerability',
        new vscode.ThemeIcon('bug')
      ));
    }

    return [];
  }

  private getSeverityIcon(severity: string): vscode.ThemeIcon {
    switch (severity.toLowerCase()) {
      case 'critical':
        return new vscode.ThemeIcon('error');
      case 'high':
        return new vscode.ThemeIcon('warning');
      case 'medium':
        return new vscode.ThemeIcon('warning');
      case 'low':
        return new vscode.ThemeIcon('info');
      default:
        return new vscode.ThemeIcon('info');
    }
  }

  private updateDiagnostics(): void {
    // Clear existing diagnostics
    this.diagnosticCollection.clear();
    
    // Group vulnerabilities by file
    const fileVulnerabilities = new Map<string, vscode.Diagnostic[]>();
    
    for (const vuln of this.vulnerabilities) {
      if (!vuln.location?.file || vuln.location.line === undefined) {
        continue;
      }
      
      const filePath = vuln.location.file;
      const line = Math.max(0, (vuln.location.line || 1) - 1);
      const column = vuln.location.column || 0;
      
      // Create diagnostic
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(line, column, line, column + 1),
        `${vuln.title}: ${vuln.description}`,
        this.getSeverityLevel(vuln.severity)
      );
      
      diagnostic.source = 'HiveMind Audit';
      diagnostic.code = vuln.id;
      
      // Add to map
      if (!fileVulnerabilities.has(filePath)) {
        fileVulnerabilities.set(filePath, []);
      }
      fileVulnerabilities.get(filePath)?.push(diagnostic);
    }
    
    // Set diagnostics for each file
    for (const [filePath, diagnostics] of fileVulnerabilities.entries()) {
      const uri = vscode.Uri.file(filePath);
      this.diagnosticCollection.set(uri, diagnostics);
    }
  }

  private getSeverityLevel(severity: string): vscode.DiagnosticSeverity {
    switch (severity.toLowerCase()) {
      case 'critical':
        return vscode.DiagnosticSeverity.Error;
      case 'high':
        return vscode.DiagnosticSeverity.Error;
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'low':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  setDiagnosticCollection(collection: vscode.DiagnosticCollection): void {
    this.diagnosticCollection = collection;
  }

  getVulnerabilityById(id: string): any {
    return this.vulnerabilities.find(v => v.id === id);
  }

  auditContract(code: string, filePath: string): Promise<any[]> {
    // This is a placeholder - the actual implementation would call the API service
    // For now, return mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockVulnerabilities = [
          {
            id: 'VULN-001',
            title: 'Reentrancy Vulnerability',
            description: 'Contract state is updated after external calls, potentially allowing reentrancy attacks.',
            severity: 'High',
            location: {
              file: filePath,
              line: 25,
              column: 4
            },
            recommendation: 'Update contract state before making external calls or use ReentrancyGuard.'
          },
          {
            id: 'VULN-002',
            title: 'Unchecked Return Value',
            description: 'The return value of an external call is not checked.',
            severity: 'Medium',
            location: {
              file: filePath,
              line: 42,
              column: 8
            },
            recommendation: 'Check the return value of the external call and handle potential failures.'
          }
        ];
        
        this.refresh(mockVulnerabilities);
        resolve(mockVulnerabilities);
      }, 1500);
    });
  }
}

/**
 * Tree item for Audit Dashboard
 */
export class AuditTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly contextValue?: string,
    public readonly iconPath?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.tooltip = description;
    this.description = description;
    this.contextValue = contextValue;
    this.iconPath = iconPath;
    this.command = command;
  }
}
