#!/usr/bin/env python3
"""
Test script for interacting with the Hedera contract registry
"""
import os
import sys
import json
import logging
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("contract_registry_test")

# Load environment variables
load_dotenv()

# API endpoint
API_URL = "http://localhost:8000"

def test_health():
    """Test the API health endpoint"""
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            logger.info("✅ API health check successful")
            return True
        else:
            logger.error(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ API health check error: {str(e)}")
        return False

def test_contract_registry():
    """Test contract registry interaction"""
    try:
        # Get contract registry ID from environment
        contract_registry_id = os.getenv("HEDERA_CONTRACT_REGISTRY_ID")
        if not contract_registry_id:
            logger.error("❌ HEDERA_CONTRACT_REGISTRY_ID not set in environment")
            return False
        
        logger.info(f"Using contract registry ID: {contract_registry_id}")
        
        # Create payload for registry query
        payload = {
            "registry_id": contract_registry_id,
            "action": "get_contracts"
        }
        
        logger.info(f"Querying contract registry {contract_registry_id}...")
        response = requests.post(f"{API_URL}/api/v1/registry", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Contract registry query successful")
            logger.info(f"Registered contracts: {json.dumps(result, indent=2)}")
            return True
        else:
            logger.error(f"❌ Contract registry query failed: {response.status_code}")
            logger.error(response.text)
            return False
    except Exception as e:
        logger.error(f"❌ Contract registry error: {str(e)}")
        return False

def test_environment_variables():
    """Test if all required environment variables are set"""
    required_vars = [
        "HEDERA_ACCOUNT_ID",
        "HEDERA_PRIVATE_KEY",
        "HEDERA_NETWORK",
        "HEDERA_MIRROR_NODE_URL",
        "HEDERA_CONTRACT_REGISTRY_ID",
        "HEDERA_TESTNET_RPC_URL"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    else:
        logger.info("✅ All required environment variables are set")
        
        # Print values for verification
        logger.info(f"HEDERA_ACCOUNT_ID: {os.getenv('HEDERA_ACCOUNT_ID')}")
        logger.info(f"HEDERA_NETWORK: {os.getenv('HEDERA_NETWORK')}")
        logger.info(f"HEDERA_MIRROR_NODE_URL: {os.getenv('HEDERA_MIRROR_NODE_URL')}")
        logger.info(f"HEDERA_CONTRACT_REGISTRY_ID: {os.getenv('HEDERA_CONTRACT_REGISTRY_ID')}")
        logger.info(f"HEDERA_TESTNET_RPC_URL: {os.getenv('HEDERA_TESTNET_RPC_URL')}")
        
        return True

def main():
    """Run all tests"""
    logger.info("Starting contract registry tests...")
    
    # Test API health
    if not test_health():
        logger.error("API health check failed, stopping tests")
        return
    
    # Test environment variables
    logger.info("\nTesting environment variables...")
    if not test_environment_variables():
        logger.warning("Environment variable check failed, but continuing with tests")
    
    # Test contract registry
    logger.info("\nTesting contract registry...")
    test_contract_registry()
    
    logger.info("\nAll tests completed!")

if __name__ == "__main__":
    main()
