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

    const res = await fetch('/api/astrology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // name: form.name,
        date: form.date,
        time: form.time,
        place: form.location.displayName
      })
    })

    const data = await res.json()
    console.log(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-700">
      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-600 p-6 rounded shadow-md w-full max-w-md relative">
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
