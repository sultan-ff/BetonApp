const db = require('../config/db');

const ProdukModel = {
    // Ambil semua produk beserta nama kategorinya
    getAll: async () => {
        const [rows] = await db.query(`
            SELECT p.*, k.nama_kategori 
            FROM produk p 
            LEFT JOIN kategori k ON p.kategori_id = k.id 
            ORDER BY p.id DESC
        `);
        return rows;
    },
    
    // Tambah produk baru
    create: async (kategori_id, nama_produk, harga, foto) => {
        await db.query(
            'INSERT INTO produk (kategori_id, nama_produk, harga, foto) VALUES (?, ?, ?, ?)',
            [kategori_id, nama_produk, harga, foto]
        );
    },

    // Hapus produk
    delete: async (id) => {
        await db.query('DELETE FROM produk WHERE id = ?', [id]);
    },
    // Ambil data 1 produk berdasarkan ID
    getById: async (id) => {
        const [rows] = await db.query(`
            SELECT p.*, k.nama_kategori 
            FROM produk p 
            LEFT JOIN kategori k ON p.kategori_id = k.id 
            WHERE p.id = ?
        `, [id]);
        return rows[0];
    },
    
};

module.exports = ProdukModel;