import { useEffect, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'
import type { Feature, LineString } from 'geojson'
import 'mapbox-gl/dist/mapbox-gl.css'

type RouteGeometry = { type: 'LineString'; coordinates: [number, number][] }
const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined

export default function RouteMap({ geometry }: { geometry?: RouteGeometry }) {
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const mapbox = useRef<typeof import('mapbox-gl').default | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!token || !host.current || map.current) return
    let cancelled = false
    void import('mapbox-gl').then(({ default: mapboxgl }) => {
      if (cancelled || !host.current) return
      mapbox.current = mapboxgl
      mapboxgl.accessToken = token
      const instance = new mapboxgl.Map({ container: host.current, style: 'mapbox://styles/mapbox/streets-v12', center: [-71.5333, -32.7833], zoom: 12, attributionControl: true })
      map.current = instance
      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
      instance.once('load', () => setMapLoaded(true))
    })
    return () => { cancelled = true; map.current?.remove(); map.current = null; mapbox.current = null }
  }, [])

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

  if (!token) return <div className="map-token-missing"><MapMarker/> <b>Mapa listo para conectar</b><span>Configura VITE_MAPBOX_PUBLIC_TOKEN para mostrar Mapbox.</span></div>
  return <div className="mapbox-canvas" ref={host} aria-label="Mapa de rutas de Mi Auto" />
}

function MapMarker() { return <span className="map-marker">⌖</span> }
