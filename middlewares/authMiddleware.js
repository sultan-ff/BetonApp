const authMiddleware = {
    // Fungsi 1: Cek apakah user sudah login
    isLogin: (req, res, next) => {
        if (req.session.userId) {
            return next(); // Kalau ada session, silakan lewat
        }
        res.redirect('/login'); // Kalau belum login, tendang balik ke form login
    },

    // Fungsi 2: Cek apakah role-nya sesuai
    // Parameter 'roles' berupa array, misal: ['admin', 'penjualan']
    checkRole: (roles) => {
        return (req, res, next) => {
            // Kalau role user yang login ada di dalam array yang diizinkan
            if (req.session.role && roles.includes(req.session.role)) {
                return next(); // Silakan masuk
            }
            // Kalau role-nya gak sesuai (misal pelanggan maksa masuk menu gudang)
            res.status(403).send('<h1>403 - Akses Ditolak! Lu gak punya izin ke halaman ini.</h1>');
        };
    }
};

module.exports = authMiddleware;