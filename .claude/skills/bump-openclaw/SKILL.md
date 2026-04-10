---
name: bump-openclaw
description: Bump the OpenClaw version used by LifeOS pods. Use when the user says "bump openclaw", "update openclaw", "upgrade openclaw", "new openclaw version", or wants to update the OpenClaw Docker image used by LifeOS deployments.
---

# Bump OpenClaw

Update the OpenClaw Docker image used by LifeOS pods.

## Paths

| Item | Path |
|------|------|
| OpenClaw repo | `/Users/michi/L-Documents/the_application_layer/Business/rule1/openclaw` |
| LifeOS repo | `/Users/michi/L-Documents/the_application_layer/Business/LifeOS` |
| Dev registry | `europe-west3-docker.pkg.dev/acquired-racer-491202-b4/lifeos-openclaw/openclaw` |
| Prod registry | `europe-west3-docker.pkg.dev/lifeos-prod-491301/lifeos-prod/openclaw` |
| Dev cluster | `lifeos-cluster-3566bb7` (region: `europe-west3`, project: `acquired-racer-491202-b4`) |
| Prod cluster | `lifeos-cluster-v2-66d9b28` (region: `europe-west3`, project: `lifeos-prod-491301`) |

## How it works

- Pods are StatefulSets created by Convex via `web/convex/k8s.ts`
- Image tag comes from `OPENCLAW_IMAGE_TAG` env var in Convex (default: `latest`)
- `patchStatefulSet()` in k8s.ts patches the StatefulSet spec with the image tag
- The `restart` action in `deploymentActions.ts` calls `patchStatefulSet` + `deletePod`
- Pods use `imagePullPolicy: Always` so re-pulling `latest` gets the new image

## Steps

### 1. Check available versions

```bash
cd /Users/michi/L-Documents/the_application_layer/Business/rule1/openclaw
git fetch origin --tags
git tag --sort=-creatordate | head -10
```

Show current version: `git describe --tags --always`

### 2. Update Dockerfile.openclaw

Edit `Dockerfile.openclaw` in the LifeOS repo and update the `OPENCLAW_VERSION` ARG:

```
ARG OPENCLAW_VERSION=<tag>
```

Commit and push.

### 3. Build Docker image

Build from the **LifeOS repo** using `Dockerfile.openclaw` (NOT the upstream OpenClaw Dockerfile).
This custom Dockerfile layers LifeOS-specific files on top of OpenClaw:
- `file-server.mjs` (terminal/file API sidecar)
- LifeOS CLI
- LifeOS skills (`packages/cli/skills/`)
- Homebrew, GitHub CLI, node-pty, etc.

```bash
cd /Users/michi/L-Documents/the_application_layer/Business/LifeOS
docker build --platform linux/amd64 -f Dockerfile.openclaw \
  -t europe-west3-docker.pkg.dev/acquired-racer-491202-b4/lifeos-openclaw/openclaw:latest .
```

Use `--timeout 600000` (build takes 5-10 min). Ensure Docker is running first.
Ensure Docker auth: `gcloud auth configure-docker europe-west3-docker.pkg.dev --quiet`

### 4. Push to both registries

```bash
docker push europe-west3-docker.pkg.dev/acquired-racer-491202-b4/lifeos-openclaw/openclaw:latest

docker tag europe-west3-docker.pkg.dev/acquired-racer-491202-b4/lifeos-openclaw/openclaw:latest \
  europe-west3-docker.pkg.dev/lifeos-prod-491301/lifeos-prod/openclaw:latest
docker push europe-west3-docker.pkg.dev/lifeos-prod-491301/lifeos-prod/openclaw:latest
```

### 5. Roll out to all pods via Convex

Use the `rolloutPatch` internal action. It iterates all running deployments,
calls `patchStatefulSet` (updates StatefulSet with latest image + config),
`deletePod` (triggers re-creation), and schedules health checks.

```bash
# Dev
cd /Users/michi/L-Documents/the_application_layer/Business/LifeOS/web
npx convex run --no-push 'deploymentActions:rolloutPatch' '{}'

# Prod
npx convex run --prod --no-push 'deploymentActions:rolloutPatch' '{}'
```

To roll out a single user: `'{"subdomain":"c-fd9f7258"}'`

Users see ~1 min interruption during pod recreation.

### 6. Verify

```bash
kubectl get pods -n lifeos-users
```

Wait for pods to reach `Running` state.

### 7. Report

Tell user: bumped from `<old>` to `<new>`, pushed to dev + prod, pods restarting.
