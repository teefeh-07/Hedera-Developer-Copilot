#!/usr/bin/env python3
"""
Test script for deploying a smart contract to Hedera Testnet
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
logger = logging.getLogger("contract_deployment_test")

# Load environment variables
load_dotenv()

# API endpoint
API_URL = "http://localhost:8000"

# Simple ERC20 token contract
SAMPLE_CONTRACT = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10**uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
"""

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

def test_contract_audit():
    """Test contract security audit before deployment"""
    try:
        payload = {
            "code": SAMPLE_CONTRACT
        }
        response = requests.post(f"{API_URL}/api/v1/audit", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Contract audit successful")
            logger.info(f"Audit result summary: {json.dumps(result, indent=2)[:500]}...")
            return True
        else:
            logger.error(f"❌ Contract audit failed: {response.status_code}")
            logger.error(response.text)
            return False
    except Exception as e:
        logger.error(f"❌ Contract audit error: {str(e)}")
        return False

def test_contract_deployment():
    """Test contract deployment to Hedera Testnet"""
    try:
        # Contract deployment parameters
        constructor_params = {
            "name": "TestToken",
            "symbol": "TST",
            "decimals": 18,
            "initialSupply": 1000
        }
        
        payload = {
            "code": SAMPLE_CONTRACT,
            "constructor_params": constructor_params,
            "gas_limit": 4000000,
            "initial_hbar": 0
        }
        
        logger.info("Deploying contract to Hedera Testnet...")
        response = requests.post(f"{API_URL}/api/v1/deploy", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Contract deployment successful")
            logger.info(f"Contract ID: {result.get('contract_id')}")
            logger.info(f"Transaction ID: {result.get('transaction_id')}")
            logger.info(f"Gas used: {result.get('gas_used')}")
            return result
        else:
            logger.error(f"❌ Contract deployment failed: {response.status_code}")
            logger.error(response.text)
            return None
    except Exception as e:
        logger.error(f"❌ Contract deployment error: {str(e)}")
        return None

def test_contract_registry():
    """Test contract registry interaction"""
    try:
        # Get contract registry ID from environment
        contract_registry_id = os.getenv("HEDERA_CONTRACT_REGISTRY_ID")
        if not contract_registry_id:
            logger.error("❌ HEDERA_CONTRACT_REGISTRY_ID not set in environment")
            return False
        
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

def main():
    """Run all tests"""
    logger.info("Starting contract deployment tests...")
    
    # Test API health
    if not test_health():
        logger.error("API health check failed, stopping tests")
        return
    
    # Test contract audit
    logger.info("\nTesting contract security audit...")
    if not test_contract_audit():
        logger.warning("Contract audit failed, but continuing with deployment")
    
    # Test contract deployment
    logger.info("\nTesting contract deployment...")
    deployment_result = test_contract_deployment()
    
    if deployment_result:
        # Test contract registry
        logger.info("\nTesting contract registry...")
        test_contract_registry()
    
    logger.info("\nAll tests completed!")

if __name__ == "__main__":
    main()
