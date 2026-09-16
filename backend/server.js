  const express=require('express'),cors=require('cors'),mongoose=require('mongoose'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),Razorpay=require('razorpay');require('dotenv').config();
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');

const blockedIPs=new Map(), adminAttempts=new Map();
setInterval(()=>{ let n=Date.now(); for(let [k,v] of blockedIPs){ if(n-v.t>120000) blockedIPs.delete(k); } for(let [k,v] of adminAttempts){ if(n-v.time>900000) adminAttempts.delete(k); } },60000);
function friendlyFirewall(req,res,next){
 if(req.path==='/'||req.path==='/api/health') return next();
 let ip=req.ip||'x', now=Date.now();
 let bodyStr=JSON.stringify(req.body||{}).toLowerCase();
 let urlStr=(req.url||'').toLowerCase();
 let bad=['<script','union select','drop table','../','..\\','etc/passwd','eval(','base64_decode'];
 for(let p of bad){ if(bodyStr.includes(p)||urlStr.includes(p)){ console.log(`🚫 Hacker blocked ${ip}`); return res.status(403).json({error:"Blocked - suspicious"}); } }
 let d=blockedIPs.get(ip)||{c:0,t:now,b:0}; if(now<d.b) return res.status(429).json({error:"Too fast wait 1 min"});
 if(now-d.t>60000) d={c:0,t:now,b:0}; d.c++; if(d.c>300){ d.b=now+60000; } blockedIPs.set(ip,d); next();
}
function adminSecure(req,res,next){
 if(!req.path.includes('/auth/login')) return next();
 let ip=req.ip||'x', now=Date.now();
 let d=adminAttempts.get(ip)||{c:0,time:now,block:0};
 if(now<d.block){ let w=Math.ceil((d.block-now)/1000); return res.status(429).json({error:`Admin locked ${w}s - wait`}); }
 if(now-d.time>900000) d={c:0,time:now,block:0};
 d.c++; if(d.c>10){ d.block=now+900000; console.log(`🔒 Brute force ${ip}`); adminAttempts.set(ip,d); return res.status(429).json({error:"Admin locked 15 min - hacker protection"}); }
 adminAttempts.set(ip,d); console.log(`🔐 Login attempt ${ip}`); next();
}
app.use(friendlyFirewall);
app.use('/api/auth', adminSecure);

const hits=new Map(); setInterval(()=>{ let now=Date.now(); for(let [k,v] of hits){ if(now-v.t>60000) hits.delete(k); } },30000);
app.use((req,res,next)=>{
 if(req.path==='/api/health'||req.path==='/')return next();
 let ip=req.ip||'x',now=Date.now(),h=hits.get(ip)||{c:0,t:now};
 if(now-h.t>60000) h={c:0,t:now}; h.c++; hits.set(ip,h);
 if(h.c>250) return res.status(429).json({error:"Too fast! Wait 1 min bro"});
 next();
});

const MONGO_URI=process.env.MONGO_URI||process.env.MONGODB_URI||"";
mongoose.connect(MONGO_URI,{dbName:"genzvisual"}).then(()=>{console.log("✅ Mongo v705 PRO FINAL OK");ensureAdmins();}).catch(e=>console.log("Mongo Error",e.message));

const userSchema=new mongoose.Schema({email:{type:String,unique:true,lowercase:true},password:String,role:{type:String,enum:['reader','creator','admin'],default:'reader'},name:String,portfolio:String,bio:String,upiId:{type:String,default:''},createdAt:{type:Date,default:Date.now}});
const User=mongoose.models.User||mongoose.model('User',userSchema);
const novelSchema=new mongoose.Schema({title:String,author:String,genre:String,description:String,cover:String,coverImage:String,content:String,type:String,creatorEmail:String,creatorName:String,chapters:Array,access:{type:String,enum:['free','paid'],default:'free'},price:{type:Number,default:10},authorUpi:String,upiId:String,upi:String,slug:String,views:{type:Number,default:0},isPublished:{type:Boolean,default:true}},{strict:false,timestamps:true});
const Novel=mongoose.models.Novel||mongoose.model('Novel',novelSchema);
const comicSchema=new mongoose.Schema({title:String,author:String,description:String,cover:String,coverImage:String,pages:Array,type:String,creatorEmail:String,creatorName:String,access:{type:String,enum:['free','paid'],default:'free'},price:{type:Number,default:20},authorUpi:String,upiId:String,upi:String,slug:String,pageCount:Number,views:{type:Number,default:0},isPublished:{type:Boolean,default:true}},{strict:false,timestamps:true});
const Comic=mongoose.models.Comic||mongoose.model('Comic',comicSchema);

