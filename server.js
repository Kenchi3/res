const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer'); // 1. Import Multer
const fs = require('fs'); // สำหรับตรวจสอบโฟลเดอร์

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 2. ตั้งค่า Multer (Storage Engine)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public/uploads');
        // สร้างโฟลเดอร์ถ้ายังไม่มี
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir); // บอกว่าเก็บไฟล์ที่ public/uploads
    },
    filename: function (req, file, cb) {
        // ตั้งชื่อไฟล์ใหม่ให้ไม่ซ้ำกัน (timestamp + original name)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATA STORAGE ---
let orders = [];
let orderIdCounter = 1001;
let menuItems = [
    { id: 1, name: "สเต็กเนื้อริบอาย 300g", price: 350, img: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400", category: "🥩 สเต็กสุดพิเศษ", status: 'available' },
    { id: 2, name: "สเต็กทีโบน", price: 450, img: "https://images.unsplash.com/photo-1558030006-450675393462?w=400", category: "🥩 สเต็กสุดพิเศษ", status: 'available' },
    { id: 3, name: "สเต็กพอร์กชอป", price: 220, img: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400", category: "🥩 สเต็กสุดพิเศษ", status: 'available' },
    { id: 4, name: "เฟรนช์ฟรายส์", price: 79, img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400", category: "🍟 ของทานเล่น", status: 'available' },
    { id: 5, name: "ซุปเห็ดทรัฟเฟิล", price: 120, img: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400", category: "🍟 ของทานเล่น", status: 'available' },
    { id: 6, name: "สลัดซีซาร์", price: 99, img: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400", category: "🍟 ของทานเล่น", status: 'available' },
    { id: 7, name: "เซ็ตริบอาย", price: 450, img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400", category: "🍽️ เซ็ตมื้อใหญ่", status: 'available' },
    { id: 8, name: "เซ็ตคู่รัก", price: 799, img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400", category: "🍽️ เซ็ตมื้อใหญ่", status: 'available' }
];
let menuIdCounter = 9;

// --- ROUTES ---
app.get('/', (req, res) => res.redirect('/menu'));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/table/:tableId', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor/menumanage', (req, res) => res.sendFile(path.join(__dirname, 'public/menuManager.html')));

// --- API --

// Orders
app.get('/api/orders', (req, res) => res.json(orders));
app.delete('/api/orders', (req, res) => {
    orders = [];
    io.emit('orders_cleared');
    res.json({ success: true });
});
app.post('/api/order', (req, res) => {
    const newOrder = { id: orderIdCounter++, ...req.body, status: 'new', time: new Date().toLocaleTimeString('th-TH') };
    orders.push(newOrder);
    io.emit('new_order', newOrder);
    res.status(201).json(newOrder);
});

// Menu API
app.get('/api/menu', (req, res) => res.json(menuItems));

// 3. API: Add Menu (รองรับ File Upload)
// 'img' คือ name ของ input file ใน form
app.post('/api/menu', upload.single('img'), (req, res) => {
    const { name, price, category } = req.body;
    const imgPath = req.file ? `/uploads/${req.file.filename}` : '';

    const newItem = { 
        id: menuIdCounter++, 
        name, 
        price: parseFloat(price), 
        img: imgPath, 
        category,
        status: 'available' // <--- เพิ่มบรรทัดนี้
    };
    menuItems.push(newItem);
    res.status(201).json(newItem);
});

// 4. API: Edit Menu (รองรับ File Upload)
app.put('/api/menu/:id', upload.single('img'), (req, res) => {
    const id = parseInt(req.params.id);
    const index = menuItems.findIndex(m => m.id === id);
    
    if (index !== -1) {
        // แก้ไข: ดึง status ออกมาจาก req.body ด้วย
        const { name, price, category, status } = req.body;
        
        const imgPath = req.file ? `/uploads/${req.file.filename}` : menuItems[index].img;

        menuItems[index] = { 
            ...menuItems[index], 
            name, 
            price: parseFloat(price), 
            category,
            img: imgPath,
            status: status || menuItems[index].status // เพิ่ม: อัพเดท status ถ้ามีการส่งมา
        };
        res.json(menuItems[index]);
    } else {
        res.status(404).json({ error: "Not found" });
    }
});

// API: Update Order (สำหรับลบรายการอาหารออก)
app.put('/api/orders/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { items } = req.body; // รับรายการ items ใหม่ที่ลบแล้ว
    const orderIndex = orders.findIndex(o => o.id === id);

    if (orderIndex !== -1) {
        // คำนวณราคาใหม่
        const newTotalPrice = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

        orders[orderIndex].items = items;
        orders[orderIndex].totalPrice = newTotalPrice;

        // ถ้า items หมดแล้ว ให้ลบออเดอร์นั้นทิ้งเลย (Optional)
        if (items.length === 0) {
            orders = orders.filter(o => o.id !== id);
            res.json({ success: true, deleted: true });
        } else {
            res.json(orders[orderIndex]);
        }
    } else {
        res.status(404).json({ error: "Order not found" });
    }
});

app.delete('/api/menu/:id', (req, res) => {
    const id = parseInt(req.params.id);
    menuItems = menuItems.filter(m => m.id !== id);
    res.json({ success: true });
});

// --- SOCKET ---
io.on('connection', (socket) => { console.log('User connected'); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));