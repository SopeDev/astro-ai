import { NextResponse } from 'next/server'

export async function POST(req) {
  const body = await req.json()
  const { name, date, time, place } = body

  try {
    // 1. Get lat/lng from OpenCage
    const geoRes = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(place)}&key=${process.env.OPENCAGE_API_KEY}`)
    const geoData = await geoRes.json()

    if (!geoData.results.length) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 })
    }

    const loc = geoData.results[0]
    const { lat, lng } = loc.geometry
    const displayName = loc.formatted

    // 2. Get timezone offset from TimeZoneDB
    const tzRes = await fetch(`http://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`)
    const tzData = await tzRes.json()

    if (tzData.status !== 'OK') {
      return NextResponse.json({ error: 'Timezone lookup failed' }, { status: 500 })
    }

    const timezone = parseFloat(tzData.gmtOffset) / 3600 // Convert from seconds to hours

    // 3. Parse time and date
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)

    // 4. Call FreeAstrologyAPI with proper settings
    const astroRes = await fetch('https://json.freeastrologyapi.com/western/planets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.FREE_ASTROLOGY_API_KEY
      },
      body: JSON.stringify({
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
          house_system: 'placidus'
        }
      })
    })

    const chartData = await astroRes.json()

    return NextResponse.json({ chartData, displayName, lat, lng, timezone })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
