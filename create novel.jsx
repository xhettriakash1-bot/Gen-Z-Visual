import { useState, useEffect } from 'react';

const API = "https://gen-z-visual-2.onrender.com";

export default function CreateNovel() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('Romance');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('');
  const [access, setAccess] = useState('free');
  const [price, setPrice] = useState(10);
  const [loading, setLoading] = useState(false);
  const [upi, setUpi] = useState('');
  const [apiUp, setApiUp] = useState(false);

  useEffect(()=>{
    fetch(API+"/").then(()=>setApiUp(true)).catch(()=>setApiUp(false));
    const token=localStorage.getItem('token')||localStorage.getItem('genz_token');
    if(token){
      fetch(API+"/api/me",{headers:{Authorization:`Bearer ${token}`}})
        .then(r=>r.json()).then(u=>{
          if(u?.upiId) setUpi(u.upiId);
          if(u?.email) setAuthor(prev=>prev||u.email);
        }).catch(()=>{});
    }
  },[]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!title.trim() || title.trim().length<2) return alert("❌ Title min 2 chars");
    if(!description.trim() || description.trim().length<10) return alert("❌ Description min 10 chars");
    if(!content.trim() || content.trim().length<30) return alert(`❌ Story content min 30 chars, now ${content.trim().length}`);
    if(access==='paid'){
      if(!upi.includes('@')) return alert("❌ Save UPI first in Dashboard! PAID needs UPI");
      if(Number(price)<10) return alert("❌ PAID price min ₹10");
    }
    setLoading(true);
    try {
      await fetch(API+"/",{cache:"no-store"});
      const token = localStorage.getItem('token')||localStorage.getItem('genz_token');
      const res = await fetch(`${API}/api/novels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim()||'GenZ Creator',
          genre,
          description: description.trim(),
          content: content.trim(),
          cover: cover.trim() || `https://picsum.photos/seed/${encodeURIComponent(title)}/400/600`,
          access,
          price: access==='paid'? Number(price) : 0
        })
      });
      const data = await res.json();
      if (data.ok || data.novel) {
        alert('✅ Novel Published LIVE v708 FB! ' + (access==='paid' ? 'PAID ₹'+price : 'FREE'));
        setTitle(''); setDescription(''); setContent(''); setCover(''); setPrice(10); setAccess('free');
      } else {
        alert('Error: ' + (data.error||JSON.stringify(data)));
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:'600px', margin:'20px auto', padding:'20px', background:'#121212', color:'white', borderRadius:'20px', border:'1px solid #222'}}>
      <h2 style={{fontSize:'22px', fontWeight:'900'}}>📖 Create Novel <span style={{fontSize:'10px', background: apiUp?'#00ff88':'#333', color:'#000', padding:'4px 8px', borderRadius:'20px'}}>v708 FB {apiUp? 'LIVE':'Waking...'}</span></h2>
      {upi ? <p style={{fontSize:'11px', color:'#00ff88', background:'#00ff8815', padding:'6px 10px', borderRadius:'8px'}}>💳 UPI: {upi} ✅ PAID enabled</p> : <p style={{fontSize:'11px', color:'#ffaa00'}}>⚠️ No UPI — PAID blocked.</p>}
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Novel Title *" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333'}} />
      <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author Name" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333'}} />
      <select value={genre} onChange={e=>setGenre(e.target.value)} style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333'}}>
        <option>Romance</option><option>Action</option><option>Fantasy</option><option>Horror</option><option>Comedy</option><option>Drama</option><option>NEON</option><option>CITY</option>
      </select>
      <input value={cover} onChange={e=>setCover(e.target.value)} placeholder="Cover URL (auto if empty)" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333'}} />
      <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description * min 10" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333', height:'80px'}} />
      <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Story... * min 30" style={{width:'100%', padding:'12px', margin:'8px 0', borderRadius:'10px', background:'black', color:'white', border:'1px solid #333', height:'200px'}} />
      <p style={{fontSize:'10px', color: content.length<30?'#ff0055':'#00ff88'}}>{content.length} / 30 min</p>
      <div style={{border:'1px solid #333', padding:'15px', borderRadius:'12px', margin:'15px 0', background:'#1a1a1a'}}>
        <p style={{fontWeight:'800', marginBottom:'10px', fontSize:'13px'}}>📖 Access:</p>
        <div style={{display:'flex', gap:'10px'}}>
          <button type="button" onClick={()=>setAccess('free')} style={{flex:1, padding:'10px', borderRadius:'99px', fontWeight:'900', border:'none', background: access==='free' ? '#22c55e' : '#333', color: access==='free' ? 'black' : 'white'}}>🟢 FREE</button>
          <button type="button" onClick={()=>setAccess('paid')} style={{flex:1, padding:'10px', borderRadius:'99px', fontWeight:'900', border:'none', background: access==='paid' ? '#facc15' : '#333', color: access==='paid' ? 'black' : 'white'}}>💰 PAID</button>
        </div>
        {access==='paid' && <input type="number" min="10" value={price} onChange={e=>setPrice(e.target.value)} style={{width:'100%', padding:'12px', marginTop:'10px', borderRadius:'10px', background:'black', color:'white', border:'1px solid #facc15'}} />}
      </div>
      <button onClick={handleSubmit} disabled={loading} style={{width:'100%', padding:'14px', borderRadius:'99px', background: loading?'#333':'#fff', color: loading?'#888':'#000', fontWeight:'900', border:'none'}}>
        {loading ? 'Publishing...' : `🚀 Publish ${access==='paid'? 'PAID ₹'+price : 'FREE'} v708`}
      </button>
      <p style={{fontSize:'10px', color:'#666', textAlign:'center', marginTop:'8px'}}>v708 FB • FB Like ready</p>
    </div>
  );
        }
