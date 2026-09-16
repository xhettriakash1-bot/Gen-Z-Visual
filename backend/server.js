// GEN-Z VISUAL - v704.5 FINAL SAFE + FIREWALL FRIENDLY - 16 Sep 2026
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// === FIREWALL FRIENDLY ONLY - NO DOMAIN LOCK ===
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
// === END FIREWALL ===

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "";
console.log("MONGO:", MONGO_URI? "FOUND ✅" : "MISSING ❌");
mongoose.connect(MONGO_URI, { dbName: "genzvisual" })
.then(() => { console.log("✅ Mongo Connected v704.5"); ensureAdmins(); })
.catch(e => console.log("❌ Mongo Fail:", e.message));

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['reader','creator','admin'], default: 'reader' },
  name: String, portfolio: String, bio: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const novelSchema = new mongoose.Schema({
  title: String, author: String, genre: String, description: String,
  cover: String, coverImage: String, content: String, type: String,
  creatorEmail: String, creatorName: String, chapters: Array,
}, { strict: false, timestamps: true });
const Novel = mongoose.models.Novel || mongoose.model('Novel', novelSchema);

const comicSchema = new mongoose.Schema({
  title: String, author: String, description: String,
  cover: String, coverImage: String, pages: Array, type: String,
  creatorEmail: String, creatorName: String,
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
const
