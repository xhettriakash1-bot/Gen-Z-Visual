// GEN-Z VISUAL - v550 SECURE + DYNAMIC + ADMIN MANAGE
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// MONGO
const MONGO_URI = process.env.MONGODB_URI || "";
if(MONGO_URI) mongoose.connect(MONGO_URI).then(()=>console.log("✅ Mongo Connected v550")).catch(e=>console.log("Mongo fail", e.message));
else console.log("⚠️ File mode");

// SCHEMAS
const userSchema = new mongoose.Schema({
  email: {type:String, unique:true, lowercase:true},
  password: String,
  role: {type:String, enum:['reader','creator','admin'], default:'reader'},
  name: String,
  createdAt: {type:Date, default:Date.now}
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:true, credentials:true}));
app.use(express.json({limit:"15mb"}));
app.use(mongoSanitize());
app.use(hpp());
app.use('/api/', rateLimit({windowMs:15*60*1000, max:500}));

// FILE HELPERS
const readJSON = (f)=>{ try{return JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'))}catch{return []} };
const writeJSON = (f,d)=>{ try{fs.writeFileSync(path.join(__dirname,f), JSON.stringify(d,null,2))}catch{} };
if(!fs.existsSync(path.join(__dirname,'users.json'))) writeJSON('users.json',[]);
if(!fs.existsSync(path.join(__dirname,'novels.json'))) writeJSON('novels.json',[]);

// DEFAULT ADMINS
const DEFAULT_ADMINS = [
  { email: (process.env.ADMIN1_EMAIL || "xhettriakash1@gmail.com").toLowerCase(), password: process.env.ADMIN1_PASS || "Akash123" },
  { email: (process.env.ADMIN2_EMAIL || "akashchettri2003@gmail.com").toLowerCase(), password: process.env.ADMIN2_PASS || "Akashchettri2003" }
];

async function ensureAdmins(){
  let users = readJSON('users.json');
  for(let adm of DEFAULT_ADMINS){
    if(!users.find(u=>u.email===adm.email)){
      users.push({id:Date.now()+Math.random(), email:adm.email, password:await bcrypt.hash(adm.password,10), role:'admin', name:'Admin'});
    }
  }
  writeJSON('users.json', users);
  if(mongoose.connection.readyState===1){
    for(let adm of DEFAULT_ADMINS){
      if(!await User.findOne({email:adm.email})){
        await User.create({email:adm.email, password:await bcrypt.hash(adm.password,10), role:'admin', name:'Admin'});
      }
    }
  }
}
ensureAdmins();

// SECURE MIDDLEWARE - JWT
const protect = async (req,res,next)=>{
  try{
    const token = req.headers.authorization?.split(" ")[1];
    if(!token) return res.status(401).json({error:"Login required"});
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "GENZ_SECRET_2026");
    req.user = decoded; next();
  }catch{ res.status(401).json({error:"Invalid token"}); }
};
const isAdmin = (req,res,next)=>{ if(req.user.role!=='admin') return res.status(403).json({error:"Admin only"}); next(); };

// API
app.get('/api/health', (req,res)=>res.json({ok:true, v:"v550"}));

app.post('/api/register', async (req,res)=>{
  const {email,password,name} = req.body;
  if(!email||!password) return res.status(400).json({error:"Required"});
  const emailL = email.toLowerCase();
  if(mongoose.connection.readyState===1){
    if(await User.findOne({email:emailL})) return res.status(409).json({error:"Exists"});
    await User.create({email:emailL, password:await bcrypt.hash(password,10), role:DEFAULT_ADMINS.some(a=>a.email===emailL)?'admin':'reader', name});
  }else{
    let users = readJSON('users.json');
    if(users.find(u=>u.email===emailL)) return res.status(409).json({error:"Exists"});
    users.push({id:Date.now(), email:emailL, password:await bcrypt.hash(password,10), role:DEFAULT_ADMINS.some(a=>a.email===emailL)?'admin':'reader', name});
    writeJSON('users.json', users);
  }
  res.json({success:true, msg:"Registered"});
});

app.post('/api/login', async (req,res)=>{
  const {email,password} = req.body;
  const emailL = email.toLowerCase();
  let user = mongoose.connection.readyState===1? await User.findOne({email:emailL}) : readJSON('users.json').find(u=>u.email===emailL);
  if(!user) return res.status(401).json({error:"Not found"});
  if(!(await bcrypt.compare(password, user.password))) return res.status(401).json({error:"Wrong password"});
  const token = jwt.sign({id:user._id||user.id, email:user.email, role:user.role}, process.env.JWT_SECRET||"GENZ_SECRET_2026", {expiresIn:"7d"});
  res.json({success:true, token, user:{email:user.email, role:user.role, name:user.name}});
});

// ★ NEW 1: ADMIN CHANGE OWN PASSWORD
app.post('/api/admin/change-password', protect, isAdmin, async (req,res)=>{
  const {oldPassword, newPassword} = req.body;
  let user = mongoose.connection.readyState===1? await User.findById(req.user.id) : null;
  if(!user){ // file mode
    let users = readJSON('users.json');
    let idx = users.findIndex(u=>u.email===req.user.email);
    if(idx===-1) return res.json({ok:false, msg:"Not found"});
    if(!(await bcrypt.compare(oldPassword, users[idx].password))) return res.json({ok:false, msg:"Old password wrong"});
    users[idx].password = await bcrypt.hash(newPassword,10);
    writeJSON('users.json', users);
    return res.json({ok:true, msg:"Password changed!"});
  }
  if(!(await bcrypt.compare(oldPassword, user.password))) return res.json({ok:false, msg:"Old password wrong"});
  user.password = await bcrypt.hash(newPassword,10);
  await user.save();
  res.json({ok:true, msg:"Password changed!"});
});

// ★ NEW 2: MAKE MORE ADMIN
app.post('/api/admin/make-admin', protect, isAdmin, async (req,res)=>{
  const {email} = req.body;
  const emailL = email.toLowerCase();
  if(mongoose.connection.readyState===1){
    const target = await User.findOne({email:emailL});
    if(!target) return res.json({ok:false, msg:"User must signup first"});
    target.role = "admin"; await target.save();
  }else{
    let users = readJSON('users.json');
    let u = users.find(x=>x.email===emailL);
    if(!u) return res.json({ok:false, msg:"User must signup first"});
    u.role = "admin"; writeJSON('users.json', users);
  }
  res.json({ok:true, msg:`${email} is now ADMIN`});
});

app.get('/api/users', protect, isAdmin, async (req,res)=>{
  if(mongoose.connection.readyState===1) res.json(await User.find().select('-password'));
  else res.json(readJSON('users.json').map(u=>({email:u.email, role:u.role, name:u.name})));
});

app.get('/', (req,res)=>res.send("🟢 v550 SECURE & DYNAMIC LIVE - Admin can change password + make admin"));

app.listen(process.env.PORT || 10000, ()=>console.log("v550 LIVE"));
