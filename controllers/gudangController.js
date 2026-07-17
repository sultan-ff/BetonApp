const GudangModel = require('../models/gudangModel');
const xlsx = require('xlsx');

const gudangController = {
    dashboardView: (req, res) => {
        res.render('gudang/dashboard', {
            namaUser: req.session.nama,
            role: req.session.role
        });
    },

    cekStokView: async (req, res) => {
        try {
            const dataStok = await GudangModel.getStokProduk();
            res.render('gudang/cek-stok', {
                namaUser: req.session.nama,
                role: req.session.role,
                produkStok: dataStok
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat data stok gudang');
        }
    },

    // Modifikasi fungsi update stok biar otomatis nyatet laporan
    // Proses Tambah Stok (Barang Masuk) dari Form Baru
    updateStokProcess: async (req, res) => {
        try {
            const { id, jumlah_masuk, keterangan } = req.body;
            const tambahan = parseInt(jumlah_masuk);

            // 1. Ambil stok lama
            const produkLama = await GudangModel.getStokById(id);
            const stokLama = produkLama.stok;

            // 2. Tambahkan stok lama dengan inputan baru
            const stokBaru = stokLama + tambahan;

            // 3. Update angka stok di tabel produk
            await GudangModel.updateStok(id, stokBaru);

            // 4. Catat ke riwayat_stok dengan keterangan dari form
            await GudangModel.catatRiwayat(id, 'masuk', tambahan, keterangan || 'Input Barang Masuk');

            res.redirect('/gudang/cek-stok');
        } catch (error) {
            console.error(error);
            res.send('Gagal memperbarui stok barang');
        }
    },

    // Fungsi baru: Nampilin halaman laporan
    // Update Fungsi View Laporan
   laporanRiwayatView: async (req, res) => {
        try {
            // 1. Tangkap semua filter dari URL
            const filter = req.query.filter || ''; 
            const startDate = req.query.startDate || ''; 
            const endDate = req.query.endDate || '';

            // 2. Kirim ketiga parameter tersebut ke Model
            const laporan = await GudangModel.getLaporanRiwayat(filter, startDate, endDate);
            
            // 3. Render ke EJS dan kirim balik datanya biar nempel di input form
            res.render('gudang/laporan-stok', {
                namaUser: req.session.nama,
                role: req.session.role,
                laporan: laporan,
                currentFilter: filter,
                startDate: startDate, 
                endDate: endDate
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat laporan riwayat stok');
        }
    },

    // Fungsi Baru: Cetak PDF (Render ke Halaman Cetak)
    // Fungsi Baru: Cetak PDF (Render ke Halaman Cetak)
    cetakPdf: async (req, res) => {
        try {
            const filter = req.query.filter || '';
            const laporan = await GudangModel.getLaporanRiwayat(filter);
            
            // Format tanggal untuk kop surat
            const date = new Date();
            const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const tanggalCetak = `${date.getDate()} ${namaBulan[date.getMonth()]} ${date.getFullYear()}`;

            res.render('gudang/cetak-pdf', {
                laporan: laporan,
                tanggalCetak: tanggalCetak,
                namaUser: req.session.nama // <--- TAMBAHIN BARIS INI BIAR NAMANYA OTOMATIS
            });
        } catch (error) {
            console.error(error);
            res.send('Error membuat PDF');
        }
    },

    // Fungsi Baru: Download Excel
    cetakExcel: async (req, res) => {
        try {
            const filter = req.query.filter || '';
            const laporan = await GudangModel.getLaporanRiwayat(filter);

            // Format data untuk Excel
            const dataExcel = laporan.map((item, index) => ({
                'No': index + 1,
                'Waktu & Tanggal': new Date(item.tanggal).toLocaleString('id-ID'),
                'Mutu Beton': item.nama_produk,
                'Jenis Transaksi': item.jenis.toUpperCase(),
                'Jumlah (m³)': item.jumlah,
                'Keterangan': item.keterangan
            }));

            // Bikin Workbook & Worksheet
            const worksheet = xlsx.utils.json_to_sheet(dataExcel);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Laporan Stok");

            // Generate Buffer
            const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

            // Kirim file ke browser
            res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Stok_Mitrabeton.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (error) {
            console.error(error);
            res.send('Error membuat Excel');
        }
    },
    terbitPOView: async (req, res) => {
        try {
            const db = require('../config/db');

            // 1. Ambil list supplier
            const [suppliers] = await db.query('SELECT * FROM supplier ORDER BY nama_supplier ASC');

            // 2. Ambil list produk
            const [produk] = await db.query('SELECT id, nama_produk FROM produk ORDER BY nama_produk ASC');

            // 3. Ambil riwayat PO
            const [poList] = await db.query(`
                SELECT po.*, s.nama_supplier, pr.nama_produk 
                FROM purchase_order po
                JOIN supplier s ON po.supplier_id = s.id
                JOIN produk pr ON po.produk_id = pr.id
                ORDER BY po.id DESC
            `);

            res.render('gudang/terbitkan-po', {
                namaUser: req.session.nama,
                role: req.session.role,
                listSupplier: suppliers,
                listProduk: produk,
                listPO: poList
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat halaman Permintaan Pembelian.');
        }
    },
    // Proses Simpan Data Permintaan Pembelian
    tambahPOProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const { supplier_id, produk_id, jumlah, keterangan } = req.body;

            await db.query(`
                INSERT INTO purchase_order (supplier_id, produk_id, jumlah, status, keterangan) 
                VALUES (?, ?, ?, 'menunggu', ?)
            `, [supplier_id, produk_id, jumlah, keterangan]);

            // UBAH BARIS INI: Sesuaikan dengan nama rute baru lu
            res.redirect('/gudang/terbitkan-po'); 

        } catch (error) {
            console.error(error);
            res.send('Gagal mengirimkan permintaan pengadaan ke bagian pembelian.');
        }
    },
    // ==========================================
    // MODUL PENERIMAAN BARANG DARI SUPPLIER
    // ==========================================
    
    // 1. Tampilkan halaman penerimaan (Hanya PO yang disetujui / di jalan)
    penerimaanView: async (req, res) => {
        try {
            const db = require('../config/db');
            
            // Tarik data PO yang statusnya 'disetujui' saja
            const [poList] = await db.query(`
                SELECT po.*, s.nama_supplier, pr.nama_produk 
                FROM purchase_order po
                JOIN supplier s ON po.supplier_id = s.id
                JOIN produk pr ON po.produk_id = pr.id
                WHERE po.status = 'disetujui'
                ORDER BY po.tanggal ASC
            `);

            res.render('gudang/penerimaan', {
                namaUser: req.session.nama || 'Tim Gudang',
                role: req.session.role || 'gudang',
                listPO: poList
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat halaman penerimaan barang.');
        }
    },

    // 2. Proses Terima Barang (Update Status PO & Otomatis Tambah Stok)
    terimaBarangProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const poId = req.params.id;

            // A. Ambil data produk_id dan jumlah dari dokumen PO tersebut
            const [poData] = await db.query('SELECT produk_id, jumlah FROM purchase_order WHERE id = ?', [poId]);
            
            if (poData.length === 0) {
                return res.send('Data PO tidak ditemukan.');
            }

            const { produk_id, jumlah } = poData[0];

            // B. Ubah status PO menjadi 'selesai'
            await db.query(`UPDATE purchase_order SET status = 'selesai' WHERE id = ?`, [poId]);

            // C. OTOMATIS: Tambahkan stok di tabel produk
            await db.query(`UPDATE produk SET stok = stok + ? WHERE id = ?`, [jumlah, produk_id]);

            // D. OTOMATIS: Catat ke tabel riwayat_stok biar laporan histori tetap jalan
            const keteranganLog = `Penerimaan fisik barang dari dokumen #PO-MBP-${poId}`;
            await db.query(`
                INSERT INTO riwayat_stok (produk_id, jenis, jumlah, keterangan) 
                VALUES (?, 'masuk', ?, ?)
            `, [produk_id, jumlah, keteranganLog]);

            // Kembali ke halaman penerimaan
            res.redirect('/gudang/penerimaan');
        } catch (error) {
            console.error(error);
            res.send('Gagal memproses penerimaan barang.');
        }
    }
};

module.exports = gudangController;