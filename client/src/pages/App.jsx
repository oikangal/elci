// client/src/pages/App.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Podium from '../components/Podium'

/* ---------------- Basit & Güvenli Avatar ---------------- */
function Avatar({ src, alt = '', size = 40, ringClass = '' }) {
  const [err, setErr] = useState(false)
  const initials = (alt || '?')
    .split(' ')
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const cls = `rounded-full object-cover ${ringClass}`

  if (!err && src) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cls}
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
        style={{ width: size, height: size }}
      />
    )
  }

  // Fallback: harfli renkli daire
  return (
    <div
      aria-label={alt}
      className={cls + ' flex items-center justify-center text-white font-semibold'}
      style={{
        width: size,
        height: size,
        background:
          'linear-gradient(135deg, rgba(217,70,239,1) 0%, rgba(147,51,234,1) 100%)',
      }}
    >
      <span style={{ fontSize: Math.max(12, Math.floor(size * 0.4)) }}>{initials}</span>
    </div>
  )
}

/* ---------------- Reusable Modal ---------------- */
function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Kapat"
      />
      {/* sheet/card */}
      <div className="relative w-full sm:max-w-md sm:rounded-2xl bg-white shadow-xl p-4 sm:p-6 z-10">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-extrabold text-fuchsia-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-pink-200 text-fuchsia-600 text-sm font-extrabold shadow-soft active:scale-95"
            title="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="mt-3 max-h-[70vh] overflow-auto pr-1">{children}</div>
        <div className="mt-4">
          <button onClick={onClose} className="btn btn-primary w-full">Anladım</button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Leaderboard ---------------- */
