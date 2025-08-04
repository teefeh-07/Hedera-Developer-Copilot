#!/usr/bin/env python3
"""
HiveMind Copilot Main Application

This script starts the FastAPI server for the HiveMind Copilot API.
"""
import os
import uvicorn
from dotenv import load_dotenv

from src.utils.logging import setup_logger
from src.utils.config import validate_environment

# Set up logger
logger = setup_logger("hivemind")

def main():
    """Main function to start the FastAPI server"""
    # Load environment variables
    load_dotenv()
    
    # Validate environment
    if not validate_environment():
        logger.error("Environment validation failed. Please check your .env file.")
        return
    
    # Get host and port from environment or use defaults
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    # Log startup message
    logger.info(f"Starting HiveMind Copilot API on {host}:{port}")
    
    # Start the FastAPI server
    uvicorn.run(
        "src.api.app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
