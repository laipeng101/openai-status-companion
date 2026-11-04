# OpenAI Status Companion

Lihat status layanan resmi OpenAI tanpa meninggalkan percakapan. Skrip pengguna independen ini memakai data dari **status.openai.com**; skrip ini bukan produk OpenAI dan tidak mengukur ketersediaan akun pribadi Anda atau situs pihak ketiga.

## Situs yang didukung

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## Informasi dan fitur

- Jika posisi diatur otomatis, tombol status mengikuti bilah samping kiri. Tombol, panel, dan pemberitahuan bergeser agar tidak menutupi menu, kolom teks, atau kontrol lain. Jika ruang tidak cukup, elemen tersebut dapat disembunyikan untuk sementara.
- Lihat komponen berdasarkan kelompok, gangguan yang masih berlangsung, jadwal pemeliharaan, dan waktu pembaruan terakhir yang berhasil.
- Pilih [bahasa antarmuka](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md) atau biarkan skrip mengikuti bahasa halaman atau browser. Judul dan pesan resmi tentang gangguan ditampilkan dalam bahasa aslinya.
- Mengikuti tema terang/gelap situs, pilihan tema dan sudut secara manual, akses melalui keyboard, serta Escape untuk menutup panel.
- Data status diperbarui setiap 60 detik selama halaman terlihat. Pembaruan dijeda saat halaman berada di latar belakang. Batas waktu permintaan adalah 15 detik. Jika pembaruan gagal, data terakhir tetap ditampilkan dengan label cache.
- Jika skrip menggunakan API lama, bagian yang datanya belum dapat diverifikasi akan diberi label.

## Pemasangan dan penggunaan

Pasang pengelola skrip pengguna seperti Tampermonkey, lalu klik **Pasang skrip ini** di atas. Buka situs yang didukung, klik tombol status, dan gunakan tombol roda gigi untuk membuka preferensi. Jika pengelola Anda memerlukan pengaturan di browser agar skrip pengguna dapat dijalankan, ikuti petunjuk pemasangan resminya.

## Privasi dan izin

Skrip mengirim permintaan GET anonim ke `status.openai.com` tanpa cookie akun. Skrip memeriksa posisi, ukuran, dan apakah elemen halaman terlihat, serta membaca pengaturan bahasa dan tema halaman. Skrip tidak membaca atau mengirim prompt, percakapan, atau token akun. Pengaturan dan catatan untuk mencegah pemberitahuan berulang disimpan di perangkat. Skrip tidak berisi pelacak penggunaan, iklan, kode yang dijalankan dari sumber eksternal, atau layanan penerjemahan pihak ketiga.

## Kode sumber dan dukungan

[Kode sumber, dokumentasi, dan pelaporan masalah](https://github.com/laipeng101/openai-status-companion). Lisensi MIT. Skrip pengguna lengkap yang dapat dibaca tersedia di sini; kode sumber dan deskripsi terlokalisasi disinkronkan otomatis melalui webhook push GitHub. Pasang dan perbarui melalui Greasy Fork.

Pengujian mencakup pemeriksaan otomatis, pemeriksaan tata letak di Chrome dengan halaman uji lokal pada layar desktop dan lebar 390 piksel, serta pemeriksaan di Leopard-X dengan data status publik yang dikumpulkan sebelumnya. Lihat hasil dan cakupan pengujian di [dokumen validasi](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md). Pembaruan situs dapat memengaruhi posisi tombol dan panel.

[Catatan perubahan](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Bahasa yang didukung](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
