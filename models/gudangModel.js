const db = require('../config/db');

const GudangModel = {
    getStokProduk: async () => {
        const [rows] = await db.query(`
            SELECT p.id, p.nama_produk, p.stok, p.stok_minimum, k.nama_kategori 
            FROM produk p
            LEFT JOIN kategori k ON p.kategori_id = k.id
            ORDER BY p.nama_produk ASC
        `);
        return rows;
    },

    // Fungsi baru 1: Ambil stok saat ini berdasarkan ID (buat ngecek sebelum di-update)
    getStokById: async (id) => {
        const [rows] = await db.query('SELECT stok FROM produk WHERE id = ?', [id]);
        return rows[0];
    },

    updateStok: async (id, stok) => {
        await db.query('UPDATE produk SET stok = ? WHERE id = ?', [stok, id]);
    },

    // Fungsi baru 2: Catat log riwayat
    catatRiwayat: async (produk_id, jenis, jumlah, keterangan) => {
        await db.query(
            'INSERT INTO riwayat_stok (produk_id, jenis, jumlah, keterangan) VALUES (?, ?, ?, ?)',
            [produk_id, jenis, jumlah, keterangan]
        );
    },

    // Fungsi baru 3: Ambil semua data laporan riwayat stok
    // Update Fungsi Ambil Laporan (Tambah Filter)
    getLaporanRiwayat: async (filter, startDate, endDate) => {
        try {
            let query = `
                SELECT r.*, p.nama_produk 
                FROM riwayat_stok r 
                JOIN produk p ON r.produk_id = p.id 
                WHERE 1=1
            `;
            let queryParams = [];

            // 1. Cek filter Masuk/Keluar
            if (filter) {
                query += ` AND r.jenis = ?`;
                queryParams.push(filter);
            }

            // 2. Cek filter Tanggal
            if (startDate && endDate) {
                query += ` AND r.tanggal BETWEEN ? AND ?`;
                queryParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
            }

            query += ` ORDER BY r.tanggal DESC`;

            // 3. Eksekusi Query (Pastikan nama variabel koneksi DB lu benar, biasanya 'db', 'pool', atau 'koneksi')
            const [results] = await db.query(query, queryParams);
            
            return results;
            
        } catch (error) {
            // Kalau ada error SQL, lempar ke Controller biar ketangkep dan nggak muter-muter
            throw error; 
        }
    }
};

module.exports = GudangModel;