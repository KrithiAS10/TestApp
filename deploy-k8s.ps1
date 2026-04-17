<#
.SYNOPSIS
  Deploy TestApp to Kubernetes: build local images, optionally load them into kind, apply manifests.

Prerequisites: Docker, kubectl. For kind clusters: kind CLI and a cluster name.

Examples:
  .\deploy-k8s.ps1
  .\deploy-k8s.ps1 -SkipBuild
  .\deploy-k8s.ps1 -KindCluster testapp
  .\deploy-k8s.ps1 -Namespace testapp -KindCluster testapp

Environment:
  TESTAPP_KIND_CLUSTER — default kind cluster name if -KindCluster is omitted.
#>
param(
    [switch]$SkipBuild,
    [switch]$SkipKindLoad,
    [string]$KindCluster = $env:TESTAPP_KIND_CLUSTER,
    [string]$Namespace = ""
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' not found in PATH."
    }
}

Require-Command kubectl
if (-not $SkipBuild) { Require-Command docker }

$nsArgs = @()
if ($Namespace) {
    Require-Command kubectl
    kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -
    $nsArgs = @("-n", $Namespace)
}

function Kubectl([string[]]$Args) {
    & kubectl @nsArgs @Args
    if ($LASTEXITCODE -ne 0) { throw "kubectl failed: $($Args -join ' ')" }
}

$images = @(
    "frontend",
    "api-gateway",
    "user-service",
    "product-service",
    "inventory-service",
    "order-service",
    "payment-service",
    "notification-service"
)

if (-not $SkipBuild) {
    Write-Host "Building frontend image..."
    docker build -f Dockerfile.frontend -t frontend $Root
    if ($LASTEXITCODE -ne 0) { throw "docker build frontend failed" }

    Write-Host "Building backend image (multi-tag)..."
    $tags = ($images | Where-Object { $_ -ne "frontend" } | ForEach-Object { @("-t", $_) })
    docker build -f Dockerfile.backend @tags $Root
    if ($LASTEXITCODE -ne 0) { throw "docker build backend failed" }
}

if ($KindCluster -and -not $SkipKindLoad) {
    Require-Command kind
    foreach ($img in $images) {
        Write-Host "kind load docker-image $img --name $KindCluster"
        kind load docker-image $img --name $KindCluster
        if ($LASTEXITCODE -ne 0) { throw "kind load failed for $img" }
    }
}
elseif ($KindCluster -and $SkipKindLoad) {
    Write-Host "Skipping kind load (-SkipKindLoad)."
}

Write-Host "Applying storage..."
Kubectl @("apply", "-f", (Join-Path $Root "mongodb-data-persistentvolumeclaim.yaml"))

Write-Host "Applying core infra (MongoDB, Redis, RabbitMQ, Jaeger)..."
Kubectl @(
    "apply", "-f", (Join-Path $Root "mongodb-deployment.yaml"),
    "-f", (Join-Path $Root "mongodb-service.yaml"),
    "-f", (Join-Path $Root "redis-deployment.yaml"),
    "-f", (Join-Path $Root "redis-service.yaml"),
    "-f", (Join-Path $Root "rabbitmq-deployment.yaml"),
    "-f", (Join-Path $Root "rabbitmq-service.yaml"),
    "-f", (Join-Path $Root "jaeger-deployment.yaml"),
    "-f", (Join-Path $Root "jaeger-service.yaml")
)

Write-Host "Waiting for MongoDB rollout..."
Kubectl @("rollout", "status", "deployment/mongodb", "--timeout=180s")

Write-Host "Running mongo replica set init (one-shot pod)..."
Kubectl @("delete", "pod", "mongo-init", "--ignore-not-found")
Kubectl @("apply", "-f", (Join-Path $Root "mongo-init-pod.yaml"))
Kubectl @("wait", "--for=jsonpath='{.status.phase}'=Succeeded", "pod/mongo-init", "--timeout=120s")

Write-Host "Applying application services..."
Kubectl @(
    "apply",
    "-f", (Join-Path $Root "user-service-deployment.yaml"),
    "-f", (Join-Path $Root "user-service.yaml"),
    "-f", (Join-Path $Root "product-service-deployment.yaml"),
    "-f", (Join-Path $Root "product-service.yaml"),
    "-f", (Join-Path $Root "inventory-service-deployment.yaml"),
    "-f", (Join-Path $Root "inventory-service.yaml"),
    "-f", (Join-Path $Root "order-service-deployment.yaml"),
    "-f", (Join-Path $Root "order-service.yaml"),
    "-f", (Join-Path $Root "payment-service-deployment.yaml"),
    "-f", (Join-Path $Root "payment-service.yaml"),
    "-f", (Join-Path $Root "notification-service-deployment.yaml"),
    "-f", (Join-Path $Root "api-gateway-deployment.yaml"),
    "-f", (Join-Path $Root "api-gateway-service.yaml"),
    "-f", (Join-Path $Root "frontend-deployment.yaml"),
    "-f", (Join-Path $Root "frontend-service.yaml")
)

if ($Namespace) {
    Write-Host "Done. Check status with: kubectl get pods -n $Namespace"
} else {
    Write-Host "Done. Check status with: kubectl get pods"
}
