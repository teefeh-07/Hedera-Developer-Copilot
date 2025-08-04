"""
Configuration Utilities - Module for handling environment configuration
"""
import os
from typing import Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

def load_environment(env_path: Optional[str] = None) -> Dict[str, str]:
    """
    Load environment variables from .env file
    
    Args:
        env_path: Optional path to .env file
        
    Returns:
        Dict of environment variables
    """
    if env_path:
        load_dotenv(env_path)
    else:
        # Try to find .env in the project root
        project_root = Path(__file__).parent.parent.parent.parent
        env_file = project_root / ".env"
        if env_file.exists():
            load_dotenv(env_file)
        else:
            # Try current directory
            load_dotenv()
    
    # Return a dict of required environment variables
    required_vars = [
        "GROQ_API_KEY",
        "CODEX_MODEL",
        "DEBUG_MODEL",
        "HEDERA_NETWORK",
        "HEDERA_ACCOUNT_ID",
        "HEDERA_PRIVATE_KEY",
    ]
    
    env_vars = {}
    for var in required_vars:
        value = os.getenv(var)
        if value:
            env_vars[var] = value
    
    return env_vars

def validate_environment() -> bool:
    """
    Validate that all required environment variables are set
    
    Returns:
        True if all required variables are set, False otherwise
    """
    required_vars = [
        "GROQ_API_KEY",
        "HEDERA_ACCOUNT_ID",
        "HEDERA_PRIVATE_KEY",
    ]
    
    for var in required_vars:
        if not os.getenv(var):
            return False
    
    return True

def get_config() -> Dict[str, Any]:
    """
    Get application configuration
    
    Returns:
        Dict of configuration values
    """
    return {
        "groq": {
            "api_key": os.getenv("GROQ_API_KEY"),
            "codex_model": os.getenv("CODEX_MODEL", "codellama-70b"),
            "debug_model": os.getenv("DEBUG_MODEL", "claude-3-haiku"),
        },
        "hedera": {
            "network": os.getenv("HEDERA_NETWORK", "testnet"),
            "account_id": os.getenv("HEDERA_ACCOUNT_ID"),
            "private_key": os.getenv("HEDERA_PRIVATE_KEY"),
            "contract_registry": os.getenv("CONTRACT_REGISTRY"),
            "testnet_rpc": os.getenv("TESTNET_RPC", "https://testnet.hashio.io/api"),
        },
    }
