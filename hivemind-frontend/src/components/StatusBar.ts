import * as vscode from 'vscode';
import { HederaService } from '../services/hederaService';

/**
 * Status bar item for displaying Hedera network connection status
 */
export class NetworkStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  
  constructor(private hederaService: HederaService) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = 'hivemind.connectHedera';
    this.update();
    this.statusBarItem.show();
  }

  /**
   * Update the status bar display
   */
  public update(): void {
    if (this.hederaService.isConnected()) {
      const network = this.hederaService.getCurrentNetwork();
      this.statusBarItem.text = `$(plug) Hedera: ${network}`;
      this.statusBarItem.tooltip = `Connected to Hedera ${network}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.text = '$(plug) Hedera: Disconnected';
      this.statusBarItem.tooltip = 'Click to connect to Hedera';
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Dispose the status bar item
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

/**
 * Status bar item for displaying agent activity status
 */
export class AgentStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private activeAgents: number = 0;
  
  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.statusBarItem.command = 'hivemind.showAgentHub';
    this.update();
    this.statusBarItem.show();
  }

  /**
   * Update the status bar display
   */
  public update(activeAgents: number = 0): void {
    this.activeAgents = activeAgents;
    
    if (this.activeAgents > 0) {
      this.statusBarItem.text = `$(hubot) Agents: ${this.activeAgents} active`;
      this.statusBarItem.tooltip = `${this.activeAgents} agents actively working`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else {
      this.statusBarItem.text = '$(hubot) Agents: Idle';
      this.statusBarItem.tooltip = 'No active agents. Click to open Agent Hub';
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Dispose the status bar item
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
