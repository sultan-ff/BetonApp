const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const pelangganController = require('../controllers/pelangganController');
const multer = require('multer');
const path = require('path');

// ==========================================
// KONFIGURASI MULTER (Untuk Upload Bukti)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); 
    },
    filename: (req, file, cb) => {
        // Kasih nama unik pakai tanggal/waktu biar nggak bentrok
        cb(null, 'BUKTI-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Proteksi Satpam: Wajib Login & Role 'pelanggan'
router.use(authMiddleware.isLogin, authMiddleware.checkRole(['pelanggan']));

// ==========================================
// DAFTAR ROUTE PELANGGAN
// ==========================================

// 1. Katalog & Detail Produk
router.get('/katalog', pelangganController.katalogView);
router.get('/produk/:id', pelangganController.detailProdukView);

// 2. Checkout & Order (Perhatikan upload.single di rute POST ini!)
router.get('/checkout/:id', pelangganController.checkoutView);
router.post('/checkout', upload.single('bukti_pembayaran'), pelangganController.checkoutProcess);

// 3. Invoice & Riwayat
router.get('/detail-pesanan/:id', pelangganController.detailPesananView);
router.get('/riwayat', pelangganController.riwayatView);

// 4. Upload Bukti Susulan (Dari halaman riwayat/detail)
router.post('/upload-bukti', upload.single('bukti_pembayaran'), pelangganController.uploadBuktiProcess);
// 5. Profil Pelanggan
router.get('/profil', pelangganController.profilView);
router.post('/profil/update', pelangganController.updateProfilProcess);
router.post('/profil/password', pelangganController.updatePasswordProcess);

module.exports = router;