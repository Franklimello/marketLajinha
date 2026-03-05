import { useEffect, useMemo, useState } from 'react'
import { getItem as getLocalItem, setItem as setLocalItem } from '../storage/localStorageService'
import { generateGreeting } from '../utils/greetingGenerator'

const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000
const WEATHER_CACHE_KEY_PREFIX = 'weatherCache:'
const OPEN_WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'

function normalizeCity(city) {
  return String(city || '').trim()
}

function weatherCacheKey(city) {
  return `${WEATHER_CACHE_KEY_PREFIX}${normalizeCity(city).toLowerCase()}`
}

function todayIso(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function fetchWeather(city, apiKey) {
  const cacheKey = weatherCacheKey(city)
  const cached = getLocalItem(cacheKey, null)
  if (cached?.ts && Date.now() - Number(cached.ts) < WEATHER_CACHE_TTL_MS) {
    return cached.data || null
  }

  const url = `${OPEN_WEATHER_URL}?q=${encodeURIComponent(city)}&units=metric&lang=pt_br&appid=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Falha ao buscar clima')
  const payload = await response.json()

  const data = {
    main: String(payload?.weather?.[0]?.main || '').trim(),
    temp: Number(payload?.main?.temp),
  }
  setLocalItem(cacheKey, { ts: Date.now(), data })
  return data
}

async function fetchHolidays(year) {
  const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
  if (!response.ok) throw new Error('Falha ao buscar feriados')
  const holidays = await response.json()
  return Array.isArray(holidays) ? holidays : []
}

export function useDynamicGreeting(city) {
  const safeCity = useMemo(() => normalizeCity(city), [city])
  const [greeting, setGreeting] = useState(() =>
    generateGreeting({ city: safeCity, weatherEnabled: false, date: new Date() })
  )

  useEffect(() => {
    let cancelled = false
    const now = new Date()

    async function load() {
      if (!safeCity) {
        if (!cancelled) setGreeting(generateGreeting({ city: '', weatherEnabled: false, date: now }))
        return
      }

      const apiKey = String(import.meta.env.VITE_OPENWEATHER_API_KEY || '').trim()
      if (!apiKey) {
        if (!cancelled) setGreeting(generateGreeting({ city: safeCity, weatherEnabled: false, date: now }))
        return
      }

      try {
        const weather = await fetchWeather(safeCity, apiKey)
        const holidays = await fetchHolidays(now.getFullYear())
        const todayHoliday = holidays.find((item) => String(item?.date || '') === todayIso(now))

        if (cancelled) return
        setGreeting(
          generateGreeting({
            city: safeCity,
            weatherMain: weather?.main || '',
            temp: weather?.temp,
            isHoliday: Boolean(todayHoliday),
            holidayName: todayHoliday?.name || '',
            date: now,
            weatherEnabled: true,
          })
        )
      } catch {
        if (cancelled) return
        setGreeting(generateGreeting({ city: safeCity, weatherEnabled: false, date: now }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [safeCity])

  return greeting
}

export default useDynamicGreeting
