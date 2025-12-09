# CI/CD Pipeline - Quick Reference

## Overview

This project has a fully automated CI/CD pipeline that tests, builds, and deploys the application across multiple environments.

## Pipeline Jobs

### 1. **Test** (Always Runs)
```
Trigger: Push to main or PR
Status: ✅ 6/6 tests passing
```
- Runs Jest unit tests
- Runs integration tests
- Generates JUnit XML reports
- Posts results to GitHub PR

**Manual Test:**
```bash
npm test
```

### 2. **Quality** (After Test Passes)
```
Trigger: After successful test
Notifications: Slack
```
- ESLint code quality analysis
- OWASP dependency scanning
- Generates security reports

**Manual Check:**
```bash
npm run lint
```

### 3. **Build** (After Quality Passes)
```
Trigger: After successful quality checks
Image: davidniyonkuru15/attendance-event:latest
Image: davidniyonkuru15/attendance-event:<commit-sha>
Notifications: Slack
```
- Builds Docker image
- Pushes to Docker Hub
- Tags with commit SHA and latest

**Manual Build:**
```bash
docker build -t davidniyonkuru15/attendance-event:latest .
docker push davidniyonkuru15/attendance-event:latest
```

### 4. **Deploy** (After Build Passes)
```
Trigger: After successful build
Method: SSH to remote server
Notifications: Slack
Skip Condition: Missing DEPLOY_SSH_PRIVATE_KEY, DEPLOY_USER, or DEPLOY_HOST
```
- Pulls latest Docker image
- Stops old container
- Starts new container
- Zero-downtime deployment

**Manual Deploy (via SSH):**
```bash
ssh user@host
docker pull davidniyonkuru15/attendance-event:latest
docker stop attendance-app || true
docker rm attendance-app || true
docker run -d --name attendance-app -p 4000:4000 \
  --restart unless-stopped \
  davidniyonkuru15/attendance-event:latest
```

### 5. **K8s Deploy** (After Build, if on main)
```
Trigger: Push to main branch
Method: Helm rolling update
Strategy: RollingUpdate (maxSurge=1, maxUnavailable=1)
Notifications: Slack
Skip Condition: KUBE_CONFIG not configured
```
- Creates attendance namespace
- Creates database secrets
- Deploys via Helm with rolling updates
- Verifies deployment health

**Automatic Behavior:**
- Old pods gradually replaced
- New pods verified healthy
- Traffic gradually shifted
- Automatic rollback on failure

### 6. **Release** (On Tag Push)
```
Trigger: Push tag matching v*.*.* (e.g., v1.0.0)
Creates: GitHub release with release notes
Notifications: Slack
```

**Manual Release:**
```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions auto-creates release
```

---

## Workflow Diagram

```
PR or Push to main
        ↓
    ┌──────┐
    │ TEST │ ✅ Always runs
    └──────┘
        ↓ (if passed)
    ┌─────────┐
    │ QUALITY │ ✅ Code checks
    └─────────┘
        ↓ (if passed)
    ┌─────────┐
    │  BUILD  │ ✅ Docker image
    └─────────┘
        ↓ (if main branch)
    ┌──────────────┐
    │ K8S-DEPLOY   │ ✅ Helm rolling update
    ├──────────────┤
    │ DEPLOY       │ ⏭️  Optional SSH deploy
    └──────────────┘
        ↓
   Slack Notification
```

On Tag Push:
```
git tag v1.0.0
git push origin v1.0.0
        ↓
    ┌─────────┐
    │ RELEASE │ ✅ Create GitHub release
    └─────────┘
        ↓
   Slack Notification
```

---

## Configuration Secrets

Add these to GitHub repository Settings → Secrets and variables → Actions:

### Required Secrets:
```
DOCKER_USERNAME        # Docker Hub username
DOCKER_PASSWORD        # Docker Hub token/password
SLACK_WEBHOOK_URL      # Slack channel webhook URL
```

### Optional Secrets (for Deploy Job):
```
DEPLOY_SSH_PRIVATE_KEY # SSH private key
DEPLOY_USER            # SSH username
DEPLOY_HOST            # Server hostname/IP
```

