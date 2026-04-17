import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import Draggable from 'react-draggable';
import { Camera, Download, Trash2, Smile, RotateCcw, Palette, Zap, Sparkles, LayoutGrid, Type, History, Heart, Moon, Sun, Wand2, Plus, Minus, RotateCw, Upload, Code2, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';

const FONT_OPTIONS = [
  { id: 'sans', name: 'Modern', family: 'sans-serif' },
  { id: 'serif', name: 'Classic', family: 'serif' },
  { id: 'cursive', name: 'Handwriting', family: 'cursive' },
  { id: 'mono', name: 'Typewriter', family: 'monospace' },
];

const DraggableOverlay = ({ item, onDelete, onUpdate, frameColor }) => {
  const nodeRef = useRef(null);
  const handleResize = (delta) => onUpdate(item.id, { size: Math.max(0.5, (item.size || 1) + delta) });
  const handleRotate = () => onUpdate(item.id, { rotation: (item.rotation || 0) + 15 });

  return (
    <Draggable nodeRef={nodeRef} bounds="parent">
      <div ref={nodeRef} id={`overlay-${item.id}`} className="absolute z-50 cursor-move group touch-none p-4" style={{ left: '10%', top: '10%' }}>
        <div className="relative flex items-center justify-center">
          <div style={{ transform: `scale(${item.size || 1}) rotate(${item.rotation || 0}deg)`, transition: 'transform 0.1s ease-out' }}>
            {item.type === 'sticker' ? (
              <span className="text-4xl select-none block drop-shadow-md">{item.content}</span>
            ) : (
              <span className="text-lg font-bold whitespace-nowrap select-none drop-shadow-md" style={{ fontFamily: item.fontFamily, color: frameColor.isDark ? '#ffffff' : '#000000' }}>
                {item.content}
              </span>
            )}
          </div>
          <div className="absolute -top-10 flex gap-1 bg-white/90 dark:bg-zinc-800/90 p-1 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity scale-75 lg:scale-100">
            <button onClick={() => handleResize(0.2)} className="p-1 hover:text-rose-500 transition-colors"><Plus size={14}/></button>
            <button onClick={() => handleResize(-0.2)} className="p-1 hover:text-rose-500 transition-colors"><Minus size={14}/></button>
            <button onClick={handleRotate} className="p-1 hover:text-rose-500 transition-colors"><RotateCw size={14}/></button>
            <div className="w-[1px] bg-zinc-300 mx-1"></div>
            <button onClick={() => onDelete(item.id)} className="p-1 text-red-500 hover:scale-110 transition-transform"><Trash2 size={14}/></button>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default function App() {
  const webcamRef = useRef(null);
  const stripRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [photos, setPhotos] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [flash, setFlash] = useState(false);
  const [overlays, setOverlays] = useState([]);
  const [emojis, setEmojis] = useState(["❤️", "✨", "🔥", "🎀", "😎", "🌈", "📸"]);
  const [inputText, setInputText] = useState("");
  const [selectedFont, setSelectedFont] = useState('sans-serif');
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [layout, setLayout] = useState('strip'); 
  const [filter, setFilter] = useState('none'); 
  const [frame, setFrame] = useState({ hex: "#ffffff", isDark: false });

  const videoConstraints = {
    facingMode: "user",
    aspectRatio: 4/3,
    width: { ideal: 1280 },
    height: { ideal: 960 }
  };

  useEffect(() => {
    fetch('https://emojihub.yurace.pro/api/all/category/smileys-and-people')
      .then(res => res.json())
      .then(data => setEmojis(data.slice(0, 24).map(e => String.fromCodePoint(...e.unicode[0].split('U+').filter(Boolean).map(u => parseInt(u, 16))))));
    
    const saved = JSON.parse(localStorage.getItem('pb_history') || '[]');
    setHistory(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('pb_history', JSON.stringify(history));
  }, [history]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (photos.length < 4) {
        const reader = new FileReader();
        reader.onload = (event) => setPhotos(prev => [...prev, event.target.result].slice(0, 4));
        reader.readAsDataURL(file);
      }
    });
  };

  const playSound = (type) => {
    const s = { shutter: 'https://www.soundjay.com/mechanical/camera-shutter-click-08.mp3', timer: 'https://www.soundjay.com/buttons/button-42.mp3' };
    new Audio(s[type]).play().catch(() => {});
  };

  const updateOverlay = (id, newProps) => setOverlays(prev => prev.map(item => item.id === id ? { ...item, ...newProps } : item));

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const src = webcamRef.current.getScreenshot();
      if (src) { 
        setPhotos(p => [...p, src].slice(0, 4)); 
        setFlash(true); playSound('shutter'); 
        setTimeout(() => setFlash(false), 100); 
      }
    }
  }, [webcamRef]);

  const startSession = () => {
    if (photos.length >= 4) return;
    setIsCapturing(true);
    let currentPhotosCount = photos.length;
    const seq = () => {
      if (currentPhotosCount < 4) {
        let t = 3; setCountdown(t);
        const inv = setInterval(() => {
          t--; setCountdown(t); 
          if(t > 0) playSound('timer');
          if (t === 0) { 
            clearInterval(inv); capture(); setCountdown(null); 
            currentPhotosCount++; setTimeout(seq, 1200); 
          }
        }, 1000);
      } else { 
        setIsCapturing(false); 
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); 
      }
    };
    seq();
  };

  const downloadResult = async () => {
    if (!stripRef.current) return;
    const previewRect = stripRef.current.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const isGrid = layout === 'grid';
    canvas.width = isGrid ? 800 : 400;
    canvas.height = isGrid ? 850 : 1300;
    const scale = canvas.width / previewRect.width;

    ctx.fillStyle = frame.hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const applyFilter = () => {
      if (filter === 'bw') ctx.filter = 'grayscale(100%) contrast(1.2)';
      if (filter === 'vintage') ctx.filter = 'sepia(0.4) contrast(1.1)';
      if (filter === 'warm') ctx.filter = 'saturate(1.5) sepia(0.1)';
    };

    const padding = 16 * scale;
    for (let i = 0; i < photos.length; i++) {
      const img = new Image(); 
      img.src = photos[i];
      await new Promise(r => {
        img.onload = () => {
          applyFilter();
          let photoW, photoH, x, y;
          if (isGrid) {
            const gap = 8 * scale;
            photoW = (canvas.width - (padding * 2) - gap) / 2; photoH = photoW * 0.75;
            x = padding + (i % 2) * (photoW + gap); y = padding + Math.floor(i / 2) * (photoH + gap);
          } else {
            const gap = 8 * scale;
            photoW = canvas.width - (padding * 2); photoH = photoW * 0.75;
            x = padding; y = padding + i * (photoH + gap);
          }
          const imgAspect = img.width / img.height;
          const targetAspect = photoW / photoH;
          let sx, sy, sw, sh;
          if (imgAspect > targetAspect) {
            sh = img.height; sw = img.height * targetAspect;
            sx = (img.width - sw) / 2; sy = 0;
          } else {
            sw = img.width; sh = img.width / targetAspect;
            sx = 0; sy = (img.height - sh) / 2;
          }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, photoW, photoH);
          ctx.filter = 'none'; r();
        };
      });
    }

    overlays.forEach(item => {
      const node = document.getElementById(`overlay-${item.id}`);
      if (node) {
        const nodeRect = node.getBoundingClientRect();
        const x = (nodeRect.left - previewRect.left + nodeRect.width / 2) * scale;
        const y = (nodeRect.top - previewRect.top + nodeRect.height / 2) * scale;
        ctx.save(); ctx.translate(x, y); ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (item.type === 'sticker') {
          ctx.font = `${42 * scale * (item.size || 1)}px serif`;
          ctx.fillText(item.content, 0, 0);
        } else {
          ctx.font = `bold ${18 * scale * (item.size || 1)}px ${item.fontFamily}`;
          ctx.strokeStyle = frame.isDark ? "black" : "white"; ctx.lineWidth = 4 * scale;
          ctx.strokeText(item.content, 0, 0); ctx.fillStyle = frame.isDark ? "white" : "black";
          ctx.fillText(item.content, 0, 0);
        }
        ctx.restore();
      }
    });

    ctx.fillStyle = frame.isDark ? "rgba(255,255,255,0.4)" : "rgba(161, 161, 170, 0.8)";
    ctx.font = `900 ${(isGrid ? 22 : 18) * (canvas.width / 400)}px sans-serif`; ctx.textAlign = "center";
    ctx.fillText(`❤ MY PHOTOBOX 2024`, canvas.width / 2, canvas.height - (40 * scale));

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a'); link.download = `PHBX-${Date.now()}.png`;
    link.href = dataUrl; link.click();
    setHistory([dataUrl, ...history].slice(0, 6));
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${darkMode ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <nav className={`sticky top-0 z-[100] backdrop-blur-md border-b transition-colors duration-500 ${darkMode ? 'bg-zinc-950/70 border-zinc-800' : 'bg-white/70 border-zinc-200'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-rose-500/20 text-white"><Camera size={20} /></div>
            <h1 className="font-black text-2xl tracking-tighter italic">Couple<span className="text-rose-500">Shoot</span></h1>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-2xl border transition-all ${darkMode ? 'bg-zinc-900 border-zinc-700 text-yellow-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 flex-grow">
        <div className="lg:col-span-8 space-y-8">
          <div className={`relative rounded-[3rem] overflow-hidden border-[12px] shadow-2xl bg-black aspect-[4/3] w-full max-w-[640px] mx-auto flex items-center justify-center transition-all ${darkMode ? 'border-zinc-900 shadow-rose-500/5' : 'border-white shadow-zinc-200'}`}>
            <Webcam ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={videoConstraints} className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${filter === 'bw' ? 'grayscale contrast-125' : filter === 'vintage' ? 'sepia-[.4] contrast-110' : filter === 'warm' ? 'saturate-150' : ''}`} />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
            {countdown && <div className="absolute text-white text-[10rem] font-black italic animate-bounce z-[60]">{countdown}</div>}
            {flash && <div className="absolute inset-0 bg-white z-50"></div>}
            {!isCapturing && (
              <div className="absolute bottom-8 flex gap-4 z-40">
                {photos.length < 4 ? (
                  <button onClick={startSession} className="bg-rose-500 text-white px-10 py-5 rounded-full font-black text-xl flex items-center gap-4 hover:scale-105 active:scale-95 shadow-xl shadow-rose-500/40 animate-pulse"><Zap size={24} className="fill-current" /> {photos.length > 0 ? 'RETAKE' : 'START BOOTH'}</button>
                ) : <div className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-full border border-white/30 font-bold">Max photos reached!</div>}
                <button onClick={() => fileInputRef.current.click()} className="bg-white/20 backdrop-blur-md text-white p-5 rounded-full hover:bg-white/40 border border-white/30 shadow-xl"><Upload size={24} /></button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-7 rounded-[2.5rem] border shadow-sm space-y-5 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-zinc-400"><LayoutGrid size={16}/> Layout & Filter</div>
              <div className={`flex gap-2 p-1 rounded-2xl ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                {['strip', 'grid'].map(l => <button key={l} onClick={() => setLayout(l)} className={`flex-1 py-2 rounded-xl font-bold capitalize transition-all ${layout === l ? (darkMode ? 'bg-zinc-700 shadow-lg' : 'bg-white shadow-sm') : 'text-zinc-400'}`}>{l}</button>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {['none', 'bw', 'vintage', 'warm'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${filter === f ? 'bg-rose-500 text-white border-rose-500' : (darkMode ? 'border-zinc-700 text-zinc-500' : 'border-zinc-200 text-zinc-400')}`}>{f}</button>)}
              </div>
            </div>
            <div className={`p-7 rounded-[2.5rem] border shadow-sm space-y-5 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-zinc-400"><Type size={16}/> Custom Text</div>
              <div className="flex gap-2 flex-wrap">{FONT_OPTIONS.map(font => <button key={font.id} onClick={() => setSelectedFont(font.family)} className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${selectedFont === font.family ? 'bg-rose-500 text-white border-rose-500' : 'border-zinc-200 opacity-60'}`} style={{ fontFamily: font.family }}>{font.name}</button>)}</div>
              <div className="flex gap-2">
                <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Type a message..." className={`flex-1 border-none rounded-xl px-4 py-3 text-sm outline-none transition-all ${darkMode ? 'bg-zinc-800 focus:bg-zinc-700' : 'bg-zinc-100 focus:bg-zinc-200'}`} style={{ fontFamily: selectedFont }} />
                <button onClick={() => { if(!inputText) return; setOverlays([...overlays, {id: Date.now(), type: 'text', content: inputText, fontFamily: selectedFont, size: 1, rotation: 0}]); setInputText(""); }} className="bg-rose-500 text-white p-3 rounded-xl hover:bg-rose-600 transition-all"><Plus size={20}/></button>
              </div>
            </div>
          </div>
          <div className={`p-7 rounded-[2.5rem] border shadow-sm ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-zinc-400 mb-5"><Smile size={16}/> Add Sticker</div>
            <div className="flex flex-wrap gap-4 max-h-40 overflow-y-auto p-4 rounded-2xl bg-zinc-500/5">
              {emojis.map((e, i) => <button key={i} onClick={() => setOverlays([...overlays, {id: Date.now(), type: 'sticker', content: e, size: 1, rotation: 0}])} className="text-3xl hover:scale-125 transition-transform">{e}</button>)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col items-center">
          <div className={`p-6 rounded-[2.5rem] mb-6 w-full ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-xl'}`}>
            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-zinc-400 mb-4"><Palette size={16}/> Frame Color</div>
            <div className="flex gap-4 items-center">
              {['#ffffff', '#18181b', '#ffcfd2', '#cfdbff'].map(c => <button key={c} onClick={() => setFrame({hex: c, isDark: c === '#18181b'})} className={`w-9 h-9 rounded-full border-4 transition-transform hover:scale-110 ${frame.hex === c ? 'border-rose-500 shadow-lg' : 'border-zinc-500/10'}`} style={{backgroundColor: c}} />)}
              <button onClick={() => setFrame({hex: `hsl(${Math.random()*360}, 70%, 85%)`, isDark: false})} className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-9 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-all hover:bg-rose-500 hover:text-white"><Wand2 size={12}/> Random</button>
            </div>
          </div>

          <div ref={stripRef} style={{ backgroundColor: frame.hex }} className={`relative p-4 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] transition-all duration-700 overflow-hidden border-t-[8px] border-white/10 ${layout === 'strip' ? 'w-[280px] min-h-[720px]' : 'w-[340px] min-h-[420px]'}`}>
            <div className={`grid gap-2 ${layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {photos.map((p, i) => (
                <div key={i} className="relative group">
                  <div className="w-full aspect-[4/3] overflow-hidden shadow-sm">
                    <img src={p} className={`w-full h-full object-cover transition-all duration-1000 ${filter === 'bw' ? 'grayscale' : filter === 'vintage' ? 'sepia-[.4]' : filter === 'warm' ? 'saturate-150' : ''}`} />
                  </div>
                  <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg"><Trash2 size={12}/></button>
                </div>
              ))}
              {Array.from({ length: 4 - photos.length }).map((_, n) => <div key={`empty-${n}`} className="w-full aspect-[4/3] bg-zinc-500/10 border-2 border-dashed border-zinc-500/20 flex items-center justify-center text-[8px] font-black text-zinc-400 tracking-widest uppercase">Slot {photos.length + n + 1}</div>)}
            </div>
            {overlays.map((item) => <DraggableOverlay key={item.id} item={item} frameColor={frame} onDelete={(id) => setOverlays(overlays.filter(o => o.id !== id))} onUpdate={updateOverlay} />)}
            <div className="mt-auto pt-10 pb-4 text-center">
              <div className={`flex flex-col items-center gap-2 ${frame.isDark ? 'text-white/40' : 'text-zinc-400'}`}>
                <Heart size={12} className={`${frame.isDark ? 'fill-white/20' : 'fill-zinc-200'}`} /><p className="text-[10px] font-bold uppercase tracking-[0.3em] leading-none">I Love You to the Moon</p><p className="text-[8px] font-medium opacity-60 tracking-widest mt-1">forever</p>
              </div>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="flex gap-2 w-full max-w-[340px]">
               <button onClick={() => { if(window.confirm("Reset all photos?")) setPhotos([]); }} className="mt-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 p-5 rounded-[2rem] hover:scale-105 transition-all"><RotateCcw size={22} /></button>
              <button onClick={downloadResult} disabled={photos.length < 4} className={`mt-10 flex-1 font-black py-5 rounded-[2rem] shadow-2xl transition-all flex items-center justify-center gap-3 ${photos.length < 4 ? 'bg-zinc-300 cursor-not-allowed text-zinc-500' : 'bg-zinc-950 dark:bg-rose-500 text-white hover:scale-105 active:scale-95'}`}>
                <Download size={22} /> {photos.length < 4 ? `NEED ${4-photos.length} MORE` : 'SAVE STRIP'}
              </button>
            </div>
          )}
        </div>
      </main>

      {history.length > 0 && (
        <div className={`max-w-7xl mx-auto mt-10 mb-20 p-8 rounded-[3rem] transition-colors ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-xl'}`}>
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-zinc-400 mb-8 px-4"><History size={16}/> History</div>
          <div className="flex gap-8 overflow-x-auto pb-6 px-4 scrollbar-hide">
            {history.map((h, i) => (
              <div key={i} className="relative group flex-shrink-0">
                <img src={h} className="h-52 rounded-2xl shadow-lg border-8 border-white dark:border-zinc-800 hover:rotate-2 transition-all duration-300" />
                <button onClick={() => setHistory(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-3 -right-3 bg-red-500 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER AREA - DATA PEMBUAT */}
      <footer className={`mt-auto py-12 px-6 border-t backdrop-blur-xl transition-all duration-500 ${darkMode ? 'bg-zinc-950/50 border-zinc-800 text-zinc-500' : 'bg-white/50 border-zinc-200 text-zinc-400'}`}>
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`h-[1px] w-12 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>
            <Code2 size={20} className="text-rose-500" />
            <div className={`h-[1px] w-12 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}></div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm font-medium tracking-wide flex items-center justify-center gap-1.5">
              Designed & Developed with <Heart size={14} className="text-rose-500 fill-rose-500 animate-pulse" /> by 
              <span className={`font-bold transition-colors cursor-pointer ${darkMode ? 'text-white hover:text-rose-500' : 'text-zinc-900 hover:text-rose-500'}`}>
                Anugrah Lan Pambudi
              </span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 font-black">
              © {new Date().getFullYear()} CoupleShoot Studio • All Rights Reserved
            </p>
          </div>

          <div className="flex gap-4">
            <button className={`p-2 rounded-full border transition-all hover:scale-110 ${darkMode ? 'border-zinc-800 bg-zinc-900 hover:text-white' : 'border-zinc-200 bg-zinc-50 hover:text-zinc-900'}`}>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}