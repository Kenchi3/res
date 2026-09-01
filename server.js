const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

// --- Cloudinary Setup ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'steak-khunnor',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        public_id: (req, file) => Date.now() + '-' + Math.round(Math.random() * 1E9),
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
  name: String, price: Number, img: String, category: String, status: { type: String, default: 'available' }
});
menuSchema.set('toJSON', { virtuals: true });
const Menu = mongoose.model('Menu', menuSchema);

const orderSchema = new mongoose.Schema({
  tableNo: String,
  pax: { type: Number, default: 1 },
  items: [{
    id: String,
    name: String,
    price: Number,
    originalPrice: Number,
    qty: Number,
    note: String,
    isCustom: { type: Boolean, default: false }
  }],
  totalPrice: Number,
  status: { type: String, default: 'new' },
  isPaid: { type: Boolean, default: false },
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

// --- ROUTES (HTML) ---
app.get('/', (req, res) => res.redirect('/table/1'));
app.get('/menu', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/table/:tableId', (req, res) => res.sendFile(path.join(__dirname, 'public/menu.html')));
app.get('/admin03030853khunnor/menumanage', (req, res) => res.sendFile(path.join(__dirname, 'public/menuManager.html')));
app.get('/admin03030853khunnor/statistics', (req, res) => res.sendFile(path.join(__dirname, 'public/statistics.html')));
app.get('/admin03030853khunnor/orderhistory', (req, res) => res.sendFile(path.join(__dirname, 'public/orderHistory.html')));

// --- API: MENU ---
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

app.post('/api/menu', upload.single('img'), async (req, res) => {
    const { name, price, category } = req.body;
    const imgPath = req.file ? req.file.path : '';
    const newItem = new Menu({ name, price: parseFloat(price), img: imgPath, category, status: 'available' });
    await newItem.save();
    res.status(201).json(newItem);
});

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

app.delete('/api/menu/:id', async (req, res) => {
    await Menu.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- API: ORDERS ---

app.get('/api/orders', async (req, res) => {
    const orders = await Order.find();
    res.json(orders);
});

app.post('/api/order', async (req, res) => {
    let { tableNo, pax, items, totalPrice } = req.body;

    if (tableNo === 'takeaway') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todayTakeawayCount = await Order.countDocuments({
            tableNo: { $regex: /^กลับบ้าน/ },
            createdAt: { $gte: startOfDay }
        });
        tableNo = `กลับบ้าน #${todayTakeawayCount + 1}`;
    } else if (tableNo.startsWith('takeaway-')) {
        const customerName = tableNo.substring('takeaway-'.length).trim();
        tableNo = customerName ? `กลับบ้าน (${customerName})` : `กลับบ้าน`;
        if (tableNo === 'กลับบ้าน') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const todayTakeawayCount = await Order.countDocuments({
                tableNo: { $regex: /^กลับบ้าน/ },
                createdAt: { $gte: startOfDay }
            });
            tableNo = `กลับบ้าน #${todayTakeawayCount + 1}`;
        }
    }

    const processedItems = items.map(i => ({
        ...i,
        originalPrice: i.originalPrice || i.price, 
        price: i.price
    }));

    const newOrder = new Order({
        tableNo,
        pax: pax || 1,
        items: processedItems,
        totalPrice,
        status: 'new',
        time: new Date().toLocaleTimeString('th-TH'),
        createdAt: new Date()
    });
    await newOrder.save();
    io.emit('new_order', newOrder);
    res.status(201).json(newOrder);
});

// --- GET ACTIVE ORDERS BY TABLE NO ---
app.get('/api/orders/table/:tableNo/active', async (req, res) => {
    try {
        const { tableNo } = req.params;
        const orders = await Order.find({ tableNo, status: { $ne: 'paid' } });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active orders for table' });
    }
});

// --- POST ACTIVE ORDERS BY IDS ---
app.post('/api/orders/by-ids', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs format' });
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        const orders = await Order.find({ _id: { $in: validIds } });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders by IDs' });
    }
});

app.delete('/api/orders', async (req, res) => {
    await Order.deleteMany({});
    io.emit('orders_cleared');
    res.json({ success: true });
});

app.put('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { items, status } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Not found" });

    if (items) {
        const processedItems = items.map(i => ({
            id: i.id,
            name: i.name,
            price: Number(i.price),
            originalPrice: Number(i.originalPrice || i.price),
            qty: i.qty,
            note: i.note,
            isCustom: i.isCustom || false
        }));
        
        order.items = processedItems;
        order.totalPrice = processedItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        
        if (order.items.length === 0) {
            await Order.findByIdAndDelete(id);
            io.emit('order_deleted', id);
            return res.json({ success: true, deleted: true });
        }
    }
    
    if (status) {
        order.status = status;
        if (status === 'done' && order.isPaid) {
            order.status = 'paid';
        }
    }
    
    await order.save();
    io.emit('order_updated', order);
    res.json(order);
});

