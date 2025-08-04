/**
 * Test script for HiveMind Copilot frontend configuration
 * This script verifies that the frontend can connect to the backend API and Hedera network
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from backend .env file
const envPath = path.resolve(__dirname, '../hivemind/.env');
dotenv.config({ path: envPath });

// Configuration values
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8000',
  hederaAccountId: process.env.HEDERA_ACCOUNT_ID,
  hederaPrivateKey: process.env.HEDERA_PRIVATE_KEY,
  hederaNetwork: process.env.HEDERA_NETWORK || 'testnet',
  hederaMirrorNodeUrl: process.env.HEDERA_MIRROR_NODE_URL,
  hederaContractRegistryId: process.env.HEDERA_CONTRACT_REGISTRY_ID,
  hederaTestnetRpcUrl: process.env.HEDERA_TESTNET_RPC_URL
};

// Create VS Code settings file
function createVSCodeSettings() {
  const settingsDir = path.join(__dirname, '.vscode');
  const settingsPath = path.join(settingsDir, 'settings.json');
  
  // Create .vscode directory if it doesn't exist
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  
  // Create or update settings.json
  const settings = {
    "hivemind.apiBaseUrl": config.apiBaseUrl,
    "hivemind.hederaAccountId": config.hederaAccountId,
    "hivemind.hederaPrivateKey": config.hederaPrivateKey,
    "hivemind.hederaNetwork": config.hederaNetwork,
    "hivemind.hederaTopicId": "", // Optional
    "hivemind.contractRegistryAddress": config.hederaContractRegistryId,
    "hivemind.rpcUrl": config.hederaTestnetRpcUrl
  };
  
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log(`✅ VS Code settings created at ${settingsPath}`);
  console.log(JSON.stringify(settings, null, 2));
}

// Test API connection
async function testApiConnection() {
  try {
    console.log(`Testing API connection to ${config.apiBaseUrl}/health...`);
    const response = await axios.get(`${config.apiBaseUrl}/health`);
    console.log(`✅ API connection successful: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error(`❌ API connection failed: ${error.message}`);
    return false;
  }
}

// Test code generation endpoint
async function testCodeGeneration() {
  try {
    console.log(`Testing code generation endpoint...`);
    const prompt = "Create a simple ERC20 token contract with mint and burn functions";
    const payload = {
      prompt: prompt,
      language: "solidity"
    };
    
    const response = await axios.post(`${config.apiBaseUrl}/api/v1/generate`, payload);
    console.log(`✅ Code generation successful`);
    console.log(`Generated code snippet: ${response.data.code.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.error(`❌ Code generation failed: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log("HiveMind Copilot Frontend Configuration Test");
  console.log("===========================================");
  
  // Check environment variables
  console.log("\nEnvironment Variables:");
  console.log(`API Base URL: ${config.apiBaseUrl}`);
  console.log(`Hedera Account ID: ${config.hederaAccountId}`);
  console.log(`Hedera Private Key: ${config.hederaPrivateKey ? '********' : 'Not set'}`);
  console.log(`Hedera Network: ${config.hederaNetwork}`);
  console.log(`Hedera Mirror Node URL: ${config.hederaMirrorNodeUrl}`);
  console.log(`Hedera Contract Registry ID: ${config.hederaContractRegistryId}`);
  console.log(`Hedera Testnet RPC URL: ${config.hederaTestnetRpcUrl}`);
  
  // Create VS Code settings
  createVSCodeSettings();
  
  // Test API connection
  await testApiConnection();
  
  // Test code generation
  await testCodeGeneration();
  
  console.log("\nTest completed!");
}

// Run the main function
main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
