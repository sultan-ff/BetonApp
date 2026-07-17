const KategoriModel = require('../models/kategoriModel');
const ProdukModel = require('../models/produkModel');
const db = require('../config/db');
const ExcelJS = require('exceljs');

const penjualanController = {
    // Tampilkan Dashboard Penjualan
    dashboardView: (req, res) => {
        res.render('penjualan/dashboard', { 
            namaUser: req.session.nama,
            role: req.session.role
        });
    },

    // ==========================================
    // FITUR KELOLA KATEGORI
    // ==========================================
    kategoriView: async (req, res) => {
        try {
            const kategori = await KategoriModel.getAll();
            res.render('penjualan/kategori', {
                namaUser: req.session.nama,
                role: req.session.role,
                kategori: kategori
            });
        } catch (error) {
            console.error(error);
            res.send('Error mengambil data kategori');
        }
    },

    tambahKategoriProcess: async (req, res) => {
        try {
            await KategoriModel.create(req.body.nama_kategori);
            res.redirect('/penjualan/kategori');
        } catch (error) {
            console.error(error);
            res.send('Gagal menambah kategori');
        }
    },

    hapusKategoriProcess: async (req, res) => {
        try {
            await KategoriModel.delete(req.params.id);
            res.redirect('/penjualan/kategori');
        } catch (error) {
            console.error(error);
            res.send('Gagal menghapus kategori');
        }
    },

    produkView: async (req, res) => {
        try {
            const produk = await ProdukModel.getAll();
            res.render('penjualan/produk', {
                namaUser: req.session.nama,
                role: req.session.role,
                produk: produk
            });
        } catch (error) {
            console.error(error);
            res.send('Error mengambil data produk');
        }
    },

    tambahProdukView: async (req, res) => {
        try {
            const kategori = await KategoriModel.getAll();
            res.render('penjualan/tambah-produk', {
                namaUser: req.session.nama,
                role: req.session.role,
                kategori: kategori
            });
        } catch (error) {
            console.error(error);
            res.send('Error memuat form tambah produk');
        }
    },

    editProdukView: async (req, res) => {
        try {
            const db = require('../config/db');
            const produkId = req.params.id;

            const [produkRows] = await db.query('SELECT * FROM produk WHERE id = ?', [produkId]);
            const [kategoriRows] = await db.query('SELECT * FROM kategori');

            if (produkRows.length === 0) {
                return res.send('Produk tidak ditemukan!');
            }

            res.render('penjualan/edit-produk', {
                namaUser: req.session.nama,
                role: req.session.role,
                produk: produkRows[0],
                kategori: kategoriRows
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat halaman edit.');
        }
    },

    updateProdukProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const produkId = req.params.id;
            // TAMBAHAN: Tangkap deskripsi dari form
            const { nama_produk, kategori_id, harga, deskripsi } = req.body;
            
            if (req.file) {
                const fotoBaru = req.file.filename;
                await db.query(
                    'UPDATE produk SET nama_produk = ?, kategori_id = ?, harga = ?, deskripsi = ?, foto = ? WHERE id = ?',
                    [nama_produk, kategori_id, harga, deskripsi, fotoBaru, produkId]
                );
            } else {
                await db.query(
                    'UPDATE produk SET nama_produk = ?, kategori_id = ?, harga = ?, deskripsi = ? WHERE id = ?',
                    [nama_produk, kategori_id, harga, deskripsi, produkId]
                );
            }

            res.redirect('/penjualan/produk');
        } catch (error) {
            console.error(error);
            res.send('Gagal mengupdate produk.');
        }
    },

    tambahProdukProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            // TAMBAHAN: Tangkap deskripsi
            const { kategori_id, nama_produk, harga, deskripsi } = req.body;
            const foto = req.file ? req.file.filename : null; 

            // Pakai direct query biar lebih gampang ngontrolnya
            await db.query(
                'INSERT INTO produk (kategori_id, nama_produk, harga, deskripsi, foto) VALUES (?, ?, ?, ?, ?)',
                [kategori_id, nama_produk, harga, deskripsi, foto]
            );
            
            res.redirect('/penjualan/produk');
        } catch (error) {
            console.error(error);
            res.send('Gagal menambah produk');
        }
    },

    hapusProdukProcess: async (req, res) => {
        try {
            await ProdukModel.delete(req.params.id);
            res.redirect('/penjualan/produk');
        } catch (error) {
            console.error(error);
            res.send('Gagal menghapus produk');
        }
    },

    // 1. DAFTAR PESANAN VIEW (Perbaikan Auto-Cancel)
    daftarPesananView: async (req, res) => {
        try {
            const db = require('../config/db');

            // EKSEKUSI AUTO-CANCEL (Diubah jadi 'ditolak' agar sesuai ENUM DB)
            await db.query(`
                UPDATE pesanan 
                SET status_bayar = 'expired', 
                    status_pesanan = 'ditolak',
                    catatan_admin = 'Sistem Auto-Cancel: Melewati batas pelunasan H-7 pengantaran'
                WHERE metode_pembayaran = 'bayar di kantor' 
                  AND status_bayar = 'pending' 
                  AND status_pesanan NOT IN ('selesai', 'ditolak', 'dikirim')
                  AND NOW() > DATE_SUB(waktu_pengiriman, INTERVAL 7 DAY)
            `);

            const [semuaPesanan] = await db.query(`
                SELECT p.*, u.nama as nama_pelanggan, pr.nama_produk 
                FROM pesanan p
                JOIN user u ON p.user_id = u.id
                JOIN produk pr ON p.produk_id = pr.id
                ORDER BY p.waktu_pengiriman ASC
            `);

            res.render('penjualan/pesanan', {
                namaUser: req.session.nama || 'Tim Penjualan',
                role: req.session.role || 'penjualan',
                pesanan: semuaPesanan
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat data pesanan.');
        }
    },

    // ==========================================
    // MODUL OPERASIONAL ARMADA
    // ==========================================
    
    // Proses Terima Pesanan (Approve) + Potong Stok + OTOMATIS LUNAS MUTLAK
    approvePesananProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const pesananId = req.params.id;

            // 1. Ambil data produk_id dan volume dari pesanan
            const [pesananInfo] = await db.query('SELECT produk_id, volume FROM pesanan WHERE id = ?', [pesananId]);
            
            if (pesananInfo.length > 0) {
                const { produk_id, volume } = pesananInfo[0];
                
                // 2. Cek ketersediaan stok aktual
                const [produkInfo] = await db.query('SELECT stok, nama_produk FROM produk WHERE id = ?', [produk_id]);
                
                if (produkInfo.length > 0) {
                    const currentStok = produkInfo[0].stok;
                    
                    if (currentStok < volume) {
                        return res.send(`
                            <script>
                                alert("GAGAL: Stok ${produkInfo[0].nama_produk} tidak mencukupi!\\nSisa stok di gudang: ${currentStok}\\nVolume dipesan: ${volume}");
                                window.location.href="/penjualan/pesanan";
                            </script>
                        `);
                    }

                    // 3. Potong stok utama di tabel produk
                    await db.query('UPDATE produk SET stok = stok - ? WHERE id = ?', [volume, produk_id]);

                    // 4. Catat Log ke tabel riwayat_stok
                    await db.query(`
                        INSERT INTO riwayat_stok (produk_id, jenis, jumlah, keterangan) 
                        VALUES (?, 'keluar', ?, ?)
                    `, [produk_id, volume, `Pengeluaran otomatis pesanan #INV-${pesananId}`]);
                }
            }

            // 5. OKE FIX SINKRON: Set status_pesanan 'diproses' DAN status_bayar otomatis 'lunas'
            await db.query(`
                UPDATE pesanan 
                SET status_pesanan = 'diproses', 
                    status_bayar = 'lunas' 
                WHERE id = ?
            `, [pesananId]);
            
            res.redirect('/penjualan/pesanan');
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat menyetujui pesanan, memotong stok, dan mencatatkan histori.');
        }
    },

    // Proses Tolak Pesanan (Diubah jadi 'ditolak' agar sesuai ENUM DB)
    rejectPesananProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const pesananId = req.params.id;

            const [pesananInfo] = await db.query('SELECT metode_pembayaran FROM pesanan WHERE id = ?', [pesananId]);
            const metode = pesananInfo[0].metode_pembayaran;

            const statusBayar = (metode === 'transfer') ? 'refund' : 'expired';

            await db.query(`
                UPDATE pesanan 
                SET status_pesanan = 'ditolak', 
                    status_bayar = ?, 
                    catatan_admin = 'Pesanan ditolak oleh Tim Penjualan. Menunggu proses selanjutnya.' 
                WHERE id = ?
            `, [statusBayar, pesananId]);
            
            res.redirect('/penjualan/pesanan');
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat menolak pesanan.');
        }
    },

    // Proses Upload Bukti Refund
    uploadRefundProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const pesananId = req.body.pesanan_id;
            const file_refund = req.file ? req.file.filename : null;

            if (file_refund) {
                await db.query('UPDATE pesanan SET bukti_refund = ? WHERE id = ?', [file_refund, pesananId]);
            }
            res.redirect('/penjualan/detail-pesanan/' + pesananId);
        } catch (error) {
            console.error(error);
            res.send('Gagal mengunggah bukti refund.');
        }
    },

    // Tampilkan Daftar Armada
    trukView: async (req, res) => {
        try {
            const db = require('../config/db');
            const [armada] = await db.query('SELECT * FROM armada ORDER BY id DESC');
            
            res.render('penjualan/truk', {
                namaUser: req.session.nama,
                role: req.session.role,
                armada: armada
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat data armada.');
        }
    },

    // Tampilkan Form Tambah Armada
    trukView: async (req, res) => {
        try {
            const db = require('../config/db');
            const [armada] = await db.query('SELECT * FROM armada ORDER BY id DESC');
            
            res.render('penjualan/truk', {
                namaUser: req.session.nama,
                role: req.session.role,
                armada: armada
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat data armada.');
        }
    },

    tambahTrukView: (req, res) => {
        res.render('penjualan/tambah-armada', { 
            namaUser: req.session.nama,
            role: req.session.role
        });
    },

    tambahTrukProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const { plat_nomor, kapasitas, nama_driver, status_kendaraan } = req.body;
            
            await db.query(
                'INSERT INTO armada (plat_nomor, kapasitas, nama_driver, status_kendaraan) VALUES (?, ?, ?, ?)',
                [plat_nomor, kapasitas, nama_driver, status_kendaraan || 'tersedia']
            );
            
            res.redirect('/penjualan/truk');
        } catch (error) {
            console.error(error);
            res.send('Gagal menyimpan armada baru.');
        }
    },

    editTrukView: async (req, res) => {
        try {
            const db = require('../config/db');
            const idArmada = req.params.id;
            
            const [armadaRows] = await db.query('SELECT * FROM armada WHERE id = ?', [idArmada]);
            
            if (armadaRows.length === 0) {
                return res.send('Data armada tidak ditemukan!');
            }

            res.render('penjualan/edit-armada', { 
                namaUser: req.session.nama,
                role: req.session.role,
                truk: armadaRows[0]
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat form edit armada.');
        }
    },

    updateTrukProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const idArmada = req.params.id;
            const { plat_nomor, kapasitas, nama_driver, status_kendaraan } = req.body;
            
            await db.query(
                'UPDATE armada SET plat_nomor = ?, kapasitas = ?, nama_driver = ?, status_kendaraan = ? WHERE id = ?',
                [plat_nomor, kapasitas, nama_driver, status_kendaraan, idArmada]
            );
            
            res.redirect('/penjualan/truk');
        } catch (error) {
            console.error(error);
            res.send('Gagal memperbarui data armada.');
        }
    },

    hapusTrukProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const idArmada = req.params.id;
            
            await db.query('DELETE FROM armada WHERE id = ?', [idArmada]);
            
            res.redirect('/penjualan/truk');
        } catch (error) {
            console.error(error);
            res.send('Gagal menghapus data armada.');
        }
    },

    // ==========================================
    // MODUL MANAJEMEN PENGIRIMAN
    // ==========================================
    pengirimanView: async (req, res) => {
        try {
            const db = require('../config/db');

            const [antrean] = await db.query(`
                SELECT p.id, u.nama AS pelanggan, pr.nama_produk, p.volume 
                FROM pesanan p 
                JOIN user u ON p.user_id = u.id 
                JOIN produk pr ON p.produk_id = pr.id 
                WHERE p.status_pesanan = 'diproses'
            `);

            const [trucks] = await db.query(`
                SELECT id, plat_nomor AS no_polisi, kapasitas, nama_driver AS sopir 
                FROM armada 
                WHERE status_kendaraan = 'tersedia'
            `);

            const [sedangJalan] = await db.query(`
                SELECT p.id, u.nama AS pelanggan, p.alamat_pengiriman AS alamat_kirim, 
                       a.plat_nomor AS no_polisi, a.nama_driver AS sopir, a.id AS id_truk 
                FROM pesanan p 
                JOIN user u ON p.user_id = u.id 
                JOIN armada a ON FIND_IN_SET(a.id, p.armada_id)
                WHERE p.status_pesanan = 'dikirim'
            `);

            const [riwayatSelesai] = await db.query(`
                SELECT p.id, u.nama AS pelanggan, pr.nama_produk, a.plat_nomor AS no_polisi 
                FROM pesanan p 
                JOIN user u ON p.user_id = u.id 
                JOIN armada a ON FIND_IN_SET(a.id, p.armada_id)
                JOIN produk pr ON p.produk_id = pr.id
                WHERE p.status_pesanan = 'selesai' 
                ORDER BY p.id DESC LIMIT 20
            `);

            res.render('penjualan/pengiriman', {
                namaUser: req.session.nama,
                role: req.session.role,
                antrean: antrean,
                trucks: trucks,
                sedangJalan: sedangJalan,
                riwayatSelesai: riwayatSelesai
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat dashboard pengiriman.');
        }
    },

    kirimPesananProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const { id_pesanan, id_truk } = req.body;

            const armadaArray = Array.isArray(id_truk) ? id_truk : [id_truk];
            const armadaString = armadaArray.join(',');

            await db.query(`UPDATE pesanan SET status_pesanan = 'dikirim', armada_id = ? WHERE id = ?`, [armadaString, id_pesanan]);
            await db.query(`UPDATE armada SET status_kendaraan = 'beroperasi' WHERE id IN (?)`, [armadaArray]);

            res.redirect('/penjualan/pengiriman');
        } catch (error) {
            console.error(error);
            res.send('Gagal memproses penugasan pengiriman.');
        }
    },

    selesaiPesananProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const { id_pesanan } = req.body;

            const [pesananInfo] = await db.query('SELECT armada_id FROM pesanan WHERE id = ?', [id_pesanan]);
            
            if (pesananInfo.length > 0 && pesananInfo[0].armada_id) {
                const trukYangKembali = pesananInfo[0].armada_id.split(',');
                await db.query(`UPDATE armada SET status_kendaraan = 'tersedia' WHERE id IN (?)`, [trukYangKembali]);
            }

            await db.query(`UPDATE pesanan SET status_pesanan = 'selesai' WHERE id = ?`, [id_pesanan]);

            res.redirect('/penjualan/pengiriman');
        } catch (error) {
            console.error(error);
            res.send('Gagal menyelesaikan pengiriman.');
        }
    },
    // Method untuk menampilkan/mencetak Laporan Pengiriman
    // 1. Fungsi Cetak Kertas (PDF/Print) - KUERI SUDAH DIPERBAIKI
    cetakLaporanPengiriman: async (req, res) => {
        try {
            // Kueri Super Bersih (Murni dari tabel pesanan)
            const query = `
                SELECT 
                    p.id, 
                    u.nama AS pelanggan, 
                    pr.nama_produk, 
                    COALESCE(a.plat_nomor, 'Truk Tidak Diketahui/Selesai') AS no_polisi, 
                    p.tanggal_pesan AS waktu_pengiriman
                FROM pesanan p
                LEFT JOIN user u ON p.user_id = u.id
                LEFT JOIN produk pr ON p.produk_id = pr.id
                LEFT JOIN armada a ON p.armada_id = a.id
                WHERE p.status_pesanan = 'selesai' 
                   OR p.status_pesanan = 'terkirim'
                GROUP BY p.id
                ORDER BY p.id DESC
            `;

            const [riwayatSelesai] = await db.query(query);

            const options = { day: 'numeric', month: 'long', year: 'numeric' };
            const tanggalCetak = new Date().toLocaleDateString('id-ID', options);

            res.render('penjualan/cetak-pengiriman', {
                namaUser: req.session.nama || 'Tim Penjualan',
                tanggalCetak: tanggalCetak,
                riwayatSelesai: riwayatSelesai
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error memuat laporan.");
        }
    },

    cetakExcelPengiriman: async (req, res) => {
        try {
            // Kueri Super Bersih (Murni dari tabel pesanan)
            const query = `
                SELECT 
                    p.id, 
                    u.nama AS pelanggan, 
                    pr.nama_produk, 
                    COALESCE(a.plat_nomor, 'Truk Tidak Diketahui/Selesai') AS no_polisi, 
                    p.tanggal_pesan AS waktu_pengiriman 
                FROM pesanan p
                LEFT JOIN user u ON p.user_id = u.id
                LEFT JOIN produk pr ON p.produk_id = pr.id
                LEFT JOIN armada a ON p.armada_id = a.id
                WHERE p.status_pesanan = 'selesai' 
                   OR p.status_pesanan = 'terkirim'
                GROUP BY p.id
                ORDER BY p.id DESC
            `;

            const [riwayatSelesai] = await db.query(query);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Laporan Pengiriman');

            worksheet.columns = [
                { header: 'No', key: 'no', width: 5 },
                { header: 'ID Pesanan', key: 'id', width: 15 },
                { header: 'Nama Pelanggan', key: 'pelanggan', width: 30 },
                { header: 'Mutu Beton', key: 'produk', width: 25 },
                { header: 'Armada (Plat)', key: 'nopol', width: 20 },
                { header: 'Status', key: 'status', width: 15 }
            ];

            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14532D' } };

            riwayatSelesai.forEach((item, index) => {
                worksheet.addRow({
                    no: index + 1,
                    id: `INV-${item.id}`,
                    pelanggan: item.pelanggan,
                    produk: item.nama_produk,
                    nopol: item.no_polisi,
                    status: 'TERKIRIM'
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Laporan_Pengiriman_MBP.xlsx');

            await workbook.xlsx.write(res);
            res.end();
            
        } catch (error) {
            console.error(error);
            res.status(500).send("Gagal mengunduh Excel.");
        }
    },
    cetakSuratJalan: async (req, res) => {
        try {
            const db = require('../config/db');
            const pesananId = req.params.id_pesanan;
            const trukId = req.params.id_truk;

            const [suratData] = await db.query(`
                SELECT 
                    p.id, p.tanggal_pesan AS tgl_pesan, p.volume, p.alamat_pengiriman AS alamat_kirim, p.nomor_telepon,
                    u.nama AS pelanggan, 
                    pr.nama_produk, 
                    a.plat_nomor AS no_polisi, a.nama_driver AS sopir
                FROM pesanan p
                JOIN user u ON p.user_id = u.id
                JOIN produk pr ON p.produk_id = pr.id
                JOIN armada a ON a.id = ?
                WHERE p.id = ?
            `, [trukId, pesananId]);

            if (suratData.length === 0) {
                return res.send('Data Surat Jalan tidak ditemukan.');
            }

            res.render('penjualan/surat-jalan', {
                namaUser: req.session.nama,
                data: suratData[0]
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat Surat Jalan.');
        }
    },

    // Halaman Detail Pesanan (Khusus Penjualan)
    detailPesananView: async (req, res) => {
        try {
            const db = require('../config/db');
            const pesananId = req.params.id;

            const [rows] = await db.query(`
                SELECT p.*, u.nama as nama_pelanggan, pr.nama_produk 
                FROM pesanan p
                JOIN user u ON p.user_id = u.id
                JOIN produk pr ON p.produk_id = pr.id
                WHERE p.id = ?
            `, [pesananId]);

            if (rows.length === 0) {
                return res.send('Data pesanan tidak ditemukan.');
            }

            res.render('penjualan/detail-pesanan', {
                namaUser: req.session.nama || 'Tim Penjualan',
                role: req.session.role || 'penjualan',
                pesanan: rows[0]
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat detail pesanan.');
        }
    },

    // Simpan Catatan dari Detail Pesanan (Guard Logika Backend)
    updatePesananProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const pesananId = req.params.id;
            
            let { status_bayar, status_pesanan, catatan_admin } = req.body;

            // FIX SINKRONISASI ENUM: Ubah kata 'dibatalkan' menjadi 'ditolak' agar tidak crash di database
            if (status_bayar === 'pending') {
                status_pesanan = 'menunggu_konfirmasi'; 
            } 
            else if (status_bayar === 'lunas' && status_pesanan === 'menunggu_konfirmasi') {
                status_pesanan = 'diproses'; 
            } 
            else if ((status_bayar === 'expired' || status_bayar === 'refund') && status_pesanan !== 'selesai') {
                status_pesanan = 'ditolak'; // <- FIX ENUM DI SINI
            }

            await db.query(`
                UPDATE pesanan 
                SET status_bayar = ?, status_pesanan = ?, catatan_admin = ?
                WHERE id = ?
            `, [status_bayar, status_pesanan, catatan_admin, pesananId]);

            res.redirect('/penjualan/detail-pesanan/' + pesananId);
        } catch (error) {
            console.error(error);
            res.send('Gagal mengupdate status pesanan.');
        }
    },
    // ... (fungsi updatePesananProcess lu di atas),

    // 1. Menampilkan halaman Kelola Bank
    // ... (fungsi-fungsi penjualan lu sebelumnya),

    // 1. Menampilkan Halaman Kelola Bank
    getKelolaBank: async (req, res) => {
        try {
            const db = require('../config/db');
            // Ambil semua data bank untuk ditampilkan di tabel admin
            const [banks] = await db.query("SELECT * FROM rekening_bank ORDER BY id DESC");
            
            res.render('penjualan/kelola_bank', { 
                banks: banks,
                role: req.session.role,
                namaUser: req.session.nama // sesuaikan nama session lu
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat data bank.');
        }
    },

    // 2. Proses Tambah Bank Baru
    addBank: async (req, res) => {
        try {
            const db = require('../config/db');
            const { nama_bank, nomor_rekening, nama_pemilik } = req.body;
            
            await db.query(`
                INSERT INTO rekening_bank (nama_bank, nomor_rekening, nama_pemilik) 
                VALUES (?, ?, ?)
            `, [nama_bank, nomor_rekening, nama_pemilik]);
            
            res.redirect('/penjualan/bank');
        } catch (error) {
            console.error(error);
            res.send('Gagal menyimpan data bank.');
        }
    },

    // 3. Proses Hapus Bank
    deleteBank: async (req, res) => {
        try {
            const db = require('../config/db');
            const bankId = req.params.id;
            
            await db.query('DELETE FROM rekening_bank WHERE id = ?', [bankId]);
            
            res.redirect('/penjualan/bank');
        } catch (error) {
            console.error(error);
            res.send('Gagal menghapus data bank.');
        }
    },
};

module.exports = penjualanController;