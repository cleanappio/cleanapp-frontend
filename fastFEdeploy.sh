#!/bin/bash
# Fast Frontend Deploy Script
# Only builds and deploys the main frontend, skipping embedded and all other services
# Usage: ./fastFEdeploy.sh -e <dev|prod> [--with-embedded]

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
    echo "Usage: $0 -e|--env <dev|prod> [--with-embedded]"
    exit 1
    ;;
esac

CLOUD_REGION="us-central1"
PROJECT_NAME="cleanup-mysql-v2"

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

# Escape URLs for sed
ESCAPED_NEXT_PUBLIC_API_URL=$(echo ${NEXT_PUBLIC_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_LIVE_API_URL=$(echo ${NEXT_PUBLIC_LIVE_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_TAGS_API_URL=$(echo ${NEXT_PUBLIC_TAGS_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL=$(echo ${NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_MONTENEGRO_API_URL=$(echo ${NEXT_PUBLIC_MONTENEGRO_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_DEVCONNECT2025_API_URL=$(echo ${NEXT_PUBLIC_DEVCONNECT2025_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_EDGE_CITY_API_URL=$(echo ${NEXT_PUBLIC_EDGE_CITY_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_NEW_YORK_API_URL=$(echo ${NEXT_PUBLIC_NEW_YORK_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_REDBULL_API_URL=$(echo ${NEXT_PUBLIC_REDBULL_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_AUTH_API_URL=$(echo ${NEXT_PUBLIC_AUTH_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_AREAS_API_URL=$(echo ${NEXT_PUBLIC_AREAS_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_PLAYSTORE_URL=$(echo ${NEXT_PUBLIC_PLAYSTORE_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_APPSTORE_URL=$(echo ${NEXT_PUBLIC_APPSTORE_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_REF_API_URL=$(echo ${NEXT_PUBLIC_REF_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_REPORT_PROCESSING_API_URL=$(echo ${NEXT_PUBLIC_REPORT_PROCESSING_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_EMAIL_API_URL=$(echo ${NEXT_PUBLIC_EMAIL_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_WEBSITE_URL=$(echo ${NEXT_PUBLIC_WEBSITE_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_REPORT_COUNT_URL=$(echo ${NEXT_PUBLIC_REPORT_COUNT_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_RENDERER_API_URL=$(echo ${NEXT_PUBLIC_RENDERER_API_URL} | sed 's/\//\\\//g')

# Build modes (default: just main, optionally include embedded)
if [ "$WITH_EMBEDDED" = true ]; then
  MODES="full embedded"
  echo "🔧 Building: main + embedded"
else
  MODES="full"
  echo "🔧 Building: main only (use --with-embedded for both)"
fi

for MODE in ${MODES}; do
  if [ "${MODE}" == "full" ]; then
    DOCKER_IMAGE="cleanapp-docker-repo/cleanapp-frontend-image"
    NEXT_PUBLIC_EMBEDDED_MODE="false"
    CONTAINER_NAME="cleanapp_frontend"
    PORT="3001"
  else
    DOCKER_IMAGE="cleanapp-docker-repo/cleanapp-frontend-image-embedded"
    NEXT_PUBLIC_EMBEDDED_MODE="true"
    CONTAINER_NAME="cleanapp_frontend_embedded"
    PORT="3002"
  fi
  DOCKER_TAG="${CLOUD_REGION}-docker.pkg.dev/${PROJECT_NAME}/${DOCKER_IMAGE}"

  echo ""
  echo "🔨 Building ${MODE} image..."
  
  # Generate Dockerfile from template
  cat Dockerfile.template | \
  sed "s/{{NEXT_PUBLIC_API_URL}}/${ESCAPED_NEXT_PUBLIC_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}}/${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}/" | \
  sed "s/{{NEXT_PUBLIC_LIVE_API_URL}}/${ESCAPED_NEXT_PUBLIC_LIVE_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_TAGS_API_URL}}/${ESCAPED_NEXT_PUBLIC_TAGS_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL}}/${ESCAPED_NEXT_PUBLIC_WEBSOCKET_LIVE_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}}/${NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}/" | \
  sed "s/{{NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}}/${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}/" | \
  sed "s/{{NEXT_PUBLIC_EMBEDDED_MODE}}/${NEXT_PUBLIC_EMBEDDED_MODE}/" | \
  sed "s/{{NEXT_PUBLIC_MONTENEGRO_API_URL}}/${ESCAPED_NEXT_PUBLIC_MONTENEGRO_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_DEVCONNECT2025_API_URL}}/${ESCAPED_NEXT_PUBLIC_DEVCONNECT2025_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_EDGE_CITY_API_URL}}/${ESCAPED_NEXT_PUBLIC_EDGE_CITY_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_NEW_YORK_API_URL}}/${ESCAPED_NEXT_PUBLIC_NEW_YORK_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_REDBULL_API_URL}}/${ESCAPED_NEXT_PUBLIC_REDBULL_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_AUTH_API_URL}}/${ESCAPED_NEXT_PUBLIC_AUTH_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_AREAS_API_URL}}/${ESCAPED_NEXT_PUBLIC_AREAS_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_PLAYSTORE_URL}}/${ESCAPED_NEXT_PUBLIC_PLAYSTORE_URL}/" | \
  sed "s/{{NEXT_PUBLIC_APPSTORE_URL}}/${ESCAPED_NEXT_PUBLIC_APPSTORE_URL}/" | \
  sed "s/{{NEXT_PUBLIC_REF_API_URL}}/${ESCAPED_NEXT_PUBLIC_REF_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_REPORT_PROCESSING_API_URL}}/${ESCAPED_NEXT_PUBLIC_REPORT_PROCESSING_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_EMAIL_API_URL}}/${ESCAPED_NEXT_PUBLIC_EMAIL_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_WEBSITE_URL}}/${ESCAPED_NEXT_PUBLIC_WEBSITE_URL}/" | \
  sed "s/{{NEXT_PUBLIC_REPORT_COUNT_URL}}/${ESCAPED_NEXT_PUBLIC_REPORT_COUNT_URL}/" | \
  sed "s/{{NEXT_PUBLIC_RENDERER_API_URL}}/${ESCAPED_NEXT_PUBLIC_RENDERER_API_URL}/" \
  > Dockerfile

  # Build and push using Cloud Build
  gcloud builds submit \
    --region=${CLOUD_REGION} \
    --tag=${DOCKER_TAG}:${BUILD_VERSION}

  # Tag for environment
  echo "🏷️  Tagging as ${OPT}..."
  gcloud artifacts docker tags add ${DOCKER_TAG}:${BUILD_VERSION} ${DOCKER_TAG}:${OPT}

  # Cleanup
  rm -f Dockerfile

  # Deploy to VM
  echo "🚢 Deploying ${MODE} to ${VM_NAME}..."
  gcloud compute ssh ${VM_NAME} --zone=us-central1-a --command="
    echo 'Stopping ${CONTAINER_NAME}...'
    sudo docker stop ${CONTAINER_NAME} 2>/dev/null || true
    sudo docker rm ${CONTAINER_NAME} 2>/dev/null || true
    
    echo 'Authenticating with Docker registry...'
    ACCESS_TOKEN=\$(gcloud auth print-access-token)
    echo \"\${ACCESS_TOKEN}\" | docker login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
    
    echo 'Pulling new image...'
    docker pull ${DOCKER_TAG}:${OPT}
    
    echo 'Starting ${CONTAINER_NAME}...'
    sudo docker run -d --name ${CONTAINER_NAME} \
      --network deployer_default \
      -p ${PORT}:3000 \
      ${DOCKER_TAG}:${OPT}
    
    sudo docker ps | grep ${CONTAINER_NAME}
  "
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo "✅ Fast Frontend Deploy completed in ${MINUTES}m ${SECONDS}s"
echo "   Version: ${BUILD_VERSION}"
echo "   Environment: ${OPT}"