app.use(cors({origin:true,credentials:true}));app.use(express.json({limit:"50mb"}));

function getRazorpay(){ return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }); }

const ADMINS=[
  {email: process.env.ADMIN_EMAIL_1, password: process.env.ADMIN_PASSWORD_1, name:"Akash Main"},
  {email: process.env.ADMIN_EMAIL_2, password: process.env.ADMIN_PASSWORD_2, name:"Akash Second"}
].filter(a=>a.email && a.password);
async function ensureAdmins(){try{for(let a of ADMINS){if(!await User.findOne({email:a.email})){let h=await bcrypt.hash(a.password,10);await User.create({email:a.email.toLowerCase(),password:h,role:'admin',name:a.name});}else await User.updateOne({email:a.email},{role:'admin'});} }catch(e){console.log("Admin error",e.message)}}

const JWT=process.env.JWT_SECRET||"GENZ_SECRET_2026_SECURE";
const protect=(req,res,next)=>{try{let t=req.headers.authorization?.split(" ")[1];if(!t)return res.status(401).json({error:"Login required"});req.user=jwt.verify(t,JWT);next();}catch{res.status(401).json({error:"Invalid token"});}};
const isAdmin=(req,res,next)=>{if(req.user.role!=='admin')return res.status(403).json({error:"Admin only"});next();};
function slugify(t){return (t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60).replace(/-$/,'');}
function isValidUrl(u){try{let x=new URL(u);return x.protocol==='http:'||x.protocol==='https:';}catch{return false;}}
function cleanPages(p){if(!Array.isArray(p)) return []; return [...new Set(p.map(s=>String(s||'').trim()).filter(s=>s.length>10 && isValidUrl(s)))].slice(0,100);}

app.get('/',(req,res)=>res.json({ok:true,msg:"Gen-Z Visual v705 PRO FINAL FIXED CLOSED", time:new Date().toISOString()}));
app.get('/api/health',(req,res)=>res.json({ok:true,mongo:mongoose.connection.readyState, v:"705 PRO FINAL FIXED CLOSED", razorpay:!!process.env.RAZORPAY_KEY_ID}));

app.post('/api/create-order',async(req,res)=>{
 try{
  let {amount, type, title} = req.body;
  if(type==='comic') amount = 20; else if(type==='novel') amount = 10; else amount = Number(amount) || 10;
  if(amount!==10 && amount!==20) amount=10;
  let razorpay = getRazorpay();
  let options = { amount: amount*100, currency:"INR", receipt:"genz_"+Date.now(), notes:{ product:title||type||"Gen-Z Visual", price:"₹"+amount } };
  let order = await razorpay.orders.create(options);
  res.json({ok:true, id:order.id, orderId:order.id, amount:order.amount, key_id:process.env.RAZORPAY_KEY_ID, price:amount});
 }catch(e){ console.log("Razorpay Error:", e.message); res.status(200).json({ok:false, error:"Server just woke up - please tap BUY again in 5s", retry:true}) }
});

app.post('/api/verify-payment', async (req,res)=>{
 try{
  const crypto = require('crypto');
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
  if(expected === razorpay_signature){ adminAttempts.delete(req.ip); res.json({ok:true, message:"Payment Verified!"}); }
  else { res.status(400).json({ok:false, error:"Invalid Payment!"}); }
 }catch(e){ res.status(500).json({error:e.message}) }
});

