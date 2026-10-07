# SSH ke Server Ubuntu melalui Cloudflare Tunnel

Panduan ini mengakses server Ubuntu lokal melalui Cloudflare Tunnel tanpa membuka port `22` pada router.

> Nama file ini mengikuti permintaan (`ssh-cloudlfare.md`). Nama produk dan perintah yang benar tetap **Cloudflare**.

## Arsitektur

```text
Laptop Windows
  -> cloudflared client
  -> Cloudflare Access
  -> Cloudflare Tunnel arxenova
  -> ssh://localhost:22 pada server Ubuntu
```

Konfigurasi yang digunakan:

```text
Tunnel existing : arxenova
Hostname SSH    : ssh.arxenovasocial.com
Origin service  : ssh://localhost:22
```

Tidak perlu membuat tunnel atau connector baru. Tunnel `arxenova` yang sudah digunakan SafeMax dapat mempunyai beberapa published application.

## 1. Pastikan SSH aktif di Ubuntu

Pada server Ubuntu, periksa OpenSSH:

```bash
sudo systemctl status ssh --no-pager
```

Jika belum terpasang:

```bash
sudo apt update
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

Pastikan port lokal `22` sedang didengarkan:

```bash
sudo ss -lntp | grep ':22'
```

Disarankan menggunakan user non-root. Lihat daftar home directory user normal:

```bash
getent passwd | awk -F: '$3 >= 1000 && $3 < 65534 {print $1, $6}'
```

## 2. Tambahkan route SSH pada tunnel

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Buka **Zero Trust**.
3. Pilih **Networks > Tunnels**.
4. Buka tunnel `arxenova`.
5. Buka **Routes**.
6. Klik **Add route**.
7. Pilih **Published application**.
8. Masukkan konfigurasi:

```text
Subdomain : ssh
Domain    : arxenovasocial.com
Path      : kosong
Type      : SSH
URL       : localhost:22
```

Service akhirnya harus terbaca:

```text
ssh.arxenovasocial.com -> ssh://localhost:22
```

Simpan route. Jangan menghapus route web SafeMax yang sudah ada:

```text
safemax.arxenovasocial.com -> http://localhost:3010
```

## 3. Verifikasi DNS SSH

Cloudflare biasanya membuat record DNS secara otomatis ketika published application disimpan. Buka **Cloudflare > DNS > Records** dan cari:

```text
Type   : CNAME
Name   : ssh
Target : TUNNEL-ID.cfargotunnel.com
Proxy  : Proxied
```

Jangan membuat record `A` menuju IP lokal server. Uji dari Windows:

```powershell
nslookup ssh.arxenovasocial.com 1.1.1.1
```

## 4. Lindungi SSH dengan Cloudflare Access

Route SSH wajib dilindungi dengan policy Access.

1. Buka **Cloudflare Zero Trust > Access > Applications**.
2. Klik **Add an application**.
3. Pilih **Self-hosted**.
4. Masukkan:

```text
Application name : SSH Arxenova
Session duration : 8 hours
Public hostname  : ssh.arxenovasocial.com
```

5. Buat policy:

```text
Policy name : Allow SSH Administrator
Action      : Allow
Include     : Emails -> EMAIL_ADMIN_ANDA
```

Ganti `EMAIL_ADMIN_ANDA` dengan satu alamat email administrator yang sebenarnya. Jangan gunakan policy `Everyone` untuk SSH.

6. Jika diminta memilih metode login, buka **Settings > Authentication > Login methods**, lalu aktifkan metode yang akan digunakan, misalnya **One-time PIN** atau identity provider organisasi.
7. Simpan application dan policy.

## 5. Instal cloudflared pada Windows

Buka PowerShell sebagai Administrator:

```powershell
winget install --id Cloudflare.cloudflared
```

Tutup dan buka kembali PowerShell, kemudian verifikasi:

```powershell
cloudflared --version
(Get-Command cloudflared).Source
ssh -V
```

Jika `ssh` belum tersedia, instal **OpenSSH Client** melalui **Settings > System > Optional Features**, atau jalankan PowerShell sebagai Administrator:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

## 6. Login ke Cloudflare Access

Pada Windows:

```powershell
cloudflared access login https://ssh.arxenovasocial.com
```

Browser akan terbuka. Login menggunakan email yang diizinkan oleh policy Access.

## 7. Hubungkan SSH dari Windows

Ganti `USER_UBUNTU` dengan username non-root pada server:

```powershell
ssh -o ProxyCommand="cloudflared access ssh --hostname %h" USER_UBUNTU@ssh.arxenovasocial.com
```

Saat koneksi pertama, verifikasi fingerprint host server sebelum menjawab `yes`.

## 8. Buat konfigurasi SSH Windows

Agar koneksi berikutnya lebih singkat, buat file konfigurasi:

```powershell
New-Item -ItemType Directory -Force "$HOME\.ssh"
notepad "$HOME\.ssh\config"
```

Isi file:

```sshconfig
Host safemax-server
    HostName ssh.arxenovasocial.com
    User USER_UBUNTU
    ProxyCommand cloudflared access ssh --hostname %h
```

Ganti `USER_UBUNTU`, simpan, lalu hubungkan dengan:

```powershell
ssh safemax-server
```

Jika SSH tidak menemukan `cloudflared`, lihat path aktual:

```powershell
(Get-Command cloudflared).Source
```

Gunakan path tersebut pada `ProxyCommand`. Contoh:

```sshconfig
Host safemax-server
    HostName ssh.arxenovasocial.com
    User USER_UBUNTU
    ProxyCommand "C:\Program Files (x86)\cloudflared\cloudflared.exe" access ssh --hostname %h
