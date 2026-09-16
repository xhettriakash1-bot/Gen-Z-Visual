const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function createOrder(amount, title) {
  const order = await razorpay.orders.create({
    amount: Number(amount) * 100,
    currency: "INR",
    receipt: "order_" + Date.now(),
    notes: { product: title || "Gen-Z Visual" }
  });
  return order;
}

function verifyPayment(order_id, payment_id, signature) {
  const body = order_id + "|" + payment_id;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  return expected === signature;
}

module.exports = { createOrder, verifyPayment };