### Optional Secrets (for Kubernetes):
```
KUBE_CONFIG            # Base64-encoded kubeconfig
K8S_CLUSTER_NAME       # Cluster name for notifications
DB_PASSWORD            # Database password
```

---

## Slack Notifications

Pipeline sends notifications for:

### Test Status
```
✅ 6/6 tests passed
❌ 2/6 tests failed (with details)
```

### Quality Status
```
✅ Code quality checks passed
❌ Security vulnerabilities found
```

### Build Status
```
✅ Image pushed to Docker Hub
❌ Build failed
Image: davidniyonkuru15/attendance-event:latest
```

### Deploy Status
```
✅ Deployed successfully
❌ Deployment failed
```

### Release Status
```
🚀 Release v1.0.0 created
```

---

## Common Workflows

### Deploy a Hotfix

1. Create branch: `git checkout -b hotfix/issue-123`
2. Make changes and test locally
3. Push to GitHub: `git push origin hotfix/issue-123`
4. Create PR
5. Wait for CI to pass
6. Merge to `main`
7. Pipeline auto-deploys ✅

### Rollback Deployment

If deployment fails:
1. Pipeline automatically rolls back
2. Previous version stays running
3. Check Slack for error details
4. Fix issue and re-push

### Create a Release

1. Merge to `main` branch
2. Create and push tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. Pipeline creates GitHub release ✅
4. Slack announces release 📢

### Manual Testing

Before pushing:
```bash
# Run tests
npm test

# Check code quality
npm run lint

# Build Docker locally
docker build -t test:latest .

# Run locally
docker-compose up --build
```

---

## Monitoring Pipeline

### View Workflow Runs
- GitHub: https://github.com/davidniyonkuru15/attendance-event/actions

### Check Recent Runs
```bash
# Using GitHub CLI
gh run list
gh run view <run-id> --log
```

### View Logs
1. Open GitHub Actions tab
2. Click on workflow run
3. Click on failing job
4. Expand job logs

---

## Troubleshooting

### Test Fails
```
❌ Tests not passing

Solution:
1. Check test output in GitHub Actions
2. Run locally: npm test
3. Fix failing tests
4. Push fix
```

### Build Fails
```
❌ Docker build error

Solution:
1. Check build logs in GitHub Actions
2. Build locally: docker build -t test:latest .
3. Fix Dockerfile
4. Push fix
```

### Deploy Fails
```
❌ Deployment error

Solution:
1. Check deploy logs in Slack or GitHub Actions
2. Verify DEPLOY_SSH_PRIVATE_KEY secret is configured
3. Check SSH connectivity to host
4. Check Docker Hub credentials
```

### K8s Deploy Fails
```
❌ Kubernetes deployment error

Solution:
1. Check KUBE_CONFIG secret
2. Verify kubeconfig is valid (base64 encoded)
3. Check cluster connectivity
4. Review pod logs: kubectl logs -f <pod> -n attendance
```

---

## Performance

| Job | Duration |
|-----|----------|
| Test | ~60 seconds |
| Quality | ~30 seconds |
| Build | ~2-3 minutes |
| Deploy (SSH) | ~30 seconds |
| K8s Deploy | ~3-5 minutes |
| **Total** | **~8-10 minutes** |

---

## Best Practices

✅ **Always run tests locally** before pushing
✅ **Use conventional commits**: `feat:`, `fix:`, `docs:`
✅ **Create PRs** for review before merging
✅ **Monitor Slack** for deployment status
✅ **Tag releases** using semantic versioning (v1.0.0)
✅ **Check pod health** after K8s deployment
✅ **Review logs** if pipeline fails

---

## Next Steps

1. **Configure Secrets**
   - Add Docker Hub credentials
   - Add Slack webhook URL

2. **Test Pipeline**
   - Push a change to main
   - Monitor GitHub Actions
   - Check Slack notifications

3. **Monitor Deployments**
   - Watch pod rollouts
   - Verify application health
   - Check load balancer access

4. **Create Release**
   - Tag version after testing
   - Pipeline creates release automatically

---

**For more details:** See `KUBERNETES.md` for deployment strategies and troubleshooting
