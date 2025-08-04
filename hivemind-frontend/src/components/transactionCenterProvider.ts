import * as vscode from 'vscode';
import { HederaService } from '../services/hederaService';

/**
 * Tree item representing a transaction in the Transaction Center
 */
export class TransactionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly transactionId: string,
    public readonly type: string,
    public readonly timestamp: Date,
    public readonly status: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
    this.tooltip = `${type} - ${transactionId}`;
    this.description = new Date(timestamp).toLocaleString();
    
    // Set context value for when clause in package.json
    this.contextValue = 'transaction';
    
    // Set icon based on type
    switch (type.toLowerCase()) {
      case 'contract_deploy':
        this.iconPath = new vscode.ThemeIcon('rocket');
        break;
      case 'contract_call':
        this.iconPath = new vscode.ThemeIcon('play');
        break;
      case 'topic_create':
        this.iconPath = new vscode.ThemeIcon('symbol-event');
        break;
      case 'topic_message':
        this.iconPath = new vscode.ThemeIcon('comment');
        break;
      default:
        this.iconPath = new vscode.ThemeIcon('arrow-both');
    }
  }
}

/**
 * Tree data provider for the Transaction Center view
 */
export class TransactionCenterProvider implements vscode.TreeDataProvider<TransactionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TransactionTreeItem | undefined | null | void> = new vscode.EventEmitter<TransactionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TransactionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private transactions: any[] = [];

  constructor(private hederaService: HederaService) {
    // Register refresh command
    vscode.commands.registerCommand('hivemindTransactionCenter.refresh', () => {
      this.refresh();
    });
    
    // Register view transaction command
    vscode.commands.registerCommand('hivemindTransactionCenter.viewTransaction', (transactionId: string) => {
      this.viewTransaction(transactionId);
    });
    
    // Register add transaction command
    vscode.commands.registerCommand('hivemindTransactionCenter.addTransaction', (transaction: any) => {
      this.addTransaction(transaction);
    });
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Add a transaction to the list
   */
  addTransaction(transaction: any): void {
    this.transactions.unshift(transaction);
    this.refresh();
  }

  /**
   * Get tree item for a given element
   */
  getTreeItem(element: TransactionTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a given element
   */
  async getChildren(element?: TransactionTreeItem): Promise<TransactionTreeItem[]> {
    // If element is provided, it means we're getting children of a specific node
    // In this case, we don't have nested items, so return empty array
    if (element) {
      return [];
    }
    
    // Check if connected to Hedera
    if (!this.hederaService.isConnected()) {
      // Not connected, return empty array
      return [];
    }
    
    try {
      // If transactions array is empty, try to fetch some mock transactions
      if (this.transactions.length === 0) {
        // For demo purposes, create some mock transactions
        this.transactions = [
          {
            id: '0.0.12345@1626282282.000000000',
            type: 'CONTRACT_DEPLOY',
            timestamp: new Date(),
            status: 'SUCCESS',
            details: {
              contractId: '0.0.12345',
              gas: 500000,
              bytecodeSize: 4096
            }
          },
          {
            id: '0.0.12345@1626282283.000000000',
            type: 'CONTRACT_CALL',
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            status: 'SUCCESS',
            details: {
              contractId: '0.0.12345',
              function: 'transfer',
              gas: 100000
            }
          },
          {
            id: '0.0.12345@1626282284.000000000',
            type: 'TOPIC_CREATE',
            timestamp: new Date(Date.now() - 86400000), // 1 day ago
            status: 'SUCCESS',
            details: {
              topicId: '0.0.56789',
              memo: 'Agent Collaboration'
            }
          }
        ];
      }
      
      // Convert to tree items
      return this.transactions.map(tx => new TransactionTreeItem(
        this.getTransactionLabel(tx),
        tx.id,
        tx.type,
        tx.timestamp,
        tx.status,
        vscode.TreeItemCollapsibleState.None
      ));
    } catch (error) {
      console.error('Failed to get transactions:', error);
      vscode.window.showErrorMessage(`Failed to get transactions: ${error}`);
      return [];
    }
  }

  /**
   * Get a label for a transaction
   */
  private getTransactionLabel(transaction: any): string {
    switch (transaction.type.toLowerCase()) {
      case 'contract_deploy':
        return `Deploy Contract ${transaction.details.contractId}`;
      case 'contract_call':
        return `Call ${transaction.details.function}() on ${transaction.details.contractId}`;
      case 'topic_create':
        return `Create Topic ${transaction.details.topicId}`;
      case 'topic_message':
        return `Message to Topic ${transaction.details.topicId}`;
      default:
        return `Transaction ${transaction.id}`;
    }
  }

  /**
   * View transaction details
   */
  private async viewTransaction(transactionId: string): Promise<void> {
    try {
      // Find transaction
      const transaction = this.transactions.find(tx => tx.id === transactionId);
      
      if (!transaction) {
        vscode.window.showErrorMessage(`Transaction ${transactionId} not found`);
        return;
      }
      
      // Show transaction details
      const panel = vscode.window.createWebviewPanel(
        'hivemindTransactionDetails',
        `Transaction Details: ${this.getTransactionLabel(transaction)}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true
        }
      );
      
      // Set HTML content
      panel.webview.html = this.getTransactionDetailsHtml(transaction);
    } catch (error) {
      console.error('Failed to view transaction:', error);
      vscode.window.showErrorMessage(`Failed to view transaction: ${error}`);
    }
  }

  /**
   * Get HTML for transaction details
   */
  private getTransactionDetailsHtml(transaction: any): string {
    // Format details based on transaction type
    let detailsHtml = '';
    
    switch (transaction.type.toLowerCase()) {
      case 'contract_deploy':
        detailsHtml = `
          <div class="detail-row">
            <div class="detail-label">Contract ID:</div>
            <div class="detail-value">${transaction.details.contractId}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Gas Used:</div>
            <div class="detail-value">${transaction.details.gas}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Bytecode Size:</div>
            <div class="detail-value">${transaction.details.bytecodeSize} bytes</div>
          </div>
        `;
        break;
        
      case 'contract_call':
        detailsHtml = `
          <div class="detail-row">
            <div class="detail-label">Contract ID:</div>
            <div class="detail-value">${transaction.details.contractId}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Function:</div>
            <div class="detail-value">${transaction.details.function}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Gas Used:</div>
            <div class="detail-value">${transaction.details.gas}</div>
          </div>
        `;
        break;
        
      case 'topic_create':
        detailsHtml = `
          <div class="detail-row">
            <div class="detail-label">Topic ID:</div>
            <div class="detail-value">${transaction.details.topicId}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Memo:</div>
            <div class="detail-value">${transaction.details.memo}</div>
          </div>
        `;
        break;
        
      default:
        detailsHtml = `
          <div class="detail-row">
            <div class="detail-label">No details available</div>
          </div>
        `;
    }
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Transaction Details</title>
      <style>
        body {
          padding: 20px;
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        
        .transaction-card {
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .transaction-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        
        .transaction-id {
          font-family: monospace;
          font-size: 14px;
          color: var(--vscode-textPreformat-foreground);
        }
        
        .transaction-timestamp {
          font-size: 14px;
          color: var(--vscode-descriptionForeground);
        }
        
        .transaction-status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-success {
          background-color: rgba(0, 255, 0, 0.1);
          color: #3fb950;
        }
        
        .status-pending {
          background-color: rgba(255, 255, 0, 0.1);
          color: #d29922;
        }
        
        .status-failed {
          background-color: rgba(255, 0, 0, 0.1);
          color: #f85149;
        }
        
        .transaction-details {
          margin-top: 20px;
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 8px;
        }
        
        .detail-label {
          width: 120px;
          font-weight: bold;
        }
        
        .detail-value {
          flex: 1;
        }
      </style>
    </head>
    <body>
      <h1>Transaction Details</h1>
      
      <div class="transaction-card">
        <div class="transaction-header">
          <div class="transaction-id">${transaction.id}</div>
          <div class="transaction-timestamp">${new Date(transaction.timestamp).toLocaleString()}</div>
        </div>
        
        <div class="transaction-type">${transaction.type}</div>
        
        <div class="transaction-status status-${transaction.status.toLowerCase()}">${transaction.status}</div>
        
        <div class="transaction-details">
          ${detailsHtml}
        </div>
      </div>
    </body>
    </html>`;
  }
}
