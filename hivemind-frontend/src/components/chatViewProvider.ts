import * as vscode from 'vscode';
import { ApiService } from '../services/apiService';

/**
 * Provider for the HiveMind Chat interface
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'hivemindChat';
    private _view?: vscode.WebviewView;
    private _messages: any[] = [];
    private _apiService: ApiService;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        apiService: ApiService
    ) {
        this._apiService = apiService;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleChatMessage(data.message, data.mode);
                    break;
                case 'clearChat':
                    this._messages = [];
                    this._updateChatView();
                    break;
            }
        });
    }

    /**
     * Handle incoming chat messages
     */
    private async _handleChatMessage(message: string, mode: string = 'general') {
        try {
            // Add user message to chat
            this._messages.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });
            
            this._updateChatView();
            
            // Show typing indicator
            this._view?.webview.postMessage({ 
                type: 'typingIndicator', 
                isTyping: true 
            });
            
            // Process the message based on mode
            let response;
            if (mode === 'docs') {
                // Query documentation specifically
                response = await this._apiService.queryDocumentation(message);
            } else {
                // General query
                response = await this._apiService.chatCompletion(message);
            }
            
            // Hide typing indicator
            this._view?.webview.postMessage({ 
                type: 'typingIndicator', 
                isTyping: false 
            });
            
            // Add assistant response to chat
            this._messages.push({
                role: 'assistant',
                content: response.message || "Sorry, I couldn't process your request.",
                timestamp: new Date().toISOString(),
                sources: response.sources || []
            });
            
            this._updateChatView();
        } catch (error) {
            console.error('Chat error:', error);
            
            // Hide typing indicator
            this._view?.webview.postMessage({ 
                type: 'typingIndicator', 
                isTyping: false 
            });
            
            // Add error message
            this._messages.push({
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date().toISOString(),
                isError: true
            });
            
            this._updateChatView();
        }
    }

    /**
     * Update the chat view with current messages
     */
    private _updateChatView() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChat',
                messages: this._messages
            });
        }
    }

    /**
     * Generate HTML for the webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the local path to main script and CSS
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat.js')
        );
        
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'chat.css')
        );

        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
        );

        const nonce = this._getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
            <link href="${styleUri}" rel="stylesheet">
            <link href="${codiconsUri}" rel="stylesheet">
            <title>HiveMind Chat</title>
        </head>
        <body>
            <div class="chat-container">
                <div class="chat-messages" id="chat-messages"></div>
                <div class="typing-indicator hidden" id="typing-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <div class="chat-input-container">
                    <select id="query-mode" class="query-mode-select">
                        <option value="general">General Query</option>
                        <option value="docs">Documentation Query</option>
                    </select>
                    <div class="input-wrapper">
                        <textarea id="chat-input" placeholder="Ask a question..." rows="1"></textarea>
                        <button id="send-button" class="send-button">
                            <i class="codicon codicon-send"></i>
                        </button>
                    </div>
                </div>
                <div class="chat-actions">
                    <button id="clear-chat" class="action-button">
                        <i class="codicon codicon-clear-all"></i> Clear Chat
                    </button>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
