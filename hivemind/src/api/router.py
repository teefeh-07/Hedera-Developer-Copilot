"""
API Router - FastAPI router for HiveMind Copilot API endpoints
"""
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..core.orchestrator import HiveMindOrchestrator
from ..core.ai_engine import AIEngine
from ..blockchain.hedera_client import HederaClient

# Define API models
class CodeGenerationRequest(BaseModel):
    """Request model for code generation"""
    prompt: str
    language: str = "solidity"

class CodeGenerationResponse(BaseModel):
    """Response model for code generation"""
    code: str

class CodeAnalysisRequest(BaseModel):
    """Request model for code analysis"""
    code: str
    language: str = "solidity"
    generate_tests: bool = False

class CodeAnalysisResponse(BaseModel):
    """Response model for code analysis"""
    analysis: Dict[str, Any]
    tests: Optional[str] = None

class ContractDeploymentRequest(BaseModel):
    """Request model for contract deployment"""
    code: str
    constructor_params: Optional[Dict[str, Any]] = None
    gas_limit: int = 4000000
    initial_hbar: int = 0

class ContractDeploymentResponse(BaseModel):
    """Response model for contract deployment"""
    contract_id: Optional[str] = None
    contract_address: str
    transaction_hash: str
    transaction_id: Optional[str] = None
    block_number: int
    gas_used: int

class SecurityAuditRequest(BaseModel):
    """Request model for security audit"""
    code: str

class SecurityAuditResponse(BaseModel):
    """Response model for security audit"""
    static_analysis: Dict[str, List[str]]
    ai_analysis: str

class AgentCollaborationRequest(BaseModel):
    """Request model for agent collaboration"""
    contract_address: str

class AgentCollaborationResponse(BaseModel):
    """Response model for agent collaboration"""
    vulnerabilities: List[str]
    severity: str
    recommendations: List[str]

class ContractRegistryRequest(BaseModel):
    """Request model for contract registry interactions"""
    registry_id: str
    action: str
    contract_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ContractRegistryResponse(BaseModel):
    """Response model for contract registry interactions"""
    result: Dict[str, Any]
    status: str

class ChatRequest(BaseModel):
    """Request model for chat completion"""
    message: str
    context: Optional[str] = None
    max_tokens: int = 1000

class ChatResponse(BaseModel):
    """Response model for chat completion"""
    response: str
    sources: List[str] = []
    tokens_used: int = 0

class CompileRequest(BaseModel):
    """Request model for contract compilation"""
    code: str
    contract_name: Optional[str] = None
    optimize: bool = True
    optimizer_runs: int = 200

class CompileResponse(BaseModel):
    """Response model for contract compilation"""
    success: bool
    bytecode: Optional[str] = None
    abi: Optional[List[Dict[str, Any]]] = None
    errors: List[str] = []
    warnings: List[str] = []

class DocumentationRequest(BaseModel):
    """Request model for documentation queries"""
    query: str
    context: Optional[str] = None
    max_results: int = 5

class DocumentationResponse(BaseModel):
    """Response model for documentation queries"""
    answer: str
    sources: List[Dict[str, str]] = []
    confidence: float = 0.0

# Create router
router = APIRouter(prefix="/api/v1", tags=["hivemind"])

# Dependency for getting orchestrator
def get_orchestrator():
    """Dependency for getting HiveMindOrchestrator instance"""
    return HiveMindOrchestrator()

# Dependency for getting AI engine
def get_ai_engine():
    """Dependency for getting AIEngine instance"""
    return AIEngine()

# Dependency for getting Hedera client
def get_hedera_client():
    """Dependency for getting HederaClient instance"""
    return HederaClient()

@router.post("/generate", response_model=CodeGenerationResponse)
async def generate_code(
    request: CodeGenerationRequest,
    ai_engine: AIEngine = Depends(get_ai_engine)
):
    """Generate code based on a prompt"""
    try:
        code = ai_engine.generate_code(request.prompt, request.language)
        return CodeGenerationResponse(code=code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code generation failed: {str(e)}"
        )