function Leaderboard({ onGoAmbassador }){
  const [list, setList] = useState([])
  const [endDate, setEndDate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Kurallar modal state
  const [showRules, setShowRules] = useState(false)

  useEffect(()=>{
    let cancel = false
    const load = async () => {
      try {
        setLoading(true); setError(null)
        const [lb, cfg] = await Promise.all([
          api.get('/leaderboard').then(r=>r.data),
          api.get('/config').then(r=>r.data),
        ])
        if (cancel) return
        setList(Array.isArray(lb) ? lb : [])
        setEndDate(cfg?.endDate || null)
      } catch (e) {
        if (!cancel) setError('Veri alınamadı. Server (4000) açık mı?')
        console.error(e)
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5000)
    return ()=>{ cancel = true; clearInterval(t) }
  },[])

  const top3  = list.slice(0,3)
  const rest  = list.slice(3)

  const daysLeft = useMemo(()=>{
    if (!endDate) return null
    const end = new Date(endDate)
    end.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)
    const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000)
    return Math.max(diff, 0)
  }, [endDate])

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold text-fuchsia-800 text-center">Elçi Liderlik</h1>

      <div className="mt-8">
        <Podium top3={top3} />
      </div>

      <div className="mt-6 space-y-3">
        {rest.map((a, i)=>(
          <div key={a.id} className="px-5 py-3 rounded-full bg-white shadow-soft border border-pink-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={a.avatar} alt={a.name} size={40} ringClass="ring-2 ring-fuchsia-200" />
                <div className="text-sm font-semibold text-fuchsia-900">{i + 4}. {a.name}</div>
              </div>
              <div className="text-xs font-semibold text-fuchsia-600">{a.total} puan</div>
            </div>
          </div>
        ))}

        {loading && <div className="text-center text-xs text-fuchsia-500">Yükleniyor…</div>}

        <button type="button" className="btn btn-primary w-full mt-6" onClick={onGoAmbassador}>
          Elçiler için Giriş
        </button>

        {/* Oyun Kuralları butonu */}
        <button
          type="button"
          className="btn w-full mt-2 border border-pink-200 text-fuchsia-700"
          onClick={() => setShowRules(true)}
        >
          Oyun Kuralları
        </button>

        {/* Kurallar Modal */}
        <Modal open={showRules} onClose={()=>setShowRules(false)} title="TagsForever Elçilik Programı – Kurallar Kitapçığı">
          {/* 1. Programın Amacı */}
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-fuchsia-800">1. Programın Amacı</h4>
            <p className="text-sm text-fuchsia-900">
              TagsForever Elçilik Programı, paylaşımlar ve alışverişler üzerinden puan kazanma esasına dayalıdır. Katılımcılar (elçiler), günlük yapacakları içerik paylaşımları ve alışverişlerle puan toplayarak dönem sonunda ödüller ve alışveriş kuponları kazanırlar.
            </p>
          </section>

          {/* 2. Günlük Puanlama Sistemi */}
          <section className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-fuchsia-800">2. Günlük Puanlama Sistemi</h4>
            <p className="text-sm text-fuchsia-900">Her gün maksimum <strong>300 puan</strong> kazanılabilir. Puanlar şu şekilde dağıtılır:</p>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>📸 1 Story: <strong>50</strong> puan</li>
              <li>🎥 1 Post ya da Reels: <strong>100</strong> puan</li>
              <li>🛒 1 Set Alımı: <strong>150</strong> puan</li>
            </ul>
            <div className="mt-2 p-3 rounded-xl bg-pink-50 border border-pink-100 text-[13px] text-fuchsia-800">
              <p className="font-semibold mb-1">⚠️ Kurallar:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Aynı gün içinde birden fazla story veya post/reels paylaşılırsa yalnızca <strong>1 story + 1 post/reels</strong> dikkate alınır.</li>
                <li>Aynı gün birden fazla set alınsa bile o gün için sadece <strong>1 set</strong> puanı eklenir.</li>
              </ul>
            </div>
          </section>

          {/* 3. Program Süresi ve Ödüller */}
          <section className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-fuchsia-800">3. Program Süresi ve Ödüller</h4>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Program belirlenen süre boyunca devam eder.</li>
              <li>Süre bitiminde tüm elçilerin topladığı puanlar <strong>kupona</strong> dönüştürülür.</li>
            </ul>

            <p className="text-sm text-fuchsia-900 font-semibold mt-2">Dönem sonu ekstra ödüller:</p>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>🥇 1. olan: <strong>3000 TL</strong> ek ödül</li>
              <li>🥈 2. olan: <strong>1500 TL</strong> ek ödül</li>
              <li>🥉 3. olan: <strong>750</strong> ek puan</li>
            </ul>

            <p className="text-sm text-fuchsia-900 font-semibold mt-2">🎁 Kupon Kullanımı:</p>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Kazanılan puan = kazanılan kupon (ör. 3000 puan = 3000 TL harcama hakkı).</li>
              <li>Kuponlar yalnızca <strong>tagsforever.com</strong> sitesinde geçerlidir.</li>
              <li>Kuponlarla yapılan alışverişlerde “2. ürüne %50 indirim” ve “çark indirimi” kampanyaları geçerli değildir.</li>
              <li>Kuponlar başka kampanyalarla birleştirilemez.</li>
            </ul>
          </section>

          {/* 4. Paylaşım Kuralları */}
          <section className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-fuchsia-800">4. Paylaşım Kuralları</h4>
            <p className="text-sm text-fuchsia-900">Paylaşımlar puan kazanabilmek için aşağıdaki kurallara uymalıdır:</p>

            <p className="text-sm text-fuchsia-900 font-semibold">Etiketleme Zorunluluğu:</p>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Paylaşımlarda mutlaka <strong>#tagsforever</strong> etiketi kullanılmalı ve <strong>@tr.tagsforever</strong> hesabı etiketlenmelidir.</li>
            </ul>

            <p className="text-sm text-fuchsia-900 font-semibold mt-2">Kampanya Vurgusu:</p>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Story, post veya reels’lerde “<strong>2. ürüne %50 indirim</strong>” ve “<strong>çark indirimi</strong>”nden bahsedilmelidir.</li>
            </ul>

            <p className="text-sm text-fuchsia-900 font-semibold mt-2">İçerik Şartları:</p>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Videolu paylaşımlar minimum <strong>5 saniye</strong> olmalıdır.</li>
              <li>Paylaşımlarda mutlaka <strong>TagsForever ürünü</strong> görünmelidir.</li>
              <li>Elçi kendi video/fotoğraf üretmediği durumlarda, TagsForever hesabından göze hoş gelen içerikleri paylaşabilir.</li>
              <li>Paylaşılan post &amp; reels içerikleri, program bitene kadar elçinin hesabında kalmalıdır. Aksi halde ilgili paylaşımın puanı <strong>silinir</strong>.</li>
            </ul>
            <div className="mt-2 p-3 rounded-xl bg-pink-50 border border-pink-100 text-[13px] text-fuchsia-800">
              ⚠️ Yukarıdaki şartları taşımayan paylaşımlar puanlanmaz.
            </div>
          </section>

          {/* 5. Puan Takibi */}
          <section className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-fuchsia-800">5. Puan Takibi</h4>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Elçiler, kendilerine verilen kullanıcı adı ve şifreyle giriş yaptıkları ekrandan günlük puanlarını görebilir.</li>
              <li>Puanların işlenip işlenmediğini kontrol etmek elçinin sorumluluğundadır.</li>
              <li>İşlenmediğini düşündüğü puan için elçi, geçmişe dönük <strong>kanıt</strong> sunmak zorundadır.</li>
            </ul>
          </section>

          {/* 6. Programın Yönetimi */}
          <section className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-fuchsia-800">6. Programın Yönetimi</h4>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>TagsForever, elçilik programını her an sonlandırma hakkını saklı tutar.</li>
              <li>Program sona ermeden kendi isteğiyle çıkan elçinin tüm puanları <strong>silinir</strong>.</li>
            </ul>
          </section>

          {/* 7. Özet */}
          <section className="space-y-2 mt-4">
            <h4 className="text-sm font-bold text-fuchsia-800">7. Özet</h4>
            <ul className="list-disc pl-5 text-sm text-fuchsia-900 space-y-1">
              <li>Günlük maksimum <strong>300 puan</strong> kazanılabilir.</li>
              <li>Paylaşımlar net kurallara uymalıdır.</li>
              <li>Süre sonunda tüm elçiler puanlarını <strong>kupon</strong> olarak alır.</li>
              <li>İlk 3’e girenler <strong>ek ödül</strong> kazanır.</li>
              <li>Etiket ve kampanya vurgusu <strong>zorunludur</strong>.</li>
              <li>Puan takibi elçilerin sorumluluğundadır.</li>
              <li>Paylaşımlarda ürünün görünmesi ve içeriklerin hesapta program bitimine kadar kalması şarttır.</li>
            </ul>
          </section>
        </Modal>

        <div className="mt-6 text-center">
          <div className="text-sm font-semibold text-fuchsia-700 mb-3">Bitişe Kalan Gün</div>
          <div className="mx-auto w-28 h-28 rounded-full bg-white border border-pink-200 shadow-soft flex items-center justify-center">
            {endDate ? (
              <div className="text-center leading-tight">
                <div className="text-3xl font-extrabold text-fuchsia-800">{daysLeft}</div>
                <div className="text-xs font-semibold text-fuchsia-500 mt-1">gün</div>
              </div>
            ) : (
              <div className="text-xs font-semibold text-fuchsia-400">Tarih yok</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- AdminGate (şifre ekranı) ---------------- */
function AdminGate({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e?.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      const res = await api.post('/login', { role: 'admin', password }).then(r=>r.data)
      if (res?.ok) {
        sessionStorage.setItem('amba_admin_authed', '1')
        onSuccess?.()
      } else {
        setErr('Giriş başarısız')
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h2 className="text-xl font-extrabold text-fuchsia-800 text-center">Admin Girişi</h2>
      <form onSubmit={submit} className="card mt-4">
        <label className="text-xs font-semibold text-fuchsia-700">Şifre</label>
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          className="mt-2 w-full border rounded-xl px-3 py-2"
          placeholder="Admin şifresini gir"
          autoFocus
        />
        {err && <div className="text-xs text-red-500 mt-2">{err}</div>}
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={loading} className="btn btn-primary flex-1">
            {loading ? 'Kontrol ediliyor...' : 'Giriş'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ---------------- Admin (korumalı) ---------------- */
function AdminInner(){
  const [date, setDate] = useState(()=> new Date().toISOString().slice(0,10))
  const [items, setItems] = useState([])
  const [endDate, setEndDate] = useState('')

  // Elçi ekleme formu
  const [newAmb, setNewAmb] = useState({ name: '', username: '', pin: '', avatar: '' })
  const [saving, setSaving] = useState(false)

  // Manuel puan düzeltme inputları (kart başına) — sadece tek kutu
  const [adj, setAdj] = useState({}) // { [ambId]: '300' veya '-250' }

  const setAdjValue = (id, value) => {
    setAdj(prev => ({ ...prev, [id]: value }))
  }

  const applyAdjust = async (id) => {
    const dRaw = adj[id]
    const d = Number(dRaw)
    if (!Number.isFinite(d) || d === 0) {
      alert('Pozitif veya negatif puan (ör. 300 ya da -250) giriniz.')
      return
    }
    try{
      await api.post('/admin/adjust', {
        ambassadorId: id,
        delta: d
      })
      // sıfırla + yenile
      setAdj(prev => ({ ...prev, [id]: '' }))
      await load()
    }catch(err){
      alert(err.response?.data?.error || 'Düzeltme kaydedilemedi')
    }
  }

  const load = async () => {
    const list = await api.get('/admin/ambassadors', { params: { date } }).then(r=>r.data)
    setItems(list)
    const cfg = await api.get('/config').then(r=>r.data)
    setEndDate(cfg.endDate || '')
  }
  useEffect(()=>{ load() }, [date])

  const mark   = async (id, type) => { try{ await api.post('/admin/mark',   { ambassadorId:id, date, type }); load() }catch(e){ alert(e.response?.data?.error || 'Hata') } }
  const unmark = async (id, type) => { try{ await api.post('/admin/unmark', { ambassadorId:id, date, type }); load() }catch(e){ alert(e.response?.data?.error || 'Hata') } }
  const saveEndDate = async () => { await api.post('/admin/end-date', { date: endDate || null }); load() }

  // Dosyadan foto yükle (base64 data URL olarak kaydet)
  const onPickAvatar = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setNewAmb(v => ({ ...v, avatar: String(reader.result || '') }))
    reader.readAsDataURL(file)
  }

  const addAmbassador = async (e) => {
    e?.preventDefault()
    const payload = {
      name: (newAmb.name || '').trim(),
      username: (newAmb.username || '').trim(),
      pin: (newAmb.pin || '').trim(),
      avatar: (newAmb.avatar || '').trim(), // URL veya dataURL olabilir
    }
    if (!payload.name || !payload.username || !payload.pin) {
      alert('İsim, kullanıcı adı ve PIN zorunlu.')
      return
    }
    try{
      setSaving(true)
      await api.post('/admin/ambassador', payload)
      setNewAmb({ name:'', username:'', pin:'', avatar:'' })
      await load()
    }catch(err){
      alert(err.response?.data?.error || 'Elçi eklenemedi')
    }finally{
      setSaving(false)
    }
  }

  const removeAmbassador = async (id) => {
    if (!confirm('Bu elçiyi silmek istediğinize emin misiniz?')) return
    try{
      await api.delete(`/admin/ambassador/${id}`)
      await load()
    }catch(err){
      alert(err.response?.data?.error || 'Silinemedi')
    }
  }

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold text-fuchsia-800 text-center">Admin</h1>

      {/* Tarih */}
      <div className="card mt-4">
        <label className="text-xs font-semibold text-fuchsia-700">Tarih</label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
      </div>

      {/* Bitiş tarihi */}
      <div className="card mt-4">
        <label className="text-xs font-semibold text-fuchsia-700">Bitiş Tarihi</label>
        <div className="flex gap-2 mt-2">
          <input type="date" value={endDate||''} onChange={e=>setEndDate(e.target.value)} className="flex-1 border rounded-xl px-3 py-2" />
          <button className="btn btn-primary" onClick={saveEndDate}>Kaydet</button>
        </div>
      </div>

      {/* Elçi ekleme formu */}
      <form onSubmit={addAmbassador} className="card mt-4">
        <div className="text-sm font-semibold text-fuchsia-700 mb-2">Elçi Ekle</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="İsim"
            className="border rounded-xl px-3 py-2 col-span-2"
            value={newAmb.name}
            onChange={e=>setNewAmb(v=>({...v, name:e.target.value}))}
          />
          <input
            placeholder="Kullanıcı adı"
            className="border rounded-xl px-3 py-2"
            value={newAmb.username}
            onChange={e=>setNewAmb(v=>({...v, username:e.target.value}))}
          />
          <input
            placeholder="PIN"
            className="border rounded-xl px-3 py-2"
            value={newAmb.pin}
            onChange={e=>setNewAmb(v=>({...v, pin:e.target.value}))}
          />

          {/* Avatar URL alanı (opsiyonel) */}
          <input
            placeholder="Avatar URL (opsiyonel)"
            className="border rounded-xl px-3 py-2 col-span-2"
            value={newAmb.avatar}
            onChange={e=>setNewAmb(v=>({...v, avatar:e.target.value}))}
          />

          {/* Veya dosyadan yükle */}
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={e=> onPickAvatar(e.target.files?.[0])}
              className="text-xs"
            />
            {newAmb.avatar && (
              <span className="text-xs text-fuchsia-700">Önizleme sağda ↓</span>
            )}
          </div>

          {/* Önizleme */}
          {newAmb.avatar && (
            <div className="col-span-2">
              <div className="text-xs text-fuchsia-700 mb-1">Önizleme</div>
              <Avatar src={newAmb.avatar} alt={newAmb.name || 'Yeni elçi'} size={64} ringClass="ring-2 ring-fuchsia-200" />
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary w-full mt-3">
          {saving ? 'Ekleniyor...' : 'Ekle'}
        </button>
      </form>

      {/* Elçi listesi */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-10">
        {items.map(a=>(
          <div key={a.id} className="card text-center pb-5 relative">
            {/* Sil butonu */}
            <button
              onClick={()=>removeAmbassador(a.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border border-rose-200 text-rose-500 text-xs font-extrabold shadow-soft active:scale-95"
              title="Elçiyi sil"
            >
              ✕
            </button>

            <Avatar src={a.avatar} alt={a.name} size={80} ringClass="ring-4 ring-fuchsia-200 mx-auto" />
            <div className="mt-2 font-semibold text-fuchsia-800">{a.name}</div>

            {/* Günlük rozetler */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <button className={"badge " + (a.today?.story   ? "badge-full":"badge-empty")} onClick={()=> a.today?.story   && unmark(a.id,'S')}>S</button>
              <button className={"badge " + (a.today?.post    ? "badge-full":"badge-empty")} onClick={()=> a.today?.post    && unmark(a.id,'P')}>P</button>
              <button className={"badge " + (a.today?.product ? "badge-full":"badge-empty")} onClick={()=> a.today?.product && unmark(a.id,'U')}>Ü</button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button className="badge badge-solid" onClick={()=>mark(a.id,'S')}>S</button>
              <button className="badge badge-solid" onClick={()=>mark(a.id,'P')}>P</button>
              <button className="badge badge-solid" onClick={()=>mark(a.id,'U')}>Ü</button>
            </div>

            {/* Manuel puan düzeltme — tek kutu + Uygula */}
            <div className="mt-4 px-3">
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Değer"
                  className="border rounded-xl px-3 py-2 text-sm"
                  value={adj[a.id] ?? ''}
                  onChange={e=> setAdjValue(a.id, e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={()=> applyAdjust(a.id)}
                >
                  Uygula
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Ambassador ---------------- */
function Ambassador({ onBack }){
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [me, setMe] = useState(null)
  const [data, setData] = useState(null)

  const login = async () => {
    try{
      const res = await api.post('/login', { role:'amb', username, pin }).then(r=>r.data)
      setMe(res.ambassador)
      const details = await api.get(`/amb/${res.ambassador.id}/logs`).then(r=>r.data)
      setData(details)
    }catch(e){
      alert('Giriş hatalı veya veri alınamadı.')
    }
  }

  if (!me) {
    return (
      <div className="p-4 max-w-sm mx-auto">
        <h1 className="text-2xl font-extrabold text-fuchsia-800 text-center">Elçi Girişi</h1>
        <div className="card mt-4">
          <label className="text-xs font-semibold text-fuchsia-700">Kullanıcı Adı</label>
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={username} onChange={e=>setUsername(e.target.value)} />
          <label className="text-xs font-semibold text-fuchsia-700 mt-3">PIN</label>
          <input className="mt-1 w-full border rounded-xl px-3 py-2" value={pin} onChange={e=>setPin(e.target.value)} />
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary flex-1" onClick={login}>Giriş</button>
            <button className="btn flex-1" onClick={onBack}>← Ana sayfa</button>
          </div>
        </div>
      </div>
    )
  }

  const score = (l) => (l?.story?100:0) + (l?.post?150:0) + (l?.product?300:0)
  const pill = (on) =>
    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold " +
    (on ? "bg-gradient-to-br from-brandPink to-brandPurple text-white shadow-soft" : "border border-pink-300 text-pink-500")

  const today = new Date().toISOString().slice(0,10)
  const allLogs = Array.isArray(data?.logs) ? data.logs.slice() : []
  allLogs.sort((a,b)=> a.date.localeCompare(b.date))
  const todayLog = allLogs.find(l=>l.date===today) || { id:`virtual-${me.id}-${today}`, date: today, story:false, post:false, product:false, _virtual:true }
  const pastLogs = allLogs.filter(l=>l.date!==today).slice().reverse()

  return (
    <div className="p-4 max-w-sm mx-auto">
      <div className="mb-3">
        <button onClick={onBack} className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-pink-200 text-fuchsia-700">
          ← Ana sayfa
        </button>
      </div>

      <div className="card flex items-center gap-3">
        <Avatar src={me.avatar} alt={me.name} size={64} ringClass="ring-4 ring-fuchsia-200" />
        <div>
          <div className="text-lg font-extrabold text-fuchsia-800">{me.name}</div>
          <div className="text-xs text-fuchsia-500">Toplam: {data?.total||0} puan</div>
        </div>
      </div>

      <div className="mt-4 card">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-fuchsia-900">Bugün • {todayLog.date}</div>
          <div className="text-xs font-semibold text-fuchsia-600">Kazanılan Puan: {score(todayLog)}</div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
          <span className={pill(!!todayLog.story)}>S</span>
          <span className={pill(!!todayLog.post)}>P</span>
          <span className={pill(!!todayLog.product)}>Ü</span>
        </div>
        {todayLog._virtual && <div className="mt-2 text-[11px] text-center text-fuchsia-500">(Bugün henüz işaretleme yapılmadı)</div>}
      </div>

      <div className="mt-4">
        <div className="text-sm font-semibold text-fuchsia-700 mb-2">Geçmiş ({pastLogs.length})</div>
        <div className="space-y-3">
          {pastLogs.map(l=>(
            <div key={l.id} className="card">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-fuchsia-800">{l.date}</div>
                <div className="text-xs font-semibold text-fuchsia-600">Kazanılan Puan: {score(l)}</div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4">
                <span className={pill(!!l.story)}>S</span>
                <span className={pill(!!l.post)}>P</span>
                <span className={pill(!!l.product)}>Ü</span>
              </div>
            </div>
          ))}
          {pastLogs.length === 0 && <div className="text-center text-xs text-fuchsia-500">Geçmiş kayıt yok.</div>}
        </div>
      </div>
    </div>
  )
}

/* ---------------- App ---------------- */
export default function App(){
  const path = window.location.pathname.replace(/^\//, '') || 'home'
  const initialTab = ['home','amb','admin'].includes(path) ? path : 'home'

  const [tab, setTab] = useState(initialTab)
  const [adminAuthed, setAdminAuthed] = useState(() => sessionStorage.getItem('amba_admin_authed') === '1')

  const go = (next) => {
    setTab(next)
    const newPath = next === 'home' ? '/' : `/${next}`
    window.history.replaceState(null, '', newPath)
  }

  if (tab === 'admin') {
    if (!adminAuthed) {
      return <AdminGate onSuccess={() => { setAdminAuthed(true); sessionStorage.setItem('amba_admin_authed','1'); go('admin'); }} />
    }
    return <AdminInner />
  }

  return (
    <div className="min-h-screen">
      {tab === 'home'  && <Leaderboard onGoAmbassador={()=>go('amb')} />}
      {tab === 'amb'   && <Ambassador onBack={()=>go('home')} />}
    </div>
  )
}