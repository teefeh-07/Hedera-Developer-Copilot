# HiveMind Chat Interface Testing Guide

This guide provides instructions for testing the HiveMind Copilot chat interface using the mock API service.

## Prerequisites

- VS Code with the HiveMind Copilot extension loaded in development mode
- The extension should be using the mock API service for testing

## Testing Steps

### 1. Run the Manual Chat Test

1. Open the Command Palette (`Cmd+Shift+P` on macOS)
2. Type and select `HiveMind: Test Chat Interface`
3. This will:
   - Focus the HiveMind sidebar
   - Open the Chat view
   - Display testing instructions in the console

### 2. Verify Chat Interface Functionality

After running the test command, verify the following:

- **Chat UI Rendering**: The chat interface should appear in the sidebar with proper styling
- **Message Input**: You can type messages in the input field at the bottom
- **Message Sending**: When you send a message, it appears in the chat history
- **Typing Indicator**: A typing indicator should appear while waiting for a response
- **Response Rendering**: The mock API response should appear in the chat with proper markdown formatting
- **Documentation Mode**: Test the documentation query mode by clicking the "Documentation" button before sending a message

### 3. Expected Behavior with Mock API

The mock API service provides simulated responses:

- **Chat Completion**: Returns a formatted response with code examples after a short delay
- **Documentation Query**: Returns documentation information with source references after a short delay

### 4. Testing Edge Cases

- Try sending an empty message (should be prevented)
- Try sending very long messages
- Test markdown rendering with code blocks, lists, and links
- Test the clear chat functionality

## Troubleshooting

If the chat interface doesn't appear:
1. Check the VS Code Developer Tools console for errors (`Help > Toggle Developer Tools`)
2. Verify that the mock API service is being used by checking console logs
3. Try reloading the window (`Developer: Reload Window` in the command palette)

## Next Steps

After verifying the chat interface works with the mock API:
1. Fix any remaining TypeScript errors in the codebase
2. Connect to the real backend API when available
3. Add more comprehensive automated tests
