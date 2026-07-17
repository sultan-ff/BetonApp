const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs'); // Tambahin ini biar bisa nge-hash password

const adminController = {
    dashboardView: (req, res) => {
        res.render('admin/dashboard', { 
            namaUser: req.session.nama,
            role: req.session.role
        });
    },

    kelolaUserView: async (req, res) => {
        try {
            const users = await UserModel.getAllUsers();
            res.render('admin/users', {
                namaUser: req.session.nama,
                role: req.session.role,
                users: users
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat mengambil data user.');
        }
    },

    // FUNGSI BARU 1: Nampilin form tambah user
    tambahUserView: (req, res) => {
        res.render('admin/tambah-user', {
            namaUser: req.session.nama,
            role: req.session.role
        });
    },

    // FUNGSI BARU 2: Proses nyimpen data ke database
    tambahUserProcess: async (req, res) => {
        try {
            const { nama, email, password, role } = req.body;
            
            // Cek apakah email udah dipakai
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.send('<script>alert("Email sudah terdaftar!"); window.location.href="/admin/users/tambah";</script>');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Simpan ke database
            await UserModel.createUser({
                nama,
                email,
                password: hashedPassword,
                role
            });

            // Kalau sukses, balikin ke halaman tabel user
            res.redirect('/admin/users');
        } catch (error) {
            console.error(error);
            res.send('Gagal menambahkan user baru.');
        }
    }, // <--- NAH, KOMANYA KETINGGALAN DI SINI TADI BRO

    // Nampilin form Edit User
    editUserView: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await UserModel.getUserById(userId);
            
            if (!user) return res.send('User tidak ditemukan');

            res.render('admin/edit-user', {
                namaUser: req.session.nama,
                role: req.session.role,
                userData: user // Kirim data user lama buat ditampilin di form
            });
        } catch (error) {
            console.error(error);
            res.send('Terjadi kesalahan saat memuat form edit.');
        }
    },

    // Proses simpan hasil Edit
    editUserProcess: async (req, res) => {
        try {
            const userId = req.params.id;
            const { nama, email, role, password } = req.body;
            let hashedPassword = null;

            // Kalau admin ngisi password baru di form, kita hash
            if (password && password.trim() !== "") {
                hashedPassword = await bcrypt.hash(password, 10);
            }

            await UserModel.updateUser(userId, {
                nama,
                email,
                role,
                password: hashedPassword
            });

            res.redirect('/admin/users');
        } catch (error) {
            console.error(error);
            res.send('Gagal mengupdate data user.');
        }
    },

    // Proses Hapus User
    deleteUserProcess: async (req, res) => {
        try {
            const userId = req.params.id;
            
            // Opsional: Cegah admin ngehapus dirinya sendiri yang lagi login
            if (userId == req.session.userId) {
                return res.send('<script>alert("Lu gak bisa hapus akun lu sendiri bro!"); window.location.href="/admin/users";</script>');
            }

            await UserModel.deleteUser(userId);
            res.redirect('/admin/users');
        } catch (error) {
            console.error(error);
            res.send('Gagal menghapus user.');
        }
    }
};

module.exports = adminController;