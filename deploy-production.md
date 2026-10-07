# Deployment Production SafeMax Presence

Panduan ini menjalankan SafeMax Presence pada server Ubuntu lokal dan mempublikasikannya melalui Cloudflare Tunnel:

```text
Internet
  -> https://safemax.arxenovasocial.com
  -> Cloudflare DNS dan Cloudflare Tunnel
  -> cloudflared pada Ubuntu
  -> SafeMax Presence di http://127.0.0.1:3010
```

Cloudflare Tunnel membuat koneksi keluar dari Ubuntu ke Cloudflare. Port `3010`, `80`, dan `443` tidak perlu diteruskan dari router ke server.

## 1. Prasyarat

- Domain `arxenovasocial.com` sudah ditambahkan ke Cloudflare.
- Nameserver domain di registrar sudah diganti ke nameserver yang diberikan Cloudflare.
- Status domain pada **Cloudflare Dashboard > Overview** sudah **Active**.
- Server Ubuntu memiliki akses internet dan IP lokal yang stabil.
- URL dan anon key Supabase production tersedia.
- Anda memiliki user Ubuntu dengan akses `sudo`.

## 2. Persiapkan Ubuntu

Masuk ke server melalui SSH:

```bash
ssh USER_UBUNTU@IP_SERVER
```

Perbarui sistem dan pasang kebutuhan dasar:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl build-essential ca-certificates
```

### Instal Node.js

Gunakan Node.js 22 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifikasi:

```bash
node --version
npm --version
```

## 3. Tempatkan aplikasi

Direktori yang digunakan dalam panduan ini:

```text
/opt/safemax-presence
```

### Pilihan A: clone repository

```bash
cd /opt
sudo git clone URL_REPOSITORY_ANDA safemax-presence
sudo chown -R "$USER":"$USER" /opt/safemax-presence
cd /opt/safemax-presence
```

### Pilihan B: upload manual

Upload source code menggunakan SCP/SFTP ke `/opt/safemax-presence`. Jangan upload folder berikut:

```text
node_modules
.next
```

Kemudian atur kepemilikan folder:

```bash
sudo chown -R "$USER":"$USER" /opt/safemax-presence
cd /opt/safemax-presence
```

## 4. Konfigurasi environment

Buat satu file environment saja:

```bash
nano /opt/safemax-presence/.env.local
```

Isi dengan konfigurasi production:

```env
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_SUPABASE
```

Ganti nilai contoh dengan data Supabase yang sebenarnya, lalu amankan file:

```bash
chmod 600 /opt/safemax-presence/.env.local
```

> Variabel dengan awalan `NEXT_PUBLIC_` ditanam ke bundle ketika build. Setelah `.env.local` berubah, aplikasi wajib di-build ulang.

## 5. Install dan build aplikasi

```bash
cd /opt/safemax-presence
npm ci
npm run build:production
```

Uji aplikasi sementara:

```bash
npm run start:production
```

Buka terminal SSH lain dan periksa port lokal:

```bash
curl -I http://127.0.0.1:3010
```

Respons `HTTP/1.1 200 OK`, `HTTP/1.1 307 Temporary Redirect`, atau respons HTTP Next.js lain menandakan server dapat dijangkau. Hentikan proses sementara dengan `Ctrl+C`.

## 6. Jalankan aplikasi menggunakan systemd

Periksa lokasi `npm`:

```bash
which npm
```

Contoh berikut mengasumsikan hasilnya `/usr/bin/npm`. Buat service:

```bash
sudo nano /etc/systemd/system/safemax.service
```

Isi file berikut. Ganti `USER_UBUNTU` dengan username server yang sebenarnya:

```ini
[Unit]
Description=SafeMax Presence Next.js
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=USER_UBUNTU
Group=USER_UBUNTU
WorkingDirectory=/opt/safemax-presence
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start:production
Restart=always
RestartSec=5
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
```

Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now safemax
sudo systemctl status safemax --no-pager
```

Uji kembali:

```bash
curl -I http://127.0.0.1:3010
```

Perintah log:

```bash
sudo journalctl -u safemax -n 100 --no-pager
sudo journalctl -u safemax -f
```

## 7. Buat Cloudflare Tunnel

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Buka **Zero Trust**.
3. Pilih **Networks > Tunnels**.
4. Klik **Create a tunnel**.
5. Pilih **Cloudflared**.
6. Beri nama tunnel `safemax-ubuntu`.
7. Klik **Save tunnel**.
8. Pilih environment **Debian/Ubuntu 64-bit**.

Dashboard akan menampilkan perintah instalasi yang berisi token tunnel. Token tersebut bersifat rahasia dan tidak boleh dimasukkan ke repository.

### Instal cloudflared

