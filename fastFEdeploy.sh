#!/bin/bash
# Fast Frontend Deploy Script
# Only builds and deploys the main frontend, skipping embedded and all other services
# Usage: ./fastFEdeploy.sh -e <dev|prod>

set -e

echo "🚀 Fast Frontend Deploy - Starting..."
START_TIME=$(date +%s)

OPT=""
WITH_EMBEDDED=false
while [[ $# -gt 0 ]]; do
  case $1 in
    "-e"|"--env")
      OPT="$2"
      shift 2
      ;;
    "--with-embedded")
      WITH_EMBEDDED=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "${OPT}" ]; then
  echo "Usage: $0 -e|--env <dev|prod> [--with-embedded]"
  echo ""
  echo "Options:"
  echo "  -e, --env         Environment (dev or prod)"
  echo "  --with-embedded   Also build and deploy embedded frontend"
  exit 1
fi

# Set environment-specific variables
case ${OPT} in
  "dev")
      echo "📦 Environment: DEV"
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51ReIGOFW3SknKzLcSITZxoZi8fySW11iQNY1SAe1dpzVOcHS2U05GlMZ6aQCcSdxILX0r6cm8Lx6yz4U8TR8l6HH00ihXdefVs"
      NEXT_PUBLIC_API_URL="https://devapi.cleanapp.io"
      NEXT_PUBLIC_LIVE_API_URL="https://devlive.cleanapp.io"
      NEXT_PUBLIC_TAGS_API_URL="https://devtags.cleanapp.io"
      NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL="wss://devlive.cleanapp.io"
      NEXT_PUBLIC_MONTENEGRO_API_URL="https://devapimontenegro.cleanapp.io"
      NEXT_PUBLIC_DEVCONNECT2025_API_URL="https://devdevconnect2025.cleanapp.io"
      NEXT_PUBLIC_EDGE_CITY_API_URL="https://devapiedgecity.cleanapp.io"
      NEXT_PUBLIC_NEW_YORK_API_URL="https://devapinewyork.cleanapp.io"
      NEXT_PUBLIC_REDBULL_API_URL="https://devapiredbull.cleanapp.io"
      NEXT_PUBLIC_AUTH_API_URL="https://devauth.cleanapp.io"
      NEXT_PUBLIC_AREAS_API_URL="https://devareas.cleanapp.io"
      NEXT_PUBLIC_REF_API_URL="http://dev.api.cleanapp.io:8080/write_referral"
      NEXT_PUBLIC_REPORT_PROCESSING_API_URL="https://devprocessing.cleanapp.io"
      NEXT_PUBLIC_EMAIL_API_URL="https://devemail.cleanapp.io"
      NEXT_PUBLIC_RENDERER_API_URL="https://devrenderer.cleanapp.io"
      NEXT_PUBLIC_WEBSITE_URL="https://dev.cleanapp.io"
      NEXT_PUBLIC_REPORT_COUNT_URL="http://dev.api.cleanapp.io:8080/valid-reports-count"
      VM_NAME="cleanapp-dev"
      ;;
  "prod")
      echo "📦 Environment: PROD"
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_51RaMSvF5CkX59Cnm7ZTuIIx0Fg1cQxqilIpOHippAYaVqFMDft3AESH5Ih8aPn4wUFL2VX3Ou9LvwCgqD5O0SDvF00a8ybMiUq"
      NEXT_PUBLIC_API_URL="https://api.cleanapp.io"
      NEXT_PUBLIC_LIVE_API_URL="https://live.cleanapp.io"
      NEXT_PUBLIC_TAGS_API_URL="https://tags.cleanapp.io"
      NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL="wss://live.cleanapp.io"
      NEXT_PUBLIC_MONTENEGRO_API_URL="https://apimontenegro.cleanapp.io"
      NEXT_PUBLIC_DEVCONNECT2025_API_URL="https://devconnect2025.cleanapp.io"
      NEXT_PUBLIC_EDGE_CITY_API_URL="https://apiedgecity.cleanapp.io"
      NEXT_PUBLIC_NEW_YORK_API_URL="https://apinewyork.cleanapp.io"
      NEXT_PUBLIC_REDBULL_API_URL="https://apiredbull.cleanapp.io"
      NEXT_PUBLIC_AUTH_API_URL="https://auth.cleanapp.io"
      NEXT_PUBLIC_AREAS_API_URL="https://areas.cleanapp.io"
      NEXT_PUBLIC_REF_API_URL="http://api.cleanapp.io:8080/write_referral"
      NEXT_PUBLIC_REPORT_PROCESSING_API_URL="https://processing.cleanapp.io"
      NEXT_PUBLIC_EMAIL_API_URL="https://email.cleanapp.io"
      NEXT_PUBLIC_RENDERER_API_URL="https://renderer.cleanapp.io"
      NEXT_PUBLIC_WEBSITE_URL="https://www.cleanapp.io"
      NEXT_PUBLIC_REPORT_COUNT_URL="http://api.cleanapp.io:8080/valid-reports-count"
      VM_NAME="cleanapp-prod"
      ;;
  *)
    echo "Usage: $0 -e|--env <dev|prod>"
    exit 1
    ;;
esac

