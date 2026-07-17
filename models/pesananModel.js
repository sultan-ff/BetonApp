const db = require('../config/db');

const PesananModel = {
    // Simpan pesanan dan kembalikan ID-nya
    // Simpan pesanan dan kembalikan ID-nya (Diperbarui dengan field lengkap)
    buatPesanan: async (user_id, produk_id, volume, total_harga, metode_pembayaran, alamat, telepon, rekening_refund, waktu_pengiriman, bukti_pembayaran) => {
        const [result] = await db.query(
            `INSERT INTO pesanan 
            (user_id, produk_id, volume, total_harga, metode_pembayaran, alamat_pengiriman, nomor_telepon, rekening_refund, waktu_pengiriman, bukti_pembayaran) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, produk_id, volume, total_harga, metode_pembayaran, alamat, telepon, rekening_refund, waktu_pengiriman, bukti_pembayaran]
        );
        return result.insertId;
    },

    getPesananByUser: async (user_id) => {
        const [rows] = await db.query(`
            SELECT p.*, pr.nama_produk, pr.harga 
            FROM pesanan p
            JOIN produk pr ON p.produk_id = pr.id
            WHERE p.user_id = ?
            ORDER BY p.tanggal_pesan DESC
        `, [user_id]);
        return rows;
    },

    // FUNGSI BARU: Ambil 1 detail pesanan (Invoice)
    getPesananById: async (id, user_id) => {
        const [rows] = await db.query(`
            SELECT p.*, pr.nama_produk, pr.harga, pr.foto 
            FROM pesanan p
            JOIN produk pr ON p.produk_id = pr.id
            WHERE p.id = ? AND p.user_id = ?
        `, [id, user_id]);
        return rows[0];
    },

    uploadBuktiBayar: async (id, nama_file) => {
        await db.query('UPDATE pesanan SET bukti_pembayaran = ? WHERE id = ?', [nama_file, id]);
    }
};

module.exports = PesananModel;