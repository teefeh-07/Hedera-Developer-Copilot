import * as vscode from 'vscode';
import { HederaService } from '../services/hederaService';

/**
 * Tree data provider for Agent Explorer sidebar view
 */
export class AgentExplorerProvider implements vscode.TreeDataProvider<AgentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private hederaService: HederaService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AgentTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AgentTreeItem): Promise<AgentTreeItem[]> {
    if (!this.hederaService.isConnected()) {
      return [new AgentTreeItem(
        'Not Connected to Hedera',
        'Please connect to Hedera network to view agents',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'hivemind.connectHedera',
          title: 'Connect to Hedera',
          tooltip: 'Connect to Hedera network'
        }
      )];
    }

    if (!element) {
      // Root level - show categories
      return [
        new AgentTreeItem(
          'Available Agents',
          'Agents available for collaboration',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          'agents'
        ),
        new AgentTreeItem(
          'Active Collaborations',
          'Currently active agent collaborations',
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          'collaborations'
        )
      ];
    } else if (element.contextValue === 'agents') {
      // Show available agents
      try {
        const agents = await this.hederaService.getAgents();
        return agents.map(agent => new AgentTreeItem(
          agent.name,
          `${agent.capabilities.join(', ')} - Fee: ${agent.fee}`,
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'hivemind.useAgent',
            title: 'Use Agent',
            arguments: [agent.id]
          },
          'agent',
          new vscode.ThemeIcon('hubot')
        ));
      } catch (error) {
        return [new AgentTreeItem(
          'Error Loading Agents',
          String(error),
          vscode.TreeItemCollapsibleState.None
        )];
      }
    } else if (element.contextValue === 'collaborations') {
      // In a real implementation, this would fetch active collaborations
      // For now, return an empty list or placeholder
      return [new AgentTreeItem(
        'No Active Collaborations',
        'Start a new collaboration by using an agent',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'hivemind.showAgentHub',
          title: 'Show Agent Hub',
          tooltip: 'Open the Agent Hub to start a collaboration'
        }
      )];
    }

    return [];
  }
}

/**
 * Tree item for Agent Explorer
 */
export class AgentTreeItem extends vscode.TreeItem {
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
