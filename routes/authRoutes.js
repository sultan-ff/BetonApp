const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bcrypt = require('bcryptjs');
// Kalau ada yang akses root web, langsung lempar ke halaman login
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Route untuk nampilin halaman EJS
router.get('/login', authController.loginView);
router.get('/register', authController.registerView);

// Route untuk nangkep data dari form HTML (Method POST)
router.post('/login', authController.loginProcess);
router.post('/register', authController.registerProcess);

router.get('/lupa-password', authController.lupaPasswordView);

// Proses kirim link ke email
router.post('/lupa-password', authController.lupaPasswordProcess);


// ==========================================
// 3. ROUTE RESET PASSWORD (Dari Link Email)
// ==========================================

// Tampilkan form password baru (URL bawaan token unik)
router.get('/reset-password/:token', authController.resetPasswordView);

// Proses simpan password baru ke database
router.post('/reset-password/:token', authController.resetPasswordProcess);

// Route untuk keluar
router.get('/logout', authController.logout);

module.exports = router;