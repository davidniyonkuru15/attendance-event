# Kubernetes Deployment Guide

This guide covers deploying the Attendance Event application to Kubernetes using rolling updates, blue-green deployment, and Helm charts.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Resource Requirements](#resource-requirements)
- [Deployment Methods](#deployment-methods)
- [Rolling Updates](#rolling-updates)
- [Blue-Green Deployment](#blue-green-deployment)
- [Monitoring & Scaling](#monitoring--scaling)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Kubernetes cluster (1.24+) with at least 3 nodes
- `kubectl` configured to access your cluster ([Install kubectl](https://kubernetes.io/docs/tasks/tools/))
- `helm` 3.0+ installed ([Install Helm](https://helm.sh/docs/intro/install/))
- Docker images pushed to Docker Hub (`davidniyonkuru15/attendance-event:latest`)
- Local environment with kubectl/helm **OR** CI/CD environment (GitHub Actions, GitLab CI, etc.)

## Architecture

The deployment consists of:

1. **Namespace**: `attendance` - Isolated environment for the application
2. **Deployment**: 3 replicas of the attendance app with rolling updates
3. **Service**: LoadBalancer exposing port 80 → 4000
4. **StatefulSet**: MySQL database with persistent storage
5. **ConfigMap**: Environment configurations
6. **Secrets**: Database credentials
7. **PodDisruptionBudget**: Ensures 2 pods remain during disruptions
8. **HPA**: Auto-scales 2-10 replicas based on CPU/memory

## Resource Requirements

### Application Pod Requirements:
```
CPU Requests:  100m   (0.1 cores)  - minimum guaranteed CPU
CPU Limits:    500m   (0.5 cores)  - maximum CPU allowed
Memory Requests: 128Mi            - minimum guaranteed memory
Memory Limits:   512Mi            - maximum memory allowed
```

**Calculation for 3 replicas:**
- Total CPU Requested: 300m (0.3 cores)
- Total CPU Limited: 1500m (1.5 cores)
- Total Memory Requested: 384Mi
- Total Memory Limited: 1.5Gi

### MySQL Requirements:
```
CPU Requests:  250m   (0.25 cores)
CPU Limits:    1000m  (1 core)
Memory Requests: 256Mi
Memory Limits:   1Gi
Storage:         10Gi
```

**Minimum Cluster Requirements:**
- 2-3 worker nodes
- Each node: 2 CPU cores, 4GB RAM (for 3 app + 1 MySQL pod)
- Storage: 10Gi for MySQL persistent volume

## Deployment Methods

### Method 1: Using Helm (Recommended) - CI/CD or Local with kubectl/helm

**Prerequisites:** kubectl and helm must be installed locally

```bash
# Clone and navigate to repo
git clone <repo-url>
cd attendance-event

# Create namespace and secrets
kubectl create namespace attendance
kubectl create secret generic db-credentials \
  --from-literal=username=root \
  --from-literal=password=rootpassword \
  -n attendance

# Make script executable (if needed)
chmod +x scripts/helm-deploy.sh

# Deploy using Helm (requires kubectl and helm installed)
./scripts/helm-deploy.sh

# Or use environment variables
export IMAGE_TAG=latest
export NAMESPACE=attendance
./scripts/helm-deploy.sh

# Check deployment
kubectl get all -n attendance
```

**Note:** This script runs in:
- GitHub Actions CI/CD (tools pre-installed)
- Local machine with kubectl/helm installed
- Any system with kubectl/helm available

### Method 2: Using kubectl with Manifests - Any System

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl apply -f k8s/secret.yaml k8s/mysql-secret.yaml

# Deploy MySQL first
kubectl apply -f k8s/mysql-service.yaml k8s/mysql-statefulset.yaml

# Wait for MySQL to be ready
kubectl wait --for=condition=ready pod -l app=mysql -n attendance --timeout=300s

# Deploy application
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml k8s/service.yaml
kubectl apply -f k8s/poddisruptionbudget.yaml

# Check status
kubectl get all -n attendance
```

## Rolling Updates

Rolling updates are the default strategy - pods are gradually replaced without downtime.

### Configuration:
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1      # One extra pod can be created
    maxUnavailable: 1 # One pod can be unavailable during update
```

**Update Process:**
1. New pod with new image is created
2. Old pod is gracefully terminated (30s grace period)
3. Repeat until all pods updated
4. Always maintains at least 2 pods running (due to PodDisruptionBudget)

### Triggering a Rolling Update:

```bash
# Update image tag
kubectl set image deployment/attendance-app \
  attendance-app=davidniyonkuru15/attendance-event:v2.0.0 \
  -n attendance \
  --record

# Check rollout status
kubectl rollout status deployment/attendance-app -n attendance

# View rollout history
kubectl rollout history deployment/attendance-app -n attendance

# Rollback to previous version
kubectl rollout undo deployment/attendance-app -n attendance

# Rollback to specific revision
kubectl rollout undo deployment/attendance-app --to-revision=2 -n attendance
```

### Helm Rolling Update:

```bash
# Update image tag in Helm
helm upgrade attendance-event ./helm/attendance-event \
  --set image.tag=v2.0.0 \
  -n attendance \
  --wait

# Watch rollout
kubectl rollout status deployment/attendance-event-app -n attendance -w
```

## Using Blue-Green Deploy Script

Zero-downtime deployments by running two identical environments and switching traffic.

**Prerequisites:** kubectl must be installed

### How It Works:

1. **Blue Environment**: Current live environment
2. **Green Environment**: New deployment with updated version
3. **Health Check**: Verify green environment is healthy
4. **Switch**: Route traffic to green
5. **Rollback Ready**: Blue remains available for instant rollback

### Using Blue-Green Deploy Script:

```bash
# Make script executable (if needed)
chmod +x scripts/blue-green-deploy.sh

# Set environment variables
export IMAGE=davidniyonkuru15/attendance-event:v2.0.0
export NAMESPACE=attendance

# Deploy to inactive environment (requires kubectl installed)
./scripts/blue-green-deploy.sh deploy

# If issues occur, rollback instantly
./scripts/blue-green-deploy.sh rollback
```

**Note:** This script requires kubectl to be installed. It's designed to run in:
- Local machine with kubectl installed
- CI/CD environments (GitHub Actions, etc.) with kubectl pre-installed

### Manual Blue-Green Setup:

```bash
# Create blue and green deployments
kubectl create deployment attendance-app-blue \
  --image=davidniyonkuru15/attendance-event:v1.0.0 \
  -n attendance \
  -o yaml | \
  kubectl set selector -f - \
  color=blue --overwrite -o yaml | \
  kubectl apply -f -

kubectl create deployment attendance-app-green \
  --image=davidniyonkuru15/attendance-event:v1.0.0 \
  -n attendance \
  -o yaml | \
  kubectl set selector -f - \
  color=green --overwrite -o yaml | \
  kubectl apply -f -

# Create service pointing to blue
kubectl create service loadbalancer attendance-app \
  --tcp=80:4000 \
  -n attendance \
  -o yaml | \
  kubectl set selector -f - \
  color=blue --overwrite -o yaml | \
  kubectl apply -f -

# Update green with new version
kubectl set image deployment/attendance-app-green \
  attendance-app-green=davidniyonkuru15/attendance-event:v2.0.0 \
  -n attendance

# Wait for green to be healthy
kubectl wait --for=condition=ready pod -l app=attendance-app-green -n attendance

# Switch traffic to green
kubectl patch service attendance-app -n attendance \
  -p '{"spec":{"selector":{"color":"green"}}}'

# Verify traffic is on green
kubectl get service attendance-app -n attendance
```

## Monitoring & Scaling

### View Resource Usage:

```bash
# Pod metrics
kubectl top pods -n attendance

# Node metrics
kubectl top nodes

# Deployment metrics
kubectl get deployment -n attendance -o wide

# Check HPA status
kubectl get hpa -n attendance
```

### Manual Scaling:

```bash
# Scale to specific replicas
kubectl scale deployment attendance-app --replicas=5 -n attendance

# View scaling events
kubectl describe deployment attendance-app -n attendance
```

### Auto-Scaling (HPA):

```bash
# Check HPA status
kubectl get hpa -n attendance

# Watch HPA activity
kubectl get hpa -n attendance -w

# Describe HPA for details
kubectl describe hpa attendance-event -n attendance
```

**HPA Configuration:**
- Min replicas: 2
- Max replicas: 10
- CPU trigger: 80% utilization
- Memory trigger: 85% utilization

## Troubleshooting

### Check Pod Status:

```bash
# Get all pods
kubectl get pods -n attendance

# Describe failing pod
kubectl describe pod <pod-name> -n attendance

# View pod logs
kubectl logs <pod-name> -n attendance

# Tail logs
kubectl logs -f <pod-name> -n attendance

# Previous logs (if pod crashed)
kubectl logs <pod-name> --previous -n attendance
```

### Check Deployment Status:

```bash
# Deployment status
kubectl get deployment -n attendance -o wide

# Describe deployment
kubectl describe deployment attendance-app -n attendance

# Check rollout status
kubectl rollout status deployment/attendance-app -n attendance
```

### Database Connectivity Issues:

```bash
# Check MySQL pod
kubectl get pod -l app=mysql -n attendance

# MySQL logs
kubectl logs mysql-0 -n attendance

# Test MySQL from app pod
kubectl exec -it <app-pod> -n attendance -- sh
mysql -h mysql.attendance.svc.cluster.local -u root -p

# Check ConfigMap
kubectl get configmap -n attendance -o yaml
```

### Service & Network Issues:

```bash
# Check service
kubectl get service -n attendance

# Port forward to test locally
kubectl port-forward svc/attendance-app 8080:80 -n attendance
curl http://localhost:8080

# Check endpoints
kubectl get endpoints -n attendance
```

### Events & Errors:

```bash
# Recent events
kubectl get events -n attendance --sort-by='.lastTimestamp'

# Describe resource for events
kubectl describe deployment attendance-app -n attendance

# All events
kubectl get events -n attendance -A --sort-by='.lastTimestamp'
```

## Best Practices

1. **Always set resource requests and limits** - Prevents resource starvation
2. **Use health probes** - Ensures only healthy pods receive traffic
3. **Implement PodDisruptionBudget** - Maintains availability during node maintenance
4. **Use ReadinessProbes** - Prevents traffic to booting pods
5. **Enable autoscaling** - Automatically handles load spikes
6. **Use blue-green for critical updates** - Zero-downtime deployments
7. **Monitor metrics** - Track CPU, memory, and custom metrics
8. **Plan node capacity** - Ensure nodes have enough resources
