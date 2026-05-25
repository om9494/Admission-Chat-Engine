# Admission Chat Engine

A production-ready full-stack AI-powered admission chat engine with RAG, MCP agents, web crawling, PDF ingestion, speech-to-text, and multilingual support.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + JavaScript + Tailwind CSS + ShadCN UI |
| Backend | Node.js + Express + MongoDB Atlas |
| AI Services | Python FastAPI + LangChain + ChromaDB + Groq |
| Auth | JWT |
| Vector DB | ChromaDB |
| LLM | Groq (llama3, mixtral) |
| Speech | OpenAI Whisper |

## Project Structure

```
admission-chat-engine/
├── frontend/           # React + Vite + Tailwind + ShadCN
├── backend-node/       # Express API + MongoDB + JWT
└── ai-services/        # FastAPI + LangChain + ChromaDB + Groq
```

## Quick Start

### 1. Setup Environment Variables

Copy each `.env.example` to `.env` and fill in your credentials.

```bash
cp frontend/.env.example frontend/.env
cp backend-node/.env.example backend-node/.env
cp ai-services/.env.example ai-services/.env
```

### 2. Start AI Services (Python FastAPI)

```bash
cd ai-services
python -m venv venv
# Windows: venv\Scripts\activate  |  Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Start Backend Node (Express)

```bash
cd backend-node
npm install
npm run dev
```

### 4. Start Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

## Services & Ports

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Backend Node (Express) | 3001 |
| AI Services (FastAPI) | 8000 |
| ChromaDB | 8001 |

## Features

- **RAG** — Query over ingested admission documents
- **MCP Agents** — Modular tool-calling agents for admission workflows
- **Web Crawling** — Crawl and index university admission pages
- **PDF Ingestion** — Upload and process admission PDFs into vector store
- **Speech-to-Text** — Whisper-powered voice input
- **Multilingual** — i18n support for multiple languages
- **Dark Mode** — System-aware dark/light theme
- **JWT Auth** — Secure authentication for admin and users

## API Documentation

- FastAPI docs: http://localhost:8000/docs
- Express API: http://localhost:3001/api

## License

MIT
