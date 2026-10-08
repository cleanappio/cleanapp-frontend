#!/bin/bash
# Fast Frontend Deploy Script
# Builds the main frontend, optionally embedded; other services are unchanged.
# Usage: ./fastFEdeploy.sh -e <dev|prod> [--with-embedded] [--build-only]
#        [--source-sha <40-character commit>] [--metadata-file <path>]

set -euo pipefail

echo "🚀 Fast Frontend Deploy - Starting..."
START_TIME=$(date +%s)

OPT=""
WITH_EMBEDDED=false
BUILD_ONLY=false
SOURCE_SHA=""
METADATA_FILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    "-e"|"--env")
      OPT="${2:?Missing environment}"
      shift 2
      ;;
    "--with-embedded")
      WITH_EMBEDDED=true
      shift
      ;;
    "--build-only")
      BUILD_ONLY=true
      shift
      ;;
    "--source-sha")
      SOURCE_SHA="${2:?Missing source commit}"
      shift 2
      ;;
    "--metadata-file")
      METADATA_FILE="${2:?Missing metadata path}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "${OPT}" ]; then
  echo "Usage: $0 -e|--env <dev|prod> [--with-embedded] [--build-only] [--source-sha <sha>] [--metadata-file <path>]"
  echo ""
  echo "Options:"
  echo "  -e, --env         Environment (dev or prod)"
  echo "  --with-embedded   Also build and deploy embedded frontend"
  echo "  --build-only      Build all images without environment tags or VM changes"
  echo "  --source-sha      Source commit for immutable image provenance"
  echo "  --metadata-file   Write image digests and Cloud Build source metadata as JSON"
  exit 1
fi

if [ -z "$SOURCE_SHA" ]; then
  SOURCE_SHA=$(git rev-parse HEAD)
fi
if [[ ! "$SOURCE_SHA" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "Source commit must be exactly 40 hexadecimal characters." >&2
  exit 1
fi
SOURCE_SHA=$(printf '%s' "$SOURCE_SHA" | tr 'A-F' 'a-f')
if [ -e Dockerfile ]; then
  echo "Refusing to overwrite an existing Dockerfile." >&2
  exit 1
fi
command -v python3 >/dev/null

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

# Get secrets
echo "🔐 Fetching secrets..."
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$(gcloud secrets versions access latest --project="${PROJECT_NAME}" --secret="MAPBOX_ACCESS_TOKEN")
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(gcloud secrets versions access latest --project="${PROJECT_NAME}" --secret="GOOGLE_MAPS_API_KEY")
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
echo "   Source commit: ${SOURCE_SHA}"

BUILD_META_DIR=$(mktemp -d)
GENERATED_DOCKERFILE=false
cleanup() {
  if [ "$GENERATED_DOCKERFILE" = true ]; then rm -f Dockerfile; fi
  rm -rf "$BUILD_META_DIR"
}
trap cleanup EXIT
BUILT_MODES=()
BUILT_REFS=()
BUILT_DIGEST_REFS=()
BUILT_MODE_REFS=()

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
    MODE_NEXT_PUBLIC_RENDERER_API_URL="${NEXT_PUBLIC_RENDERER_API_URL}"
  else
    DOCKER_IMAGE="cleanapp-docker-repo/cleanapp-frontend-image-embedded"
    NEXT_PUBLIC_EMBEDDED_MODE="true"
    CONTAINER_NAME="cleanapp_frontend_embedded"
    PORT="3002"
    if [ "${OPT}" == "prod" ]; then
      MODE_NEXT_PUBLIC_RENDERER_API_URL="https://embed.cleanapp.io"
    else
      MODE_NEXT_PUBLIC_RENDERER_API_URL="https://devembed.cleanapp.io"
    fi
  fi
  ESCAPED_MODE_NEXT_PUBLIC_RENDERER_API_URL=$(echo ${MODE_NEXT_PUBLIC_RENDERER_API_URL} | sed 's/\//\\\//g')
  DOCKER_TAG="${CLOUD_REGION}-docker.pkg.dev/${PROJECT_NAME}/${DOCKER_IMAGE}"

  echo ""
  echo "🔨 Building ${MODE} image..."
  
  # Generate Dockerfile from OPTIMIZED template (uses prebuilt base images)
  GENERATED_DOCKERFILE=true
  cat Dockerfile.template.fast | \
  sed "s/{{BUILD_SOURCE_SHA}}/${SOURCE_SHA}/g" | \
  sed "s/{{BUILD_VERSION}}/${BUILD_VERSION}/g" | \
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
  sed "s/{{NEXT_PUBLIC_RENDERER_API_URL}}/${ESCAPED_MODE_NEXT_PUBLIC_RENDERER_API_URL}/" \
  > Dockerfile

  # Build and push using Cloud Build
  # Submit asynchronously and poll: a synchronous submit tries to read the
  # Cloud Build log bucket, which needs project Viewer and fails for the CI
  # deploy service account. Polling only needs cloudbuild.builds.get.
  BUILD_ID=$(gcloud builds submit \
    --project="${PROJECT_NAME}" \
    --region="${CLOUD_REGION}" \
    --tag="${DOCKER_TAG}:${BUILD_VERSION}" \
    --async --format='value(id)')
  echo "   Cloud Build ${BUILD_ID} submitted; waiting..."
  while :; do
    BUILD_STATUS=$(gcloud builds describe "$BUILD_ID" \
      --project="${PROJECT_NAME}" --region="${CLOUD_REGION}" --format='value(status)')
    case "$BUILD_STATUS" in
      SUCCESS) echo "   Cloud Build ${BUILD_ID}: SUCCESS"; break ;;
      FAILURE|INTERNAL_ERROR|TIMEOUT|CANCELLED|EXPIRED)
        echo "   Cloud Build ${BUILD_ID}: ${BUILD_STATUS}" >&2; exit 1 ;;
      *) sleep 15 ;;
    esac
  done
  gcloud builds describe "$BUILD_ID" \
    --project="${PROJECT_NAME}" --region="${CLOUD_REGION}" \
    --format='json(id,status,source.storageSource,results.images)' \
    > "${BUILD_META_DIR}/${MODE}.json"
  DIGEST=$(python3 - "${BUILD_META_DIR}/${MODE}.json" "${DOCKER_TAG}:${BUILD_VERSION}" <<'PY'
import json, re, sys
with open(sys.argv[1]) as handle:
    build = json.load(handle)
images = [image for image in build.get("results", {}).get("images", []) if image.get("name") == sys.argv[2]]
if build.get("status") != "SUCCESS" or len(images) != 1 or not re.fullmatch(r"sha256:[0-9a-f]{64}", images[0].get("digest", "")):
    raise SystemExit("Cloud Build did not return one successful immutable image digest.")
print(images[0]["digest"])
PY
  )
  BUILT_MODES+=("$MODE")
  BUILT_REFS+=("${DOCKER_TAG}:${BUILD_VERSION}")
  BUILT_DIGEST_REFS+=("${DOCKER_TAG}@${DIGEST}")
  BUILT_MODE_REFS+=("${MODE}|${DOCKER_TAG}:${BUILD_VERSION}")

  # Cleanup
  rm -f Dockerfile
  GENERATED_DOCKERFILE=false