```

## 9. Gunakan SSH key

Buat key pada Windows:

```powershell
ssh-keygen -t ed25519 -C "safemax-admin"
```

Gunakan passphrase. Public key berada di:

```text
C:\Users\NAMA_USER\.ssh\id_ed25519.pub
```

Tampilkan public key:

```powershell
Get-Content "$HOME\.ssh\id_ed25519.pub"
```

Pada Ubuntu, login menggunakan metode yang masih tersedia, kemudian pasang public key untuk user non-root tersebut:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Tempel **public key** dalam satu baris. Jangan pernah menyalin file private key `id_ed25519` ke server atau repository.

Uji dari terminal Windows baru:

```powershell
ssh safemax-server
```

## 10. Hardening SSH setelah key berhasil

Lakukan tahap ini hanya setelah login menggunakan SSH key telah berhasil. Pertahankan sesi SSH lama tetap terbuka saat menguji sesi baru agar tidak terkunci dari server.

Buat konfigurasi:

```bash
sudo nano /etc/ssh/sshd_config.d/99-safemax-hardening.conf
```

Isi:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Validasi sebelum reload:

```bash
sudo sshd -t
```

Jika tidak ada output error:

```bash
sudo systemctl reload ssh
```

Buka terminal Windows baru dan pastikan ini tetap berhasil:

```powershell
ssh safemax-server
```

## 11. Firewall dan router

Cloudflare Tunnel menggunakan koneksi keluar dari server, sehingga tidak perlu membuka atau meneruskan port `22` pada router.

Jika server tetap perlu menerima SSH langsung dari LAN, batasi UFW sesuai subnet lokal. Contoh untuk LAN `192.168.1.0/24`:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw status
```

Jangan menghapus rule SSH yang sedang digunakan sebelum koneksi melalui tunnel benar-benar berhasil. Setelah tunnel teruji, hapus port forwarding TCP `22` pada router jika sebelumnya pernah dibuat.

## 12. Validasi akhir

### Pada Ubuntu

```bash
sudo systemctl is-active ssh
sudo systemctl is-active cloudflared
sudo ss -lntp | grep ':22'
sudo journalctl -u cloudflared -n 50 --no-pager
```

### Pada Windows

```powershell
nslookup ssh.arxenovasocial.com 1.1.1.1
cloudflared access login https://ssh.arxenovasocial.com
ssh -vv safemax-server
```

Hapus `-vv` setelah diagnosis selesai agar output kembali ringkas.

## Troubleshooting

### Domain menghasilkan NXDOMAIN

- Pastikan published application `ssh.arxenovasocial.com` sudah disimpan.
- Pastikan CNAME `ssh` tersedia pada **DNS > Records**.
- Bersihkan cache DNS Windows:

```powershell
ipconfig /flushdns
```

### Browser autentikasi Access tidak terbuka

```powershell
cloudflared access login https://ssh.arxenovasocial.com
```

Pastikan email login cocok dengan policy Access dan login method sudah aktif.

### `cloudflared` tidak ditemukan oleh SSH

```powershell
(Get-Command cloudflared).Source
```

Masukkan path absolut hasil tersebut pada `ProxyCommand` di file SSH config.

### `Connection refused` atau kegagalan origin

Periksa SSH lokal di Ubuntu:

```bash
sudo systemctl status ssh --no-pager
sudo ss -lntp | grep ':22'
ssh localhost
```

Pastikan route Cloudflare menggunakan `ssh://localhost:22`, bukan HTTP.

### Access ditolak

- Pastikan application menggunakan hostname `ssh.arxenovasocial.com`.
- Pastikan policy beraksi `Allow`.
- Pastikan email pengguna tercantum dalam policy.
- Jalankan kembali `cloudflared access login`.

### Host key berubah

Jangan langsung menghapus host key. Pastikan server memang diinstal ulang atau kunci SSH benar-benar berubah. Setelah diverifikasi, hapus entry lama:

```powershell
ssh-keygen -R ssh.arxenovasocial.com
```

Kemudian hubungkan ulang dan cocokkan fingerprint baru dari server.

## Checklist

- [ ] Service `ssh` Ubuntu aktif.
- [ ] Service `cloudflared` aktif.
- [ ] Route `ssh.arxenovasocial.com -> ssh://localhost:22` tersedia.
- [ ] Record CNAME `ssh` tersedia dan berstatus Proxied.
- [ ] Cloudflare Access application dan policy email sudah dibuat.
- [ ] `cloudflared` dan OpenSSH Client terpasang pada Windows.
- [ ] Login Cloudflare Access berhasil.
- [ ] Login SSH melalui tunnel berhasil.
- [ ] SSH key dengan passphrase sudah diuji.
- [ ] Login root dan password baru dinonaktifkan setelah SSH key berhasil.
- [ ] Tidak ada port forwarding TCP `22` pada router.

## Catatan keamanan

- Jangan commit token tunnel, private key SSH, atau isi `/etc/cloudflared/token`.
- Jangan mengizinkan `Everyone` pada policy Access SSH.
- Gunakan user non-root dan jalankan administrasi dengan `sudo`.
- Gunakan SSH key dengan passphrase.
- Cloudflare Access melindungi jalur tunnel, sedangkan SSH key tetap melindungi login pada sistem operasi; gunakan keduanya.