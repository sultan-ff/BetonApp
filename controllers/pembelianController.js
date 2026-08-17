const db = require('../config/db');

const pembelianController = {
    // 1. Fungsi Baru: Halaman Utama (Dashboard)
    dashboardView: async (req, res) => {
        try {
            // Hitung statistik dokumen pengadaan
            const [menunggu] = await db.query("SELECT COUNT(*) as total FROM purchase_order WHERE status = 'menunggu'");
            const [disetujui] = await db.query("SELECT COUNT(*) as total FROM purchase_order WHERE status = 'disetujui'");
            const [selesai] = await db.query("SELECT COUNT(*) as total FROM purchase_order WHERE status = 'selesai'");

            res.render('pembelian/dashboard', {
                namaUser: req.session.nama,
                role: req.session.role ,
                stats: {
                    menunggu: menunggu[0].total,
                    disetujui: disetujui[0].total,
                    selesai: selesai[0].total
                }
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat dashboard pembelian.');
        }
    },

    // 2. Nampilin halaman daftar permintaan dari Gudang
    permintaanView: async (req, res) => {
        try {
            const [poList] = await db.query(`
                SELECT po.*, s.nama_supplier, pr.nama_produk 
                FROM purchase_order po
                JOIN supplier s ON po.supplier_id = s.id
                JOIN produk pr ON po.produk_id = pr.id
                ORDER BY po.tanggal DESC
            `);

            res.render('pembelian/permintaan', {
                namaUser: req.session.nama ,
                role: req.session.role ,
                listPO: poList
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat data permintaan pembelian.');
        }
    },

    // 3. Proses ACC (Approve) permintaan menjadi PO Resmi
    approvePOProcess: async (req, res) => {
        try {
            const poId = req.params.id;
            await db.query(`UPDATE purchase_order SET status = 'disetujui' WHERE id = ?`, [poId]);
            res.redirect('/pembelian/permintaan');
        } catch (error) {
            console.error(error);
            res.send('Gagal menyetujui dokumen PO.');
        }
    },
    // 4. Fungsi Cetak Dokumen PO Resmi
    cetakPO: async (req, res) => {
        try {
            const poId = req.params.id;
            
            // Tarik data spesifik 1 PO beserta detail supplier dan produk
            const [poData] = await db.query(`
                SELECT po.*, s.nama_supplier, s.kontak, s.alamat, pr.nama_produk 
                FROM purchase_order po
                JOIN supplier s ON po.supplier_id = s.id
                JOIN produk pr ON po.produk_id = pr.id
                WHERE po.id = ?
            `, [poId]);

            // Kalau data nggak ketemu
            if (poData.length === 0) {
                return res.send('Data PO tidak ditemukan.');
            }

            res.render('pembelian/cetak-po', {
                po: poData[0],
                namaUser: req.session.nama 
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat dokumen cetak PO.');
        }
    },
    // ==========================================
    // MODUL KELOLA DATA SUPPLIER
    // ==========================================
    supplierView: async (req, res) => {
        try {
            const db = require('../config/db');
            const [suppliers] = await db.query('SELECT * FROM supplier ORDER BY id DESC');
            res.render('pembelian/supplier', {
                namaUser: req.session.nama ,
                role: req.session.role ,
                listSupplier: suppliers
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat data supplier.');
        }
    },

    tambahSupplier: async (req, res) => {
        try {
            const db = require('../config/db');
            const { nama_supplier, kontak, alamat } = req.body;
            await db.query('INSERT INTO supplier (nama_supplier, kontak, alamat) VALUES (?, ?, ?)', [nama_supplier, kontak, alamat]);
            res.redirect('/pembelian/supplier');
        } catch (error) {
            console.error(error);
            res.send('Gagal menambah supplier baru.');
        }
    },

    hapusSupplier: async (req, res) => {
        try {
            const db = require('../config/db');
            await db.query('DELETE FROM supplier WHERE id = ?', [req.params.id]);
            res.redirect('/pembelian/supplier');
        } catch (error) {
            console.error(error);
            // Error ini biasanya muncul kalau supplier sudah terikat dengan tabel PO (Foreign Key Restrict)
            res.send('Gagal menghapus! Supplier ini sedang digunakan dalam dokumen Purchase Order.');
        }
    },

    // ==========================================
    // MODUL LAPORAN HISTORI PEMBELIAN
    // ==========================================
   laporanView: async (req, res) => {
        try {
            const db = require('../config/db');
            
            // 1. Tangkap parameter pencarian dari URL (GET Request)
            const { supplier, produk, tgl_mulai, tgl_sampai } = req.query;
            
            // 2. Ambil master data untuk mengisi Dropdown di EJS
            const [listSupplier] = await db.query("SELECT id, nama_supplier FROM supplier ORDER BY nama_supplier ASC");
            const [listProduk] = await db.query("SELECT id, nama_produk FROM produk ORDER BY nama_produk ASC");

            // 3. Siapkan query SQL dasar laporan
            let sql = `
                SELECT po.*, s.nama_supplier, pr.nama_produk 
                FROM purchase_order po
                JOIN supplier s ON po.supplier_id = s.id
                JOIN produk pr ON po.produk_id = pr.id
                WHERE 1=1
            `;
            let params = [];

            // 4. Filter sekarang menggunakan ID (Bukan LIKE lagi karena pakai dropdown)
            if (supplier) {
                sql += " AND po.supplier_id = ?";
                params.push(supplier);
            }
            if (produk) {
                sql += " AND po.produk_id = ?";
                params.push(produk);
            }
            if (tgl_mulai) {
                sql += " AND DATE(po.tanggal) >= ?"; 
                params.push(tgl_mulai);
            }
            if (tgl_sampai) {
                sql += " AND DATE(po.tanggal) <= ?";
                params.push(tgl_sampai);
            }

            sql += " ORDER BY po.tanggal DESC";

            // 5. Eksekusi query laporan
            const [laporan] = await db.query(sql, params);
            
            // 6. Kirim semua data ke EJS
            res.render('pembelian/laporan', {
                namaUser: req.session.nama ,
                role: req.session.role ,
                listLaporan: laporan,
                listSupplier: listSupplier, // Kirim daftar supplier buat dropdown
                listProduk: listProduk,     // Kirim daftar produk buat dropdown
                query: req.query 
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat laporan histori pembelian.');
        }
    },
    // Fungsi Baru: Cetak Laporan Pembelian (Versi Kop Surat)
    cetakLaporanPO: async (req, res) => {
        try {
            const db = require('../config/db');
            const [laporan] = await db.query(`
                SELECT po.*, s.nama_supplier, pr.nama_produk 
                FROM purchase_order po
                JOIN supplier s ON po.supplier_id = s.id
                JOIN produk pr ON po.produk_id = pr.id
                ORDER BY po.tanggal DESC
            `);
            
            // Bikin format tanggal Indonesia (contoh: 5 Juli 2026)
            const date = new Date();
            const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const tanggalCetak = `${date.getDate()} ${bulanIndo[date.getMonth()]} ${date.getFullYear()}`;

            res.render('pembelian/cetak-laporan', {
                namaUser: req.session.nama ,
                tanggalCetak: tanggalCetak
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat halaman cetak laporan pembelian.');
        }
    }
};

module.exports = pembelianController;