import * as vscode from 'vscode';

/**
 * Status bar item for displaying AI agent status
 */
export class AgentStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private activeAgents: number = 0;

  constructor(private context: vscode.ExtensionContext) {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      'hivemind.agentStatus',
      vscode.StatusBarAlignment.Right,
      99
    );
    
    // Set initial state
    this.updateStatus();
    
    // Show status bar item
    this.statusBarItem.show();
    
    // Add to disposables
    this.context.subscriptions.push(this.statusBarItem);
    
    // Listen for agent status changes
    this.context.subscriptions.push(
      vscode.commands.registerCommand('hivemind.updateAgentStatus', 
        (activeAgents: number) => {
          this.activeAgents = activeAgents;
          this.updateStatus();
        }
      )
    );
  }

  /**
   * Update status based on active agents
   */
  updateStatus(): void {
    if (this.activeAgents === 0) {
      this.statusBarItem.text = `$(hubot) Agents: None active`;
      this.statusBarItem.tooltip = 'No AI agents are currently active';
    } else {
      this.statusBarItem.text = `$(hubot) Agents: ${this.activeAgents} active`;
      this.statusBarItem.tooltip = `${this.activeAgents} AI agents are currently active`;
    }
    
    // Set command to show agent hub
    this.statusBarItem.command = 'hivemind.showAgentHub';
  }

  /**
   * Increment active agent count
   */
  incrementActiveAgents(): void {
    this.activeAgents++;
    this.updateStatus();
  }

  /**
   * Decrement active agent count
   */
  decrementActiveAgents(): void {
    if (this.activeAgents > 0) {
      this.activeAgents--;
    }
    this.updateStatus();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
