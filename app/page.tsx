'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Flame, Dumbbell, Award, ThumbsUp, CheckCircle, Trophy, Check, X, Trash2, CalendarDays } from 'lucide-react';

interface ActivityItem {
  _id: string;
  username: string;
  activityType: string;
  title: string;
  distance: number;
  duration: number;
  reps?: number;
  kudosCount: number;
  earnedXP: number;
  createdAt: string;
}

export default function FitPoinHome() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState('Ailum Mukhlish');
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [klasemenView, setKlasemenView] = useState<'pekan' | 'bulan'>('pekan');
  
  // State untuk Pop-Up Selebrasi Visual
  const [celebration, setCelebration] = useState<string | null>(null);

  // KETENTUAN TARGET BARU (Pull Up cukup 10)
  const SYARAT = { push: 50, sit: 50, pull: 10, plank: 1 };

  const [form, setForm] = useState({
    username: '', 
    activityType: 'Lari',
    title: '',
    distance: '',
    duration: '',
    reps: ''
  });

  useEffect(() => {
    const savedName = localStorage.getItem('fitpoin_user');
    if (savedName) {
      setForm(prev => ({ ...prev, username: savedName }));
      setCurrentUser(savedName);
    } else {
      setForm(prev => ({ ...prev, username: 'Ailum Mukhlish' }));
    }

    const savedLikes = JSON.parse(localStorage.getItem('fitpoin_likes') || '[]');
    setLikedPosts(savedLikes);
  }, []);

  const isMyPost = useCallback((name: string) => {
    if (!name || !currentUser) return false;
    return name.toLowerCase().trim() === currentUser.toLowerCase().trim();
  }, [currentUser]);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/activities');
      const result = await res.json();
      if (result.success) {
        const fixedData = result.data.map((act: ActivityItem) => {
          let rp = Number(act.reps || 0);
          if (rp === 0 && ['Push Up', 'Sit Up', 'Pull Up'].includes(act.activityType)) {
            const xp = Number(act.earnedXP || 0);
            const dur = Number(act.duration || 0);
            rp = Math.max(0, (xp - (dur * 2)) / 10);
          }
          return { ...act, reps: rp };
        });
        setActivities(fixedData);
      }
    } catch (error) {
      console.error('Gagal mengambil timeline:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const getStartOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const startOfWeek = getStartOfWeek();
  const startOfMonth = getStartOfMonth();

  const activitiesThisWeek = activities.filter(act => new Date(act.createdAt).getTime() >= startOfWeek);
  const activitiesThisMonth = activities.filter(act => new Date(act.createdAt).getTime() >= startOfMonth);

  // STATISTIK PROGRESS MINGGUAN USER AKTIF
  const userActivitiesThisWeek = activitiesThisWeek.filter(act => isMyPost(act.username));

  const statsPersonal = {
    pushUp: userActivitiesThisWeek.filter(a => a.activityType === 'Push Up').reduce((sum, a) => sum + Number(a.reps || 0), 0),
    sitUp: userActivitiesThisWeek.filter(a => a.activityType === 'Sit Up').reduce((sum, a) => sum + Number(a.reps || 0), 0),
    pullUp: userActivitiesThisWeek.filter(a => a.activityType === 'Pull Up').reduce((sum, a) => sum + Number(a.reps || 0), 0),
    plankMenit: userActivitiesThisWeek.filter(a => a.activityType === 'Plank').reduce((sum, a) => sum + Number(a.duration || 0), 0),
    lariSempurna: userActivitiesThisWeek.some(a => a.activityType === 'Lari' && Number(a.distance || 0) >= 2.5 && Number(a.duration || 0) <= 15),
    lariBiasa: userActivitiesThisWeek.filter(a => a.activityType === 'Lari' && !(Number(a.distance || 0) >= 2.5 && Number(a.duration || 0) <= 15)).length
  };

  const checklistTerpenuhi = 
    (statsPersonal.pushUp >= SYARAT.push ? 1 : 0) +
    (statsPersonal.sitUp >= SYARAT.sit ? 1 : 0) +
    (statsPersonal.pullUp >= SYARAT.pull ? 1 : 0) +
    (statsPersonal.plankMenit >= SYARAT.plank ? 1 : 0) +
    (statsPersonal.lariSempurna ? 1 : 0);

  const persentaseProgress = Math.round((checklistTerpenuhi / 5) * 100);

  // KLASEMEN & FIRE STREAK LOGIC
  const dataForKlasemen = klasemenView === 'pekan' ? activitiesThisWeek : activitiesThisMonth;
  const rekapKlasemen: { [key: string]: { totalSesi: number; totalXP: number; } } = {};
  
  dataForKlasemen.forEach(act => {
    if (!rekapKlasemen[act.username]) {
      rekapKlasemen[act.username] = { totalSesi: 0, totalXP: 0 };
    }
    rekapKlasemen[act.username].totalSesi += 1;
    rekapKlasemen[act.username].totalXP += Number(act.earnedXP || 0);
  });

  const leaderboard = Object.keys(rekapKlasemen).map(nama => {
    const userActs = dataForKlasemen.filter(act => act.username === nama);

    // LOGIKA STREAK API: Dihitung per 1 Sesi Masuk tanpa dicicil (Pull Up jadi >= 10)
    let fireCount = 0;
    if (userActs.some(a => a.activityType === 'Push Up' && Number(a.reps) >= 50)) fireCount++;
    if (userActs.some(a => a.activityType === 'Sit Up' && Number(a.reps) >= 50)) fireCount++;
    if (userActs.some(a => a.activityType === 'Pull Up' && Number(a.reps) >= 10)) fireCount++;
    if (userActs.some(a => a.activityType === 'Plank' && Number(a.duration) >= 1)) fireCount++;
    if (userActs.some(a => a.activityType === 'Lari' && Number(a.distance) >= 2.5 && Number(a.duration) <= 15)) fireCount++;

    return {
      username: nama,
      totalSesi: rekapKlasemen[nama].totalSesi,
      totalXP: rekapKlasemen[nama].totalXP,
      fireCount
    };
  }).sort((a, b) => b.totalXP - a.totalXP || b.totalSesi - a.totalSesi);

  const hitungEstimasiXP = () => {
    const dist = Number(form.distance || 0);
    const dur = Number(form.duration || 0);
    const rp = Number(form.reps || 0);

    if (form.activityType === 'Lari') return (dist * 50) + (dur * 5);
    if (form.activityType === 'Plank') return dur * 15;
    return (rp * 10) + (dur * 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      alert('Nama wajib diisi ya cuy!');
      return;
    }

    // Catat angka sebelum di-submit untuk trigger deteksi selebrasi box full
    const inputReps = Number(form.reps || 0);
    const inputDuration = Number(form.duration || 0);
    const inputDistance = Number(form.distance || 0);
    const type = form.activityType;

    const payload = {
      username: form.username,
      activityType: type,
      title: form.title,
      duration: inputDuration,
      distance: type === 'Lari' ? inputDistance : 0,
      reps: ['Push Up', 'Sit Up', 'Pull Up'].includes(type) ? inputReps : 0
    };

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // CEK APAKAH INPUTAN BARU INI MEMBUAT TARGET BOX JADI FULL TERISI
        let pesanSelebrasi = null;

        if (type === 'Push Up' && statsPersonal.pushUp < 50 && (statsPersonal.pushUp + inputReps) >= 50) {
          pesanSelebrasi = "💪 SELEBRASI! Target Push Up 50/50 Selesai Terpenuhi!";
        } else if (type === 'Sit Up' && statsPersonal.sitUp < 50 && (statsPersonal.sitUp + inputReps) >= 50) {
          pesanSelebrasi = "🧘‍♂️ SELEBRASI! Target Sit Up 50/50 Selesai Terpenuhi!";
        } else if (type === 'Pull Up' && statsPersonal.pullUp < 10 && (statsPersonal.pullUp + inputReps) >= 10) {
          pesanSelebrasi = "🏋️‍♂️ SELEBRASI! Target Pull Up 10/10 Selesai Terpenuhi!";
        } else if (type === 'Plank' && statsPersonal.plankMenit < 1 && (statsPersonal.plankMenit + inputDuration) >= 1) {
          pesanSelebrasi = "⚡ SELEBRASI! Target Plank 1 Menit Selesai Terpenuhi!";
        } else if (type === 'Lari' && !statsPersonal.lariSempurna && inputDistance >= 2.5 && inputDuration <= 15) {
          pesanSelebrasi = "🏃‍♂️ SELEBRASI! Target Jarak Lari Sempurna Terpenuhi!";
        }

        // Jika semua target mingguan jadi 5/5 berkat inputan ini
        const currentCheckboxesDone = 
          (statsPersonal.pushUp >= SYARAT.push ? 1 : 0) +
          (statsPersonal.sitUp >= SYARAT.sit ? 1 : 0) +
          (statsPersonal.pullUp >= SYARAT.pull ? 1 : 0) +
          (statsPersonal.plankMenit >= SYARAT.plank ? 1 : 0) +
          (statsPersonal.lariSempurna ? 1 : 0);

        if (currentCheckboxesDone === 4 && pesanSelebrasi !== null) {
          pesanSelebrasi = "🏆 GOKIL COMBO Sempurna! Semua Target Mingguan Habis Dibabat!";
        }

        if (pesanSelebrasi) {
          setCelebration(pesanSelebrasi);
        } else {
          alert(result.message);
        }

        localStorage.setItem('fitpoin_user', form.username);
        setCurrentUser(form.username); 
        setForm({ ...form, title: '', distance: '', duration: '', reps: '' });
        
        setTimeout(() => { fetchFeed(); }, 500);
      } else {
        alert(result.message || 'Gagal menyimpan aktivitas');
      }
    } catch (error) {
      console.error('Error saat submit:', error);
    }
  };

  const handleKudos = async (id: string, currentKudos: number) => {
    if (likedPosts.includes(id)) {
      return alert('Sabar cuy, lu udah ngasih jempol ke aktivitas ini!');
    }
    setActivities(prev => prev.map(act => act._id === id ? { ...act, kudosCount: currentKudos + 1 } : act));
    const newLikes = [...likedPosts, id];
    setLikedPosts(newLikes);
    localStorage.setItem('fitpoin_likes', JSON.stringify(newLikes));
    try {
      await fetch('/api/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (error) { console.error(error); }
  };

  const handleDeleteActivity = async (id: string) => {
    const konfirmasi = confirm("Serius mau hapus sesi latihan ini dari liga, cuy?");
    if (!konfirmasi) return;
    setActivities(prev => prev.filter(act => act._id !== id));
    try {
      const res = await fetch(`/api/activities?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) await fetchFeed();
      else alert(result.message);
    } catch (error) { console.error(error); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-4 md:p-8">
      
      {/* CSS STYLE UNTUK ANIMASI STREAK API & POPUP */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes burn {
          0% { transform: translateY(0) rotate(-10deg) scale(1); filter: drop-shadow(0 0 2px rgba(255,100,0,0.5)); }
          50% { transform: translateY(-3px) rotate(10deg) scale(1.25); filter: drop-shadow(0 0 10px rgba(255,68,0,0.8)); }
          100% { transform: translateY(0) rotate(-10deg) scale(1); filter: drop-shadow(0 0 2px rgba(255,100,0,0.5)); }
        }
        .fire-icon { 
          animation: burn 0.7s infinite ease-in-out; 
          display: inline-block; 
        }
        @keyframes popUp {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .celebration-box {
          animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />

      {/* OVERLAY SELEBRASI POPUP VISUAL */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
           <div className="celebration-box bg-[#1e293b] p-8 rounded-2xl border-4 border-orange-500 shadow-[0_0_60px_rgba(249,115,22,0.6)] text-center max-w-md mx-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-green-500"></div>
              <span className="text-7xl mb-3 block animate-bounce">🎉</span>
              <h2 className="text-2xl font-black text-white leading-snug mb-2">{celebration}</h2>
              <p className="text-sm text-slate-400 mb-6">Kerja keras lu kebukti di liga pekan ini. Respek, cuy!</p>
              <button 
                onClick={() => setCelebration(null)} 
                className="w-full bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all px-6 py-3 rounded-xl font-bold shadow-md"
              >
                Lanjut Bakar Kalori!
              </button>
           </div>
        </div>
      )}

      <header className="max-w-5xl mx-auto flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <h1 className="text-3xl font-black tracking-tight text-orange-500">
          FIT<span className="text-white font-light">POIN</span>
        </h1>
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700">
          <Award className="w-5 h-5 text-yellow-400" />
          <span>Sistem Perlombaan: <span className="text-green-400 font-bold">Liga Fisik Fitpoin</span></span>
        </div>
      </header>

      {/* BOX CHECKLIST MINGGUAN DENGAN LABELS TOTAL REPS */}
      <section className="max-w-5xl mx-auto bg-[#1e293b] border border-slate-700 rounded-xl p-5 mb-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Target Perulangan & Repetisi Mingguan ({currentUser})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Skor akumulasi ini otomatis ter-reset setiap hari Senin jam 00:00.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Target Sempurna</span>
            <span className="text-xl font-black text-orange-500">{checklistTerpenuhi} / 5 Done ({persentaseProgress}%)</span>
          </div>
        </div>

        <div className="w-full bg-[#0f172a] rounded-full h-3 border border-slate-800 overflow-hidden mb-5">
          <div 
            className="bg-gradient-to-r from-red-500 via-orange-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${persentaseProgress}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className={`p-3 rounded-lg border text-center ${statsPersonal.pushUp >= SYARAT.push ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Push Up (Total Reps)</span>
            <div className="text-sm font-black mb-1">{statsPersonal.pushUp} / {SYARAT.push}</div>
            <div className="flex justify-center">{statsPersonal.pushUp >= SYARAT.push ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.sitUp >= SYARAT.sit ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Sit Up (Total Reps)</span>
            <div className="text-sm font-black mb-1">{statsPersonal.sitUp} / {SYARAT.sit}</div>
            <div className="flex justify-center">{statsPersonal.sitUp >= SYARAT.sit ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.pullUp >= SYARAT.pull ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Pull Up (Total Reps)</span>
            <div className="text-sm font-black mb-1">{statsPersonal.pullUp} / {SYARAT.pull}</div>
            <div className="flex justify-center">{statsPersonal.pullUp >= SYARAT.pull ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.plankMenit >= SYARAT.plank ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Plank (Durasi Sesi)</span>
            <div className="text-sm font-black mb-1">{statsPersonal.plankMenit} / {SYARAT.plank} Min</div>
            <div className="flex justify-center">{statsPersonal.plankMenit >= SYARAT.plank ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.lariSempurna ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Lari Sempurna</span>
            <div className="text-[10px] text-slate-400 leading-tight mb-1">
              {statsPersonal.lariSempurna ? '2.5KM under 15 Min Done!' : `Belum Terpenuhi (${statsPersonal.lariBiasa} Sesi Biasa)`}
            </div>
            <div className="flex justify-center">{statsPersonal.lariSempurna ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORM INPUT BARU */}
        <div className="md:col-span-1 bg-[#1e293b] p-6 rounded-xl border border-slate-700 h-fit shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-slate-200">Catat Progress Fisik</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Nama Lengkap</label>
              <input 
                type="text" required placeholder="Masukkan nama lu"
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                value={form.username} onChange={e => setForm({...form, username: e.target.value})}
              />
              <p className="text-[10px] text-slate-500 mt-1">*Nama akan tersimpan otomatis untuk sesi berikutnya.</p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Nama Sesi / Judul</label>
              <input 
                type="text" required placeholder="Contoh: Push up set ke-2 sore hari"
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Jenis Latihan</label>
              <select 
                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                value={form.activityType} onChange={e => setForm({...form, activityType: e.target.value, distance: '', reps: ''})}
              >
                <option value="Lari">Lari 🏃‍♂️</option>
                <option value="Push Up">Push Up 💪</option>
                <option value="Sit Up">Sit Up 🧘‍♂️</option>
                <option value="Pull Up">Pull Up 🏋️‍♂️</option>
                <option value="Plank">Plank ⚡</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {form.activityType === 'Lari' ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Jarak (KM)</label>
                  <input 
                    type="number" step="0.1" required placeholder="0"
                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    value={form.distance} onChange={e => setForm({...form, distance: e.target.value})}
                  />
                </div>
              ) : ['Push Up', 'Sit Up', 'Pull Up'].includes(form.activityType) ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">Jumlah (Reps)</label>
                  <input 
                    type="number" required placeholder="0"
                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    value={form.reps} onChange={e => setForm({...form, reps: e.target.value})}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Stat Latihan</label>
                  <div className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-500 font-semibold select-none">
                    Dihitung Waktu
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Durasi (Menit)</label>
                <input 
                  type="number" required placeholder="0"
                  className="w-full bg-[#0f172a] border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-[#0f172a] border border-orange-500/20 p-3 rounded-lg text-xs flex justify-between items-center text-slate-300">
              <span>Estimasi FitPoin didapat:</span>
              <span className="font-bold text-green-400 text-sm">
                +{hitungEstimasiXP()} XP
              </span>
            </div>

            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg text-sm mt-2 shadow-md">
              Simpan & Tarung Klasemen
            </button>
          </form>
        </div>

        {/* REKAP KLASEMEN & TIMELINE */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#1e293b] p-5 rounded-xl border-2 border-orange-500/30 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-bold text-slate-200">Klasemen Liga Latihan</h2>
              </div>
              
              <div className="flex bg-[#0f172a] rounded-lg p-1 border border-slate-700">
                <button 
                  onClick={() => setKlasemenView('pekan')}
                  className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all ${klasemenView === 'pekan' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Pekan Ini
                </button>
                <button 
                  onClick={() => setKlasemenView('bulan')}
                  className={`text-xs px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1 ${klasemenView === 'bulan' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <CalendarDays size={12} /> Bulan Ini
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-slate-800">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada aktivitas di periode ini. Gaskeun cuy!</p>
              ) : (
                leaderboard.map((user, index) => {
                  const isMeKlasemen = isMyPost(user.username);
                  return (
                    <div key={user.username} className={`flex items-center justify-between py-2.5 ${isMeKlasemen ? 'bg-orange-500/10 px-2 rounded-lg border border-orange-500/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-sm text-slate-400">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </span>
                        
                        <span className={`text-sm font-bold flex items-center gap-1 ${isMeKlasemen ? 'text-orange-400' : 'text-white'}`}>
                          {user.username} {isMeKlasemen && '(Lu)'}
                          {user.fireCount > 0 && (
                            <span className="flex gap-0.5 ml-1">
                              {[...Array(user.fireCount)].map((_, i) => (
                                <span key={i} className="fire-icon text-base" style={{ animationDelay: `${i * 0.15}s` }}>🔥</span>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <span className="text-xs text-slate-400 block">Sesi</span>
                          <span className="text-sm font-black text-white">{user.totalSesi} Sesi</span>
                        </div>
                        <div className="w-20">
                          <span className="text-xs text-slate-400 block">Poin</span>
                          <span className="text-sm font-black text-green-400">+{user.totalXP} XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-slate-200">Linimasa Aktivitas Circle</h2>
            </div>
            
            {loading ? (
              <p className="text-slate-500 text-sm animate-pulse">Memuat linimasa...</p>
            ) : (
              activities.map((act) => {
                const isLiked = likedPosts.includes(act._id);
                const isMeFeed = isMyPost(act.username);

                const rp = Number(act.reps || 0);
                const dur = Number(act.duration || 0);
                const dist = Number(act.distance || 0);

                const isNoCicilPush = act.activityType === 'Push Up' && rp >= 50;
                const isNoCicilSit = act.activityType === 'Sit Up' && rp >= 50;
                const isNoCicilPull = act.activityType === 'Pull Up' && rp >= 10;
                const isNoCicilPlank = act.activityType === 'Plank' && dur >= 1;
                const isLariSempurna = act.activityType === 'Lari' && dist >= 2.5 && dur <= 15;

                const isSavageMode = isNoCicilPush || isNoCicilSit || isNoCicilPull || isNoCicilPlank || isLariSempurna;

                return (
                  <div key={act._id} className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className={`font-bold text-sm ${isMeFeed ? 'text-orange-400' : 'text-blue-400'}`}>
                          {act.username} {isMeFeed && '(Lu)'}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {new Date(act.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#0f172a] text-xs px-3 py-1 rounded-full border border-slate-600 font-semibold flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-orange-400" /> {act.activityType}
                        </span>
                        
                        {isSavageMode && (
                          <span className="bg-red-500/20 text-red-400 border border-green-500/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                            <span className="fire-icon text-xs">🔥</span> {act.activityType === 'Lari' ? 'SEMPURNA' : 'NO CICIL'}
                          </span>
                        )}

                        {isMeFeed && (
                          <button 
                            onClick={() => handleDeleteActivity(act._id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-md bg-slate-800/50 hover:bg-red-500/10 border border-slate-700/50 transition-all ml-1"
                            title="Hapus Sesi Latihan"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-bold mb-3 text-white">{`"${act.title}"`}</h4>
                    
                    <div className="grid grid-cols-3 gap-2 bg-[#0f172a] p-3 rounded-lg border border-slate-800 text-center mb-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                          {act.activityType === 'Lari' ? 'Jarak' : act.activityType === 'Plank' ? 'Target' : 'Volume'}
                        </div>
                        <div className="text-base font-black text-white">
                          {act.activityType === 'Lari' ? `${act.distance} KM` : act.activityType === 'Plank' ? 'Isometric' : `${act.reps || 0} Reps`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Waktu</div>
                        <div className="text-base font-black text-white">{act.duration} <span className="text-xs font-normal text-slate-400">Min</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Hadiah</div>
                        <div className="text-base font-black text-green-400">+{act.earnedXP} <span className="text-xs font-normal text-slate-400">XP</span></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <button 
                        onClick={() => handleKudos(act._id, act.kudosCount)}
                        className={`text-xs flex items-center gap-1.5 px-3 py-2 rounded-md font-semibold transition-all ${isLiked ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'text-orange-500' : 'text-slate-400'}`} />
                        {isLiked ? 'Jempol Diberikan' : 'Beri Kudos'} ({act.kudosCount})
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}