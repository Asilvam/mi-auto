import { useEffect, useRef, useState } from 'react'
import { LocateFixed } from 'lucide-react'
import type { GeoJSONSource, Map as MapboxMap, MapMouseEvent, Marker as MapboxMarker } from 'mapbox-gl'
import type { Feature, LineString } from 'geojson'
import { BASE_AREA_ZOOM, mapStartView, type MapCoordinates } from './base-map'
import 'mapbox-gl/dist/mapbox-gl.css'

type RouteGeometry = { type: 'LineString'; coordinates: [number, number][] }
const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined

export default function RouteMap({ geometry, baseAddress, baseCoordinates, onPickBase }: { geometry?: RouteGeometry; baseAddress: string; baseCoordinates: MapCoordinates | null; onPickBase?: (coordinates: MapCoordinates) => void }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const mapbox = useRef<typeof import('mapbox-gl').default | null>(null)
  const baseMarker = useRef<MapboxMarker | null>(null)
  const locationMarker = useRef<MapboxMarker | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')

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
    return () => { cancelled = true; baseMarker.current?.remove(); locationMarker.current?.remove(); map.current?.remove(); baseMarker.current = null; locationMarker.current = null; map.current = null; mapbox.current = null }
  }, [])

  useEffect(() => {
    const instance = map.current
    const mapboxgl = mapbox.current
    if (!mapLoaded || !instance || !mapboxgl) return
    if (!baseCoordinates) {
      baseMarker.current?.remove()
      baseMarker.current = null
      return
    }
    if (!baseMarker.current) {
      const element = document.createElement('div')
      element.className = 'map-base-marker'
      element.innerHTML = '<span>⌂</span><b>Base</b>'
      element.setAttribute('aria-label', `Punto base${baseAddress ? `: ${baseAddress}` : ''}`)
      baseMarker.current = new mapboxgl.Marker({ element, anchor: 'bottom' }).setLngLat(baseCoordinates).addTo(instance)
    } else baseMarker.current.setLngLat(baseCoordinates)
    if (!geometry?.coordinates?.length) instance.flyTo({ center: baseCoordinates, zoom: BASE_AREA_ZOOM, duration: 650 })
  }, [baseAddress, baseCoordinates, geometry, mapLoaded])

  useEffect(() => {
    const instance = map.current
    if (!mapLoaded || !instance || !onPickBase) return
    const choosePoint = (event: MapMouseEvent) => onPickBase([event.lngLat.lng, event.lngLat.lat])
    instance.getCanvas().style.cursor = 'crosshair'
    instance.on('click', choosePoint)
    return () => {
      instance.off('click', choosePoint)
      instance.getCanvas().style.cursor = ''
    }
  }, [mapLoaded, onPickBase])

  useEffect(() => {
    const instance = map.current
    const mapboxgl = mapbox.current
    if (!mapLoaded || !instance || !mapboxgl || !geometry?.coordinates?.length) return
    const draw = () => {
      const feature: Feature<LineString> = { type: 'Feature', properties: {}, geometry }
      if (instance.getSource('planned-route')) {
        (instance.getSource('planned-route') as GeoJSONSource).setData(feature)
      } else {
        instance.addSource('planned-route', { type: 'geojson', data: feature })
        instance.addLayer({ id: 'planned-route-line', type: 'line', source: 'planned-route', paint: { 'line-color': '#39765f', 'line-width': 5, 'line-opacity': 0.9 } })
      }
      const bounds = geometry.coordinates.reduce((result, point) => result.extend(point), new mapboxgl.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]))
      instance.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 500 })
    }
    draw()
  }, [geometry, mapLoaded])

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
  return <div className={`map-container ${onPickBase ? 'map-base-picker' : ''}`}><div className="mapbox-canvas" ref={host} aria-label="Mapa de rutas de Mi Auto" />{onPickBase && <div className="map-pick-instruction">Pulsa en el mapa para marcar el punto exacto de tu casa.</div>}<button className="map-location-button" type="button" disabled={!mapLoaded || locating} onClick={locateMe} aria-label="Centrar el mapa en mi ubicación GPS"><LocateFixed size={15}/><span>{locating ? 'Buscando GPS…' : 'Mi ubicación'}</span></button>{locationMessage && <div className="map-location-message" role="status">{locationMessage}</div>}</div>
}

function MapMarker() { return <span className="map-marker">⌖</span> }
