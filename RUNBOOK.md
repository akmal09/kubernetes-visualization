# Runbook: Deploy a Service on Native k3s (Windows + WSL2)

This runbook implements the architecture in [local-k3s-deployment.puml](local-k3s-deployment.puml):
a single-node k3s cluster running natively (via WSL2), with a custom Node.js service exposed
through the built-in Traefik Ingress controller.

---

## Prerequisites check

Run in **PowerShell**:

```powershell
wsl --version          # WSL2 should be installed
docker --version       # Docker Desktop (for image building)
```

If WSL is missing: open PowerShell as Admin, run `wsl --install`, then restart Windows.

---

## Phase 1 — Install Ubuntu + native k3s

### 1.1 Install Ubuntu in WSL2

In **PowerShell**:

```powershell
wsl --install -d Ubuntu
```

Set a username and password when prompted. Then enter the Ubuntu shell:

```powershell
wsl -d Ubuntu
```

### 1.2 Install k3s

Inside **Ubuntu (WSL)**:

```bash
curl -sfL https://get.k3s.io | sh -
```

This installs k3s as a service. Takes ~30 seconds.

### 1.3 Verify the cluster

```bash
sudo k3s kubectl get nodes
```

Expected output:

```
NAME       STATUS   ROLES                  AGE   VERSION
my-host    Ready    control-plane,master   1m    v1.30.x+k3s1
```

### 1.4 Make `kubectl` work without sudo

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
source ~/.bashrc

kubectl get nodes      # should now work without sudo
```

---

## Phase 2 — Build a sample service

### 2.1 Create the app folder

```bash
mkdir ~/my-service && cd ~/my-service
```

### 2.2 Create `app.js`

```javascript
const http = require('http');
const os = require('os');
http.createServer((req, res) => {
  res.end(`Hello from ${os.hostname()}\n`);
}).listen(3000);
```

### 2.3 Create `Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY app.js .
EXPOSE 3000
CMD ["node", "app.js"]
```

### 2.4 Build the image

```bash
docker build -t my-service:v1 .
```

### 2.5 Import the image into k3s

k3s uses its own containerd, separate from Docker's image cache:

```bash
docker save my-service:v1 -o my-service.tar
sudo k3s ctr images import my-service.tar
```

Verify:

```bash
sudo k3s ctr images list | grep my-service
```

---

## Phase 3 — Write the Kubernetes manifests

Create a `manifests/` folder and the following files inside.

### 3.1 `manifests/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: my-app
spec:
  replicas: 2
  selector:
    matchLabels: { app: my-service }
  template:
    metadata:
      labels: { app: my-service }
    spec:
      containers:
        - name: my-service
          image: my-service:v1
          imagePullPolicy: Never        # use locally imported image
          ports:
            - containerPort: 3000
```

### 3.2 `manifests/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: my-app
spec:
  selector: { app: my-service }
  ports:
    - port: 80
      targetPort: 3000
```

### 3.3 `manifests/ingress.yaml`

Uses the built-in Traefik Ingress controller that ships with k3s:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service
  namespace: my-app
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
```

---

## Phase 4 — Deploy

```bash
kubectl create namespace my-app
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml
```

Watch the workload come up:

```bash
kubectl -n my-app get pods,svc,ingress
```

Expected:

```
NAME                              READY   STATUS    RESTARTS   AGE
pod/my-service-xxxx-yyyy          1/1     Running   0          15s
pod/my-service-xxxx-zzzz          1/1     Running   0          15s
...
```

---

## Phase 5 — Access your service

From inside **WSL**:

```bash
curl http://localhost/
# Hello from my-service-xxxx-yyyy
curl http://localhost/
# Hello from my-service-xxxx-zzzz   <- load-balanced across pods
```

From **Windows** (PowerShell or browser):

```powershell
curl http://localhost/
```

If `localhost` does not work from Windows, get the WSL IP first:

```bash
hostname -I        # run inside WSL
```

Then visit `http://<wsl-ip>/` from Windows.

---

## Phase 6 — Try scaling and self-healing

### 6.1 Horizontal scaling

```bash
kubectl -n my-app scale deployment my-service --replicas=5
kubectl -n my-app get pods -o wide
```

All 5 pods will be on the same node (you only have one node here).

### 6.2 Self-healing

Delete a pod and watch Kubernetes recreate it:

```bash
kubectl -n my-app delete pod <one-pod-name>
kubectl -n my-app get pods
```

### 6.3 Rolling update

Build a `v2` of your image, import it, then:

```bash
kubectl -n my-app set image deployment/my-service my-service=my-service:v2
kubectl -n my-app rollout status deployment/my-service
```

---

## Phase 7 — Cleanup (when finished)

Remove just the app:

```bash
kubectl delete namespace my-app
```

Remove k3s entirely:

```bash
sudo /usr/local/bin/k3s-uninstall.sh
```

---

## Important caveats for this WSL2 + native-k3s setup

- **WSL2 IP changes on every reboot.** Use `localhost` from Windows when possible.
- **Image rebuild loop is manual.** Every code change requires
  `docker build` -> `docker save` -> `k3s ctr images import`. For frequent changes,
  consider running a local registry inside the cluster.
- **Single-node only.** You cannot test true HA or failover here. For that, use
  **k3d** (see [k3d-3node-setup.puml](k3d-3node-setup.puml)).
- **Not a 24/7 server.** WSL2 stops when you shut down Windows. For a permanent
  server, install real Linux on the machine and run native k3s there.
- **One cluster per OS install.** To run multiple independent clusters on the same
  PC, use **k3d** (`k3d cluster create dev`, `k3d cluster create staging`, etc.).

---

## Quick reference — common commands

| Task | Command |
|---|---|
| List nodes | `kubectl get nodes` |
| List pods (all namespaces) | `kubectl get pods -A` |
| Watch pods in real time | `kubectl -n my-app get pods -w` |
| Pod logs | `kubectl -n my-app logs <pod>` |
| Shell into a pod | `kubectl -n my-app exec -it <pod> -- sh` |
| Describe a pod | `kubectl -n my-app describe pod <pod>` |
| Scale a deployment | `kubectl -n my-app scale deploy my-service --replicas=N` |
| Rolling update image | `kubectl -n my-app set image deploy/my-service my-service=<new-image>` |
| Rollout history | `kubectl -n my-app rollout history deploy/my-service` |
| Rollback | `kubectl -n my-app rollout undo deploy/my-service` |
| Re-import a new image | `docker save ... && sudo k3s ctr images import ...` |
