import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import { FiStar, FiSearch, FiX, FiMessageCircle, FiInstagram, FiChevronLeft, FiChevronRight, FiGrid, FiList } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Pizza,
  Hamburger,
  BowlFood,
  Fish,
  IceCream,
  Cake,
  Cookie,
  Coffee,
  BeerBottle,
  ShoppingCartSimple,
  Pill,
  PawPrint,
  Leaf,
  Storefront,
  Tag,
  Motorcycle,
} from '@phosphor-icons/react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import { usePrefetchLoja } from '../hooks/usePrefetch'
import SEO from '../componentes/SEO'
import { getItem as getLocalItem, setItem as setLocalItem } from '../storage/localStorageService'

const SUPORTE_WHATSAPP = '5533999394706'
const SUPORTE_NOME = 'Franklim'
const SUPORTE_INSTAGRAM = 'https://www.instagram.com/uaifood2026/'
const HOME_CACHE_KEY = 'homeLojasCache'
const HOME_CACHE_TTL = 1000 * 60 * 5
const GEO_CITY_CACHE_KEY = 'geoCityCache'
const GEO_CITY_CACHE_TTL = 1000 * 60 * 60 * 6
const STORIES_SEEN_KEY = 'storiesSeenById'
const STORY_DURATION_MS = 6000

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

const CATEGORIA_ICONES = [
  { k: 'pizza', Icon: Pizza },
  { k: 'hamb', Icon: Hamburger },
  { k: 'burg', Icon: Hamburger },
  { k: 'lanche', Icon: Hamburger },
  { k: 'porç', Icon: BowlFood },
  { k: 'frango', Icon: BowlFood },
  { k: 'marmit', Icon: BowlFood },
  { k: 'jap', Icon: Fish },
  { k: 'sushi', Icon: Fish },
  { k: 'aça', Icon: IceCream },
  { k: 'acai', Icon: IceCream },
  { k: 'doce', Icon: Cake },
  { k: 'confeit', Icon: Cake },
  { k: 'salgad', Icon: Cookie },
  { k: 'padar', Icon: Cookie },
  { k: 'café', Icon: Coffee },
  { k: 'cafe', Icon: Coffee },
  { k: 'sorvet', Icon: IceCream },
  { k: 'saud', Icon: Leaf },
  { k: 'bebid', Icon: BeerBottle },
  { k: 'adega', Icon: BeerBottle },
  { k: 'mercad', Icon: ShoppingCartSimple },
  { k: 'farm', Icon: Pill },
  { k: 'pet', Icon: PawPrint },
  { k: 'churr', Icon: BowlFood },
]

const CATEGORIA_CORES_POR_TIPO = [
  { k: 'adega', cor: '#7c3aed' },
  { k: 'bebid', cor: '#2563eb' },
  { k: 'caf', cor: '#92400e' },
  { k: 'churr', cor: '#ea580c' },
  { k: 'pizza', cor: '#ef4444' },
  { k: 'hamb', cor: '#f59e0b' },
  { k: 'burg', cor: '#f59e0b' },
  { k: 'lanche', cor: '#f59e0b' },
  { k: 'sushi', cor: '#0ea5e9' },
  { k: 'jap', cor: '#0ea5e9' },
  { k: 'doce', cor: '#ec4899' },
  { k: 'confeit', cor: '#ec4899' },
  { k: 'sorvet', cor: '#06b6d4' },
  { k: 'aça', cor: '#8b5cf6' },
  { k: 'acai', cor: '#8b5cf6' },
  { k: 'mercad', cor: '#16a34a' },
  { k: 'farm', cor: '#14b8a6' },
  { k: 'pet', cor: '#f97316' },
  { k: 'padar', cor: '#b45309' },
  { k: 'salgad', cor: '#b45309' },
]

const CATEGORIA_CORES_FALLBACK = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#06b6d4',
]

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
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

