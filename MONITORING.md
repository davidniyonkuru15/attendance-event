# Monitoring & Logging Setup

This document describes how to install and validate Prometheus/Grafana for metrics and Loki for logs, configure alerting, and demonstrate HPA scaling and feedback loop.

Prerequisites
- `helm`, `kubectl` installed and configured
- A running Kubernetes cluster (minikube, kind, or cloud)

1) Install Monitoring Stack

Run the installer script included in `scripts/install-monitoring.sh`:

```bash
chmod +x scripts/install-monitoring.sh
./scripts/install-monitoring.sh
```

This will deploy the `kube-prometheus-stack` (Prometheus + Grafana + Alertmanager) and Loki stack (Promtail + Loki).

2) Apply alerting rules

```bash
kubectl apply -f monitoring/alert-rules.yaml -n monitoring
kubectl apply -f monitoring/alertmanager-config.yaml -n monitoring
```

3) Configure Slack / Alertmanager

Edit `monitoring/alertmanager-config.yaml` and replace the Slack webhook URL with your workspace webhook, then re-apply.

4) Deploy HPA

```bash
kubectl apply -f k8s/hpa.yaml
kubectl get hpa -n attendance
```

5) Demonstrate scaling

Start a load generator (this will run `hey` in a pod to generate traffic for 60s):

```bash
chmod +x scripts/trigger_load.sh
./scripts/trigger_load.sh attendance

# Watch HPA and pods
kubectl get hpa -n attendance --watch
kubectl get pods -n attendance --watch
```

6) Logs

Open Grafana (port-forward):

```bash
kubectl -n monitoring port-forward svc/kube-prom-stack-grafana 3000:80
# Open http://localhost:3000 (admin/admin)
```

In Grafana you can add Loki as a data source (the Loki chart installs it automatically) and explore logs.

7) Feedback loop (pipeline triggers)

You can configure Alertmanager to POST to a small webhook that triggers a GitHub Actions workflow dispatch or repository_dispatch. A secure approach is to create a small server (or GitHub Actions workflow receiving `workflow_dispatch`) and call the GitHub REST API with a token when critical alerts fire.

Example Alertmanager webhook receiver (high level):

1. Create a GitHub Actions workflow that listens to `repository_dispatch` or `workflow_dispatch` and runs remediation/CI tasks.
2. In Alertmanager receivers, configure a `webhook_config` target pointing to your receiver endpoint which then calls GitHub API to trigger the pipeline using a secret token.

Important: storing secrets (GitHub token, webhook URLs) must be done in a secure place (Kubernetes Secrets or GitHub Secrets).
