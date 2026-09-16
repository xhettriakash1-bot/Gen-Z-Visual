import { useState, useEffect } from 'react';

const API = "https://gen-z-visual-2.onrender.com";

export default function CreateComic() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(['']);
  const [access, setAccess] = useState('free');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [upi, setUpi] = useState('');
  const [apiUp, setApiUp] = useState(false);

  useEffect(()=>{ 
    // Wake backend + load UPI
    fetch(API+"/").then(()=>setApiUp(true)).catch(()=>setApiUp(false));
    const token=localStorage.getItem('token');
    if(token){
      fetch(API+"/api/me",{headers:{Authorization:`Bearer ${token}`}})
        .then(r=>r.json()).then(u=>{ if(u?.upiId) setUpi(u.upiId); });
    }
  },[]);

  const addPage = () => setPages([...pages, '']);
  const removePage = (i) => setPages(pages.filter((_,idx)=>idx!==i));
  const updatePage = (i, val) => {
    const newPages = [...pages];
    newPages[i] = val;
    setPages(newPages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!title.trim()||pages.filter(p=>p.trim()).length===0) return alert("Title + at least 1 page required");
    if(access==='paid' && !upi.includes('@')) return alert("❌ Save UPI first in Dashboard! Paid needs UPI for payment");
    
    setLoading(true);
    try {
      await fetch(API+"/",{cache:"no-store"}); // wake
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/comics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          description: description.trim(),
          pages: pages.filter(p=>p.trim()!==''),
          cover: pages.find(p=>p.trim()) || '',
          access,
          price: Number(price) || 0
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert('✅ Comic Published LIVE! ' + (access==='paid'? 'PAID ₹'+price : 'FREE') + '\nID: '+(data.comic?._id||''));
        setTitle(''); setDescription(''); setPages(['']); setPrice(0); setAccess('free');
      } else {
        alert('Error: ' + (data.error||JSON.stringify(data)));
      }
    } catch (err) {
      alert('Error: ' + err.message + " - Backend waking, try again in 20s");
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:'600px', margin:'20px auto', padding:'20px', background:'#111', color:'white', borderRadius:'15px', fontFamily:'system-ui'}}>
      <h2 style={{fontSize:'24px', fontWeight:'bold'}}>🎨 Create Comic v704.7 {apiUp? '🟢 LIVE':'⏳ Waking...'}</h2>
      {upi && <p style={{fontSize:'11px', color:'#00ff88'}}>UPI: {upi} ✅</p>}

      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Comic Title *" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />

      <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author Name" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444'}} />

      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description *" style={{width:'100%', padding:'12px', margin:'10px 0', borderRadius:'8px', background:'black', color:'white', border:'1px solid #444', height:'80px'}} />

      <p style={{marginTop:'15px', fontWeight:'bold'}}>📄 Pages (Image URLs) *:</p>
      {pages.map((p,i)=>(
        <div key={i} style={{display:'flex', gap:'6px'}}>
          <input value={p} onChange={e=>updatePage(i,e.target.value)} placeholder={`Page
