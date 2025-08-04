#!/usr/bin/env python3
"""Script to download SDK examples from GitHub repositories."""

import os
import sys
import argparse
import requests
import json
import time
import re
import shutil
import tempfile
import subprocess
from pathlib import Path

# Add parent directory to path to import from src
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.config import settings
from src.utils.logging import setup_logging, get_logger

# Set up logging
setup_logging()
logger = get_logger(__name__)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Download SDK examples")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./data/examples",
        help="Output directory for examples (default: ./data/examples)"
    )
    parser.add_argument(
        "--sdk",
        type=str,
        choices=["hedera-sdk-js", "hedera-sdk-java", "hedera-sdk-go"],
        default="hedera-sdk-js",
        help="SDK to download examples for (default: hedera-sdk-js)"
    )
    parser.add_argument(
        "--version",
        type=str,
        help="SDK version (e.g., 2.4.0)"
    )
    parser.add_argument(
        "--repo",
        type=str,
        help="GitHub repository URL"
    )
    parser.add_argument(
        "--examples-dir",
        type=str,
        help="Directory within repository containing examples"
    )
    parser.add_argument(
        "--token",
        type=str,
        help="GitHub API token for authentication"
    )
    return parser.parse_args()


def get_repo_info(args):
    """Get repository information."""
    # Default repositories
    default_repos = {
        "hedera-sdk-js": {
            "repo": "hashgraph/hedera-sdk-js",
            "examples_dir": "examples"
        },
        "hedera-sdk-java": {
            "repo": "hashgraph/hedera-sdk-java",
            "examples_dir": "examples/src/main/java"
        },
        "hedera-sdk-go": {
            "repo": "hashgraph/hedera-sdk-go",
            "examples_dir": "examples"
        }
    }
    
    # Use provided repository URL or default
    if args.repo:
        repo = args.repo
    else:
        repo = default_repos[args.sdk]["repo"]
    
    # Use provided examples directory or default
    if args.examples_dir:
        examples_dir = args.examples_dir
    else:
        examples_dir = default_repos[args.sdk]["examples_dir"]
    
    return repo, examples_dir


def get_latest_version(repo, token=None):
    """Get latest version from GitHub releases."""
    url = f"https://api.github.com/repos/{repo}/releases/latest"
    
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["tag_name"].lstrip("v")
    except Exception as e:
        logger.error(f"Error getting latest version: {e}")
        return None


def get_versions(repo, token=None):
    """Get all versions from GitHub releases."""
    url = f"https://api.github.com/repos/{repo}/releases"
    
    headers = {}
    if token:
        headers["Authorization"] = f"token {token}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        return [release["tag_name"].lstrip("v") for release in data]
    except Exception as e:
        logger.error(f"Error getting versions: {e}")
        return []


def clone_repo(repo, version, temp_dir, token=None):
    """Clone repository at specific version."""
    # Create clone URL
    if token:
        clone_url = f"https://{token}@github.com/{repo}.git"
    else:
        clone_url = f"https://github.com/{repo}.git"
    
    try:
        # Clone repository
        logger.info(f"Cloning repository {repo} at version {version}")
        subprocess.run(
            ["git", "clone", "--depth", "1", "--branch", f"v{version}", clone_url, temp_dir],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Error cloning repository: {e}")
        return False


def copy_examples(temp_dir, examples_dir, output_dir):
    """Copy examples to output directory."""
    # Create source and destination paths
    src_dir = Path(temp_dir) / examples_dir
    dst_dir = Path(output_dir)
    
    # Check if source directory exists
    if not src_dir.exists():
        logger.error(f"Examples directory not found: {src_dir}")
        return False
    
    try:
        # Create destination directory
        dst_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy examples
        logger.info(f"Copying examples from {src_dir} to {dst_dir}")
        shutil.copytree(src_dir, dst_dir, dirs_exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Error copying examples: {e}")
        return False


def download_examples(args):
    """Download SDK examples."""
    # Get repository information
    repo, examples_dir = get_repo_info(args)
    
    # Get version
    version = args.version
    if not version:
        version = get_latest_version(repo, args.token)
        if not version:
            logger.error("Failed to get latest version")
            return False
    
    # Create output directory
    output_dir = Path(args.output_dir) / args.sdk / version
    
    # Check if output directory already exists and has content
    if output_dir.exists() and any(output_dir.iterdir()):
        logger.info(f"Output directory already exists and has content: {output_dir}")
        return True
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Clone repository
        if not clone_repo(repo, version, temp_dir, args.token):
            return False
        
        # Copy examples
        if not copy_examples(temp_dir, examples_dir, output_dir):
            return False
    
    logger.info(f"Downloaded examples to {output_dir}")
    return True


if __name__ == "__main__":
    args = parse_args()
    
    # Download examples
    if download_examples(args):
        sys.exit(0)
    else:
        sys.exit(1)