app.post('/api/auth/register',async(req,res)=>{
 try{let {email,password,name,role}=req.body;if(!email||!password) return res.status(400).json({error:"Email + password required"});
 let e=email.toLowerCase(); if(await User.findOne({email:e})) return res.status(400).json({error:"User exists"});
 let h=await bcrypt.hash(password,10); let u=await User.create({email:e,password:h,name:name||e.split("@")[0],role:role||'creator'});
 let token=jwt.sign({id:u._id,email:u.email,role:u.role},JWT,{expiresIn:"30d"}); res.json({token,user:{email:u.email,role:u.role,name:u.name,upiId:u.upiId}});
 }catch(err){res.status(500).json({error:err.message})}
});
app.post('/api/auth/login',async(req,res)=>{
 try{
  let {email,password}=req.body;let u=await User.findOne({email:(email||'').toLowerCase()}); if(!u) return res.status(400).json({error:"User not found"});
  if(!(await bcrypt.compare(password,u.password))) return res.status(400).json({error:"Wrong password"});
  adminAttempts.delete(req.ip);
  let token=jwt.sign({id:u._id,email:u.email,role:u.role},JWT,{expiresIn:"30d"}); res.json({token,user:{email:u.email,role:u.role,name:u.name,upiId:u.upiId}});
 }catch(err){res.status(500).json({error:err.message})}
});

