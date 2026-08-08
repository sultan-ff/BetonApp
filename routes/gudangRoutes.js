const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const gudangController = require('../controllers/gudangController');


// Proteksi Satpam: Wajib Login & Wajib Role 'gudang'
router.use(authMiddleware.isLogin, authMiddleware.checkRole(['gudang']));

// Daftar Route Gudang
router.get('/dashboard', gudangController.dashboardView);
router.get('/cek-stok', gudangController.cekStokView);
router.post('/update-stok', gudangController.updateStokProcess);
// Route untuk Laporan Riwayat
router.get('/laporan-stok', gudangController.laporanRiwayatView);
router.get('/laporan-stok/pdf', gudangController.cetakPdf); // <-- Baru
router.get('/laporan-stok/excel', gudangController.cetakExcel); // <-- Baru

// Ubah tulisan '/po' menjadi '/terbitkan-po'
router.get('/terbitkan-po', gudangController.terbitPOView);

// Biarkan rute POST-nya tetap (karena form EJS kita nembaknya ke sini)
router.post('/po/terbit', gudangController.tambahPOProcess);
// ==========================================
// PENERIMAAN BARANG DARI SUPPLIER
// ==========================================
router.get('/penerimaan', gudangController.penerimaanView);
router.post('/penerimaan/terima/:id', gudangController.terimaBarangProcess);

module.exports = router;