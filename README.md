# Kubernetes Visualization

Kumpulan diagram PlantUML + runbook praktik untuk **memahami Kubernetes lewat gambar**, bukan lewat hafalan.
Semua diagram di sini dibuat berpasangan dengan praktik nyata: kamu bisa melihat gambarnya, lalu benar-benar
menjalankannya di laptop sendiri memakai **k3s** (Kubernetes ringan) di dalam WSL2, atau **k3d** (k3s di dalam Docker).

Repo ini cocok kalau kamu:

- sudah pernah dengar istilah Pod, Service, Ingress, tapi belum punya gambaran utuh siapa bicara ke siapa;
- ingin tahu bedanya *cluster* vs *node* vs *pod* secara visual;
- ingin mencoba Kubernetes tanpa cloud berbayar;
- bingung soal PV, PVC, dan StorageClass;
- ingin service lokal kamu bisa diakses orang lain dari internet.

---

## Daftar isi

1. [Cara membuka diagram](#1-cara-membuka-diagram)
2. [Urutan belajar yang disarankan](#2-urutan-belajar-yang-disarankan)
3. [Isi folder](#3-isi-folder)
4. [Penjelasan tiap diagram](#4-penjelasan-tiap-diagram)
   - [4.1 Arsitektur Kubernetes secara umum](#41-kubernetes-architecturepuml--arsitektur-umum)
   - [4.2 Deploy ke k3s satu node](#42-local-k3s-deploymentpuml--deploy-service-ke-k3s-1-node)
   - [4.3 Cluster 3 node dengan k3d](#43-k3d-3node-setuppuml--cluster-3-node-di-satu-laptop)
   - [4.4 Storage: PV, PVC, StorageClass, NFS](#44-k8s-storage-pv-pvc-nfspuml--penyimpanan-data)
   - [4.5–4.7 Tiga cara membuka akses publik](#45-47-tiga-cara-membuka-akses-publik)
5. [Kamus istilah singkat](#5-kamus-istilah-singkat)
6. [Konsep penting yang sering bikin bingung](#6-konsep-penting-yang-sering-bikin-bingung)
7. [Praktik: dari nol sampai service jalan](#7-praktik-dari-nol-sampai-service-jalan)
8. [Perintah kubectl yang paling sering dipakai](#8-perintah-kubectl-yang-paling-sering-dipakai)

---

## 1. Cara membuka diagram

Semua file `.puml` adalah teks biasa berformat [PlantUML](https://plantuml.com/). Pilih salah satu cara:

| Cara | Langkah |
|---|---|
| **VS Code** (paling nyaman) | Install ekstensi *PlantUML* (jebbs). Buka file `.puml`, tekan `Alt+D` untuk preview. Butuh Java + Graphviz terpasang. |
| **Browser, tanpa install** | Buka <https://www.plantuml.com/plantuml/uml/>, copy-paste isi file `.puml` ke sana. |
| **IntelliJ / JetBrains** | Install plugin *PlantUML Integration*, preview otomatis muncul. |
| **CLI** | `java -jar plantuml.jar kubernetes-architecture.puml` → menghasilkan file `.png`. |

> Kalau diagram gagal render di VS Code, biasanya penyebabnya Graphviz belum terpasang.
> Alternatif tercepat: pakai cara browser di atas.

---

## 2. Urutan belajar yang disarankan

Jangan buka semua diagram sekaligus. Ikuti urutan ini — tiap langkah menumpuk di atas langkah sebelumnya:

```
Langkah 1  kubernetes-architecture.puml       "Kubernetes itu apa dan isinya apa saja?"
              |
Langkah 2  local-k3s-deployment.puml          "Bagaimana kode saya jadi Pod yang jalan?"
              |  (praktikkan dengan RUNBOOK.md)
              |
Langkah 3  k3d-3node-setup.puml               "Bagaimana kalau node-nya lebih dari satu?"
              |
Langkah 4  k8s-storage-pv-pvc-nfs.puml        "Data saya disimpan di mana? Kenapa hilang?"
              |
Langkah 5  public-access-*.puml               "Bagaimana orang lain bisa mengaksesnya?"
```

Perkiraan waktu: langkah 1–2 satu sesi (~2 jam termasuk praktik), langkah 3–5 masing-masing ~1 jam.

---

## 3. Isi folder

| File | Isi |
|---|---|
| `kubernetes-architecture.puml` | Arsitektur Kubernetes standar: control plane + worker node. **Mulai dari sini.** |
| `local-k3s-deployment.puml` | Cluster k3s 1 node di laptop sendiri, lengkap dengan alur deploy dari kode sampai diakses user. |
| `k3d-3node-setup.puml` | Cluster 3 node (1 server + 2 agent) memakai k3d, untuk latihan scaling dan failover. |
| `k8s-storage-pv-pvc-nfs.puml` | Alur penyimpanan: PersistentVolume, PersistentVolumeClaim, StorageClass, dan NFS. |
| `public-access-port-forward.puml` | Membuka akses publik lewat port forwarding di router. |
| `public-access-cloudflare-tunnel.puml` | Membuka akses publik lewat Cloudflare Tunnel (paling mudah). |
| `public-access-self-hosted-tunnel.puml` | Membuka akses publik lewat reverse tunnel ke VPS sendiri (frp / SSH). |
| `RUNBOOK.md` | Panduan langkah demi langkah untuk benar-benar menjalankan semuanya di Windows + WSL2. |
| `my-service/` | Contoh aplikasi Node.js kecil + Dockerfile + manifest YAML siap pakai. |

Isi `my-service/`:

```
my-service/
├── app.js                          # HTTP server Node.js, balas "Hello from <hostname>"
├── Dockerfile                      # image berbasis node:20-alpine
├── my-service.tar                  # hasil `docker save`, siap di-import ke k3s
└── manifests/
    ├── deployment.yaml             # 2 replica Pod
    ├── service.yaml                # Service ClusterIP, port 80 -> 3000
    ├── ingress.yaml                # aturan Ingress path "/" -> Service
    └── storage-nfs.yaml            # contoh PV statis, PVC statis, PVC dinamis, Pod
```

> Kenapa `app.js` mengembalikan `os.hostname()`? Karena di dalam Pod, hostname = nama Pod.
> Jadi kalau kamu `curl` berkali-kali dan nama yang muncul berganti-ganti, itu **bukti nyata**
> bahwa Service sedang melakukan load balancing ke beberapa Pod. Ini trik belajar yang sederhana tapi efektif.

---

## 4. Penjelasan tiap diagram

### 4.1 `kubernetes-architecture.puml` — arsitektur umum

Diagram ini menjawab: *"Apa saja yang ada di dalam sebuah cluster Kubernetes?"*

Sebuah **cluster** terdiri dari dua bagian besar:

**A. Control Plane (otak cluster)**

| Komponen | Tugasnya |
|---|---|
| `kube-apiserver` | **Satu-satunya pintu masuk.** Semua perintah (`kubectl`, komponen internal) masuk lewat sini. |
| `etcd` | Database key-value. Menyimpan *seluruh* state cluster. Satu-satunya sumber kebenaran. |
| `kube-scheduler` | Menentukan Pod baru harus ditaruh di node yang mana. |
| `kube-controller-manager` | Menjalankan *reconcile loop*: membandingkan kondisi yang diinginkan vs kondisi nyata, lalu memperbaiki selisihnya. |
| `cloud-controller-manager` | Berbicara ke API cloud provider (buat Load Balancer, volume, dsb). Tidak dipakai di cluster lokal. |

**B. Worker Node (tempat aplikasi benar-benar jalan)**

| Komponen | Tugasnya |
|---|---|
| `kubelet` | Agen di tiap node. Menerima spesifikasi Pod dari API server, lalu memastikan container-nya hidup. |
| `kube-proxy` | Mengatur aturan jaringan (iptables/IPVS) supaya Service bisa menjangkau Pod. |
| Container Runtime | `containerd` atau CRI-O. Yang benar-benar menjalankan container. |
| Pod | Unit terkecil yang bisa di-deploy: satu atau beberapa container yang berbagi network + storage. |

**Intuisi yang harus dibawa pulang dari diagram ini:**

1. **Semua lewat API server.** Scheduler tidak bicara langsung ke kubelet. Scheduler menulis keputusan ke
   API server, lalu kubelet membaca dari API server. Pola ini disebut *hub and spoke*.
2. **Kubernetes bekerja secara deklaratif.** Kamu tidak memerintah "jalankan container". Kamu menyatakan
   "saya mau 5 replica", lalu controller terus-menerus bekerja sampai kenyataan cocok dengan pernyataanmu.
   Inilah alasan Pod yang kamu hapus akan muncul kembali secara otomatis.
3. **etcd adalah jantungnya.** Kalau etcd hilang, cluster kehilangan ingatannya.

---

### 4.2 `local-k3s-deployment.puml` — deploy service ke k3s 1 node

Diagram ini menjawab: *"Bagaimana kode di laptop saya berubah menjadi Pod yang bisa diakses?"*

**k3s** adalah distribusi Kubernetes ringan dari Rancher/SUSE. Perbedaannya dengan Kubernetes penuh:

| Kubernetes standar | k3s |
|---|---|
| etcd | **SQLite** (default, single-node) |
| Banyak proses terpisah | **Satu binary** berisi semuanya |
| Ingress controller install sendiri | **Traefik** sudah bawaan |
| LoadBalancer perlu cloud | **Klipper / ServiceLB** bawaan |
| StorageClass install sendiri | **local-path-provisioner** bawaan |
| CNI pilih sendiri | **Flannel** bawaan |

Di diagram, satu node bertugas sebagai control-plane **sekaligus** worker. Ini normal untuk cluster lokal.

**Alur yang digambarkan (ikuti nomor pada panah biru):**

```
1. tulis kode (app.js)
2. docker build -t my-service:v1
3. import image ke containerd milik k3s
4. kubectl apply -f manifests/
       |
       v
   kube-apiserver  --> simpan ke SQLite
       |
       +--> scheduler   : "Pod ini taruh di node mana?"
       +--> controller  : "replicas: 2, sekarang baru 0, buat 2"
       |
       v
   kubelet --> containerd --> Pod jalan
```

Lalu jalur trafik masuk (panah merah/oranye/hijau):

```
User  -->  Klipper (:80 di host)  -->  Traefik  -->  Ingress  -->  Service  -->  Pod
```

**Poin penting dari diagram ini:**

- **Image harus di-import manual.** k3s memakai containerd sendiri, terpisah dari cache image Docker.
  Karena itu perlu `docker save` lalu `k3s ctr images import`. Ini jebakan nomor satu bagi pemula —
  Pod stuck di `ImagePullBackOff` padahal image "sudah ada di Docker".
- **Docker hanya dibutuhkan untuk membangun image**, tidak untuk menjalankan container.
- **Satu instalasi k3s = satu cluster = satu node.** Kalau butuh beberapa cluster sekaligus di satu
  komputer, pakai k3d (lihat diagram berikutnya).

---

### 4.3 `k3d-3node-setup.puml` — cluster 3 node di satu laptop

Diagram ini menjawab: *"Bagaimana rasanya punya cluster multi-node, dan apa yang terjadi saat satu node mati?"*

**k3d** menjalankan tiap "node" k3s sebagai **container Docker**. Jadi dengan satu perintah:

```bash
k3d cluster create mycluster --servers 1 --agents 2
```

kamu mendapat 3 container yang berperilaku seperti 3 mesin berbeda:

| Container | Peran |
|---|---|
| `k3d-mycluster-server-0` | control-plane + master (berisi apiserver, SQLite, scheduler, controller-manager) |
| `k3d-mycluster-agent-0` | worker |
| `k3d-mycluster-agent-1` | worker |
| `k3d-mycluster-serverlb` | container NGINX yang meneruskan port host (80, 443, 6443) ke dalam cluster |

`serverlb` inilah alasan `http://localhost/` di laptopmu bisa sampai ke Traefik di dalam cluster.

**Dua eksperimen yang bisa langsung dicoba** (tercantum sebagai catatan di diagram):

```bash
# Uji HA / self-healing: matikan satu node
k3d node stop k3d-mycluster-agent-0
kubectl get pods -o wide        # Pod yang tadinya di agent-0 dijadwalkan ulang ke node lain

# Uji scaling
kubectl scale deploy my-service --replicas=20
kubectl get pods -o wide        # 20 Pod tersebar di 3 node
```

**Jujur soal keterbatasannya:** semua "node" ini berbagi CPU, RAM, disk, dan jaringan fisik yang sama.
Bagus untuk memahami *mekanika* Kubernetes, **tidak valid** untuk mengukur performa atau menyimpulkan
kapasitas produksi.

Untuk latihan control plane HA (tahan 1 server mati), ganti menjadi `--servers 3`.

---

### 4.4 `k8s-storage-pv-pvc-nfs.puml` — penyimpanan data

Diagram ini menjawab: *"Kenapa data saya hilang saat Pod restart, dan bagaimana cara menyimpannya permanen?"*

Kuncinya tiga objek. Analogi yang paling mudah dicerna:

| Objek | Analogi | Siapa yang membuat | Scope |
|---|---|---|---|
| **PV** (PersistentVolume) | Kamar kos yang tersedia | Admin (statis) atau otomatis (dinamis) | **Cluster** (tanpa namespace) |
| **PVC** (PersistentVolumeClaim) | Formulir "saya mau sewa kamar 5Gi" | User / developer | **Namespace** |
| **StorageClass** | Agen properti yang membangunkan kamar saat diminta | Admin, sekali saja | Cluster |

Pod **tidak pernah** menyebut NFS, disk, atau server penyimpanan secara langsung. Pod hanya menyebut nama PVC.
Inilah inti abstraksinya: aplikasi tidak perlu tahu data fisiknya di mana.

**Dua cara penyediaan storage — keduanya ada di diagram:**

**a. Static provisioning** (panah biru)

```
Admin buat PV  -->  User buat PVC  -->  K8s mengikat (bind) 1:1  -->  Pod pakai PVC
```
Dipakai kalau share NFS sudah ada lebih dulu dan berisi data yang memang mau dipakai Pod.

**b. Dynamic provisioning** (panah oranye)

```
User buat PVC (sebut StorageClass)
    --> StorageClass memicu provisioner
    --> provisioner bikin subfolder di NFS + bikin objek PV otomatis
    --> PVC ter-bind otomatis
```
Dipakai kalau Pod hanya butuh ruang penyimpanan sendiri, tanpa data awal.

**Kenapa NFS sering dipakai untuk belajar:** NFS mendukung **RWX (ReadWriteMany)** — banyak Pod bisa
menulis ke folder yang sama secara bersamaan. Storage berbasis blok (AWS EBS, `local-path` bawaan k3s)
hanya mendukung **RWO (ReadWriteOnce)** — satu Pod saja pada satu waktu. Ini penjelasan kenapa
Deployment dengan 3 replica gagal naik saat memakai PVC RWO.

Di k3s, StorageClass default adalah `local-path` (menulis ke disk lokal node). Untuk NFS, pasang provisioner:

```bash
helm install nfs-provisioner nfs-subdir-external-provisioner \
  --set nfs.server=192.168.1.50 \
  --set nfs.path=/srv/nfs/k8s
```

Contoh YAML lengkapnya ada di [my-service/manifests/storage-nfs.yaml](my-service/manifests/storage-nfs.yaml) —
berisi PV statis, PVC statis, PVC dinamis, dan Pod yang memakainya, semuanya dengan komentar.

**Siklus hidup lengkapnya:**

```
1. User menulis YAML PVC
2. K8s mengikat PVC -> PV (statis atau dinamis)
3. Pod menyebut PVC lewat volumes[]
4. kubelet di node me-mount storage fisik (NFS)
5. Container melihatnya sebagai folder biasa, misalnya /data
6. Aplikasi baca/tulis file seperti biasa -- datanya mendarat di server NFS
```

---

### 4.5–4.7 Tiga cara membuka akses publik

Tiga diagram ini menjawab pertanyaan yang sama dengan tiga solusi berbeda:
*"Service saya jalan di localhost. Bagaimana supaya orang lain bisa mengaksesnya?"*

Bagian dalam cluster identik di ketiganya:

```
Klipper (:80)  -->  Traefik  -->  Ingress  -->  Service  -->  Pod
```

Yang berbeda hanyalah **bagaimana trafik dari internet bisa sampai ke `localhost:80`**.

#### Perbandingan cepat

| | Port Forwarding | Cloudflare Tunnel | Self-Hosted Tunnel |
|---|---|---|---|
| Perlu atur router | **Ya** | Tidak | Tidak |
| Perlu atur firewall | **Ya** | Tidak | Tidak |
| Perlu port terbuka masuk | **Ya** | Tidak | Tidak |
| Bermasalah dengan IP WSL2 yang berubah | **Ya** | Tidak | Tidak |
| HTTPS otomatis | Tidak (atur sendiri) | **Ya, gratis** | Tergantung (frp bisa) |
| Butuh akun/layanan pihak ketiga | Tidak | Ya (Cloudflare) | Tidak |
| Butuh biaya | Tidak | Tidak (tier gratis) | Ya (sewa VPS) |
| Bisa di balik NAT / kos-kosan / kantor | Tidak | **Ya** | **Ya** |
| Cocok untuk | Jaringan rumah yang kamu kuasai | **Pilihan pertama untuk belajar** | Kalau tidak mau bergantung pihak ketiga |

#### `public-access-port-forward.puml`

Jalur: `User -> Internet -> Router (NAT) -> Windows Firewall -> netsh portproxy -> WSL2 -> k3s`

Ada dua "jembatan" yang harus dibuat manual:

1. **Port forwarding di router** — teruskan port 80 publik ke IP LAN mesin Windows-mu.
2. **`netsh portproxy` di Windows** — jembatan dari Windows ke WSL2, karena WSL2 punya IP sendiri.

```powershell
# jalankan sebagai Administrator
$wslIp = wsl hostname -I
netsh interface portproxy add v4tov4 `
  listenport=80 listenaddress=0.0.0.0 `
  connectport=80 connectaddress=$wslIp
```

**Masalah utamanya:** IP WSL2 berubah setiap kali Windows restart, jadi perintah di atas harus diulang terus.
Ditambah IP publik dari ISP juga bisa berganti (butuh DDNS). Banyak ISP rumahan di Indonesia juga memakai
CGNAT, sehingga port forwarding tidak akan berfungsi sama sekali. Karena itu cara ini paling merepotkan.

#### `public-access-cloudflare-tunnel.puml` — paling direkomendasikan

Jalur: `User -> Cloudflare DNS -> Cloudflare Proxy -> Tunnel -> cloudflared di WSL2 -> localhost:80 -> k3s`

Kuncinya: **`cloudflared` yang membuka koneksi keluar** ke Cloudflare, bukan sebaliknya.
Tidak ada port masuk yang perlu dibuka, jadi NAT dan firewall tidak jadi masalah.

Paling cepat dicoba, tanpa domain sama sekali:

```bash
cloudflared tunnel --url http://localhost:80
```

Perintah itu langsung memberi URL `*.trycloudflare.com` yang bisa dibuka siapa pun. Untuk domain sendiri:

```bash
cloudflared tunnel login
cloudflared tunnel create my-tunnel
cloudflared tunnel route dns my-tunnel your-domain.com
cloudflared tunnel run my-tunnel
```

Bonus: TLS/HTTPS gratis dan otomatis, plus perlindungan DDoS.

#### `public-access-self-hosted-tunnel.puml`

Jalur: `User -> VPS (IP publik) -> frps/sshd -> tunnel -> frpc/ssh di WSL2 -> localhost:80 -> k3s`

Konsepnya sama dengan Cloudflare Tunnel (koneksi dibuka dari dalam, keluar), bedanya "edge"-nya adalah
**VPS milikmu sendiri**. Cocok kalau kamu tidak mau trafik lewat pihak ketiga.

Dua opsi implementasi:

| | SSH reverse tunnel | frp |
|---|---|---|
| Instalasi tambahan | Tidak ada | frps di VPS + frpc di laptop |
| Kestabilan | Sedang | Tinggi |
| Auto-reconnect | Manual | Bawaan |
| Banyak port sekaligus | Bisa, agak repot | Mudah |
| Dukungan HTTPS | Atur sendiri | Bawaan |

Versi paling sederhana, tanpa install apa pun:

```bash
ssh -R 80:localhost:80 user@1.2.3.4
```

---

## 5. Kamus istilah singkat

| Istilah | Arti dalam satu kalimat |
|---|---|
| **Cluster** | Satu control plane beserta seluruh node yang dikelolanya. |
| **Node** | Satu mesin (fisik, VM, atau container k3d) anggota cluster. |
| **Pod** | Unit terkecil yang bisa di-deploy; 1+ container yang berbagi network dan storage. |
| **Deployment** | Objek yang menjaga jumlah Pod tetap sesuai `replicas`, dan mengurus rolling update. |
| **ReplicaSet** | Dibuat otomatis oleh Deployment; dialah yang benar-benar menjaga jumlah Pod. |
| **Service** | Alamat tetap + load balancer internal menuju sekumpulan Pod yang cocok dengan selector-nya. |
| **ClusterIP** | Tipe Service default; hanya bisa diakses dari dalam cluster. |
| **Ingress** | Aturan routing HTTP (host/path) menuju Service. Hanya aturan, bukan pelaksana. |
| **Ingress Controller** | Program yang benar-benar menjalankan aturan Ingress (di k3s: Traefik). |
| **Namespace** | Sekat logis untuk mengelompokkan objek. PVC punya namespace, PV tidak. |
| **kubelet** | Agen di setiap node yang memastikan container berjalan sesuai spesifikasi. |
| **kube-proxy** | Pengatur aturan jaringan agar Service bisa menjangkau Pod. |
| **containerd** | Container runtime; yang benar-benar menjalankan container. |
| **CNI** | Plugin jaringan antar-Pod (di k3s: Flannel). |
| **PV / PVC** | Penyimpanan yang tersedia / permintaan atas penyimpanan itu. |
| **StorageClass** | Cetakan untuk membuat PV secara otomatis saat ada PVC masuk. |
| **RWO / RWX** | ReadWriteOnce (satu Pod) / ReadWriteMany (banyak Pod bersamaan). |
| **Reconcile loop** | Perbandingan terus-menerus antara kondisi diinginkan vs kondisi nyata, lalu diperbaiki. |
| **k3s** | Distribusi Kubernetes ringan, satu binary, cocok untuk laptop dan edge. |
| **k3d** | Alat untuk menjalankan k3s di dalam container Docker; bisa banyak node dan banyak cluster. |

---

## 6. Konsep penting yang sering bikin bingung

**Cluster vs Node vs Pod**
Cluster adalah keseluruhan sistem. Node adalah satu mesin di dalamnya. Pod adalah aplikasimu yang jalan
di atas node. Di [local-k3s-deployment.puml](local-k3s-deployment.puml): 1 cluster, 1 node, beberapa Pod.
Di [k3d-3node-setup.puml](k3d-3node-setup.puml): 1 cluster, 3 node, 5 Pod.

**Service vs Ingress**
Service bekerja di layer 4 (TCP) dan hanya dikenal di dalam cluster. Ingress bekerja di layer 7 (HTTP)
dan mengatur trafik dari luar berdasarkan host/path. Ingress **butuh** Service; Service tidak butuh Ingress.
Ingress sendiri hanyalah data aturan — tanpa Ingress Controller (Traefik), aturan itu tidak ada yang menjalankan.

**Kenapa Pod yang dihapus muncul lagi?**
Karena kamu menghapus Pod, bukan Deployment. Deployment menyatakan "harus ada 2", controller melihat
kenyataan "sekarang 1", lalu memperbaikinya. Untuk benar-benar menghentikan, hapus Deployment-nya.

**Kenapa image lokal tidak terbaca (`ImagePullBackOff`)?**
Karena k3s memakai containerd sendiri, bukan cache image Docker. Perlu di-import dulu:
`docker save my-service:v1 -o my-service.tar && sudo k3s ctr images import my-service.tar`.
Jangan lupa `imagePullPolicy: Never` di deployment.yaml supaya k3s tidak mencoba menarik dari registry.

**Kenapa data hilang saat Pod restart?**
Filesystem container bersifat sementara. Kalau butuh data permanen, pakai PV/PVC —
lihat [k8s-storage-pv-pvc-nfs.puml](k8s-storage-pv-pvc-nfs.puml).

**PV vs PVC — mana yang duluan?**
Tergantung modenya. Statis: PV dulu (dibuat admin), baru PVC mengklaimnya. Dinamis: PVC dulu,
PV dibuat otomatis oleh provisioner. PV bersifat cluster-wide, PVC terikat namespace.

---

## 7. Praktik: dari nol sampai service jalan

Panduan lengkapnya ada di **[RUNBOOK.md](RUNBOOK.md)**. Ringkasan fase-fasenya:

| Fase | Isi |
|---|---|
| 1 | Install Ubuntu di WSL2, install k3s, atur `kubectl` agar jalan tanpa `sudo` |
| 2 | Bangun contoh service Node.js, build image, import ke containerd k3s |
| 3 | Tulis manifest: Deployment, Service, Ingress |
| 4 | `kubectl apply` dan pantau Pod naik |
| 5 | Akses service dari WSL dan dari Windows |
| 6 | Coba scaling, self-healing, dan rolling update |
| 7 | Bersih-bersih |

Bagian paling berkesan biasanya Fase 6:

```bash
# Self-healing: hapus satu Pod, lihat Kubernetes membuatnya kembali
kubectl -n my-app delete pod <nama-pod>
kubectl -n my-app get pods

# Load balancing: jalankan berkali-kali, perhatikan nama hostname berganti
curl http://localhost/
```

**Catatan penting untuk setup WSL2 + k3s ini** (semua tercantum di RUNBOOK):

- IP WSL2 berubah setiap reboot — gunakan `localhost` dari Windows sebisa mungkin.
- Setiap perubahan kode mengharuskan siklus manual `docker build` → `docker save` → `k3s ctr images import`.
  Untuk iterasi yang sering, pertimbangkan menjalankan registry lokal di dalam cluster.
- Hanya satu node — HA dan failover tidak bisa diuji di sini. Untuk itu pakai k3d.
- Bukan server 24/7 — WSL2 ikut mati saat Windows dimatikan.
- Satu instalasi OS = satu cluster. Untuk beberapa cluster sekaligus, pakai k3d.

---

## 8. Perintah kubectl yang paling sering dipakai

| Tugas | Perintah |
|---|---|
| Lihat node | `kubectl get nodes` |
| Lihat semua Pod di semua namespace | `kubectl get pods -A` |
| Pantau Pod secara real time | `kubectl -n my-app get pods -w` |
| Lihat Pod beserta node-nya | `kubectl -n my-app get pods -o wide` |
| Lihat log Pod | `kubectl -n my-app logs <pod>` |
| Masuk ke shell dalam Pod | `kubectl -n my-app exec -it <pod> -- sh` |
| Cari tahu kenapa Pod gagal | `kubectl -n my-app describe pod <pod>` |
| Ubah jumlah replica | `kubectl -n my-app scale deploy my-service --replicas=5` |
| Rolling update image | `kubectl -n my-app set image deploy/my-service my-service=my-service:v2` |
| Pantau proses rollout | `kubectl -n my-app rollout status deploy/my-service` |
| Riwayat rollout | `kubectl -n my-app rollout history deploy/my-service` |
| Kembali ke versi sebelumnya | `kubectl -n my-app rollout undo deploy/my-service` |
| Lihat PV dan PVC | `kubectl get pv` / `kubectl -n my-app get pvc` |
| Hapus seluruh aplikasi | `kubectl delete namespace my-app` |

> Tip debugging: kalau Pod tidak `Running`, hampir selalu `kubectl describe pod <pod>` yang memberi
> jawabannya — lihat bagian **Events** di paling bawah output.

---

## Referensi lanjutan

- Dokumentasi resmi Kubernetes (ada versi Bahasa Indonesia): <https://kubernetes.io/id/docs/home/>
- Dokumentasi k3s: <https://docs.k3s.io/>
- Dokumentasi k3d: <https://k3d.io/>
- PlantUML: <https://plantuml.com/>