app.delete('/api/orders/:id', async (req, res) => {
    await Order.findByIdAndDelete(req.params.id);
    io.emit('order_deleted', req.params.id);
    res.json({ success: true });
});

// [Fixed] PAYMENT ROUTE with Error Handling
app.put('/api/orders/table/:tableNo/pay', async (req, res) => {
    try {
        const { tableNo } = req.params;
        const { paymentMethod } = req.body;

        if (!['cash', 'transfer'].includes(paymentMethod)) {
            return res.status(400).json({ error: "Invalid payment method" });
        }

        // Update orders
        const result = await Order.updateMany(
            { tableNo: tableNo, status: { $ne: 'paid' } }, 
            { isPaid: true, paymentMethod: paymentMethod }
        );

        // For orders that are already done, transition status to 'paid'
        await Order.updateMany(
            { tableNo: tableNo, status: 'done', isPaid: true },
            { status: 'paid' }
        );

        // Notify clients via socket
        const updatedOrders = await Order.find({ tableNo: tableNo, isPaid: true });
        io.emit('payment_updated', { tableNo, paymentMethod, orders: updatedOrders });
        
        res.json({ success: true, modifiedCount: result.modifiedCount || result.nModified });

    } catch (error) {
        console.error("Payment Error:", error);
        res.status(500).json({ error: "Server error during payment" });
    }
});

// [Fixed] SUMMARY ROUTE with Error Handling
app.get('/api/orders/summary/today', async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        
        const paidOrders = await Order.find({ 
            isPaid: true,
            createdAt: { $gte: startOfDay } 
        });

        const thaiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const thaiStart = new Date(thaiNow);
        thaiStart.setHours(0, 0, 0, 0);

        const todaysOrders = paidOrders.filter(o => {
            const orderDate = new Date(o.createdAt);
            const thaiOrderDate = new Date(orderDate.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
            return thaiOrderDate >= thaiStart;
        });

        let totalCash = 0;
        let totalTransfer = 0;
        let totalDiscount = 0; 
        let totalGuests = 0;
        const itemsMap = {};

        todaysOrders.forEach(o => {
            if (o.paymentMethod === 'cash') totalCash += o.totalPrice;
            else if (o.paymentMethod === 'transfer') totalTransfer += o.totalPrice;
            
            totalGuests += o.pax || 0;

            o.items.forEach(item => {
                const itemDiscount = (item.originalPrice - item.price) * item.qty;
                if (itemDiscount > 0) totalDiscount += itemDiscount;

                if (!itemsMap[item.name]) itemsMap[item.name] = { qty: 0, price: item.price, originalPrice: item.originalPrice };
                itemsMap[item.name].qty += item.qty;
            });
        });

        res.json({
            total: totalCash + totalTransfer,
            cash: totalCash,
            transfer: totalTransfer,
            discount: totalDiscount,
            guests: totalGuests,
            items: itemsMap,
            date: thaiNow.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate summary' });
    }
});

// --- API: ORDER HISTORY (date range filter) ---
app.get('/api/orders/history', async (req, res) => {
    try {
        const { from, to } = req.query;
        
        let query = {};
        
        if (from || to) {
            query.createdAt = {};
            if (from) {
                // Parse YYYY-MM-DD as Bangkok midnight → UTC
                const [fy, fm, fd] = from.split('-').map(Number);
                const fromDate = new Date(Date.UTC(fy, fm - 1, fd, 0, 0, 0, 0));
                query.createdAt.$gte = fromDate;
            }
            if (to) {
                // Parse YYYY-MM-DD as Bangkok end-of-day → UTC (23:59:59 Bangkok = 16:59:59 UTC)
                const [ty, tm, td] = to.split('-').map(Number);
                const toDate = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59, 999));
                query.createdAt.$lte = toDate;
            }
        }
        
        console.log('[OrderHistory] query:', JSON.stringify(query));
        
        const orders = await Order.find(query).sort({ createdAt: -1 });
        
        // Summary stats
        let totalRevenue = 0;
        let totalOrders = orders.length;
        let paidOrders = 0;
        let cashTotal = 0;
        let transferTotal = 0;
        
        orders.forEach(o => {
            if (o.isPaid) {
                paidOrders++;
                totalRevenue += o.totalPrice;
                if (o.paymentMethod === 'cash') cashTotal += o.totalPrice;
                else if (o.paymentMethod === 'transfer') transferTotal += o.totalPrice;
            }
        });
        
        res.json({
            orders,
            summary: {
                totalOrders,
                paidOrders,
                totalRevenue,
                cashTotal,
                transferTotal
            }
        });
    } catch (error) {
        console.error('Order History Error:', error);
        res.status(500).json({ error: 'Failed to fetch order history' });
    }
});

io.on('connection', (socket) => {
    console.log('User connected');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));