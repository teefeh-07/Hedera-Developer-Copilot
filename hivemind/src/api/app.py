"""
FastAPI Application - Main FastAPI application for HiveMind Copilot
"""
import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .router import router as api_router

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title="HiveMind Copilot API",
    description="AI-powered development environment integrating decentralized AI agents with Hedera's enterprise blockchain",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.1.0"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "HiveMind Copilot API",
        "description": "AI-powered development environment for Hedera blockchain",
        "documentation": "/docs",
    }
