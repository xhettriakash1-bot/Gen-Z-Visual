// GEN-Z VISUAL - v704.5 FINAL SAFE + FIREWALL FRIENDLY - 16 Sep 2026 + FREE/PAID + UPI DIRECT
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  res.setHeader('X-XSS-Protection','1; mode=block');
  next();
});
const hits={};
app.use((req,res,next)=>{
  if(req.path==='/api/health'||req.path==='/') return next();
  const ip=req.ip||'x';
  if(!hits[ip]) hits[ip]={c:0,t:Date.now()};
  if(Date.now()-hits[ip].t>60000) hits[ip]={c:0,t:Date.now()};
  hits[ip].c++;
  if(hits[ip].c>200) return res.status(429).json({error:"Too many requests - wait 1 min"});
  next();
});

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";
console.log("MONGO:", MONGO_URI? "FOUND ✅" : "MISSING ❌");
mongoose.connect(MONGO_URI, { dbName: "genzvisual" })
.then(() => { console.log("✅ Mongo Connected v704.5 + UPI"); ensureAdmins(); })
.catch(e => console.log("❌ Mongo Fail:", e.message));

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['reader','creator','admin'], default: 'reader' },
  name: String, portfolio: String, bio: String,
  upiId: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const novelSchema = new mongoose.Schema({
  title: String, author: String, genre: String, description: String,
  cover: String, coverImage: String, content: String, type: String,
  creatorEmail: String, creatorName: String, chapters: Array,
  access: { type: String, enum: ['free','paid'], default: 'free' },
  price: { type: Number, default: 0 },
  authorUpi: { type: String, default: '' },
}, { strict: false, timestamps: true });
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

const comicSchema = new mongoose.Schema({
  title: String, author: String, description: String,
  cover: String, coverImage: String, pages: Array, type: String,
  creatorEmail: String, creatorName: String,
  access: { type: String, enum: ['free','paid'], default: 'free' },
  price: { type: Number, default: 0 },
  authorUpi: { type: String, default: '' },
}, { strict: false, timestamps: true });
const Comic = mongoose.models.Comic || mongoose.model('Comic', comicSchema);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));

const DEFAULT_ADMINS = [
  { email: "xhettriakash1@gmail.com", password: "Akash123", name: "Akash Main Admin" },
  { email: "akashchettri2003@gmail.com", password: "Akashchettri2003", name: "Akash Second Admin" }
];
async function ensureAdmins(){
  for(let adm of DEFAULT_ADMINS){
    if(!await User.findOne({email:adm.email})){
      let h=await bcrypt.hash(adm.password,10);
      await User.create({email:adm.email.toLowerCase(), password:h, role:'admin', name:adm.name});
      console.log("✅ Admin Created:",adm.email);
    } else {
      await User.updateOne({email:adm.email},{role:'admin'});
    }
  }
}
const JWT_SECRET = process.env.JWT_SECRET || "GENZ_SECRET_2026_SECURE";
const protect = (req,res,next)=>{
  try{
    let token=req.headers.authorization?.split(" ")[1];
    if(!token) return res.status(401).json({error:"Login required"});
    req.user=jwt.verify(token,JWT_SECRET); next();
  }catch{ res.status(401).json({error:"Invalid token"}); }
};
const isAdmin = (req,res,next)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:"Admin only"});
  next();
};

app.get('/api/health',(req,res)=>res.json({ok:true,v:"v704.5 FINAL",mongo:mongoose.connection.readyState===1?"connected":"disconnected",firewall:"ON ✅", features: "FREE/PAID + UPI ✅"}));
app.get('/',(req,res)=>res.send("🟢 v704.5 FINAL LIVE - Gen-Z Visual + FREE/PAID + UPI"));

async function loginHandler(req,res){
  try{
    let {email,password}=req.body;
    let user=await User.findOne({email:email.toLowerCase()});
    if(!user) return res.status(401).json({error:"User Not Found"});
    if(!await bcrypt.compare(password,user.password)) return res.status(401).json({error:"Wrong Password"});
    let token=jwt.sign({id:user._id,email:user.email,role:user.role},JWT_SECRET,{expiresIn:"7d"});
    res.json({success:true, token, user:{email:user.email,role:user.role,name:user.name,id:user._id, upiId:user.upiId||''}});
  }catch(e){ res.status(500).json({error:e.message}); }
}
app.post('/api/login',loginHandler);
app.post('/api/auth/login',loginHandler);

async function registerHandler(req,res){
  try{
    let {email,password,name,role,portfolio,bio,code}=req.body;
    if(await User.findOne({email:email.toLowerCase()})) return res.status(409).json({error:"Exists"});
    let isDefaultAdmin=DEFAULT_ADMINS.some(a=>a.email===email.toLowerCase());
    let newRole=isDefaultAdmin?'admin':(role==='creator'?'creator':'reader');
    if(role==='creator' && code && code!=='CREATOR2026' &&!isDefaultAdmin) return res.status(403).json({error:"Wrong creator code"});
    let hashed=await bcrypt.hash(password,10);
    await User.create({email:email.toLowerCase(),password:hashed,role:newRole,name:name||"User",portfolio,bio});
    res.json({success:true,msg:"Registered as "+newRole});
  }catch(e){ res.status(500).json({error:e.message}); }
}
app.post('/api/auth/register',registerHandler);
app.post('/api/auth/register-creator',registerHandler);
app.post('/api/register',registerHandler);
app.post('/api/register-creator',registerHandler);

app.get('/api/users',protect,isAdmin,async(req,res)=>res.json(await User.find().select('-password').sort({createdAt:-1})));
app.get('/api/novels',async(req,res)=>res.json(await Novel.find().sort({createdAt:-1}).limit(200)));
app.post('/api/novels',protect,async(req,res)=>{
  let me = await User.findOne({email:req.user.email});
  let novel=await Novel.create({...req.body,type:'novel',creatorEmail:req.user.email,creatorName:req.user.email, access: req.body.access||'free', price: req.body.price||0, authorUpi: me
