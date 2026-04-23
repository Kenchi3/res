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
    // ... (โค้ดข้อมูลเมนูเดิมเหมือนเดิม)
    { id: 1, name: "สเต็กเนื้อริบอาย 300g", price: 350, img: "/uploads/steak-default.jpg", category: "🥩 สเต็กสุดพิเศษ" }, 
    // แก้ default img ให้ชี้ไปที่ uploads หรือใช้ url เดิมก็ได้
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
    
    // ถ้ามีการอัพโหลดไฟล์ จะได้ path ที่ req.file
    const imgPath = req.file ? `/uploads/${req.file.filename}` : '';

    const newItem = { 
        id: menuIdCounter++, 
        name, 
        price: parseFloat(price), 
        img: imgPath, 
        category 
    };
    menuItems.push(newItem);
    res.status(201).json(newItem);
});

// 4. API: Edit Menu (รองรับ File Upload)
app.put('/api/menu/:id', upload.single('img'), (req, res) => {
    const id = parseInt(req.params.id);
    const index = menuItems.findIndex(m => m.id === id);
    
    if (index !== -1) {
        const { name, price, category } = req.body;
        
        // ถ้ามีไฟล์ใหม่ส่งมา ให้ใช้ path ใหม่ ถ้าไม่มีให้ใช้ของเก่า
        const imgPath = req.file ? `/uploads/${req.file.filename}` : menuItems[index].img;

        menuItems[index] = { 
            ...menuItems[index], 
            name, 
            price: parseFloat(price), 
            category,
            img: imgPath
        };
        res.json(menuItems[index]);
    } else {
        res.status(404).json({ error: "Not found" });
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