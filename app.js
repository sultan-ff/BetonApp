const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

// ==========================================
// FIX 1: Port dinamis (Wajib buat Railway)
// ==========================================
const port = process.env.PORT || 3000;

// 1. Setup Template Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Setup Middleware untuk parsing data form & static files (CSS/Images)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Setup Session
app.use(session({
    // FIX 2: Bikin secret key dinamis (Opsional untuk keamanan)
    secret: process.env.SESSION_SECRET || 'secret-key-readymix-2026', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set true kalau nanti udah pakai HTTPS
}));

// ==========================================
// 4. IMPORT ROUTES
// ==========================================
const authRoutes = require('./routes/authRoutes');
const pelangganRoutes = require('./routes/pelangganRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gudangRoutes = require('./routes/gudangRoutes');
const penjualanRoutes = require('./routes/penjualanRoutes');
const pembelianRoutes = require('./routes/pembelianRoutes');

// ==========================================
// 5. DAFTAR ROUTES KE EXPRESS
// ==========================================
// Route untuk Login, Register, Logout
app.use('/', authRoutes); 

// Route spesifik per Role
app.use('/pelanggan', pelangganRoutes);
app.use('/admin', adminRoutes);
app.use('/gudang', gudangRoutes);
app.use('/penjualan', penjualanRoutes);
app.use('/pembelian', pembelianRoutes);

// Route Fallback kalau ada yang akses URL ngawur (404 Page Not Found)
app.use((req, res) => {
    res.status(404).send('<h1>404 - Halaman Tidak Ditemukan</h1>');
});

// ==========================================
// 6. Jalankan Server
// ==========================================
app.listen(port, () => {
    // FIX 3: Teks diubah karena nanti bukan localhost lagi kalau udah di cloud
    console.log(`Server Sistem Pemesanan Ready-Mix berhasil jalan di port ${port}`);
});