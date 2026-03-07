import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { FiStar, FiChevronLeft, FiChevronRight, FiGrid, FiList, FiX } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import { Motorcycle } from '@phosphor-icons/react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { usePrefetchLoja } from '../hooks/usePrefetch'
import SEO from '../componentes/SEO'
import HomeGreeting from '../componentes/home/HomeGreeting'
import useDynamicGreeting from '../hooks/useDynamicGreeting'
import HomeSearchBar from '../componentes/home/HomeSearchBar'
import HomeBottomSupport from '../componentes/home/HomeBottomSupport'
import HomeStoriesSection from '../componentes/home/HomeStoriesSection'
import HomeCategoriesSection from '../componentes/home/HomeCategoriesSection'
import HomeLoadingState from '../componentes/home/HomeLoadingState'
import HomeEmptyState from '../componentes/home/HomeEmptyState'
import HomeRanking from '../componentes/home/HomeRanking'
import { getItem as getLocalItem, setItem as setLocalItem } from '../storage/localStorageService'
import {
  getFeedCache,
  resolveFeedCityFromStores,
  setFeedCache,
  getResolvedFeedCity,
} from '../utils/feedCache'

const SUPORTE_WHATSAPP = '5533999394706'
const SUPORTE_NOME = 'Franklim'
const SUPORTE_INSTAGRAM = 'https://www.instagram.com/uaifood2026/'
const HOME_CACHE_KEY = 'homeLojasCache'
const HOME_CACHE_TTL = 1000 * 60 * 5
const GEO_CITY_CACHE_KEY = 'geoCityCache'
const GEO_CITY_CACHE_TTL = 1000 * 60 * 60 * 6
const STORIES_SEEN_KEY = 'storiesSeenById'
const STORY_DURATION_MS = 6000
const SELECTED_CITY_KEY = 'selectedCity'

const HOME_BANNERS = [
  {
    id: 'entrega',
    titulo: 'Entrega rápida e sem complicação',
    subtitulo: 'Peça em segundos e acompanhe tudo em tempo real pelo app.',
    destaque: 'Pedido chegando quentinho',
    gradiente: 'from-red-700 via-red-600 to-amber-500',
  },
  {
    id: 'cupom',
    titulo: 'Cupons ativos todo dia',
    subtitulo: 'Aproveite ofertas especiais das lojas da sua cidade.',
    destaque: 'Economize no almoço e no jantar',
    gradiente: 'from-red-600 via-red-500 to-yellow-500',
  },
  {
    id: 'variedade',
    titulo: 'Tudo em um só lugar',
    subtitulo: 'Restaurantes, mercado, farmácia e muito mais no UaiFood.',
    destaque: 'Mais opções para sua rotina',
    gradiente: 'from-amber-500 via-orange-500 to-red-600',
  },
]


const MENSAGENS_BOM_DIA = [
  'Bom dia ?? Comece o dia com boas escolhas.',
  'Bom dia! Que hoje seja leve e produtivo.',
  'Bom dia ?? Um novo dia, novas possibilidades.',
  'Bom dia! Aproveite o melhor do seu dia.',
  'Bom dia ?? Mais um dia para simplificar sua rotina.',
  'Bom dia! Que hoje tudo flua bem.',
  'Bom dia ?? Que seu dia comece da melhor forma.',
  'Bom dia! Mais praticidade para o seu dia.',
  'Bom dia ?? Um ?timo come?o de dia para voc?.',
  'Bom dia! Aproveite cada momento.',
  'Bom dia ?? Seu dia pode ser mais simples.',
  'Bom dia! Hoje promete ser um bom dia.',
  'Bom dia ?? Comece o dia com energia positiva.',
  'Bom dia! Mais um dia cheio de oportunidades.',
  'Bom dia ?? Fa?a deste dia um grande dia.',
  'Bom dia! Que nada atrapalhe seu dia.',
  'Bom dia ?? Tudo pronto para come?ar?',
  'Bom dia! Que hoje seja incr?vel.',
  'Bom dia ?? Seu dia come?a agora.',
  'Bom dia! Um dia produtivo te espera.',
  'Bom dia ?? Hora de aproveitar o dia.',
  'Bom dia! Um ?timo dia para voc?.',
  'Bom dia ?? Simplicidade para o seu dia.',
  'Bom dia! Que o dia comece bem.',
  'Bom dia ?? Mais um dia para conquistar coisas boas.',
  'Bom dia! Que seu dia seja tranquilo.',
  'Bom dia ?? Aproveite o melhor do dia.',
  'Bom dia! Tudo pode dar certo hoje.',
  'Bom dia ?? Um dia cheio de possibilidades.',
  'Bom dia! Que seu dia seja leve.',
  'Bom dia ?? Um ?timo come?o para voc?.',
]

const MENSAGENS_BOA_TARDE = [
  'Boa tarde ?? Como est? seu dia?',
  'Boa tarde! Continue o dia com energia.',
  'Boa tarde ?? Ainda d? tempo de fazer muita coisa.',
  'Boa tarde! Que sua tarde seja produtiva.',
  'Boa tarde ?? Aproveite bem a tarde.',
  'Boa tarde! Mais praticidade para voc?.',
  'Boa tarde ?? Seu dia ainda pode melhorar.',
  'Boa tarde! Continue firme hoje.',
  'Boa tarde ?? Que sua tarde seja leve.',
  'Boa tarde! Aproveite o restante do dia.',
  'Boa tarde ?? Que sua tarde seja tranquila.',
  'Boa tarde! Um ?timo restante de dia.',
  'Boa tarde ?? Continue fazendo boas escolhas.',
  'Boa tarde! Seu dia ainda rende muito.',
  'Boa tarde ?? Aproveite cada momento.',
  'Boa tarde! Mais uma tarde produtiva.',
  'Boa tarde ?? Que tudo siga bem.',
  'Boa tarde! Continue seu dia com calma.',
  'Boa tarde ?? Seu tempo vale muito.',
  'Boa tarde! Aproveite o melhor da tarde.',
  'Boa tarde ?? Continue fazendo o dia valer a pena.',
  'Boa tarde! Ainda d? tempo de resolver tudo.',
  'Boa tarde ?? Que sua tarde seja ?tima.',
  'Boa tarde! Aproveite o momento.',
  'Boa tarde ?? Que sua tarde seja agrad?vel.',
  'Boa tarde! Mais uma ?tima tarde para voc?.',
  'Boa tarde ?? Continue o dia bem.',
  'Boa tarde! Que a tarde seja produtiva.',
  'Boa tarde ?? Um ?timo restante de dia.',
  'Boa tarde! Siga aproveitando seu dia.',
  'Boa tarde ?? Que sua tarde seja leve.',
]

