import * as vscode from 'vscode';
import { HederaService } from '../services/hederaService';

/**
 * Tree item representing an agent in the Agent Explorer
 */
export class AgentTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly agentId: string,
    public readonly capabilities: string[],
    public readonly fee: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
    this.tooltip = `${label} (${agentId})`;
    this.description = fee;
    
    // Set context value for when clause in package.json
    this.contextValue = 'agent';
    
    // Set icon based on capabilities
    if (capabilities.includes('audit')) {
      this.iconPath = new vscode.ThemeIcon('shield');
    } else if (capabilities.includes('test-generation')) {
      this.iconPath = new vscode.ThemeIcon('beaker');
    } else if (capabilities.includes('optimization')) {
      this.iconPath = new vscode.ThemeIcon('rocket');
    } else {
      this.iconPath = new vscode.ThemeIcon('hubot');
    }
  }
}

/**
 * Tree data provider for the Agent Explorer view
 */
export class AgentExplorerProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private hederaService: HederaService) {
    // Register refresh command
    vscode.commands.registerCommand('hivemindAgentExplorer.refresh', () => {
      this.refresh();
    });
    
    // Register use agent command
    vscode.commands.registerCommand('hivemindAgentExplorer.useAgent', (agentId: string) => {
      this.useAgent(agentId);
    });
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Get tree item for a given element
   */
  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Get children of a given element
   */
  async getChildren(element?: AgentTreeItem): Promise<AgentTreeItem[]> {
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
      // Get agents from Hedera
      const agents = await this.hederaService.getAgents();
      
      // Convert to tree items
      return agents.map(agent => new AgentTreeItem(
        agent.name,
        agent.id,
        agent.capabilities,
        agent.fee,
        vscode.TreeItemCollapsibleState.None
      ));
    } catch (error) {
      console.error('Failed to get agents:', error);
      vscode.window.showErrorMessage(`Failed to get agents: ${error}`);
      return [];
    }
  }

  /**
   * Use an agent
   */
  private async useAgent(agentId: string): Promise<void> {
    try {
      // Get agent details
      const agents = await this.hederaService.getAgents();
      const agent = agents.find(a => a.id === agentId);
      
      if (!agent) {
        vscode.window.showErrorMessage(`Agent ${agentId} not found`);
        return;
      }
      
      // Show agent capabilities and ask what to do
      const action = await vscode.window.showQuickPick(
        agent.capabilities.map(cap => ({
          label: cap,
          description: `Use ${agent.name} for ${cap}`
        })),
        {
          placeHolder: `What would you like ${agent.name} to do?`
        }
      );
      
      if (!action) {
        return;
      }
      
      // Handle different capabilities
      const capability = (action as any)?.label || '';
      switch (capability) {
        case 'audit':
          vscode.commands.executeCommand('hivemind.auditContract');
          break;
          
        case 'test-generation':
        case 'fuzzing':
          vscode.commands.executeCommand('hivemind.generateTests');
          break;
          
        case 'optimization':
        case 'gas-analysis':
          const editor = vscode.window.activeTextEditor;
          if (!editor || editor.document.languageId !== 'solidity') {
            vscode.window.showInformationMessage('Please open a Solidity file to optimize.');
            return;
          }
          
          // Show optimization in progress
          vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Optimizing with ${agent.name}...`,
            cancellable: false
          }, async (progress) => {
            // This would call the API to optimize the contract
            // For now, just show a message
            await new Promise(resolve => setTimeout(resolve, 2000));
            vscode.window.showInformationMessage(`Optimization with ${agent.name} completed.`);
          });
          break;
          
        default:
          vscode.window.showInformationMessage(`Using ${agent.name} for ${capability}`);
      }
    } catch (error) {
      console.error('Failed to use agent:', error);
      vscode.window.showErrorMessage(`Failed to use agent: ${error}`);
    }
  }
}
