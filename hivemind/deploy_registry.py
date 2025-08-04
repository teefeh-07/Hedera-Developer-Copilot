#!/usr/bin/env python3
"""
Deploy the AgentRegistry contract to Hedera Testnet
"""
import os
import time
import json
from dotenv import load_dotenv
import solcx
from hedera import (
    Client, 
    PrivateKey, 
    AccountId,
    FileCreateTransaction,
    FileAppendTransaction,
    ContractCreateTransaction,
    ContractFunctionParameters,
    Hbar
)

# Load environment variables
load_dotenv()

# Configure Hedera client
ACCOUNT_ID = os.getenv("HEDERA_ACCOUNT_ID")
PRIVATE_KEY = os.getenv("HEDERA_PRIVATE_KEY")
NETWORK = os.getenv("HEDERA_NETWORK", "testnet")

if not ACCOUNT_ID or not PRIVATE_KEY:
    raise ValueError("Please set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env file")

# Remove '0x' prefix if present in private key
if PRIVATE_KEY.startswith("0x"):
    PRIVATE_KEY = PRIVATE_KEY[2:]

# Create Hedera client
if NETWORK.lower() == "testnet":
    client = Client.forTestnet()
else:
    client = Client.forMainnet()

# Set operator account ID and private key
operator_id = AccountId.fromString(ACCOUNT_ID)
operator_key = PrivateKey.fromStringECDSA(PRIVATE_KEY)
client.setOperator(operator_id, operator_key)

def compile_contract():
    """Compile the AgentRegistry contract using py-solc-x"""
    print("Compiling contract...")
    
    # Get contract path
    contract_path = os.path.join(os.path.dirname(__file__), "contracts", "AgentRegistry.sol")
    output_dir = os.path.join(os.path.dirname(__file__), "build")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Install solc version if not already installed
        print("Installing solc 0.8.19...")
        solcx.install_solc('0.8.19')
        
        # Set solc version
        solcx.set_solc_version('0.8.19')
        
        # Compile the contract
        print("Compiling contract with solc 0.8.19...")
        compiled_sol = solcx.compile_files(
            [contract_path],
            output_values=['abi', 'bin'],
            solc_version='0.8.19'
        )
        
        # Get contract data
        contract_id = f"{contract_path}:AgentRegistry"
        contract_data = compiled_sol[contract_id]
        
        return {
            'bytecode': contract_data['bin'],
            'abi': contract_data['abi']
        }
        
    except Exception as e:
        print(f"Error compiling contract: {e}")
        raise

def deploy_contract(bytecode):
    """Deploy the contract to Hedera"""
    print("Deploying contract to Hedera...")
    
    try:
        # Create a file on Hedera containing the contract bytecode
        print("Creating file for contract bytecode...")
        file_create_tx = FileCreateTransaction()
        file_create_tx.setKeys([operator_key.getPublicKey()])
        file_create_tx.freezeWith(client)
        
        file_create_sign = file_create_tx.sign(operator_key)
        file_create_submit = file_create_sign.execute(client)
        file_create_receipt = file_create_submit.getReceipt(client)
        
        bytecode_file_id = file_create_receipt.fileId
        print(f"Contract bytecode file: {bytecode_file_id}")
        
        # Append contents to the file
        print("Appending bytecode to file...")
        file_append_tx = FileAppendTransaction()
        file_append_tx.setFileId(bytecode_file_id)
        file_append_tx.setContents(bytecode)
        file_append_tx.freezeWith(client)
        
        file_append_sign = file_append_tx.sign(operator_key)
        file_append_submit = file_append_sign.execute(client)
        file_append_receipt = file_append_submit.getReceipt(client)
        
        # Create the contract
        print("Creating contract...")
        contract_create_tx = ContractCreateTransaction()
        contract_create_tx.setGas(1000000)
        contract_create_tx.setBytecodeFileId(bytecode_file_id)
        contract_create_tx.setConstructorParameters(ContractFunctionParameters())
        contract_create_tx.freezeWith(client)
        
        contract_create_sign = contract_create_tx.sign(operator_key)
        contract_create_submit = contract_create_sign.execute(client)
        
        # Get the receipt and contract ID
        contract_create_receipt = contract_create_submit.getReceipt(client)
        contract_id = contract_create_receipt.contractId
        
        print(f"Contract deployed successfully!")
        print(f"Contract ID: {contract_id}")
        
        return str(contract_id)
    except Exception as e:
        print(f"Error deploying contract: {e}")
        raise

def main():
    """Main function to deploy the contract"""
    try:
        # Compile the contract
        contract_data = compile_contract()
        
        # Deploy the contract
        contract_id = deploy_contract(contract_data['bytecode'])
        
        # Update .env file with contract ID
        env_path = os.path.join(os.path.dirname(__file__), ".env")
        with open(env_path, "r") as f:
            env_content = f.read()
        
        # Replace CONTRACT_REGISTRY value
        if "CONTRACT_REGISTRY=" in env_content:
            env_content = env_content.replace(
                'CONTRACT_REGISTRY="0.0.YYYYY"', 
                f'CONTRACT_REGISTRY="{contract_id}"'
            )
        
        # Write updated content back to .env
        with open(env_path, "w") as f:
            f.write(env_content)
        
        print(f"Updated .env file with CONTRACT_REGISTRY={contract_id}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
