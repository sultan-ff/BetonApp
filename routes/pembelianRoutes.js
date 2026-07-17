const express = require('express');
const router = express.Router();
const pembelianController = require('../controllers/pembelianController');

// 1. Tampilkan Dashboard Pembelian (Tambahkan baris ini)
router.get('/', pembelianController.dashboardView);
router.get('/dashboard', pembelianController.dashboardView);

// 2. Tampilkan halaman daftar permintaan gudang
router.get('/permintaan', pembelianController.permintaanView);

// 3. Proses klik tombol "Setujui"
router.post('/po/approve/:id', pembelianController.approvePOProcess);
// Tambahkan di bawah rute-rute yang sudah ada
router.get('/po/cetak/:id', pembelianController.cetakPO);
// Rute Kelola Supplier
router.get('/supplier', pembelianController.supplierView);
router.post('/supplier/tambah', pembelianController.tambahSupplier);
router.get('/supplier/hapus/:id', pembelianController.hapusSupplier);

// Rute Laporan Pembelian
router.get('/laporan', pembelianController.laporanView);
router.get('/laporan/cetak', pembelianController.cetakLaporanPO); // <- Tambahin baris ini

module.exports = router;