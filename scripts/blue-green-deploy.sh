#!/bin/bash
# Blue-Green Deployment Script
# Implements zero-downtime deployments by switching traffic between two identical environments

set -e

NAMESPACE="${NAMESPACE:-attendance}"
APP_NAME="attendance-app"
IMAGE="${IMAGE:-davidniyonkuru15/attendance-event:latest}"
KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if deployment exists
deployment_exists() {
    kubectl get deployment $1 -n $NAMESPACE &>/dev/null
}

# Get current active environment (blue or green)
get_active_env() {
    kubectl get service $APP_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local deployment=$1
    local timeout=300
    local elapsed=0
    
    log_info "Waiting for deployment $deployment to be ready..."
    
    while [ $elapsed -lt $timeout ]; do
        local ready=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null || echo "False")
        
        if [ "$ready" == "True" ]; then
            log_success "Deployment $deployment is ready!"
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        echo "Waiting... ($elapsed/$timeout seconds)"
    done
    
    log_error "Deployment $deployment did not become ready within $timeout seconds"
    return 1
}

# Deploy to inactive environment
deploy_to_inactive() {
    local active_env=$(get_active_env)
    local inactive_env
    
    if [ "$active_env" == "blue" ]; then
        inactive_env="green"
    else
        inactive_env="blue"
    fi
    
    log_info "Active environment: $active_env"
    log_info "Deploying to: $inactive_env"
    
    # Create or update deployment for inactive environment
    kubectl set image deployment/${APP_NAME}-${inactive_env} \
        ${APP_NAME}=${IMAGE} \
        -n $NAMESPACE \
        --record \
        2>/dev/null || {
        log_info "Creating new deployment for $inactive_env..."
        kubectl create deployment ${APP_NAME}-${inactive_env} \
            --image=${IMAGE} \
            -n $NAMESPACE \
            -o yaml | \
        kubectl set selector -f - \
            color=${inactive_env} \
            --overwrite \
            -o yaml | \
        kubectl apply -f -
    }
    
    # Wait for new deployment to be ready
    if ! wait_for_deployment ${APP_NAME}-${inactive_env}; then
        log_error "Deployment failed. Rolling back..."
        return 1
    fi
    
    log_success "Deployed to $inactive_env environment"
    return 0
}

# Switch traffic to new environment
switch_traffic() {
    local active_env=$(get_active_env)
    local new_env
    
    if [ "$active_env" == "blue" ]; then
        new_env="green"
    else
        new_env="blue"
    fi
    
    log_info "Switching traffic from $active_env to $new_env..."
    
    kubectl patch service $APP_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"color\":\"$new_env\"}}}"
    
    log_success "Traffic switched to $new_env environment"
    
    # Give time for connections to drain
    sleep 10
}

# Health check for new environment
health_check() {
    local env=$1
    local endpoint="http://$(kubectl get service $APP_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
    
    log_info "Running health check on $endpoint..."
    
    local max_retries=10
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        if curl -s -f "$endpoint" &>/dev/null; then
            log_success "Health check passed"
            return 0
        fi
        retry=$((retry + 1))
        sleep 3
    done
    
    log_error "Health check failed after $max_retries attempts"
    return 1
}

# Rollback to previous environment
rollback() {
    local active_env=$(get_active_env)
    local previous_env
    
    if [ "$active_env" == "blue" ]; then
        previous_env="green"
    else
        previous_env="blue"
    fi
    
    log_info "Rolling back to $previous_env..."
    kubectl patch service $APP_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"color\":\"$previous_env\"}}}"
    log_success "Rolled back to $previous_env"
}

# Main deployment flow
main() {
    log_info "Starting Blue-Green Deployment"
    log_info "Image: $IMAGE"
    log_info "Namespace: $NAMESPACE"
    
    # Deploy to inactive environment
    if ! deploy_to_inactive; then
        log_error "Deployment to inactive environment failed"
        exit 1
    fi
    
    # Run health checks
    if ! health_check; then
        log_error "Health check failed, rolling back..."
        rollback
        exit 1
    fi
    
    # Switch traffic
    switch_traffic
    
    log_success "Blue-Green deployment completed successfully!"
}

# Parse arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    *)
        echo "Usage: $0 {deploy|rollback}"
        exit 1
        ;;
esac
