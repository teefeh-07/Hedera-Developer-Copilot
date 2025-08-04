"""
Logging Utilities - Module for configuring and using logging
"""
import logging
import sys
from typing import Optional

def setup_logger(name: str = "hivemind", level: int = logging.INFO) -> logging.Logger:
    """
    Set up a logger with the specified name and level
    
    Args:
        name: Logger name
        level: Logging level
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Create console handler if no handlers exist
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        
        # Create formatter
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(handler)
    
    return logger

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger with the specified name
    
    Args:
        name: Logger name (defaults to "hivemind")
        
    Returns:
        Logger instance
    """
    logger_name = name if name else "hivemind"
    return logging.getLogger(logger_name)
