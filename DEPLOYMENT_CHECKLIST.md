# Deployment Checklist

## ✅ Pre-Deployment Verification

### Code & Tests
- [ ] All unit tests passing locally (`npm test`)
- [ ] All integration tests passing (`npm test -- integration`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code review completed
- [ ] Security scan passed (check GitHub Actions)

### Git & Version Control
- [ ] All changes committed
- [ ] Branch is up to date with main
- [ ] No uncommitted files (`git status`)
- [ ] Last commit pushed to GitHub

### Configuration
- [ ] `.env` file configured correctly
- [ ] Database credentials set
- [ ] Environment variables validated
- [ ] No hardcoded secrets in code

---

## ✅ Docker Hub Setup

### Account & Credentials
- [ ] Docker Hub account: `davidniyonkuru15`
- [ ] Access token generated (Settings → Security → Access Tokens)
- [ ] Token has read/write permissions

### GitHub Secrets Configuration
Go to: https://github.com/davidniyonkuru15/attendance-event/settings/secrets/actions

Add:
```
DOCKER_USERNAME: davidniyonkuru15
DOCKER_PASSWORD: <your-docker-hub-token>
```

Verify:
- [ ] Secrets visible in Settings
- [ ] Secrets hidden (*** shown in logs)

---

## ✅ Slack Webhook Setup

### Generate Webhook
1. Go to Slack workspace settings
2. Create incoming webhook for your channel
3. Copy webhook URL

### Add to GitHub Secrets
Go to: https://github.com/davidniyonkuru15/attendance-event/settings/secrets/actions

Add:
```
SLACK_WEBHOOK_URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Verify:
- [ ] Webhook URL saved in secrets
- [ ] Test webhook by pushing a commit

---

## ✅ GitHub Actions Validation

### First Deployment
1. Make a small test commit:
   ```bash
   echo "# Ready to deploy" >> DEPLOYMENT_NOTES.md
   git add DEPLOYMENT_NOTES.md
   git commit -m "chore: Ready for deployment"
   git push origin main
   ```

2. Monitor workflow:
   - [ ] Open GitHub Actions tab
   - [ ] Wait for all jobs to complete
   - [ ] Verify test job passes
   - [ ] Verify quality job passes
   - [ ] Verify build job completes
   - [ ] Check Slack for notifications

### Expected Results
- [ ] ✅ Test: 6/6 passed
- [ ] ✅ Quality: No errors
- [ ] ✅ Build: Image pushed to Docker Hub
- [ ] ✅ Deploy: Skipped (no DEPLOY secrets, expected)
- [ ] ✅ K8s Deploy: Skipped (no KUBE_CONFIG, expected)
- [ ] 📢 Slack: Received all notifications

---

## ✅ Docker Deployment (Optional)

### Manual SSH Deploy Setup

If deploying to a server via SSH:

1. Generate SSH key (if not exists):
   ```bash
   ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key
   ```

2. Add GitHub Secrets:
   ```
   DEPLOY_SSH_PRIVATE_KEY: <contents of ~/.ssh/deploy_key>
   DEPLOY_USER: <ssh-username>
   DEPLOY_HOST: <server-ip-or-hostname>
   ```

3. Add SSH key to server:
   ```bash
   cat ~/.ssh/deploy_key.pub | ssh user@host "cat >> ~/.ssh/authorized_keys"
   ```

4. Test SSH connectivity:
   ```bash
   ssh -i ~/.ssh/deploy_key user@host "echo 'SSH works!'"
   ```

5. Verify deployment job:
   - [ ] Push a commit to main
   - [ ] Check GitHub Actions deploy job runs
   - [ ] Check Slack for deploy status
   - [ ] SSH to server and verify container running:
     ```bash
     ssh user@host "docker ps | grep attendance-app"
     ```

---

## ✅ Kubernetes Deployment (Optional)

### Cluster Setup
- [ ] Kubernetes cluster running (local or cloud)
- [ ] kubectl installed and configured
- [ ] Helm 3.x installed
- [ ] kubeconfig file accessible

### Generate Base64 Kubeconfig
```bash
cat ~/.kube/config | base64 -w 0
```

### Add GitHub Secrets
```
KUBE_CONFIG: <base64-encoded-kubeconfig>
K8S_CLUSTER_NAME: <your-cluster-name>
DB_PASSWORD: <database-password>
```

### Manual Deployment Commands

**Option 1: Using Kubectl**
```bash
# Create namespace and apply manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mysql-statefulset.yaml
kubectl apply -f k8s/mysql-service.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/poddisruptionbudget.yaml
```

**Option 2: Using Helm**
```bash
helm install attendance-event helm/attendance-event \
  -n attendance \
  --create-namespace \
  --set image.tag=latest \
  --set autoscaling.enabled=true
```

### Verify Deployment
```bash
# Check namespace
kubectl get namespace attendance

# Check deployments
kubectl get deployments -n attendance

# Check pods
kubectl get pods -n attendance

# Check services
kubectl get svc -n attendance

# Check MySQL
kubectl get statefulset -n attendance
kubectl get pvc -n attendance

# View logs
kubectl logs -f deployment/attendance-app -n attendance

# Monitor HPA
kubectl get hpa -n attendance

# Get events
kubectl get events -n attendance --sort-by='.lastTimestamp'
```

### First K8s Deployment
- [ ] Apply namespace and secrets
- [ ] Apply database manifests
- [ ] Apply application manifests
- [ ] Wait for pods to be ready (1-2 minutes)
- [ ] Verify health checks passing:
  ```bash
  kubectl get pods -n attendance --watch
  ```
- [ ] Check service load balancer:
  ```bash
  kubectl get svc -n attendance
  ```
- [ ] Access application (external IP or port-forward)
- [ ] Monitor in Slack

---

## ✅ Blue-Green Deployment (Optional)

### For Zero-Downtime Updates
```bash
# Deploy new version alongside current
./scripts/blue-green-deploy.sh deploy

# Verify both versions running
kubectl get pods -n attendance

# Switch traffic to new version
./scripts/blue-green-deploy.sh switch

# Rollback if needed
./scripts/blue-green-deploy.sh rollback
```

---

## ✅ Monitoring & Observability

### Health Checks
- [ ] Application responding to `/health` endpoint
- [ ] Database connection healthy
- [ ] MySQL service responding

### Pod Monitoring
```bash
# CPU and memory usage
kubectl top pods -n attendance

# Pod resource requests
kubectl describe pods -n attendance

# Pod events
kubectl describe pod <pod-name> -n attendance
```

### Log Monitoring
```bash
# Real-time logs
kubectl logs -f deployment/attendance-app -n attendance

# Previous pod logs (if crashed)
kubectl logs <pod-name> --previous -n attendance

# All pods logs
kubectl logs -l app=attendance-app -n attendance --all-containers=true
```

### Scaling Monitoring
```bash
# Auto-scaling status
kubectl get hpa -n attendance --watch

# Manual scaling
kubectl scale deployment/attendance-app --replicas=5 -n attendance
```

---

## ✅ Release Process

### Creating a Release

1. Update version in `package.json`:
   ```json
   "version": "1.0.0"
   ```

2. Create git tag:
   ```bash
   git tag v1.0.0 -m "Release version 1.0.0"
   ```

3. Push tag:
   ```bash
   git push origin v1.0.0
   ```

4. GitHub Actions will:
   - [ ] Create GitHub Release
   - [ ] Generate release notes
   - [ ] Send Slack notification

### Verify Release
- [ ] GitHub Release created: https://github.com/davidniyonkuru15/attendance-event/releases
- [ ] Release notes populated
- [ ] Docker image tagged with version
- [ ] Slack notification received

---

## ✅ Post-Deployment Verification

### Application Health
- [ ] Application responding on correct port (4000)
- [ ] Health check endpoint returns 200 OK
- [ ] Database queries working
- [ ] All API endpoints responding

### Performance Checks
```bash
# Response time
curl -w "@curl-format.txt" -o /dev/null -s http://your-app-url/

# Load test (if available)
ab -n 1000 -c 10 http://your-app-url/
```

### Security Checks
- [ ] No sensitive data in logs
- [ ] HTTPS enforced (if applicable)
- [ ] Database credentials protected
- [ ] API authentication working

### Database Verification
```bash
# Connect to MySQL
kubectl exec -it <mysql-pod> -n attendance -- mysql -u root -p

# Check databases
SHOW DATABASES;
USE attendance_db;
SHOW TABLES;
SELECT COUNT(*) FROM attendances;
```

---

## ✅ Troubleshooting

### Pipeline Fails
1. Check GitHub Actions logs
2. Verify secrets configured
3. Run tests locally
4. Check Docker Hub credentials

### Pod Fails to Start
1. Check pod logs: `kubectl logs <pod-name> -n attendance`
2. Check pod events: `kubectl describe pod <pod-name> -n attendance`
3. Check resource limits: `kubectl top pods -n attendance`
4. Check MySQL connectivity: `kubectl exec <pod> -n attendance -- curl localhost:3306`

### Database Connection Issues
1. Check secret configuration: `kubectl get secret -n attendance`
2. Verify MySQL pod running: `kubectl get pods -n attendance -l app=mysql`
3. Check service: `kubectl get svc -n attendance -l app=mysql`
4. Test connectivity: `kubectl exec <pod> -- mysql -h mysql -u root -p$DB_PASSWORD`

### High Pod Memory Usage
1. Check limits: `kubectl describe pod <pod> -n attendance`
2. Reduce replicas for testing
3. Check for memory leaks in logs
4. Scale HPA min/max appropriately

---

## ✅ Rollback Procedure

### If Deployment Fails

**Kubernetes**:
```bash
# Check rollout history
kubectl rollout history deployment/attendance-app -n attendance

# Rollback to previous version
kubectl rollout undo deployment/attendance-app -n attendance

# Verify rollback
kubectl rollout status deployment/attendance-app -n attendance
```

**Blue-Green**:
```bash
# Check both versions running
kubectl get pods -n attendance -l version=blue,green

# Switch traffic back
./scripts/blue-green-deploy.sh rollback
```

**Docker (SSH)**:
```bash
ssh user@host
docker ps -a | grep attendance-app
docker start <old-container-id>
docker stop <new-container-id>
```

---

## ✅ Documentation Links

- **GitHub Actions Workflow:** `.github/workflows/ci.yml`
- **Kubernetes Manifests:** `k8s/`
- **Helm Chart:** `helm/attendance-event/`
- **Deployment Scripts:** `scripts/`
- **Kubernetes Guide:** `KUBERNETES.md`
- **CI/CD Guide:** `CI_CD_QUICK_REFERENCE.md`
- **Project Summary:** `PROJECT_SUMMARY.md`

---

## ✅ Sign-Off

- [ ] All pre-deployment checks passed
- [ ] GitHub Actions workflow verified
- [ ] Docker images built and pushed
- [ ] Kubernetes manifests validated
- [ ] Monitoring configured
- [ ] Team notified
- [ ] Deployment complete
- [ ] Post-deployment verification done

**Deployed by:** ________________
**Date:** ________________
**Version:** ________________
**Status:** ✅ Ready / ❌ Issues

---

**For support:** Check `KUBERNETES.md` troubleshooting or GitHub Actions logs
