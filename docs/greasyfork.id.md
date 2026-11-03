# OpenAI Status Companion

Lihat status layanan resmi OpenAI tanpa meninggalkan percakapan. Skrip pengguna independen ini memakai data dari **status.openai.com**; skrip ini bukan produk OpenAI dan tidak mengukur ketersediaan akun pribadi Anda atau situs pihak ketiga.

## Situs yang didukung

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Informasi dan fitur

- Dalam mode posisi otomatis, tombol status ringkas menempel di samping bilah sisi kiri dan mengikuti saat bilah diperluas, diciutkan, atau diubah lebarnya. Pada layar sempit, tombol tetap di sudut dan panel dibatasi oleh area tampilan.
- Grup komponen resmi, insiden yang berlangsung, pemeliharaan terjadwal, dan waktu terakhir data berhasil diambil.
- 13 bahasa antarmuka: Inggris, Tionghoa Sederhana dan Tradisional, Spanyol, Hindi, Portugis Brasil, Jepang, Korea, Prancis, Jerman, Indonesia, Arab, dan Rusia. Tersedia deteksi otomatis bahasa halaman/browser serta pemilih manual. Bahasa Arab memakai tata letak dari kanan ke kiri. Judul dan pesan insiden resmi tetap dalam bahasa aslinya; tidak ada layanan penerjemahan.
- Mengikuti tema terang/gelap situs, pilihan tema dan sudut secara manual, akses melalui keyboard, serta Escape untuk menutup panel.
- Halaman yang terlihat disegarkan setiap 60 detik; pemeriksaan berkala di latar belakang dijeda. Permintaan memiliki batas waktu 15 detik. Jika penyegaran gagal, data cache tetap tersedia dengan penanda yang jelas.
- Data kompatibilitas yang tidak lengkap ditandai secara eksplisit sebagai belum diverifikasi, bukan ditampilkan sebagai konfirmasi terverifikasi bahwa semua layanan normal.

## Pemasangan dan penggunaan

Pasang pengelola skrip pengguna seperti Tampermonkey, lalu klik **Pasang skrip ini** di atas. Buka situs yang didukung, klik tombol status, dan gunakan tombol roda gigi untuk membuka preferensi. Jika pengelola Anda memerlukan pengaturan di browser agar skrip pengguna dapat dijalankan, ikuti petunjuk pemasangan resminya.

## Privasi dan izin

Permintaan status berupa GET anonim ke `status.openai.com`, tanpa cookie akun. Skrip memeriksa geometri bilah sisi serta atribut bahasa/tema halaman; skrip tidak membaca atau mengunggah prompt, percakapan, atau token akun. Hanya preferensi dan penanda untuk mengenali pemberitahuan status yang disimpan secara lokal. Tidak ada analitik, iklan, dependensi eksekutabel jarak jauh, atau layanan penerjemahan pihak ketiga.

## Kode sumber dan dukungan

[Kode sumber, dokumentasi, dan pelaporan masalah](https://github.com/laipeng101/openai-status-companion). Lisensi MIT. Skrip pengguna lengkap yang dapat dibaca tersedia di sini; kode sumber dan deskripsi terlokalisasi disinkronkan otomatis melalui webhook push GitHub. Pasang dan perbarui melalui Greasy Fork.

Pengujian mencakup regresi otomatis, pemeriksaan halaman uji di Chrome pada lebar desktop dan 390 px, serta integrasi dengan tata letak Leopard-X yang sebenarnya menggunakan pemutaran ulang data status publik. Lihat [dokumen validasi](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) repositori untuk hasil dan batas cakupan pengujian. Tata letak dapat berubah seiring perkembangan situs yang didukung.
