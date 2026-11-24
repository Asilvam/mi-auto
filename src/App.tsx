import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CarFront, Check, ChevronDown, CircleHelp, Clock3, Fuel, History, LocateFixed, MapPin, Navigation, Plus, Route, Settings2, ShieldCheck, SlidersHorizontal, Users, Wallet, X } from 'lucide-react'
import LoginScreen from './LoginScreen'
import { useAuth } from './auth'

type Trip = { id: string; title: string; date: string; mode: 'Viaje compartido' | 'Delivery'; km: number; amount: number; places: number; start: string; end: string; }
const initialTrips: Trip[] = []
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
function stored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}

function App() {
  const auth = useAuth()
  const [dataReady, setDataReady] = useState(false)
  const [tab, setTab] = useState('Resumen')
  const [trips, setTrips] = useState<Trip[]>(() => stored('mi-auto-trips', initialTrips))
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState('')
  const [start, setStart] = useState('Plaza de Quintero')
  const [end, setEnd] = useState('Loncura')
  const [km, setKm] = useState('8.4')
  const [passengers, setPassengers] = useState('3')
  const [mode, setMode] = useState<'Viaje compartido' | 'Delivery'>('Viaje compartido')
  const [kmPerLiter, setKmPerLiter] = useState(() => stored('mi-auto-km-per-liter', 100 / stored('mi-auto-consumption', 8.2)))
  const litersPer100 = 100 / kmPerLiter
  const [fuelPrice, setFuelPrice] = useState(() => stored('mi-auto-fuel-price', 1350))
  const [showSettings, setShowSettings] = useState(false)
  const [routeChoice, setRouteChoice] = useState('Económica')
  const [filter, setFilter] = useState('Todos')
  const [query, setQuery] = useState('')
  const [vehicleConfigured, setVehicleConfigured] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  useEffect(() => {
    if (!auth.user) { setDataReady(false); return }
    let active = true
    void Promise.all([
      auth.apiFetch<any[]>('trips'),
      auth.apiFetch<any[]>('vehicles'),
    ]).then(([savedTrips, vehicles]) => {
      if (!active) return
      setTrips(savedTrips.map((t) => ({ id: t._id, title: `${t.origin} → ${t.destination}`, date: new Date(t.completedAt).toLocaleString('es-CL'), mode: t.type === 'delivery' ? 'Delivery' : 'Viaje compartido', km: t.distanceMeters / 1000, amount: t.totalCostClp, places: 1, start: t.origin, end: t.destination })))
      const primary = vehicles.find(v => v.isPrimary)
      if (primary) { setVehicleConfigured(true); setKmPerLiter(primary.efficiencyKmPerLiter); setFuelPrice(primary.fuelPriceClp) }
      else setVehicleConfigured(false)
      setDataReady(true)
    }).catch(e => { if (active) { notify(e instanceof Error ? e.message : 'No se pudieron cargar tus datos'); setDataReady(true) } })
    return () => { active = false }
  }, [auth.user?.id])
  useEffect(() => { localStorage.setItem('mi-auto-trips', JSON.stringify(trips)) }, [trips])
  useEffect(() => { localStorage.setItem('mi-auto-km-per-liter', JSON.stringify(kmPerLiter)) }, [kmPerLiter])
  useEffect(() => { localStorage.setItem('mi-auto-fuel-price', JSON.stringify(fuelPrice)) }, [fuelPrice])
  const tripCost = useMemo(() => Number(km || 0) * litersPer100 / 100 * fuelPrice, [km, litersPer100, fuelPrice])
  const shownTrips = trips.filter(t => (filter === 'Todos' || t.mode === filter) && `${t.title} ${t.start} ${t.end}`.toLowerCase().includes(query.toLowerCase()))
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2800) }
  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!start.trim() || !end.trim() || Number(km) <= 0) return
    if (!vehicleConfigured) { notify('Primero configura tu vehículo'); setShowSettings(true); return }
    try {
      const saved = await auth.apiFetch<any>('trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: mode === 'Delivery' ? 'delivery' : 'shared', origin: start, destination: end, distanceMeters: Math.round(Number(km) * 1000) }) })
      const entry: Trip = { id: saved._id, title: `${saved.origin} → ${saved.destination}`, date: 'Ahora', mode, km: saved.distanceMeters / 1000, amount: saved.totalCostClp, places: Math.max(1, Number(passengers)), start: saved.origin, end: saved.destination }
      setTrips([entry, ...trips]); setModal(false); setTab('Historial'); notify('Ruta guardada en tu historial')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo guardar la ruta') }
  }
  const saveVehicle = async () => {
    setSavingVehicle(true)
    try {
      await auth.apiFetch('vehicles/primary', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Mi vehículo', fuelType: 'gasoline', efficiencyKmPerLiter: kmPerLiter, fuelPriceClp: Math.round(fuelPrice) }) })
      setVehicleConfigured(true); setShowSettings(false); notify('Vehículo guardado en tu cuenta')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo guardar el vehículo') }
    finally { setSavingVehicle(false) }
  }

  if (auth.loading || (auth.user && !dataReady)) return <div className="auth-loading">Preparando tu espacio de Mi Auto…</div>
  if (!auth.user) return <LoginScreen />

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Navigation size={19} fill="currentColor" /></div><div><b>mi auto</b><span>Rutas que rinden</span></div></div>
      <div className="side-label">ESPACIO DE TRABAJO</div>
      <button className={`nav-item ${tab === 'Resumen' ? 'active' : ''}`} onClick={() => setTab('Resumen')}><Activity size={18}/>Resumen</button>
      <button className={`nav-item ${tab === 'Historial' ? 'active' : ''}`} onClick={() => setTab('Historial')}><History size={18}/>Historial de rutas</button>
      <button className={`nav-item ${tab === 'Mi vehículo' ? 'active' : ''}`} onClick={() => setTab('Mi vehículo')}><CarFront size={18}/>Mi vehículo</button>
      <div className="side-spacer" />
      <div className="location-card"><div className="loc-icon"><MapPin size={16}/></div><div><small>OPERANDO EN</small><b>Quintero, Chile</b></div><ChevronDown size={15} className="muted"/></div>
      <div className="profile"><div className="avatar">{auth.user.name.slice(0,2).toUpperCase()}</div><div className="profile-info"><b>{auth.user.name}</b><small>Cuenta Google</small></div><button className="icon-btn" title="Cerrar sesión" onClick={() => void auth.signOut()}><X size={17}/></button></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb">Mi espacio <span>/</span> <b>{tab}</b></div><div className="top-actions"><div className="status"><i/> Datos asociados a tu cuenta</div><button className="help-btn"><CircleHelp size={16}/> Ayuda</button></div></header>
      {tab === 'Resumen' && <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> LUNES, 23 DE NOVIEMBRE</div><h1>Hola, Alex <span className="wave">✳</span></h1><p className="subheading">Tus rutas, costos y kilómetros, todo en un solo lugar.</p></div><button className="primary-btn" onClick={() => setModal(true)}><Plus size={18}/> Registrar ruta</button></div>
        <div className="stats-grid">
          <Stat label="KILÓMETROS DEL MES" value="126,8" unit="km" change="18%" up caption="vs. mes anterior" icon={<Route size={18}/>} color="green"/>
          <Stat label="GASTO ESTIMADO" value={money(24860)} unit="" change="12%" up={false} caption="vs. mes anterior" icon={<Wallet size={18}/>} color="sand"/>
          <Stat label="RUTAS REGISTRADAS" value={String(trips.length + 8)} unit="" change="4" up caption="esta semana" icon={<Navigation size={18}/>} color="blue"/>
          <Stat label="RENDIMIENTO PROMEDIO" value="12,2" unit="km/l" change="0,6" up caption="vs. mes anterior" icon={<Fuel size={18}/>} color="rose"/>
        </div>

        <div className="section-heading"><div><h2>Tu próxima ruta</h2><p>Compara alternativas según distancia y gasto estimado.</p></div><button className="text-btn" onClick={() => notify('La optimización avanzada estará disponible al conectar mapas')}>Ver mapa completo <ArrowRight size={15}/></button></div>
        <div className="route-card">
          <div className="route-left"><div className="route-search"><div className="route-points"><div className="point-dot start-dot"/><div className="point-stem"/><div className="point-dot end-dot"/></div><div className="fields"><label><small>DESDE</small><input value={start} onChange={e => setStart(e.target.value)}/></label><div className="field-divider"/><label><small>HASTA</small><input value={end} onChange={e => setEnd(e.target.value)}/></label></div><button className="swap-btn" onClick={() => { setStart(end); setEnd(start) }} title="Invertir origen y destino"><ArrowDownRight size={16}/></button></div>
            <div className="route-options"><button className={routeChoice === 'Económica' ? 'selected' : ''} onClick={() => setRouteChoice('Económica')}><Wallet size={15}/><span><b>Económica</b><small>Menor costo estimado</small></span><i/></button><button className={routeChoice === 'Más rápida' ? 'selected' : ''} onClick={() => setRouteChoice('Más rápida')}><Clock3 size={15}/><span><b>Más rápida</b><small>Menor tiempo estimado</small></span><i/></button></div>
            <button className="outline-btn route-action" onClick={() => setModal(true)}><LocateFixed size={16}/> Calcular ruta</button>
          </div>
          <div className="map-panel"><div className="map-topline"><span><MapPin size={14}/> Quintero, Valparaíso</span><span className="map-tag">VISTA PREVIA</span></div><MapIllustration/><div className="map-bottom"><span><i className="legend-line"/> Ruta sugerida</span><span className="map-distance">8,4 km <b>·</b> 19 min</span></div></div>
        </div>

        <div className="lower-grid"><section className="panel recent-panel"><div className="panel-head"><div><h2>Rutas recientes</h2><p>Tu actividad más reciente</p></div><button className="text-btn" onClick={() => setTab('Historial')}>Ver historial <ArrowRight size={15}/></button></div><div className="recent-list">{trips.slice(0,3).map((trip, i) => <TripRow key={trip.id} trip={trip} i={i}/>)}</div></section>
          <section className="panel efficiency-panel"><div className="panel-head"><div><h2>Eficiencia semanal</h2><p>Kilómetros recorridos por día</p></div><button className="icon-btn soft"><SlidersHorizontal size={16}/></button></div><div className="chart"><div className="chart-grid"><span>30 km</span><span>20 km</span><span>10 km</span><span>0 km</span></div><div className="bars">{[['Lun',35],['Mar',54],['Mié',44],['Jue',70],['Vie',52],['Sáb',84],['Dom',28]].map(([d,h],i)=><div className="bar-col" key={String(d)}><div className={`bar ${i===5?'highlight':''}`} style={{height:`${h}%`}}/><small>{d}</small></div>)}</div></div><div className="chart-foot"><span>Esta semana</span><b>47,3 km <ArrowUpRight size={14}/></b></div></section>
        </div>
        <footer>Los costos son estimaciones basadas en el rendimiento configurado de tu vehículo. <button onClick={() => setShowSettings(true)}>Ajustar consumo y combustible</button></footer>
      </div>}

      {tab === 'Historial' && <div className="content history-content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> TU ACTIVIDAD</div><h1>Historial de rutas</h1><p className="subheading">Revisa kilómetros, costos estimados y recorridos guardados.</p></div><button className="primary-btn" onClick={() => setModal(true)}><Plus size={18}/> Registrar ruta</button></div><div className="history-summary"><div><small>RUTAS GUARDADAS</small><b>{trips.length}</b></div><div><small>KILÓMETROS REGISTRADOS</small><b>{trips.reduce((s,t)=>s+t.km,0).toFixed(1).replace('.',',')} km</b></div><div><small>COSTO DE COMBUSTIBLE EST.</small><b>{money(trips.reduce((s,t)=>s+t.amount,0))}</b></div></div><div className="history-tools"><div className="searchbox"><input placeholder="Buscar origen o destino…" value={query} onChange={e=>setQuery(e.target.value)}/><span>⌕</span></div><div className="filter-group">{['Todos','Viaje compartido','Delivery'].map(f=><button className={filter===f?'chosen':''} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div></div><div className="panel history-table"><div className="table-head"><span>RUTA</span><span>TIPO</span><span>FECHA</span><span>DISTANCIA</span><span>COSTO EST.</span><span/></div>{shownTrips.map((t,i)=><TripRow key={t.id} trip={t} i={i} detailed/>)}{shownTrips.length===0&&<div className="empty">No hay rutas que coincidan con tu búsqueda.</div>}</div></div>}

      {tab === 'Mi vehículo' && <div className="content vehicle-content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> PERFIL DE CONDUCCIÓN</div><h1>Mi vehículo</h1><p className="subheading">Configura el rendimiento para estimar mejor cada recorrido.</p></div><button className="primary-btn" onClick={() => setShowSettings(true)}><Settings2 size={17}/> Editar datos</button></div><div className="vehicle-card"><div className="vehicle-image"><div className="car-orbit orbit-one"/><div className="car-orbit orbit-two"/><CarFront size={92} strokeWidth={1.15}/><span>MI AUTO</span></div><div className="vehicle-details"><div className="tag">VEHÍCULO PRINCIPAL</div><h2>Mi vehículo</h2><p>Los datos se pueden completar cuando quieras.</p><div className="vehicle-specs"><div><small>RENDIMIENTO</small><b>{kmPerLiter.toFixed(1).replace('.',',')} km/L</b></div><div><small>CONSUMO</small><b>{litersPer100.toFixed(1).replace('.',',')} L/100 km</b></div><div><small>PRECIO REFERENCIAL</small><b>{money(fuelPrice)} / litro</b></div></div><button className="outline-btn" onClick={() => setShowSettings(true)}><Settings2 size={16}/> Ajustar consumo y combustible</button></div></div><div className="note-card"><ShieldCheck size={19}/><span><b>Estimaciones transparentes</b><br/>El costo considera combustible según los kilómetros y el rendimiento configurado. Peajes u otros gastos se pueden sumar al registrar el viaje.</span></div></div>}
    </main>
    {showSettings && <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowSettings(false)}}><aside className="settings-drawer"><div className="drawer-head"><div><small>CONFIGURACIÓN</small><h2>Datos del vehículo</h2></div><button className="icon-btn" onClick={()=>setShowSettings(false)}><X size={18}/></button></div><label className="form-label">Rendimiento<input type="number" min="0.1" step="0.1" value={kmPerLiter} onChange={e=>{const v=Number(e.target.value);if(v>0)setKmPerLiter(v)}}/><small>Kilómetros por litro (km/L)</small></label><label className="form-label">Consumo equivalente<input type="number" min="0.1" step="0.1" value={litersPer100.toFixed(1)} onChange={e=>{const v=Number(e.target.value);if(v>0)setKmPerLiter(100/v)}}/><small>Litros cada 100 kilómetros (L/100 km)</small></label><label className="form-label">Precio combustible<input type="number" min="1" value={fuelPrice} onChange={e=>setFuelPrice(Number(e.target.value))}/><small>Pesos chilenos por litro</small></label><div className="drawer-info"><Fuel size={18}/><span>Ambos valores se actualizan entre sí y se guardan en tu cuenta.</span></div><button className="primary-btn full" disabled={savingVehicle} onClick={()=>void saveVehicle()}><Check size={17}/> {savingVehicle ? 'Guardando…' : 'Guardar configuración'}</button></aside></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="trip-modal" onSubmit={createTrip}><div className="modal-head"><div><div className="eyebrow"><span className="eyebrow-line"/> NUEVO REGISTRO</div><h2>Registrar ruta</h2><p>Guarda distancia y costo estimado en tu historial.</p></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={19}/></button></div><div className="mode-switch"><button type="button" className={mode==='Viaje compartido'?'selected':''} onClick={()=>setMode('Viaje compartido')}><Users size={16}/> Viaje compartido</button><button type="button" className={mode==='Delivery'?'selected':''} onClick={()=>setMode('Delivery')}><Navigation size={16}/> Delivery</button></div><label className="form-label">Origen<input value={start} onChange={e=>setStart(e.target.value)} placeholder="Ej. Plaza de Quintero" required/></label><label className="form-label">Destino<input value={end} onChange={e=>setEnd(e.target.value)} placeholder="Ej. Loncura" required/></label><div className="form-two"><label className="form-label">Distancia recorrida<input type="number" min="0.1" step="0.1" value={km} onChange={e=>setKm(e.target.value)} required/><small>kilómetros</small></label><label className="form-label">Personas / paradas<input type="number" min="1" step="1" value={passengers} onChange={e=>setPassengers(e.target.value)}/></label></div><div className="estimate"><div><Fuel size={17}/><span>Combustible estimado</span></div><b>{money(tripCost)}</b><small>Basado en {kmPerLiter.toFixed(1)} km/L ({litersPer100.toFixed(1)} L/100 km) · {money(fuelPrice)}/L</small></div><button type="submit" className="primary-btn full"><Check size={17}/> Guardar en historial</button><p className="modal-footnote">Puedes corregir la distancia con los kilómetros reales del odómetro.</p></form></div>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function Stat({label,value,unit,change,up,caption,icon,color}:{label:string,value:string,unit:string,change:string,up:boolean,caption:string,icon:React.ReactNode,color:string}) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}<span>{unit}</span></div><div className="stat-change"><b className={up?'up':'down'}>{up?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {change}</b><span>{caption}</span></div></div> }
function TripRow({trip,i,detailed=false}:{trip:Trip,i:number,detailed?:boolean}) { return <div className={`trip-row ${detailed?'detailed':''}`}><div className="trip-route"><div className={`trip-icon tone-${i%3}`}>{trip.mode==='Delivery'?<Navigation size={16}/>:<Route size={16}/>}</div><div><b>{trip.title}</b><small>{trip.start} <span>→</span> {trip.end}</small></div></div><div className="trip-type"><span className={trip.mode==='Delivery'?'delivery-badge':'shared-badge'}>{trip.mode}</span></div><div className="trip-date">{trip.date}</div><div className="trip-km"><b>{trip.km.toFixed(1).replace('.',',')} km</b></div><div className="trip-cost"><b>{money(trip.amount)}</b><small>combustible</small></div>{detailed&&<button className="row-more" title="Detalles"><ChevronDown size={16}/></button>}</div> }
function MapIllustration() { return <div className="map-art"><svg viewBox="0 0 560 270" preserveAspectRatio="xMidYMid slice" aria-label="Vista ilustrativa del mapa de Quintero"><rect width="560" height="270" fill="#edf1e9"/><path d="M0 0h126l31 23 7 31-18 27 29 19-7 36-26 13 8 35-22 25 9 30-22 31H0z" fill="#dcebe8"/><path d="M82 0c3 34 24 40 13 73s14 48 2 78 8 47-4 68 10 33 9 51" stroke="#c6ddd9" strokeWidth="14" fill="none"/><g stroke="#fff" strokeWidth="7" fill="none" opacity=".95"><path d="M160 38l74 19 19 35 76 11 33 41 112-5 49 38"/><path d="M155 222l70-28 40-23 42 13 40-42 28-48 59-27 64 8"/><path d="M192 0l-4 57 30 44-13 51 12 69-8 49M340 0l10 44-20 49 10 56-20 41 13 80M470 0l-20 39 13 39-12 46 24 47-22 42 17 57"/><path d="M126 116l76 20 56-10 66 18 81-4 57 32 98 2"/></g><g stroke="#d7ddd3" strokeWidth="2" fill="none"><path d="M155 22l74 19 19 35 76 11 33 41 112-5 49 38"/><path d="M150 206l70-28 40-23 42 13 40-42 28-48 59-27 64 8"/><path d="M188 0l-4 57 30 44-13 51 12 69-8 49M336 0l10 44-20 49 10 56-20 41 13 80M466 0l-20 39 13 39-12 46 24 47-22 42 17 57"/><path d="M121 100l76 20 56-10 66 18 81-4 57 32 98 2"/></g><path d="M259 189c31-12 51-32 67-52s23-33 50-38 51-6 65 8 6 35 22 41 28 4 48 19" fill="none" stroke="#34584c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M259 189c31-12 51-32 67-52s23-33 50-38 51-6 65 8 6 35 22 41 28 4 48 19" fill="none" stroke="#9cc8a3" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 9"/><circle cx="259" cy="189" r="8" fill="#34584c" stroke="white" strokeWidth="4"/><g transform="translate(511 167)"><circle r="16" fill="#fff"/><circle r="10" fill="#d27959"/><path d="M0-6l2 6-2 2-2-2z" fill="white"/><circle r="2" fill="white"/></g><g fill="#98a198" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600"><text x="185" y="89">CENTRO</text><text x="379" y="177">LONCURA</text><text x="223" y="242">AV. NORMANDIE</text><text x="389" y="32">QUINTERO</text></g><g transform="translate(23 22)"><rect width="58" height="58" rx="12" fill="white" opacity=".95"/><path d="M29 13v32M13 29h32" stroke="#97a39a" strokeWidth="1.5"/><circle cx="29" cy="29" r="12" fill="none" stroke="#d8dfd8"/></g></svg></div> }
export default App
