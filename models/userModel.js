const db = require('../config/db');

const UserModel = {
    findByEmail: async (email) => {
        const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        return rows[0]; 
    },
    createUser: async (userData) => {
        const { nama, email, password, role } = userData;
        const [result] = await db.query(
            'INSERT INTO user (nama, email, password, role) VALUES (?, ?, ?, ?)',
            [nama, email, password, role]
        );
        return result;
    },
    // FUNGSI BARU UNTUK ADMIN: Ambil semua data user
    getAllUsers: async () => {
        const [rows] = await db.query('SELECT id, nama, email, role, created_at FROM user ORDER BY created_at DESC');
        return rows;
    },
    // ... (fungsi yang udah ada sebelumnya) ...
    // Ambil data 1 user berdasarkan ID
    getUserById: async (id) => {
        const [rows] = await db.query('SELECT * FROM user WHERE id = ?', [id]);
        return rows[0];
    },

    // Update data user (Kalau password kosong, berarti gak diubah)
    updateUser: async (id, userData) => {
        const { nama, email, role, password } = userData;
        if (password) {
            // Update beserta password baru
            await db.query(
                'UPDATE user SET nama = ?, email = ?, role = ?, password = ? WHERE id = ?',
                [nama, email, role, password, id]
            );
        } else {
            // Update tanpa ganti password
            await db.query(
                'UPDATE user SET nama = ?, email = ?, role = ? WHERE id = ?',
                [nama, email, role, id]
            );
        }
    },

    // Hapus user
    deleteUser: async (id) => {
        await db.query('DELETE FROM user WHERE id = ?', [id]);
    }
};

module.exports = UserModel;