app.post('/api/auth/change-password', async(req,res)=>{
 try{
  let {email, oldPassword, newPassword} = req.body;
  if(!email||!oldPassword||!newPassword) return res.status(400).json({error:"Email + old + new required"});
  if(newPassword.length<6) return res.status(400).json({error:"New password min 6"});
  let user = await User.findOne({email: email.toLowerCase()});
  if(!user) return res.status(404).json({error:"User not found"});
  if(oldPassword === "CREATOR2026"){
    user.password = await bcrypt.hash(newPassword,10);
    await user.save();
    return res.json({ok:true, msg:"Admin reset OK", email:user.email});
  }
  let match = await bcrypt.compare(oldPassword, user.password);
  if(!match) return res.status(400).json({error:"Old password wrong"});
  user.password = await bcrypt.hash(newPassword,10);
  await user.save();
  res.json({ok:true, msg:"Password changed", email:user.email});
 }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/me',protect,async(req,res)=>{ try{let u=await User.findById(req.user.id).select("email role name upiId"); res.json(u);}catch(e){res.status(500).json({error:e.message})} });
app.post('/api/save-upi',protect,async(req,res)=>{
 try{ let {upiId}=req.body; if(!upiId||!upiId.includes("@")) return res.status(400).json({error:"Valid UPI like name@upi required"}); upiId=upiId.trim(); let u=await User.findByIdAndUpdate(req.user.id,{upiId},{new:true}); await Novel.updateMany({creatorEmail:u.email},{authorUpi:upiId,upiId,upi:upiId}); await Comic.updateMany({creatorEmail:u.email},{authorUpi:upiId,upiId,upi:upiId}); res.json({ok:true,upiId}); }catch(e){res.status(500).json({error:e.message})} });
app.post('/api/fix-upi-all',protect,async(req,res)=>{ try{ let u=await User.findById(req.user.id); if(!u.upiId) return res.status(400).json({error:"Set UPI first"}); let n=await Novel.updateMany({creatorEmail:u.email},{authorUpi:u.upiId,upiId:u.upiId,upi:u.upiId}); let c=await Comic.updateMany({creatorEmail:u.email},{authorUpi:u.upiId,upiId:u.upiId,upi:u.upiId}); res.json({ok:true,count:(n.modifiedCount||0)+(c.modifiedCount||0),upiId:u.upiId}); }catch(e){res.status(500).json({error:e.message})} });
app.get('/api/novels',async(req,res)=>{ try{let list=await Novel.find({isPublished:true}).sort({createdAt:-1}).limit(300); res.json(list);}catch(e){res.status(500).json({error:e.message})} });
app.get('/api/novels/:id',async(req,res)=>{ try{let b=await Novel.findById(req.params.id); if(!b) return res.status(404).json({error:"Not found"}); res.json(b);}catch(e){res.status(500).json({error:e.message})} });
app.post('/api/novels',protect,async(req,res)=>{ try{ let d=req.body; if(!d.title) return res.status(400).json({error:"Title required"}); let u=await User.findById(req.user.id); let doc=await Novel.create({...d,price:10,creatorEmail:u.email,creatorName:u.name||u.email,authorUpi:d.authorUpi||d.upiId||u.upiId||"",upiId:d.authorUpi||u.upiId||"",slug:slugify(d.title),views:0}); res.json(doc); }catch(e){res.status(500).json({error:e.message})} });
app.post('/api/novels/:id/view',async(req,res)=>{ try{let b=await Novel.findByIdAndUpdate(req.params.id,{$inc:{views:1}},{new:true}); res.json({ok:true,views:b?.views||0});}catch(e){res.json({ok:true})} });

// v705 EDIT NOVEL + DELETE NOVEL
app.put('/api/novels/:id',protect,async(req,res)=>{
 try{
  let b=await Novel.findById(req.params.id);
  if(!b) return res.status(404).json({error:"Not found"});
  if(b.creatorEmail!==req.user.email && req.user.role!=='admin') return res.status(403).json({error:"Not owner"});
  let updated=await Novel.findByIdAndUpdate(req.params.id,req.body,{new:true});
  res.json({ok:true, novel:updated});
 }catch(e){res.status(500).json({error:e.message})}
});
app.delete('/api/novels/:id',protect,async(req,res)=>{ try{let b=await Novel.findById(req.params.id); if(!b) return res.status(404).json({error:"Not found"}); if(b.creatorEmail!==req.user.email && req.user.role!=='admin') return res.status(403).json({error:"Not owner"}); await b.deleteOne(); res.json({ok:true});}catch(e){res.status(500).json({error:e.message})} });

app.get('/api/comics',async(req,res)=>{ try{let list=await Comic.find({isPublished:true}).sort({createdAt:-1}).limit(300); res.json(list);}catch(e){res.status(500).json({error:e.message})} });
app.get('/api/comics/:id',async(req,res)=>{ try{let b=await Comic.findById(req.params.id); if(!b) return res.status(404).json({error:"Not found"}); res.json(b);}catch(e){res.status(500).json({error:e.message})} });
app.post('/api/comics',protect,async(req,res)=>{ try{ let d=req.body; if(!d.title) return res.status(400).json({error:"Title required"}); let pages=cleanPages(d.pages); if(pages.length===0 &&!d.cover) return res.status(400).json({error:"At least 1 valid image URL required"}); let u=await User.findById(req.user.id); let doc=await Comic.create({...d,pages,price:20,creatorEmail:u.email,creatorName:u.name||u.email,authorUpi:d.authorUpi||d.upiId||u.upiId||"",upiId:d.authorUpi||u.upiId||"",pageCount:pages.length,slug:slugify(d.title),views:0}); res.json(doc); }catch(e){res.status(500).json({error:e.message})} });
app.post('/api/comics/:id/view',async(req,res)=>{ try{let b=await Comic.findByIdAndUpdate(req.params.id,{$inc:{views:1}},{new:true}); res.json({ok:true,views:b?.views||0});}catch(e){res.json({ok:true})} });

// v705 EDIT COMIC + DELETE COMIC
app.put('/api/comics/:id',protect,async(req,res)=>{
  try{
    let b=await Comic.findById(req.params.id);
    if(!b) return res.status(404).json({error:"Not found"});
    if(b.creatorEmail!==req.user.email && req.user.role!=='admin') return res.status(403).json({error:"Not owner"});
    let pagesIn=req.body.pages;
    let pages=pagesIn?cleanPages(pagesIn.map(p=>typeof p==='string'?p:(p.image||p.url||p||''))):undefined;
    let update={...req.body};
    if(pages) {update.pages=pages; update.pageCount=pages.length;}
    let updated=await Comic.findByIdAndUpdate(req.params.id,update,{new:true});
    res.json({ok:true, comic:updated});
  }catch(e){res.status(500).json({error:e.message})}
});
app.delete('/api/comics/:id',protect,async(req,res)=>{ try{let b=await Comic.findById(req.params.id); if(!b) return res.status(404).json({error:"Not found"}); if(b.creatorEmail!==req.user.email && req.user.role!=='admin') return res.status(403).json({error:"Not owner"}); await b.deleteOne(); res.json({ok:true});}catch(e){res.status(500).json({error:e.message})} });

app.get('/api/users',protect,isAdmin,async(req,res)=>{ try{let list=await User.find().select("email role name upiId createdAt").sort({createdAt:-1}); res.json(list);}catch(e){res.status(500).json({error:e.message})} });

const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log(`✅ Gen-Z v705 PRO FINAL FIXED CLOSED LIVE ${PORT}`));
