# HiveMind Copilot Frontend

A VS Code extension for the HiveMind Copilot project that enables AI-powered decentralized agent collaboration for blockchain development.

## Features

- **Agent Hub**: Interact with AI agents for code generation, analysis, and optimization
- **Smart Contract Audit**: Analyze Solidity contracts for security vulnerabilities
- **Test Generation**: Generate comprehensive test suites for smart contracts
- **Contract Deployment**: Deploy and interact with smart contracts on Hedera
- **Agent Marketplace**: Discover and use specialized AI agents from the Hedera network
- **Transaction Center**: Track and manage blockchain transactions
- **Hedera Integration**: Seamless integration with Hedera Hashgraph blockchain

## Requirements

- Visual Studio Code 1.60.0 or higher
- Node.js 14.x or higher
- Hedera account credentials (for blockchain interactions)

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "HiveMind Copilot"
4. Click Install

### From VSIX File

1. Download the `.vsix` file from the releases page
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded file

### Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/hivemind-copilot.git
   cd hivemind-copilot/hivemind-frontend
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run compile
   ```

4. Launch the extension in development mode
   - Press F5 in VS Code to start debugging

## Configuration

HiveMind Copilot requires configuration for API and Hedera connectivity:

1. Open VS Code settings (File > Preferences > Settings)
2. Search for "HiveMind"
3. Configure the following settings:
   - `hivemind.apiBaseUrl`: URL of the HiveMind backend API
   - `hivemind.hederaAccountId`: Your Hedera account ID
   - `hivemind.hederaPrivateKey`: Your Hedera private key
   - `hivemind.hederaNetwork`: Hedera network (mainnet, testnet, previewnet)
   - `hivemind.rpcUrl`: RPC URL for the selected network

Alternatively, use the "Configure HiveMind Copilot" command from the command palette.

## Usage

### Commands

HiveMind Copilot provides the following commands (accessible via Command Palette - Ctrl+Shift+P):

- `HiveMind: Show Agent Hub`: Open the main interface for agent interaction
- `HiveMind: Audit Smart Contract`: Analyze the current Solidity file for vulnerabilities
- `HiveMind: Generate Tests`: Generate tests for the current Solidity file
- `HiveMind: Deploy Contract`: Deploy the current Solidity file to Hedera
- `HiveMind: Show Audit Dashboard`: View detailed audit results
- `HiveMind: Connect to Hedera`: Connect to the Hedera network
- `HiveMind: Configure HiveMind Copilot`: Open configuration UI

### Views

The extension adds the following views to VS Code:

- **Agent Explorer**: Browse and interact with available AI agents
- **Audit Dashboard**: View security vulnerabilities and fixes
- **Transaction Center**: Track blockchain transactions

### Workflow

1. Connect to Hedera using the status bar item or command
2. Open a Solidity file in the editor
3. Use the Agent Hub to generate or analyze code
4. Run security audits to identify vulnerabilities
5. Generate and apply fixes for security issues
6. Deploy contracts to Hedera
7. Interact with deployed contracts

## Architecture

The HiveMind Copilot frontend is built with a modular architecture:

- **Extension Core**: Main activation and command registration
- **Services**: API and blockchain interaction
- **Components**: UI panels and tree views
- **Webview UI**: React-based interface for rich interaction
- **Utilities**: Helper functions for configuration and code analysis

## Development

### Project Structure

```
hivemind-frontend/
├── src/
│   ├── extension/       # VS Code extension code
│   ├── components/      # UI components
│   ├── services/        # API and blockchain services
│   ├── utils/           # Utility functions
│   └── templates/       # HTML templates
├── webview/
│   ├── src/             # React components for webview
│   └── public/          # Static assets
├── media/               # Icons and images
├── package.json         # Extension manifest
├── tsconfig.json        # TypeScript configuration
└── webpack.config.js    # Build configuration
```

### Building

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package
```

### Testing

```bash
# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Hedera Hashgraph for blockchain infrastructure
- OpenAI for AI capabilities
- VS Code extension API
