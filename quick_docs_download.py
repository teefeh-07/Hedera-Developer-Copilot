#!/usr/bin/env python3
"""Quick script to download Hedera documentation."""

import os
import requests
from bs4 import BeautifulSoup
import time
import json
from urllib.parse import urljoin, urlparse

# Base URLs for Hedera documentation
BASE_URLS = [
    "https://docs.hedera.com/hedera/",
    "https://docs.hedera.com/hedera/sdks-and-apis/sdks/",
    "https://docs.hedera.com/hedera/core-concepts/",
    "https://docs.hedera.com/hedera/getting-started/",
]

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Create version-specific directories
SDK_VERSIONS = ["v2.32", "v2.30", "v2.28", "v2.26"]
for version in SDK_VERSIONS:
    os.makedirs(os.path.join(OUTPUT_DIR, version), exist_ok=True)

# Index to track downloaded pages
index = {version: [] for version in SDK_VERSIONS}

def clean_html(html_content):
    """Clean HTML content to extract meaningful text."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header"]):
        script.extract()
    
    # Get text
    text = soup.get_text()
    
    # Break into lines and remove leading/trailing space
    lines = (line.strip() for line in text.splitlines())
    # Break multi-headlines into a line each
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    # Remove blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    
    return text


def save_to_file(content, filepath):
    """Save content to file.
    
    Args:
        content: Content to save
        filepath: Path to save file
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    return filepath

def download_page(url, version="v2.32"):
    """Download a single page and save it."""
    try:
        print(f"Downloading: {url}")
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"Failed to download {url}: Status code {response.status_code}")
            return None
        
        # Parse URL to get filename
        parsed_url = urlparse(url)
        path_parts = parsed_url.path.strip('/').split('/')
        filename = path_parts[-1] if path_parts[-1] else "index"
        if not filename.endswith('.html'):
            filename += '.html'
        
        # Clean content
        content = clean_html(response.text)
        
        # Get title
        soup = BeautifulSoup(response.text, 'html.parser')
        title = soup.title.string if soup.title else filename
        
        # Save file
        output_path = os.path.join(OUTPUT_DIR, version, filename.replace('.html', '.txt'))
        save_to_file(content, output_path)
        
        # Add to index
        index[version].append({
            "title": title,
            "url": url,
            "local_path": os.path.relpath(output_path, OUTPUT_DIR),
            "content_preview": content[:200] + "..."
        })
        
        return output_path
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

def download_sdk_docs(sdk_type="js", version="v2.32"):
    """Download SDK documentation for a specific version.
    
    Args:
        sdk_type: SDK type (js, java, go)
        version: SDK version
    """
    base_url = f"https://docs.hedera.com/hedera/sdks-and-apis/sdks/{sdk_type}-sdk"
    print(f"Downloading {sdk_type.upper()} SDK docs for {version} from {base_url}")
    
    # Download main SDK page
    download_page(base_url, version)
    
    # Save index
    index_path = os.path.join(OUTPUT_DIR, f"index_{version}.json")
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index[version], f, indent=2)
    
    print(f"Downloaded {len(index[version])} pages for {sdk_type.upper()} SDK {version}")


def main():
    """Main function to download documentation."""
    print(f"Downloading Hedera documentation to {OUTPUT_DIR}")
    
    # Download main pages for each version
    for version in SDK_VERSIONS:
        for base_url in BASE_URLS:
            download_page(base_url, version)
        
        # Download SDK docs
        download_sdk_docs("js", version)
        download_sdk_docs("java", version)
        download_sdk_docs("go", version)
    
    # Save index
    for version in SDK_VERSIONS:
        index_path = os.path.join(OUTPUT_DIR, version, "index.json")
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index[version], f, indent=2)
    
    print(f"Documentation downloaded to {OUTPUT_DIR}")
    print(f"Downloaded {sum(len(v) for v in index.values())} pages")

if __name__ == "__main__":
    main()
