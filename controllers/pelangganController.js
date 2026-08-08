const ProdukModel = require('../models/produkModel');
const PesananModel = require('../models/pesananModel');

const pelangganController = {
    // 1. Halaman Katalog
    katalogView: async (req, res) => {
        try {
            const produk = await ProdukModel.getAll();
            res.render('pelanggan/katalog', { namaUser: req.session.nama, produk });
        } catch (error) {
            console.error(error); res.send('Error memuat katalog');
        }
    },

    // 2. Halaman Detail Produk
    detailProdukView: async (req, res) => {
        try {
            const produk = await ProdukModel.getById(req.params.id);
            res.render('pelanggan/detail-produk', { namaUser: req.session.nama, produk });
        } catch (error) {
            console.error(error); res.send('Error memuat detail produk');
        }
    },

    // 3. Halaman Form Checkout
    checkoutView: async (req, res) => {
        try {
            // Pastikan panggil koneksi database lu di sini (sesuaikan path-nya jika beda)
            const db = require('../config/db'); 
            const produk = await ProdukModel.getById(req.params.id);
            
            // 1. Hitung tanggal minimal (Hari ini + 10 hari)
            const batasHari = new Date();
            batasHari.setDate(batasHari.getDate() + 10);
            
            // 2. Format biar pas dengan format input datetime-local (YYYY-MM-DDTHH:MM)
            const minDate = new Date(batasHari.getTime() - (batasHari.getTimezoneOffset() * 60000))
                            .toISOString()
                            .slice(0, 16);

            // [BARU] 3. Ambil data rekening bank yang aktif dari database
            const [banks] = await db.query("SELECT * FROM rekening_bank WHERE status = 'aktif'");

            // 4. PASTIKAN minDate dan banks ikut dikirim di dalam objek render!
            res.render('pelanggan/checkout', { 
                namaUser: req.session.nama, 
                produk,
                minDate, // <- Kunci biar EJS gak teriak "not defined"
                banks    // <- [BARU] Lempar data bank ke file EJS
            });
        } catch (error) {
            console.error(error); 
            res.send('Error memuat halaman checkout');
        }
    },

    // 4. Proses Simpan Orderan
    // 4. Proses Simpan Orderan (Diperbarui)
    // 4. Proses Simpan Orderan (Diperbarui dengan Validasi Jam Operasional)
    checkoutProcess: async (req, res) => {
        try {
            const { 
                produk_id, volume, harga_satuan, metode_pembayaran, 
                kabupaten, detail_alamat, nomor_telepon, rekening_refund, waktu_pengiriman 
            } = req.body;
            
            // VALIDASI 1: Volume harus kelipatan 7
            const vol = parseInt(volume);
            if (vol < 7 || vol % 7 !== 0) {
                return res.send('<script>alert("Volume pesanan harus kelipatan 7 m³ (contoh: 7, 14, 21, 28, dst)!"); window.history.back();</script>');
            }

            // VALIDASI 2: Wilayah Kabupaten
            const kabupatenValid = ['Kabupaten Kudus', 'Kabupaten Jepara'];
            if (!kabupatenValid.includes(kabupaten)) {
                return res.send('<script>alert("Area pengiriman saat ini hanya mencakup Kab. Kudus dan Kab. Demak!"); window.history.back();</script>');
            }

            // VALIDASI 3: Pengecekan H-10
            const jadwalKirim = new Date(waktu_pengiriman);
            const batasMinimal = new Date();
            batasMinimal.setDate(batasMinimal.getDate() + 9); 
            if (jadwalKirim < batasMinimal) {
                return res.send('<script>alert("Pemesanan gagal! Jadwal pengecoran minimal 10 hari dari hari ini."); window.history.back();</script>');
            }

            // TAMBAHKAN VALIDASI 4 DI SINI: Cek Jam Operasional (09:00 - 17:00 WIB)
            const jamKirim = jadwalKirim.getHours();
            const menitKirim = jadwalKirim.getMinutes();
            if (jamKirim < 9 || jamKirim > 17 || (jamKirim === 17 && menitKirim > 0)) {
                return res.send('<script>alert("Pemesanan gagal! Jam operasional kiriman hanya melayani pukul 09:00 s/d 17:00 WIB."); window.history.back();</script>');
            }

            // Gabungkan kabupaten dan detail alamat
            const alamat_pengiriman_lengkap = `${kabupaten} - ${detail_alamat}`;
            const total_harga = vol * parseInt(harga_satuan);
            const user_id = req.session.userId;
            
            // Tangkap file upload (jika ada)
            const file_bukti = req.file ? req.file.filename : null;

            // Simpan pesanan ke database
            const pesananId = await PesananModel.buatPesanan(
                user_id, produk_id, vol, total_harga, metode_pembayaran, 
                alamat_pengiriman_lengkap, nomor_telepon, rekening_refund, waktu_pengiriman, file_bukti
            );
            
            res.redirect('/pelanggan/detail-pesanan/' + pesananId);
        } catch (error) {
            console.error(error); 
            res.send('Gagal membuat pesanan');
        }
    },
    // 5. Halaman Detail Pesanan (Invoice)
    detailPesananView: async (req, res) => {
        try {
            const pesanan = await PesananModel.getPesananById(req.params.id, req.session.userId);
            res.render('pelanggan/detail-pesanan', { namaUser: req.session.nama, pesanan });
        } catch (error) {
            console.error(error); res.send('Error memuat detail pesanan');
        }
    },

    // 6. Halaman Riwayat Order
    // 6. Halaman Riwayat Order (DI SINI TEMPAT MENARUH LAZY-EVALUATION AUTO CANCEL)
    riwayatView: async (req, res) => {
        try {
            const db = require('../config/db');
            
            // A. EKSEKUSI AUTO-CANCEL (SUDAH DISINKRONKAN DENGAN ENUM DATABASE)
            // Hanya targetkan pesanan yang memang 'pending' dan operasionalnya belum masuk pengiriman
            await db.query(`
                UPDATE pesanan 
                SET status_bayar = 'expired',
                    status_pesanan = 'ditolak',
                    catatan_admin = 'Sistem Auto-Cancel: Melewati batas pelunasan H-7 pengantaran'
                WHERE metode_pembayaran = 'bayar di kantor' 
                  AND status_bayar = 'pending' 
                  AND status_pesanan NOT IN ('selesai', 'ditolak', 'dikirim')
                  AND NOW() > DATE_SUB(waktu_pengiriman, INTERVAL 7 DAY)
            `);

            // B. AMBIL DATA PESANAN YANG SUDAH TERUPDATE SECARA REAL-TIME
            const pesanan = await PesananModel.getPesananByUser(req.session.userId);
            
            res.render('pelanggan/riwayat', { namaUser: req.session.nama, pesanan });
        } catch (error) {
            console.error(error); res.send('Error memuat riwayat');
        }
    },

    uploadBuktiProcess: async (req, res) => {
        try {
            const pesanan_id = req.body.pesanan_id;
            const file_bukti = req.file ? req.file.filename : null;
            if (file_bukti) await PesananModel.uploadBuktiBayar(pesanan_id, file_bukti);
            res.redirect('/pelanggan/detail-pesanan/' + pesanan_id); // Balik ke detail setelah upload
        } catch (error) {
            console.error(error); res.send('Gagal upload bukti');
        }
    },
    // 7. Halaman Profil
    profilView: async (req, res) => {
        try {
            // Ambil pesan sukses/error dari URL query (contoh: ?msg=sukses)
            const pesan_sukses = req.query.msg === 'sukses' ? 'Profil berhasil diperbarui!' : 
                                 req.query.msg === 'pass_sukses' ? 'Password berhasil diubah!' : null;
            const pesan_error = req.query.msg === 'pass_salah' ? 'Password lama tidak sesuai!' : 
                                req.query.msg === 'pass_beda' ? 'Konfirmasi password baru tidak cocok!' : null;

            // Ambil data user dari database (anggap db udah di-require di atas)
            const db = require('../config/db'); 
            const [rows] = await db.query('SELECT * FROM user WHERE id = ?', [req.session.userId]);
            const user = rows[0];

            res.render('pelanggan/profil', { 
                namaUser: req.session.nama, 
                user: user,
                pesan_sukses,
                pesan_error
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat halaman profil');
        }
    },

    // 8. Proses Update Data Diri
    updateProfilProcess: async (req, res) => {
        try {
            const { nama, no_telp } = req.body;
            const userId = req.session.userId;
            
            const db = require('../config/db');
            // Asumsi di tabel user lu ada kolom no telp, kalau namanya nomor_telepon tinggal diganti aja
            await db.query('UPDATE user SET nama = ?, no_telp = ? WHERE id = ?', [nama, no_telp, userId]);
            
            // Update nama di session biar navbarnya langsung ganti
            req.session.nama = nama;
            
            res.redirect('/pelanggan/profil?msg=sukses');
        } catch (error) {
            console.error(error);
            res.send('Gagal update profil');
        }
    },

    // 9. Proses Update Password
    updatePasswordProcess: async (req, res) => {
        try {
            const { password_lama, password_baru, konfirmasi_password } = req.body;
            const userId = req.session.userId;
            const db = require('../config/db');

            // Cek apakah password baru & konfirmasi sama
            if (password_baru !== konfirmasi_password) {
                return res.redirect('/pelanggan/profil?msg=pass_beda');
            }

            // Ambil password lama dari DB
            const [rows] = await db.query('SELECT password FROM user WHERE id = ?', [userId]);
            const user = rows[0];

            // Cek kecocokan password lama (Asumsi password masih text biasa, kalau pakai bcrypt ganti logikanya)
            if (user.password !== password_lama) {
                return res.redirect('/pelanggan/profil?msg=pass_salah');
            }

            // Simpan password baru
            await db.query('UPDATE user SET password = ? WHERE id = ?', [password_baru, userId]);
            
            res.redirect('/pelanggan/profil?msg=pass_sukses');
        } catch (error) {
            console.error(error);
            res.send('Gagal update password');
        }
    }
};

module.exports = pelangganController;