import { useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'

const prefetched = new Set()

function prefetchLoja(slug) {
  if (prefetched.has(slug)) return
  prefetched.add(slug)

  // Pré-carrega o chunk JS da página
  import('../pages/loja.jsx').catch(() => { })

  // Pré-carrega loja + primeira página de produtos em paralelo
  api.lojas.buscarPorSlug(slug).catch(() => { })
  api.lojas.produtos(slug, 1).catch(() => { })
}

export function usePrefetchLoja(slug) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !slug) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          prefetchLoja(slug)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [slug])

  const onIntent = useCallback(() => prefetchLoja(slug), [slug])

  return { ref, onMouseEnter: onIntent, onTouchStart: onIntent }
}
