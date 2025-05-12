import { NextResponse } from 'next/server'

export async function POST(req) {
  const body = await req.json()
  const { date, time, place } = body
  // const { name, date, time, place } = body
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  try {
    // Geocode
    const geoRes = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(place)}&key=${process.env.NEXT_PUBLIC_OPENCAGE_API_KEY}`)
    const geoData = await geoRes.json()
    console.log('GeoData:', geoData)

    if (!geoData.results.length) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }

    const loc = geoData.results[0]
    const { lat, lng } = loc.geometry
    const displayName = loc.formatted

    // Timezone
    const tzRes = await fetch(`http://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.NEXT_PUBLIC_TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`)
    const tzData = await tzRes.json()
    console.log('TimeZoneData:', tzData)

    if (tzData.status !== 'OK') {
      return NextResponse.json({ error: 'Timezone lookup failed', tzData }, { status: 500 })
    }

    const timezone = parseFloat(tzData.gmtOffset) / 3600

    // Parse date/time
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)

    const astroParams = {
      year,
      month,
      date: day,
      hours,
      minutes,
      seconds: 0,
      latitude: lat,
      longitude: lng,
      timezone,
      config: {
        observation_point: 'topocentric',
        ayanamsha: 'tropical',
        house_system: 'Placidus',
        language: 'en'
      }
    }

    // Planet positions
    const planetRes = await fetch('https://json.freeastrologyapi.com/western/planets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.FREE_ASTROLOGY_API_KEY
      },
      body: JSON.stringify(astroParams)
    })
    const planetData = await planetRes.json()
    console.log('PlanetData:', planetData)

    if (!planetData.output || !Array.isArray(planetData.output)) {
      return NextResponse.json({ error: 'Missing planet data', planetData }, { status: 500 })
    }

    await sleep(2000)

    // House cusps
    const houseRes = await fetch('https://json.freeastrologyapi.com/western/houses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.FREE_ASTROLOGY_API_KEY
      },
      body: JSON.stringify(astroParams)
    })
    const houseData = await houseRes.json()
    console.log('HouseData:', houseData)

    if (!houseData.output) {
      return NextResponse.json({ error: 'Missing house data', houseData }, { status: 500 })
    }

    // House-matching logic stays unchanged...
    function getHouseForDegree(degree, houses) {
      for (let i = 1; i <= 12; i++) {
        const start = houses[`house${i}`]
        const end = houses[`house${(i % 12) + 1}`]

        if (start < end) {
          if (degree >= start && degree < end) return i
        } else {
          if (degree >= start || degree < end) return i
        }
      }
      return null
    }

    const allowedPlanets = [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron', 'Mean Node', 'True Node', 'Ascendant', 'MC'
    ]

    const houseDegrees = {}
    houseData.output.Houses.forEach(h => {
      houseDegrees[`house${h.House}`] = h.degree
    })

    const planetHouseMap = planetData.output
      .filter(planet => allowedPlanets.includes(planet.planet.en))
      .map(planet => ({
        name: planet.planet.en,
        sign: planet.zodiac_sign.name.en,
        degree: planet.normDegree,
        house: getHouseForDegree(planet.fullDegree, houseDegrees)
      }))

    return NextResponse.json({
      planets: planetHouseMap,
      rawPlanets: planetData.output,
      houses: houseData.output,
      location: displayName,
      lat,
      lng,
      timezone
    })
  } catch (err) {
    console.error('Caught Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 })
  }
}
