import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ApiService } from '../services/apiService';
import { HederaService } from '../services/hederaService';
import { SolidityUtils } from './solidityUtils';

/**
 * Utility functions for smart contract deployment
 */
export class DeploymentUtils {
  /**
   * Deploy a smart contract
   */
  static async deployContract(
    filePath: string,
    apiService: ApiService,
    hederaService: HederaService
  ): Promise<any> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check if it's a Solidity file
      if (!SolidityUtils.isSolidityFile(filePath)) {
        throw new Error('Only Solidity files can be deployed');
      }

      // Read file content
      const code = fs.readFileSync(filePath, 'utf8');

      // Show progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Deploying smart contract...',
        cancellable: false
      }, async (progress) => {
        // Step 1: Compile contract
        progress.report({ message: 'Compiling contract...' });
        
        // Call API to compile contract
        const compilationResult = await apiService.compileContract(code);
        
        if (!compilationResult.success) {
          throw new Error(`Compilation failed: ${compilationResult.error}`);
        }
        
        // Step 2: Get constructor parameters if any
        progress.report({ message: 'Preparing deployment...' });
        
        const constructorParams = await this.getConstructorParams(compilationResult.abi);
        
        // Step 3: Deploy contract
        progress.report({ message: 'Deploying to Hedera...' });
        
        // Call Hedera service to deploy contract
        const contractId = await hederaService.deployContract(
          compilationResult.bytecode,
          constructorParams
        );
        
        // Step 4: Register contract
        progress.report({ message: 'Registering contract...' });
        
        // Extract contract name
        const contractName = SolidityUtils.extractContractName(filePath);
        
        // Register contract
        const registrationMetadata = {
          name: contractName,
          abi: compilationResult.abi,
          bytecode: compilationResult.bytecode
        };
        await hederaService.registerContract(contractId, registrationMetadata);
        
        // Show success message
        vscode.window.showInformationMessage(
          `Contract deployed successfully! Contract ID: ${contractId}`
        );
        
        // Add to transaction center
        vscode.commands.executeCommand('hivemindTransactionCenter.addTransaction', {
          id: `deploy-${Date.now()}`,
          type: 'CONTRACT_DEPLOY',
          timestamp: new Date(),
          status: 'SUCCESS',
          details: {
            contractId: contractId,
            gas: 500000, // Default gas used
            bytecodeSize: compilationResult.bytecode.length / 2 - 1 // Convert hex to bytes
          }
        });
        
        return { contractId, success: true };
      });
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      vscode.window.showErrorMessage(`Failed to deploy contract: ${error}`);
      throw error;
    }
  }

  /**
   * Get constructor parameters from ABI
   */
  private static async getConstructorParams(abi: any[]): Promise<any[]> {
    // Find constructor in ABI
    const constructor = abi.find(item => item.type === 'constructor');
    
    if (!constructor || !constructor.inputs || constructor.inputs.length === 0) {
      return [];
    }
    
    // Get parameters for each input
    const params: any[] = [];
    
    for (const input of constructor.inputs) {
      const param = await vscode.window.showInputBox({
        prompt: `Enter value for constructor parameter "${input.name}" (${input.type})`,
        placeHolder: `${input.type} value`
      });
      
      if (param === undefined) {
        throw new Error('Deployment cancelled');
      }
      
      // Convert param to appropriate type
      params.push(this.convertParam(param, input.type));
    }
    
    return params;
  }

  /**
   * Convert parameter to appropriate type
   */
  private static convertParam(param: string, type: string): any {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return param; // Will be handled by ethers.js
    } else if (type === 'bool') {
      return param.toLowerCase() === 'true';
    } else if (type === 'address') {
      return param;
    } else if (type === 'string') {
      return param;
    } else if (type.startsWith('bytes')) {
      return param;
    } else if (type.endsWith('[]')) {
      // Array type
      try {
        return JSON.parse(param);
      } catch (error) {
        throw new Error(`Invalid array format for parameter of type ${type}`);
      }
    } else {
      return param;
    }
  }

  /**
   * Call a contract method
   */
  static async callContractMethod(
    contractId: string,
    methodName: string,
    hederaService: HederaService
  ): Promise<any> {
    try {
      // Get contract ABI
      const contractInfo = await hederaService.getContractInfo(contractId);
      
      if (!contractInfo || !contractInfo.abi) {
        throw new Error(`Contract ${contractId} not found or ABI not available`);
      }
      
      // Find method in ABI
      const method = contractInfo.abi.find((item: any) => 
        item.type === 'function' && item.name === methodName
      );
      
      if (!method) {
        throw new Error(`Method ${methodName} not found in contract ABI`);
      }
      
      // Get parameters for method
      const params = await this.getMethodParams(method);
      
      // Determine if method is read-only or state-changing
      const isReadOnly = method.stateMutability === 'view' || method.stateMutability === 'pure';
      
      // Show progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `${isReadOnly ? 'Calling' : 'Executing'} contract method...`,
        cancellable: false
      }, async () => {
        // Call contract method
        // Note: For now, we pass null for params since we need to properly convert the array to ContractFunctionParameters
        const result = await hederaService.callContractMethod(
          contractId,
          methodName,
          null, // TODO: Convert params array to ContractFunctionParameters
          100000 // gas
        );
        
        // Show success message
        vscode.window.showInformationMessage(
          `Contract method ${methodName} ${isReadOnly ? 'called' : 'executed'} successfully!`
        );
        
        // Add to transaction center if state-changing
        if (!isReadOnly) {
          vscode.commands.executeCommand('hivemindTransactionCenter.addTransaction', {
            id: result.transactionId,
            type: 'CONTRACT_CALL',
            timestamp: new Date(),
            status: 'SUCCESS',
            details: {
              contractId: contractId,
              function: methodName,
              gas: result.gasUsed
            }
          });
        }
        
        return result;
      });
    } catch (error) {
      console.error('Failed to call contract method:', error);
      vscode.window.showErrorMessage(`Failed to call contract method: ${error}`);
      throw error;
    }
  }

  /**
   * Get method parameters from ABI
   */
  private static async getMethodParams(method: any): Promise<any[]> {
    if (!method.inputs || method.inputs.length === 0) {
      return [];
    }
    
    // Get parameters for each input
    const params: any[] = [];
    
    for (const input of method.inputs) {
      const param = await vscode.window.showInputBox({
        prompt: `Enter value for parameter "${input.name}" (${input.type})`,
        placeHolder: `${input.type} value`
      });
      
      if (param === undefined) {
        throw new Error('Method call cancelled');
      }
      
      // Convert param to appropriate type
      params.push(this.convertParam(param, input.type));
    }
    
    return params;
  }

  /**
   * Show contract explorer
   */
  static async showContractExplorer(hederaService: HederaService): Promise<void> {
    try {
      // Get deployed contracts
      const contracts = await hederaService.getDeployedContracts();
      
      if (!contracts || contracts.length === 0) {
        vscode.window.showInformationMessage('No deployed contracts found');
        return;
      }
      
      // Show quick pick with contracts
      const contractItems = contracts.map(contract => ({
        label: contract.name,
        description: contract.id,
        detail: `Deployed at ${new Date(contract.timestamp).toLocaleString()}`
      }));
      
      const selectedContract = await vscode.window.showQuickPick(contractItems, {
        placeHolder: 'Select a contract to interact with'
      });
      
      if (!selectedContract) {
        return;
      }
      
      // Get contract info
      const contractId = (selectedContract as any)?.description || '';
      const contractInfo = await hederaService.getContractInfo(contractId);
      
      if (!contractInfo || !contractInfo.abi) {
        throw new Error(`Contract ${selectedContract.description} not found or ABI not available`);
      }
      
      // Show methods
      const methods = contractInfo.abi.filter((item: any) => item.type === 'function');
      
      const methodItems = methods.map((method: any) => {
        const isReadOnly = method.stateMutability === 'view' || method.stateMutability === 'pure';
        const params = method.inputs.map((input: any) => `${input.type} ${input.name}`).join(', ');
        
        return {
          label: method.name,
          description: isReadOnly ? 'Read' : 'Write',
          detail: `${method.name}(${params})`
        };
      });
      
      const selectedMethod = await vscode.window.showQuickPick(methodItems, {
        placeHolder: 'Select a method to call'
      });
      
      if (!selectedMethod) {
        return;
      }
      
      // Call method
      const methodName = (selectedMethod as any)?.label || '';
      await this.callContractMethod(
        contractId,
        methodName,
        hederaService
      );
    } catch (error) {
      console.error('Failed to show contract explorer:', error);
      vscode.window.showErrorMessage(`Failed to show contract explorer: ${error}`);
    }
  }
}
