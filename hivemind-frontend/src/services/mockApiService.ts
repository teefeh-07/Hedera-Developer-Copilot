import { ApiService } from './apiService';

/**
 * Mock implementation of ApiService for testing purposes
 */
export class MockApiService extends ApiService {
    constructor(baseUrl?: string) {
        super(baseUrl || 'http://localhost:8000');
    }

    /**
     * Mock implementation of chat completion
     */
    public async chatCompletion(message: string): Promise<any> {
        console.log('Mock chat completion called with:', message);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            message: `This is a mock response to: "${message}"`,
            sources: [
                {
                    title: 'Mock Documentation',
                    url: 'https://docs.example.com/mock'
                }
            ]
        };
    }

    /**
     * Mock implementation of documentation query
     */
    public async queryDocumentation(query: string): Promise<any> {
        console.log('Mock documentation query called with:', query);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            message: `Documentation answer for: "${query}"`,
            sources: [
                {
                    title: 'Hedera Documentation',
                    url: 'https://docs.hedera.com'
                },
                {
                    title: 'Smart Contract Guide',
                    url: 'https://docs.hedera.com/guides/smart-contracts'
                }
            ]
        };
    }

    /**
     * Mock implementation of health check
     */
    public async checkHealth(): Promise<boolean> {
        return true;
    }
}