function corDaCategoria(nome) {
  const key = normalizeText(nome)
  if (!key) return CATEGORIA_CORES_FALLBACK[0]

  const match = CATEGORIA_CORES_POR_TIPO.find((item) => key.includes(item.k))
  if (match?.cor) return match.cor

  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return CATEGORIA_CORES_FALLBACK[hash % CATEGORIA_CORES_FALLBACK.length]
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

function iconCategoria(nome) {
  const n = String(nome || '').toLowerCase()
  const match = CATEGORIA_ICONES.find((i) => n.includes(i.k))
  return match?.Icon || Storefront
}

function formatarTempoEntrega(tempo) {
  const t = String(tempo || '').trim()
  if (!t) return ''
  if (/min/i.test(t)) return t
  return `${t} min`
}

function formatarNomeCategoria(nome) {
  const texto = String(nome || '').trim().replace(/\s+/g, ' ')
  if (!texto) return ''
  return texto
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)\S/g, (char) => char.toLocaleUpperCase('pt-BR'))
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
        const key = normalizeText(c)
        if (!key || categoriasMap.has(key)) return
        categoriasMap.set(key, formatarNomeCategoria(c))
      })
  }
  return Array.from(categoriasMap.values())
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((nome) => ({ nome, Icon: iconCategoria(nome), cor: corDaCategoria(nome) }))
}

const CategoriaCard = memo(function CategoriaCard({ categoria, isActive, onToggle }) {
  const Icon = categoria.Icon || Tag
  const corCategoria = categoria.cor || '#ef4444'
  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={onToggle}
      className="relative shrink-0 rounded-2xl"
    >
      <motion.div
        layout
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`relative px-2.5 py-2 rounded-2xl border ${isActive
          ? 'border-red-600 shadow-sm'
          : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
      >
        {isActive && (
          <motion.span
            layoutId="categoria-pill"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 rounded-2xl bg-red-600"
          />
        )}
        <div className="relative z-10 flex flex-col items-center gap-1.5 min-w-[64px]">
          <motion.div
            layout
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-11 h-11 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-stone-100'
              }`}
            style={
              isActive
                ? undefined
                : { color: corCategoria, backgroundColor: `${corCategoria}1A` }
            }
          >
            <Icon size={22} weight={isActive ? 'fill' : 'duotone'} />
          </motion.div>
          <span className={`font-heading text-[11px] font-bold tracking-tight whitespace-nowrap ${isActive ? 'text-white' : 'text-stone-700'}`}>
            {categoria.nome}
          </span>
        </div>
      </motion.div>
    </motion.button>
  )
})

