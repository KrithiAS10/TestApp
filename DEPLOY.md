# Deploying TestApp to Kubernetes

This repository uses local Docker images and Kubernetes manifests in the repository root.

## Prerequisites

- Docker or Podman installed and running
- `kubectl` configured to the target cluster
- If using `kind`, ensure your `kubectl` context points to the Kind cluster (for example `kind-testapp`)

## Build images

### Frontend image

```bash
docker build -f Dockerfile.frontend -t frontend .
```

### Backend images

This repository uses a single backend image that contains all backend workspaces. Tag it for each service so the manifests can use it locally.

```bash
docker build -f Dockerfile.backend \
  -t api-gateway \
  -t user-service \
  -t product-service \
  -t inventory-service \
  -t order-service \
  -t payment-service \
  -t notification-service .
```

### Load images into `kind` (if using kind)

If your cluster is a Kind cluster, load the built images into Kind so pods can start from the local images:

```bash
kind load docker-image frontend --name testapp
kind load docker-image api-gateway --name testapp
kind load docker-image user-service --name testapp
kind load docker-image product-service --name testapp
kind load docker-image inventory-service --name testapp
kind load docker-image order-service --name testapp
kind load docker-image payment-service --name testapp
kind load docker-image notification-service --name testapp
```

> Replace `testapp` with the actual Kind cluster name if different.

## Deploy to Kubernetes

Apply the Kubernetes manifests from the repository root:

```bash
kubectl apply -f .
```

If you want to deploy only a subset of resources, apply the specific files:

```bash
kubectl apply -f frontend-deployment.yaml -f frontend-service.yaml \
  -f api-gateway-deployment.yaml -f api-gateway-service.yaml \
  -f user-service-deployment.yaml -f user-service.yaml \
  -f product-service-deployment.yaml -f product-service.yaml \
  -f inventory-service-deployment.yaml -f inventory-service.yaml \
  -f order-service-deployment.yaml -f order-service.yaml \
  -f payment-service-deployment.yaml -f payment-service.yaml \
  -f notification-service-deployment.yaml -f notification-service.yaml
```

## Restarting deployments

Restart a single deployment:

```bash
kubectl rollout restart deployment/<deployment-name>
```

For example:

```bash
kubectl rollout restart deployment/api-gateway
kubectl rollout restart deployment/frontend
```

Restart all app deployments in the default namespace:

```bash
kubectl rollout restart deployment/api-gateway frontend user-service product-service inventory-service order-service payment-service notification-service
```

## Verification

Check the status of deployments and pods:

```bash
kubectl get deployments
kubectl get pods
```

Watch rollout status for a deployment:

```bash
kubectl rollout status deployment/api-gateway
kubectl rollout status deployment/frontend
```

## Notes

- The manifests use `imagePullPolicy: Never`, so the cluster expects these images to exist locally or be loaded into the cluster runtime.
- If you change backend source code or service workspace configuration, rebuild the backend image and reload it into the cluster.
