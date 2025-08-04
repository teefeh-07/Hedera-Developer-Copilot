from setuptools import setup, find_packages

setup(
    name="hivemind-copilot",
    version="0.1.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        # Core AI
        "langgraph>=0.0.34",
        "groq>=0.5.0",
        "ollama>=0.2.1",
        "chromadb>=0.5.0",
        
        # Hedera Integration
        "hedera-sdk-py>=2.19.0",
        "web3>=7.0.0b1",
        
        # Utilities
        "python-dotenv>=1.0.1",
        "fastapi>=0.110.0",
        "uvicorn>=0.27.0",
        "pydantic>=2.0.0",
    ],
    python_requires=">=3.9",
)
