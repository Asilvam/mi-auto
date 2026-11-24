import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CarFront, Check, ChevronDown, CircleHelp, Clock3, Fuel, History, LocateFixed, MapPin, Navigation, Plus, Route, Settings2, ShieldCheck, SlidersHorizontal, Users, Wallet, X, Trash2 } from 'lucide-react'
import LoginScreen from './LoginScreen'
import { useAuth } from './auth'
import RouteMap from './RouteMap'
import { monthMetrics, weekDistance } from './trip-metrics'
import { isWaitingForWorkspace, needsWorkspaceRetry } from './app-startup'
import PlaceSearch, { type PlaceSuggestion } from './PlaceSearch'
import { litersPer100FromKmPerLiter, recordedFuelSpend, registeredKilometers } from './vehicle-metrics'
import { appendDeliveryStop, buildRouteRequest } from './route-request'
import type { MapCoordinates } from './base-map'
import { formatDuration } from './duration-format'

type Trip = { id: string; title: string; date: string; dateISO: string; mode: 'Viaje compartido' | 'Delivery'; status: 'planned' | 'in_progress' | 'completed'; km: number; durationSeconds: number; amount: number; fuel: number; tolls: number; deliveryFee: number; perPerson: number; places: number; start: string; end: string; stops: string[]; }
type DeliveryRate = { id: string; label: string; startTime: string; endTime: string; amountClp: number }
type RouteOption = { id: string; distanceMeters: number; durationSeconds: number; fuelCostClp: number; tollsClp: number; totalCostClp: number; geometry: { type: 'LineString'; coordinates: [number, number][] }; stopOrder: string[] }
type RoutePlan = { preferences: { economical: RouteOption | null; fastest: RouteOption | null }; alternatives: RouteOption[]; notice: string }
type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'other'
const fuelTypeLabels: Record<FuelType, string> = { gasoline: 'Bencina', diesel: 'Diésel', hybrid: 'Híbrido', electric: 'Eléctrico', other: 'Otro' }
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

