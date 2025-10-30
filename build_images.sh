echo "Building cleanapp frontend docker image..."

OPT=""
SSH_KEYFILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    "-e"|"--env")
      OPT="$2"
      shift 2
      ;;
    "--ssh-keyfile")
      SSH_KEYFILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Choose the environment if not specified
if [ -z "${OPT}" ]; then
  echo "Usage: $0 -e|--env <dev|prod> [--ssh-keyfile <ssh_keyfile>]"
  exit 1
fi

case ${OPT} in
  "dev")
      echo "Using dev environment"
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51ReIGOFW3SknKzLcSITZxoZi8fySW11iQNY1SAe1dpzVOcHS2U05GlMZ6aQCcSdxILX0r6cm8Lx6yz4U8TR8l6HH00ihXdefVs"
      NEXT_PUBLIC_API_URL="https://devapi.cleanapp.io"
      NEXT_PUBLIC_LIVE_API_URL="https://devlive.cleanapp.io"
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
      TARGET_VM_IP="34.132.121.53"
      NEXT_PUBLIC_WEBSITE_URL="https://dev.cleanapp.io"
      NEXT_PUBLIC_REPORT_COUNT_URL="http://dev.api.cleanapp.io:8080/valid-reports-count"
      break
      ;;
  "prod")
      echo "Using prod environment"
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_51RaMSvF5CkX59Cnm7ZTuIIx0Fg1cQxqilIpOHippAYaVqFMDft3AESH5Ih8aPn4wUFL2VX3Ou9LvwCgqD5O0SDvF00a8ybMiUq"
      NEXT_PUBLIC_API_URL="https://api.cleanapp.io"
      NEXT_PUBLIC_LIVE_API_URL="https://live.cleanapp.io"
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
      TARGET_VM_IP="34.122.15.16"
      NEXT_PUBLIC_WEBSITE_URL="https://www.cleanapp.io"
      NEXT_PUBLIC_REPORT_COUNT_URL="http://api.cleanapp.io:8080/valid-reports-count"
      break
      ;;
  *)
    echo "Usage: $0 -e|--env <dev|prod> [--ssh-keyfile <ssh_keyfile>]"
    exit 1
    ;;
esac

CLOUD_REGION="us-central1"
PROJECT_NAME="cleanup-mysql-v2"
CURRENT_PROJECT=$(gcloud config get project)
echo ${CURRENT_PROJECT}
if [ "${PROJECT_NAME}" != "${CURRENT_PROJECT}" ]; then
  gcloud auth login
  gcloud config set project ${PROJECT_NAME}
fi

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=$(gcloud secrets versions access 1 --secret="MAPBOX_ACCESS_TOKEN")
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(gcloud secrets versions access 1 --secret="GOOGLE_MAPS_API_KEY")
NEXT_PUBLIC_PLAYSTORE_URL="https://play.google.com/store/apps/details?id=com.cleanapp"
NEXT_PUBLIC_APPSTORE_URL="https://apps.apple.com/us/app/cleanapp/id6466403301"

. .version

# Increment version build number
BUILD=$(echo ${BUILD_VERSION} | cut -f 3 -d ".")
VER=$(echo ${BUILD_VERSION} | cut -f 1,2 -d ".")
BUILD=$((${BUILD} + 1))
BUILD_VERSION="${VER}.${BUILD}"
echo "BUILD_VERSION=${BUILD_VERSION}" > .version

echo "Running docker build for version ${BUILD_VERSION}"

set -e

# Build the full and embedded images

for MODE in "full" "embedded"; do
  if [ "${MODE}" == "full" ]; then
    DOCKER_IMAGE="cleanapp-docker-repo/cleanapp-frontend-image"
  else
    DOCKER_IMAGE="cleanapp-docker-repo/cleanapp-frontend-image-embedded"
  fi
  DOCKER_TAG="${CLOUD_REGION}-docker.pkg.dev/${PROJECT_NAME}/${DOCKER_IMAGE}"

  # Construct Dockerfile
  ESCAPED_NEXT_PUBLIC_API_URL=$(echo ${NEXT_PUBLIC_API_URL} | sed 's/\//\\\//g')
  ESCAPED_NEXT_PUBLIC_LIVE_API_URL=$(echo ${NEXT_PUBLIC_LIVE_API_URL} | sed 's/\//\\\//g')
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
  if [ "${MODE}" == "full" ]; then
    NEXT_PUBLIC_EMBEDDED_MODE="false"
  else
    NEXT_PUBLIC_EMBEDDED_MODE="true"
  fi
  cat Dockerfile.template | \
  sed "s/{{NEXT_PUBLIC_API_URL}}/${ESCAPED_NEXT_PUBLIC_API_URL}/" | \
  sed "s/{{NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}}/${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}/" | \
  sed "s/{{NEXT_PUBLIC_LIVE_API_URL}}/${ESCAPED_NEXT_PUBLIC_LIVE_API_URL}/" | \
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

  echo "Building and pushing docker image..."
  gcloud builds submit \
    --region=${CLOUD_REGION} \
    --tag=${DOCKER_TAG}:${BUILD_VERSION}

  echo "Tagging Docker image as current ${OPT}..."
  gcloud artifacts docker tags add ${DOCKER_TAG}:${BUILD_VERSION} ${DOCKER_TAG}:${OPT}

  test -f Dockerfile && rm Dockerfile
done

if [ -n "${SSH_KEYFILE}" ]; then
  SETUP_SCRIPT="https://raw.githubusercontent.com/cleanappio/cleanapp_back_end_v2/refs/heads/main/setup/setup.sh"
  curl ${SETUP_SCRIPT} > deploy.sh
  chmod +x deploy.sh
  ./deploy.sh -e ${OPT} --ssh-keyfile ${SSH_KEYFILE}
  rm deploy.sh
fi