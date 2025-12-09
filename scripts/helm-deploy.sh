#!/bin/bash
# Deploy using Helm Chart
# Implements rolling updates via Helm

set -e

NAMESPACE="${NAMESPACE:-attendance}"
RELEASE_NAME="${RELEASE_NAME:-attendance-event}"
CHART_PATH="${CHART_PATH:-./helm/attendance-event}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKER_USERNAME="${DOCKER_USERNAME:-davidniyonkuru15}"

echo "=========================================="
echo "Helm Deployment Script"
echo "=========================================="
echo "Release: $RELEASE_NAME"
echo "Namespace: $NAMESPACE"
echo "Chart: $CHART_PATH"
echo "Image Tag: $IMAGE_TAG"
echo ""

# Create namespace if not exists
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Validate Helm chart
helm lint $CHART_PATH

# Deploy or upgrade with Helm
helm upgrade --install $RELEASE_NAME $CHART_PATH \
    --namespace $NAMESPACE \
    --set image.repository=${DOCKER_USERNAME}/attendance-event \
    --set image.tag=${IMAGE_TAG} \
    --set service.type=LoadBalancer \
    --values $CHART_PATH/values.yaml \
    --wait \
    --timeout 5m

echo ""
echo "=========================================="
echo "Deployment successful!"
echo "=========================================="
echo ""
echo "Get service info:"
kubectl get svc -n $NAMESPACE

echo ""
echo "Get deployment info:"
kubectl get deployment -n $NAMESPACE

echo ""
echo "Get pods:"
kubectl get pods -n $NAMESPACE

echo ""
echo "Get events:"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20