const MENSAGENS_BOA_NOITE = [
  'Boa noite ?? Hora de relaxar.',
  'Boa noite! Que sua noite seja tranquila.',
  'Boa noite ?? Aproveite o momento.',
  'Boa noite! Hora de desacelerar.',
  'Boa noite ?? Que sua noite seja leve.',
  'Boa noite! Aproveite a noite.',
  'Boa noite ?? Um ?timo descanso para voc?.',
  'Boa noite! Que tudo fique mais calmo agora.',
  'Boa noite ?? Hora de descansar.',
  'Boa noite! Aproveite sua noite.',
  'Boa noite ?? Que sua noite seja agrad?vel.',
  'Boa noite! Um momento de paz.',
  'Boa noite ?? Que a noite seja tranquila.',
  'Boa noite! Aproveite o descanso.',
  'Boa noite ?? Um ?timo final de dia.',
  'Boa noite! Que sua noite seja confort?vel.',
  'Boa noite ?? Hora de relaxar um pouco.',
  'Boa noite! Aproveite o sil?ncio da noite.',
  'Boa noite ?? Um ?timo descanso.',
  'Boa noite! Que sua noite seja boa.',
  'Boa noite ?? Mais uma noite tranquila.',
  'Boa noite! Relaxe e aproveite.',
  'Boa noite ?? Um ?timo momento de descanso.',
  'Boa noite! Que a noite seja leve.',
  'Boa noite ?? Aproveite o final do dia.',
  'Boa noite! Hora de descansar a mente.',
  'Boa noite ?? Tenha uma noite tranquila.',
  'Boa noite! Que tudo fique em paz agora.',
  'Boa noite ?? Aproveite a calma da noite.',
  'Boa noite! Um ?timo descanso para voc?.',
  'Boa noite ?? Obrigado por estar aqui hoje',
]

function saudacao() {
  const agora = new Date()
  const h = agora.getHours()
  const diaIndice = (agora.getDate() - 1) % 31

  const incluirNome = (mensagem) => (
    String(mensagem || '')
      .replace(/^Bom dia\b/i, 'Bom dia, __NOME__')
      .replace(/^Boa tarde\b/i, 'Boa tarde, __NOME__')
      .replace(/^Boa noite\b/i, 'Boa noite, __NOME__')
  )

  if (h < 12) return incluirNome(MENSAGENS_BOM_DIA[diaIndice])
  if (h < 18) return incluirNome(MENSAGENS_BOA_TARDE[diaIndice])
  return incluirNome(MENSAGENS_BOA_NOITE[diaIndice])
}

function resolverCidadePadraoCliente(cliente) {
  const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : []
  if (!enderecos.length) return ''

  const endereco = enderecos.find((e) => e?.padrao) || enderecos[0]
  return String(endereco?.cidade || '').trim()
}

