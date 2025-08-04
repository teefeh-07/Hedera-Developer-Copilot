"""
Pytest configuration file for HiveMind Copilot tests
"""
import os
import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.core.orchestrator import HiveMindOrchestrator
from src.core.ai_engine import AIEngine
from src.blockchain.hedera_client import HederaClient

@pytest.fixture
def test_client():
    """
    Create a test client for the FastAPI application
    
    Returns:
        TestClient instance
    """
    return TestClient(app)

@pytest.fixture
def mock_orchestrator(monkeypatch):
    """
    Create a mock HiveMindOrchestrator for testing
    
    Args:
        monkeypatch: Pytest monkeypatch fixture
        
    Returns:
        Mock HiveMindOrchestrator instance
    """
    # Create a mock class that overrides the methods we'll test
    class MockOrchestrator(HiveMindOrchestrator):
        def __init__(self):
            # Skip the actual initialization to avoid external dependencies
            pass
            
        def deploy_contract(self, solidity_code):
            return {
                "contract_address": "0.0.1234",
                "transaction_hash": "0xabc123",
                "block_number": 123,
                "gas_used": 500000
            }
            
        def security_audit(self, solidity_code):
            return {
                "static_analysis": {
                    "reentrancy": ["Potential reentrancy in withdraw function"],
                    "integer-overflow": [],
                    "unchecked-calls": ["External call without check at line 42"]
                },
                "ai_analysis": "This contract has potential security issues..."
            }
            
        def agent_collaboration(self, contract_address):
            return {
                "vulnerabilities": ["reentrancy", "unchecked-calls"],
                "severity": "high",
                "recommendations": ["Implement checks-effects-interactions pattern"]
            }
        
        def interact_with_registry(self, registry_id, action, contract_id=None, metadata=None):
            return {
                "result": {"contracts": [{"id": "0.0.1234", "name": "TestContract"}]},
                "status": "success"
            }
        
        def compile_contract(self, code, contract_name=None, optimize=True, optimizer_runs=200):
            return {
                "success": True,
                "bytecode": "0x608060405234801561001057600080fd5b50...",
                "abi": [{"type": "function", "name": "test"}],
                "errors": [],
                "warnings": []
            }
    
    # Patch the get_orchestrator dependency in the API
    from src.api.router import get_orchestrator
    monkeypatch.setattr("src.api.router.get_orchestrator", lambda: MockOrchestrator())
    
    return MockOrchestrator()

@pytest.fixture
def mock_ai_engine(monkeypatch):
    """
    Create a mock AIEngine for testing
    
    Args:
        monkeypatch: Pytest monkeypatch fixture
        
    Returns:
        Mock AIEngine instance
    """
    # Create a mock class that overrides the methods we'll test
    class MockAIEngine(AIEngine):
        def __init__(self):
            # Skip the actual initialization to avoid external dependencies
            pass
            
        def generate_code(self, prompt, language="solidity"):
            return "// Generated code for: " + prompt
            
        def analyze_code(self, code, language="solidity"):
            return {"analysis": "Mock analysis of the provided code"}
            
        def generate_tests(self, code, language="solidity"):
            return "// Generated tests for the provided code"
        
        def chat_completion(self, message, context=None, max_tokens=1000):
            return {
                "response": f"Mock response to: {message}",
                "sources": ["Mock source 1", "Mock source 2"],
                "tokens_used": 150
            }
        
        def query_documentation(self, query, context=None, max_results=5):
            return {
                "answer": f"Mock documentation answer for: {query}",
                "sources": [
                    {"title": "Mock Doc 1", "url": "https://example.com/doc1", "snippet": "Mock snippet 1"},
                    {"title": "Mock Doc 2", "url": "https://example.com/doc2", "snippet": "Mock snippet 2"}
                ],
                "confidence": 0.85
            }
    
    # Patch the get_ai_engine dependency in the API
    from src.api.router import get_ai_engine
    monkeypatch.setattr("src.api.router.get_ai_engine", lambda: MockAIEngine())
    
    return MockAIEngine()

@pytest.fixture
def mock_hedera_client(monkeypatch):
    """
    Create a mock HederaClient for testing
    
    Args:
        monkeypatch: Pytest monkeypatch fixture
        
    Returns:
        Mock HederaClient instance
    """
    # Create a mock class that overrides the methods we'll test
    class MockHederaClient(HederaClient):
        def __init__(self):
            # Skip the actual initialization to avoid external dependencies
            pass
            
        def create_topic(self, memo="HiveMind Topic"):
            return "0.0.topic123"
            
        def submit_message(self, topic_id, message):
            return "0.0.txid123"
            
        def deploy_contract(self, bytecode, constructor_params=None):
            return "0.0.contract123"
    
    # Patch the get_hedera_client dependency in the API
    from src.api.router import get_hedera_client
    monkeypatch.setattr("src.api.router.get_hedera_client", lambda: MockHederaClient())
    
    return MockHederaClient()
