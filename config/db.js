const mysql = require('mysql2');

// Buat koneksi pool yang dinamis (bisa untuk Lokal XAMPP maupun Hosting Railway)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_readymix',
    port: process.env.DB_PORT || 3306 // Wajib ditambahin port, karena Railway pakai port khusus
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Koneksi ke database gagal: ', err.message);
    } else {
        console.log('Berhasil konek ke MySQL database!');
        connection.release();
    }
});

module.exports = db.promise(); // Pakai promise biar bisa pakai async/await nanti