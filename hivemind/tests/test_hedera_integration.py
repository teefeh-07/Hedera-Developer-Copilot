#!/usr/bin/env python3
"""
Test script for Hedera integration with HiveMind Copilot API
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
logger = logging.getLogger("hedera_integration_test")

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

def test_code_generation():
    """Test code generation endpoint"""
    try:
        prompt = "Create a simple ERC20 token contract with mint and burn functions"
        payload = {
            "prompt": prompt,
            "language": "solidity"
        }
        response = requests.post(f"{API_URL}/api/v1/generate", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Code generation successful")
            logger.info(f"Generated code snippet: {result['code'][:100]}...")
            return True
        else:
            logger.error(f"❌ Code generation failed: {response.status_code}")
            logger.error(response.text)
            return False
    except Exception as e:
        logger.error(f"❌ Code generation error: {str(e)}")
        return False

def test_code_analysis():
    """Test code analysis endpoint"""
    try:
        code = """
        pragma solidity ^0.8.0;

        contract SimpleStorage {
            uint256 private value;
            mapping(address => uint256) public userValues;
            
            event ValueChanged(uint256 newValue);
            
            function setValue(uint256 newValue) public {
                value = newValue;
                userValues[msg.sender] = newValue;
                emit ValueChanged(newValue);
            }
            
            function getValue() public view returns (uint256) {
                return value;
            }
            
            function getUserValue(address user) public view returns (uint256) {
                return userValues[user];
            }
        }
        """
        
        payload = {
            "code": code,
            "language": "solidity"
        }
        response = requests.post(f"{API_URL}/api/v1/analyze", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Code analysis successful")
            logger.info(f"Analysis result: {json.dumps(result, indent=2)}")
            return True
        else:
            logger.error(f"❌ Code analysis failed: {response.status_code}")
            logger.error(response.text)
            return False
    except Exception as e:
        logger.error(f"❌ Code analysis error: {str(e)}")
        return False

def test_security_audit():
    """Test security audit endpoint"""
    try:
        code = """
        pragma solidity ^0.8.0;

        contract SimpleStorage {
            uint256 private value;
            mapping(address => uint256) public userValues;
            
            event ValueChanged(uint256 newValue);
            
            function setValue(uint256 newValue) public {
                value = newValue;
                userValues[msg.sender] = newValue;
                emit ValueChanged(newValue);
            }
            
            function getValue() public view returns (uint256) {
                return value;
            }
            
            function getUserValue(address user) public view returns (uint256) {
                return userValues[user];
            }
        }
        """
        
        payload = {
            "code": code
        }
        response = requests.post(f"{API_URL}/api/v1/audit", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Security audit successful")
            logger.info(f"Audit result: {json.dumps(result, indent=2)}")
            return True
        else:
            logger.error(f"❌ Security audit failed: {response.status_code}")
            logger.error(response.text)
            return False
    except Exception as e:
        logger.error(f"❌ Security audit error: {str(e)}")
        return False

def test_hedera_environment():
    """Test Hedera environment variables"""
    required_vars = [
        "HEDERA_ACCOUNT_ID",
        "HEDERA_PRIVATE_KEY",
        "HEDERA_NETWORK",
        "HEDERA_MIRROR_NODE_URL",
        "HEDERA_CONTRACT_REGISTRY_ID",
        "HEDERA_TESTNET_RPC_URL"
    ]
    
    all_present = True
    for var in required_vars:
        value = os.getenv(var)
        if value:
            logger.info(f"✅ {var} is set: {value[:5]}{'*' * 10 if len(value) > 5 else ''}")
        else:
            logger.error(f"❌ {var} is not set")
            all_present = False
    
    return all_present

def main():
    """Run all tests"""
    logger.info("Starting Hedera integration tests...")
    
    # Test API health
    if not test_health():
        logger.error("API health check failed, stopping tests")
        return
    
    # Test Hedera environment variables
    logger.info("\nTesting Hedera environment variables...")
    test_hedera_environment()
    
    # Test code generation
    logger.info("\nTesting code generation...")
    test_code_generation()
    
    # Test code analysis
    logger.info("\nTesting code analysis...")
    test_code_analysis()
    
    # Test security audit
    logger.info("\nTesting security audit...")
    test_security_audit()
    
    logger.info("\nAll tests completed!")

if __name__ == "__main__":
    main()