@router.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(
    request: CodeAnalysisRequest,
    ai_engine: AIEngine = Depends(get_ai_engine)
):
    """Analyze code for security issues and optimizations"""
    try:
        analysis = ai_engine.analyze_code(request.code, request.language)
        
        # Generate tests if requested
        tests = None
        if request.generate_tests:
            tests = ai_engine.generate_tests(request.code, request.language)
        
        return CodeAnalysisResponse(analysis=analysis, tests=tests)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code analysis failed: {str(e)}"
        )

@router.post("/deploy", response_model=ContractDeploymentResponse)
async def deploy_contract(
    request: ContractDeploymentRequest,
    orchestrator: HiveMindOrchestrator = Depends(get_orchestrator)
):
    """Deploy a smart contract to Hedera"""
    try:
        result = orchestrator.deploy_contract(
            solidity_code=request.code,
            constructor_params=request.constructor_params,
            gas_limit=request.gas_limit,
            initial_hbar=request.initial_hbar
        )
        return ContractDeploymentResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contract deployment failed: {str(e)}"
        )

@router.post("/audit", response_model=SecurityAuditResponse)
async def security_audit(
    request: SecurityAuditRequest,
    orchestrator: HiveMindOrchestrator = Depends(get_orchestrator)
):
    """Run a security audit on Solidity code"""
    try:
        result = orchestrator.security_audit(request.code)
        return SecurityAuditResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Security audit failed: {str(e)}"
        )

@router.post("/collaborate", response_model=AgentCollaborationResponse)
async def agent_collaboration(
    request: AgentCollaborationRequest,
    orchestrator: HiveMindOrchestrator = Depends(get_orchestrator)
):
    """Establish collaboration between agents for contract analysis"""
    try:
        result = orchestrator.agent_collaboration(request.contract_address)
        return AgentCollaborationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent collaboration failed: {str(e)}"
        )

@router.post("/registry", response_model=ContractRegistryResponse)
async def contract_registry(
    request: ContractRegistryRequest,
    orchestrator: HiveMindOrchestrator = Depends(get_orchestrator)
):
    """Interact with the contract registry on Hedera"""
    try:
        result = orchestrator.interact_with_registry(
            registry_id=request.registry_id,
            action=request.action,
            contract_id=request.contract_id,
            metadata=request.metadata
        )
        return ContractRegistryResponse(result=result, status="success")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contract registry interaction failed: {str(e)}"
        )

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    ai_engine: AIEngine = Depends(get_ai_engine)
):
    """Handle chat completion requests"""
    try:
        # Use AI engine to generate chat response
        response = ai_engine.chat_completion(
            message=request.message,
            context=request.context,
            max_tokens=request.max_tokens
        )
        
        return ChatResponse(
            response=response.get('response', ''),
            sources=response.get('sources', []),
            tokens_used=response.get('tokens_used', 0)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat completion failed: {str(e)}"
        )

@router.post("/compile", response_model=CompileResponse)
async def compile_contract(
    request: CompileRequest,
    orchestrator: HiveMindOrchestrator = Depends(get_orchestrator)
):
    """Compile a Solidity smart contract"""
    try:
        # Use orchestrator to compile the contract
        result = orchestrator.compile_contract(
            code=request.code,
            contract_name=request.contract_name,
            optimize=request.optimize,
            optimizer_runs=request.optimizer_runs
        )
        
        return CompileResponse(
            success=result.get('success', False),
            bytecode=result.get('bytecode'),
            abi=result.get('abi'),
            errors=result.get('errors', []),
            warnings=result.get('warnings', [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Contract compilation failed: {str(e)}"
        )

@router.post("/docs", response_model=DocumentationResponse)
async def query_documentation(
    request: DocumentationRequest,
    ai_engine: AIEngine = Depends(get_ai_engine)
):
    """Query documentation and return relevant information"""
    try:
        # Use AI engine to query documentation
        result = ai_engine.query_documentation(
            query=request.query,
            context=request.context,
            max_results=request.max_results
        )
        
        return DocumentationResponse(
            answer=result.get('answer', ''),
            sources=result.get('sources', []),
            confidence=result.get('confidence', 0.0)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Documentation query failed: {str(e)}"
        )
