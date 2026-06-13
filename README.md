<div align="center">

# 🛡️ INSENTIC AI

**Enterprise Multi-Agent Governance & Intelligence Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini 1.5 Pro](https://img.shields.io/badge/AI-Gemini_1.5_Pro-blue?logo=google)](https://deepmind.google/technologies/gemini/)

*Built with ❤️ by **Team INSIDIOUS 🚀***

A next-generation Enterprise Multi-Agent Governance Intelligence Platform designed to ingest multi-format corporate documents, extract text via OCR, process handwritten context, and orchestrate a multi-agent workflow for governance validation, compliance auditing, risk assessment, and boardroom-ready executive intelligence reporting.

</div>

---

## 🌐 Live Demo

- **Frontend (Firebase Hosting):** [https://agentic-ai-hackathon-insidious.web.app](https://agentic-ai-hackathon-insidious.web.app)
- **Backend (Google Cloud Run):** [https://enterprise-rag-backend-563287512473.us-central1.run.app](https://enterprise-rag-backend-563287512473.us-central1.run.app)

---

## 🎯 Problem Statement

Modern enterprises struggle to quickly extract accurate, compliant, and actionable intelligence from vast repositories of corporate documents, scanned images, and handwritten policies. Simple RAG chatbots and PDF Q&A tools lack the deep semantic understanding, reasoning capabilities, and governance guardrails required, leading to hallucinated answers, compliance risks, and inefficient executive decision-making.

There is a critical need for an **Enterprise Multi-Agent Governance Intelligence Platform** capable of multi-format document ingestion, explainable semantic retrieval, and rigorous governance validation to generate source-grounded executive intelligence reports.

---

## 💡 Solution Overview

**INSENTIC AI** is not a simple RAG chatbot—it is an advanced **Enterprise Multi-Agent Governance Intelligence Platform**. Powered by Gemini 1.5 Pro, LangChain, and ChromaDB, the platform dynamically parses hybrid enterprise knowledge bases (including OCR extraction from scanned and handwritten documents), deploys specialized agents for context compression and deep reasoning, and actively audits outputs against strict compliance policies. The result is a highly reliable, mathematically scored, and explainable executive briefing system built on a secure Enterprise Intelligence Operating System dashboard.

---

## 🏗️ System Architecture

INSENTIC AI is built on a scalable, decoupled architecture:
- **Frontend Layer:** High-performance, highly responsive enterprise dashboard built with Next.js, featuring real-time state management, glassmorphism UI, and interactive telemetry visualization.
- **Backend Layer:** Robust Python FastAPI service handling document ingestion, embedding generation, semantic retrieval, and the multi-agent LLM orchestration.
- **Vector Storage:** ChromaDB for high-dimensional semantic search and chunk retrieval.
- **Intelligence Engine:** Google Gemini 1.5 Pro acting as the core reasoning engine, augmented by LangChain frameworks.
- **Deployment:** Dockerized backend deployed on Google Cloud Run; static frontend deployed on Firebase Hosting.

---

## 🤖 Multi-Agent Workflow

Our architecture employs a sequential multi-agent pipeline to ensure hallucination-free outputs:

1. **Query Expansion Agent:** Analyzes the raw user query and generates semantically expanded search vectors to maximize retrieval accuracy.
2. **Retrieval Agent:** Interfaces with ChromaDB to execute semantic similarity searches and fetch the most relevant knowledge chunks.
3. **Context Compression Agent:** Filters out noise from retrieved chunks, extracting only the factual constraints and relevant context.
4. **Deep Reasoning Agent:** Analyzes the compressed context against the query to formulate a logical reasoning path and initial findings.
5. **Compliance Audit Agent:** Acts as the *Governance Guard*. It strictly audits the reasoning path against corporate policies, checking for contradictions, security risks, and compliance violations.
6. **Report Synthesis Agent:** Compiles the audited findings into a professional, boardroom-ready executive strategy briefing, complete with verifiable citations.

---

## 💻 Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js, React, Tailwind CSS, Framer Motion |
| **Backend Framework** | Python, FastAPI |
| **AI / LLM Model** | Google Gemini 1.5 Pro |
| **Orchestration** | LangChain |
| **Vector Database** | ChromaDB |
| **Deployment** | Docker, Google Cloud Run, Firebase Hosting |

---

## ✨ Key Features

- **Multi-Format Document Ingestion:** Securely process and index PDF, DOCX, CSV, scanned PDFs, and image-based documents.
- **Advanced OCR & Handwritten Extraction:** Built-in hybrid document parsing supporting OCR-based text extraction and handwritten document understanding.
- **Knowledge Base Creation:** Context-aware document splitting for optimal semantic search.
- **Semantic Retrieval with ChromaDB:** High-performance vector-based information retrieval.
- **Multi-Agent Reasoning:** Specialized agents for retrieval, compression, reasoning, and synthesis.
- **Governance Validation & Compliance Auditing:** Automated hallucination prevention, contradiction checking, and strict enforcement of corporate policies.
- **Risk Intelligence Analysis:** Real-time threat anomaly scoring, confidence analysis, and intelligence radar visualization.
- **Executive Intelligence Brief Generation:** Automated synthesis of boardroom-ready strategy reports.
- **Explainable & Source-Grounded Responses:** Transparent visualization of the LLM's step-by-step decision-making process and citation-backed assertions.
- **Enterprise Decision Support:** Complete multi-module dashboard tailored for executive observability.
- **Firebase Auth & Session Management:** Secure email/password authentication with persistent user sessions across page refreshes and route protection.
- **Sleek Session Controls UX:** A sidebar-mounted session indicator showing the user email and a secure "Sign Out" control.
- **Firestore Report Persistence:** Automated serialization of RAG briefings, reasoning logs, confidence metrics, and governance results into Google Firestore under user ownership.
- **Client-Side Sorted Reports Archive:** A dedicated workspace that queries saved briefings using client-side sorting to eliminate composite index bottlenecks.
- **Instant Tab Reloads:** Explore historical reports (Executive Briefing, Reasoning, Governance Guard, RAG Inspector, Confidence Analysis) directly from database documents without repeating AI workflows.
- **Granular Database Security Rules:** Production-ready Firestore Security Rules restricting document access to the authenticated owner (`userId == request.auth.uid`).

---

## 🧩 Platform Modules

The INSENTIC AI platform is organized into the following sidebar workspaces:

- 🎛️ **Command Center:** The primary terminal for initiating queries and generating reports.
- 📁 **Documents:** Manage document ingestion and view raw uploaded files.
- 🗄️ **Knowledge Base:** Explore the vectorized enterprise knowledge spaces.
- 🔍 **RAG Inspector:** Trace semantic retrieval paths and inspect retrieved chunks.
- 🛡️ **Governance Guard:** Review audit attestation seals and contradiction logs.
- ⚠️ **Risk Intelligence:** Monitor global threat metrics and anomaly scores.
- 📄 **Reports:** Access the dynamic archive of generated executive briefings.
- ⚙️ **Settings:** Configure backend endpoints, LLM models, and clear databases.

---

## 🔄 RAG Pipeline Flow

```mermaid
graph TD;
    A[User Query] --> B[Query Expansion Agent];
    B --> C[Retrieval Agent];
    C <-->|Vector Search| D[(ChromaDB Vector Store)];
    C --> E[Context Compression Agent];
    E --> F[Deep Reasoning Agent];
    F --> G[Compliance Audit Agent];
    G -->|Contradiction Check| H{Governance Pass?};
    H -- Yes --> I[Report Synthesis Agent];
    H -- No --> J[Risk Alert / Rejection];
    I --> K[Executive Strategy Briefing];
```

---

## 📁 Project Structure

```text
INSENTIC-AI/
├── backend/                  # FastAPI Application
│   ├── main.py               # Application Entrypoint
│   ├── agents/               # Multi-Agent Logic & Langchain Prompts
│   ├── retrieval/            # ChromaDB & Embedding Utilities
│   ├── ingestion/            # Document Parsing & Chunking
│   ├── requirements.txt      # Python Dependencies
│   └── Dockerfile            # Container Configuration
└── frontend/                 # Next.js Application
    ├── app/                  # App Router Pages
    ├── components/           # React UI Components
    │   ├── dashboard/        # Dashboard Workspaces (Command Center, etc.)
    │   └── ui/               # Reusable UI Elements
    ├── public/               # Static Assets
    ├── tailwind.config.ts    # Styling Configuration
    └── package.json          # Node Dependencies
```

---

## 🚀 Local Setup Instructions

### Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables (see below).
5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see below).
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🔐 Environment Variables

Create `.env` files in both backend and frontend directories based on these templates. **Never commit actual API keys to version control.**

**Backend (`backend/.env`)**
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
CHROMA_DB_PATH="./chroma_db"
ENVIRONMENT="development"
```

**Frontend (`frontend/.env.local`)**
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
```

---

## ☁️ Deployment Architecture

- **Backend Containerization:** The FastAPI application is containerized using Docker and pushed to Google Container Registry (GCR) or Artifact Registry.
- **Backend Hosting:** Deployed on **Google Cloud Run** for serverless, autoscaling execution with custom IAM service account permissions.
- **Frontend Hosting:** The Next.js application is statically exported and deployed securely via **Firebase Hosting**.
- **Firestore Security Rules:** Managed and deployed to Firestore using the Firebase CLI, enforcing strict document ownership and locking down public/anonymous access.

---

## 📸 Proof & Screenshots

Here are the verification screenshots of the live system:

| Firestore Document Schema | Saved Reports Dashboard Archive |
| :---: | :---: |
| ![Firestore Schema](docs/screenshots/firestore_schema_proof.png) | ![Saved Reports Workspace](docs/screenshots/saved_reports_dashboard.png) |

---

## 🛣️ Future Enhancements

- [ ] Multi-document cross-repository reasoning.
- [ ] Real-time enterprise data connectors (Google Drive, SharePoint, Confluence, Notion).
- [ ] Enterprise RBAC, user management, and collaborative multi-user workspaces.
- [ ] Continuous knowledge synchronization pipelines and agent memory for long-term organizational context.
- [ ] Automated compliance monitoring and regulatory framework packs (ISO 27001, SOC2, HIPAA, GDPR).
- [ ] Enterprise workflow integrations and advanced risk prediction engine.
- [ ] Human-in-the-loop governance approval workflows and executive dashboard analytics.
- [ ] Knowledge graph generation and multi-modal intelligence fusion.
- [ ] On-premise enterprise deployment support and autonomous governance recommendation engine.
- [ ] Agent performance observability.
---

## 👨‍💻 Team

Developed for the Agentic AI Hackathon by **Team INSIDIOUS 🚀**

- **Harshit Sharma**
- **Dhruv**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
