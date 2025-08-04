#!/usr/bin/env python3
"""Script to download Hedera documentation for knowledge base."""

import os
import sys
import argparse
import requests
import json
import time
import re
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Add parent directory to path to import from src
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.config import settings
from src.utils.logging import setup_logging, get_logger

# Set up logging
setup_logging()
logger = get_logger(__name__)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Download Hedera documentation")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./data/docs",
        help="Output directory for documentation (default: ./data/docs)"
    )
    parser.add_argument(
        "--version",
        type=str,
        default=settings.DOCS_VERSION,
        help=f"Documentation version (default: {settings.DOCS_VERSION})"
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default="https://docs.hedera.com",
        help="Base URL for documentation (default: https://docs.hedera.com)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Delay between requests in seconds (default: 0.5)"
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=500,
        help="Maximum number of pages to download (default: 500)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds (default: 10)"
    )
    return parser.parse_args()


def clean_content(html_content):
    """Clean HTML content."""
    # Parse HTML
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.extract()
    
    # Get text
    text = soup.get_text()
    
    # Break into lines and remove leading and trailing space
    lines = (line.strip() for line in text.splitlines())
    
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text


def download_page(url, timeout=10):
    """Download page content."""
    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        return response.text
    except Exception as e:
        logger.error(f"Error downloading page {url}: {e}")
        return None


def extract_links(html_content, base_url):
    """Extract links from HTML content."""
    links = []
    
    # Parse HTML
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Find all links
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        
        # Skip external links, anchors, and non-HTML links
        if href.startswith("#") or href.startswith("http") or not href.endswith(".html"):
            continue
        
        # Create absolute URL
        absolute_url = urljoin(base_url, href)
        
        # Skip URLs outside base domain
        if not absolute_url.startswith(base_url):
            continue
        
        links.append(absolute_url)
    
    return links


def download_docs(args):
    """Download documentation."""
    # Create output directory
    output_dir = Path(args.output_dir) / args.version
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create index file
    index_file = output_dir / "index.json"
    
    # Initialize variables
    visited_urls = set()
    queue = [args.base_url]
    index = {}
    count = 0
    
    # Process queue
    while queue and count < args.max_pages:
        # Get next URL
        url = queue.pop(0)
        
        # Skip if already visited
        if url in visited_urls:
            continue
        
        # Mark as visited
        visited_urls.add(url)
        
        # Download page
        logger.info(f"Downloading {url}")
        html_content = download_page(url, args.timeout)
        if not html_content:
            continue
        
        # Clean content
        text_content = clean_content(html_content)
        
        # Create file path
        parsed_url = urlparse(url)
        path = parsed_url.path.lstrip("/")
        if not path:
            path = "index.html"
        
        # Create file name
        file_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", path)
        file_path = output_dir / file_name
        
        # Create parent directory if needed
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save content
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(text_content)
        
        # Add to index
        index[url] = {
            "file": str(file_path.relative_to(output_dir)),
            "title": BeautifulSoup(html_content, "html.parser").title.string if BeautifulSoup(html_content, "html.parser").title else "",
        }
        
        # Extract links
        links = extract_links(html_content, args.base_url)
        
        # Add links to queue
        for link in links:
            if link not in visited_urls:
                queue.append(link)
        
        # Increment count
        count += 1
        
        # Save index
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2)
        
        # Delay
        time.sleep(args.delay)
    
    logger.info(f"Downloaded {count} pages to {output_dir}")
    return count


if __name__ == "__main__":
    args = parse_args()
    
    # Download documentation
    download_docs(args)
