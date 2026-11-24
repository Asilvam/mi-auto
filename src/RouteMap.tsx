import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { GeoJSONSource, Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import type { Feature, LineString } from 'geojson'
import { BASE_AREA_ZOOM, basePickerMarkerCoordinates, canvasPointFromClick, mapStartView, QUINTERO_CENTER, type MapCoordinates } from './base-map'
import { hasRouteGeometry } from './route-display'
import 'mapbox-gl/dist/mapbox-gl.css'

type RouteGeometry = { type: 'LineString'; coordinates: [number, number][] }
const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined

export default function RouteMap({ geometry, outboundGeometry, returnGeometry, baseCoordinates, destinationCoordinates, onPickBase, onPickDestination }: { geometry?: RouteGeometry; outboundGeometry?: RouteGeometry; returnGeometry?: RouteGeometry | null; baseCoordinates: MapCoordinates | null; destinationCoordinates?: MapCoordinates | null; onPickBase?: (coordinates: MapCoordinates) => void; onPickDestination?: (coordinates: MapCoordinates) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const mapbox = useRef<typeof import('mapbox-gl').default | null>(null)
  const basePickerMarker = useRef<MapboxMarker | null>(null)
  const destinationMarker = useRef<MapboxMarker | null>(null)
  const locationMarker = useRef<MapboxMarker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [pointSelectionMessage, setPointSelectionMessage] = useState('')

  useEffect(() => {
    if (!token || !host.current || map.current) return
    let cancelled = false
    void import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled || !host.current) return
      mapbox.current = mapboxgl
      mapboxgl.accessToken = token
      const startView = mapStartView(baseCoordinates)
      const instance = new mapboxgl.Map({ container: host.current, style: 'mapbox://styles/mapbox/streets-v12', ...startView, attributionControl: true })
      map.current = instance
      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      instance.once('load', () => setMapLoaded(true))
    })
    return () => { cancelled = true; basePickerMarker.current?.remove(); destinationMarker.current?.remove(); locationMarker.current?.remove(); map.current?.remove(); basePickerMarker.current = null; destinationMarker.current = null; locationMarker.current = null; map.current = null; mapbox.current = null }
  }, [])

  useEffect(() => {
    const instance = map.current
    const mapboxgl = mapbox.current
    if (!mapLoaded || !instance || !mapboxgl) return
    const markerCoordinates = basePickerMarkerCoordinates(Boolean(onPickBase), baseCoordinates)
    if (!markerCoordinates) {
      basePickerMarker.current?.remove()
      basePickerMarker.current = null
      return
    }
    if (!basePickerMarker.current) {
      const element = document.createElement('div')
      element.className = 'map-base-pick-marker'
      element.setAttribute('role', 'img')
      element.setAttribute('aria-label', 'Punto base seleccionado')
      basePickerMarker.current = new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat(markerCoordinates).addTo(instance)
    } else basePickerMarker.current.setLngLat(markerCoordinates)
  }, [baseCoordinates, mapLoaded, onPickBase])

  useEffect(() => {
    const instance = map.current
    const mapboxgl = mapbox.current
    if (!mapLoaded || !instance || !mapboxgl || onPickBase) return
    if (!destinationCoordinates) {
      destinationMarker.current?.remove()
      destinationMarker.current = null
      return
    }
    if (!destinationMarker.current) {
      const element = document.createElement('div')
      element.className = 'map-destination-marker'
      element.setAttribute('role', 'img')
      element.setAttribute('aria-label', 'Destino seleccionado en el mapa')
      destinationMarker.current = new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat(destinationCoordinates).addTo(instance)
    } else destinationMarker.current.setLngLat(destinationCoordinates)
  }, [destinationCoordinates, mapLoaded, onPickBase])

  useEffect(() => {
    const instance = map.current
    if (!mapLoaded || !instance || (!onPickBase && !onPickDestination)) return
    const canvas = instance.getCanvas()
    const choosePoint = (event: MouseEvent) => {
      const point = canvasPointFromClick(event.clientX, event.clientY, canvas.getBoundingClientRect())
      const coordinates = instance.unproject(point)
      const selectedCoordinates: MapCoordinates = [coordinates.lng, coordinates.lat]
      if (onPickBase) {
        onPickBase(selectedCoordinates)
        setPointSelectionMessage('Punto marcado. Puedes elegir otra esquina o confirmar este punto.')
      } else if (onPickDestination) {
        onPickDestination(selectedCoordinates)
        instance.flyTo({ center: selectedCoordinates, zoom: Math.max(instance.getZoom(), 14), duration: 450 })
      }
    }
    canvas.style.cursor = onPickBase || onPickDestination ? 'crosshair' : ''
    canvas.addEventListener('click', choosePoint, true)
    return () => {
      canvas?.removeEventListener('click', choosePoint, true)
      if (canvas?.isConnected) canvas.style.cursor = ''
    }
  }, [mapLoaded, onPickBase, onPickDestination])

  useEffect(() => {
    const instance = map.current
    const mapboxgl = mapbox.current
    if (!mapLoaded || !instance || !mapboxgl) return
    const routeOut = hasRouteGeometry(outboundGeometry) ? outboundGeometry : geometry
    const routeBack = hasRouteGeometry(returnGeometry) ? returnGeometry : undefined
    const removeRoutePart = (source: string, layer: string) => {
      if (instance.getLayer(layer)) instance.removeLayer(layer)
      if (instance.getSource(source)) instance.removeSource(source)
    }
    if (!hasRouteGeometry(geometry) || !hasRouteGeometry(routeOut)) {
      removeRoutePart('planned-route-return', 'planned-route-return-line')
      removeRoutePart('planned-route', 'planned-route-line')
      if (!onPickBase) instance.flyTo({ center: destinationCoordinates ?? baseCoordinates ?? QUINTERO_CENTER, zoom: destinationCoordinates ? Math.max(instance.getZoom(), 14) : baseCoordinates ? BASE_AREA_ZOOM : 12, duration: 450 })
      return
    }
    const draw = () => {
      const upsertLine = (sourceId: string, layerId: string, lineGeometry: RouteGeometry, color: string, width: number, opacity: number) => {
        const feature: Feature<LineString> = { type: 'Feature', properties: {}, geometry: lineGeometry }
        if (instance.getSource(sourceId)) (instance.getSource(sourceId) as GeoJSONSource).setData(feature)
        else instance.addSource(sourceId, { type: 'geojson', data: feature })
        if (!instance.getLayer(layerId)) instance.addLayer({ id: layerId, type: 'line', source: sourceId, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity } })
      }
      if (routeBack) upsertLine('planned-route-return', 'planned-route-return-line', routeBack, '#B7E4CF', 6, 0.95)
      else removeRoutePart('planned-route-return', 'planned-route-return-line')
      upsertLine('planned-route', 'planned-route-line', routeOut, '#34765E', 5, 1)
      const bounds = geometry.coordinates.reduce((result, point) => result.extend(point), new mapboxgl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]))
      instance.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 500 })
    }
    draw()
  }, [baseCoordinates, destinationCoordinates, geometry, outboundGeometry, returnGeometry, mapLoaded, onPickBase])

  const locateMe = () => {
    if (!navigator.geolocation) { setLocationMessage('Este navegador no ofrece ubicación GPS.'); return }
    setLocating(true)
    setLocationMessage('')
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const currentMap = map.current
      const mapboxgl = mapbox.current
      const position: MapCoordinates = [coords.longitude, coords.latitude]
      if (currentMap && mapboxgl) {
        if (!locationMarker.current) {
          const element = document.createElement('div')
          element.className = 'map-gps-marker'
          element.setAttribute('aria-label', 'Tu ubicación GPS actual')
          locationMarker.current = new mapboxgl.Marker({ element, anchor: 'center' }).setLngLat(position).addTo(currentMap)
        } else locationMarker.current.setLngLat(position)
        currentMap.flyTo({ center: position, zoom: BASE_AREA_ZOOM, duration: 700 })
      }
      setLocationMessage('GPS centrado · ubicación temporal')
      setLocating(false)
    }, (error) => {
      setLocationMessage(error.code === error.PERMISSION_DENIED ? 'Permite ubicación en el navegador para usar el GPS.' : 'No se pudo obtener tu ubicación GPS.')
      setLocating(false)
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 })
  }

  if (!token) return <div className="map-token-missing"><MapMarker/> <b>Mapa listo para conectar</b><span>Configura VITE_MAPBOX_PUBLIC_TOKEN para mostrar Mapbox.</span></div>
  return <div className={`map-container ${onPickBase ? 'map-base-picker' : ''}`}><div className="mapbox-canvas" ref={host} aria-label="Mapa de rutas de Mi Auto" />{onPickBase && <div className="map-pick-instruction" role="status">{pointSelectionMessage || 'Pulsa en el mapa para marcar el punto exacto de tu casa.'}</div>}{onPickDestination && <div className="map-destination-instruction" role="status">Haz clic en el mapa para fijar el destino exacto</div>}<button className="map-location-button" type="button" disabled={!mapLoaded || locating} onClick={locateMe} aria-label="Centrar el mapa en mi ubicación GPS"><LocateFixed size={15}/><span>{locating ? 'Buscando GPS…' : 'Mi ubicación'}</span></button>{locationMessage && <div className="map-location-message" role="status">{locationMessage}</div>}</div>
}

function MapMarker() { return <span className="map-marker">⌖</span> }
