import * as vscode from 'vscode';
import { HederaService } from '../services/hederaService';

/**
 * Tree data provider for Transaction Center sidebar view
 */
export class TransactionCenterProvider implements vscode.TreeDataProvider<TransactionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TransactionTreeItem | undefined | null | void> = new vscode.EventEmitter<TransactionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TransactionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private transactions: any[] = [];

  constructor(private hederaService: HederaService) {}

  refresh(newTransactions: any[] = []): void {
    // Add new transactions to the list
    if (newTransactions.length > 0) {
      this.transactions = [...newTransactions, ...this.transactions];
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TransactionTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TransactionTreeItem): Promise<TransactionTreeItem[]> {
    if (!this.hederaService.isConnected()) {
      return [new TransactionTreeItem(
        'Not Connected to Hedera',
        'Please connect to Hedera network to view transactions',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'hivemind.connectHedera',
          title: 'Connect to Hedera',
          tooltip: 'Connect to Hedera network'
        }
      )];
    }

    if (this.transactions.length === 0) {
      return [new TransactionTreeItem(
        'No Transactions',
        'No transactions have been recorded yet',
        vscode.TreeItemCollapsibleState.None
      )];
    }

    if (!element) {
      // Root level - group by type
      const types = ['Contract Deployment', 'Contract Call', 'Topic Creation', 'Topic Message'];
      return types.map(type => {
        const txsForType = this.transactions.filter(tx => 
          tx.type === type
        );
        
        if (txsForType.length === 0) {
          return null;
        }
        
        return new TransactionTreeItem(
          `${type} (${txsForType.length})`,
          `${txsForType.length} ${type.toLowerCase()} transactions`,
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          `type-${type.toLowerCase().replace(' ', '-')}`,
          this.getTypeIcon(type)
        );
      }).filter(Boolean) as TransactionTreeItem[];
    } else if (element.contextValue?.startsWith('type-')) {
      // Show transactions for this type
      const type = element.contextValue.replace('type-', '').replace('-', ' ');
      const txsForType = this.transactions.filter(tx => 
        tx.type.toLowerCase() === type.toLowerCase()
      );
      
      return txsForType.map(tx => new TransactionTreeItem(
        tx.id,
        `${new Date(tx.timestamp).toLocaleString()} - ${tx.status}`,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'hivemind.showTransaction',
          title: 'Show Transaction',
          arguments: [tx.id]
        },
        'transaction',
        this.getStatusIcon(tx.status)
      ));
    }

    return [];
  }

  private getTypeIcon(type: string): vscode.ThemeIcon {
    switch (type.toLowerCase()) {
      case 'contract deployment':
        return new vscode.ThemeIcon('rocket');
      case 'contract call':
        return new vscode.ThemeIcon('call-outgoing');
      case 'topic creation':
        return new vscode.ThemeIcon('add');
      case 'topic message':
        return new vscode.ThemeIcon('comment');
      default:
        return new vscode.ThemeIcon('history');
    }
  }

  private getStatusIcon(status: string): vscode.ThemeIcon {
    switch (status.toLowerCase()) {
      case 'success':
        return new vscode.ThemeIcon('check');
      case 'pending':
        return new vscode.ThemeIcon('clock');
      case 'failed':
        return new vscode.ThemeIcon('error');
      default:
        return new vscode.ThemeIcon('question');
    }
  }

  addTransaction(transaction: any): void {
    this.transactions.unshift(transaction);
    this.refresh();
  }

  getTransactionById(id: string): any {
    return this.transactions.find(tx => tx.id === id);
  }
}

/**
 * Tree item for Transaction Center
 */
export class TransactionTreeItem extends vscode.TreeItem {
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