function resolverBairroPadraoCliente(cliente) {
  const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : []
  if (!enderecos.length) return ''

  const endereco = enderecos.find((e) => e?.padrao) || enderecos[0]
  return String(endereco?.bairro || '').trim()
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function limparCategoriaTexto(value) {
  return String(value || '')
    // Remove emojis/pictogramas para evitar nome duplicado com ícone embutido.
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    // Remove separadores comuns no começo do texto.
    .replace(/^[\s\-–—•·|:]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getStoriesSeenMap() {
  const data = getLocalItem(STORIES_SEEN_KEY, {})
  return data && typeof data === 'object' ? data : {}
}

function markStoryAsSeen(storyId) {
  if (!storyId) return
  const next = { ...getStoriesSeenMap(), [storyId]: Date.now() }
  setLocalItem(STORIES_SEEN_KEY, next)
}

function orderStoriesGroups(groups) {
  if (!Array.isArray(groups)) return []
  return groups.map((group) => {
    const orderedStories = [...(group?.stories || [])].sort((a, b) => {
      const timeA = new Date(a?.created_at || 0).getTime() || 0
      const timeB = new Date(b?.created_at || 0).getTime() || 0
      if (timeA !== timeB) return timeA - timeB
      return String(a?.id || '').localeCompare(String(b?.id || ''))
    })
    return { ...group, stories: orderedStories }
  })
}

function formatarTempoEntrega(tempo) {
  const t = String(tempo || '').trim()
  if (!t) return ''
  if (/min/i.test(t)) return t
  return `${t} min`
}

function formatarNomeCategoria(nome) {
  const texto = limparCategoriaTexto(nome)
  if (!texto) return ''
  return texto
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)\S/g, (char) => char.toLocaleUpperCase('pt-BR'))
}

function emojiDaCategoria(nome) {
  const n = normalizeText(limparCategoriaTexto(nome))
  if (!n) return '🍽️'

  // Alimentação
  if (n.includes('pizza')) return '🍕'
  if (n.includes('hamb') || n.includes('burger')) return '🍔'
  if (n.includes('lanche') || n.includes('lanchonete')) return '🌭'
  if (n.includes('sushi') || n.includes('japones') || n.includes('japonesa')) return '🍣'
  if (n.includes('churr')) return '🥩'
  if (n.includes('marmita') || n.includes('marmitex')) return '🍱'
  if (n.includes('salgad')) return '🥟'
  if (n.includes('doc') || n.includes('confeit')) return '🍰'
  if (n.includes('sorvet') || n.includes('acai') || n.includes('açai')) return '🍨'
  if (n.includes('cafeteria') || n.includes('cafe')) return '☕'
  if (n.includes('padar')) return '🥖'
  if (n.includes('bebida') || n.includes('adega')) return '🥤'
  if (n.includes('restaurante') || n.includes('alimenta') || n.includes('comida')) return '🍽️'

  // Comércio e serviços
  if (n.includes('mercado') || n.includes('mercearia')) return '🛒'
  if (n.includes('farm')) return '💊'
  if (n.includes('pet')) return '🐾'
  if (n.includes('roupa') || n.includes('moda')) return '👕'
  if (n.includes('varej') || n.includes('comercio')) return '🛍️'
  if (n.includes('servic')) return '🧰'
  if (n.includes('saudavel') || n.includes('saude')) return '🥗'

  // Fallback variado para não ficar tudo igual
  const fallback = ['🏪', '🛍️', '🍽️', '📦', '✨']
  let hash = 0
  for (let i = 0; i < n.length; i += 1) {
    hash = (hash * 31 + n.charCodeAt(i)) >>> 0
  }
  return fallback[hash % fallback.length]
}

function extrairCategorias(lojas) {
  const categoriasMap = new Map()
  for (const loja of lojas || []) {
    const raw = String(loja?.categoria_negocio || '')
    raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((c) => {
        const key = normalizeText(limparCategoriaTexto(c))
        if (!key || categoriasMap.has(key)) return
        categoriasMap.set(key, formatarNomeCategoria(c))
      })
  }
  return Array.from(categoriasMap.values())
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((nome) => ({
      nome,
      emoji: emojiDaCategoria(nome),
    }))
}

const StoriesRail = memo(function StoriesRail({ grupos, seenMap, onOpen }) {
  if (!Array.isArray(grupos) || grupos.length === 0) return null

  return (
    <section className="mb-6 border-t border-stone-200 pt-4" aria-label="Stories das lojas">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-black tracking-tight text-stone-900">UaiFood Stories</h3>
        <span className="text-[11px] text-stone-500">{grupos.length} loja(s)</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {grupos.map((g, idx) => {
          const hasUnseen = (g.stories || []).some((s) => !seenMap[s.id])
          return (
            <button
              key={g.restaurant_id}
              type="button"
              onClick={() => onOpen(idx)}
              className="shrink-0 w-[84px] text-center"
            >
              <div className={`mx-auto rounded-full p-[2px] ${hasUnseen ? 'bg-linear-to-r from-red-500 to-amber-400' : 'bg-stone-300'}`}>
                <div className="w-[72px] h-[72px] rounded-full bg-white p-0.5">
                  <img
                    src={g.restaurant_logo || '/icons/icon-192.png'}
                    alt={g.restaurant_name}
                    className="w-full h-full rounded-full object-cover"
                    loading={idx < 6 ? 'eager' : 'lazy'}
                    fetchPriority={idx < 4 ? 'high' : 'auto'}
                    decoding={idx < 4 ? 'sync' : 'async'}
                    width="72"
                    height="72"
                  />
                </div>
              </div>
              <p className="text-[11px] font-medium text-stone-700 mt-1.5 line-clamp-1">{g.restaurant_name}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
})

const StoryViewerModal = memo(function StoryViewerModal({
  grupos,
  groupIndex,
  storyIndex,
  progress,
  onPrev,
  onNext,
  onNextStore,
  hasNextStore,
  onClose,
}) {
  if (groupIndex < 0 || !grupos[groupIndex]) return null
  const grupo = grupos[groupIndex]
  const story = grupo?.stories?.[storyIndex]
  if (!story) return null

  return (
    <div className="fixed inset-0 z-130 bg-black/92 backdrop-blur-xs animate-scale-in">
      <div className="w-full max-w-lg mx-auto h-full relative text-white select-none">
        <div className="absolute top-2 left-3 right-3 z-20 flex gap-1">
          {(grupo.stories || []).map((s, i) => (
            <div key={s.id} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-[width] duration-75"
                style={{
                  width: i < storyIndex ? '100%' : i === storyIndex ? `${Math.min(100, Math.max(0, progress * 100))}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src={grupo.restaurant_logo || '/icons/icon-192.png'} alt="" className="w-8 h-8 rounded-full object-cover" fetchPriority="high" decoding="async" width="32" height="32" />
            <p className="text-sm font-semibold truncate">{grupo.restaurant_name}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-black/45 inline-flex items-center justify-center">
            <FiX size={18} />
          </button>
        </div>

        <div className="absolute inset-0 z-10" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const leftHalf = e.clientX < rect.left + rect.width / 2
          if (leftHalf) onPrev()
          else onNext()
        }}>
          <img src={story.image_url} alt="" className="w-full h-full object-contain" fetchPriority="high" decoding="sync" />
        </div>

        <button
          type="button"
          onClick={onPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/45 text-white inline-flex items-center justify-center hover:bg-black/60"
          aria-label="Story anterior"
        >
          <FiChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/45 text-white inline-flex items-center justify-center hover:bg-black/60"
          aria-label="Próximo story"
        >
          <FiChevronRight size={20} />
        </button>

        <div className="absolute bottom-6 left-4 right-4 z-20">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/loja/${grupo.restaurant_slug}`}
              onClick={onClose}
              className="inline-flex items-center justify-center py-3 rounded-xl bg-red-600 text-white font-semibold text-sm"
            >
              Pedir agora
            </Link>
            <button
              type="button"
              disabled={!hasNextStore}
              onClick={onNextStore}
              className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/12 text-white font-semibold text-sm border border-white/25 disabled:opacity-50"
            >
              Próxima loja <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

const HomeCarousel = memo(function HomeCarousel() {
  const [slideAtivo, setSlideAtivo] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideAtivo((prev) => (prev + 1) % HOME_BANNERS.length)
    }, 4500)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="mb-4" aria-label="Destaques do UaiFood">
      <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_5%,rgba(255,255,255,0.35),transparent_40%)]" />
        <div
          className="relative flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${slideAtivo * 100}%)` }}
        >
          {HOME_BANNERS.map((banner) => (
            <div key={banner.id} className={`min-w-full px-4 py-4 text-white bg-linear-to-br ${banner.gradiente}`}>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                Curadoria UaiFood
              </span>
              <h3 className="mt-2 text-[1.55rem] font-black leading-[1.08] tracking-tight">{banner.titulo}</h3>
              <p className="mt-1.5 text-[13px] text-white/95 leading-relaxed max-w-[250px]">{banner.subtitulo}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/95 rounded-full border border-white/35 px-2 py-0.5">
                {banner.destaque}
                <FiChevronRight size={13} />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {HOME_BANNERS.map((banner, idx) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setSlideAtivo(idx)}
              aria-label={`Ir para banner ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${slideAtivo === idx ? 'w-7 bg-white shadow-sm' : 'w-2 bg-white/65 hover:bg-white/85'
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
})

async function resolverCidadePorCoordenadas(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=pt-BR`
  const res = await fetch(url)
  if (!res.ok) return ''
  const data = await res.json().catch(() => null)
  if (!data?.address) return ''
  return String(
    data.address.city ||
    data.address.town ||
    data.address.village ||
    data.address.municipality ||
    ''
  ).trim()
}

const LojaCard = memo(function LojaCard({ loja, idx, taxaBairro }) {
  const aberta = loja.aberta_agora ?? loja.aberta
  const taxa = typeof taxaBairro === 'number' ? taxaBairro : (loja.taxa_entrega ?? 0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [ripples, setRipples] = useState([])
  const rippleIdRef = useRef(0)
  const rippleTimersRef = useRef([])
  const isAboveFold = idx < 4
  const {
    ref: prefetchRef,
    onMouseEnter: onPrefetchMouseEnter,
    onTouchStart: onPrefetchTouchStart,
  } = usePrefetchLoja(loja.slug, {
    prefetchOnViewport: idx < 4 ? 'full' : 'chunk',
    viewportThreshold: 0.6,
  })
  const shouldAnimate = idx < 8

  useEffect(() => {
    return () => {
      const timers = rippleTimersRef.current
      timers.forEach((timer) => clearTimeout(timer))
      rippleTimersRef.current = []
    }
  }, [])

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse') return
    onPrefetchTouchStart()
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.15
    const id = rippleIdRef.current + 1
    rippleIdRef.current = id

    const x = (e.clientX - rect.left) - (size / 2)
    const y = (e.clientY - rect.top) - (size / 2)

    setRipples((prev) => [...prev, { id, x, y, size, active: false }])
    requestAnimationFrame(() => {
      setRipples((prev) => prev.map((r) => (r.id === id ? { ...r, active: true } : r)))
    })

    const timer = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 520)
    rippleTimersRef.current.push(timer)
  }

  return (
    <Link
      ref={prefetchRef}
      to={`/loja/${loja.slug}`}
      onMouseEnter={onPrefetchMouseEnter}
      onPointerDown={handlePointerDown}
      className={`group relative overflow-hidden flex items-center gap-4 px-3 py-3.5 rounded-2xl border border-stone-200 bg-white transform-gpu will-change-transform transition-all duration-200 ease-out hover:border-stone-300 hover:scale-[1.005] active:scale-[0.985] active:bg-stone-50 ${shouldAnimate ? 'animate-fade-in-up' : ''} ${!aberta ? 'opacity-55' : ''
        }`}
      style={{
        animationDelay: shouldAnimate ? `${Math.min(idx, 10) * 50}ms` : '0ms',
        contentVisibility: idx >= 8 ? 'auto' : 'visible',
        containIntrinsicSize: idx >= 8 ? '88px' : 'auto',
        WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.12)',
      }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition-colors duration-200 group-active:ring-red-200" />
      <span className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
        {ripples.map((r) => (
          <span
            key={r.id}
            className={`absolute rounded-full bg-red-500/15 transition-all duration-500 ease-out ${r.active ? 'scale-100 opacity-0' : 'scale-0 opacity-100'}`}
            style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
          />
        ))}
      </span>
      <div className="relative shrink-0 z-10">
        {!imgError && loja.logo_url ? (
          <img
            src={loja.logo_url}
            alt={loja.nome}
            width="64"
            height="64"
            loading={isAboveFold ? 'eager' : 'lazy'}
            fetchPriority={isAboveFold ? 'high' : 'auto'}
            sizes="64px"
            decoding={isAboveFold ? 'sync' : 'async'}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-16 h-16 rounded-xl object-cover bg-stone-200 transition-opacity duration-300 ${!aberta ? 'grayscale' : ''} ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white"
            style={{ backgroundColor: loja.cor_primaria || '#78716c' }}
          >
            {loja.nome?.charAt(0)}
          </div>
        )}
        {!imgLoaded && !imgError && loja.logo_url && (
          <div className="absolute inset-0 w-16 h-16 rounded-xl skeleton" />
        )}
        {!aberta && (
          <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Fechada</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 relative z-10">
        <h3 className="text-[15px] font-extrabold tracking-tight text-stone-900 truncate">{loja.nome}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-500">
          {(loja.nota_media ?? 0) > 0 && (
            <>
              <FiStar className="text-yellow-500 fill-yellow-500 text-[11px]" />
              <span className="font-medium text-stone-700 font-numeric">{Number(loja.nota_media).toFixed(1).replace('.', ',')}</span>
              <span className="text-stone-300">&bull;</span>
            </>
          )}
          {taxa === 0 ? (
            <span className="font-semibold text-green-600">Entrega grátis</span>
          ) : (
            <span className="font-numeric">R$ {taxa.toFixed(2).replace('.', ',')}</span>
          )}
          {loja.tempo_entrega && (
            <>
              <span className="text-stone-300">&bull;</span>
              <span>{formatarTempoEntrega(loja.tempo_entrega)}</span>
            </>
          )}
        </div>
        {loja.cupom_ativo?.codigo && (
          <p className="text-[11px] text-red-600 mt-1 font-medium truncate">
            {loja.nome} com cupom {String(loja.cupom_ativo.codigo).toUpperCase()}, aproveite
          </p>
        )}
        {!aberta && loja.horario_hoje?.aberto && (
          <p className="text-[10px] text-stone-400 mt-0.5">Abre às {loja.horario_hoje.abertura}</p>
        )}
      </div>
    </Link>
  )
})

const LojaCardGrid = memo(function LojaCardGrid({ loja, idx, taxaBairro }) {
  const aberta = loja.aberta_agora ?? loja.aberta
  const taxa = typeof taxaBairro === 'number' ? taxaBairro : (loja.taxa_entrega ?? 0)
  const {
    ref: prefetchRef,
    onMouseEnter: onPrefetchMouseEnter,
    onTouchStart: onPrefetchTouchStart,
  } = usePrefetchLoja(loja.slug, {
    prefetchOnViewport: idx < 3 ? 'full' : 'chunk',
    viewportThreshold: 0.65,
  })
  const [imgError, setImgError] = useState(false)
  const isAboveFold = idx < 6
  const shouldAnimate = idx < 8

  return (
    <Link
      ref={prefetchRef}
      to={`/loja/${loja.slug}`}
      onMouseEnter={onPrefetchMouseEnter}
      onTouchStart={onPrefetchTouchStart}
      className={`group block transform-gpu will-change-transform ${shouldAnimate ? 'animate-fade-in-up' : ''} ${!aberta ? 'opacity-60' : ''}`}
      style={{
        WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.12)',
        animationDelay: shouldAnimate ? `${Math.min(idx, 10) * 50}ms` : '0ms',
        contentVisibility: idx >= 8 ? 'auto' : 'visible',
        containIntrinsicSize: idx >= 8 ? '236px' : 'auto',
      }}
    >
      <div className="relative rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group-hover:border-stone-300 transition-colors">
        {!imgError && loja.logo_url ? (
          <img
            src={loja.logo_url}
            alt={loja.nome}
            width="220"
            height="220"
            loading={isAboveFold ? 'eager' : 'lazy'}
            fetchPriority={isAboveFold ? 'high' : 'auto'}
            decoding={isAboveFold ? 'sync' : 'async'}
            onError={() => setImgError(true)}
            className={`w-full aspect-square object-cover transition-transform duration-200 group-active:scale-[0.98] ${!aberta ? 'grayscale' : ''}`}
          />
        ) : (
          <div
            className="w-full aspect-square flex items-center justify-center text-4xl font-bold text-white"
            style={{ backgroundColor: loja.cor_primaria || '#78716c' }}
          >
            {loja.nome?.charAt(0)}
          </div>
        )}

        <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-amber-400/95 px-1.5 py-0.5">
          <FiStar className="text-[9px] text-white fill-white" />
          <span className="text-[10px] font-bold text-white font-numeric">
            {Number(loja.nota_media || 0).toFixed(1)}
          </span>
        </div>

        {loja.cupom_ativo?.codigo && (
          <div className="absolute top-1.5 right-1.5 rounded-md bg-red-500/95 px-1.5 py-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wide text-white">novo!</span>
          </div>
        )}

        {!aberta && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Fechada</span>
          </div>
        )}
      </div>

      <div className="pt-2 px-0.5">
        <h3 className="font-heading text-[14px] font-extrabold tracking-tight text-stone-800 line-clamp-1 leading-tight">
          {loja.nome}
        </h3>
        <div className="mt-0.5 flex items-center gap-1 text-[13px] text-stone-500">
          <Motorcycle size={12} weight="duotone" className="text-violet-500" />
          <span className={`font-numeric ${taxa === 0 ? 'text-green-600 font-semibold' : ''}`}>
            {taxa === 0 ? 'grátis' : `R$ ${Number(taxa).toFixed(2).replace('.', ',')}`}
          </span>
        </div>
      </div>
    </Link>
  )
})

export default function HomePage() {
  const { cliente } = useAuth()
  const [lojas, setLojas] = useState([])
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 250)
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [cidadePadrao, setCidadePadrao] = useState('')
  const [cidadeSelecionada] = useState(() => String(getLocalItem(SELECTED_CITY_KEY, '') || ''))
  const [bairroPadrao, setBairroPadrao] = useState('')
  const [cidadeGeo, setCidadeGeo] = useState('')
  const [storiesGroups, setStoriesGroups] = useState([])
  const [storiesCarregando, setStoriesCarregando] = useState(true)
  const [storiesSeenMap, setStoriesSeenMap] = useState(() => getStoriesSeenMap())
  const [storyModalOpen, setStoryModalOpen] = useState(false)
  const [storyGroupIndex, setStoryGroupIndex] = useState(-1)
  const [storyIndex, setStoryIndex] = useState(0)
  const [storyProgress, setStoryProgress] = useState(0)
  const [taxaBairroPorLoja, setTaxaBairroPorLoja] = useState({})
  const [modoVisualizacao, setModoVisualizacao] = useState('grade')
  const [visibleCount, setVisibleCount] = useState(12)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [mostrarSecoesSecundarias, setMostrarSecoesSecundarias] = useState(false)
  const catRef = useRef(null)
  const lojasComTaxaCarregadaRef = useRef(new Set())
  const storyTouchStartYRef = useRef(null)
  const feedPrefetchRef = useRef({ cityId: '', ts: 0 })

  const [cachedHomeData] = useState(() => {
    const cached = getLocalItem(HOME_CACHE_KEY, null)
    if (!cached?.ts || !Array.isArray(cached?.data)) return null
    return Date.now() - cached.ts < HOME_CACHE_TTL ? cached.data : null
  })

  const homeQuery = useQuery({
    queryKey: ['home-lojas'],
    queryFn: async () => {
      const data = await api.lojas.home()
      setLocalItem(HOME_CACHE_KEY, { ts: Date.now(), data })
      return data
    },
    staleTime: HOME_CACHE_TTL,
    initialData: () => cachedHomeData ?? undefined,
  })

  useEffect(() => {
    if (Array.isArray(homeQuery.data)) {
      setLojas(homeQuery.data)
      setCarregando(false)
    }
  }, [homeQuery.data])

  useEffect(() => {
    if (homeQuery.isLoading && !Array.isArray(homeQuery.data)) {
      setCarregando(true)
      return
    }
    setCarregando(false)
  }, [homeQuery.isLoading, homeQuery.data])

  // Prioriza a dobra inicial (saudação, busca, feed e ranking) antes de montar
  // seções mais pesadas da home.
  useEffect(() => {
    if (carregando) {
      setMostrarSecoesSecundarias(false)
      return
    }

    let cancelado = false
    let timeoutId = null
    let idleId = null

    const liberar = () => {
      if (cancelado) return
      setMostrarSecoesSecundarias(true)
    }

    timeoutId = window.setTimeout(liberar, 120)
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(liberar, { timeout: 400 })
    }

    return () => {
      cancelado = true
      if (timeoutId) clearTimeout(timeoutId)
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
    }
  }, [carregando])

  useEffect(() => {
    if (!homeQuery.error) {
      setErro(null)
      return
    }
    if (!Array.isArray(homeQuery.data) || homeQuery.data.length === 0) {
      setErro(homeQuery.error.message)
    }
  }, [homeQuery.error, homeQuery.data])

  useEffect(() => {
    api.stories
      .listarAtivas()
      .then((data) => setStoriesGroups(orderStoriesGroups(data)))
      .catch(() => setStoriesGroups([]))
      .finally(() => setStoriesCarregando(false))
  }, [])

  useEffect(() => {
    const cidade = resolverCidadePadraoCliente(cliente)
    const bairro = resolverBairroPadraoCliente(cliente)
    setCidadePadrao(cidade)
    setBairroPadrao(bairro)
  }, [cliente])

  useEffect(() => {
    if (!Array.isArray(lojas) || lojas.length === 0) return

    const cidadeBase = String(cidadeSelecionada || resolverCidadePadraoCliente(cliente) || '').trim()
    const cidadeResolvida = getResolvedFeedCity()
    const alvo = resolveFeedCityFromStores(lojas, cidadeBase || cidadeResolvida?.nome, cidadeResolvida?.id)
    if (!alvo?.id) return

    const ultimoPrefetch = feedPrefetchRef.current
    const agora = Date.now()
    if (ultimoPrefetch.cityId === alvo.id && agora - ultimoPrefetch.ts < 90_000) return
    const cacheAtual = getFeedCache(alvo.id)
    if (cacheAtual?.posts && agora - Number(cacheAtual.ts || 0) < 90_000) {
      feedPrefetchRef.current = { cityId: alvo.id, ts: agora }
      return
    }

    let cancelado = false
    let idleId = null
    let timeoutId = null

    const tarefa = async () => {
      try {
        const posts = await api.feed.listarPorCidade(alvo.id)
        if (cancelado) return
        setFeedCache(alvo, Array.isArray(posts) ? posts : [])
        feedPrefetchRef.current = { cityId: alvo.id, ts: Date.now() }
      } catch {
        // prefetch silencioso para não impactar UX da home
      }
    }

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => { tarefa() }, { timeout: 1200 })
    } else {
      timeoutId = window.setTimeout(() => { tarefa() }, 450)
    }

    return () => {
      cancelado = true
      if (timeoutId) clearTimeout(timeoutId)
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
    }
  }, [lojas, cidadeSelecionada, cliente])

  useEffect(() => {
    lojasComTaxaCarregadaRef.current.clear()
    setTaxaBairroPorLoja({})
  }, [bairroPadrao])

  useEffect(() => {
    const cached = getLocalItem(GEO_CITY_CACHE_KEY, null)
    if (cached?.cidade && cached?.ts && Date.now() - cached.ts < GEO_CITY_CACHE_TTL) {
      setCidadeGeo(String(cached.cidade))
      return
    }

    if (!('geolocation' in navigator)) return

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const cidade = await resolverCidadePorCoordenadas(
          pos.coords.latitude,
          pos.coords.longitude
        ).catch(() => '')
        if (!cidade) return
        setCidadeGeo(cidade)
        setLocalItem(GEO_CITY_CACHE_KEY, { cidade, ts: Date.now() })
      },
      () => { },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 1000 * 60 * 30 }
    )
  }, [])

  const termosFiltro = useMemo(
    () => ({
      busca: String(buscaDebounced || '').trim().toLowerCase(),
      categoria: categoriaSel ? normalizeText(categoriaSel) : '',
      cidade: String(cidadeSelecionada || cidadeGeo || cidadePadrao || '').trim().toLowerCase(),
    }),
    [buscaDebounced, categoriaSel, cidadeSelecionada, cidadeGeo, cidadePadrao]
  )

  const lojasComIndice = useMemo(
    () => (Array.isArray(lojas) ? lojas : []).map((loja) => ({
      loja,
      aberta: Boolean(loja?.aberta_agora ?? loja?.aberta),
      nomeLower: String(loja?.nome || '').toLowerCase(),
      categoriaLower: String(loja?.categoria_negocio || '').toLowerCase(),
      cidadeLower: String(loja?.cidade || '').toLowerCase(),
      categoriaNormalizada: normalizeText(loja?.categoria_negocio || ''),
    })),
    [lojas]
  )

  const lojasSeparadas = useMemo(() => {
    const abertas = []
    const fechadas = []
    const abertasRaw = []
    const fechadasRaw = []

    for (const item of lojasComIndice) {
      if (item.aberta) {
        abertas.push(item)
        abertasRaw.push(item.loja)
      } else {
        fechadas.push(item)
        fechadasRaw.push(item.loja)
      }
    }

    return {
      abertas,
      fechadas,
      abertasRaw,
      fechadasRaw,
      ordenadas: [...abertas, ...fechadas],
    }
  }, [lojasComIndice])

  const lojasAbertas = lojasSeparadas.abertasRaw
  const categoriasDinamicas = useMemo(() => extrairCategorias(lojas), [lojas])
  const cidadeRanking = useMemo(() => {
    const cidadeBase = String(cidadeSelecionada || cidadeGeo || cidadePadrao || '').trim()
    return resolveFeedCityFromStores(lojas, cidadeBase)
  }, [lojas, cidadeSelecionada, cidadeGeo, cidadePadrao])
  const greetingCity = useMemo(
    () => String(cidadeSelecionada || cidadeGeo || cidadePadrao || '').trim(),
    [cidadeSelecionada, cidadeGeo, cidadePadrao]
  )
  const dynamicGreeting = useDynamicGreeting(greetingCity)

  const lojasFiltradas = useMemo(() => {
    let lista = lojasSeparadas.ordenadas
    const buscaAtiva = Boolean(termosFiltro.busca)

    if (termosFiltro.cidade && !buscaAtiva) {
      lista = lista.filter((item) => item.cidadeLower === termosFiltro.cidade)
    }

    if (buscaAtiva) {
      lista = lista.filter(
        (item) =>
          item.nomeLower.includes(termosFiltro.busca) ||
          item.categoriaLower.includes(termosFiltro.busca) ||
          item.cidadeLower.includes(termosFiltro.busca)
      )
    }

    if (termosFiltro.categoria) {
      lista = lista.filter((item) => item.categoriaNormalizada.includes(termosFiltro.categoria))
    }

    return lista.map((item) => item.loja)
  }, [lojasSeparadas, termosFiltro])

  const filtradasAbertas = useMemo(() => lojasFiltradas.filter((l) => l.aberta_agora ?? l.aberta), [lojasFiltradas])
  const filtradasFechadas = useMemo(() => lojasFiltradas.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojasFiltradas])
  const passoCarregamento = modoVisualizacao === 'grade' ? 18 : 12

  useEffect(() => {
    setVisibleCount(passoCarregamento)
    if (lojasFiltradas.length <= passoCarregamento) return undefined

    let cancelled = false
    let timeoutId = null
    let idleId = null

    function scheduleNext() {
      if (cancelled) return
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => {
          setVisibleCount((prev) => {
            const next = Math.min(prev + passoCarregamento, lojasFiltradas.length)
            if (next < lojasFiltradas.length) scheduleNext()
            return next
          })
        }, { timeout: 300 })
      } else {
        timeoutId = window.setTimeout(() => {
          setVisibleCount((prev) => {
            const next = Math.min(prev + passoCarregamento, lojasFiltradas.length)
            if (next < lojasFiltradas.length) scheduleNext()
            return next
          })
        }, 120)
      }
    }

    scheduleNext()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
    }
  }, [lojasFiltradas.length, passoCarregamento])

  const lojasVisiveis = useMemo(() => lojasFiltradas.slice(0, visibleCount), [lojasFiltradas, visibleCount])
  const filtradasAbertasVisiveis = useMemo(() => lojasVisiveis.filter((l) => l.aberta_agora ?? l.aberta), [lojasVisiveis])
  const filtradasFechadasVisiveis = useMemo(() => lojasVisiveis.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojasVisiveis])

  useEffect(() => {
    const bairroNormalizado = normalizeText(bairroPadrao)
    if (!bairroNormalizado || lojasVisiveis.length === 0) return

    const lojasPendentes = lojasVisiveis.filter((loja) => !lojasComTaxaCarregadaRef.current.has(loja.id))
    if (lojasPendentes.length === 0) return

    lojasPendentes.forEach((loja) => lojasComTaxaCarregadaRef.current.add(loja.id))
    let cancelled = false

    async function carregarTaxas() {
      const resultados = []
      let cursor = 0
      const concurrency = Math.min(4, lojasPendentes.length)

      async function worker() {
        while (!cancelled) {
          const atual = cursor
          cursor += 1
          if (atual >= lojasPendentes.length) return
          const loja = lojasPendentes[atual]

          try {
            const bairros = await api.lojas.bairros(loja.id)
            const match = Array.isArray(bairros)
              ? bairros.find((b) => normalizeText(b?.nome) === bairroNormalizado)
              : null

            resultados.push({ lojaId: loja.id, taxa: match ? Number(match.taxa) || 0 : null })
          } catch {
            resultados.push({ lojaId: loja.id, taxa: null })
          }
        }
      }

      await Promise.all(Array.from({ length: concurrency }, () => worker()))
      if (cancelled) return

      setTaxaBairroPorLoja((prev) => {
        const next = { ...prev }
        for (const r of resultados) next[r.lojaId] = r.taxa
        return next
      })
    }

    carregarTaxas()

    return () => {
      cancelled = true
    }
  }, [bairroPadrao, lojasVisiveis])

  const openStories = useCallback((groupIdx) => {
    if (!storiesGroups[groupIdx]) return
    setStoryGroupIndex(groupIdx)
    setStoryIndex(0)
    setStoryProgress(0)
    setStoryModalOpen(true)
  }, [storiesGroups])

  const closeStories = useCallback(() => {
    setStoryModalOpen(false)
    setStoryGroupIndex(-1)
    setStoryIndex(0)
    setStoryProgress(0)
  }, [])

  const nextStory = useCallback(() => {
    const grupo = storiesGroups[storyGroupIndex]
    if (!grupo) return closeStories()
    const max = (grupo.stories || []).length
    if (storyIndex < max - 1) {
      setStoryIndex((prev) => prev + 1)
      setStoryProgress(0)
      return
    }
    if (storyGroupIndex < storiesGroups.length - 1) {
      setStoryGroupIndex((prev) => prev + 1)
      setStoryIndex(0)
      setStoryProgress(0)
      return
    }
    closeStories()
  }, [storiesGroups, storyGroupIndex, storyIndex, closeStories])

  const prevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1)
      setStoryProgress(0)
      return
    }
    if (storyGroupIndex > 0) {
      const prevGroupIdx = storyGroupIndex - 1
      const prevGroupStories = storiesGroups?.[prevGroupIdx]?.stories || []
      const lastIndex = Math.max(0, prevGroupStories.length - 1)
      setStoryGroupIndex(prevGroupIdx)
      setStoryIndex(lastIndex)
      setStoryProgress(0)
      return
    }
    closeStories()
  }, [storyIndex, storyGroupIndex, storiesGroups, closeStories])

  const nextStoreStories = useCallback(() => {
    if (storyGroupIndex < storiesGroups.length - 1) {
      setStoryGroupIndex((prev) => prev + 1)
      setStoryIndex(0)
      setStoryProgress(0)
      return
    }
    closeStories()
  }, [storyGroupIndex, storiesGroups.length, closeStories])

  useEffect(() => {
    if (!storyModalOpen) return undefined
    const currentStory = storiesGroups?.[storyGroupIndex]?.stories?.[storyIndex]
    if (!currentStory?.id) return undefined

    markStoryAsSeen(currentStory.id)
    setStoriesSeenMap(getStoriesSeenMap())
    return undefined
  }, [storyModalOpen, storyGroupIndex, storyIndex, storiesGroups])

  useEffect(() => {
    if (!storyModalOpen) return undefined
    setStoryProgress(0)
    const startedAt = Date.now()
    const timer = setInterval(() => {
      const p = (Date.now() - startedAt) / STORY_DURATION_MS
      if (p >= 1) {
        clearInterval(timer)
        setStoryProgress(1)
        nextStory()
        return
      }
      setStoryProgress(p)
    }, 80)

    return () => {
      clearInterval(timer)
    }
  }, [storyModalOpen, storyGroupIndex, storyIndex, nextStory])

  const onStoryPointerDown = useCallback((e) => {
    storyTouchStartYRef.current = e.clientY
  }, [])

  const onStoryPointerUp = useCallback((e) => {
    const startY = storyTouchStartYRef.current
    if (typeof startY !== 'number') return
    const deltaY = e.clientY - startY
    storyTouchStartYRef.current = null
    if (Math.abs(deltaY) > 70) closeStories()
  }, [closeStories])

  const limparBusca = useCallback(() => setBusca(''), [])
  const limparCategoria = useCallback(() => setCategoriaSel(null), [])

  if (carregando) {
    return <HomeLoadingState />
  }

  if (erro) {
    return (
      <div className="home-page flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-stone-700 font-medium text-sm mb-1">Ops, algo deu errado</p>
        <p className="text-stone-400 text-xs mb-4">{erro}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          Tentar novamente
        </button>
      </div>
    )
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'UaiFood',
        url: 'https://marketlajinha.com.br',
        description: 'Delivery em Lajinha MG com restaurantes, lanchonetes e mais.',
        inLanguage: 'pt-BR',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://marketlajinha.com.br/busca?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'FoodDeliveryService',
        name: 'UaiFood',
        url: 'https://marketlajinha.com.br',
        areaServed: {
          '@type': 'City',
          name: 'Lajinha',
          containedInPlace: {
            '@type': 'State',
            name: 'Minas Gerais',
          },
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Lajinha',
          addressRegion: 'MG',
          addressCountry: 'BR',
        },
      },
    ],
  }

  const hasNextStore = storyGroupIndex >= 0 && storyGroupIndex < storiesGroups.length - 1

  return (
    <div className="home-page max-w-lg mx-auto px-4">
      <SEO
        title="Delivery em Lajinha MG"
        description="Peça online em Lajinha MG com entrega rápida. Encontre restaurantes, lanchonetes e estabelecimentos da cidade no UaiFood."
        url="https://marketlajinha.com.br/"
        jsonLd={jsonLd}
      />

      <section className="relative mb-5 overflow-hidden px-1 py-2">
        <span className="pointer-events-none absolute -top-14 -right-16 w-44 h-44 rounded-full bg-red-200/30 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -left-14 w-40 h-40 rounded-full bg-amber-200/35 blur-3xl" />

        <div className="relative space-y-4">
          <HomeGreeting
            greeting={dynamicGreeting}
            cliente={cliente}
            lojasAbertasCount={lojasAbertas.length}
            cidadeSelecionada={cidadeSelecionada}
            cidadeGeo={cidadeGeo}
            cidadePadrao={cidadePadrao}
          />

          <HomeSearchBar
            busca={busca}
            onChangeBusca={setBusca}
            onClearBusca={limparBusca}
          />

          <Link
            to="/feed-cidade"
            className="feed-city-card group rounded-xl border border-red-200 bg-linear-to-r from-red-50 via-white to-red-50 px-4 py-3 flex items-center justify-between hover:border-red-300 transition-all"
          >
            <div>
              <p className="feed-city-title text-sm font-black tracking-tight text-red-700">📢 Feed da Cidade</p>
              <p className="feed-city-subtitle text-xs text-red-600 mt-0.5">Novidades e ofertas das lojas da sua cidade</p>
            </div>
            <span className="feed-city-arrow w-8 h-8 rounded-full border border-red-200 bg-white text-red-600 inline-flex items-center justify-center text-base transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>

          <HomeRanking
            cidadeId={cidadeRanking?.id || ''}
            cidadeNome={cidadeRanking?.nome || ''}
            currentUserId={cliente?.id || ''}
          />
        </div>
      </section>

      {mostrarSecoesSecundarias ? (
        <>
          <HomeStoriesSection
            storiesCarregando={storiesCarregando}
            storiesGroups={storiesGroups}
            storiesSeenMap={storiesSeenMap}
            onOpenStories={openStories}
            StoriesRailComponent={StoriesRail}
          />

          <HomeCarousel />

          <HomeCategoriesSection
            catRef={catRef}
            categoriasDinamicas={categoriasDinamicas}
            categoriaSel={categoriaSel}
            onToggleCategoria={setCategoriaSel}
            onClearCategoria={limparCategoria}
          />

          {/* Stores */}
          {lojasFiltradas.length === 0 ? (
            <HomeEmptyState busca={busca} />
          ) : (
            <section className="space-y-3 border-t border-stone-200 pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-stone-600">
                  {lojasFiltradas.length} loja{lojasFiltradas.length !== 1 ? 's' : ''} encontrada{lojasFiltradas.length !== 1 ? 's' : ''}
                </p>
                <div className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-50 p-1">
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('lista')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${modoVisualizacao === 'lista' ? 'bg-white text-red-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    aria-label="Visualização em lista"
                  >
                    <FiList size={14} /> Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('grade')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${modoVisualizacao === 'grade' ? 'bg-white text-red-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                    aria-label="Visualização em grade"
                  >
                    <FiGrid size={14} /> Grade
                  </button>
                </div>
              </div>

              {modoVisualizacao === 'grade' ? (
                <div className="grid grid-cols-3 gap-x-3 gap-y-5">
                  {lojasVisiveis.map((loja, idx) => (
                    <LojaCardGrid key={loja.id} loja={loja} idx={idx} taxaBairro={taxaBairroPorLoja[loja.id]} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {filtradasAbertas.length > 0 && (
                    <>
                      {!busca && !categoriaSel && filtradasFechadas.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 pb-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-xs font-semibold text-stone-700">Abertas agora</span>
                        </div>
                      )}
                      {filtradasAbertasVisiveis.map((loja, idx) => (
                        <LojaCard key={loja.id} loja={loja} idx={idx} taxaBairro={taxaBairroPorLoja[loja.id]} />
                      ))}
                    </>
                  )}

                  {filtradasFechadasVisiveis.length > 0 && (
                    <>
                      {!busca && !categoriaSel && filtradasAbertasVisiveis.length > 0 && (
                        <div className="flex items-center gap-2 pt-4 pb-2">
                          <span className="w-2 h-2 bg-stone-300 rounded-full" />
                          <span className="text-xs font-semibold text-stone-400">Fechadas</span>
                          <div className="flex-1 h-px bg-stone-100" />
                        </div>
                      )}
                      {filtradasFechadasVisiveis.map((loja, idx) => (
                        <LojaCard
                          key={loja.id}
                          loja={loja}
                          idx={filtradasAbertasVisiveis.length + idx}
                          taxaBairro={taxaBairroPorLoja[loja.id]}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          <HomeBottomSupport
            suporteWhatsapp={SUPORTE_WHATSAPP}
            suporteInstagram={SUPORTE_INSTAGRAM}
          />
        </>
      ) : (
        <div className="h-24" />
      )}

      {storyModalOpen && (
        <div
          className="animate-fade-in-up"
          onPointerDown={onStoryPointerDown}
          onPointerUp={onStoryPointerUp}
        >
          <StoryViewerModal
            grupos={storiesGroups}
            groupIndex={storyGroupIndex}
            storyIndex={storyIndex}
            progress={storyProgress}
            onPrev={prevStory}
            onNext={nextStory}
            onNextStore={nextStoreStories}
            hasNextStore={hasNextStore}
            onClose={closeStories}
          />
        </div>
      )}
    </div>
  )
}
