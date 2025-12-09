#!/usr/bin/env bash
set -euo pipefail

# Simple load generator: create a Deployment that runs hey to hit the service
# Requires: kubectl, a running cluster and the attendance-app Service

NS=${1:-attendance}
LOAD_DEPLOY_NAME=attendance-loadgen

cat <<EOF | kubectl -n "$NS" apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $LOAD_DEPLOY_NAME
spec:
  replicas: 1
  selector:
    matchLabels:
      app: $LOAD_DEPLOY_NAME
  template:
    metadata:
      labels:
        app: $LOAD_DEPLOY_NAME
    spec:
      containers:
      - name: hey
        image: rakyll/hey:latest
        args: ["-z","60s","-q","10","-c","20","http://attendance-app:80/"]
        restartPolicy: Never
      restartPolicy: Never
EOF

echo "Created load generator deployment in namespace $NS. It will run for 60s." 
echo "Watch HPA with: kubectl get hpa -n $NS --watch"
