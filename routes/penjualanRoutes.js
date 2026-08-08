const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const penjualanController = require('../controllers/penjualanController');
const multer = require('multer');
const path = require('path');

// 1. Konfigurasi Multer untuk menyimpan foto produk
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Foto bakal masuk ke folder ini
    },
    filename: (req, file, cb) => {
        // Nama file dibuat unik memakai timestamp agar tidak bentrok
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 2. Pasang Satpam Middleware: Wajib Login & Wajib Role 'penjualan'
router.use(authMiddleware.isLogin, authMiddleware.checkRole(['penjualan']));

// ==========================================
// ROUTE DASHBOARD PENJUALAN
// ==========================================
router.get('/dashboard', penjualanController.dashboardView);

// ==========================================
// ROUTE KELOLA KATEGORI
// ==========================================
router.get('/kategori', penjualanController.kategoriView);
router.post('/kategori/tambah', penjualanController.tambahKategoriProcess);
router.get('/kategori/hapus/:id', penjualanController.hapusKategoriProcess);

// ==========================================
// ROUTE KELOLA PRODUK
// ==========================================
router.get('/produk', penjualanController.produkView);
router.get('/produk/tambah', penjualanController.tambahProdukView);
router.post('/produk/tambah', upload.single('foto'), penjualanController.tambahProdukProcess);
router.get('/produk/hapus/:id', penjualanController.hapusProdukProcess);
router.get('/produk/edit/:id', penjualanController.editProdukView); 

// TAMBAHKAN BARIS INI BIAR PROSES EDITNYA BISA DISIMPAN:
router.post('/produk/update/:id', upload.single('foto'), penjualanController.updateProdukProcess);
router.get('/pesanan', penjualanController.daftarPesananView);
// ==========================================
// KELOLA STATUS PESANAN (Approve / Reject)
// ==========================================
router.post('/pesanan/approve/:id', penjualanController.approvePesananProcess);
router.post('/pesanan/reject/:id', penjualanController.rejectPesananProcess);
router.get('/bank', penjualanController.getKelolaBank);
router.post('/bank/add', penjualanController.addBank);
router.post('/bank/delete/:id', penjualanController.deleteBank);

// ==========================================
// KELOLA ARMADA (TRUK)
// ==========================================

// 1. Tampilkan halaman daftar armada
router.get('/truk', penjualanController.trukView);

// 2. Tambah Armada Baru
router.get('/truk/tambah', penjualanController.tambahTrukView);
router.post('/truk/tambah', penjualanController.tambahTrukProcess);

// 3. Edit Armada
router.get('/truk/edit/:id', penjualanController.editTrukView);
router.post('/truk/update/:id', penjualanController.updateTrukProcess);

// 4. Hapus Armada
router.get('/truk/hapus/:id', penjualanController.hapusTrukProcess);
// ==========================================
// KELOLA PENGIRIMAN & LOGISTIK
// ==========================================

// Tampilkan Dashboard Pengiriman Utama
router.get('/pengiriman', penjualanController.pengirimanView);

// Proses saat tombol "Kirim" ditekan (Pilih truk)
router.post('/pengiriman/kirim', penjualanController.kirimPesananProcess);
// Route untuk Surat Jalan spesifik ke 1 pesanan dan 1 truk
router.get('/pengiriman/surat-jalan/:id_pesanan/:id_truk', penjualanController.cetakSuratJalan);
router.get('/pengiriman/cetak-pengiriman', penjualanController.cetakLaporanPengiriman);
router.get('/pengiriman/excel', penjualanController.cetakExcelPengiriman);

// Proses saat tombol "Selesai" ditekan (Truk balik kandang)
router.post('/pengiriman/selesai', penjualanController.selesaiPesananProcess);
// Rute Manajemen Pesanan Pelanggan
router.get('/daftar-pesanan', penjualanController.daftarPesananView);
router.get('/detail-pesanan/:id', penjualanController.detailPesananView);
router.post('/detail-pesanan/update/:id', penjualanController.updatePesananProcess);
router.post('/detail-pesanan/upload-refund', upload.single('bukti_refund'), penjualanController.uploadRefundProcess);

// PENTING: Jalur ekspor ini HARUS SELALU ada di paling bawah file!
module.exports = router;