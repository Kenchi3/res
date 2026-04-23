const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json()); // สำหรับอ่านข้อมูล JSON จาก Request
app.use(express.static(path.join(__dirname, 'public'))); // ให้บริการไฟล์ในโฟลเดอร์ public

// --- ตัวแปรเก็บข้อมูล (Mock Database) ---
let orders = [];
let orderIdCounter = 1001;

// --- Routes (การกำหนดเส้นทาง URL) ---

// 1. หน้าแรก -> ส่งไปหน้าเมนูทั่วไป
app.get('/', (req, res) => {
    res.redirect('/menu');
});

// 2. หน้าเมนูทั่วไป (URL: /menu)
app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/menu.html'));
});

// 3. หน้าแอดมิน (URL: /admin) - ไม่ต้องมี .html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// 4. หน้าเมนูสำหรับแต่ละโต๊ะ (URL: /table/5)
app.get('/table/:tableId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/menu.html'));
});

// --- API Endpoints ---

// 5. ดึงข้อมูลออเดอร์ทั้งหมด (สำหรับหน้าแอดมินโหลดข้อมูลเก่า)
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// 6. รับออเดอร์ใหม่จากลูกค้า
app.post('/api/order', (req, res) => {
    const orderData = req.body;

    // สร้าง Object ออเดอร์ใหม่
    const newOrder = {
        id: orderIdCounter++,
        tableNo: orderData.tableNo || "ไม่ระบุโต๊ะ",
        items: orderData.items,
        totalPrice: orderData.totalPrice,
        status: 'new', // สถานะเริ่มต้น (new, cooking, done)
        time: new Date().toLocaleTimeString('th-TH')
    };

    // บันทึกลงฐานข้อมูลชั่วคราว
    orders.push(newOrder);

    console.log(`✅ ได้รับออเดอร์ใหม่ #${newOrder.id} จากโต๊ะ ${newOrder.tableNo}`);

    // ** ส่ง Event 'new_order' ไปหาหน้า Admin ผ่าน Socket.io **
    io.emit('new_order', newOrder);

    // ตอบกลับลูกค้าว่าสำเร็จ
    res.status(201).json({ success: true, order: newOrder });
});

// --- Socket.io Connection ---
io.on('connection', (socket) => {
    console.log('📡 มีผู้ใช้เชื่อมต่อ (Admin หรือ ลูกค้า)');
    
    socket.on('disconnect', () => {
        // console.log('User disconnected');
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`   - หน้าลูกค้า: http://localhost:${PORT}/table/1`);
    console.log(`   - หน้าแอดมิน: http://localhost:${PORT}/admin`);
});