function App() {
  const auth = useAuth()
  const [dataReady, setDataReady] = useState(false)
  const [startupTimedOut, setStartupTimedOut] = useState(false)
  const [tab, setTab] = useState('Resumen')
  const [trips, setTrips] = useState<Trip[]>([])
  const [modal, setModal] = useState(false)
  const [toast, setToast] = useState('')
  const [end, setEnd] = useState('')
  const [destinationPlace, setDestinationPlace] = useState<PlaceSuggestion | null>(null)
  const [baseAddress, setBaseAddress] = useState('')
  const [baseCoordinates, setBaseCoordinates] = useState<MapCoordinates | null>(null)
  const [basePlace, setBasePlace] = useState<PlaceSuggestion | null>(null)
  const [km, setKm] = useState('')
  const [passengers, setPassengers] = useState('3')
  const [mode, setMode] = useState<'Viaje compartido' | 'Delivery'>('Viaje compartido')
  const [kmPerLiter, setKmPerLiter] = useState(12.2)
  const litersPer100 = litersPer100FromKmPerLiter(kmPerLiter)
  const [fuelPrice, setFuelPrice] = useState(1350)
  const [vehicleName, setVehicleName] = useState('Mi auto')
  const [vehicleMake, setVehicleMake] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [fuelType, setFuelType] = useState<FuelType>('gasoline')
  const [showSettings, setShowSettings] = useState(false)
  const [showBasePicker, setShowBasePicker] = useState(false)
  const [routeChoice, setRouteChoice] = useState<'Económica' | 'Más rápida'>('Económica')
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null)
  const [planning, setPlanning] = useState(false)
  const [stops, setStops] = useState<string[]>([])
  const [newStop, setNewStop] = useState('')
  const [newStopPlace, setNewStopPlace] = useState<PlaceSuggestion | null>(null)
  const [tolls, setTolls] = useState(0)
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRate[]>([])
  const [currentDeliveryRate, setCurrentDeliveryRate] = useState<DeliveryRate | null>(null)
  const [savingRates, setSavingRates] = useState(false)
  const [filter, setFilter] = useState('Todos')
  const [query, setQuery] = useState('')
  const [vehicleConfigured, setVehicleConfigured] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)
  useEffect(() => {
    const waiting = auth.loading || Boolean(auth.user && !dataReady)
    if (!waiting) { setStartupTimedOut(false); return }
    const timeout = window.setTimeout(() => setStartupTimedOut(true), 8000)
    return () => window.clearTimeout(timeout)
  }, [auth.loading, auth.user?.id, dataReady])
  useEffect(() => {
    if (!auth.user) { setDataReady(false); return }
    let active = true
    void Promise.all([
      auth.apiFetch<any[]>('trips'),
      auth.apiFetch<any[]>('vehicles'),
      auth.apiFetch<{ rules: DeliveryRate[]; currentRule: DeliveryRate | null }>('pricing/delivery'),
    ]).then(([savedTrips, vehicles, pricing]) => {
      if (!active) return
      const mappedTrips: Trip[] = savedTrips.map((t) => { const dateISO = t.completedAt ?? t.startedAt ?? t.createdAt; return { id: t._id, title: `${t.origin} → ${t.destination}`, date: new Date(dateISO).toLocaleString('es-CL'), dateISO, mode: t.type === 'delivery' ? 'Delivery' : 'Viaje compartido', status: t.status ?? 'completed', km: t.distanceMeters / 1000, durationSeconds: t.durationSeconds ?? 0, amount: t.totalCostClp, fuel: t.fuelCostClp ?? 0, tolls: t.tollsClp ?? 0, deliveryFee: t.deliveryFeeClp ?? 0, perPerson: t.costPerParticipantClp ?? 0, places: t.participantCount ?? 1, start: t.origin, end: t.destination, stops: t.stops ?? [] } })
      setTrips(mappedTrips)
      const activeDeliveryTrip = mappedTrips.find((trip) => trip.mode === 'Delivery' && trip.status === 'in_progress')
      if (activeDeliveryTrip) { setEnd(activeDeliveryTrip.end); setMode('Delivery'); setTolls(activeDeliveryTrip.tolls); setStops(activeDeliveryTrip.stops) }
      setDeliveryRates(pricing.rules)
      setCurrentDeliveryRate(pricing.currentRule)
      const primary = vehicles.find(v => v.isPrimary)
      if (primary) {
        setVehicleConfigured(true)
        setVehicleName(primary.name || 'Mi auto')
        setVehicleMake(primary.make || '')
        setVehicleModel(primary.model || '')
        setVehicleYear(primary.year ? String(primary.year) : '')
        setFuelType(primary.fuelType || 'gasoline')
        setBaseAddress(primary.baseAddress || '')
        const savedBaseCoordinates = Array.isArray(primary.baseCoordinates) && primary.baseCoordinates.length === 2
          ? primary.baseCoordinates as MapCoordinates
          : null
        setBaseCoordinates(savedBaseCoordinates)
        if (primary.baseAddress && savedBaseCoordinates) {
          setBasePlace({ id: 'saved-base', name: primary.baseAddress, fullAddress: primary.baseAddress, coordinates: savedBaseCoordinates })
        } else if (primary.baseAddress) {
          void auth.apiFetch<PlaceSuggestion[]>(`routes/places?q=${encodeURIComponent(primary.baseAddress)}`)
            .then((places) => {
              if (!active || !places[0]) return
              const base = { ...places[0], fullAddress: primary.baseAddress }
              setBaseCoordinates(base.coordinates)
              setBasePlace(base)
            }).catch(() => undefined)
        }
        setKmPerLiter(primary.efficiencyKmPerLiter)
        setFuelPrice(primary.fuelPriceClp)
      }
      else setVehicleConfigured(false)
      setDataReady(true)
    }).catch(e => { if (active) { notify(e instanceof Error ? e.message : 'No se pudieron cargar tus datos'); setDataReady(true) } })
    return () => { active = false }
  }, [auth.user?.id])
  const tripCost = useMemo(() => Number(km || 0) * litersPer100 / 100 * fuelPrice, [km, litersPer100, fuelPrice])
  const shownTrips = trips.filter(t => (filter === 'Todos' || t.mode === filter) && `${t.title} ${t.start} ${t.end}`.toLowerCase().includes(query.toLowerCase()))
  const selectedRoute = routeChoice === 'Económica' ? routePlan?.preferences.economical : routePlan?.preferences.fastest
  const { monthKm, monthSpend } = monthMetrics(trips)
  const averageEfficiency = trips.length ? kmPerLiter : 0
  const notify = (text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2800) }
  const pickBaseCoordinates = useCallback((coordinates: MapCoordinates) => {
    const label = baseAddress.trim() || 'Punto base marcado en el mapa, Quintero, Chile'
    setBaseAddress(label)
    setBaseCoordinates(coordinates)
    setBasePlace({ id: 'map-picked-base', name: label, fullAddress: label, coordinates })
  }, [baseAddress])
  const planRoute = async (routeStops: string[] = stops) => {
    if (!vehicleConfigured) { notify('Primero configura tu vehículo'); setTab('Mi vehículo'); setShowSettings(true); return }
    if (!baseAddress.trim()) { notify('Configura el punto base de salida y regreso en Mi vehículo'); setTab('Mi vehículo'); setShowSettings(true); return }
    if (mode === 'Viaje compartido' && !destinationPlace) { notify('Selecciona el destino desde las sugerencias'); return }
    if (mode === 'Delivery' && routeStops.length === 0) { notify('Agrega al menos una parada de delivery'); return }
    setPlanning(true)
    try {
      const request = buildRouteRequest({ mode, baseAddress, destination: destinationPlace?.fullAddress ?? '', stops: routeStops, tollsClp: tolls, participantCount: Number(passengers) || 1 })
      const result = await auth.apiFetch<RoutePlan>('routes/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) })
      if (mode === 'Delivery') {
        const pricing = await auth.apiFetch<{ currentRule: DeliveryRate | null }>('pricing/delivery')
        setCurrentDeliveryRate(pricing.currentRule)
      }
      setRoutePlan(result)
      setEnd(mode === 'Delivery' ? baseAddress.trim() : destinationPlace!.fullAddress)
      const choice = routeChoice === 'Económica' ? result.preferences.economical : result.preferences.fastest
      if (choice) setKm((choice.distanceMeters / 1000).toFixed(1))
      if (!choice) notify('Mapbox no devolvió alternativas para esta ruta')
      return result
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo calcular la ruta'); return null }
    finally { setPlanning(false) }
  }
  const activeDelivery = trips.find((trip) => trip.mode === 'Delivery' && trip.status === 'in_progress')
  const updateActiveDelivery = async (plannedRoute?: RoutePlan) => {
    if (!activeDelivery) return
    const planned = plannedRoute ?? await planRoute()
    const route = routeChoice === 'Económica' ? planned?.preferences.economical : planned?.preferences.fastest
    if (!route) return
    try {
      const deliveryStops = route.stopOrder.slice(1, -1)
      const updated = await auth.apiFetch<any>(`trips/${activeDelivery.id}/route`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ distanceMeters: Math.round(route.distanceMeters), durationSeconds: Math.round(route.durationSeconds), tollsClp: tolls, stops: deliveryStops, routeGeometry: route.geometry }) })
      setTrips((currentTrips) => currentTrips.map((trip) => trip.id === activeDelivery.id ? { ...trip, km: updated.distanceMeters / 1000, durationSeconds: updated.durationSeconds, amount: updated.totalCostClp, fuel: updated.fuelCostClp, tolls: updated.tollsClp, date: new Date(updated.startedAt).toLocaleString('es-CL'), stops: deliveryStops } : trip))
      notify('Ruta de delivery actualizada con las nuevas paradas')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo actualizar el delivery') }
  }
  const completeDelivery = async () => {
    if (!activeDelivery) return
    try { await auth.apiFetch(`trips/${activeDelivery.id}/complete`, { method: 'PATCH' }); setTrips(trips.map((trip) => trip.id === activeDelivery.id ? { ...trip, status: 'completed' } : trip)); notify('Delivery finalizado') }
    catch (e) { notify(e instanceof Error ? e.message : 'No se pudo finalizar el delivery') }
  }
  const saveDeliveryRates = async () => {
    setSavingRates(true)
    try {
      const result = await auth.apiFetch<{ rules: DeliveryRate[] }>('pricing/delivery', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: deliveryRates }) })
      setDeliveryRates(result.rules); notify('Tarifas de delivery guardadas')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudieron guardar las tarifas') }
    finally { setSavingRates(false) }
  }
  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!baseAddress.trim() || (mode === 'Viaje compartido' && !destinationPlace) || (mode === 'Delivery' && stops.length === 0)) { notify('Completa el punto base y los datos de la ruta antes de guardarla'); return }
    if (!vehicleConfigured) { notify('Primero configura tu vehículo'); setShowSettings(true); return }
    try {
      if (!selectedRoute) { notify('Calcula la ruta con Mapbox antes de guardarla'); return }
      const pricing = mode === 'Delivery' ? await auth.apiFetch<{ currentRule: DeliveryRate | null }>('pricing/delivery') : null
      if (pricing) setCurrentDeliveryRate(pricing.currentRule)
      const destination = mode === 'Delivery' ? baseAddress.trim() : destinationPlace!.fullAddress
      const savedStops = mode === 'Delivery' ? selectedRoute.stopOrder.slice(1, -1) : []
      const saved = await auth.apiFetch<any>('trips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: mode === 'Delivery' ? 'delivery' : 'shared', status: mode === 'Delivery' ? 'in_progress' : 'completed', origin: baseAddress.trim(), destination, stops: savedStops, distanceMeters: Math.round(selectedRoute.distanceMeters), durationSeconds: Math.round(selectedRoute.durationSeconds), tollsClp: tolls, participantCount: Number(passengers), deliveryFeeClp: pricing?.currentRule?.amountClp ?? 0, routeGeometry: selectedRoute.geometry }) })
      const completedAt = saved.completedAt ?? new Date().toISOString()
      const entry: Trip = { id: saved._id, title: `${saved.origin} → ${saved.destination}`, date: new Date(completedAt).toLocaleString('es-CL'), dateISO: saved.startedAt ?? completedAt, mode, status: saved.status, km: saved.distanceMeters / 1000, durationSeconds: saved.durationSeconds ?? selectedRoute.durationSeconds, amount: saved.totalCostClp, fuel: saved.fuelCostClp, tolls: saved.tollsClp, deliveryFee: saved.deliveryFeeClp, perPerson: saved.costPerParticipantClp, places: saved.participantCount, start: saved.origin, end: saved.destination, stops: saved.stops ?? [] }
      setTrips([entry, ...trips]); setModal(false); setTab('Historial'); notify('Ruta guardada en tu historial')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo guardar la ruta') }
  }
  const saveVehicle = async () => {
    setSavingVehicle(true)
    try {
      await auth.apiFetch('vehicles/primary', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: vehicleName.trim() || 'Mi auto', make: vehicleMake.trim(), model: vehicleModel.trim(), ...(vehicleYear ? { year: Number(vehicleYear) } : {}), fuelType, baseAddress: baseAddress.trim(), ...(baseCoordinates ? { baseCoordinates } : {}), efficiencyKmPerLiter: kmPerLiter, fuelPriceClp: Math.round(fuelPrice) }) })
      setVehicleConfigured(true); setShowSettings(false); notify('Vehículo guardado en tu cuenta')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo guardar el vehículo') }
    finally { setSavingVehicle(false) }
  }

  const addStop = async () => {
    if (!newStopPlace || planning) return
    const nextStops = appendDeliveryStop(stops, newStopPlace.fullAddress)
    setStops(nextStops)
    setNewStop('')
    setNewStopPlace(null)
    setRoutePlan(null)
    const planned = await planRoute(nextStops)
    if (activeDelivery && planned) await updateActiveDelivery(planned)
  }
  const removeStop = async (index: number) => {
    const nextStops = stops.filter((_, stopIndex) => stopIndex !== index)
    setStops(nextStops)
    setRoutePlan(null)
    if (nextStops.length === 0) return
    const planned = await planRoute(nextStops)
    if (activeDelivery && planned) await updateActiveDelivery(planned)
  }

  if (isWaitingForWorkspace(auth.loading, Boolean(auth.user), dataReady, startupTimedOut)) return <div className="auth-loading">Preparando tu espacio de Mi Auto…</div>
  if (needsWorkspaceRetry(auth.loading, Boolean(auth.user), dataReady, startupTimedOut)) return <main className="startup-error" role="alert"><div><h1>No pudimos conectar con Mi Auto</h1><p>El servidor tardó demasiado en responder. Comprueba que el backend esté iniciado y vuelve a intentar.</p><button className="primary-btn" onClick={() => window.location.reload()}>Reintentar</button></div></main>
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
        <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> {new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase()}</div><h1>Hola, {auth.user.name.split(' ')[0]} <span className="wave">✳</span></h1><p className="subheading">Tus rutas, costos y kilómetros, todo en un solo lugar.</p></div><button className="primary-btn" onClick={() => setModal(true)}><Plus size={18}/> Registrar ruta</button></div>
        <div className="stats-grid">
          <Stat label="KILÓMETROS DEL MES" value={monthKm.toFixed(1).replace('.', ',')} unit="km" change="" up caption="rutas guardadas" icon={<Route size={18}/>} color="green"/>
          <Stat label="COSTO DE VIAJES" value={money(monthSpend)} unit="" change="" up={false} caption="combustible + peajes" icon={<Wallet size={18}/>} color="sand"/>
          <Stat label="RUTAS REGISTRADAS" value={String(trips.length)} unit="" change="" up caption="en tu historial" icon={<Navigation size={18}/>} color="blue"/>
          <Stat label="RENDIMIENTO CONFIGURADO" value={averageEfficiency.toFixed(1).replace('.', ',')} unit="km/l" change="" up caption={trips.length ? 'de tu vehículo' : 'configura tu vehículo'} icon={<Fuel size={18}/>} color="rose"/>
        </div>

        <div className="section-heading"><div><h2>Tu próxima ruta</h2><p>Compara alternativas según distancia y gasto estimado.</p></div><button className="text-btn" onClick={() => notify('La optimización avanzada estará disponible al conectar mapas')}>Ver mapa completo <ArrowRight size={15}/></button></div>
        <div className="route-card">
          <div className="route-left">
            <div className="route-mode-cards" role="group" aria-label="Tipo de recorrido">
              <button type="button" className={mode === 'Viaje compartido' ? 'active' : ''} onClick={() => { setMode('Viaje compartido'); setRoutePlan(null) }}><span className="route-mode-icon"><Users size={17}/></span><span><b>Viaje compartido</b><small>Comparte gastos de ida y vuelta</small></span></button>
              <button type="button" className={mode === 'Delivery' ? 'active' : ''} onClick={() => { setMode('Delivery'); setRoutePlan(null) }}><span className="route-mode-icon delivery"><Navigation size={17}/></span><span><b>Delivery</b><small>Entrega pedidos y vuelve a tu base</small></span></button>
            </div>
            <div className="base-summary"><span className="base-pin"><MapPin size={16}/></span><div><small>SALIDA Y REGRESO</small><b>{baseAddress || 'Configura tu punto base en Mi vehículo'}</b></div>{!baseAddress && <button type="button" onClick={() => { setTab('Mi vehículo'); setShowSettings(true) }}>Configurar</button>}</div>
            {mode === 'Viaje compartido' ? <div className="route-destination"><PlaceSearch id="route-destination" label="DESTINO DEL VIAJE" value={end} selectedPlace={destinationPlace} placeholder="Busca un destino en Quintero" onChange={value => { setEnd(value); setDestinationPlace(null); setRoutePlan(null) }} onSelect={place => { if (place) { setDestinationPlace(place); setEnd(place.fullAddress) } setRoutePlan(null) }}/><p>La ruta se calcula desde tu base, hasta el destino y de vuelta a tu base.</p></div> : <div className="delivery-stops"><div className="delivery-stops-heading"><div><b>Paradas de entrega</b><small>{activeDelivery ? 'Se recalcula y guarda al agregar cada parada.' : 'Se agregan a la ruta antes del regreso a la base.'}</small></div><span>{stops.length}</span></div><div className="stop-list">{stops.map((stop, index) => <span key={`${stop}-${index}`} className="stop-chip"><i>{index + 1}</i>{stop}<button type="button" aria-label={`Quitar ${stop}`} onClick={() => void removeStop(index)}><X size={13}/></button></span>)}</div><div className="stop-add"><PlaceSearch id="delivery-stop" label="AGREGAR DIRECCIÓN" value={newStop} selectedPlace={newStopPlace} placeholder="Busca dónde entregar" onChange={value => { setNewStop(value); setNewStopPlace(null) }} onSelect={place => { if (place) { setNewStopPlace(place); setNewStop(place.fullAddress) } else setNewStopPlace(null) }}/><button type="button" className="add-stop-btn" disabled={!newStopPlace || planning} onClick={() => void addStop()}><Plus size={15}/><span>{planning ? 'Calculando…' : 'Agregar parada'}</span></button></div></div>}
            <div className={`route-fields ${mode === 'Delivery' ? 'route-fields-delivery' : ''}`}><label>Peajes estimados<input type="number" min="0" step="100" value={tolls} onChange={e => { setTolls(Number(e.target.value)); setRoutePlan(null) }}/></label>{mode === 'Viaje compartido' && <label>Personas que dividen el gasto<input type="number" min="1" max="50" value={passengers} onChange={e => setPassengers(e.target.value)}/></label>}</div>
            <div className="route-options"><button className={routeChoice === 'Económica' ? 'selected' : ''} onClick={() => setRouteChoice('Económica')}><Wallet size={15}/><span><b>Económica</b><small>{selectedRoute && routePlan ? `${money(selectedRoute.totalCostClp)} estimado` : 'Menor costo de combustible'}</small></span><i/></button><button className={routeChoice === 'Más rápida' ? 'selected' : ''} onClick={() => setRouteChoice('Más rápida')}><Clock3 size={15}/><span><b>Más rápida</b><small>{selectedRoute && routePlan ? `${Math.round(selectedRoute.durationSeconds / 60)} min estimados` : 'Menor tiempo de viaje'}</small></span><i/></button></div>
            <button className="outline-btn route-action" disabled={planning} onClick={() => void planRoute()}><LocateFixed size={16}/>{planning ? 'Calculando…' : 'Calcular ruta'}</button>
            {routePlan && <div className="route-result"><b>{selectedRoute ? `${(selectedRoute.distanceMeters / 1000).toFixed(1).replace('.', ',')} km · ${Math.round(selectedRoute.durationSeconds / 60)} min` : 'Sin ruta'}</b><span>{routePlan.notice}</span>{activeDelivery && mode === 'Delivery' ? <button className="primary-btn" disabled={!selectedRoute || planning} onClick={() => void updateActiveDelivery()}><Route size={15}/> Recalcular delivery activo</button> : <button className="primary-btn" disabled={!selectedRoute} onClick={() => setModal(true)}><Plus size={15}/> Guardar recorrido</button>}</div>}
          </div>
          <div className="map-panel"><div className="map-topline"><span><MapPin size={14}/> Quintero, Valparaíso</span><span className="map-tag">{routePlan ? 'RUTA MAPBOX' : 'MAPBOX'}</span></div><RouteMap geometry={selectedRoute?.geometry} baseAddress={baseAddress} baseCoordinates={baseCoordinates}/><div className="map-bottom"><span><i className="legend-line"/> Ruta seleccionada</span><span className="map-distance">{selectedRoute ? `${(selectedRoute.distanceMeters / 1000).toFixed(1).replace('.', ',')} km · ${money(selectedRoute.totalCostClp)}` : baseCoordinates ? 'Base · vista de 8 cuadras' : 'Configura tu base para centrar'}</span></div></div>
        </div>

        {activeDelivery && <div className="active-delivery"><div><span className="delivery-pulse"/><div><b>Delivery en curso</b><small>{activeDelivery.start} → {activeDelivery.end} · {activeDelivery.stops.length} paradas · {activeDelivery.km.toFixed(1)} km</small></div></div><button type="button" className="outline-btn" onClick={() => void completeDelivery()}><Check size={15}/> Finalizar delivery</button></div>}
        <div className="lower-grid"><section className="panel recent-panel"><div className="panel-head"><div><h2>Rutas recientes</h2><p>Tu actividad más reciente</p></div><button className="text-btn" onClick={() => setTab('Historial')}>Ver historial <ArrowRight size={15}/></button></div><div className="recent-list">{trips.slice(0,3).map((trip, i) => <TripRow key={trip.id} trip={trip} i={i}/>)}</div></section>
          <section className="panel efficiency-panel"><div className="panel-head"><div><h2>Kilómetros recientes</h2><p>Actividad real guardada</p></div><button className="icon-btn soft"><SlidersHorizontal size={16}/></button></div><div className="chart"><div className="chart-grid"><span>30 km</span><span>20 km</span><span>10 km</span><span>0 km</span></div><div className="bars">{weekDistance(trips).map(({ day, km: dayKm, height }, i) => <div className="bar-col" key={`${day}-${i}`}><div className={`bar ${i === (new Date().getDay() + 6) % 7 ? 'highlight' : ''}`} style={{ height: `${height}%` }}/><small>{day}</small><em>{dayKm.toFixed(1)}</em></div>)}</div></div><div className="chart-foot"><span>Últimos 7 días</span><b>{weekDistance(trips).reduce((sum, item) => sum + item.km, 0).toFixed(1).replace('.', ',')} km</b></div></section>
        </div>
        <footer>Los costos son estimaciones basadas en el rendimiento configurado de tu vehículo. <button onClick={() => setShowSettings(true)}>Ajustar consumo y combustible</button></footer>
      </div>}

      {tab === 'Historial' && <div className="content history-content"><div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> TU ACTIVIDAD</div><h1>Historial de rutas</h1><p className="subheading">Revisa kilómetros, costos estimados y recorridos guardados.</p></div><button className="primary-btn" onClick={() => setModal(true)}><Plus size={18}/> Registrar ruta</button></div><div className="history-summary"><div><small>RUTAS GUARDADAS</small><b>{trips.length}</b></div><div><small>KILÓMETROS REGISTRADOS</small><b>{trips.reduce((s,t)=>s+t.km,0).toFixed(1).replace('.',',')} km</b></div><div><small>COSTO TOTAL EST.</small><b>{money(trips.reduce((s,t)=>s+t.amount,0))}</b></div></div><div className="history-tools"><div className="searchbox"><input placeholder="Buscar origen o destino…" value={query} onChange={e=>setQuery(e.target.value)}/><span>⌕</span></div><div className="filter-group">{['Todos','Viaje compartido','Delivery'].map(f=><button className={filter===f?'chosen':''} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div></div><div className="panel history-table"><div className="table-head"><span>RUTA</span><span>TIPO</span><span>FECHA</span><span>DISTANCIA</span><span>COSTO EST.</span><span/></div>{shownTrips.map((t,i)=><TripRow key={t.id} trip={t} i={i} detailed/>)}{shownTrips.length===0&&<div className="empty">No hay rutas que coincidan con tu búsqueda.</div>}</div></div>}

      {tab === 'Mi vehículo' && <VehicleProfile configured={vehicleConfigured} name={vehicleName} make={vehicleMake} model={vehicleModel} year={vehicleYear} fuelType={fuelType} baseAddress={baseAddress} kmPerLiter={kmPerLiter} litersPer100={litersPer100} fuelPrice={fuelPrice} trips={trips} onEdit={() => setShowSettings(true)}/> }
    </main>
    {showSettings && <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowSettings(false)}}><aside className="settings-drawer"><div className="settings-drawer-scroll"><div className="drawer-head"><div><small>CONFIGURACIÓN</small><h2>Datos del vehículo</h2></div><button className="icon-btn" onClick={()=>setShowSettings(false)}><X size={18}/></button></div><section className="vehicle-form-section"><h3>Identificación</h3><div className="vehicle-form-grid"><label className="form-label">Nombre del auto<input maxLength={60} value={vehicleName} onChange={e=>setVehicleName(e.target.value)}/><small>Cómo aparecerá en Mi Auto</small></label><label className="form-label">Marca<input maxLength={60} placeholder="Ej. Toyota" value={vehicleMake} onChange={e=>setVehicleMake(e.target.value)}/></label><label className="form-label">Modelo<input maxLength={60} placeholder="Ej. Yaris" value={vehicleModel} onChange={e=>setVehicleModel(e.target.value)}/></label><label className="form-label">Año<input type="number" min="1950" max="2100" placeholder="Ej. 2020" value={vehicleYear} onChange={e=>setVehicleYear(e.target.value)}/></label><label className="form-label vehicle-fuel-field">Combustible<select value={fuelType} onChange={e=>setFuelType(e.target.value as FuelType)}><option value="gasoline">Bencina</option><option value="diesel">Diésel</option><option value="hybrid">Híbrido</option><option value="electric">Eléctrico</option><option value="other">Otro</option></select></label></div><div className="form-label base-address-field"><span>Punto base de salida y regreso</span><PlaceSearch id="vehicle-base-address" label="DIRECCIÓN BASE" value={baseAddress} selectedPlace={basePlace} placeholder="Busca casa, local u otro punto" onChange={value => { setBaseAddress(value); setBaseCoordinates(null); setBasePlace(null) }} onSelect={place => { setBasePlace(place); setBaseCoordinates(place?.coordinates ?? null); if (place) setBaseAddress(place.fullAddress) }}/><small>Se usará como inicio y fin de todas las rutas.</small><button type="button" className="base-map-open" onClick={() => setShowBasePicker(true)}><MapPin size={14}/> Marcar punto exacto en el mapa</button></div></section><section className="vehicle-form-section"><h3>Rendimiento y combustible</h3><label className="form-label">Rendimiento<input type="number" min="0.1" step="0.1" value={kmPerLiter} onChange={e=>{const v=Number(e.target.value);if(v>0)setKmPerLiter(v)}}/><small>Kilómetros por litro (km/L)</small></label><label className="form-label">Consumo equivalente<input type="number" min="0.1" step="0.1" value={litersPer100.toFixed(1)} onChange={e=>{const v=Number(e.target.value);if(v>0)setKmPerLiter(100/v)}}/><small>Litros cada 100 kilómetros (L/100 km)</small></label><label className="form-label">Precio combustible<input type="number" min="1" value={fuelPrice} onChange={e=>setFuelPrice(Number(e.target.value))}/><small>Pesos chilenos por litro</small></label><div className="drawer-info"><Fuel size={18}/><span>El consumo equivalente se actualiza automáticamente desde km/L.</span></div></section><section className="pricing-editor"><div className="pricing-editor-head"><div><b>Tarifas de delivery</b><small>Pesos por viaje según la hora en Chile</small></div><button type="button" className="icon-btn" aria-label="Agregar tramo horario" onClick={() => setDeliveryRates([...deliveryRates, { id: crypto.randomUUID(), label: 'Nuevo horario', startTime: '20:00', endTime: '22:00', amountClp: 1000 }])}><Plus size={16}/></button></div>{deliveryRates.map((rate, index) => <div className="rate-row" key={rate.id}>
        <div className="rate-row-header"><label className="rate-field">Nombre del tramo<input aria-label="Nombre tarifa" value={rate.label} onChange={e => setDeliveryRates(deliveryRates.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}/></label><button type="button" className="icon-btn rate-delete" aria-label={`Eliminar tramo ${rate.label}`} onClick={() => setDeliveryRates(deliveryRates.filter((_, i) => i !== index))}><Trash2 size={15}/></button></div>
        <div className="rate-row-hours"><label className="rate-field">Desde<input aria-label="Desde" type="time" value={rate.startTime} onChange={e => setDeliveryRates(deliveryRates.map((item, i) => i === index ? { ...item, startTime: e.target.value } : item))}/></label><label className="rate-field">Hasta<input aria-label="Hasta" type="text" inputMode="numeric" placeholder="24:00" value={rate.endTime} onChange={e => setDeliveryRates(deliveryRates.map((item, i) => i === index ? { ...item, endTime: e.target.value } : item))}/></label></div>
        <label className="rate-field">Precio por viaje<div className="rate-price-input"><span>$</span><input aria-label="Tarifa CLP" type="number" min="0" step="100" value={rate.amountClp} onChange={e => setDeliveryRates(deliveryRates.map((item, i) => i === index ? { ...item, amountClp: Number(e.target.value) } : item))}/><small>CLP</small></div></label>
      </div>)}<button type="button" className="outline-btn full" disabled={savingRates || deliveryRates.length === 0} onClick={() => void saveDeliveryRates()}><Check size={15}/>{savingRates ? 'Guardando tarifas…' : 'Guardar tarifas'}</button><small className="pricing-hint">Tramos sin superposición. Para terminar el día usa 24:00 como hora de cierre.</small></section></div><button className="primary-btn full" disabled={savingVehicle} onClick={()=>void saveVehicle()}><Check size={17}/> {savingVehicle ? 'Guardando…' : 'Guardar configuración'}</button></aside></div>}
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="trip-modal" onSubmit={createTrip}><div className="modal-head"><div><div className="eyebrow"><span className="eyebrow-line"/> NUEVO REGISTRO</div><h2>{mode === 'Delivery' ? 'Iniciar delivery' : 'Guardar viaje compartido'}</h2><p>La ruta completa incluye el regreso a tu punto base.</p></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X size={19}/></button></div><div className="modal-route-kind">{mode === 'Delivery' ? <Navigation size={16}/> : <Users size={16}/>} {mode}</div><label className="form-label">Salida y regreso<input value={baseAddress} readOnly required/></label><label className="form-label">{mode === 'Delivery' ? `Paradas de entrega (${stops.length})` : 'Destino'}<input value={mode === 'Delivery' ? stops.join(' · ') : end} readOnly required/></label><div className="form-two"><label className="form-label">Distancia total, ida y vuelta<input type="text" value={selectedRoute ? `${(selectedRoute.distanceMeters / 1000).toFixed(1)} km` : 'Calcula la ruta primero'} readOnly/></label><label className="form-label">Tiempo estimado, ida y vuelta<input type="text" value={selectedRoute ? formatDuration(selectedRoute.durationSeconds) : 'Calcula la ruta primero'} readOnly/></label></div>{mode === 'Viaje compartido' && <label className="form-label">Personas que dividen gastos<input type="number" min="1" max="50" step="1" value={passengers} onChange={e=>setPassengers(e.target.value)}/></label>}<div className="estimate"><div><Fuel size={17}/><span>Gasto auto · {money(tolls)} en peajes</span></div><b>{money(selectedRoute?.totalCostClp ?? tripCost)}</b><small>{mode === 'Delivery' ? `Tarifa de este delivery: ${currentDeliveryRate ? `${currentDeliveryRate.label} · ${money(currentDeliveryRate.amountClp)}` : 'sin tramo horario vigente'}` : `Dividido entre ${passengers} personas: ${money(Math.ceil((selectedRoute?.totalCostClp ?? tripCost) / Math.max(1, Number(passengers))))} c/u`}</small></div><button type="submit" className="primary-btn full"><Check size={17}/> {mode === 'Delivery' ? 'Iniciar delivery' : 'Guardar en historial'}</button><p className="modal-footnote">Puedes corregir la distancia con los kilómetros reales del odómetro.</p></form></div>}
    {showBasePicker && <div className="base-picker-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowBasePicker(false)}}><section className="base-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="base-picker-title"><header><div><small>UBICACIÓN DEL VEHÍCULO</small><h2 id="base-picker-title">Marca la esquina exacta</h2><p>{baseAddress || 'Haz clic donde está tu casa para fijar el punto base.'}</p></div><button type="button" className="icon-btn" aria-label="Cerrar mapa" onClick={()=>setShowBasePicker(false)}><X size={18}/></button></header><RouteMap baseAddress={baseAddress} baseCoordinates={baseCoordinates} onPickBase={pickBaseCoordinates}/><footer><span>Haz clic en el mapa. La dirección y coordenadas se guardan al guardar el vehículo.</span><button type="button" className="primary-btn" disabled={!baseCoordinates} onClick={()=>setShowBasePicker(false)}><Check size={15}/> Usar este punto</button></footer></section></div>}
    {toast&&<div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function VehicleProfile({ configured, name, make, model, year, fuelType, baseAddress, kmPerLiter, litersPer100, fuelPrice, trips, onEdit }: {
  configured: boolean; name: string; make: string; model: string; year: string; fuelType: FuelType
  baseAddress: string; kmPerLiter: number; litersPer100: number; fuelPrice: number; trips: Trip[]; onEdit: () => void
}) {
  const totalKm = registeredKilometers(trips)
  const totalFuelSpend = recordedFuelSpend(trips)
  const vehicleDescription = [make, model, year].filter(Boolean).join(' · ')

  return <div className="content vehicle-content">
    <div className="welcome-row">
      <div><div className="eyebrow"><span className="eyebrow-line"/> PERFIL DE CONDUCCIÓN</div><h1>Mi vehículo</h1><p className="subheading">La información que usamos para estimar tus rutas y consumos.</p></div>
      <button className="primary-btn" onClick={onEdit}><Settings2 size={17}/>{configured ? 'Editar vehículo' : 'Configurar vehículo'}</button>
    </div>
    <section className={`vehicle-hero ${configured ? '' : 'vehicle-unconfigured'}`}>
      <div className="vehicle-illustration" aria-hidden="true"><div className="vehicle-sun"/><div className="vehicle-road vehicle-road-one"/><div className="vehicle-road vehicle-road-two"/><div className="vehicle-icon"><CarFront size={70} strokeWidth={1.35}/></div><span>MI AUTO · QUINTERO</span></div>
      <div className="vehicle-summary">
        <div className={`vehicle-status ${configured ? 'is-configured' : ''}`}><i/>{configured ? 'VEHÍCULO PRINCIPAL' : 'FICHA PENDIENTE'}</div>
        <h2>{configured ? name : 'Cuéntanos de tu auto'}</h2>
        <p>{configured ? (vehicleDescription || 'Agrega marca, modelo y año para completar la ficha.') : 'Completa sus datos para calcular costos de combustible y comparar rutas.'}</p>
        <div className="vehicle-tags">{configured && <span>{fuelTypeLabels[fuelType]}</span>}{configured && year && <span>{year}</span>}{baseAddress && <span><MapPin size={12}/>{baseAddress}</span>}<span>{configured ? 'Datos guardados en tu cuenta' : 'Solo toma un minuto'}</span></div>
        <button className="vehicle-edit-link" onClick={onEdit}><Settings2 size={15}/>{configured ? 'Actualizar ficha del vehículo' : 'Completar ficha del vehículo'}<ArrowRight size={15}/></button>
      </div>
    </section>
    <section className="vehicle-metrics" aria-label="Resumen del vehículo">
      <article className="vehicle-metric metric-mint"><small>RENDIMIENTO</small><b>{configured ? `${kmPerLiter.toFixed(1).replace('.', ',')} km/L` : 'Por configurar'}</b><span>{configured ? 'Kilómetros por litro' : 'Dato del vehículo'}</span></article>
      <article className="vehicle-metric metric-peach"><small>CONSUMO EQUIVALENTE</small><b>{configured ? `${litersPer100.toFixed(1).replace('.', ',')} L` : '—'}</b><span>{configured ? 'Litros cada 100 km' : 'Se calcula desde km/L'}</span></article>
      <article className="vehicle-metric metric-yellow"><small>KILÓMETROS REGISTRADOS</small><b>{totalKm.toFixed(1).replace('.', ',')} km</b><span>En tus rutas guardadas</span></article>
      <article className="vehicle-metric metric-lilac"><small>COMBUSTIBLE REGISTRADO</small><b>{money(totalFuelSpend)}</b><span>{configured ? `Referencia: ${money(fuelPrice)} por litro` : 'Gasto guardado en tus rutas'}</span></article>
    </section>
    <div className="vehicle-note"><ShieldCheck size={18}/><span><b>Cómo usamos estos datos</b><br/>El rendimiento y el precio por litro alimentan las estimaciones. Los kilómetros y gastos mostrados vienen de tus rutas guardadas; no leemos el odómetro automáticamente.</span></div>
  </div>
}

function Stat({label,value,unit,change,up,caption,icon,color}:{label:string,value:string,unit:string,change:string,up:boolean,caption:string,icon:React.ReactNode,color:string}) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}<span>{unit}</span></div><div className="stat-change">{change&&<b className={up?'up':'down'}>{up?<ArrowUpRight size={13}/>:<ArrowDownRight size={13}/>} {change}</b>}<span>{caption}</span></div></div> }
function TripRow({trip,i,detailed=false}:{trip:Trip,i:number,detailed?:boolean}) { return <div className={`trip-row ${detailed?'detailed':''}`}><div className="trip-route"><div className={`trip-icon tone-${i%3}`}>{trip.mode==='Delivery'?<Navigation size={16}/>:<Route size={16}/>}</div><div><b>{trip.title}</b><small>{trip.start} <span>→</span> {trip.end}</small></div></div><div className="trip-type"><span className={trip.mode==='Delivery'?'delivery-badge':'shared-badge'}>{trip.mode}</span></div><div className="trip-date">{trip.date}</div><div className="trip-km"><b>{trip.km.toFixed(1).replace('.',',')} km</b><small>{formatDuration(trip.durationSeconds)}</small></div><div className="trip-cost"><b>{money(trip.amount)}</b><small>{trip.mode === 'Delivery' ? `tarifa ${money(trip.deliveryFee)}` : `${trip.places} personas · ${money(trip.perPerson)} c/u`}</small></div>{detailed&&<button className="row-more" title="Detalles"><ChevronDown size={16}/></button>}</div> }
export default App