done

# Finish every selected build before promoting tags or touching a running service.
python3 - "$BUILD_META_DIR" "$SOURCE_SHA" "$BUILD_VERSION" "$OPT" "$BUILD_ONLY" "$METADATA_FILE" "${BUILT_MODE_REFS[@]}" <<'PY'
import json, os, pathlib, sys
directory, source_sha, version, environment, build_only, output_path = sys.argv[1:7]
images = []
for mode_ref in sys.argv[7:]:
    mode, expected_tag = mode_ref.split("|", 1)
    with open(pathlib.Path(directory) / (mode + ".json")) as handle:
        build = json.load(handle)
    image = next(image for image in build["results"]["images"] if image["name"] == expected_tag)
    images.append({"mode": mode, "tag": image["name"], "digest": image["digest"], "image": image["name"].rsplit(":", 1)[0] + "@" + image["digest"], "build_id": build["id"], "source": build.get("source", {})})
manifest = {"source_sha": source_sha, "version": version, "environment": environment, "build_only": build_only == "true", "images": images}
if output_path:
    os.umask(0o077)
    path = pathlib.Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, sort_keys=True))
PY

if [ "$BUILD_ONLY" = false ]; then
for INDEX in "${!BUILT_MODES[@]}"; do
  MODE="${BUILT_MODES[$INDEX]}"
  IMAGE_REF="${BUILT_REFS[$INDEX]}"
  DIGEST_REF="${BUILT_DIGEST_REFS[$INDEX]}"
  ENV_REF="${IMAGE_REF%:*}:${OPT}"
  if [ "$MODE" = full ]; then
    CONTAINER_NAME="cleanapp_frontend"
    PORT="3001"
  else
    CONTAINER_NAME="cleanapp_frontend_embedded"
    PORT="3002"
  fi
  echo "🏷️  Tagging as ${OPT}..."
  gcloud artifacts docker tags add "$IMAGE_REF" "$ENV_REF" --project="${PROJECT_NAME}"

  # Deploy to VM
  echo "🚢 Deploying ${MODE} to ${VM_NAME}..."
  gcloud compute ssh ${VM_NAME} --project="${PROJECT_NAME}" --zone=us-central1-a --command="
    echo 'Stopping ${CONTAINER_NAME}...'
    sudo docker stop ${CONTAINER_NAME} 2>/dev/null || true
    sudo docker rm ${CONTAINER_NAME} 2>/dev/null || true
    
    echo 'Authenticating with Docker registry...'
    ACCESS_TOKEN=\$(gcloud auth print-access-token)
    echo \"\${ACCESS_TOKEN}\" | sudo docker login -u oauth2accesstoken --password-stdin https://us-central1-docker.pkg.dev
    
    echo 'Pulling new image...'
    sudo docker pull ${DIGEST_REF}
    
    echo 'Starting ${CONTAINER_NAME}...'
    sudo docker run -d --name ${CONTAINER_NAME} \
      --network deployer_default \
      -p ${PORT}:3000 \
      ${DIGEST_REF}
    
    sudo docker ps | grep ${CONTAINER_NAME}
  "
done
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo "✅ Fast Frontend Deploy completed in ${MINUTES}m ${SECONDS}s"
echo "   Version: ${BUILD_VERSION}"
echo "   Environment: ${OPT}"
echo "   Build only: ${BUILD_ONLY}"
