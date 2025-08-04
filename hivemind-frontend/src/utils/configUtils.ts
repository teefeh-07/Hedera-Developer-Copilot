import * as vscode from 'vscode';

/**
 * Configuration utility functions for HiveMind Copilot
 */
export class ConfigUtils {
  /**
   * Get API base URL from configuration
   */
  static getApiBaseUrl(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('apiBaseUrl') || 'http://localhost:8000';
  }

  /**
   * Get Hedera account ID from configuration
   */
  static getHederaAccountId(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('hederaAccountId') || '';
  }

  /**
   * Get Hedera private key from configuration
   */
  static getHederaPrivateKey(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('hederaPrivateKey') || '';
  }

  /**
   * Get Hedera network from configuration
   */
  static getHederaNetwork(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('hederaNetwork') || 'testnet';
  }

  /**
   * Get Hedera topic ID from configuration
   */
  static getHederaTopicId(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('hederaTopicId') || '';
  }

  /**
   * Get smart contract registry address from configuration
   */
  static getContractRegistryAddress(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('contractRegistryAddress') || '';
  }

  /**
   * Get RPC URL from configuration
   */
  static getRpcUrl(): string {
    const config = vscode.workspace.getConfiguration('hivemind');
    return config.get<string>('rpcUrl') || 'https://testnet.hashio.io/api';
  }

  /**
   * Update configuration setting
   */
  static async updateSetting(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('hivemind');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
  }

  /**
   * Show configuration settings in UI
   */
  static async showConfigurationUI(): Promise<void> {
    // Get current settings
    const apiBaseUrl = this.getApiBaseUrl();
    const hederaAccountId = this.getHederaAccountId();
    const hederaPrivateKey = this.getHederaPrivateKey();
    const hederaNetwork = this.getHederaNetwork();
    const hederaTopicId = this.getHederaTopicId();
    const contractRegistryAddress = this.getContractRegistryAddress();
    const rpcUrl = this.getRpcUrl();

    // Show input box for API base URL
    const newApiBaseUrl = await vscode.window.showInputBox({
      prompt: 'Enter API base URL',
      value: apiBaseUrl,
      placeHolder: 'http://localhost:8000'
    });

    if (newApiBaseUrl !== undefined && newApiBaseUrl !== apiBaseUrl) {
      await this.updateSetting('apiBaseUrl', newApiBaseUrl);
    }

    // Show input box for Hedera account ID
    const newHederaAccountId = await vscode.window.showInputBox({
      prompt: 'Enter Hedera account ID',
      value: hederaAccountId,
      placeHolder: '0.0.12345'
    });

    if (newHederaAccountId !== undefined && newHederaAccountId !== hederaAccountId) {
      await this.updateSetting('hederaAccountId', newHederaAccountId);
    }

    // Show input box for Hedera private key
    const newHederaPrivateKey = await vscode.window.showInputBox({
      prompt: 'Enter Hedera private key',
      value: hederaPrivateKey ? '********' : '',
      password: true,
      placeHolder: 'Enter your private key'
    });

    if (newHederaPrivateKey !== undefined && newHederaPrivateKey !== '********') {
      await this.updateSetting('hederaPrivateKey', newHederaPrivateKey);
    }

    // Show quick pick for Hedera network
    const networkOptions = ['mainnet', 'testnet', 'previewnet'];
    const newHederaNetwork = await vscode.window.showQuickPick(networkOptions, {
      placeHolder: 'Select Hedera network',
      canPickMany: false
    });

    if (newHederaNetwork !== undefined && newHederaNetwork !== hederaNetwork) {
      await this.updateSetting('hederaNetwork', newHederaNetwork);
    }

    // Show input box for Hedera topic ID
    const newHederaTopicId = await vscode.window.showInputBox({
      prompt: 'Enter Hedera topic ID (optional)',
      value: hederaTopicId,
      placeHolder: '0.0.12345'
    });

    if (newHederaTopicId !== undefined && newHederaTopicId !== hederaTopicId) {
      await this.updateSetting('hederaTopicId', newHederaTopicId);
    }

    // Show input box for contract registry address
    const newContractRegistryAddress = await vscode.window.showInputBox({
      prompt: 'Enter smart contract registry address (optional)',
      value: contractRegistryAddress,
      placeHolder: '0x1234...'
    });

    if (newContractRegistryAddress !== undefined && newContractRegistryAddress !== contractRegistryAddress) {
      await this.updateSetting('contractRegistryAddress', newContractRegistryAddress);
    }

    // Show input box for RPC URL
    const newRpcUrl = await vscode.window.showInputBox({
      prompt: 'Enter RPC URL',
      value: rpcUrl,
      placeHolder: 'https://testnet.hashio.io/api'
    });

    if (newRpcUrl !== undefined && newRpcUrl !== rpcUrl) {
      await this.updateSetting('rpcUrl', newRpcUrl);
    }

    vscode.window.showInformationMessage('HiveMind Copilot configuration updated');
  }
}
