const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const authController = {
    // Menampilkan halaman form Login & Register (Render UI EJS)
    loginView: (req, res) => {
        res.render('auth/login'); // Nanti kita bikin file login.ejs
    },
    registerView: (req, res) => {
        res.render('auth/register'); // Nanti kita bikin file register.ejs
    },

    // LOGIC REGISTER (Khusus Pendaftar Pelanggan Baru)
    // Proses Pendaftaran Akun (Register)
    registerProcess: async (req, res) => {
        try {
            const { nama, email, no_telp, password, konfirmasi_password } = req.body;
            const db = require('../config/db');

            if (password !== konfirmasi_password) {
                return res.render('auth/register', { error: 'Password dan Konfirmasi Password tidak cocok!' });
            }

            const [existingUser] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                return res.render('auth/register', { error: 'Email sudah terdaftar! Silakan Log in.' });
            }

            // KUNCI FIX: Enkripsi password pakai bcrypt sebelum disimpan!
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Simpan password yang sudah di-hash (hashedPassword)
            await db.query(
                'INSERT INTO user (nama, email, no_telp, password, role) VALUES (?, ?, ?, ?, ?)', 
                [nama, email, no_hp, hashedPassword, 'pelanggan']
            );

            res.render('auth/login', { error: null, success: 'Pendaftaran berhasil! Silakan Log in.' });

        } catch (error) {
            console.error(error);
            res.render('auth/register', { error: 'Terjadi kesalahan sistem.' });
        }
    },
    // LOGIC LOGIN (Mengarahkan ke 5 Role Berbeda)
    loginProcess: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Asumsi lu pakai UserModel seperti kodingan lu
            const user = await UserModel.findByEmail(email);
            if (!user) {
                // UPDATE: Ganti res.send jadi res.render
                return res.render('auth/login', { error: 'Email atau Password salah!', success: null });
            }

            // Cocokkan password pakai bcrypt
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                // UPDATE: Ganti res.send jadi res.render
                return res.render('auth/login', { error: 'Email atau Password salah!', success: null });
            }

            // Jika benar, simpan data ke dalam session
            req.session.userId = user.id;
            req.session.role = user.role;
            req.session.nama = user.nama;

            // Pastikan session tersimpan sebelum redirect
            req.session.save((err) => {
                if (err) throw err;
                
                // REDIRECT BERDASARKAN ROLE
                switch (user.role) {
                    case 'admin': return res.redirect('/admin/dashboard');
                    case 'pelanggan': return res.redirect('/pelanggan/katalog');
                    case 'penjualan': return res.redirect('/penjualan/dashboard');
                    case 'gudang': return res.redirect('/gudang/dashboard');
                    case 'pembelian': return res.redirect('/pembelian/dashboard');
                    default: return res.redirect('/auth/login');
                }
            });

        } catch (error) {
            console.error(error);
            res.render('auth/login', { error: 'Terjadi kesalahan sistem.', success: null });
        }
    },
    lupaPasswordView: (req, res) => {
        res.render('auth/lupa-password', { error: null }); 
        // Sesuaikan 'lupa-password' dengan letak file ejs lu, misal 'auth/lupa-password'
    },
    // 1. Proses Mengirim Email Link Reset
    lupaPasswordProcess: async (req, res) => {
        try {
            const email = req.body.email.trim();
            const db = require('../config/db');

            const [users] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.render('auth/lupa-password', { error: 'Email tidak terdaftar di sistem.' });
            }

            // Bikin token acak yang unik (40 karakter hex)
            const token = crypto.randomBytes(20).toString('hex');

            // Simpan token ke database, set kadaluarsa 1 jam dari sekarang (pakai MySQL syntax)
            await db.query(
                'UPDATE user SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE email = ?',
                [token, email]
            );

            // KONFIGURASI PENGIRIM EMAIL (Ganti dengan Email & App Password Gmail lu)
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'ersaadifirmansyah70@gmail.com', // Ganti dengan email aktif kamu
                    pass: 'htts vfue znhs heim'       // Ganti App Password Gmail lu
                }
            });

            // Ganti localhost:3000 sesuai port yang lu pakai
            const resetLink = `http://localhost:3000/reset-password/${token}`;

            const mailOptions = {
                from: '"BetonApp MBP" <email.lu@gmail.com>',
                to: email,
                subject: 'Reset Password Akun BetonApp',
                html: `
                    <h3>Halo, ${users[0].nama}</h3>
                    <p>Anda menerima email ini karena ada permintaan reset password untuk akun Anda.</p>
                    <p>Silakan klik tombol di bawah ini untuk membuat password baru (Link ini berlaku selama 1 jam):</p>
                    <a href="${resetLink}" style="background-color: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password Sekarang</a>
                    <br><br>
                    <p>Jika Anda tidak meminta reset password, abaikan saja email ini.</p>
                `
            };

            await transporter.sendMail(mailOptions);

            // Kembali ke halaman login dengan pesan sukses (ingat pakai 'auth/login' jika file dalam folder auth)
            res.render('auth/login', { error: null, success: 'Link reset password telah dikirim ke email Anda. Silakan cek Inbox atau Spam.' });

        } catch (error) {
            console.error(error);
            res.render('auth/lupa-password', { error: 'Gagal mengirim email. Silakan coba lagi.' });
        }
    },

    // 2. Menampilkan Halaman Form Password Baru (Jika link diklik)
    resetPasswordView: async (req, res) => {
        try {
            const db = require('../config/db');
            const token = req.params.token;

            // Cek apakah token ada dan belum kadaluarsa
            const [users] = await db.query(
                'SELECT * FROM user WHERE reset_token = ? AND reset_token_expires > NOW()',
                [token]
            );

            if (users.length === 0) {
                return res.render('auth/lupa-password', { error: 'Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.' });
            }

            // Jika token valid, tampilkan halaman form
            res.render('auth/reset-password', { token: token, error: null });

        } catch (error) {
            console.error(error);
            res.render('auth/lupa-password', { error: 'Terjadi kesalahan sistem.' });
        }
    },

    // 3. Proses Simpan Password Baru
    resetPasswordProcess: async (req, res) => {
        try {
            const db = require('../config/db');
            const token = req.params.token;
            const { password, konfirmasi_password } = req.body;

            if (password !== konfirmasi_password) {
                return res.render('auth/reset-password', { token: token, error: 'Password dan konfirmasi tidak cocok!' });
            }

            // Cari user berdasarkan token yang masih berlaku
            const [users] = await db.query(
                'SELECT email FROM user WHERE reset_token = ? AND reset_token_expires > NOW()',
                [token]
            );

            if (users.length === 0) {
                return res.render('auth/lupa-password', { error: 'Link reset password sudah kadaluarsa.' });
            }

            // Enkripsi password baru
            const hashedPassword = await bcrypt.hash(password, 10);

            // Update password dan KOSONGKAN token (biar gak bisa dipakai 2 kali)
            await db.query(
                'UPDATE user SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?',
                [hashedPassword, users[0].email]
            );

            res.render('auth/login', { error: null, success: 'Password berhasil diubah! Silakan Log in.' });

        } catch (error) {
            console.error(error);
            res.render('auth/reset-password', { token: req.params.token, error: 'Gagal menyimpan password baru.' });
        }
    },

    // LOGIC LOGOUT
    logout: (req, res) => {
        req.session.destroy(); // Hapus session
        res.redirect('/login');
    }
};

module.exports = authController;
