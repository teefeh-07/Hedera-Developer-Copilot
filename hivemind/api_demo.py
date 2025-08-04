#!/usr/bin/env python3
"""
HiveMind Copilot API Demo

This script demonstrates the functionality of the HiveMind Copilot API
by making requests to the various endpoints and displaying the results.
"""
import os
import json
import argparse
from typing import Dict, Any

import requests
from dotenv import load_dotenv

from src.utils.logging import setup_logger
from src.utils.config import validate_environment

# Set up logger
logger = setup_logger("hivemind_demo")

# Sample Solidity code for demonstration
SAMPLE_CONTRACT = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;
    mapping(address => uint256) private userValues;
    
    event ValueChanged(address indexed user, uint256 newValue);
    
    function setValue(uint256 newValue) public {
        value = newValue;
        userValues[msg.sender] = newValue;
        emit ValueChanged(msg.sender, newValue);
    }
    
    function getValue() public view returns (uint256) {
        return value;
    }
    
    function getUserValue(address user) public view returns (uint256) {
        return userValues[user];
    }
}
"""

def make_api_request(endpoint: str, data: Dict[str, Any], base_url: str) -> Dict[str, Any]:
    """
    Make a request to the API
    
    Args:
        endpoint: API endpoint to call
        data: Request data
        base_url: Base URL of the API
        
    Returns:
        API response as a dictionary
    """
    url = f"{base_url}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        if hasattr(e, "response") and e.response:
            logger.error(f"Response: {e.response.text}")
        return {"error": str(e)}

def demo_code_generation(base_url: str) -> None:
    """
    Demonstrate code generation
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating code generation...")
    
    prompt = "Create a Solidity smart contract for a simple ERC20 token with mint and burn functions"
    data = {"prompt": prompt, "language": "solidity"}
    
    response = make_api_request("/api/v1/generate", data, base_url)
    
    if "error" not in response:
        logger.info("Code generation successful!")
        print("\nGenerated Code:")
        print("=" * 80)
        print(response.get("code", "No code generated"))
        print("=" * 80)
    else:
        logger.error(f"Code generation failed: {response['error']}")

def demo_code_analysis(base_url: str) -> None:
    """
    Demonstrate code analysis
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating code analysis...")
    
    data = {"code": SAMPLE_CONTRACT, "language": "solidity"}
    
    response = make_api_request("/api/v1/analyze", data, base_url)
    
    if "error" not in response:
        logger.info("Code analysis successful!")
        print("\nAnalysis Results:")
        print("=" * 80)
        print(json.dumps(response.get("analysis", {}), indent=2))
        print("=" * 80)
    else:
        logger.error(f"Code analysis failed: {response['error']}")

def demo_security_audit(base_url: str) -> None:
    """
    Demonstrate security audit
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating security audit...")
    
    data = {"code": SAMPLE_CONTRACT}
    
    response = make_api_request("/api/v1/audit", data, base_url)
    
    if "error" not in response:
        logger.info("Security audit successful!")
        print("\nAudit Results:")
        print("=" * 80)
        print("Static Analysis:")
        print(json.dumps(response.get("static_analysis", {}), indent=2))
        print("\nAI Analysis:")
        print(response.get("ai_analysis", "No AI analysis"))
        print("=" * 80)
    else:
        logger.error(f"Security audit failed: {response['error']}")

