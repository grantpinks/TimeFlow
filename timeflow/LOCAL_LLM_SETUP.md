# Local LLM Setup Guide - Llama 3.2 for TimeFlow

This guide explains how to run Llama 3.2 locally using Ollama (recommended) or other Docker-based model runners.

---

## Option 1: Ollama (Recommended - Easiest)

Ollama provides the simplest way to run Llama 3.2 locally with an OpenAI-compatible API.

### Installation

**Windows:**
1. Download Ollama from https://ollama.com/download/windows
2. Run the installer
3. Ollama will start automatically as a service

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull Llama 3.2 Model

```bash
# Pull the 3B parameter model (faster, less memory)
ollama pull llama3.2

# OR pull the 1B parameter model (even faster)
ollama pull llama3.2:1b

# OR pull the larger 11B model (more capable, requires more resources)
ollama pull llama3.2:11b
```

### Verify It's Running

```bash
# Test the model
ollama run llama3.2

# You should see a chat interface
# Type "Hello!" and press Enter
# Press Ctrl+D to exit

# Test the API endpoint
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Environment Variables

Add to your `apps/backend/.env`:

```bash
# For standard Llama 3.2 (3B)
LLM_ENDPOINT="http://localhost:11434/v1/chat/completions"
LLM_MODEL="llama3.2"
LLM_MAX_TOKENS="4000"

# For 1B model (faster, less accurate)
# LLM_MODEL="llama3.2:1b"

# For 11B model (slower, more accurate)
# LLM_MODEL="llama3.2:11b"
```

---

## Option 2: LM Studio

LM Studio provides a GUI for running local models.

### Installation

1. Download from https://lmstudio.ai/
2. Install and open LM Studio
3. Go to "Search" tab and search for "llama 3.2"
4. Download the model (choose GGUF quantized version)
5. Go to "Local Server" tab
6. Load the model and click "Start Server"
7. Default port: 1234

### Environment Variables

```bash
LLM_ENDPOINT="http://localhost:1234/v1/chat/completions"
LLM_MODEL="llama-3.2-3b-instruct"  # Check LM Studio for exact name
LLM_MAX_TOKENS="4000"
```

---

## Option 3: LocalAI (Docker)

LocalAI runs as a Docker container with OpenAI-compatible API.

### Setup

```bash
# Create a docker-compose.yml
cat > docker-compose.yml <<EOF
version: '3.9'
services:
  localai:
    image: localai/localai:latest
    ports:
      - "8080:8080"
    environment:
      - THREADS=4
      - CONTEXT_SIZE=4096
    volumes:
      - ./models:/models
    command: llama3.2
EOF

# Start the service
docker-compose up -d

# Download Llama 3.2 model
docker exec -it localai-localai-1 /build/entrypoint.sh llama3.2
```

### Environment Variables

```bash
LLM_ENDPOINT="http://localhost:8080/v1/chat/completions"
LLM_MODEL="llama3.2"
LLM_MAX_TOKENS="4000"
```

---

## Option 4: Ollama via Docker

If you prefer running Ollama in Docker instead of as a native service.

### Setup

```bash
# Pull and run Ollama container
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama

# Pull the Llama 3.2 model
docker exec -it ollama ollama pull llama3.2

