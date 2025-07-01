echo "Building cleanapp frontend docker image..."

OPT=""
while [[ $# -gt 0 ]]; do
  case $1 in
    "-e"|"--env")
      OPT="$2"
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
  PS3="Please choose the environment: "
  options=("dev" "prod" "quit")
  select OPT in "${options[@]}"
  do
    case ${OPT} in
      "dev")
          echo "Using dev environment"
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51ReIGOFW3SknKzLcSITZxoZi8fySW11iQNY1SAe1dpzVOcHS2U05GlMZ6aQCcSdxILX0r6cm8Lx6yz4U8TR8l6HH00ihXdefVs"
          NEXT_PUBLIC_API_URL="https://devapi.cleanapp.io"
          NEXT_PUBLIC_LIVE_API_URL="https://devlive.cleanapp.io"
          break
          ;;
      "prod")
          echo "Using prod environment"
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_51RaMSvF5CkX59Cnm7ZTuIIx0Fg1cQxqilIpOHippAYaVqFMDft3AESH5Ih8aPn4wUFL2VX3Ou9LvwCgqD5O0SDvF00a8ybMiUq"
          NEXT_PUBLIC_API_URL="https://api.cleanapp.io"
          NEXT_PUBLIC_LIVE_API_URL="https://live.cleanapp.io"
          break
          ;;
      "quit")
          exit
          ;;
      *) echo "invalid option $REPLY";;
    esac
  done
fi

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY2xlYW5hcHAiLCJhIjoiY21jM3Zsb2s4MDlsbjJqb2ZzZGtpOWZvYSJ9.YIy8EXQ9IFtmGs55z71-NQ

. .version

# Increment version build number
if [ "${OPT}" == "dev" ]; then
  BUILD=$(echo ${BUILD_VERSION} | cut -f 3 -d ".")
  VER=$(echo ${BUILD_VERSION} | cut -f 1,2 -d ".")
  BUILD=$((${BUILD} + 1))
  BUILD_VERSION="${VER}.${BUILD}"
  echo "BUILD_VERSION=${BUILD_VERSION}" > .version
fi

echo "Running docker build for version ${BUILD_VERSION}"

set -e

# Construct Dockerfile
ESCAPED_NEXT_PUBLIC_API_URL=$(echo ${NEXT_PUBLIC_API_URL} | sed 's/\//\\\//g')
ESCAPED_NEXT_PUBLIC_LIVE_API_URL=$(echo ${NEXT_PUBLIC_LIVE_API_URL} | sed 's/\//\\\//g')
cat Dockerfile.template | \
sed "s/{{NEXT_PUBLIC_API_URL}}/${ESCAPED_NEXT_PUBLIC_API_URL}/" | \
sed "s/{{NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}}/${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}/" | \
sed "s/{{NEXT_PUBLIC_LIVE_API_URL}}/${ESCAPED_NEXT_PUBLIC_LIVE_API_URL}/" | \
sed "s/{{NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}}/${NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}/" \
 > Dockerfile

CLOUD_REGION="us-central1"
PROJECT_NAME="cleanup-mysql-v2"
DOCKER_IMAGE="cleanapp-docker-repo/cleanapp-frontend-image"
DOCKER_TAG="${CLOUD_REGION}-docker.pkg.dev/${PROJECT_NAME}/${DOCKER_IMAGE}"

CURRENT_PROJECT=$(gcloud config get project)
echo ${CURRENT_PROJECT}
if [ "${PROJECT_NAME}" != "${CURRENT_PROJECT}" ]; then
  gcloud auth login
  gcloud config set project ${PROJECT_NAME}
fi

if [ "${OPT}" == "dev" ]; then
  echo "Building and pushing docker image..."
  gcloud builds submit \
    --region=${CLOUD_REGION} \
    --tag=${DOCKER_TAG}:${BUILD_VERSION}
fi

echo "Tagging Docker image as current ${OPT}..."
gcloud artifacts docker tags add ${DOCKER_TAG}:${BUILD_VERSION} ${DOCKER_TAG}:${OPT}

test -f Dockerfile && rm Dockerfile
