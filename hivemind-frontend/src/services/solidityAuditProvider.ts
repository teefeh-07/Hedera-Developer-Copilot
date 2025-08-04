import * as vscode from 'vscode';
import { ApiService } from './apiService';

/**
 * Provider for Solidity code auditing and diagnostics
 */
export class SolidityAuditProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private vulnerabilities: Map<string, any[]> = new Map();

  constructor(private apiService: ApiService) {
    // Create diagnostic collection
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('solidity-audit');
  }

  /**
   * Update diagnostics for a document based on audit results
   */
  updateDiagnostics(document: vscode.TextDocument, auditResult: any): void {
    // Clear existing diagnostics
    this.diagnosticCollection.delete(document.uri);
    
    // Get vulnerabilities from audit result
    const vulnerabilities = auditResult?.static_analysis || [];
    
    if (vulnerabilities.length === 0) {
      return;
    }
    
    // Create diagnostics
    const diagnostics: vscode.Diagnostic[] = [];
    
    vulnerabilities.forEach(vuln => {
      // Parse location (format: "line X" or "lines X-Y")
      const lineMatch = vuln.location?.match(/line[s]?\s+(\d+)(?:-(\d+))?/i);
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
      
      // Create diagnostic
      const diagnostic = new vscode.Diagnostic(
        range,
        vuln.description,
        this.getSeverity(vuln.severity)
      );
      
      // Add metadata
      diagnostic.source = 'HiveMind Audit';
      diagnostic.code = vuln.title;
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          vuln.title
        )
      ];
      
      diagnostics.push(diagnostic);
    });
    
    // Set diagnostics
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  /**
   * Get diagnostic severity based on vulnerability severity
   */
  private getSeverity(severity: string): vscode.DiagnosticSeverity {
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

  /**
   * Audit a Solidity document
   */
  async auditDocument(document: vscode.TextDocument): Promise<any> {
    try {
      // Check if document is Solidity
      if (document.languageId !== 'solidity') {
        return null;
      }
      
      // Get document text
      const code = document.getText();
      
      // Call API to audit contract
      const result = await this.apiService.auditContract(code);
      
      // Update diagnostics
      this.updateDiagnostics(document, result);
      
      return result;
    } catch (error) {
      console.error('Failed to audit document:', error);
      vscode.window.showErrorMessage(`Failed to audit document: ${error}`);
      return null;
    }
  }

  /**
   * Clear diagnostics for a document
   */
  clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Audit a contract and return results
   */
  async auditContract(code: string): Promise<any> {
    try {
      const result = await this.apiService.auditContract(code);
      
      // Store vulnerabilities for later retrieval
      const documentUri = vscode.window.activeTextEditor?.document.uri.toString() || 'current';
      this.vulnerabilities.set(documentUri, result?.static_analysis || []);
      
      return result;
    } catch (error) {
      console.error('Failed to audit contract:', error);
      throw error;
    }
  }

  /**
   * Get vulnerability by ID
   */
  getVulnerabilityById(id: string): any | null {
    const documentUri = vscode.window.activeTextEditor?.document.uri.toString() || 'current';
    const vulns = this.vulnerabilities.get(documentUri) || [];
    
    return vulns.find(vuln => vuln.id === id || vuln.title === id) || null;
  }

  /**
   * Get all vulnerabilities for current document
   */
  getVulnerabilities(): any[] {
    const documentUri = vscode.window.activeTextEditor?.document.uri.toString() || 'current';
    return this.vulnerabilities.get(documentUri) || [];
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
    this.vulnerabilities.clear();
  }
}
