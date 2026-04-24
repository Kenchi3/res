const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// --- Cloudinary Setup ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ตั้งค่า Cloudinary (ดึงค่าจาก Environment Variables)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ตั้งค่า Storage ให้ Multer ใช้ Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'steak-khunnor', // ชื่อโฟลเดอร์บน Cloudinary
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => {
            // ตั้งชื่อไฟล์แบบ Unique
            return Date.now() + '-' + Math.round(Math.random() * 1E9);
        },
    },
});
const upload = multer({ storage: storage });

// --- Database Setup ---
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Schema Definitions ---
const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  img: String, // เก็บ URL จาก Cloudinary
  category: String,
  status: { type: String, default: 'available' }
});
menuSchema.set('toJSON', { virtuals: true });
const Menu = mongoose.model('Menu', menuSchema);

const orderSchema = new mongoose.Schema({
  tableNo: String,
  items: [{
    id: String,
    name: String,
    price: Number,
    qty: Number
  }],
  totalPrice: Number,
  status: { type: String, default: 'new' },
  paymentMethod: { type: String, enum: ['cash', 'transfer', null], default: null },
  time: String,
  createdAt: { type: Date, default: Date.now }
});
orderSchema.set('toJSON', { virtuals: true });
const Order = mongoose.model('Order', orderSchema);

// --- App Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES ---
app.get('/', (req, res) => res.redirect('/table/1')); // Default ไปโต๊ะ 1
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/table/:tableId', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor/menumanage', (req, res) => res.sendFile(path.join(__dirname, 'public/menuManager.html')));
app.get('/admin03030853khunnor/statistics', (req, res) => res.sendFile(path.join(__dirname, 'public/statistics.html')));

// --- API: MENU ---

// GET Menu
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
    const imgPath = req.file ? req.file.path : ''; 
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
    
    if (req.file) item.img = req.file.path;
    
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
    const { id } = req.params;
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
    const { paymentMethod } = req.body;

    if (!['cash', 'transfer'].includes(paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
    }

    // 1. อัพเดทใน Database
    await Order.updateMany(
        { tableNo: tableNo, status: { $ne: 'paid' } }, 
        { status: 'paid', paymentMethod: paymentMethod }
    );

    // 2. ดึงข้อมูลที่อัพเดทแล้วมาส่งผ่าน Socket
    const updatedOrders = await Order.find({ tableNo: tableNo, status: 'paid' });
    
    io.emit('payment_updated', { tableNo, paymentMethod, orders: updatedOrders });

    res.json({ success: true });
});

// --- [เพิ่มใหม่] API: SUMMARY (สรุปยอดขายวันนี้จาก Database) ---
app.get('/api/orders/summary/today', async (req, res) => {
    try {
        // 1. หาช่วงเวลาของวันนี้ (Timezone: Asia/Bangkok)
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0); 
        // Note: ถ้า Server ตั้งเวลาเป็น UTC ต้อง adjust offset ที่นี่ แต่ถ้าใช้ Node.js v14+ จะจัดการให้
        // เพื่อความปลอดภัย เราจะ filter เบื้องต้นด้วยวันที่ใกล้เคียง
        
        // 2. ดึงออเดอร์ที่จ่ายแล้ว
        const paidOrders = await Order.find({ 
            status: 'paid',
            createdAt: { $gte: startOfDay } 
        });

        // 3. Filter แบบละเอียดอีกครั้งด้วย Timezone ไทย (ป้องกันกรณี Server เป็น UTC)
        const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const thaiStart = new Date(thaiNow);
        thaiStart.setHours(0, 0, 0, 0);

        const todaysOrders = paidOrders.filter(o => {
            const orderDate = new Date(o.createdAt);
            const thaiOrderDate = new Date(orderDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
            return thaiOrderDate >= thaiStart;
        });

        // 4. คำนวณยอด
        let totalCash = 0;
        let totalTransfer = 0;
        const itemsMap = {};

        todaysOrders.forEach(o => {
            // เช็ค Method อย่างเข้มงวด
            if (o.paymentMethod === 'cash') totalCash += o.totalPrice;
            else if (o.paymentMethod === 'transfer') totalTransfer += o.totalPrice;

            // นับสินค้า
            o.items.forEach(item => {
                if (!itemsMap[item.name]) itemsMap[item.name] = { qty: 0, price: item.price };
                itemsMap[item.name].qty += item.qty;
            });
        });

        res.json({
            total: totalCash + totalTransfer,
            cash: totalCash,
            transfer: totalTransfer,
            items: itemsMap,
            date: thaiNow.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate summary' });
    }
});

// --- SOCKET ---
io.on('connection', (socket) => {
    console.log('User connected');
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));