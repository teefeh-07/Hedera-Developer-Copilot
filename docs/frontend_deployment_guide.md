# HiveMind Copilot VSCode Extension Deployment Guide

This guide provides step-by-step instructions for building, packaging, and deploying the HiveMind Copilot VSCode extension for Hedera developers.

## Prerequisites

- Node.js 16+ and npm installed
- Visual Studio Code
- VSCode Extension Manager (`vsce`) - for packaging
- Git

## Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/hivemind-copilot.git
cd hivemind-copilot/frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Backend URL

The extension connects to the backend API. By default, it uses `http://localhost:8000`. To change this:

1. Open `package.json`
2. Locate the `configuration` section
3. Update the default value for `hivemindCopilot.apiUrl`

Alternatively, users can configure this in their VSCode settings.

### Step 4: Build the Extension

```bash
npm run compile
```

This will compile the TypeScript code and bundle it using webpack.

### Step 5: Test the Extension Locally

1. Press F5 in VSCode to launch a new Extension Development Host window
2. The extension should appear in the activity bar
3. Click on the HiveMind Copilot icon to open the sidebar

## Packaging the Extension

### Step 1: Install VSCE

```bash
npm install -g @vscode/vsce
```

### Step 2: Package the Extension

```bash
cd frontend
vsce package
```

This will create a `.vsix` file in the current directory.

## Distribution Options

### Option 1: Direct Installation

Users can install the extension directly from the `.vsix` file:

1. In VSCode, go to Extensions view (Ctrl+Shift+X)
2. Click on "..." at the top-right of the Extensions view
3. Select "Install from VSIX..."
4. Choose the generated `.vsix` file

### Option 2: Visual Studio Marketplace

To publish to the VSCode Marketplace:

1. Create a publisher account at https://marketplace.visualstudio.com/manage
2. Get a Personal Access Token (PAT) from Azure DevOps
3. Login with VSCE:
   ```bash
   vsce login <publisher-name>
   ```
4. Publish the extension:
   ```bash
   vsce publish
   ```

### Option 3: Private Extension Registry

For enterprise environments, you can set up a private extension registry:

1. Host the `.vsix` file on a web server or file share
2. Users can install via the URL or file path

## Configuration Options

### Extension Settings

Users can configure the extension through VSCode settings:

1. Go to File > Preferences > Settings
2. Search for "HiveMind Copilot"
3. Update the backend API URL as needed

### Advanced Configuration

For advanced configuration:

1. Create a `.hivemindrc` file in the user's project root
2. Add configuration options:
   ```json
   {
     "apiUrl": "https://your-backend-url",
     "defaultLanguage": "javascript",
     "testFramework": "jest"
   }
   ```

## Updating the Extension

To update the extension:

1. Make code changes
2. Increment the version in `package.json`
3. Rebuild and package the extension:
   ```bash
   npm run compile
   vsce package
   ```
4. If published to the marketplace, publish the update:
   ```bash
   vsce publish
   ```

## Troubleshooting

### Common Issues

1. **Backend Connection Errors**:
   - Verify the backend server is running
   - Check the API URL configuration
   - Ensure network connectivity between VSCode and the backend

2. **Extension Not Loading**:
   - Check VSCode Developer Tools (Help > Toggle Developer Tools)
   - Look for errors in the Console tab
   - Verify extension is properly activated

3. **Webpack Build Errors**:
   - Check for TypeScript errors
   - Ensure all dependencies are installed
   - Try clearing the `dist` directory and rebuilding

## Feature Configuration

The extension includes several features that can be configured:

### Code Generation

The code generation feature uses the backend LLM to generate Hedera-specific code. Configure:

- Default language
- Code style preferences
- Template options

### Debugging Assistant

The debugging assistant helps identify and fix common Hedera errors. Configure:

- Error patterns to recognize
- Automatic fix suggestions
- Mirror node integration

### Test Generation

Automatically generates tests for Hedera code. Configure:

- Test framework (Jest, Mocha)
- Test coverage requirements
- Test style preferences

### Knowledge Base Search

Searches Hedera documentation and resources. Configure:

- Search sources
- Result ranking
- Display options

## Security Considerations

1. **API Communication**: All communication with the backend should be secured in production
2. **User Code**: The extension processes user code; ensure proper isolation
3. **Authentication**: Consider adding authentication for the backend API

## Extension Architecture

Understanding the architecture helps with troubleshooting and customization:

1. **Extension Entry Point**: `src/extension.ts` - Registers commands and providers
2. **API Client**: `src/api-client.ts` - Handles communication with the backend
3. **Sidebar Provider**: `src/sidebar-provider.ts` - Manages the UI components
4. **Webview**: HTML/CSS/JS embedded in the sidebar provider - User interface

## Customization

To customize the extension:

1. **UI Customization**: Modify the HTML/CSS in the sidebar provider
2. **Feature Addition**: Add new message types and handlers
3. **Backend Integration**: Extend the API client for new endpoints