# Verify it's running
curl http://localhost:11434/api/tags
```

### Environment Variables

```bash
LLM_ENDPOINT="http://localhost:11434/v1/chat/completions"
LLM_MODEL="llama3.2"
LLM_MAX_TOKENS="4000"
```

---

## Performance Tuning

### Model Size Recommendations

| Model | Parameters | RAM Required | Speed | Quality |
|-------|-----------|--------------|-------|---------|
| llama3.2:1b | 1 billion | 2-4 GB | Very Fast | Good |
| llama3.2 (3b) | 3 billion | 4-8 GB | Fast | Better |
| llama3.2:11b | 11 billion | 16-24 GB | Slow | Best |

### Hardware Recommendations

**Minimum:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 5 GB free space

**Recommended:**
- CPU: 8+ cores
- RAM: 16 GB
- GPU: NVIDIA with 8+ GB VRAM (for faster inference)
- Disk: 10 GB free space

### GPU Acceleration (Optional)

**Ollama with GPU:**

Ollama automatically detects and uses GPU if available (NVIDIA or AMD).

**Verify GPU usage:**
```bash
ollama run llama3.2
# Look for "Using GPU: NVIDIA..." in the output
```

**Docker with GPU:**
```bash
# NVIDIA GPU support
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  ollama/ollama
```

---

## Testing the Integration

### 1. Start TimeFlow Backend

```bash
cd apps/backend
pnpm dev
```

### 2. Check Logs

You should see:
```
[INFO] Server listening at http://localhost:3001
[INFO] Assistant service initialized with model: llama3.2
```

### 3. Test the Assistant

1. Open http://localhost:3000/assistant
2. Type: "What does my schedule look like today?"
3. You should get a response from Llama 3.2

### 4. Monitor LLM Performance

**Ollama:**
```bash
# View running models
ollama list

# View logs
ollama logs llama3.2
```

**Docker:**
```bash
# View container logs
docker logs -f ollama
```

---

## Troubleshooting

### Issue: "Connection refused" error

**Solution:**
- Make sure Ollama/LM Studio/LocalAI is running
- Check the port matches your configuration
- Verify with: `curl http://localhost:11434/v1/models`

### Issue: "Model not found"

**Solution:**
```bash
# List available models
ollama list

# Pull the model if missing
ollama pull llama3.2
```

### Issue: Slow responses

**Possible causes:**
1. Model is too large for your hardware → Try llama3.2:1b
2. No GPU acceleration → Enable GPU support
3. Other apps using CPU/RAM → Close unnecessary applications

**Check resource usage:**
```bash
# Windows
taskmgr

# macOS/Linux
top
htop
```

### Issue: Out of memory

**Solution:**
- Use a smaller model: llama3.2:1b
- Reduce max_tokens in .env
- Close other applications
- Add swap space (Linux)

### Issue: Poor quality responses

**Solutions:**
1. Use a larger model: llama3.2:11b
2. Increase temperature (edit assistantService.ts)
3. Improve the system prompt
4. Provide more context in queries

---

## Advanced Configuration

### Custom Endpoint for Cloud Providers

If you're using a cloud-hosted model (e.g., RunPod, Replicate):

```bash
LLM_ENDPOINT="https://your-endpoint.runpod.io/v1/chat/completions"
LLM_MODEL="llama3.2"
LLM_MAX_TOKENS="4000"
```

### Using Different Models

The service works with any OpenAI-compatible API. Try:

```bash
# Mistral
LLM_MODEL="mistral"
ollama pull mistral

# Gemma 2
LLM_MODEL="gemma2"
ollama pull gemma2

# Qwen 2.5
LLM_MODEL="qwen2.5"
ollama pull qwen2.5
```

### Rate Limiting (Optional)

To prevent overwhelming your local LLM, you can add rate limiting in the backend.

---

## Cost & Resource Comparison

| Solution | Cost | Setup Time | Performance | Flexibility |
|----------|------|------------|-------------|-------------|
| **Ollama (Local)** | Free | 5 min | Good | High |
| **LM Studio** | Free | 10 min | Good | Medium |
| **LocalAI (Docker)** | Free | 15 min | Good | High |
| **Cloud API (Anthropic)** | ~$0.01/msg | 2 min | Excellent | Low |

**Recommendation:** Start with Ollama + llama3.2 (3B). It's free, fast, and easy to set up.

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull Llama 3.2 model
3. ✅ Update `.env` with LLM settings
4. ✅ Start TimeFlow backend
5. ✅ Test the AI Assistant
6. ✅ Optimize based on your hardware

**Need help?** Check the Ollama docs: https://ollama.com/docs

---

**Last Updated:** 2025-12-02
