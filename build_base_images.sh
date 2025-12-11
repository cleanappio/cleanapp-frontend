#!/bin/bash
# Build and push the base images for frontend optimization
# Run this once, then all subsequent builds will use these cached base images
# Re-run when you need to update Node version or system dependencies

set -e

echo "🔧 Building Frontend Base Images..."
echo "   This only needs to run once (or when updating Node/deps)"
echo ""

CLOUD_REGION="us-central1"
PROJECT_NAME="cleanup-mysql-v2"
DOCKER_REPO="us-central1-docker.pkg.dev/${PROJECT_NAME}/cleanapp-docker-repo"

# Ensure we're in the right project
CURRENT_PROJECT=$(gcloud config get project 2>/dev/null)
if [ "${PROJECT_NAME}" != "${CURRENT_PROJECT}" ]; then
  echo "⚠️  Switching to project ${PROJECT_NAME}..."
  gcloud config set project ${PROJECT_NAME}
fi

echo ""
echo "📦 Building base-builder image (Node + build deps)..."
# Create a temp context with just the Dockerfile
mkdir -p /tmp/base-builder-context
cp Dockerfile.base-builder /tmp/base-builder-context/Dockerfile
gcloud builds submit \
  --region=${CLOUD_REGION} \
  --tag=${DOCKER_REPO}/cleanapp-frontend-base-builder:latest \
  /tmp/base-builder-context
rm -rf /tmp/base-builder-context

echo ""
echo "📦 Building base-runner image (Node + runtime deps)..."
mkdir -p /tmp/base-runner-context
cp Dockerfile.base-runner /tmp/base-runner-context/Dockerfile
gcloud builds submit \
  --region=${CLOUD_REGION} \
  --tag=${DOCKER_REPO}/cleanapp-frontend-base-runner:latest \
  /tmp/base-runner-context
rm -rf /tmp/base-runner-context

echo ""
echo "✅ Base images built and pushed!"
echo ""
echo "Images available:"
echo "  - ${DOCKER_REPO}/cleanapp-frontend-base-builder:latest"
echo "  - ${DOCKER_REPO}/cleanapp-frontend-base-runner:latest"
echo ""
echo "Now use ./fastFEdeploy.sh -e dev to deploy with optimized builds"
