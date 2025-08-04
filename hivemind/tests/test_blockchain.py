"""
Tests for the HiveMind Copilot blockchain components
"""
import os
import pytest
from unittest.mock import patch, MagicMock, Mock

# Mock all Hedera SDK components before importing
with patch.dict('sys.modules', {
    'hedera': Mock(),
    'hedera.Client': Mock(),
    'hedera.AccountId': Mock(),
    'hedera.PrivateKey': Mock(),
    'hedera.FileCreateTransaction': Mock(),
    'hedera.ContractCreateTransaction': Mock(),
    'hedera.ContractExecuteTransaction': Mock(),
    'hedera.ContractFunctionParameters': Mock(),
    'hedera.TopicCreateTransaction': Mock(),
    'hedera.TopicMessageSubmitTransaction': Mock(),
    'hedera.FileId': Mock(),
    'hedera.Hbar': Mock(),
}):
    from src.blockchain.hedera_client import HederaClient

class TestHederaClient:
    """Tests for the HederaClient class"""
    
    @pytest.fixture
    def mock_env(self, monkeypatch):
        """Set up mock environment variables"""
        monkeypatch.setenv("HEDERA_NETWORK", "testnet")
        monkeypatch.setenv("HEDERA_ACCOUNT_ID", "0.0.12345")
        monkeypatch.setenv("HEDERA_PRIVATE_KEY", "mock_private_key")
    
    @patch("src.blockchain.hedera_client.Client")
    def test_init_testnet(self, mock_client, mock_env):
        """Test client initialization with testnet"""
        # Create client
        client = HederaClient()
        
        # Verify mocks were called correctly
        mock_client.forTestnet.assert_called_once()
        mock_client.forTestnet.return_value.setOperator.assert_called_once_with(
            "0.0.12345", "mock_private_key"
        )
    
    @patch("src.blockchain.hedera_client.Client")
    def test_init_mainnet(self, mock_client):
        """Test client initialization with mainnet"""
        # Set environment variable
        os.environ["HEDERA_NETWORK"] = "mainnet"
        os.environ["HEDERA_ACCOUNT_ID"] = "0.0.12345"
        os.environ["HEDERA_PRIVATE_KEY"] = "mock_private_key"
        
        # Create client
        client = HederaClient()
        
        # Verify mocks were called correctly
        mock_client.forMainnet.assert_called_once()
        mock_client.forMainnet.return_value.setOperator.assert_called_once_with(
            "0.0.12345", "mock_private_key"
        )
        
        # Reset environment variable
        os.environ["HEDERA_NETWORK"] = "testnet"
    
    @patch("src.blockchain.hedera_client.Client")
    def test_init_invalid_network(self, mock_client):
        """Test client initialization with invalid network"""
        # Set environment variable
        os.environ["HEDERA_NETWORK"] = "invalid"
        
        # Verify exception is raised
        with pytest.raises(ValueError):
            client = HederaClient()
        
        # Reset environment variable
        os.environ["HEDERA_NETWORK"] = "testnet"
    
    @patch("src.blockchain.hedera_client.Client")
    @patch("src.blockchain.hedera_client.TopicCreateTransaction")
    @patch("src.blockchain.hedera_client.Ed25519PrivateKey")
    def test_create_topic(self, mock_key, mock_transaction, mock_client, mock_env):
        """Test topic creation"""
        # Set up mocks
        mock_transaction.return_value.setTopicMemo.return_value.setSubmitKey.return_value = MagicMock()
        mock_transaction.return_value.setTopicMemo.return_value.setSubmitKey.return_value.execute.return_value = MagicMock()
        mock_transaction.return_value.setTopicMemo.return_value.setSubmitKey.return_value.execute.return_value.getReceipt.return_value = MagicMock(
            topicId=MagicMock(toString=MagicMock(return_value="0.0.topic123"))
        )
        
        # Create client
        client = HederaClient()
        
        # Call create_topic
        topic_id = client.create_topic("Test Topic")
        
        # Verify result
        assert topic_id == "0.0.topic123"
        
        # Verify mocks were called correctly
        mock_transaction.assert_called_once()
        mock_transaction.return_value.setTopicMemo.assert_called_once_with("Test Topic")
    
    @patch("src.blockchain.hedera_client.Client")
    @patch("src.blockchain.hedera_client.TopicMessageSubmitTransaction")
    def test_submit_message(self, mock_transaction, mock_client, mock_env):
        """Test message submission"""
        # Set up mocks
        mock_transaction.return_value.setTopicId.return_value.setMessage.return_value = MagicMock()
        mock_transaction.return_value.setTopicId.return_value.setMessage.return_value.execute.return_value = MagicMock()
        mock_transaction.return_value.setTopicId.return_value.setMessage.return_value.execute.return_value.getReceipt.return_value = MagicMock()
        mock_transaction.return_value.setTopicId.return_value.setMessage.return_value.execute.return_value.transactionId = MagicMock(
            toString=MagicMock(return_value="0.0.txid123")
        )
        
        # Create client
        client = HederaClient()
        
        # Call submit_message
        tx_id = client.submit_message("0.0.topic123", {"key": "value"})
        
        # Verify result
        assert tx_id == "0.0.txid123"
        
        # Verify mocks were called correctly
        mock_transaction.assert_called_once()
        mock_transaction.return_value.setTopicId.assert_called_once_with("0.0.topic123")
    
    @patch("src.blockchain.hedera_client.Client")
    @patch("src.blockchain.hedera_client.ContractCreateTransaction")
    def test_deploy_contract(self, mock_transaction, mock_client, mock_env):
        """Test contract deployment"""
        # Set up mocks
        mock_transaction.return_value.setBytecode.return_value = MagicMock()
        mock_transaction.return_value.setBytecode.return_value.setGas.return_value = MagicMock()
        mock_transaction.return_value.setBytecode.return_value.setGas.return_value.execute.return_value = MagicMock()
        mock_transaction.return_value.setBytecode.return_value.setGas.return_value.execute.return_value.getReceipt.return_value = MagicMock(
            contractId=MagicMock(toString=MagicMock(return_value="0.0.contract123"))
        )
        
        # Create client
        client = HederaClient()
        
        # Call deploy_contract
        contract_id = client.deploy_contract("0xbytecode")
        
        # Verify result
        assert contract_id == "0.0.contract123"
        
        # Verify mocks were called correctly
        mock_transaction.assert_called_once()
        mock_transaction.return_value.setBytecode.assert_called_once_with("0xbytecode")
        mock_transaction.return_value.setBytecode.return_value.setGas.assert_called_once_with(500_000)
