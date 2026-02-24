import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import { FiStar, FiSearch, FiX, FiMessageCircle, FiInstagram } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
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

const CATEGORIA_ICONES = [
  { k: 'pizza', e: '🍕' },
  { k: 'hamb', e: '🍔' },
  { k: 'burg', e: '🍔' },
  { k: 'lanche', e: '🍔' },
  { k: 'porç', e: '🍗' },
  { k: 'frango', e: '🍗' },
  { k: 'marmit', e: '🍱' },
  { k: 'jap', e: '🍣' },
  { k: 'sushi', e: '🍣' },
  { k: 'aça', e: '🍇' },
  { k: 'acai', e: '🍇' },
  { k: 'doce', e: '🍩' },
  { k: 'confeit', e: '🧁' },
  { k: 'salgad', e: '🥟' },
  { k: 'padar', e: '🥖' },
  { k: 'café', e: '☕' },
  { k: 'cafe', e: '☕' },
  { k: 'sorvet', e: '🍦' },
  { k: 'saud', e: '🥗' },
  { k: 'bebid', e: '🥤' },
  { k: 'adega', e: '🍷' },
  { k: 'mercad', e: '🛒' },
  { k: 'farm', e: '💊' },
  { k: 'pet', e: '🐾' },
  { k: 'churr', e: '🍖' },
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

function emojiCategoria(nome) {
  const n = String(nome || '').toLowerCase()
  const match = CATEGORIA_ICONES.find((i) => n.includes(i.k))
  return match?.e || '🏷️'
}

function formatarTempoEntrega(tempo) {
  const t = String(tempo || '').trim()
  if (!t) return ''
  if (/min/i.test(t)) return t
  return `${t} min`
}

function extrairCategorias(lojas) {
  const set = new Set()
  for (const loja of lojas || []) {
    const raw = String(loja?.categoria_negocio || '')
    raw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((c) => set.add(c))
  }
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((nome) => ({ nome, emoji: emojiCategoria(nome) }))
}

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
      className={`group relative overflow-hidden flex items-center gap-4 px-2 py-3.5 rounded-xl transform-gpu will-change-transform transition-all duration-200 ease-out hover:bg-white hover:shadow-sm hover:scale-[1.01] active:scale-[0.985] active:bg-stone-50 active:shadow-none ${shouldAnimate ? 'animate-fade-in-up' : ''} ${
        !aberta ? 'opacity-50' : ''
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
              <span className="font-medium text-stone-700">{Number(loja.nota_media).toFixed(1).replace('.', ',')}</span>
              <span className="text-stone-300">&bull;</span>
            </>
          )}
          {taxa === 0 ? (
            <span className="font-semibold text-green-600">Entrega grátis</span>
          ) : (
            <span>R$ {taxa.toFixed(2).replace('.', ',')}</span>
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
          <p className="text-[10px] text-stone-400 mt-0.5">Abre hoje às {loja.horario_hoje.abertura}</p>
        )}
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
  const [taxaBairroPorLoja, setTaxaBairroPorLoja] = useState({})
  const [visibleCount, setVisibleCount] = useState(12)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const catRef = useRef(null)
  const lojasComTaxaCarregadaRef = useRef(new Set())

  useEffect(() => {
    const cached = getLocalItem(HOME_CACHE_KEY, null)
    if (cached?.ts && Array.isArray(cached?.data) && Date.now() - cached.ts < HOME_CACHE_TTL) {
      setLojas(cached.data)
      setCarregando(false)
    }

    api.lojas
      .home()
      .then((data) => {
        setLojas(data)
        setLocalItem(HOME_CACHE_KEY, { ts: Date.now(), data })
      })
      .catch((e) => {
        if (!cached?.data?.length) setErro(e.message)
      })
      .finally(() => setCarregando(false))
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
      () => {},
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
      const c = categoriaSel.toLowerCase()
      lista = lista.filter((l) => l.categoria_negocio.toLowerCase().includes(c))
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
    '@type': 'WebSite',
    name: 'UaiFood',
    url: 'https://uaifooddelivery.vercel.app',
    description: 'Marketplace com os melhores estabelecimentos da sua cidade',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://uaifooddelivery.vercel.app/busca?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <div className="max-w-lg mx-auto px-4">
      <SEO
        title="Início"
        description="Peça dos melhores restaurantes, lanchonetes e estabelecimentos da sua cidade. Entrega rápida e segura."
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

      {/* Categorias */}
      <div ref={catRef} className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {categoriasDinamicas.map((cat) => {
          const ativo = categoriaSel === cat.nome
          return (
            <button
              key={cat.nome}
              onClick={() => setCategoriaSel(ativo ? null : cat.nome)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${ativo ? 'bg-red-100 ring-2 ring-red-500 scale-110' : 'bg-stone-100 hover:bg-stone-200'}`}>
                {cat.emoji}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap transition-colors ${ativo ? 'text-red-600' : 'text-stone-600'}`}>{cat.nome}</span>
            </button>
          )
        })}
      </div>

      {/* Active filter chip */}
      {categoriaSel && (
        <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
          <span className="text-xs text-stone-500">Filtrando por:</span>
          <button
            onClick={() => setCategoriaSel(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
          >
            {categoriaSel} <FiX size={12} />
          </button>
        </div>
      )}

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
    </div>
  )
}