const StoriesRail = memo(function StoriesRail({ grupos, seenMap, onOpen }) {
  if (!Array.isArray(grupos) || grupos.length === 0) return null

  return (
    <section className="mb-5" aria-label="Stories das lojas">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold text-stone-900">UaiFood Stories</h3>
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
              <p className="text-[11px] text-stone-700 mt-1.5 line-clamp-1">{g.restaurant_name}</p>
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
    <section className="mb-5" aria-label="Destaques do UaiFood">
      <div className="relative overflow-hidden rounded-3xl border border-stone-100 shadow-sm">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${slideAtivo * 100}%)` }}
        >
          {HOME_BANNERS.map((banner) => (
            <div key={banner.id} className={`min-w-full p-5 text-white bg-linear-to-r ${banner.gradiente}`}>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide">
                UaiFood destaque
              </span>
              <h3 className="mt-3 text-xl font-extrabold leading-tight">{banner.titulo}</h3>
              <p className="mt-1.5 text-sm text-white/90 leading-relaxed">{banner.subtitulo}</p>
              <p className="mt-3 text-xs font-semibold text-white/95">{banner.destaque}</p>
            </div>
          ))}
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {HOME_BANNERS.map((banner, idx) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => setSlideAtivo(idx)}
              aria-label={`Ir para banner ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${slideAtivo === idx ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'
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
  const prefetch = usePrefetchLoja(loja.slug)
  const shouldAnimate = idx < 8

  useEffect(() => {
    return () => {
      rippleTimersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse') return
    prefetch.onTouchStart()
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
      ref={prefetch.ref}
      to={`/loja/${loja.slug}`}
      onMouseEnter={prefetch.onMouseEnter}
      onPointerDown={handlePointerDown}
      className={`group relative overflow-hidden flex items-center gap-4 px-2 py-3.5 rounded-xl transform-gpu will-change-transform transition-all duration-200 ease-out hover:bg-white hover:shadow-sm hover:scale-[1.01] active:scale-[0.985] active:bg-stone-50 active:shadow-none ${shouldAnimate ? 'animate-fade-in-up' : ''} ${!aberta ? 'opacity-50' : ''
        }`}
      style={{
        animationDelay: shouldAnimate ? `${Math.min(idx, 10) * 50}ms` : '0ms',
        contentVisibility: idx >= 8 ? 'auto' : 'visible',
        containIntrinsicSize: idx >= 8 ? '88px' : 'auto',
        WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.12)',
      }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent transition-colors duration-200 group-active:ring-red-200" />
      <span className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden">
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
        <h3 className="text-[15px] font-bold text-stone-900 truncate">{loja.nome}</h3>
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
  const prefetch = usePrefetchLoja(loja.slug)
  const [imgError, setImgError] = useState(false)
  const isAboveFold = idx < 6

  return (
    <Link
      ref={prefetch.ref}
      to={`/loja/${loja.slug}`}
      onMouseEnter={prefetch.onMouseEnter}
      onTouchStart={prefetch.onTouchStart}
      className={`group block ${!aberta ? 'opacity-60' : ''}`}
      style={{ WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.12)' }}
    >
      <div className="relative rounded-2xl overflow-hidden bg-stone-100">
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

      <div className="pt-1.5 px-0.5">
        <h3 className="font-heading text-[14px] font-bold tracking-tight text-stone-700 line-clamp-1 leading-tight">
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
  const [modoVisualizacao, setModoVisualizacao] = useState('lista')
  const [visibleCount, setVisibleCount] = useState(12)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const catRef = useRef(null)
  const lojasComTaxaCarregadaRef = useRef(new Set())
  const storyTouchStartYRef = useRef(null)

  const cachedHome = getLocalItem(HOME_CACHE_KEY, null)
  const cachedHomeData =
    cachedHome?.ts &&
      Array.isArray(cachedHome?.data) &&
      Date.now() - cachedHome.ts < HOME_CACHE_TTL
      ? cachedHome.data
      : null

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

  const lojasAbertas = useMemo(() => lojas.filter((l) => l.aberta_agora ?? l.aberta), [lojas])
  const lojasFechadas = useMemo(() => lojas.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojas])
  const categoriasDinamicas = useMemo(() => extrairCategorias(lojas), [lojas])

  const lojasFiltradas = useMemo(() => {
    let lista = [...lojasAbertas, ...lojasFechadas]
    const buscaAtiva = Boolean(buscaDebounced.trim())
    const cidadeBase = (cidadeGeo || cidadePadrao || '').trim()

    if (cidadeBase && !buscaAtiva) {
      const c = cidadeBase.toLowerCase()
      lista = lista.filter((l) => String(l.cidade || '').toLowerCase() === c)
    }

    if (buscaAtiva) {
      const b = buscaDebounced.toLowerCase()
      lista = lista.filter(
        (l) =>
          l.nome.toLowerCase().includes(b) ||
          l.categoria_negocio.toLowerCase().includes(b) ||
          String(l.cidade || '').toLowerCase().includes(b)
      )
    }
    if (categoriaSel) {
      const c = normalizeText(categoriaSel)
      lista = lista.filter((l) => normalizeText(l.categoria_negocio).includes(c))
    }
    return lista
  }, [lojasAbertas, lojasFechadas, buscaDebounced, categoriaSel, cidadePadrao, cidadeGeo])

  const filtradasAbertas = useMemo(() => lojasFiltradas.filter((l) => l.aberta_agora ?? l.aberta), [lojasFiltradas])
  const filtradasFechadas = useMemo(() => lojasFiltradas.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojasFiltradas])

  useEffect(() => {
    setVisibleCount(12)
    if (lojasFiltradas.length <= 12) return undefined

    let cancelled = false
    let timeoutId = null
    let idleId = null

    function scheduleNext() {
      if (cancelled) return
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(() => {
          setVisibleCount((prev) => {
            const next = Math.min(prev + 12, lojasFiltradas.length)
            if (next < lojasFiltradas.length) scheduleNext()
            return next
          })
        }, { timeout: 300 })
      } else {
        timeoutId = window.setTimeout(() => {
          setVisibleCount((prev) => {
            const next = Math.min(prev + 12, lojasFiltradas.length)
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
  }, [lojasFiltradas.length])

  const lojasVisiveis = useMemo(() => lojasFiltradas.slice(0, visibleCount), [lojasFiltradas, visibleCount])
  const filtradasAbertasVisiveis = useMemo(() => lojasVisiveis.filter((l) => l.aberta_agora ?? l.aberta), [lojasVisiveis])
  const filtradasFechadasVisiveis = useMemo(() => lojasVisiveis.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojasVisiveis])

  useEffect(() => {
    const bairroNormalizado = normalizeText(bairroPadrao)
    if (!bairroNormalizado || lojasVisiveis.length === 0) return

    const lojasPendentes = lojasVisiveis.filter((loja) => !lojasComTaxaCarregadaRef.current.has(loja.id))
    if (lojasPendentes.length === 0) return

    lojasPendentes.forEach((loja) => lojasComTaxaCarregadaRef.current.add(loja.id))

    Promise.all(
      lojasPendentes.map(async (loja) => {
        try {
          const bairros = await api.lojas.bairros(loja.id)
          const match = Array.isArray(bairros)
            ? bairros.find((b) => normalizeText(b?.nome) === bairroNormalizado)
            : null

          if (!match) return { lojaId: loja.id, taxa: null }
          return { lojaId: loja.id, taxa: Number(match.taxa) || 0 }
        } catch {
          return { lojaId: loja.id, taxa: null }
        }
      })
    ).then((resultados) => {
      setTaxaBairroPorLoja((prev) => {
        const next = { ...prev }
        for (const r of resultados) next[r.lojaId] = r.taxa
        return next
      })
    })
  }, [bairroPadrao, lojasVisiveis])

  function openStories(groupIdx) {
    if (!storiesGroups[groupIdx]) return
    setStoryGroupIndex(groupIdx)
    setStoryIndex(0)
    setStoryProgress(0)
    setStoryModalOpen(true)
  }

  function closeStories() {
    setStoryModalOpen(false)
    setStoryGroupIndex(-1)
    setStoryIndex(0)
    setStoryProgress(0)
  }

  function nextStory() {
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
  }

  function prevStory() {
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
  }

  function nextStoreStories() {
    if (storyGroupIndex < storiesGroups.length - 1) {
      setStoryGroupIndex((prev) => prev + 1)
      setStoryIndex(0)
      setStoryProgress(0)
      return
    }
    closeStories()
  }

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
  }, [storyModalOpen, storyGroupIndex, storyIndex])

  function onStoryPointerDown(e) {
    storyTouchStartYRef.current = e.clientY
  }

  function onStoryPointerUp(e) {
    const startY = storyTouchStartYRef.current
    if (typeof startY !== 'number') return
    const deltaY = e.clientY - startY
    storyTouchStartYRef.current = null
    if (Math.abs(deltaY) > 70) closeStories()
  }

  if (carregando) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <h2 className="text-xl font-bold text-stone-900 mb-1">Carregando lojas</h2>
        <p className="text-sm text-stone-400 mb-4">Buscando os melhores estabelecimentos da sua cidade...</p>
        <div className="skeleton h-6 rounded w-40 mb-1" />
        <div className="skeleton h-4 rounded w-56 mb-5" />
        <div className="h-12 skeleton rounded-xl mb-5" />
        <div className="flex gap-4 overflow-hidden mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-14 h-14 rounded-full skeleton" />
              <div className="w-10 h-2 skeleton rounded" />
            </div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-2 py-3.5">
            <div className="w-16 h-16 rounded-xl skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
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
    <div className="max-w-lg mx-auto px-4">
      <SEO
        title="Delivery em Lajinha MG"
        description="Peça online em Lajinha MG com entrega rápida. Encontre restaurantes, lanchonetes e estabelecimentos da cidade no UaiFood."
        url="https://marketlajinha.com.br/"
        jsonLd={jsonLd}
      />

      {/* Greeting */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-stone-900">
          {saudacao()}{cliente?.nome ? <>, <span className="text-red-500">{cliente.nome.split(' ')[0]}</span></> : ''}!
        </h2>
        <p className="text-sm text-stone-400 mt-0.5">
          {lojasAbertas.length > 0
            ? `${lojasAbertas.length} loja${lojasAbertas.length !== 1 ? 's' : ''} aberta${lojasAbertas.length !== 1 ? 's' : ''} agora`
            : 'Nenhuma loja aberta no momento'}
        </p>
        {(cidadeGeo || cidadePadrao) && (
          <p className="text-xs text-stone-500 mt-1">
            Mostrando lojas em <span className="font-semibold text-stone-700">{cidadeGeo || cidadePadrao}</span>.{' '}
            Para ver outra cidade, pesquise o nome dela.
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lojas e restaurantes"
          className="w-full pl-10 pr-10 py-3 bg-stone-100 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5">
            <FiX size={16} />
          </button>
        )}
      </div>

      {storiesCarregando ? (
        <section className="mb-5" aria-hidden="true">
          <div className="flex items-center justify-between mb-2">
            <div className="skeleton h-4 rounded w-28" />
          </div>
          <div className="flex gap-3 overflow-hidden pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[84px] text-center">
                <div className="skeleton w-[76px] h-[76px] rounded-full mx-auto" />
                <div className="skeleton h-2.5 rounded w-12 mx-auto mt-2" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <StoriesRail grupos={storiesGroups} seenMap={storiesSeenMap} onOpen={openStories} />
      )}

      <HomeCarousel />

      {/* Categorias */}
      <div ref={catRef} className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {categoriasDinamicas.map((cat) => {
          const ativo = categoriaSel === cat.nome
          return (
            <CategoriaCard
              key={cat.nome}
              categoria={cat}
              isActive={ativo}
              onToggle={() => setCategoriaSel(ativo ? null : cat.nome)}
            />
          )
        })}
      </div>

      {/* Active filter chip */}
      <AnimatePresence mode="wait">
        {categoriaSel && (
          <motion.div
            key="filtro-ativo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex items-center gap-2 mb-3"
          >
            <span className="text-sm text-stone-600">Filtrando por:</span>
            <button
              onClick={() => setCategoriaSel(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <span>{categoriaSel}</span>
              <motion.span
                initial={{ rotate: -45, opacity: 0.8 }}
                animate={{ rotate: 0, opacity: 1 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <FiX size={14} />
              </motion.span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stores */}
      {lojasFiltradas.length === 0 ? (
        <div className="text-center py-16 animate-fade-in-up">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-stone-700 font-medium text-sm mb-1">Nenhuma loja encontrada</p>
          <p className="text-stone-400 text-xs">
            {busca ? 'Tente buscar por outro nome ou categoria' : 'Não há lojas nesta categoria'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-stone-500">
              {lojasFiltradas.length} loja{lojasFiltradas.length !== 1 ? 's' : ''} encontrada{lojasFiltradas.length !== 1 ? 's' : ''}
            </p>
            <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setModoVisualizacao('lista')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${modoVisualizacao === 'lista' ? 'bg-red-50 text-red-700' : 'text-stone-500 hover:text-stone-700'}`}
                aria-label="Visualização em lista"
              >
                <FiList size={14} /> Lista
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('grade')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${modoVisualizacao === 'grade' ? 'bg-red-50 text-red-700' : 'text-stone-500 hover:text-stone-700'}`}
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
        </div>
      )}

      {/* CTA Cadastrar loja */}
      <div className="mt-8 mb-4 bg-stone-950 rounded-2xl p-5 text-white animate-fade-in-up">
        <h3 className="text-lg font-bold">Tem um negócio?</h3>
        <p className="text-sm text-stone-400 mt-1 leading-relaxed">
          Cadastre sua loja no UaiFood e comece a vender online para toda a cidade!
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Quero cadastrar minha loja no UaiFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 transition-colors"
          >
            <FaWhatsapp className="text-lg" />
            WhatsApp
          </a>
          <a
            href={SUPORTE_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-colors"
          >
            <FiInstagram className="text-lg" />
            Instagram
          </a>
        </div>
      </div>

      {/* Suporte */}
      <div className="text-center pb-4 space-y-1">
        <p className="text-[10px] text-stone-300">Precisa de ajuda?</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso de ajuda com o UaiFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-green-600 transition-colors"
          >
            <FaWhatsapp size={11} /> WhatsApp
          </a>
          <span className="text-stone-200">·</span>
          <a
            href={SUPORTE_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-pink-600 transition-colors"
          >
            <FiInstagram size={11} /> Instagram
          </a>
        </div>
      </div>

      <AnimatePresence>
        {storyModalOpen && (
          <motion.div
            key="story-modal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
