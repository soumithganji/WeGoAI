# WeGoAI Deployment & Architecture Guide

## 1. Architecture Overview: Frontend vs Backend Separation

This project follows a **Microservices-lite** architecture where the Frontend and Backend are decoupled and communicate via HTTP.

### **Frontend (Next.js)**
- **Role**: Handles the User Interface (UI), manages trip state, and communicates with the Backend.
- **Technology**: React, Next.js (App Router), TypeScript, Tailwind CSS.
- **Location**: `src/app`, `src/components`, `src/lib`.
- **Communication**: Sends JSON payloads (user queries, context) to the Backend via the `/api/ai/suggest` proxy route.

### **Backend (Python)**
- **Role**: dedicated AI processing unit. It runs the CrewAI agents, interacts with LLMs (NVIDIA/Groq), and performs web searches (Serper).
- **Technology**: Python 3.11, CrewAI, LangChain.
- **Location**: `backend/` directory.
- **Communication**: Listens for POST requests on port 5328 (locally) or 8080 (Cloud).

### **How They Connect**
1.  **User Action**: User types a request in the Chat Interface.
2.  **Frontend Request**: The browser sends a POST request to the Next.js API route: `/api/ai/suggest`.
3.  **Proxy Layer**: `src/app/api/ai/suggest/route.ts` receives this request. It acts as a **proxy**, protecting your API keys and internal backend URL.
4.  **Backend Request**: The Next.js server forwards the request to the Python Backend (defined by `AI_BACKEND_URL`).
5.  **Processing**: The Python Backend processes the request using CrewAI and returns the result.
6.  **Response**: The Next.js server receives the result and sends it back to the browser.

---

## 2. GCP Deployment Strategy

To deploy this on Google Cloud Platform (GCP), we will use **Cloud Run**, which is a serverless platform for containerized applications.

We will deploy two separate services:
1.  **`wegoai-backend`**: The Python AI service.
2.  **`wegoai-frontend`**: The Next.js web application.

### Why separate services?
- **Scaling**: The frontend (UI) and backend (AI processing) have different resource needs. The backend might need more CPU/Memory for AI tasks, while the frontend is lightweight.
- **Maintenance**: You can update the UI without redeploying the AI service, and vice-versa.
- **Isolation**: Issues in one service won't crash the other directly.

## 3. Deployment Steps

See the `deploy.sh` script for the automated deployment process.
