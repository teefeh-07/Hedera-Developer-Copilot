# HiveMind Copilot Backend Deployment Guide

This guide provides step-by-step instructions for deploying the HiveMind Copilot backend service, which powers the VSCode extension for Hedera developers.

## Prerequisites

- Python 3.9+ installed
- pip package manager
- Git
- Access to Groq API (for primary LLM service)
- Ollama installed locally (for fallback LLM service)
- FAISS or Weaviate for vector database (optional for production)

## Deployment Options

The HiveMind Copilot backend can be deployed in several ways:

1. **Local Development Deployment** - For testing and development
2. **Docker Deployment** - For containerized environments
3. **Cloud Deployment** - For production environments (AWS, GCP, Azure)

## 1. Local Development Deployment

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/hivemind-copilot.git
cd hivemind-copilot
```

### Step 2: Create and Activate a Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create a `.env` file in the backend directory:

```
# API Keys
GROQ_API_KEY=your_groq_api_key
HEDERA_ACCOUNT_ID=your_hedera_account_id
HEDERA_PRIVATE_KEY=your_hedera_private_key

# Model Configuration
DEFAULT_MODEL=codellama-70b
FALLBACK_MODEL=codellama:13b

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=False

# Vector Database (if using)
VECTOR_DB_URL=your_vector_db_url
```

### Step 5: Run the Backend Server

```bash
python -m src.api.main
```

The server will start on http://localhost:8000 by default.

## 2. Docker Deployment

### Step 1: Build the Docker Image

Create a `Dockerfile` in the root directory if it doesn't exist:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["python", "-m", "src.api.main"]
```

Build the Docker image:

```bash
docker build -t hivemind-copilot-backend .
```

### Step 2: Run the Docker Container

```bash
docker run -d -p 8000:8000 \
  -e GROQ_API_KEY=your_groq_api_key \
  -e HEDERA_ACCOUNT_ID=your_hedera_account_id \
  -e HEDERA_PRIVATE_KEY=your_hedera_private_key \
  --name hivemind-backend \
  hivemind-copilot-backend
```

## 3. Cloud Deployment

### AWS Elastic Beanstalk Deployment

1. Install the AWS EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize EB application:
   ```bash
   eb init -p python-3.9 hivemind-copilot
   ```

3. Create an environment:
   ```bash
   eb create hivemind-copilot-env
   ```

4. Deploy:
   ```bash
   eb deploy
   ```

### Google Cloud Run Deployment

1. Build and push the Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/your-project/hivemind-copilot
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy hivemind-copilot \
     --image gcr.io/your-project/hivemind-copilot \
     --platform managed \
     --allow-unauthenticated
   ```

## Configuration Options

### Model Configuration

The backend supports two LLM providers:

1. **Groq** - Primary provider for fast inference
   - Models: `codellama-70b`, `claude-3-haiku-20240307`

2. **Ollama** - Local fallback provider
   - Models: `codellama:13b`, `mistral:latest`

Configure these in the `.env` file or environment variables.

### Scaling Considerations

For production deployments:

1. **Memory**: Allocate at least 4GB RAM for the backend service
2. **CPU**: Minimum 2 vCPUs recommended
3. **Disk**: At least 10GB for the application and dependencies
4. **Network**: Configure proper security groups/firewall rules to allow traffic on port 8000

## Health Monitoring

The backend provides a health check endpoint:

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "services": {
    "llm": "ok",
    "hedera_client": "ok"
  }
}
```

Use this endpoint for monitoring and load balancer health checks.

## Troubleshooting

### Common Issues

1. **LLM Service Unavailable**:
   - Check Groq API key is valid
   - Verify Ollama is running locally if using as fallback

2. **Hedera Client Errors**:
   - Verify Hedera account ID and private key
   - Check network connectivity to Hedera nodes

3. **Memory Issues**:
   - Increase container memory limits
   - Consider using a smaller model for resource-constrained environments

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Network Security**: Use HTTPS in production
3. **Authentication**: Implement API key authentication for production deployments

## Updating the Backend

To update the backend:

1. Pull the latest code:
   ```bash
   git pull origin main
   ```

2. Install any new dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Restart the service:
   ```bash
   # If running directly
   python -m src.api.main
   
   # If running in Docker
   docker restart hivemind-backend
   ```
