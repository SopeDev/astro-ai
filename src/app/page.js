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

  // Debounced location lookup
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

  useEffect(() => {
    if (form.place && !form.locationSelected) {
      fetchSuggestions(form.place)
    } else {
      setSuggestions([])
    }
  }, [form.place, form.locationSelected])

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
      setSuggestions([]) // hide suggestions
    } else {
      alert('Could not determine timezone')
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.location) return alert('Please select a valid location.')

    const astroRes = await fetch('/api/astrology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const astroData = await astroRes.json()

    console.log('AstroData:', astroData.formattedPlanets)

    const gptRes = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formattedPlanets: astroData.formattedPlanets })
    })
    const gptData = await gptRes.json()

    if (gptData.error) {
      console.error('GPT error response:', gptData)
      alert('Failed to generate interpretation. Try again later.')
    } else {
      console.log('Interpretation:', gptData.interpretation)
    }

    console.log('Interpretation:', gptData.interpretation)
  }
 
  // const handleSubmit = async e => {
  //   e.preventDefault()
  //   if (!form.location) return alert('Please select a valid location.')

  //   const gptRes = await fetch('/api/interpret', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ formattedPlanets: [
  //       "Ascendant in Scorpio (4.31°) — 1th House",
  //       "Sun in Libra (5.68°) — 11th House",
  //       "Moon in Taurus (15.14°) — 7th House",
  //       "Mars in Aries (5.14°) — 5th House",
  //       "Mercury in Libra (27.05°) — 12th House",
  //       "Jupiter in Gemini (6.09°) — 8th House",
  //       "Venus in Leo (23.20°) — 10th House",
  //       "Saturn in Sagittarius (26.62°) — 2th House",
  //       "Uranus in Sagittarius (27.27°) — 2th House",
  //       "Neptune in Capricorn (7.44°) — 3th House",
  //       "Pluto in Scorpio (11.08°) — 1th House",
  //       "Chiron in Cancer (6.91°) — 9th House",
  //       "Mean Node in Pisces (12.78°) — 5th House",
  //       "True Node in Pisces (13.87°) — 5th House",
  //       "MC in Leo (4.06°) — 10th House"
  //     ] })
  //   })
  //   const gptData = await gptRes.json()

  //   if (gptData.error) {
  //     console.error('GPT error response:', gptData)
  //     alert('Failed to generate interpretation. Try again later.')
  //   } else {
  //     console.log('Interpretation:', gptData.interpretation)
  //   }
  // }

  return (
    <div className="min-h-screen grid items-center justify-items-center p-4 bg-gray-700">
      <div className="text-center self-end">
        <p className="p-2 text-xl font-bold">Todos tenemos un rol y propósito en el universo. Espero este pequeño mensaje te lleve más cerca al tuyo...</p>
        <p className="p-2">En la parte de abajo encontrarás una pequeña forma para que ingreses tus datos de nacimiento. Al hacer esto, recibirás un pequeño mensaje de mi parte basado en tu configuración astrológica (planetas).</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-5 self-start space-y-4 bg-gray-600 p-6 rounded shadow-md w-full max-w-md relative">
        <h1 className="text-center text-xl font-bold mb-4">Ingresa tus datos aquí:</h1>
        <label>Lugar: <span className="italic block text-sm">(Ingresa la ciudad y selecciona de la lista de sugerencias)</span></label>
        <div className="relative">
          <input
            type="text"
            name="place"
            placeholder="Lugar de nacimiento"
            value={form.place}
            onChange={handleChange}
            className="w-full p-2 border rounded"
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
        <label>Fecha:</label>
        <input type="date" name="date" placeholder="Fecha de nacimiento" value={form.date} onChange={handleChange} className="w-full p-2 border rounded" />
        <label>Hora: <span className="italic block text-sm">(Si no conoces tu hora de nacimiento, no te preocupes, déjala en blanco. Aun así recibirás información valiosa)</span></label>
        <input type="time" name="time" placeholder="Hora de nacimiento" value={form.time} onChange={handleChange} className="w-full p-2 border rounded" />

        {form.location && (
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">Obtener mi lectura</button>
        )}

      </form>
    </div>
  )
}
