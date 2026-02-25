import { useEffect } from 'react'

const SITE_NAME = 'UaiFood'
const DEFAULT_DESCRIPTION = 'Delivery em Lajinha MG: peça dos melhores estabelecimentos da cidade. Restaurantes, lanchonetes e muito mais com entrega rápida.'
const DEFAULT_URL = 'https://marketlajinha.com.br'
const DEFAULT_IMAGE = `${DEFAULT_URL}/icons/icon-512.png`

function normalizeCanonicalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl || DEFAULT_URL)
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    return DEFAULT_URL
  }
}

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function removeJsonLd(id) {
  const el = document.getElementById(id)
  if (el) el.remove()
}

export default function SEO({
  title,
  description,
  url,
  image,
  type = 'website',
  jsonLd,
  noIndex = false,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const desc = description || DEFAULT_DESCRIPTION
    const pageUrl = url || window.location.href
    const canonicalUrl = normalizeCanonicalUrl(pageUrl)
    const img = image || DEFAULT_IMAGE

    document.title = fullTitle

    setMeta('name', 'description', desc)
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')

    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', img)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:locale', 'pt_BR')

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', img)

    if (jsonLd) {
      setJsonLd('seo-jsonld', jsonLd)
    }

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    return () => {
      removeJsonLd('seo-jsonld')
    }
  }, [title, description, url, image, type, jsonLd, noIndex])

  return null
}

export { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_URL, DEFAULT_IMAGE }
