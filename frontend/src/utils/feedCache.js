import { getItem as getLocalItem, setItem as setLocalItem } from '../storage/localStorageService'

const FEED_CACHE_TTL = 1000 * 60 * 3
const FEED_CACHE_PREFIX = 'feedCidadeCache:'
const FEED_RESOLVED_CITY_KEY = 'feedCidadeResolvedCity'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export function resolveFeedCityFromStores(stores, preferredCityName = '', preferredCityId = '') {
  const lista = Array.isArray(stores) ? stores : []
  const cidadesMap = new Map()
  for (const loja of lista) {
    const id = String(loja?.cidade_id || '').trim()
    const nome = String(loja?.cidade || '').trim()
    if (!id || !nome || cidadesMap.has(id)) continue
    cidadesMap.set(id, { id, nome })
  }

  const cidades = [...cidadesMap.values()]
  if (cidades.length === 0) return null

  const byId = cidades.find((c) => c.id === String(preferredCityId || '').trim())
  if (byId) return byId

  const alvoNome = normalizeText(preferredCityName)
  if (alvoNome) {
    const byName = cidades.find((c) => normalizeText(c.nome) === alvoNome)
    if (byName) return byName
  }

  return cidades[0]
}

function feedKey(cityId) {
  return `${FEED_CACHE_PREFIX}${String(cityId || '').trim()}`
}

export function getFeedCache(cityId) {
  const id = String(cityId || '').trim()
  if (!id) return null
  const data = getLocalItem(feedKey(id), null)
  if (!data?.ts || !Array.isArray(data?.posts)) return null
  if (Date.now() - Number(data.ts) > FEED_CACHE_TTL) return null
  return data
}

export function setFeedCache(cityInfo, posts) {
  const id = String(cityInfo?.id || '').trim()
  if (!id) return
  setLocalItem(feedKey(id), {
    ts: Date.now(),
    city: { id, nome: String(cityInfo?.nome || '').trim() },
    posts: Array.isArray(posts) ? posts : [],
  })
  setResolvedFeedCity(cityInfo)
}

export function getResolvedFeedCity() {
  const data = getLocalItem(FEED_RESOLVED_CITY_KEY, null)
  if (!data?.id || !data?.nome) return null
  return {
    id: String(data.id).trim(),
    nome: String(data.nome).trim(),
  }
}

export function setResolvedFeedCity(cityInfo) {
  const id = String(cityInfo?.id || '').trim()
  const nome = String(cityInfo?.nome || '').trim()
  if (!id || !nome) return
  setLocalItem(FEED_RESOLVED_CITY_KEY, { id, nome, ts: Date.now() })
}

