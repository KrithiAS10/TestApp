#!/usr/bin/env bash
# Deploy TestApp to Kubernetes: build local images, optionally load them into kind, apply manifests.
#
# Usage:
#   ./deploy-k8s.sh
#   ./deploy-k8s.sh --skip-build
#   ./deploy-k8s.sh --kind-cluster testapp
#   ./deploy-k8s.sh --namespace testapp --kind-cluster testapp
#
# Env:
#   TESTAPP_KIND_CLUSTER — default kind cluster name when --kind-cluster is omitted.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SKIP_BUILD=0
SKIP_KIND_LOAD=0
KIND_CLUSTER="${TESTAPP_KIND_CLUSTER:-}"
NAMESPACE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-kind-load) SKIP_KIND_LOAD=1; shift ;;
    --kind-cluster)
      [[ $# -ge 2 ]] || { echo "--kind-cluster requires a value." >&2; exit 1; }
      KIND_CLUSTER="$2"
      shift 2
      ;;
    --namespace)
      [[ $# -ge 2 ]] || { echo "--namespace requires a value." >&2; exit 1; }
      NAMESPACE="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Required command '$1' not found in PATH." >&2; exit 1; }
}

require kubectl
[[ "$SKIP_BUILD" -eq 1 ]] || require docker

NS_ARGS=()
if [[ -n "$NAMESPACE" ]]; then
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
  NS_ARGS=(-n "$NAMESPACE")
fi

k() {
  kubectl "${NS_ARGS[@]}" "$@"
}

IMAGES=(
  frontend
  api-gateway
  user-service
  product-service
  inventory-service
  order-service
  payment-service
  notification-service
)

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "Building frontend image..."
  docker build -f Dockerfile.frontend -t frontend "$ROOT"

  echo "Building backend image (multi-tag)..."
  TAG_ARGS=()
  for img in "${IMAGES[@]}"; do
    [[ "$img" == "frontend" ]] && continue
    TAG_ARGS+=(-t "$img")
  done
  docker build -f Dockerfile.backend "${TAG_ARGS[@]}" "$ROOT"
fi

if [[ -n "$KIND_CLUSTER" && "$SKIP_KIND_LOAD" -eq 0 ]]; then
  require kind
  for img in "${IMAGES[@]}"; do
    echo "kind load docker-image $img --name $KIND_CLUSTER"
    kind load docker-image "$img" --name "$KIND_CLUSTER"
  done
elif [[ -n "$KIND_CLUSTER" && "$SKIP_KIND_LOAD" -eq 1 ]]; then
  echo "Skipping kind load (--skip-kind-load)."
fi

echo "Applying storage..."
k apply -f "$ROOT/mongodb-data-persistentvolumeclaim.yaml"

echo "Applying core infra (MongoDB, Redis, RabbitMQ, Jaeger)..."
k apply \
  -f "$ROOT/mongodb-deployment.yaml" \
  -f "$ROOT/mongodb-service.yaml" \
  -f "$ROOT/redis-deployment.yaml" \
  -f "$ROOT/redis-service.yaml" \
  -f "$ROOT/rabbitmq-deployment.yaml" \
  -f "$ROOT/rabbitmq-service.yaml" \
  -f "$ROOT/jaeger-deployment.yaml" \
  -f "$ROOT/jaeger-service.yaml"

echo "Waiting for MongoDB rollout..."
k rollout status deployment/mongodb --timeout=180s

echo "Running mongo replica set init (one-shot pod)..."
k delete pod mongo-init --ignore-not-found
k apply -f "$ROOT/mongo-init-pod.yaml"
k wait "--for=jsonpath='{.status.phase}'=Succeeded" pod/mongo-init --timeout=120s

echo "Applying application services..."
k apply \
  -f "$ROOT/user-service-deployment.yaml" \
  -f "$ROOT/user-service.yaml" \
  -f "$ROOT/product-service-deployment.yaml" \
  -f "$ROOT/product-service.yaml" \
  -f "$ROOT/inventory-service-deployment.yaml" \
  -f "$ROOT/inventory-service.yaml" \
  -f "$ROOT/order-service-deployment.yaml" \
  -f "$ROOT/order-service.yaml" \
  -f "$ROOT/payment-service-deployment.yaml" \
  -f "$ROOT/payment-service.yaml" \
  -f "$ROOT/notification-service-deployment.yaml" \
  -f "$ROOT/api-gateway-deployment.yaml" \
  -f "$ROOT/api-gateway-service.yaml" \
  -f "$ROOT/frontend-deployment.yaml" \
  -f "$ROOT/frontend-service.yaml"

echo "Done. Check status with: kubectl get pods ${NS_ARGS[*]}"
