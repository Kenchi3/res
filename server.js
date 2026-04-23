const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config(); // โหลดค่าจาก .env

// --- Database Setup ---
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Schema Definitions ---

// Schema สำหรับเมนู
const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  img: String,
  category: String,
  status: { type: String, default: 'available' } // available, unavailable
});

// Virtual: ทำให้ frontend เรียก .id ได้ (แทนที่จะเป็น ._id)
menuSchema.set('toJSON', { virtuals: true });
const Menu = mongoose.model('Menu', menuSchema);

// Schema สำหรับออเดอร์
const orderSchema = new mongoose.Schema({
  tableNo: String,
  items: [{
    id: Number, // id ของเมนู
    name: String,
    price: Number,
    qty: Number
  }],
  totalPrice: Number,
  status: { type: String, default: 'new' }, // new, cooking, done, paid
  time: String, // เวลาแบบสั้น
  createdAt: { type: Date, default: Date.now } // เวลาแบบเต็มสำหรับสถิติ
});
orderSchema.set('toJSON', { virtuals: true });
const Order = mongoose.model('Order', orderSchema);

// --- App Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES ---
app.get('/', (req, res) => res.redirect('/menu'));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/table/:tableId', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor/menumanage', (req, res) => res.sendFile(path.join(__dirname, 'public/menuManager.html')));
app.get('/admin03030853khunnor/statistics', (req, res) => res.sendFile(path.join(__dirname, 'public/statistics.html')));

// --- API: MENU ---

// GET Menu (ตรวจสอบถ้า DB ว่างให้ใส่ข้อมูล Default)
app.get('/api/menu', async (req, res) => {
    let menus = await Menu.find();
    if (menus.length === 0) {
        const defaultMenus = [
            { name: "สเต็กเนื้อริบอาย 300g", price: 350, img: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400", category: "🥩 สเต็กสุดพิเศษ", status: 'available' },
            { name: "สเต็กทีโบน", price: 450, img: "https://images.unsplash.com/photo-1558030006-450675393462?w=400", category: "🥩 สเต็กสุดพิเศษ", status: 'available' },
            { name: "สเต็กพอร์กชอป", price: 220, img: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400", category: "🥩 สเต็กสุดพิเศษ", status: 'available' },
            { name: "เฟรนช์ฟรายส์", price: 79, img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400", category: "🍟 ของทานเล่น", status: 'available' },
            { name: "ซุปเห็ดทรัฟเฟิล", price: 120, img: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400", category: "🍟 ของทานเล่น", status: 'available' },
            { name: "สลัดซีซาร์", price: 99, img: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400", category: "🍟 ของทานเล่น", status: 'available' },
            { name: "เซ็ตริบอย", price: 450, img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400", category: "🍽️ เซ็ตมื้อใหญ่", status: 'available' },
            { name: "เซ็ตคู่รัก", price: 799, img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400", category: "🍽️ เซ็ตมื้อใหญ่", status: 'available' }
        ];
        menus = await Menu.insertMany(defaultMenus);
    }
    res.json(menus);
});

// POST Menu
app.post('/api/menu', upload.single('img'), async (req, res) => {
    const { name, price, category } = req.body;
    const imgPath = req.file ? `/uploads/${req.file.filename}` : '';
    const newItem = new Menu({ name, price: parseFloat(price), img: imgPath, category, status: 'available' });
    await newItem.save();
    res.status(201).json(newItem);
});

// PUT Menu
app.put('/api/menu/:id', upload.single('img'), async (req, res) => {
    const { id } = req.params;
    const { name, price, category, status } = req.body;
    const item = await Menu.findById(id);
    if (!item) return res.status(404).json({ error: "Not found" });

    item.name = name || item.name;
    item.price = price || item.price;
    item.category = category || item.category;
    item.status = status || item.status;
    if (req.file) item.img = `/uploads/${req.file.filename}`;
    
    await item.save();
    res.json(item);
});

// DELETE Menu
app.delete('/api/menu/:id', async (req, res) => {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- API: ORDERS ---

// GET Orders
app.get('/api/orders', async (req, res) => {
    const orders = await Order.find();
    res.json(orders);
});

// POST Order
app.post('/api/order', async (req, res) => {
    const newOrder = new Order({
        ...req.body,
        status: 'new',
        time: new Date().toLocaleTimeString('th-TH'),
        createdAt: new Date()
    });
    await newOrder.save();
    io.emit('new_order', newOrder);
    res.status(201).json(newOrder);
});

// DELETE Orders (Clear All)
app.delete('/api/orders', async (req, res) => {
    await Order.deleteMany({});
    io.emit('orders_cleared');
    res.json({ success: true });
});

// PUT Order (Update Status / Items)
app.put('/api/orders/:id', async (req, res) => {
    const { id } = req.params; // id นี้คือ MongoDB _id (string)
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Not found" });

    if (req.body.items) {
        order.items = req.body.items;
        order.totalPrice = req.body.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        if (order.items.length === 0) {
            await Order.findByIdAndDelete(id);
            return res.json({ success: true, deleted: true });
        }
    }
    if (req.body.status) {
        order.status = req.body.status;
    }
    
    await order.save();
    res.json(order);
});

// PUT Table Pay
app.put('/api/orders/table/:tableNo/pay', async (req, res) => {
    const { tableNo } = req.params;
    await Order.updateMany({ tableNo: tableNo, status: { $ne: 'paid' } }, { status: 'paid' });
    res.json({ success: true });
});

// --- SOCKET ---
io.on('connection', (socket) => {
    console.log('User connected');
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));