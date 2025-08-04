"""
Tests for the HiveMind Copilot blockchain components - Fixed Version
"""
import os
import pytest
from unittest.mock import patch, MagicMock, Mock
import sys

class TestHederaClient:
    """Tests for the HederaClient class with proper mocking"""
    
    @pytest.fixture
    def mock_env(self, monkeypatch):
        """Set up mock environment variables"""
        monkeypatch.setenv("HEDERA_NETWORK", "testnet")
        monkeypatch.setenv("HEDERA_ACCOUNT_ID", "0.0.12345")
        monkeypatch.setenv("HEDERA_PRIVATE_KEY", "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234")
    
    @patch('src.blockchain.hedera_client.PrivateKey')
    @patch('src.blockchain.hedera_client.AccountId')
    @patch('src.blockchain.hedera_client.Client')
    def test_init_testnet(self, mock_client_class, mock_account_id_class, mock_private_key_class, mock_env):
        """Test client initialization with testnet"""
        # Set up mocks
        mock_client = MagicMock()
        mock_client_class.forTestnet.return_value = mock_client
        
        mock_account_id = MagicMock()
        mock_account_id_class.fromString.return_value = mock_account_id
        
        mock_private_key = MagicMock()
        mock_private_key_class.fromString.return_value = mock_private_key
        
        # Import and create client
        from src.blockchain.hedera_client import HederaClient
        client = HederaClient()
        
        # Verify mocks were called correctly
        mock_client_class.forTestnet.assert_called_once()
        mock_account_id_class.fromString.assert_called_once_with("0.0.12345")
        mock_client.setOperator.assert_called_once_with(mock_account_id, mock_private_key)
    
    @patch('src.blockchain.hedera_client.PrivateKey')
    @patch('src.blockchain.hedera_client.AccountId')
    @patch('src.blockchain.hedera_client.Client')
    def test_init_mainnet(self, mock_client_class, mock_account_id_class, mock_private_key_class, monkeypatch):
        """Test client initialization with mainnet"""
        # Set environment variables
        monkeypatch.setenv("HEDERA_NETWORK", "mainnet")
        monkeypatch.setenv("HEDERA_ACCOUNT_ID", "0.0.12345")
        monkeypatch.setenv("HEDERA_PRIVATE_KEY", "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234")
        
        # Set up mocks
        mock_client = MagicMock()
        mock_client_class.forMainnet.return_value = mock_client
        
        mock_account_id = MagicMock()
        mock_account_id_class.fromString.return_value = mock_account_id
        
        mock_private_key = MagicMock()
        mock_private_key_class.fromString.return_value = mock_private_key
        
        # Import and create client
        from src.blockchain.hedera_client import HederaClient
        client = HederaClient()
        
        # Verify mocks were called correctly
        mock_client_class.forMainnet.assert_called_once()
        mock_account_id_class.fromString.assert_called_once_with("0.0.12345")
        mock_client.setOperator.assert_called_once_with(mock_account_id, mock_private_key)
    
    @patch('src.blockchain.hedera_client.PrivateKey')
    @patch('src.blockchain.hedera_client.AccountId')
    @patch('src.blockchain.hedera_client.Client')
    def test_init_invalid_network(self, mock_client_class, mock_account_id_class, mock_private_key_class, monkeypatch):
        """Test client initialization with invalid network"""
        # Set environment variables
        monkeypatch.setenv("HEDERA_NETWORK", "invalid")
        monkeypatch.setenv("HEDERA_ACCOUNT_ID", "0.0.12345")
        monkeypatch.setenv("HEDERA_PRIVATE_KEY", "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234")
        
        # Import and verify exception is raised
        from src.blockchain.hedera_client import HederaClient
        with pytest.raises(ValueError, match="Unsupported network: invalid"):
            client = HederaClient()
    
    @patch('src.blockchain.hedera_client.TopicCreateTransaction')
    @patch('src.blockchain.hedera_client.Ed25519PrivateKey')
    @patch('src.blockchain.hedera_client.PrivateKey')
    @patch('src.blockchain.hedera_client.AccountId')
    @patch('src.blockchain.hedera_client.Client')
    def test_create_topic(self, mock_client_class, mock_account_id_class, mock_private_key_class, 
                         mock_ed25519_key, mock_topic_transaction, mock_env):
        """Test topic creation"""
        # Set up mocks
        mock_client = MagicMock()
        mock_client_class.forTestnet.return_value = mock_client
        
        mock_account_id = MagicMock()
        mock_account_id_class.fromString.return_value = mock_account_id
        
        mock_private_key = MagicMock()
        mock_private_key_class.fromString.return_value = mock_private_key
        
        # Mock Ed25519 key for topic creation
        mock_ed25519_instance = MagicMock()
        mock_ed25519_key.from_private_bytes.return_value = mock_ed25519_instance
        mock_public_key = MagicMock()
        mock_ed25519_instance.public_key.return_value = mock_public_key
        mock_public_key.public_bytes_raw.return_value = b'mock_public_key'
        
        # Mock topic transaction
        mock_transaction = MagicMock()
        mock_topic_transaction.return_value = mock_transaction
        mock_transaction.setTopicMemo.return_value = mock_transaction
        mock_transaction.setSubmitKey.return_value = mock_transaction
        
        mock_response = MagicMock()
        mock_transaction.execute.return_value = mock_response
        mock_receipt = MagicMock()
        mock_response.getReceipt.return_value = mock_receipt
        mock_topic_id = MagicMock()
        mock_receipt.topicId = mock_topic_id
        mock_topic_id.toString.return_value = "0.0.topic123"
        
        # Import and create client
        from src.blockchain.hedera_client import HederaClient
        client = HederaClient()
        
        # Test topic creation
        topic_id = client.create_topic("Test Topic")
        
        # Verify calls
        mock_topic_transaction.assert_called_once()
        mock_transaction.setTopicMemo.assert_called_once_with("Test Topic")
        mock_transaction.execute.assert_called_once_with(mock_client)
        assert topic_id == "0.0.topic123"
    
    @patch('src.blockchain.hedera_client.TopicMessageSubmitTransaction')
    @patch('src.blockchain.hedera_client.PrivateKey')
    @patch('src.blockchain.hedera_client.AccountId')
    @patch('src.blockchain.hedera_client.Client')
    def test_submit_message(self, mock_client_class, mock_account_id_class, mock_private_key_class, 
                           mock_message_transaction, mock_env):
        """Test message submission"""
        # Set up mocks
        mock_client = MagicMock()
        mock_client_class.forTestnet.return_value = mock_client
        
        mock_account_id = MagicMock()
        mock_account_id_class.fromString.return_value = mock_account_id
        
        mock_private_key = MagicMock()
        mock_private_key_class.fromString.return_value = mock_private_key
        
        # Mock message transaction
        mock_transaction = MagicMock()
        mock_message_transaction.return_value = mock_transaction
        mock_transaction.setTopicId.return_value = mock_transaction
        mock_transaction.setMessage.return_value = mock_transaction
        
        mock_response = MagicMock()
        mock_transaction.execute.return_value = mock_response
        mock_transaction_id = MagicMock()
        mock_response.transactionId = mock_transaction_id
        mock_transaction_id.toString.return_value = "txn123"
        
        # Import and create client
        from src.blockchain.hedera_client import HederaClient
        client = HederaClient()
        
        # Test message submission
        message = {"type": "test", "data": "hello"}
        txn_id = client.submit_message("0.0.topic123", message)
        
        # Verify calls
        mock_message_transaction.assert_called_once()
        mock_transaction.setTopicId.assert_called_once_with("0.0.topic123")
        mock_transaction.execute.assert_called_once_with(mock_client)
        assert txn_id == "txn123"
    
    @patch('src.blockchain.hedera_client.ContractCreateTransaction')
    @patch('src.blockchain.hedera_client.PrivateKey')
    @patch('src.blockchain.hedera_client.AccountId')
    @patch('src.blockchain.hedera_client.Client')
    def test_deploy_contract(self, mock_client_class, mock_account_id_class, mock_private_key_class, 
                            mock_contract_transaction, mock_env):
        """Test contract deployment"""
        # Set up mocks
        mock_client = MagicMock()
        mock_client_class.forTestnet.return_value = mock_client
        
        mock_account_id = MagicMock()
        mock_account_id_class.fromString.return_value = mock_account_id
        
        mock_private_key = MagicMock()
        mock_private_key_class.fromString.return_value = mock_private_key
        
        # Mock contract transaction
        mock_transaction = MagicMock()
        mock_contract_transaction.return_value = mock_transaction
        mock_transaction.setBytecodeFileId.return_value = mock_transaction
        mock_transaction.setGas.return_value = mock_transaction
        mock_transaction.setInitialBalance.return_value = mock_transaction
        
        mock_response = MagicMock()
        mock_transaction.execute.return_value = mock_response
        mock_receipt = MagicMock()
        mock_response.getReceipt.return_value = mock_receipt
        mock_contract_id = MagicMock()
        mock_receipt.contractId = mock_contract_id
        mock_contract_id.toString.return_value = "0.0.contract123"
        
        # Import and create client
        from src.blockchain.hedera_client import HederaClient
        client = HederaClient()
        
        # Test contract deployment
        contract_id = client.deploy_contract("0.0.123")
        
        # Verify calls
        mock_contract_transaction.assert_called_once()
        mock_transaction.setBytecodeFileId.assert_called_once()
        mock_transaction.setGas.assert_called_once_with(500_000)
        mock_transaction.execute.assert_called_once_with(mock_client)
        assert contract_id == "0.0.contract123"
