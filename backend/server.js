// GEN-Z VISUAL - v704.5 FINAL SAFE - 16 Sep 2026
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

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
      // ensure role admin
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

app.get('/api/health',(req,res)=>res.json({ok:true,v:"v704.5 FINAL",mongo:mongoose.connection.readyState===1?"connected":"disconnected"}));
app.get('/',(req,res)=>res.send("🟢 v704.5 FINAL LIVE - Gen-Z Visual"));

async function loginHandler(req,res){
  try{
    let {email,password}=req.body;
    let user=await User.findOne({email:email.toLowerCase()});
    if(!user) return res.status(401).json({error:"User Not Found"});
    if(!await bcrypt.compare(password,user.password)) return res.status(401).json({error:"Wrong Password"});
    let token=jwt.sign({id:user._id,email:user.email,role:user.role},JWT_SECRET,{expiresIn:"7d"});
    res.json({success:true, token, user:{email:user.email,role:user.role,name:user.name,id:user._id}});
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
    // creator code check
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
  let novel=await Novel.create({...req.body,type:'novel',creatorEmail:req.user.email,creatorName:req.user.email});
  res.json({ok:true,novel});
});
app.get('/api/comics',async(req,res)=>res.json(await Comic.find().sort({createdAt:-1}).limit(200)));
app.post('/api/comics',protect,async(req,res)=>{
  if(JSON.stringify(req.body).length>4*1024*1024) return res.status(413).json({error:"Too large, use 8 pages max compressed"});
  let comic=await Comic.create({...req.body,type:'comic',creatorEmail:req.user.email,creatorName:req.user.email,cover:req.body.cover||req.body.coverImage||(req.body.pages&&req.body.pages[0])});
  res.json({ok:true,comic});
});
app.get('/api/books',async(req,res)=>{
  let n=await Novel.find().sort({createdAt:-1}).limit(100);
  let c=await Comic.find().sort({createdAt:-1}).limit(100);
  res.json([...n,...c]);
});
app.delete('/api/novels/:id',protect,isAdmin,async(req,res)=>{await Novel.findByIdAndDelete(req.params.id); res.json({ok:true});});
app.delete('/api/comics/:id',protect,isAdmin,async(req,res)=>{await Comic.findByIdAndDelete(req.params.id); res.json({ok:true});});

const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log(`✅ v704.5 FINAL LIVE on ${PORT}`));
