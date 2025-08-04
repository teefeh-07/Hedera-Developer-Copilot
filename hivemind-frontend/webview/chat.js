// @ts-check

(function() {
    // Get VS Code API
    // @ts-ignore
    const vscode = acquireVsCodeApi();
    
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    /** @type {HTMLTextAreaElement|null} */
    const chatInput = /** @type {HTMLTextAreaElement|null} */ (document.getElementById('chat-input'));
    const sendButton = document.getElementById('send-button');
    const clearChatButton = document.getElementById('clear-chat');
    /** @type {HTMLSelectElement|null} */
    const queryModeSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('query-mode'));
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Initialize
    let messages = [];
    
    // Auto-resize textarea as content grows
    chatInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Reset to default height if empty
        if (this.value === '') {
            this.style.height = '';
        }
    });
    
    // Send message on button click
    sendButton?.addEventListener('click', () => {
        sendMessage();
    });
    
    // Send message on Enter (but allow Shift+Enter for new lines)
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Clear chat history
    clearChatButton?.addEventListener('click', () => {
        vscode.postMessage({
            type: 'clearChat'
        });
    });
    
    // Send message to extension
    function sendMessage() {
        if (!chatInput || !queryModeSelect) return;
        
        const message = chatInput.value.trim();
        if (message) {
            const mode = queryModeSelect.value;
            
            vscode.postMessage({
                type: 'sendMessage',
                message: message,
                mode: mode
            });
            
            // Clear input
            chatInput.value = '';
            chatInput.style.height = '';
            chatInput.focus();
        }
    }
    
    // Format code blocks in markdown
    function formatMarkdown(text) {
        // Handle code blocks (```code```)
        text = text.replace(/```([\s\S]*?)```/g, function(match, code) {
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        });
        
        // Handle inline code (`code`)
        text = text.replace(/`([^`]+)`/g, function(match, code) {
            return `<code class="inline-code">${escapeHtml(code)}</code>`;
        });
        
        // Handle bold (**text**)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic (*text*)
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Handle links [text](url)
        text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Handle headers
        text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        // Handle lists
        text = text.replace(/^- (.*?)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        
        // Handle line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
    
    // Escape HTML special characters
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Render chat messages
    function renderMessages() {
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        
        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${msg.role}`;
            
            // Create avatar
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            
            if (msg.role === 'user') {
                avatar.innerHTML = '<i class="codicon codicon-account"></i>';
            } else {
                avatar.innerHTML = '<i class="codicon codicon-hubot"></i>';
            }
            
            // Create message content
            const content = document.createElement('div');
            content.className = 'content';
            
            // Format message content with markdown
            content.innerHTML = formatMarkdown(msg.content);
            
            // Add sources if available
            if (msg.sources && msg.sources.length > 0) {
                const sourcesElement = document.createElement('div');
                sourcesElement.className = 'sources';
                sourcesElement.innerHTML = '<h4>Sources:</h4>';
                
                const sourcesList = document.createElement('ul');
                msg.sources.forEach(source => {
                    const sourceItem = document.createElement('li');
                    sourceItem.innerHTML = `<a href="${source.url}">${source.title}</a>`;
                    sourcesList.appendChild(sourceItem);
                });
                
                sourcesElement.appendChild(sourcesList);
                content.appendChild(sourcesElement);
            }
            
            // Add timestamp
            const timestamp = document.createElement('div');
            timestamp.className = 'timestamp';
            
            const date = new Date(msg.timestamp);
            timestamp.textContent = date.toLocaleTimeString();
            
            // Assemble message
            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
            messageElement.appendChild(timestamp);
            
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Handle messages from the extension
    window.addEventListener('message', event => {
        const message = event.data;
        
        switch (message.type) {
            case 'updateChat':
                messages = message.messages;
                renderMessages();
                break;
                
            case 'typingIndicator':
                if (message.isTyping && typingIndicator) {
                    typingIndicator.classList.remove('hidden');
                } else if (typingIndicator) {
                    typingIndicator.classList.add('hidden');
                }
                break;
        }
    });
})();
