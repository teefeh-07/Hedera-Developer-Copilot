"""
Agent Models - Data models for HiveMind agents
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class Agent(BaseModel):
    """Model representing an AI agent in the HiveMind ecosystem"""
    
    id: str = Field(..., description="Unique identifier for the agent")
    name: str = Field(..., description="Human-readable name of the agent")
    owner: str = Field(..., description="Account ID of the agent owner")
    agent_type: str = Field(..., description="Type of agent (e.g., security_audit, test_gen)")
    capabilities: List[str] = Field(default_factory=list, description="List of agent capabilities")
    registration_date: datetime = Field(default_factory=datetime.now, description="Date when the agent was registered")
    public_key: str = Field(..., description="Public key for verifying agent messages")
    
    class Config:
        """Pydantic model configuration"""
        json_schema_extra = {
            "example": {
                "id": "0.0.agent1",
                "name": "SecurityAuditor",
                "owner": "0.0.12345",
                "agent_type": "security_audit",
                "capabilities": ["reentrancy_detection", "overflow_detection"],
                "registration_date": "2025-07-21T12:00:00Z",
                "public_key": "302a300506032b6570032100a0b1c2d3e4f5..."
            }
        }

class AgentMessage(BaseModel):
    """Model representing a message sent between agents"""
    
    sender: str = Field(..., description="ID of the sending agent")
    recipient: str = Field(..., description="ID of the receiving agent")
    topic_id: str = Field(..., description="HCS topic ID for the conversation")
    message_type: str = Field(..., description="Type of message (e.g., request, response)")
    content: Dict[str, Any] = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now, description="Message timestamp")
    signature: Optional[str] = Field(None, description="Signature of the message content")
    
    class Config:
        """Pydantic model configuration"""
        json_schema_extra = {
            "example": {
                "sender": "0.0.agent1",
                "recipient": "0.0.agent2",
                "topic_id": "0.0.topic123",
                "message_type": "audit_request",
                "content": {
                    "operation": "audit_request",
                    "contract_address": "0.0.1234"
                },
                "timestamp": "2025-07-21T12:30:00Z",
                "signature": "a1b2c3d4e5f6..."
            }
        }

class AgentRegistry(BaseModel):
    """Model representing the agent registry"""
    
    agents: List[Agent] = Field(default_factory=list, description="List of registered agents")
    
    def get_by_capability(self, capability: str) -> List[Agent]:
        """
        Get agents with a specific capability
        
        Args:
            capability: The capability to filter by
            
        Returns:
            List of agents with the specified capability
        """
        return [
            agent for agent in self.agents
            if capability in agent.capabilities
        ]
    
    def get_by_id(self, agent_id: str) -> Optional[Agent]:
        """
        Get an agent by ID
        
        Args:
            agent_id: The ID of the agent to get
            
        Returns:
            The agent with the specified ID, or None if not found
        """
        for agent in self.agents:
            if agent.id == agent_id:
                return agent
        return None
