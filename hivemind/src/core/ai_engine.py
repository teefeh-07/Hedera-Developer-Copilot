"""
AI Engine - Module for AI model integration and orchestration
"""
import os
from typing import Dict, Any, List, Optional

import groq
from langgraph.graph import StateGraph

class AIEngine:
    """
    AI Engine for HiveMind Copilot, handling model interactions,
    code generation, and analysis using Groq and Ollama.
    """
    
    def __init__(self):
        """Initialize the AI Engine with Groq client."""
        self.groq_client = groq.Client(api_key=os.getenv("GROQ_API_KEY"))
        self.codex_model = os.getenv("CODEX_MODEL", "codellama-70b")
        self.debug_model = os.getenv("DEBUG_MODEL", "claude-3-haiku")
        
    def generate_code(self, prompt: str, language: str = "solidity") -> str:
        """
        Generate code based on a prompt using the Codex model.
        
        Args:
            prompt: The prompt describing the code to generate
            language: The programming language to generate code in
            
        Returns:
            Generated code as a string
        """
        system_prompt = f"You are an expert {language} developer. Generate clean, secure, and efficient code."
        
        response = self.groq_client.chat.completions.create(
            model=self.codex_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        )
        
        return response.choices[0].message.content
    
    def analyze_code(self, code: str, language: str = "solidity") -> Dict[str, Any]:
        """
        Analyze code for security issues, optimizations, and best practices.
        
        Args:
            code: The code to analyze
            language: The programming language of the code
            
        Returns:
            Dict containing analysis results
        """
        system_prompt = f"""
        Analyze the following {language} code for:
        1. Security vulnerabilities
        2. Gas optimization opportunities (if applicable)
        3. Best practices violations
        4. Potential bugs
        
        Format your response as JSON with these categories.
        """
        
        response = self.groq_client.chat.completions.create(
            model=self.debug_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": code}
            ]
        )
        
        # In a real implementation, we would parse the JSON response
        # For now, we'll return the raw content
        return {"analysis": response.choices[0].message.content}
    
    def generate_tests(self, code: str, language: str = "solidity") -> str:
        """
        Generate test cases for the provided code.
        
        Args:
            code: The code to generate tests for
            language: The programming language of the code
            
        Returns:
            Generated test code as a string
        """
        test_framework = "Hardhat" if language.lower() == "solidity" else "pytest"
        
        system_prompt = f"""
        You are an expert in writing tests for {language} code.
        Generate comprehensive test cases using {test_framework} for the following code.
        Include tests for both normal operation and edge cases.
        """
        
        response = self.groq_client.chat.completions.create(
            model=self.codex_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": code}
            ]
        )
        
        return response.choices[0].message.content
    
    def chat_completion(self, message: str, context: Optional[str] = None, max_tokens: int = 1000) -> Dict[str, Any]:
        """
        Handle chat completion requests for conversational AI.
        
        Args:
            message: The user's message
            context: Optional context for the conversation
            max_tokens: Maximum tokens to generate
            
        Returns:
            Dict containing response, sources, and token usage
        """
        system_prompt = """
        You are HiveMind Copilot, an AI assistant specialized in blockchain development,
        smart contracts, and Hedera Hashgraph. You help developers with:
        - Smart contract development and debugging
        - Blockchain architecture questions
        - Hedera-specific features and APIs
        - Security best practices
        - Code optimization
        
        Provide helpful, accurate, and concise responses.
        """
        
        messages = [{
            "role": "system", 
            "content": system_prompt
        }]
        
        if context:
            messages.append({
                "role": "system",
                "content": f"Additional context: {context}"
            })
        
        messages.append({
            "role": "user",
            "content": message
        })
        
        try:
            response = self.groq_client.chat.completions.create(
                model=self.debug_model,
                messages=messages,
                max_tokens=max_tokens
            )
            
            return {
                "response": response.choices[0].message.content,
                "sources": [],  # Could be enhanced to include relevant documentation
                "tokens_used": response.usage.total_tokens if response.usage else 0
            }
        except Exception as e:
            return {
                "response": f"I apologize, but I encountered an error: {str(e)}",
                "sources": [],
                "tokens_used": 0
            }
    
    def query_documentation(self, query: str, context: Optional[str] = None, max_results: int = 5) -> Dict[str, Any]:
        """
        Query documentation and return relevant information.
        
        Args:
            query: The documentation query
            context: Optional context for the query
            max_results: Maximum number of results to return
            
        Returns:
            Dict containing answer, sources, and confidence score
        """
        system_prompt = """
        You are a documentation assistant for HiveMind Copilot. You help developers find
        information about:
        - Hedera Hashgraph SDK and APIs
        - Smart contract development
        - Blockchain concepts
        - Development tools and frameworks
        
        Provide accurate, well-structured answers with references when possible.
        """
        
        messages = [{
            "role": "system",
            "content": system_prompt
        }]
        
        if context:
            messages.append({
                "role": "system",
                "content": f"Query context: {context}"
            })
        
        messages.append({
            "role": "user",
            "content": f"Please help me with: {query}"
        })
        
        try:
            response = self.groq_client.chat.completions.create(
                model=self.debug_model,
                messages=messages
            )
            
            # In a real implementation, this would search actual documentation
            # and return structured results with sources
            return {
                "answer": response.choices[0].message.content,
                "sources": [
                    {
                        "title": "Hedera Documentation",
                        "url": "https://docs.hedera.com",
                        "snippet": "Official Hedera documentation"
                    },
                    {
                        "title": "HiveMind Copilot Guide",
                        "url": "https://hivemind-copilot.docs",
                        "snippet": "HiveMind Copilot user guide"
                    }
                ],
                "confidence": 0.85  # Mock confidence score
            }
        except Exception as e:
            return {
                "answer": f"I couldn't find information about your query: {str(e)}",
                "sources": [],
                "confidence": 0.0
            }
    
    def create_agent_workflow(self) -> StateGraph:
        """
        Create a LangGraph workflow for agent orchestration.
        
        Returns:
            StateGraph instance representing the agent workflow
        """
        # This is a simplified example of a LangGraph workflow
        # In a real implementation, this would be more complex
        
        # Define the state schema
        class AgentState:
            code: Optional[str] = None
            analysis: Optional[Dict[str, Any]] = None
            tests: Optional[str] = None
            deployment: Optional[Dict[str, Any]] = None
        
        # Create a new graph
        workflow = StateGraph(AgentState)
        
        # Define nodes (these would be actual functions in a real implementation)
        def code_generation(state):
            if not state.code:
                state.code = "// Generated code would be here"
            return state
        
        def code_analysis(state):
            if state.code and not state.analysis:
                state.analysis = {"security": "No issues found"}
            return state
        
        def test_generation(state):
            if state.code and not state.tests:
                state.tests = "// Generated tests would be here"
            return state
        
        def deployment(state):
            if state.code and state.analysis and not state.deployment:
                state.deployment = {"address": "0.0.1234"}
            return state
        
        # Add nodes to the graph
        workflow.add_node("code_generation", code_generation)
        workflow.add_node("code_analysis", code_analysis)
        workflow.add_node("test_generation", test_generation)
        workflow.add_node("deployment", deployment)
        
        # Add edges
        workflow.add_edge("code_generation", "code_analysis")
        workflow.add_edge("code_analysis", "test_generation")
        workflow.add_edge("test_generation", "deployment")
        
        # Set the entry point
        workflow.set_entry_point("code_generation")
        
        return workflow
