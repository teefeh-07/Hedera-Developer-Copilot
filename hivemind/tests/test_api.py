"""
Tests for the HiveMind Copilot API endpoints
"""
import json
import pytest
from fastapi.testclient import TestClient

# Sample Solidity code for testing
SAMPLE_CONTRACT = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    
    function setValue(uint256 newValue) public {
        value = newValue;
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
}
"""

def test_health_check(test_client):
    """Test the health check endpoint"""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_root_endpoint(test_client):
    """Test the root endpoint"""
    response = test_client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()
    assert "documentation" in response.json()

def test_generate_code(test_client, mock_ai_engine):
    """Test the code generation endpoint"""
    data = {
        "prompt": "Create a simple ERC20 token",
        "language": "solidity"
    }
    
    response = test_client.post("/api/v1/generate", json=data)
    
    assert response.status_code == 200
    assert "code" in response.json()
    # Just check that we got some code back, regardless of format
    assert len(response.json()["code"]) > 0

def test_analyze_code(test_client, mock_ai_engine):
    """Test the code analysis endpoint"""
    data = {
        "code": SAMPLE_CONTRACT,
        "language": "solidity"
    }
    
    response = test_client.post("/api/v1/analyze", json=data)
    
    assert response.status_code == 200
    assert "analysis" in response.json()

def test_deploy_contract(test_client, mock_orchestrator):
    """Test the contract deployment endpoint"""
    data = {
        "code": SAMPLE_CONTRACT,
        "constructor_params": None
    }
    
    response = test_client.post("/api/v1/deploy", json=data)
    
    assert response.status_code == 200
    assert "contract_address" in response.json()
    assert "transaction_hash" in response.json()
    assert "block_number" in response.json()
    assert "gas_used" in response.json()

def test_security_audit(test_client, mock_orchestrator):
    """Test the security audit endpoint"""
    data = {
        "code": SAMPLE_CONTRACT
    }
    
    response = test_client.post("/api/v1/audit", json=data)
    
    assert response.status_code == 200
    assert "static_analysis" in response.json()
    assert "ai_analysis" in response.json()

def test_agent_collaboration(test_client, mock_orchestrator):
    """Test the agent collaboration endpoint"""
    data = {
        "contract_address": "0.0.1234"
    }
    
    response = test_client.post("/api/v1/collaborate", json=data)
    
    assert response.status_code == 200
    assert "vulnerabilities" in response.json()
    assert "severity" in response.json()
    assert "recommendations" in response.json()

def test_contract_registry(test_client, mock_orchestrator):
    """Test the contract registry endpoint"""
    data = {
        "registry_id": "0.0.5678",
        "action": "get_contracts"
    }
    
    response = test_client.post("/api/v1/registry", json=data)
    
    assert response.status_code == 200
    assert "result" in response.json()
    assert "status" in response.json()

def test_chat_completion(test_client, mock_ai_engine):
    """Test the chat completion endpoint"""
    data = {
        "message": "How do I create a smart contract on Hedera?",
        "context": "blockchain development",
        "max_tokens": 500
    }
    
    response = test_client.post("/api/v1/chat", json=data)
    
    assert response.status_code == 200
    assert "response" in response.json()
    assert "sources" in response.json()
    assert "tokens_used" in response.json()
    assert isinstance(response.json()["sources"], list)
    assert isinstance(response.json()["tokens_used"], int)

def test_compile_contract(test_client, mock_orchestrator):
    """Test the contract compilation endpoint"""
    data = {
        "code": SAMPLE_CONTRACT,
        "contract_name": "SimpleStorage",
        "optimize": True,
        "optimizer_runs": 200
    }
    
    response = test_client.post("/api/v1/compile", json=data)
    
    assert response.status_code == 200
    assert "success" in response.json()
    assert "bytecode" in response.json()
    assert "abi" in response.json()
    assert "errors" in response.json()
    assert "warnings" in response.json()
    assert isinstance(response.json()["errors"], list)
    assert isinstance(response.json()["warnings"], list)

def test_query_documentation(test_client, mock_ai_engine):
    """Test the documentation query endpoint"""
    data = {
        "query": "How to deploy a contract to Hedera testnet?",
        "context": "smart contract deployment",
        "max_results": 3
    }
    
    response = test_client.post("/api/v1/docs", json=data)
    
    assert response.status_code == 200
    assert "answer" in response.json()
    assert "sources" in response.json()
    assert "confidence" in response.json()
    assert isinstance(response.json()["sources"], list)
    assert isinstance(response.json()["confidence"], (int, float))

def test_analyze_code_with_tests(test_client, mock_ai_engine):
    """Test the code analysis endpoint with test generation"""
    data = {
        "code": SAMPLE_CONTRACT,
        "language": "solidity",
        "generate_tests": True
    }
    
    response = test_client.post("/api/v1/analyze", json=data)
    
    assert response.status_code == 200
    assert "analysis" in response.json()
    assert "tests" in response.json()
    assert response.json()["tests"] is not None

def test_compile_contract_with_errors(test_client, mock_orchestrator):
    """Test contract compilation with invalid code"""
    data = {
        "code": "invalid solidity code",
        "contract_name": "InvalidContract"
    }
    
    response = test_client.post("/api/v1/compile", json=data)
    
    assert response.status_code == 200
    assert "success" in response.json()
    assert "errors" in response.json()
    # Should have compilation errors for invalid code
    assert len(response.json()["errors"]) > 0

def test_chat_completion_minimal(test_client, mock_ai_engine):
    """Test chat completion with minimal parameters"""
    data = {
        "message": "Hello, HiveMind!"
    }
    
    response = test_client.post("/api/v1/chat", json=data)
    
    assert response.status_code == 200
    assert "response" in response.json()
    assert len(response.json()["response"]) > 0
