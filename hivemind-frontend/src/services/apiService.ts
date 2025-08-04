import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export class ApiService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Use provided baseUrl or get from configuration or use default
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else {
      const config = vscode.workspace.getConfiguration('hivemind');
      this.baseUrl = config.get('apiUrl') || 'http://localhost:8000';
    }
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add interceptors for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error:', error);
        return Promise.reject(error?.response?.data?.detail || error.message || 'Unknown error');
      }
    );
  }
  
  /**
   * Update the base URL for the API
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.client.defaults.baseURL = url;
  }
  
  /**
   * Generate code based on a prompt
   */
  public async generateCode(prompt: string, language: string = 'solidity'): Promise<any> {
    const response = await this.client.post('/api/v1/generate', {
      prompt,
      language
    });
    
    return response.data;
  }
  
  /**
   * Analyze code for security issues and optimizations
   */
  public async analyzeCode(code: string, language: string = 'solidity'): Promise<any> {
    const response = await this.client.post('/api/v1/analyze', {
      code,
      language
    });
    
    return response.data;
  }
  
  /**
   * Compile a Solidity contract
   */
  public async compileContract(code: string, contractName?: string): Promise<any> {
    const response = await this.client.post('/api/v1/compile', {
      code,
      contract_name: contractName
    });
    
    return response.data;
  }

  /**
   * Deploy a smart contract to Hedera
   */
  public async deployContract(code: string, constructorParams: any = null): Promise<any> {
    const response = await this.client.post('/api/v1/deploy', {
      code,
      constructor_params: constructorParams
    });
    
    return response.data;
  }
  
  /**
   * Run a security audit on Solidity code
   */
  public async auditContract(code: string): Promise<any> {
    const response = await this.client.post('/api/v1/audit', {
      code
    });
    
    return response.data;
  }
  
  /**
   * Generate tests for a smart contract
   */
  public async generateTests(code: string): Promise<any> {
    const response = await this.client.post('/api/v1/analyze', {
      code,
      language: 'solidity',
      generate_tests: true
    });
    
    return response.data;
  }
  
  /**
   * Establish collaboration between agents for contract analysis
   */
  public async collaborateOnContract(contractAddress: string): Promise<any> {
    const response = await this.client.post('/api/v1/collaborate', {
      contract_address: contractAddress
    });
    
    return response.data;
  }
  
  /**
   * Check the health of the API
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Send a chat message and get a response
   */
  public async chatCompletion(message: string): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/chat', {
        message
      });
      
      return {
        message: response.data.response,
        sources: response.data.sources || []
      };
    } catch (error) {
      console.error('Chat completion error:', error);
      throw error;
    }
  }

  /**
   * Query documentation with a specific question
   */
  public async queryDocumentation(query: string): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/docs', {
        query
      });
      
      return {
        message: response.data.answer,
        sources: response.data.sources || []
      };
    } catch (error) {
      console.error('Documentation query error:', error);
      throw error;
    }
  }

  /**
   * Query contract registry
   */
  public async queryRegistry(action: string, params: any = {}): Promise<any> {
    try {
      const response = await this.client.post('/api/v1/registry', {
        action,
        ...params
      });
      
      return response.data;
    } catch (error) {
      console.error('Registry query error:', error);
      throw error;
    }
  }
}
