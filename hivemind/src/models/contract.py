"""
Contract Models - Data models for smart contracts
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class Contract(BaseModel):
    """Model representing a smart contract"""
    
    address: str = Field(..., description="Contract address on the Hedera network")
    name: Optional[str] = Field(None, description="Human-readable name of the contract")
    abi: List[Dict[str, Any]] = Field(..., description="Contract ABI (Application Binary Interface)")
    bytecode: str = Field(..., description="Contract bytecode")
    source_code: Optional[str] = Field(None, description="Original Solidity source code")
    deployment_date: datetime = Field(default_factory=datetime.now, description="Date when the contract was deployed")
    deployer: str = Field(..., description="Account ID of the contract deployer")
    
    class Config:
        """Pydantic model configuration"""
        json_schema_extra = {
            "example": {
                "address": "0.0.1234",
                "name": "AgentRegistry",
                "abi": [{"inputs": [], "stateMutability": "nonpayable", "type": "constructor"}],
                "bytecode": "0x608060405234801561001057600080fd5b50...",
                "source_code": "// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract AgentRegistry {...}",
                "deployment_date": "2025-07-21T12:00:00Z",
                "deployer": "0.0.12345"
            }
        }

class Vulnerability(BaseModel):
    """Model representing a smart contract vulnerability"""
    
    name: str = Field(..., description="Name of the vulnerability")
    description: str = Field(..., description="Description of the vulnerability")
    severity: str = Field(..., description="Severity level (critical, high, medium, low, info)")
    location: Optional[str] = Field(None, description="Location in the code (e.g., function name, line number)")
    recommendation: Optional[str] = Field(None, description="Recommendation for fixing the vulnerability")
    
    class Config:
        """Pydantic model configuration"""
        json_schema_extra = {
            "example": {
                "name": "reentrancy",
                "description": "The contract is vulnerable to reentrancy attacks",
                "severity": "critical",
                "location": "withdraw() function, line 42",
                "recommendation": "Implement checks-effects-interactions pattern"
            }
        }

class AuditReport(BaseModel):
    """Model representing a smart contract audit report"""
    
    contract_address: str = Field(..., description="Address of the audited contract")
    auditor: str = Field(..., description="ID of the auditor agent")
    vulnerabilities: List[Vulnerability] = Field(default_factory=list, description="List of vulnerabilities found")
    audit_date: datetime = Field(default_factory=datetime.now, description="Date when the audit was performed")
    gas_analysis: Optional[Dict[str, Any]] = Field(None, description="Gas usage analysis")
    
    class Config:
        """Pydantic model configuration"""
        json_schema_extra = {
            "example": {
                "contract_address": "0.0.1234",
                "auditor": "0.0.agent1",
                "vulnerabilities": [
                    {
                        "name": "reentrancy",
                        "description": "The contract is vulnerable to reentrancy attacks",
                        "severity": "critical",
                        "location": "withdraw() function, line 42",
                        "recommendation": "Implement checks-effects-interactions pattern"
                    }
                ],
                "audit_date": "2025-07-21T12:30:00Z",
                "gas_analysis": {
                    "total_gas": 500000,
                    "functions": {
                        "withdraw": 50000,
                        "deposit": 30000
                    }
                }
            }
        }
