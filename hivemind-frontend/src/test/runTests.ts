import * as vscode from 'vscode';
import { runChatTests } from './chatTest';

/**
 * Main test runner for HiveMind Copilot extension
 */
export async function runAllTests() {
    try {
        console.log('Starting HiveMind Copilot Tests...');
        
        // Run chat interface tests
        await runChatTests();
        
        console.log('All tests completed');
    } catch (error) {
        console.error('Test execution failed:', error);
    }
}

// Run tests when this module is executed directly
if (require.main === module) {
    runAllTests().catch(err => {
        console.error('Test runner failed:', err);
    });
}
