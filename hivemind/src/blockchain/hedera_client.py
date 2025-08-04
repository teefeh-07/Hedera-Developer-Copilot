"""
Hedera Client - Module for interacting with the Hedera network
"""
import os
import json
from typing import Dict, Any, List, Optional

from hedera import (
    Client, 
    AccountId,
    PrivateKey,
    FileCreateTransaction, 
    ContractCreateTransaction,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    FileId,
    Hbar
)
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

class HederaClient:
    """
    Client for interacting with the Hedera network, providing high-level
    abstractions for common operations like contract deployment and HCS messaging.
    """
    
    def __init__(self):
        """Initialize the Hedera client with credentials from environment variables."""
        network = os.getenv("HEDERA_NETWORK", "testnet")
        
        if network.lower() == "testnet":
            self.client = Client.forTestnet()
        elif network.lower() == "mainnet":
            self.client = Client.forMainnet()
        else:
            raise ValueError(f"Unsupported network: {network}")
            
        # Get account ID and private key from environment variables
        account_id_str = os.getenv("HEDERA_ACCOUNT_ID")
        private_key_str = os.getenv("HEDERA_PRIVATE_KEY")
        
        # Remove '0x' prefix if present in private key
        if private_key_str and private_key_str.startswith("0x"):
            private_key_str = private_key_str[2:]
        
        try:
            # Parse account ID string into AccountId object
            account_id = AccountId.fromString(account_id_str)
            
            # Parse private key string into PrivateKey object
            # Try different key formats - first try ED25519, then ECDSA
            try:
                private_key = PrivateKey.fromString(private_key_str)
            except Exception:
                try:
                    private_key = PrivateKey.fromStringECDSA(private_key_str)
                except Exception as e:
                    print(f"Failed to parse private key: {e}")
                    raise
            
            # Set operator with proper objects
            self.client.setOperator(account_id, private_key)
        except Exception as e:
            print(f"Error initializing Hedera client: {e}")
            raise
        
    def create_topic(self, memo: str = "HiveMind Topic") -> str:
        """
        Create a new HCS topic for agent communication.
        
        Args:
            memo: Optional memo for the topic
            
        Returns:
            The topic ID as a string
        """
        # Remove '0x' prefix if present in private key
        private_key_hex = os.getenv("HEDERA_PRIVATE_KEY")
        if private_key_hex.startswith("0x"):
            private_key_hex = private_key_hex[2:]
            
        # Create private key from hex string
        private_key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private_key_hex))
        public_key_bytes = private_key.public_key().public_bytes_raw()
        
        transaction = (
            TopicCreateTransaction()
            .setTopicMemo(memo)
            .setSubmitKey(public_key_bytes)
        )
        
        txn_response = transaction.execute(self.client)
        receipt = txn_response.getReceipt(self.client)
        topic_id = receipt.topicId.toString()
        
        return topic_id
    
    def submit_message(self, topic_id: str, message: Dict[str, Any]) -> str:
        """
        Submit a message to an HCS topic.
        
        Args:
            topic_id: The ID of the topic to submit to
            message: The message to submit (will be serialized to JSON)
            
        Returns:
            The transaction ID as a string
        """
        message_bytes = json.dumps(message).encode("utf-8")
        
        transaction = (
            TopicMessageSubmitTransaction()
            .setTopicId(topic_id)
            .setMessage(message_bytes)
        )
        
        txn_response = transaction.execute(self.client)
        receipt = txn_response.getReceipt(self.client)
        
        return txn_response.transactionId.toString()
    
    def create_file(self, content: str) -> str:
        """
        Create a file on Hedera File Service.
        
        Args:
            content: The content to store in the file
            
        Returns:
            The file ID as a string
        """
        # Convert content to bytes
        content_bytes = content.encode("utf-8")
        
        # Create file transaction
        transaction = (
            FileCreateTransaction()
            .setContents(content_bytes)
            .setKeys(self.client.getOperatorPublicKey())
            .setMaxTransactionFee(Hbar(2))
        )
        
        # Execute transaction
        txn_response = transaction.execute(self.client)
        receipt = txn_response.getReceipt(self.client)
        file_id = receipt.fileId.toString()
        
        return file_id
    
    def deploy_contract(self, file_id: str, constructor_params: Optional[Dict[str, Any]] = None, gas: int = 500_000, initial_balance: int = 0) -> str:
        """
        Deploy a smart contract to Hedera from a file.
        
        Args:
            file_id: The ID of the file containing the contract bytecode
            constructor_params: Optional constructor parameters as a dictionary
            gas: Gas limit for deployment
            initial_balance: Initial HBAR balance for the contract
            
        Returns:
            The contract ID as a string
        """
        # No need to import Java classes directly
        
        # Create transaction
        transaction = ContractCreateTransaction()
        
        # Set gas limit (convert to long to avoid Java type issues)
        transaction.setGas(gas)
        
        # Set bytecode file ID
        transaction.setBytecodeFileId(FileId.fromString(file_id))
        
        # Set initial balance if provided
        if initial_balance > 0:
            transaction.setInitialBalance(Hbar.fromTinybars(initial_balance))
        
        # Add constructor parameters if provided
        if constructor_params and len(constructor_params) > 0:
            # Convert dictionary parameters to ContractFunctionParameters
            params = ContractFunctionParameters()
            
            # This is a simplified approach - in a real implementation,
            # we would need to handle different parameter types properly
            for key, value in constructor_params.items():
                if isinstance(value, str):
                    params.addString(value)
                elif isinstance(value, int):
                    # Convert to string first to avoid Java type issues
                    params.addUint256(str(value))
                elif isinstance(value, bool):
                    params.addBool(value)
                elif isinstance(value, float):
                    # Handle floating point values
                    params.addUint256(str(int(value)))
                # Add more type handling as needed
            
            transaction.setConstructorParameters(params)
        
        # Execute transaction
        txn_response = transaction.execute(self.client)
        receipt = txn_response.getReceipt(self.client)
        contract_id = receipt.contractId.toString()
        
        return contract_id
    
    def execute_contract(
        self, 
        contract_id: str, 
        function_name: str, 
        params: Optional[ContractFunctionParameters] = None,
        gas: int = 100_000
    ) -> Dict[str, Any]:
        """
        Execute a function on a deployed smart contract.
        
        Args:
            contract_id: The ID of the contract to execute
            function_name: The name of the function to call
            params: Optional function parameters
            gas: Gas limit for the transaction
            
        Returns:
            Dict containing transaction information
        """
        transaction = (
            ContractExecuteTransaction()
            .setContractId(contract_id)
            .setGas(gas)
            .setFunction(function_name)
        )
        
        # Add function parameters if provided
        if params:
            transaction.setFunctionParameters(params)
        
        txn_response = transaction.execute(self.client)
        receipt = txn_response.getReceipt(self.client)
        
        return {
            "transaction_id": txn_response.transactionId.toString(),
            "status": receipt.status.toString(),
            "gas_used": receipt.gasUsed
        }
    
    def sign_message(self, message: Dict[str, Any]) -> str:
        """
        Sign a message using the operator's private key.
        
        Args:
            message: The message to sign (will be serialized to JSON)
            
        Returns:
            The signature as a hex string
        """
        # Remove '0x' prefix if present in private key
        private_key_hex = os.getenv("HEDERA_PRIVATE_KEY")
        if private_key_hex.startswith("0x"):
            private_key_hex = private_key_hex[2:]
            
        # Create private key from hex string
        private_key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(private_key_hex))
        message_str = json.dumps(message, sort_keys=True)
        signature = private_key.sign(message_str.encode())
        
        return signature.hex()
    
    def verify_message(self, message: Dict[str, Any], signature: str, public_key: str) -> bool:
        """
        Verify a message signature.
        
        Args:
            message: The message that was signed
            signature: The signature to verify
            public_key: The public key to verify against
            
        Returns:
            True if the signature is valid, False otherwise
        """
        # Convert public key string to Ed25519PublicKey object
        verifier = Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key))
        message_str = json.dumps(message, sort_keys=True)
        
        try:
            verifier.verify(bytes.fromhex(signature), message_str.encode())
            return True
        except Exception:
            return False
