import * as vscode from 'vscode';
import * as assertModule from 'assert';
const assert: typeof assertModule.strict = assertModule.strict;
import { ApiService } from '../services/apiService';
import { MockApiService } from '../services/mockApiService';
import { ChatViewProvider } from '../components/chatViewProvider';

/**
 * Test suite for the Chat interface
 */
export async function runChatTests() {
    console.log('Running Chat Interface Tests...');
    
    // Test 1: Check if ChatViewProvider is registered
    try {
        await vscode.commands.executeCommand('workbench.view.extension.hivemind-sidebar');
        await vscode.commands.executeCommand('hivemindChat.focus');
        console.log('✅ Test 1 Passed: Chat view can be focused');
    } catch (error) {
        console.error('❌ Test 1 Failed: Chat view cannot be focused', error);
    }
    
    // Test 2: Test the showChat command
    try {
        await vscode.commands.executeCommand('hivemind.showChat');
        console.log('✅ Test 2 Passed: hivemind.showChat command works');
    } catch (error) {
        console.error('❌ Test 2 Failed: hivemind.showChat command failed', error);
    }
    
    // Test 3: Check if ApiService chat methods are available
    try {
        const mockApiService = new MockApiService();
        assert.equal(typeof mockApiService.chatCompletion, 'function', 'chatCompletion method should exist');
        assert.equal(typeof mockApiService.queryDocumentation, 'function', 'queryDocumentation method should exist');
        console.log('✅ Test 3 Passed: ApiService chat methods are available');
    } catch (error) {
        console.error('❌ Test 3 Failed: ApiService chat methods check failed', error);
    }
    
    // Test 4: Check if ChatViewProvider can be instantiated
    try {
        const mockApiService = new MockApiService();
        const extensionUri = vscode.Uri.file(__dirname);
        const chatViewProvider = new ChatViewProvider(extensionUri, mockApiService);
        assert.ok(chatViewProvider, 'ChatViewProvider should be instantiated');
        console.log('✅ Test 4 Passed: ChatViewProvider can be instantiated');
    } catch (error) {
        console.error('❌ Test 4 Failed: ChatViewProvider instantiation failed', error);
    }
    
    // Test 5: Test mock chat completion
    try {
        const mockApiService = new MockApiService();
        const response = await mockApiService.chatCompletion('Hello, this is a test message');
        assert.ok(response && response.message, 'Response should contain a message');
        assert.ok(Array.isArray(response.sources), 'Response should contain sources array');
        console.log('✅ Test 5 Passed: Mock chat completion works');
    } catch (error) {
        console.error('❌ Test 5 Failed: Mock chat completion failed', error);
    }
    
    // Test 6: Test mock documentation query
    try {
        const mockApiService = new MockApiService();
        const response = await mockApiService.queryDocumentation('How do I use Hedera?');
        assert.ok(response && response.message, 'Response should contain a message');
        assert.ok(Array.isArray(response.sources), 'Response should contain sources array');
        console.log('✅ Test 6 Passed: Mock documentation query works');
    } catch (error) {
        console.error('❌ Test 6 Failed: Mock documentation query failed', error);
    }
    
    console.log('Chat Interface Tests Completed');
}
