import { useEffect, useState } from 'react'
import { LoaderCircle, MapPin, Search } from 'lucide-react'
import { useAuth } from './auth'

export type PlaceSuggestion = {
  id: string
  name: string
  fullAddress: string
  coordinates: [number, number]
}

type Props = {
  id: string
  label: string
  scope: 'quintero' | 'valparaiso'
  value: string
  selectedPlace: PlaceSuggestion | null
  placeholder: string
  onChange: (value: string) => void
  onSelect: (place: PlaceSuggestion | null) => void
}

export default function PlaceSearch({ id, label, scope, value, selectedPlace, placeholder, onChange, onSelect }: Props) {
  const { apiFetch } = useAuth()
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const isSelected = Boolean(selectedPlace && selectedPlace.fullAddress === value)

  useEffect(() => {
    const query = value.trim()
    if (query.length < 3 || isSelected) {
      setSuggestions([])
      setSearching(false)
      setSearchError(false)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      setSearchError(false)
      void apiFetch<PlaceSuggestion[]>(`routes/places?q=${encodeURIComponent(query)}&scope=${scope}`, { signal: controller.signal })
        .then((places) => { if (!controller.signal.aborted) setSuggestions(places) })
        .catch(() => { if (!controller.signal.aborted) { setSuggestions([]); setSearchError(true) } })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [apiFetch, isSelected, value])

  const choose = (place: PlaceSuggestion) => {
    onChange(place.fullAddress)
    onSelect(place)
    setSuggestions([])
    setFocused(false)
  }

  return <div className="place-field">
    <label htmlFor={id}><small>{label}</small></label>
    <div className={`place-input-wrap ${isSelected ? 'place-selected' : ''}`}>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={focused && suggestions.length > 0}
        aria-controls={`${id}-suggestions`}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 160)}
        onChange={(event) => { onChange(event.target.value); onSelect(null) }}
        onKeyDown={(event) => { if (event.key === 'Escape') setFocused(false) }}
      />
      {searching ? <LoaderCircle className="place-search-icon spinning" size={14}/> : isSelected ? <MapPin className="place-search-icon selected" size={14}/> : <Search className="place-search-icon" size={14}/>}
    </div>
    {focused && value.trim().length >= 3 && !isSelected && <div id={`${id}-suggestions`} className="place-suggestions" role="listbox" aria-label={`Sugerencias para ${label.toLowerCase()}`}>
      {searching && <div className="place-suggestion-message">Buscando lugares en {scope === 'quintero' ? 'Quintero' : 'la Región de Valparaíso'}…</div>}
      {!searching && searchError && <div className="place-suggestion-message place-suggestion-error">No se pudieron buscar lugares. Revisa tu conexión.</div>}
      {!searching && !searchError && suggestions.length === 0 && <div className="place-suggestion-message">No encontramos lugares. Prueba otra dirección.</div>}
      {!searching && suggestions.map((place) => <button type="button" role="option" aria-selected="false" className="place-suggestion" key={place.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(place)}>
        <MapPin size={15}/><span><b>{place.name}</b><small>{place.fullAddress}</small></span>
      </button>)}
    </div>}
    {isSelected && <span className="place-selection-note">Ubicación seleccionada</span>}
    {!isSelected && value.trim().length > 0 && value.trim().length < 3 && <span className="place-selection-note">Escribe al menos 3 caracteres</span>}
  </div>
}
