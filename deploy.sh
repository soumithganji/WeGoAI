#!/bin/bash
set -e

# Configuration
REGION="us-central1"
PROJECT_ID=$(gcloud config get-value project)
BACKEND_SERVICE="wegoai-backend"
FRONTEND_SERVICE="wegoai-frontend"

echo "🚀 Deploying WeGoAI to Google Cloud Run..."
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"

# Load environment variables
if [ -f .env ]; then
    echo "📄 Loading environment variables from .env..."
    export $(grep -v '^#' .env | xargs)
fi

# check if project is set
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No default project set. Please run 'gcloud config set project [PROJECT_ID]'"
    exit 1
fi

# Enable necessary APIs
echo "Enable Cloud Run and Artifact Registry API..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com -q

# Create Artifact Registry repository if not exists (handling error if exists)
REPO_NAME="wegoai-repo"
echo "📦 Creating Artifact Registry repository: $REPO_NAME..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="WeGoAI Docker Repository" -q || true

# Authenticate Docker to Artifact Registry
gcloud auth configure-docker $REGION-docker.pkg.dev -q

# --- BACKEND ---
echo "🐍 Building Backend..."
docker build --platform linux/amd64 -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$BACKEND_SERVICE:latest -f Dockerfile.backend .

echo "⬆️ Pushing Backend Image..."
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$BACKEND_SERVICE:latest

echo "🚀 Deploying Backend to Cloud Run..."
# Note: You should set environment variables for secrets using --set-env-vars
gcloud run deploy $BACKEND_SERVICE \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$BACKEND_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars HOST=0.0.0.0,NVIDIA_NIM_API_KEY=$NVIDIA_NIM_API_KEY,SERPER_API_KEY=$SERPER_API_KEY -q



# Get Backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

# --- FRONTEND ---
echo "⚛️ Building Frontend..."
docker build --platform linux/amd64 -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$FRONTEND_SERVICE:latest -f Dockerfile.frontend .


echo "⬆️ Pushing Frontend Image..."
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$FRONTEND_SERVICE:latest

echo "🚀 Deploying Frontend to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$FRONTEND_SERVICE:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 3000 \
    --set-env-vars AI_BACKEND_URL=$BACKEND_URL,MONGODB_URI=$MONGODB_URI,AMADEUS_API_KEY=$AMADEUS_API_KEY,AMADEUS_API_SECRET=$AMADEUS_API_SECRET -q


# Get Frontend URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --platform managed --region $REGION --format 'value(status.url)')

echo "🎉 Deployment Complete!"
echo "➡️ Frontend: $FRONTEND_URL"
echo "➡️ Backend:  $BACKEND_URL"
