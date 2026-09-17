const Razorpay = require('razorpay');
const crypto = require('crypto');

function getRazorpay(){
  if(!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) 
    throw new Error("RAZORPAY keys missing in Render env");
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

async function createOrder(amount, title, type){
  amount = Number(amount) || (type==='comic'?20:10);
  if(amount<1) amount=10;
  let lastErr=null;
  for(let i=0;i<3;i++){
    try{
      let razorpay = getRazorpay();
      let order = await razorpay.orders.create({
        amount: amount*100,
        currency:"INR",
        receipt:"genz_"+Date.now()+"_"+i,
        notes:{ product: title||type||"Gen-Z Visual", price:"₹"+amount }
      });
      return order;
    }catch(err){
      lastErr=err;
      console.log(`Attempt ${i+1}/3 failed: ${err.message}`);
      if(i<2) await new Promise(r=>setTimeout(r,1500));
    }
  }
  throw lastErr;
}

function verifyPayment(order_id, payment_id, signature) {
  const body = order_id + "|" + payment_id;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  return expected === signature;
}

module.exports = { createOrder, verifyPayment, getRazorpay };
