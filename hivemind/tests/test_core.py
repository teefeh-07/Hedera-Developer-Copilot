"""
Tests for the HiveMind Copilot core components
"""
import os
import pytest
from unittest.mock import patch, MagicMock

from src.core.orchestrator import HiveMindOrchestrator
from src.core.ai_engine import AIEngine

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

class TestOrchestrator:
    """Tests for the HiveMindOrchestrator class"""
    
    @pytest.fixture
    def mock_env(self, monkeypatch):
        """Set up mock environment variables"""
        monkeypatch.setenv("TESTNET_RPC", "https://testnet.hashio.io/api")
        monkeypatch.setenv("HEDERA_ACCOUNT_ID", "0.0.12345")
        monkeypatch.setenv("HEDERA_PRIVATE_KEY", "mock_private_key")
        monkeypatch.setenv("GROQ_API_KEY", "mock_groq_key")
    
    @patch("src.core.orchestrator.Web3")
    @patch("src.core.orchestrator.Client")
    @patch("src.core.orchestrator.groq.Client")
    def test_init(self, mock_groq, mock_hedera, mock_web3, mock_env):
        """Test orchestrator initialization"""
        # Set up mocks
        mock_hedera.forTestnet.return_value.setOperator.return_value = MagicMock()
        
        # Create orchestrator
        orchestrator = HiveMindOrchestrator()
        
        # Verify mocks were called correctly
        mock_web3.HTTPProvider.assert_called_once_with("https://testnet.hashio.io/api")
        mock_hedera.forTestnet.assert_called_once()
        mock_hedera.forTestnet.return_value.setOperator.assert_called_once_with(
            "0.0.12345", "mock_private_key"
        )
        mock_groq.assert_called_once_with(api_key="mock_groq_key")
    
    @patch("src.core.orchestrator.Web3")
    @patch("src.core.orchestrator.Client")
    @patch("src.core.orchestrator.groq.Client")
    def test_security_audit(self, mock_groq, mock_hedera, mock_web3, mock_env):
        """Test security audit functionality"""
        # Set up mocks
        mock_hedera.forTestnet.return_value.setOperator.return_value = MagicMock()
        mock_groq.return_value.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Mock AI analysis"))]
        )
        
        # Create orchestrator
        orchestrator = HiveMindOrchestrator()
        
        # Call security_audit
        result = orchestrator.security_audit(SAMPLE_CONTRACT)
        
        # Verify result structure
        assert "static_analysis" in result
        assert "ai_analysis" in result
        assert result["ai_analysis"] == "Mock AI analysis"
        
        # Verify groq was called correctly
        mock_groq.return_value.chat.completions.create.assert_called_once()


class TestAIEngine:
    """Tests for the AIEngine class"""
    
    @pytest.fixture
    def mock_env(self, monkeypatch):
        """Set up mock environment variables"""
        monkeypatch.setenv("GROQ_API_KEY", "mock_groq_key")
        monkeypatch.setenv("CODEX_MODEL", "codellama-70b")
        monkeypatch.setenv("DEBUG_MODEL", "claude-3-haiku")
    
    @patch("src.core.ai_engine.groq.Client")
    def test_init(self, mock_groq, mock_env):
        """Test AI engine initialization"""
        # Create AI engine
        ai_engine = AIEngine()
        
        # Verify mocks were called correctly
        mock_groq.assert_called_once_with(api_key="mock_groq_key")
        assert ai_engine.codex_model == "codellama-70b"
        assert ai_engine.debug_model == "claude-3-haiku"
    
    @patch("src.core.ai_engine.groq.Client")
    def test_generate_code(self, mock_groq, mock_env):
        """Test code generation functionality"""
        # Set up mocks
        mock_groq.return_value.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="// Generated code"))]
        )
        
        # Create AI engine
        ai_engine = AIEngine()
        
        # Call generate_code
        result = ai_engine.generate_code("Create a simple token", "solidity")
        
        # Verify result
        assert result == "// Generated code"
        
        # Verify groq was called correctly
        mock_groq.return_value.chat.completions.create.assert_called_once()
    
    @patch("src.core.ai_engine.groq.Client")
    def test_analyze_code(self, mock_groq, mock_env):
        """Test code analysis functionality"""
        # Set up mocks
        mock_groq.return_value.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Mock analysis"))]
        )
        
        # Create AI engine
        ai_engine = AIEngine()
        
        # Call analyze_code
        result = ai_engine.analyze_code(SAMPLE_CONTRACT, "solidity")
        
        # Verify result
        assert "analysis" in result
        assert result["analysis"] == "Mock analysis"
        
        # Verify groq was called correctly
        mock_groq.return_value.chat.completions.create.assert_called_once()
