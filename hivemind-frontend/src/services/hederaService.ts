import * as vscode from 'vscode';
import { 
  Client, 
  AccountId, 
  PrivateKey, 
  TopicId, 
  TopicMessageSubmitTransaction,
  TopicCreateTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
  ContractCreateTransaction,
  ContractExecuteTransaction,
  FileCreateTransaction,
  FileId,
  Hbar
} from '@hashgraph/sdk';

export class HederaService {
  private client: Client | null = null;
  private accountId: string | null = null;
  private privateKey: string | null = null;
  private network: string = 'testnet';
  private connected: boolean = false;

  constructor(private context: vscode.ExtensionContext) {
    // Try to initialize from stored credentials
    this.initializeFromStoredCredentials();
  }

  /**
   * Initialize from stored credentials if available
   */
  private async initializeFromStoredCredentials(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('hivemind');
      const accountId = config.get<string>('hederaAccountId');
      const privateKey = config.get<string>('hederaPrivateKey');
      const network = config.get<string>('defaultNetwork') || 'testnet';

      if (accountId && privateKey) {
        await this.connect(network, accountId, privateKey);
      }
    } catch (error) {
      console.error('Failed to initialize from stored credentials:', error);
    }
  }

  /**
   * Connect to Hedera network
   */
  public async connect(network: string, accountId: string, privateKey: string): Promise<boolean> {
    try {
      // Create client based on network
      if (network === 'testnet') {
        this.client = Client.forTestnet();
      } else if (network === 'mainnet') {
        this.client = Client.forMainnet();
      } else {
        throw new Error(`Invalid network: ${network}`);
      }

      // Set operator
      this.client.setOperator(accountId, privateKey);
      
      // Store credentials
      this.accountId = accountId;
      this.privateKey = privateKey;
      this.network = network;
      this.connected = true;
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Hedera:', error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Disconnect from Hedera network
   */
  public disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.connected = false;
  }

  /**
   * Check if connected to Hedera
   */
  public isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Get current network
   */
  public getCurrentNetwork(): string {
    return this.network;
  }

  /**
   * Create a new HCS topic
   */
  public async createTopic(memo: string): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // Create a new topic
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(memo);
      
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const topicId = receipt.topicId!.toString();
      
      return topicId;
    } catch (error) {
      console.error('Failed to create topic:', error);
      throw error;
    }
  }

  /**
   * Submit a message to a topic
   */
  public async submitMessage(topicId: string, message: any): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // Convert message to JSON string
      const messageJson = JSON.stringify(message);
      
      // Submit message to topic
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(TopicId.fromString(topicId))
        .setMessage(messageJson);
      
      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);
      const transactionId = txResponse.transactionId.toString();
      
      return transactionId;
    } catch (error) {
      console.error('Failed to submit message:', error);
      throw error;
    }
  }

  /**
   * Call a contract method (read-only)
   */
  public async callContractMethod(
    contractId: string, 
    method: string, 
    params: ContractFunctionParameters | null = null,
    gas: number = 100000
  ): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // Create query
      let query = new ContractCallQuery()
        .setContractId(ContractId.fromString(contractId))
        .setGas(gas)
        .setFunction(method);
      
      // Add parameters if provided
      if (params) {
        // Convert ContractFunctionParameters to bytes for the query
        const paramBytes = new Uint8Array(0); // Placeholder - in real implementation, serialize params
        query = query.setFunctionParameters(paramBytes);
      }
      
      // Execute query
      const response = await query.execute(this.client);
      
      return response;
    } catch (error) {
      console.error('Failed to call contract method:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  public async getAccountBalance(): Promise<string> {
    if (!this.client || !this.accountId) {
      throw new Error('Not connected to Hedera');
    }

    try {
      const accountBalance = await new (this.client as any).AccountBalanceQuery()
        .setAccountId(AccountId.fromString(this.accountId))
        .execute(this.client);
      const balance = accountBalance;
      return balance.hbars.toString();
    } catch (error) {
      console.error('Failed to get account balance:', error);
      throw error;
    }
  }

  /**
   * Get account ID
   */
  public getAccountId(): string | null {
    return this.accountId;
  }

  /**
   * Deploy a smart contract to Hedera
   */
  public async deployContract(bytecode: string, constructorParams?: any): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // First create a file with the bytecode
      const fileCreateTx = new FileCreateTransaction()
        .setContents(bytecode);
      
      const fileResponse = await fileCreateTx.execute(this.client);
      const fileReceipt = await fileResponse.getReceipt(this.client);
      const fileId = fileReceipt.fileId!;

      // Then create the contract
      let contractCreateTx = new ContractCreateTransaction()
        .setBytecodeFileId(fileId)
        .setGas(500000)
        .setInitialBalance(Hbar.fromTinybars(0));

      if (constructorParams) {
        contractCreateTx = contractCreateTx.setConstructorParameters(constructorParams);
      }

      const contractResponse = await contractCreateTx.execute(this.client);
      const contractReceipt = await contractResponse.getReceipt(this.client);
      const contractId = contractReceipt.contractId!.toString();

      return contractId;
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      throw error;
    }
  }

  /**
   * Register a contract in the registry
   */
  public async registerContract(contractId: string, metadata: any): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // This would typically call a registry contract method
      // For now, simulate registration
      const registrationData = {
        contractId,
        metadata,
        timestamp: Date.now(),
        owner: this.accountId
      };

      // Submit to HCS topic for registry updates
      const topicId = '0.0.registry'; // This would be configured
      const transactionId = await this.submitMessage(topicId, registrationData);
      
      return transactionId;
    } catch (error) {
      console.error('Failed to register contract:', error);
      throw error;
    }
  }

  /**
   * Get contract information
   */
  public async getContractInfo(contractId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // This would typically query the contract registry
      // For now, return mock data
      return {
        contractId,
        name: `Contract ${contractId}`,
        description: `Smart contract deployed at ${contractId}`,
        owner: this.accountId,
        deployedAt: Date.now() - 86400000, // 1 day ago
        verified: false
      };
    } catch (error) {
      console.error('Failed to get contract info:', error);
      throw error;
    }
  }

  /**
   * Get list of deployed contracts
   */
  public async getDeployedContracts(): Promise<any[]> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // This would typically query the contract registry
      // For now, return mock data
      return [
        {
          contractId: '0.0.contract1',
          name: 'Token Contract',
          description: 'ERC20 token implementation',
          deployedAt: Date.now() - 172800000 // 2 days ago
        },
        {
          contractId: '0.0.contract2',
          name: 'NFT Contract',
          description: 'ERC721 NFT implementation',
          deployedAt: Date.now() - 86400000 // 1 day ago
        }
      ];
    } catch (error) {
      console.error('Failed to get deployed contracts:', error);
      throw error;
    }
  }

  /**
   * Use a specific agent for a task
   */
  public async useAgent(agentId: string, prompt: string): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    try {
      // This would typically call the agent's contract method
      // For now, return mock response
      return {
        success: true,
        response: `Agent ${agentId} processed: ${prompt}`,
        agentId,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to use agent:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(accountId: string, privateKey: string, network: string, topicId?: string, rpcUrl?: string): void {
    this.accountId = accountId;
    this.privateKey = privateKey;
    this.network = network;
    
    // Reconnect with new configuration if currently connected
    if (this.connected) {
      this.disconnect();
      this.connect(network, accountId, privateKey);
    }
  }

  /**
   * Get list of agents from registry
   */
  public async getAgents(): Promise<any[]> {
    if (!this.client) {
      throw new Error('Not connected to Hedera');
    }

    // This would typically call a contract method to get registered agents
    // For now, return mock data
    return [
      {
        id: '0.0.12345',
        name: 'Security Auditor',
        capabilities: ['audit', 'vulnerability-detection'],
        fee: '1.0 HBAR'
      },
      {
        id: '0.0.12346',
        name: 'Test Generator',
        capabilities: ['test-generation', 'fuzzing'],
        fee: '0.5 HBAR'
      },
      {
        id: '0.0.12347',
        name: 'Gas Optimizer',
        capabilities: ['optimization', 'gas-analysis'],
        fee: '0.8 HBAR'
      }
    ];
  }
}
