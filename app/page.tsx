'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Flame, Dumbbell, Award, ThumbsUp, CheckCircle, AlertTriangle, Trophy, Check, X } from 'lucide-react';

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

interface LeaderboardUser {
  username: string;
  totalSesi: number;
  totalXP: number;
}

export default function FitPoinHome() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const [statsPersonal, setStatsPersonal] = useState({
    pushUp: 0,
    sitUp: 0,
    pullUp: 0,
    plankMenit: 0,
    lariSempurna: false, 
    lariBiasa: 0
  });

  const [form, setForm] = useState({
    username: '', 
    activityType: 'Lari',
    title: '',
    distance: '',
    duration: '',
    reps: ''
  });

  // Fitur Login Instan: Tarik nama dari localStorage saat web pertama dibuka
  useEffect(() => {
    const savedName = localStorage.getItem('fitpoin_user');
    if (savedName) {
      setForm(prev => ({ ...prev, username: savedName }));
    } else {
      setForm(prev => ({ ...prev, username: 'Ailum Mukhlish' }));
    }
  }, []);

  // Fungsi pintar untuk mendeteksi variasi nama lu (Ailum/ail)
  const isUserTarget = (name: string) => {
    const n = name.toLowerCase();
    return n.includes('ail') || n.includes('ailum');
  };

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/activities');
      const result = await res.json();
      if (result.success) {
        let dbData = result.data;
        
        if (dbData.length === 0) {
          dbData = [
            { _id: 'm1', username: 'Rian', activityType: 'Push Up', title: 'Push Up subuh brutal', distance: 0, duration: 10, reps: 50, kudosCount: 5, earnedXP: 520, createdAt: new Date(Date.now() - 3600000).toISOString() },
            { _id: 'm2', username: 'Fahmi', activityType: 'Lari', title: 'Mengejar matahari pagi', distance: 5, duration: 30, reps: 0, kudosCount: 3, earnedXP: 400, createdAt: new Date(Date.now() - 7200000).toISOString() },
            { _id: 'm3', username: 'Zaki', activityType: 'Plank', title: 'Nahan posisi plank', distance: 0, duration: 2, reps: 0, kudosCount: 2, earnedXP: 30, createdAt: new Date(Date.now() - 10800000).toISOString() },
          ];
        }

        setActivities(dbData);

        // 1. HITUNG PROGRESS DETAIL PERSONAL (Fleksibel nangkep "ail" & "Ailum Mukhlish")
        let pPush = 0, pSit = 0, pPull = 0, pPlank = 0, pLariSempurna = false, pLariBiasa = 0;

        dbData.forEach((act: ActivityItem) => {
          if (isUserTarget(act.username)) {
            if (act.activityType === 'Push Up') pPush += Number(act.reps || 0);
            if (act.activityType === 'Sit Up') pSit += Number(act.reps || 0);
            if (act.activityType === 'Pull Up') pPull += Number(act.reps || 0);
            if (act.activityType === 'Plank') pPlank += Number(act.duration || 0);
            if (act.activityType === 'Lari') {
              if (Number(act.distance || 0) >= 2.5 && Number(act.duration || 0) <= 15) {
                pLariSempurna = true;
              } else {
                pLariBiasa += 1;
              }
            }
          }
        });

        setStatsPersonal({
          pushUp: pPush,
          sitUp: pSit,
          pullUp: pPull,
          plankMenit: pPlank,
          lariSempurna: pLariSempurna,
          lariBiasa: pLariBiasa
        });

        // 2. LOGIKA KLASEMEN PERLOMBAAN
        const rekapKlasemen: { [key: string]: { totalSesi: number; totalXP: number } } = {};
        
        dbData.forEach((act: ActivityItem) => {
          if (!rekapKlasemen[act.username]) {
            rekapKlasemen[act.username] = { totalSesi: 0, totalXP: 0 };
          }
          rekapKlasemen[act.username].totalSesi += 1;
          rekapKlasemen[act.username].totalXP += act.earnedXP;
        });

        const urutanKlasemen = Object.keys(rekapKlasemen).map(nama => ({
          username: nama,
          totalSesi: rekapKlasemen[nama].totalSesi,
          totalXP: rekapKlasemen[nama].totalXP
        })).sort((a, b) => b.totalSesi - a.totalSesi || b.totalXP - a.totalXP);

        setLeaderboard(urutanKlasemen);
      }
    } catch (error) {
      console.error('Gagal mengambil timeline:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchFeed();
    };
    loadData().catch(console.error);
  }, [fetchFeed]);

  const SYARAT = { push: 50, sit: 50, pull: 50, plank: 1 };

  const checklistTerpenuhi = 
    (statsPersonal.pushUp >= SYARAT.push ? 1 : 0) +
    (statsPersonal.sitUp >= SYARAT.sit ? 1 : 0) +
    (statsPersonal.pullUp >= SYARAT.pull ? 1 : 0) +
    (statsPersonal.plankMenit >= SYARAT.plank ? 1 : 0) +
    (statsPersonal.lariSempurna ? 1 : 0);

  const persentaseProgress = Math.round((checklistTerpenuhi / 5) * 100);

  const hitungEstimasiXP = () => {
    const dist = Number(form.distance || 0);
    const dur = Number(form.duration || 0);
    const rp = Number(form.reps || 0);

    if (form.activityType === 'Lari') {
      return (dist * 50) + (dur * 5);
    } else if (form.activityType === 'Plank') {
      return dur * 15;
    } else {
      return (rp * 10) + (dur * 2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim()) {
      alert('Nama wajib diisi ya cuy!');
      return;
    }
    
    const payload = {
      ...form,
      distance: form.activityType === 'Lari' ? form.distance : '0',
      reps: ['Push Up', 'Sit Up', 'Pull Up'].includes(form.activityType) ? form.reps : '0'
    };

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert(result.message);
        
        // Simpan nama lu ke localStorage biar auto-login di masa depan
        localStorage.setItem('fitpoin_user', form.username);
        
        setForm({ ...form, title: '', distance: '', duration: '', reps: '' });
        await fetchFeed();
      } else {
        alert(result.message || 'Gagal menyimpan aktivitas');
      }
    } catch (error) {
      console.error('Error saat submit:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-4 md:p-8">
      <header className="max-w-5xl mx-auto flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <h1 className="text-3xl font-black tracking-tight text-orange-500">
          FIT<span className="text-white font-light">POIN</span>
        </h1>
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700">
          <Award className="w-5 h-5 text-yellow-400" />
          <span>Sistem Perlombaan: <span className="text-green-400 font-bold">Liga Fisik Fitpoin</span></span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto bg-[#1e293b] border border-slate-700 rounded-xl p-5 mb-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Checklist Target Fisik Mingguan (Ailum Mukhlish)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ketahui item latihan yang belum lu penuhi untuk mencapai kondisi fisik sempurna pekan ini.
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
            <span className="text-xs font-semibold text-slate-400 block mb-1">Push Up</span>
            <div className="text-sm font-black mb-1">{statsPersonal.pushUp} / {SYARAT.push} Reps</div>
            <div className="flex justify-center">{statsPersonal.pushUp >= SYARAT.push ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.sitUp >= SYARAT.sit ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Sit Up</span>
            <div className="text-sm font-black mb-1">{statsPersonal.sitUp} / {SYARAT.sit} Reps</div>
            <div className="flex justify-center">{statsPersonal.sitUp >= SYARAT.sit ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.pullUp >= SYARAT.pull ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Pull Up</span>
            <div className="text-sm font-black mb-1">{statsPersonal.pullUp} / {SYARAT.pull} Reps</div>
            <div className="flex justify-center">{statsPersonal.pullUp >= SYARAT.pull ? <Check className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}</div>
          </div>

          <div className={`p-3 rounded-lg border text-center ${statsPersonal.plankMenit >= SYARAT.plank ? 'bg-green-500/10 border-green-500/30' : 'bg-[#0f172a] border-slate-700'}`}>
            <span className="text-xs font-semibold text-slate-400 block mb-1">Plank</span>
            <div className="text-sm font-black mb-1">{statsPersonal.plankMenit} / {SYARAT.plank} Menit</div>
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

        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#1e293b] p-5 rounded-xl border-2 border-orange-500/30 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-slate-200">Klasemen Liga Latihan Pekan Ini</h2>
            </div>
            
            <div className="divide-y divide-slate-800">
              {leaderboard.map((user, index) => (
                <div key={user.username} className={`flex items-center justify-between py-2.5 ${isUserTarget(user.username) ? 'bg-orange-500/10 px-2 rounded-lg border border-orange-500/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center font-bold text-sm text-slate-400">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                    </span>
                    <span className={`text-sm font-bold ${isUserTarget(user.username) ? 'text-orange-400' : 'text-white'}`}>
                      {user.username} {isUserTarget(user.username) && '(Lu)'}
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
              ))}
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
                const isUserLariSempurna = act.activityType === 'Lari' && act.distance >= 2.5 && act.duration <= 15;
                
                return (
                  <div key={act._id} className="bg-[#1e293b] p-5 rounded-xl border border-slate-700 shadow-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className={`font-bold text-sm ${isUserTarget(act.username) ? 'text-orange-400' : 'text-blue-400'}`}>
                          {act.username} {isUserTarget(act.username) && '(Lu)'}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {new Date(act.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-[#0f172a] text-xs px-3 py-1 rounded-full border border-slate-600 font-semibold flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-orange-400" /> {act.activityType}
                        </span>
                        {isUserLariSempurna && (
                          <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-bounce">
                            🎯 Sempurna
                          </span>
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
                      <button className="text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-md text-slate-300 font-semibold">
                        <ThumbsUp className="w-3.5 h-3.5 text-orange-500" />
                        Beri Kudos ({act.kudosCount})
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