CLOUD_REGION="us-central1"
PROJECT_NAME="cleanup-mysql-v2"
DOCKER_REPO="us-central1-docker.pkg.dev/${PROJECT_NAME}/cleanapp-docker-repo"
IMAGE_NAME="cleanapp-frontend-image"

# Ensure we're in the right project
CURRENT_PROJECT=$(gcloud config get project 2>/dev/null)
if [ "${PROJECT_NAME}" != "${CURRENT_PROJECT}" ]; then
  echo "⚠️  Switching to project ${PROJECT_NAME}..."
  gcloud config set project ${PROJECT_NAME}
fi

# Get secrets
echo "🔐 Fetching secrets..."
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$(gcloud secrets versions access 1 --secret="MAPBOX_ACCESS_TOKEN")
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(gcloud secrets versions access 1 --secret="GOOGLE_MAPS_API_KEY")
NEXT_PUBLIC_PLAYSTORE_URL="https://play.google.com/store/apps/details?id=com.cleanapp"
NEXT_PUBLIC_APPSTORE_URL="https://apps.apple.com/us/app/cleanapp/id6466403301"

# Get version
. .version
BUILD=$(echo ${BUILD_VERSION} | cut -f 3 -d ".")
VER=$(echo ${BUILD_VERSION} | cut -f 1,2 -d ".")
BUILD=$((${BUILD} + 1))
BUILD_VERSION="${VER}.${BUILD}"
echo "BUILD_VERSION=${BUILD_VERSION}" > .version
echo "📌 Version: ${BUILD_VERSION}"

# Build the Docker image using Cloud Build
echo "🔨 Building Docker image (this is the slow part)..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_IMAGE_NAME=${IMAGE_NAME},_TAG=${BUILD_VERSION},_NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL},_NEXT_PUBLIC_LIVE_API_URL=${NEXT_PUBLIC_LIVE_API_URL},_NEXT_PUBLIC_TAGS_API_URL=${NEXT_PUBLIC_TAGS_API_URL},_NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL=${NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL},_NEXT_PUBLIC_MONTENEGRO_API_URL=${NEXT_PUBLIC_MONTENEGRO_API_URL},_NEXT_PUBLIC_DEVCONNECT2025_API_URL=${NEXT_PUBLIC_DEVCONNECT2025_API_URL},_NEXT_PUBLIC_EDGE_CITY_API_URL=${NEXT_PUBLIC_EDGE_CITY_API_URL},_NEXT_PUBLIC_NEW_YORK_API_URL=${NEXT_PUBLIC_NEW_YORK_API_URL},_NEXT_PUBLIC_REDBULL_API_URL=${NEXT_PUBLIC_REDBULL_API_URL},_NEXT_PUBLIC_AUTH_API_URL=${NEXT_PUBLIC_AUTH_API_URL},_NEXT_PUBLIC_AREAS_API_URL=${NEXT_PUBLIC_AREAS_API_URL},_NEXT_PUBLIC_REF_API_URL=${NEXT_PUBLIC_REF_API_URL},_NEXT_PUBLIC_REPORT_PROCESSING_API_URL=${NEXT_PUBLIC_REPORT_PROCESSING_API_URL},_NEXT_PUBLIC_EMAIL_API_URL=${NEXT_PUBLIC_EMAIL_API_URL},_NEXT_PUBLIC_RENDERER_API_URL=${NEXT_PUBLIC_RENDERER_API_URL},_NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL},_NEXT_PUBLIC_REPORT_COUNT_URL=${NEXT_PUBLIC_REPORT_COUNT_URL},_NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=${NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN},_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY},_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY},_NEXT_PUBLIC_PLAYSTORE_URL=${NEXT_PUBLIC_PLAYSTORE_URL},_NEXT_PUBLIC_APPSTORE_URL=${NEXT_PUBLIC_APPSTORE_URL} \
  --region=${CLOUD_REGION}

# Tag image for the environment
echo "🏷️  Tagging image as ${OPT}..."
gcloud artifacts docker tags add \
  "${DOCKER_REPO}/${IMAGE_NAME}:${BUILD_VERSION}" \
  "${DOCKER_REPO}/${IMAGE_NAME}:${OPT}"

# Deploy to VM - just the frontend container
echo "🚢 Deploying to ${VM_NAME}..."
gcloud compute ssh ${VM_NAME} --zone=us-central1-a --command="
  echo '🔄 Stopping old frontend container...'
  sudo docker stop cleanapp_frontend 2>/dev/null || true
  sudo docker rm cleanapp_frontend 2>/dev/null || true
  
  echo '📥 Pulling new image...'
  ACCESS_TOKEN=\$(gcloud auth print-access-token)
  echo \"\${ACCESS_TOKEN}\" | docker login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
  docker pull ${DOCKER_REPO}/${IMAGE_NAME}:${OPT}
  
  echo '🚀 Starting new frontend container...'
  sudo docker run -d --name cleanapp_frontend \
    --network deployer_default \
    -p 3001:3000 \
    -e NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    -e NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL} \
    ${DOCKER_REPO}/${IMAGE_NAME}:${OPT}
  
  echo '✅ Frontend container started'
  sudo docker ps | grep cleanapp_frontend
"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
echo ""
echo "✅ Fast Frontend Deploy completed in ${ELAPSED} seconds!"
echo "   Version: ${BUILD_VERSION}"
echo "   Environment: ${OPT}"
