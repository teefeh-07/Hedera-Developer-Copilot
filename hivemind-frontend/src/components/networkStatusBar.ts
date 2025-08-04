import * as vscode from 'vscode';

/**
 * Status bar item for displaying Hedera network connection status
 */
export class NetworkStatusBar {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private context: vscode.ExtensionContext) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      'hivemind.networkStatus',
      vscode.StatusBarAlignment.Right,
      100
    );
    
    // Set initial state
    this.setDisconnected();
    
    // Show status bar item
    this.statusBarItem.show();
    
    // Add to disposables
    this.context.subscriptions.push(this.statusBarItem);
    
    // Listen for connection status changes
    this.context.subscriptions.push(
      vscode.commands.registerCommand('hivemind.updateNetworkStatus', 
        (connected: boolean, network: string, accountId: string) => {
          if (connected) {
            this.setConnected(network, accountId);
          } else {
            this.setDisconnected();
          }
        }
      )
    );
  }

  /**
   * Set status to connected
   */
  setConnected(network: string, accountId: string): void {
    this.statusBarItem.text = `$(plug) Hedera: ${network}`;
    this.statusBarItem.tooltip = `Connected to Hedera ${network}\nAccount: ${accountId}`;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    
    // Set command to disconnect
    this.statusBarItem.command = 'hivemind.disconnectHedera';
  }

  /**
   * Set status to disconnected
   */
  setDisconnected(): void {
    this.statusBarItem.text = `$(circle-slash) Hedera: Disconnected`;
    this.statusBarItem.tooltip = 'Click to connect to Hedera';
    this.statusBarItem.backgroundColor = undefined;
    
    // Set command to connect
    this.statusBarItem.command = 'hivemind.connectHedera';
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
