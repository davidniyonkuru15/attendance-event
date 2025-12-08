#!/bin/bash
set -e

echo "=== Initializing Git repository ==="

# Initialize if not already done
if [ ! -d .git ]; then
  git init
  echo "✓ Git repository initialized"
else
  echo "✓ Git repository already exists"
fi

# Configure Git (optional, per-repo)
git config --local user.name "Attendance Project" || true
git config --local core.ignorecase false || true

# Create branches if they don't exist
echo "=== Setting up branches ==="

if git rev-parse --verify main >/dev/null 2>&1; then
  echo "✓ main branch exists"
else
  git checkout -b main
  echo "✓ Created main branch"
fi

if git rev-parse --verify develop >/dev/null 2>&1; then
  echo "✓ develop branch exists"
else
  git checkout develop 2>/dev/null || git checkout -b develop
  echo "✓ Created develop branch"
fi

git checkout develop

echo ""
echo "=== Git setup complete ==="
echo "Next steps:"
echo "  1. git add -A"
echo "  2. git commit -m 'chore(init): initial project setup'"
echo "  3. git remote add origin <your-repo-url>"
echo "  4. git push -u origin develop"
echo "  5. git push -u origin main"
