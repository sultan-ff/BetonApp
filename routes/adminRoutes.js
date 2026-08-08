const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

// Pasang Satpam: Wajib Login & Wajib Role 'admin'
router.use(authMiddleware.isLogin, authMiddleware.checkRole(['admin']));

// Daftar URL Admin
router.get('/dashboard', adminController.dashboardView);
router.get('/users', adminController.kelolaUserView);

router.get('/users/tambah', adminController.tambahUserView);
router.post('/users/tambah', adminController.tambahUserProcess);

// Route untuk Edit User
router.get('/users/edit/:id', adminController.editUserView);
router.post('/users/edit/:id', adminController.editUserProcess);

// Route untuk Hapus User
router.get('/users/hapus/:id', adminController.deleteUserProcess);

module.exports = router;