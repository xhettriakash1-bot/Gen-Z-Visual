// Install first: npm install razorpay cors
const Razorpay = require('razorpay');
const crypto = require('crypto');

// In your main server.js - Add CORS!
const cors = require('cors');
app.use(cors({
  origin: "https://your-frontend-url.vercel.app", // Your frontend URL
  credentials: true
}));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Routes
app.post('/api/create-order', async (req, res) => {
  const order = await razorpay.orders.create({
    amount: req.body.amount * 100,
    currency: "INR",
    receipt: "order_" + Date.now()
  });
  res.json(order);
});

app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  res.json({ success: expected === razorpay_signature });
});
