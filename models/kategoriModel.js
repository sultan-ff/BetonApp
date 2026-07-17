const db = require('../config/db');

const KategoriModel = {
    // Ambil semua kategori
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM kategori ORDER BY id DESC');
        return rows;
    },
    
    // Tambah kategori baru
    create: async (nama_kategori) => {
        await db.query('INSERT INTO kategori (nama_kategori) VALUES (?)', [nama_kategori]);
    },
    
    // Hapus kategori
    delete: async (id) => {
        await db.query('DELETE FROM kategori WHERE id = ?', [id]);
    }
};

module.exports = KategoriModel;