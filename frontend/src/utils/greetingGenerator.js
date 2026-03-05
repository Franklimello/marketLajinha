const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })

function capitalize(text) {
  const value = String(text || '').trim()
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getPeriodByHour(hour) {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'night'
}

export function getGreetingByTime(date = new Date()) {
  const hour = date.getHours()
  const period = getPeriodByHour(hour)
  if (period === 'morning') return { period, text: 'Bom dia' }
  if (period === 'afternoon') return { period, text: 'Boa tarde' }
  return { period, text: 'Boa noite' }
}

export function getMealSuggestion(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) {
    return {
      meal: 'café da manhã',
      options: 'café e padaria',
      suggestion: 'Que tal pedir um café da manhã caprichado?',
    }
  }
  if (hour >= 12 && hour < 15) {
    return {
      meal: 'almoço',
      options: 'marmita e comida caseira',
      suggestion: 'Perfeito para pedir uma marmita ou comida caseira.',
    }
  }
  if (hour >= 15 && hour < 18) {
    return {
      meal: 'lanche da tarde',
      options: 'açaí e sorvete',
      suggestion: 'Que tal um açaí ou sorvete para a tarde?',
    }
  }
  return {
    meal: 'jantar',
    options: 'pizza e hambúrguer',
    suggestion: 'Perfeito para pedir uma pizza ou hambúrguer.',
  }
}

export function getWeatherDescription(weatherMain = '') {
  const map = {
    Clear: 'ensolarado',
    Rain: 'chuvoso',
    Clouds: 'nublado',
    Thunderstorm: 'tempestade',
    Drizzle: 'garoa',
  }
  return map[String(weatherMain || '').trim()] || 'agradável'
}

function getWeatherEmoji(weatherMain, period) {
  const main = String(weatherMain || '').trim()
  if (main === 'Clear') return '☀️'
  if (main === 'Rain' || main === 'Drizzle') return '🌧️'
  if (main === 'Clouds') return '☁️'
  if (main === 'Thunderstorm') return '⛈️'
  return period === 'night' ? '🌙' : '✨'
}

function dayName(date = new Date()) {
  return capitalize(WEEKDAY_FORMATTER.format(date))
}

export function generateGreeting({
  city = '',
  weatherMain = '',
  temp = null,
  isHoliday = false,
  holidayName = '',
  date = new Date(),
  weatherEnabled = true,
} = {}) {
  const { text: greetingText, period } = getGreetingByTime(date)
  const meal = getMealSuggestion(date)
  const cityText = String(city || '').trim() || 'sua cidade'
  const emoji = getWeatherEmoji(weatherMain, period)
  const title = `${greetingText} ${emoji}`

  if (!weatherEnabled) {
    return {
      title,
      subtitle: `${dayName(date)} em ${cityText}.`,
      suggestion: meal.suggestion,
    }
  }

  if (isHoliday) {
    return {
      title,
      subtitle: `${holidayName || 'Hoje é feriado'} em ${cityText}.`,
      suggestion: `Dia ideal para pedir ${meal.options}.`,
    }
  }

  const weatherDescription = getWeatherDescription(weatherMain)
  const tempText = typeof temp === 'number' && Number.isFinite(temp) ? ` Agora ${Math.round(temp)}°C.` : ''

  return {
    title,
    subtitle: `${dayName(date)} ${weatherDescription} em ${cityText}.${tempText}`,
    suggestion: meal.suggestion,
  }
}
