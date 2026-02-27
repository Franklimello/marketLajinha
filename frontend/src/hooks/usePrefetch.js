import { useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'

const prefetched = new Set()
const dataPrefetched = new Set()
const dataQueued = new Set()
const dataQueue = []
let inFlightDataPrefetch = 0
const MAX_DATA_PREFETCH_CONCURRENCY = 2

function canPrefetchData() {
  if (typeof navigator === 'undefined') return true
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!connection) return true
  if (connection.saveData) return false
  const effective = String(connection.effectiveType || '').toLowerCase()
  return !effective.includes('2g')
}

function flushDataQueue() {
  while (inFlightDataPrefetch < MAX_DATA_PREFETCH_CONCURRENCY && dataQueue.length > 0) {
    const slug = dataQueue.shift()
    if (!slug) continue
    if (dataPrefetched.has(slug)) {
      dataQueued.delete(slug)
      continue
    }

    inFlightDataPrefetch += 1
    Promise.all([
      api.lojas.buscarPorSlug(slug),
      api.lojas.produtos(slug, 1),
    ])
      .catch(() => { })
      .finally(() => {
        inFlightDataPrefetch -= 1
        dataQueued.delete(slug)
        dataPrefetched.add(slug)
        flushDataQueue()
      })
  }
}

function prefetchLoja(slug, options = {}) {
  const { includeData = false } = options
  if (!slug) return

  if (prefetched.has(slug)) return
  prefetched.add(slug)

  // Pré-carrega o chunk JS da página
  import('../pages/loja.jsx').catch(() => { })

  // Pré-carrega dados com limite de concorrência para evitar rajadas.
  if (!includeData || dataPrefetched.has(slug) || dataQueued.has(slug) || !canPrefetchData()) return
  dataQueued.add(slug)
  dataQueue.push(slug)
  flushDataQueue()
}

export function usePrefetchLoja(slug, options = {}) {
  const { prefetchOnViewport = 'chunk', viewportThreshold = 0.5 } = options
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !slug) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          prefetchLoja(slug, { includeData: prefetchOnViewport === 'full' })
          observer.unobserve(el)
        }
      },
      { threshold: viewportThreshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [slug, prefetchOnViewport, viewportThreshold])

  const onIntent = useCallback(() => prefetchLoja(slug, { includeData: true }), [slug])

  return { ref, onMouseEnter: onIntent, onTouchStart: onIntent }
}
