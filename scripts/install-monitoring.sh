#!/usr/bin/env bash
set -euo pipefail

# Installs Prometheus/Grafana and Loki stack via Helm into the local cluster
# Requires: helm, kubectl, internet access to pull charts

NAMESPACE_MONITORING=monitoring

echo "Creating namespace $NAMESPACE_MONITORING (if missing)"
kubectl create namespace "$NAMESPACE_MONITORING" --dry-run=client -o yaml | kubectl apply -f -

echo "Adding Helm repos"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

echo "Installing kube-prometheus-stack (Prometheus + Alertmanager + Grafana)"
helm upgrade --install kube-prom-stack prometheus-community/kube-prometheus-stack \
  -n "$NAMESPACE_MONITORING" \
  --set grafana.enabled=true \
  --set grafana.adminPassword=admin \
  --wait

echo "Installing Loki stack for logs (promtail + loki + grafana integration)"
helm upgrade --install loki grafana/loki-stack -n "$NAMESPACE_MONITORING" \
  --set grafana.enabled=false \
  --set promtail.enabled=true \
  --wait

echo
echo "Monitoring stack installed into namespace: $NAMESPACE_MONITORING"
echo "Grafana admin user: admin / admin (change password immediately)"
echo "To port-forward Grafana: kubectl -n $NAMESPACE_MONITORING port-forward svc/kube-prom-stack-grafana 3000:80"
echo "To view Prometheus: kubectl -n $NAMESPACE_MONITORING port-forward svc/kube-prom-stack-prometheus 9090:9090"

exit 0
