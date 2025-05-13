'use client'

import { useState, useEffect } from 'react'
import debounce from 'lodash.debounce'

export default function Home() {
  const [form, setForm] = useState({
    // name: '',
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

  return (
    <div className="min-h-screen grid items-center justify-items-center p-4 bg-gray-700">
      <div className="text-center self-end">
        <p className="p-2 text-xl font-bold">Todos tenemos un rol y propósito en el universo. Espero este pequeño mensaje te lleve más cerca al tuyo...</p>
        <p className="p-2">En la parte de abajo encontrarás una pequeña forma para que ingreses tus datos de nacimiento. Al hacer esto, recibirás un pequeño mensaje de mi parte basado en tu configuración astrológica (planetas).</p>
        <p className="p-2 italic">*Si no conoces tu hora de nacimiento, no te preocupes, déjala en blanco. Aun así recibirás información valiosa, aunque no tan exacta.</p>
      </div>
      <form onSubmit={handleSubmit} className="text-center mt-10 self-start space-y-4 bg-gray-600 p-6 rounded shadow-md w-full max-w-md relative">
        <h1 className="text-xl font-bold mb-4">Enter Your Birth Info</h1>
        {/*<input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} className="w-full p-2 border rounded" />*/}
        <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full p-2 border rounded" />
        <input type="time" name="time" value={form.time} onChange={handleChange} className="w-full p-2 border rounded" />

        <div className="relative">
          <input
            type="text"
            name="place"
            placeholder="Place of birth"
            value={form.place}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-300 rounded mt-1 w-full max-h-40 overflow-y-auto">
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

        {form.location && (
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">Get My Chart</button>
        )}

      </form>
    </div>
  )
}
