'use client'

import { useState, useEffect } from 'react'
import debounce from 'lodash.debounce'

export default function Home() {
  const [form, setForm] = useState({
    date: '',
    time: '',
    place: '',
    location: null,
    locationSelected: false
  })
  const [suggestions, setSuggestions] = useState([])
  const [continued, setContinued] = useState(false)
  const [loading, setLoading] = useState(false)
  const [interpretation, setInterpretation] = useState('')

  const fetchSuggestions = debounce(async (query) => {
    if (query.length < 3) return

    const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}`)
    const data = await res.json()
    setSuggestions(data.results.map(r => ({
      displayName: r.formatted,
      lat: r.geometry.lat,
      lng: r.geometry.lng
    })))
  }, 400)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (form.place && !form.locationSelected) {
      fetchSuggestions(form.place)
    } else {
      setSuggestions([])
    }
  }, [form.place, form.locationSelected])

  const handleContinue = e => {
    setContinued(true)
  }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value,
      locationSelected: name === 'place' ? false : prev.locationSelected
    }))
  }

  const handlePlaceSelect = async (suggestion) => {
    const tzRes = await fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.NEXT_PUBLIC_TIMEZONEDB_API_KEY}&format=json&by=position&lat=${suggestion.lat}&lng=${suggestion.lng}`)
    const tzData = await tzRes.json()

    if (tzData.status === 'OK') {
      const timezone = parseFloat(tzData.gmtOffset) / 3600
      setForm(prev => ({
        ...prev,
        place: suggestion.displayName,
        locationSelected: true,
        location: {
          ...suggestion,
          timezone
        }
      }))
      setSuggestions([])
    } else {
      alert('Could not determine timezone')
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.location) return alert('Por favor selecciona una ciudad válida.')

    setLoading(true)
    setInterpretation('')

    const astroRes = await fetch('/api/astrology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const astroData = await astroRes.json()

    console.log('AstroData:', astroData)

    const gptRes = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formattedPlanets: astroData.formattedPlanets })
    })
    const gptData = await gptRes.json()

    if (gptData.error) {
      console.error('GPT error response:', gptData)
      alert('No se pudo generar la interpretación. Intenta de nuevo más tarde.')
    } else {
      console.log('Interpretation:', gptData.interpretation)
      setInterpretation(gptData.interpretation.trim())
      setLoading(false)
    }
  }
 
  return (
    <div className="relative min-h-screen grid items-center justify-items-center p-10 bg-indigo-800 bg-cover bg-center" >
    {/*<div className="relative min-h-screen grid items-center justify-items-center p-10 bg-gray-700 bg-cover bg-center" style={{ backgroundImage: "url('background.png')" }}>*/}
      <div className="absolute inset-0 bg-black opacity-50 z-0"></div>
      {!continued ? (
        <div className="text-center z-10">
          <p className="font-cormorant p-2 text-2xl font-bold italic animate-fade-in-slide-up animate-slide-up mb-10">&quot;Todos tenemos un rol y propósito en el universo. Espero este pequeño mensaje te lleve más cerca al tuyo...&quot;</p>
          <button onClick={handleContinue} className="bg-blue-600 text-white px-6 py-2 rounded animate-fade-in uppercase">Continuar</button>
        </div>
      ) : loading ? (
        <div className="text-center z-10 text-white flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-lg italic">Por favor espera mientras se genera tu interpretación...</p>
        </div>
      ) : interpretation ? (
        <div className="z-10 bg-[#1f2938cc] p-6 rounded-2xl text-white shadow-xl max-w-xl w-full space-y-6">
          <p className="whitespace-pre-line leading-relaxed">{interpretation}</p>
          <div className="text-center">
            <button className="mt-4 px-6 py-2 bg-blue-600 rounded text-white hover:bg-blue-700">
              Descargar interpretación
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center self-end z-10">
            <p className="p-2">Abajo encontrarás una pequeña forma para que ingreses tus datos de nacimiento. Al hacer esto, se te mostrará un pequeño mensaje basado en tu configuración astrológica (planetas) que podrás leer y descargar si gustas.</p>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 self-start space-y-4 bg-[#1f2938cc] p-6 rounded-2xl shadow-xl shadow-black/30 w-full max-w-md relative">
            <label>Lugar de nacimiento: <span className="italic block text-sm">(Ingresa la ciudad y selecciona de la lista de sugerencias)</span></label>
            <div className="relative">
              <input
                type="text"
                name="place"
                placeholder="ej. Tijuana..."
                value={form.place}
                onChange={handleChange}
                className="w-full p-2 border border-gray-500 rounded bg-gray-900 bg-opacity-40 mt-2 placeholder-opacity-50"
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 bg-gray-700 border border-black rounded mt-1 w-full max-h-40 overflow-y-auto">
                  {suggestions.map((sug, idx) => (
                    <li
                      key={idx}
                      onClick={() => handlePlaceSelect(sug)}
                      className="px-3 py-2 hover:bg-gray-200 cursor-pointer text-sm"
                    >
                      {sug.displayName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label>Fecha de nacimiento:</label>
            <input type="date" name="date" placeholder="Fecha de nacimiento" value={form.date} onChange={handleChange} className="w-full p-2 border border-gray-500 rounded bg-gray-900 bg-opacity-40 mt-2 placeholder-opacity-50" />
            <label>Hora de nacimiento: <span className="italic block text-sm">(Si no conoces tu hora de nacimiento, no te preocupes, déjala en blanco. Aun así recibirás información valiosa)</span></label>
            <input type="time" name="time" placeholder="Hora de nacimiento" value={form.time} onChange={handleChange} className="w-full p-2 border border-gray-500 rounded bg-gray-900 bg-opacity-40 mt-2 placeholder-opacity-50" />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">Obtener mi lectura</button>
          </form>
        </>
      )}
    </div>
  )
}
