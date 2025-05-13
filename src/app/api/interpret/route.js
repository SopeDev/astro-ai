import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})


export async function POST(req) {
  const body = await req.json()
  const { formattedPlanets } = body // string array, like ["Sun in Libra (185.68°) — 3rd House", ...]

  console.log('Received formattedPlanets:', formattedPlanets)

  if (!formattedPlanets || !Array.isArray(formattedPlanets)) {
    return NextResponse.json({ error: 'Missing or invalid data' }, { status: 400 })
  }

  const messages = [
    {
      role: 'system',
      content: 'You are an expert astrologer. Provide intuitive yet accurate birth chart readings in simple human language. Focus on the person’s growth potential and core traits.'
    },
    {
      role: 'user',
      content: `Interpret the following placements:\n\n${formattedPlanets.join('\n')}`
    }
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.8,
      max_tokens: 600
    })

    console.log('GPT Completion:', completion)

    const interpretation = completion?.choices?.[0]?.message?.content

    if (!interpretation) {
      console.error('No message content found in GPT response:', completion)
      return NextResponse.json({ error: 'No interpretation returned from GPT', raw: completion }, { status: 500 })
    }

    return NextResponse.json({ interpretation })

  } catch (err) {
    console.error('GPT Error:', err)
    return NextResponse.json({
      error: 'Failed to generate interpretation',
      details: err.message || 'No error message available'
    }, { status: 500 })
  }

}