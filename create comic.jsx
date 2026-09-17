import { useState, useEffect } from 'react';

const API = "https://gen-z-visual-2.onrender.com";

export default function CreateComic() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState(['']);
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

  const addPage = () => setPages([...pages, '']);
  const removePage = (i) => setPages(pages.filter((_,idx)=>idx!==i));
  const updatePage = (i, val) => {
    const newPages = [...pages];
    newPages[i] = val;
    setPages(newPages);
  };

  const isValidUrl = (s) => {
    try{ const u=new URL(s); return u.protocol==='http:'||u.protocol==='https:'; }catch{return false;}
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validPages = pages.map(p=>p.trim()).filter(p=>p && isValidUrl(p));
    if(!title.trim() || title.trim().length<2) return alert("❌ Title min 2 chars");
    if(validPages.length===0) return alert("❌ Need at least 1 valid https:// image URL");
    if(access==='paid'){
      if(!upi.includes('@')) return alert("❌ Save UPI first in Dashboard! PAID needs UPI");
      if(Number(price)<10) return alert("❌ PAID price min ₹10");
    }
    setLoading(true);
    try {
      await fetch(API+"/",{cache:"no-store"});
      const token = localStorage.getItem('token')||localStorage.getItem('genz_token');
      const res = await fetch(`${API}/api/comics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim()||'GenZ Creator',
          description: description.trim(),
          pages: validPages,
          cover: validPages[0] || '',
          access,
          price: access==='paid'? Number(price) : 0
        })
      });
      const data = await res.json();
      if (data.ok || data.comic) {
        alert('✅ Comic Published LIVE v708 FB! ' + (access==='paid'? 'PAID ₹'+price : 'FREE') + '\nID: '+(data.comic?._id||data._id||''));
        setTitle(''); setDescription(''); setPages(['']); setPrice(10); setAccess('free');
      } else {
        alert('Error: ' + (data.error||JSON.stringify(data)));
      }
    } catch (err) {
      alert('Error: ' + err.message + " - Backend waking, try again in 20s");
    }
    setLoading(false);
  };

  return (
    <div style={{maxWidth:'600px', margin:'20px auto', padding:'20px', background:'#121212', color:'white', borderRadius:'20px', fontFamily