Tambahkan repository resmi Cloudflare:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update
sudo apt install -y cloudflared
cloudflared --version
```

Salin dan jalankan perintah service dari dashboard. Bentuknya kurang lebih:

```bash
sudo cloudflared service install TOKEN_TUNNEL_DARI_DASHBOARD
```

Jangan menggunakan teks token contoh di atas. Setelah terpasang, periksa service:

```bash
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared
sudo systemctl status cloudflared --no-pager
```

Connector di dashboard Cloudflare seharusnya berstatus **Healthy** atau **Connected**.

## 8. Hubungkan subdomain ke aplikasi

Pada tunnel `safemax-ubuntu`:

1. Buka tab **Public Hostnames** atau **Published application routes**.
2. Klik **Add a public hostname**.
3. Masukkan konfigurasi berikut:

```text
Subdomain : safemax
Domain    : arxenovasocial.com
Path      : kosong
Type      : HTTP
URL       : localhost:3010
```

Service akhirnya harus terbaca:

```text
https://safemax.arxenovasocial.com -> http://localhost:3010
```

Klik **Save hostname**. Cloudflare biasanya otomatis membuat record DNS:

```text
Type   : CNAME
Name   : safemax
Target : UUID-TUNNEL.cfargotunnel.com
Proxy  : Proxied
```

Periksa di **Cloudflare Dashboard > DNS > Records**. Hapus record `A`, `AAAA`, atau `CNAME` lama dengan nama `safemax` jika mengarah ke target lain. Jangan membuat record `A` ke IP lokal Ubuntu.

## 9. Konfigurasi SSL/TLS Cloudflare

Buka **SSL/TLS > Overview** dan pilih:

```text
Full
```

Kemudian buka **SSL/TLS > Edge Certificates** dan aktifkan:

```text
Always Use HTTPS
Automatic HTTPS Rewrites
Minimum TLS Version: TLS 1.2
```

Origin lokal tetap menggunakan `http://localhost:3010`. Sertifikat Certbot/Nginx tidak diperlukan untuk alur Cloudflare Tunnel ini.

## 10. Firewall dan router

Aktifkan firewall hanya setelah akses SSH dipastikan diizinkan:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

Untuk Cloudflare Tunnel, jangan membuka port berikut ke internet:

```text
3010
80
443
```

Tidak diperlukan port forwarding pada router. Server hanya membutuhkan koneksi keluar menuju Cloudflare dan Supabase.

## 11. Pengujian akhir

Periksa aplikasi lokal:

```bash
curl -I http://127.0.0.1:3010
```

Periksa kedua service:

```bash
sudo systemctl is-active safemax
sudo systemctl is-active cloudflared
```

Periksa domain publik:

```bash
curl -I https://safemax.arxenovasocial.com
```

Buka di browser:

```text
https://safemax.arxenovasocial.com
```

Uji fungsi berikut:

- Login admin dan seluruh user.
- Edit profil, nama, password, dan foto.
- Clock-in dan clock-out dengan kamera.
- Riwayat presensi.
- Dashboard dan rekap admin.
- Logout dan login kembali.

## 12. Prosedur update aplikasi

Jika menggunakan Git:

```bash
cd /opt/safemax-presence
git pull
npm ci
npm run build:production
sudo systemctl restart safemax
sudo systemctl status safemax --no-pager
```

Periksa log setelah update:

```bash
sudo journalctl -u safemax -n 100 --no-pager
```

Cloudflare Tunnel tidak perlu direstart untuk update aplikasi biasa.

## 13. Troubleshooting

### Cloudflare menampilkan Error 502

Tunnel aktif, tetapi aplikasi tidak dapat dijangkau. Periksa:

```bash
sudo systemctl status safemax --no-pager
curl -I http://127.0.0.1:3010
sudo journalctl -u safemax -n 100 --no-pager
```

Pastikan service tunnel menggunakan `http://localhost:3010`, bukan `https://localhost:3010`.

### Cloudflare menampilkan Error 1033

Connector tunnel tidak aktif. Periksa dan restart:

```bash
sudo systemctl status cloudflared --no-pager
sudo journalctl -u cloudflared -n 100 --no-pager
sudo systemctl restart cloudflared
```

### Domain belum dapat ditemukan

Periksa nameserver dan DNS:

```bash
dig NS arxenovasocial.com
dig CNAME safemax.arxenovasocial.com
```

Pastikan domain berstatus **Active** pada Cloudflare dan record tunnel tersedia.

### Perubahan `.env.local` tidak terbaca

Build ulang karena variabel `NEXT_PUBLIC_*` ditanam saat build:

```bash
cd /opt/safemax-presence
npm run build:production
sudo systemctl restart safemax
```

### Tampilan masih versi lama

Pastikan build dan restart sudah berhasil. Jika perlu, buka **Cloudflare > Caching > Configuration** lalu lakukan **Purge Everything**.

### Memeriksa port 3010

```bash
sudo ss -lntp | grep 3010
```

### Restart seluruh layanan

```bash
sudo systemctl restart safemax
sudo systemctl restart cloudflared
```

## 14. Checklist deployment

- [ ] Domain `arxenovasocial.com` berstatus Active di Cloudflare.
- [ ] `.env.local` production sudah dibuat dan diamankan dengan `chmod 600`.
- [ ] `npm ci` berhasil.
- [ ] `npm run build:production` berhasil.
- [ ] Service `safemax` aktif.
- [ ] `curl http://127.0.0.1:3010` berhasil.
- [ ] Tunnel `safemax-ubuntu` berstatus Healthy.
- [ ] Public hostname mengarah ke `http://localhost:3010`.
- [ ] Record CNAME `safemax` dibuat oleh Cloudflare Tunnel.
- [ ] `https://safemax.arxenovasocial.com` dapat dibuka.
- [ ] Login, profil, presensi, dan halaman admin telah diuji.
- [ ] Port aplikasi tidak dibuka pada router.

## Catatan keamanan

- Jangan commit `.env.local` atau token Cloudflare Tunnel.
- Jangan mengirim token tunnel melalui chat atau screenshot publik.
- Batasi akses SSH menggunakan key dan nonaktifkan login password jika memungkinkan.
- Arsitektur login aplikasi saat ini menggunakan kredensial lokal di browser dan policy Supabase yang permisif. Untuk aplikasi publik dengan kebutuhan keamanan tinggi, migrasikan login ke Supabase Auth/server-side authentication dan perketat Row Level Security.