def demo_chat_completion(base_url: str) -> None:
    """
    Demonstrate chat completion
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating chat completion...")
    
    data = {
        "message": "How do I create a secure smart contract on Hedera? What are the best practices?",
        "context": "blockchain development and security",
        "max_tokens": 800
    }
    
    response = make_api_request("/api/v1/chat", data, base_url)
    
    if "error" not in response:
        logger.info("Chat completion successful!")
        print("\nChat Response:")
        print("=" * 80)
        print(response.get("response", "No response"))
        print(f"\nTokens used: {response.get('tokens_used', 0)}")
        if response.get("sources"):
            print("\nSources:")
            for source in response.get("sources", []):
                print(f"- {source}")
        print("=" * 80)
    else:
        logger.error(f"Chat completion failed: {response['error']}")

def demo_contract_compilation(base_url: str) -> None:
    """
    Demonstrate contract compilation
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating contract compilation...")
    
    data = {
        "code": SAMPLE_CONTRACT,
        "contract_name": "SimpleStorage",
        "optimize": True,
        "optimizer_runs": 200
    }
    
    response = make_api_request("/api/v1/compile", data, base_url)
    
    if "error" not in response:
        logger.info("Contract compilation successful!")
        print("\nCompilation Results:")
        print("=" * 80)
        print(f"Success: {response.get('success', False)}")
        
        if response.get("bytecode"):
            bytecode = response.get("bytecode", "")
            print(f"Bytecode length: {len(bytecode)} characters")
            print(f"Bytecode preview: {bytecode[:100]}...")
        
        if response.get("abi"):
            print("\nABI:")
            print(json.dumps(response.get("abi", []), indent=2))
        
        if response.get("warnings"):
            print("\nWarnings:")
            for warning in response.get("warnings", []):
                print(f"- {warning}")
        
        if response.get("errors"):
            print("\nErrors:")
            for error in response.get("errors", []):
                print(f"- {error}")
        
        print("=" * 80)
    else:
        logger.error(f"Contract compilation failed: {response['error']}")

def demo_documentation_query(base_url: str) -> None:
    """
    Demonstrate documentation query
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating documentation query...")
    
    data = {
        "query": "How to deploy a smart contract to Hedera testnet using the SDK?",
        "context": "Hedera smart contract deployment",
        "max_results": 5
    }
    
    response = make_api_request("/api/v1/docs", data, base_url)
    
    if "error" not in response:
        logger.info("Documentation query successful!")
        print("\nDocumentation Results:")
        print("=" * 80)
        print(response.get("answer", "No answer provided"))
        print(f"\nConfidence: {response.get('confidence', 0.0):.2f}")
        
        if response.get("sources"):
            print("\nSources:")
            for i, source in enumerate(response.get("sources", []), 1):
                print(f"{i}. {source.get('title', 'Unknown')}")
                print(f"   URL: {source.get('url', 'N/A')}")
                print(f"   Snippet: {source.get('snippet', 'N/A')}")
                print()
        
        print("=" * 80)
    else:
        logger.error(f"Documentation query failed: {response['error']}")

def demo_code_analysis_with_tests(base_url: str) -> None:
    """
    Demonstrate code analysis with test generation
    
    Args:
        base_url: Base URL of the API
    """
    logger.info("Demonstrating code analysis with test generation...")
    
    data = {
        "code": SAMPLE_CONTRACT,
        "language": "solidity",
        "generate_tests": True
    }
    
    response = make_api_request("/api/v1/analyze", data, base_url)
    
    if "error" not in response:
        logger.info("Code analysis with tests successful!")
        print("\nAnalysis Results:")
        print("=" * 80)
        print(json.dumps(response.get("analysis", {}), indent=2))
        
        if response.get("tests"):
            print("\nGenerated Tests:")
            print("-" * 40)
            print(response.get("tests", "No tests generated"))
        
        print("=" * 80)
    else:
        logger.error(f"Code analysis with tests failed: {response['error']}")

def main() -> None:
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Validate environment
    if not validate_environment():
        logger.error("Environment validation failed. Please check your .env file.")
        return
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="HiveMind Copilot API Demo")
    parser.add_argument(
        "--url", 
        default="http://localhost:8000", 
        help="Base URL of the API (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--demo", 
        choices=["all", "generate", "analyze", "audit", "chat", "compile", "docs", "tests"],
        default="all",
        help="Which demo to run (default: all)"
    )
    args = parser.parse_args()
    
    # Run demos
    if args.demo in ["all", "generate"]:
        demo_code_generation(args.url)
    
    if args.demo in ["all", "analyze"]:
        demo_code_analysis(args.url)
    
    if args.demo in ["all", "audit"]:
        demo_security_audit(args.url)
    
    if args.demo in ["all", "chat"]:
        demo_chat_completion(args.url)
    
    if args.demo in ["all", "compile"]:
        demo_contract_compilation(args.url)
    
    if args.demo in ["all", "docs"]:
        demo_documentation_query(args.url)
    
    if args.demo in ["all", "tests"]:
        demo_code_analysis_with_tests(args.url)

if __name__ == "__main__":
    main()
