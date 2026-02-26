import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api, getCachedData } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'
import { FiClock, FiMinus, FiPlus, FiShoppingBag, FiChevronLeft, FiCopy, FiCheck, FiChevronRight, FiInfo, FiTruck, FiDollarSign, FiMapPin, FiTag, FiGift, FiStar, FiCalendar } from 'react-icons/fi'
import { getItem as getLocalItem, setItem as setLocalItem, removeItem as removeLocalItem } from '../storage/localStorageService'
import { getItem as getSessionItem, setItem as setSessionItem, removeItem as removeSessionItem } from '../storage/sessionStorageService'
import { addLocalOrderHistory, enqueuePendingOrder, setupAutoSync } from '../storage/offlineDatabase'

const AVISO_PIX_ONLINE = '[PIX ONLINE] Conferir comprovante antes de aprovar.'

function gerarChaveCarrinho(produtoId, variacaoId, adicionaisIds) {
  return `${produtoId}__${variacaoId || ''}__${(adicionaisIds || []).sort().join(',')}`
}

function normalizarTelefoneWhatsapp(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function formatDateTimeLocalValue(date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

function serializarCarrinho(carrinho) {
  return Object.entries(carrinho).map(([key, item]) => ({
    key,
    produtoId: item?.produto?.id || null,
    variacaoId: item?.variacao?.id || null,
    adicionaisIds: (item?.adicionais || []).map((a) => a.id),
    qtd: Number(item?.qtd || 0),
    isCombo: !!item?.isCombo,
    comboId: item?.isCombo ? item?.produto?.id : null,
  })).filter((i) => i.produtoId && i.qtd > 0)
}

function restaurarCarrinho(snapshot, produtos, combos) {
  if (!Array.isArray(snapshot)) return {}
  const byId = Object.fromEntries((produtos || []).map((p) => [p.id, p]))
  const combosById = Object.fromEntries((combos || []).map((c) => [c.id, c]))
  const result = {}
  for (const row of snapshot) {
    if (row.isCombo) {
      const combo = combosById[row.comboId]
      if (!combo) continue
      result[row.key] = {
        produto: { id: combo.id, nome: combo.nome, preco: combo.preco, imagem_url: combo.imagem_url },
        variacao: null,
        adicionais: [],
        precoUnit: Number(combo.preco),
        obs: combo.itens?.map((i) => `${i.quantidade}x ${i.produto?.nome}`).join(', ') || '',
        qtd: Number(row.qtd || 1),
        isCombo: true,
        comboItens: combo.itens,
      }
      continue
    }

    const produto = byId[row.produtoId]
    if (!produto) continue
    const variacao = (produto.variacoes || []).find((v) => v.id === row.variacaoId) || null
    const adicionais = (produto.adicionais || []).filter((a) => (row.adicionaisIds || []).includes(a.id))
    const precoBase = variacao ? Number(variacao.preco) : Number(produto.preco)
    const precoAdds = adicionais.reduce((s, a) => s + Number(a.preco), 0)
    result[row.key] = {
      produto,
      variacao,
      adicionais,
      precoUnit: precoBase + precoAdds,
      obs: '',
      qtd: Number(row.qtd || 1),
    }
  }
  return result
}

const CarrosselDestaques = memo(function CarrosselDestaques({ produtos, onAdd }) {
  const ref = useRef(null)
  const intervaloRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || produtos.length <= 2) return

    function scroll() {
      if (!el) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= maxScroll - 2) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: 130, behavior: 'smooth' })
      }
    }

    intervaloRef.current = setInterval(scroll, 3000)
    const pausar = () => clearInterval(intervaloRef.current)
    const retomar = () => { intervaloRef.current = setInterval(scroll, 3000) }
    el.addEventListener('pointerdown', pausar)
    el.addEventListener('pointerup', retomar)
    el.addEventListener('touchstart', pausar, { passive: true })
    el.addEventListener('touchend', retomar)

    return () => {
      clearInterval(intervaloRef.current)
      el.removeEventListener('pointerdown', pausar)
      el.removeEventListener('pointerup', retomar)
      el.removeEventListener('touchstart', pausar)
      el.removeEventListener('touchend', retomar)
    }
  }, [produtos.length])

  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-stone-900 mb-3">Destaques</h2>
      <div ref={ref} className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {produtos.map((p) => {
          const preco = p.variacoes?.length > 0 ? Math.min(...p.variacoes.map(v => Number(v.preco))) : Number(p.preco)
          return (
            <button key={p.id} onClick={() => onAdd(p)} className="snap-start shrink-0 w-[120px] text-left">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-stone-100">
                <img src={p.imagem_url} alt={p.nome} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-semibold text-stone-900 mt-1.5 line-clamp-1">{p.nome}</p>
              <p className="text-xs text-red-700 font-bold font-numeric">
                {p.variacoes?.length > 0 && 'a partir de '}R$ {preco.toFixed(2).replace('.', ',')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
})

const HorizontalCards = memo(function HorizontalCards({ items, renderItem, cardStep = 268 }) {
  const ref = useRef(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(items.length > 1)
  const [pagina, setPagina] = useState(1)

  const atualizarNavegacao = useCallback(() => {
    const el = ref.current
    if (!el) return
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    const left = el.scrollLeft
    setCanPrev(left > 4)
    setCanNext(left < maxScroll - 4)
    const atual = Math.max(1, Math.min(items.length, Math.round(left / (cardStep + 12)) + 1))
    setPagina(atual)
  }, [items.length, cardStep])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    atualizarNavegacao()
    const onScroll = () => atualizarNavegacao()
    el.addEventListener('scroll', onScroll, { passive: true })

    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => atualizarNavegacao())
      ro.observe(el)
    }

    return () => {
      el.removeEventListener('scroll', onScroll)
      if (ro) ro.disconnect()
    }
  }, [atualizarNavegacao])

  function mover(dir) {
    ref.current?.scrollBy({ left: dir * (cardStep + 12), behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => renderItem(item))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => mover(-1)}
            disabled={!canPrev}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-stone-200 text-stone-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center"
            aria-label="Voltar no carrossel"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            disabled={!canNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-stone-200 text-stone-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center"
            aria-label="Avançar no carrossel"
          >
            <FiChevronRight size={16} />
          </button>
          <div className="mt-1 text-right text-[10px] font-semibold text-stone-400">
            {pagina}/{items.length}
          </div>
        </>
      )}
    </div>
  )
})

export default function LojaPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { logado, cliente, carregando: authCarregando } = useAuth()
  const [loja, setLoja] = useState(() => getCachedData(`/lojas/slug/${slug}`) || null)
  const [produtos, setProdutos] = useState(() => {
    const cached = getCachedData(`/lojas/${slug}/produtos?pagina=1`)
    if (!cached) return { dados: [], total: 0 }
    const base = Array.isArray(cached?.dados) ? cached.dados : []
    return { dados: base, total: Number(cached?.total || base.length || 0) }
  })
  const [carregando, setCarregando] = useState(() => !getCachedData(`/lojas/slug/${slug}`))
  const [erro, setErro] = useState(null)
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  const [produtoDetalhe, setProdutoDetalhe] = useState(null)
  const [variacaoSel, setVariacaoSel] = useState(null)
  const [adicionaisSel, setAdicionaisSel] = useState([])
  const [qtdDetalhe, setQtdDetalhe] = useState(1)
  const [obsDetalhe, setObsDetalhe] = useState('')

  const [carrinho, setCarrinho] = useState({})
  const [etapa, setEtapa] = useState('cardapio')
  const [tipoEntrega, setTipoEntrega] = useState('ENTREGA')
  const [bairros, setBairros] = useState([])
  const [enderecoSel, setEnderecoSel] = useState(null)
  const [formPedido, setFormPedido] = useState({
    nome_cliente: '', telefone_cliente: '', endereco: '',
    bairro: '', complemento: '', referencia: '',
    forma_pagamento: 'PIX', observacao: '',
  })
  const [trocoPara, setTrocoPara] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [showSubmitOverlay, setShowSubmitOverlay] = useState(false)
  const [submitStage, setSubmitStage] = useState(0)
  const [pixData, setPixData] = useState(null)
  const [pixCarregando, setPixCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const [combos, setCombos] = useState([])
  const [promocoes, setPromocoes] = useState([])
  const [notaMedia, setNotaMedia] = useState({ media: 0, total: 0 })
  const [avaliacoes, setAvaliacoes] = useState([])
  const [showAvaliacoes, setShowAvaliacoes] = useState(false)
  const [agendado, setAgendado] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [pedidoCriado, setPedidoCriado] = useState(null)
  const [trackingProgress, setTrackingProgress] = useState(0.15)
  const [checkoutSheetOpen, setCheckoutSheetOpen] = useState(false)
  const [totalAnim, setTotalAnim] = useState(0)

  const [codigoCupom, setCodigoCupom] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState(null)
  const [cupomErro, setCupomErro] = useState('')
  const [cupomCarregando, setCupomCarregando] = useState(false)
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState([])
  const [cuponsDisponiveisCarregando, setCuponsDisponiveisCarregando] = useState(false)
  const [mostrarCuponsDisponiveis, setMostrarCuponsDisponiveis] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const restoredCartRef = useRef(false)
  const [pageVisible, setPageVisible] = useState(false)
  const cartButtonRef = useRef(null)

  function mostrarToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  const [produtosCarregando, setProdutosCarregando] = useState(
    () => !getCachedData(`/lojas/${slug}/produtos?pagina=1`)
  )
  const cartStorageKey = `cart:${slug}`
  const checkoutStorageKey = `checkout:${slug}`
  const checkoutPersistentKey = `checkout:persist:${slug}`

  useEffect(() => {
    if (!slug) return

    function dispararSecundarios(lojaId) {
      const produtosPromise = (async () => {
        try {
          const primeira = await api.lojas.produtos(slug, 1)
          const base = Array.isArray(primeira?.dados) ? primeira.dados : []
          const total = Number(primeira?.total || base.length || 0)
          let acumulado = [...base]
          let pagina = 2

          while (acumulado.length < total) {
            const prox = await api.lojas.produtos(slug, pagina)
            const dadosProx = Array.isArray(prox?.dados) ? prox.dados : []
            if (!dadosProx.length) break
            acumulado = [...acumulado, ...dadosProx]
            pagina += 1
          }

          setProdutos({ dados: acumulado, total: acumulado.length || total })
        } catch {
          setProdutos({ dados: [], total: 0 })
        } finally {
          setProdutosCarregando(false)
        }
      })()

      const secundariosPromise = Promise.allSettled([
        api.lojas.bairros(lojaId),
        api.combos.listarPorLoja(lojaId),
        api.promocoes.listarPorLoja(lojaId),
        api.avaliacoes.mediaPorLoja(lojaId),
        api.avaliacoes.listarPorLoja(lojaId),
      ]).then(([bairrosRes, combosRes, promocoesRes, notaRes, avaliacoesRes]) => {
        if (bairrosRes.status === 'fulfilled') setBairros(bairrosRes.value)
        if (combosRes.status === 'fulfilled') setCombos(combosRes.value)
        if (promocoesRes.status === 'fulfilled') setPromocoes(Array.isArray(promocoesRes.value) ? promocoesRes.value : [])
        if (notaRes.status === 'fulfilled') setNotaMedia(notaRes.value)
        if (avaliacoesRes.status === 'fulfilled') setAvaliacoes(avaliacoesRes.value?.dados || [])
      })

      setCuponsDisponiveisCarregando(true)
      api.cupons.listarDisponiveis(lojaId)
        .then((r) => setCuponsDisponiveis(Array.isArray(r) ? r : []))
        .catch(() => setCuponsDisponiveis([]))
        .finally(() => setCuponsDisponiveisCarregando(false))

      Promise.all([produtosPromise, secundariosPromise]).catch(() => { })
    }

    // Se a loja já está em cache (prefetch rodou), dispara secundários imediatamente
    const lojaCache = getCachedData(`/lojas/slug/${slug}`)
    if (lojaCache?.id) {
      dispararSecundarios(lojaCache.id)
    }

    // Sempre atualiza em background (pode ter mudado desde o prefetch)
    api.lojas.buscarPorSlug(slug)
      .then((lojaData) => {
        setLoja(lojaData)
        setCarregando(false)
        if (lojaData?.id && !lojaCache?.id) {
          dispararSecundarios(lojaData.id)
        } else if (!lojaData?.id) {
          setProdutosCarregando(false)
        }
      })
      .catch((e) => { setErro(e.message); setCarregando(false); setProdutosCarregando(false) })
  }, [slug])

  useEffect(() => {
    const modo = String(loja?.modo_atendimento || 'AMBOS')
    const entregaDisponivel = modo === 'ENTREGA' || modo === 'AMBOS'
    const retiradaDisponivel = modo === 'BALCAO' || modo === 'AMBOS'

    if (tipoEntrega === 'ENTREGA' && !entregaDisponivel && retiradaDisponivel) {
      setTipoEntrega('RETIRADA')
      return
    }
    if (tipoEntrega === 'RETIRADA' && !retiradaDisponivel && entregaDisponivel) {
      setTipoEntrega('ENTREGA')
    }
  }, [loja?.modo_atendimento, tipoEntrega])

  useEffect(() => {
    if (restoredCartRef.current) return
    if (produtosCarregando) return
    const snapshot = getLocalItem(cartStorageKey, [])
    const restored = restaurarCarrinho(snapshot, produtos.dados, combos)
    if (Object.keys(restored).length > 0) setCarrinho(restored)

    const checkout = getLocalItem(
      checkoutPersistentKey,
      getSessionItem(checkoutStorageKey, null)
    )
    if (checkout && typeof checkout === 'object') {
      if (checkout.etapa) setEtapa(checkout.etapa)
      if (checkout.tipoEntrega) setTipoEntrega(checkout.tipoEntrega)
      if (checkout.formPedido) setFormPedido((prev) => ({ ...prev, ...checkout.formPedido }))
      if (checkout.enderecoSel) setEnderecoSel(checkout.enderecoSel)
    }
    restoredCartRef.current = true
  }, [produtosCarregando, produtos.dados, combos, cartStorageKey, checkoutStorageKey, checkoutPersistentKey])

  useEffect(() => {
    if (!slug) return
    setLocalItem(cartStorageKey, serializarCarrinho(carrinho))
  }, [carrinho, cartStorageKey, slug])

  useEffect(() => {
    if (!slug) return
    const checkoutDraft = {
      etapa,
      tipoEntrega,
      formPedido,
      enderecoSel,
    }
    // Mantém em session e local para persistir mesmo após fechar o app.
    setSessionItem(checkoutStorageKey, checkoutDraft)
    setLocalItem(checkoutPersistentKey, checkoutDraft)
  }, [checkoutStorageKey, checkoutPersistentKey, etapa, tipoEntrega, formPedido, enderecoSel, slug])

  useEffect(() => {
    const cleanup = setupAutoSync((draft) => api.pedidos.criar(draft))
    return cleanup
  }, [])

  useEffect(() => {
    setPageVisible(false)
    const raf = requestAnimationFrame(() => setPageVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [slug])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [slug, etapa, categoriaSel, produtoDetalhe?.id])

  const pageTransitionClass = pageVisible
    ? 'opacity-100'
    : 'opacity-0'

  useEffect(() => {
    if (etapa !== 'checkout') return undefined
    setCheckoutSheetOpen(false)
    const raf = requestAnimationFrame(() => setCheckoutSheetOpen(true))
    return () => cancelAnimationFrame(raf)
  }, [etapa])

  useEffect(() => {
    if (!showSubmitOverlay) return undefined
    setSubmitStage(0)
    const t = setTimeout(() => setSubmitStage(1), 900)
    return () => clearTimeout(t)
  }, [showSubmitOverlay])

  useEffect(() => {
    if (etapa !== 'confirmado') return undefined
    const timer = setInterval(() => {
      setTrackingProgress((prev) => {
        const next = prev + 0.02
        return next > 0.94 ? 0.2 : next
      })
    }, 120)
    return () => clearInterval(timer)
  }, [etapa])

  function runFlyToCart(sourceEl, imageUrl = '') {
    const targetEl = cartButtonRef.current
    if (!sourceEl || !targetEl) return
    const source = sourceEl.getBoundingClientRect()
    const target = targetEl.getBoundingClientRect()
    const dot = document.createElement('div')
    dot.style.position = 'fixed'
    dot.style.left = `${source.left + source.width / 2 - 18}px`
    dot.style.top = `${source.top + source.height / 2 - 18}px`
    dot.style.width = '36px'
    dot.style.height = '36px'
    dot.style.borderRadius = '9999px'
    dot.style.zIndex = '120'
    dot.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
    dot.style.transition = 'transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 560ms ease'
    dot.style.background = imageUrl ? `center / cover no-repeat url("${imageUrl}")` : 'linear-gradient(135deg,#ef4444,#f59e0b)'
    dot.style.pointerEvents = 'none'
    document.body.appendChild(dot)

    const dx = target.left + target.width / 2 - (source.left + source.width / 2)
    const dy = target.top + target.height / 2 - (source.top + source.height / 2)
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${dx}px, ${dy}px) scale(0.22)`
      dot.style.opacity = '0.25'
      targetEl.classList.add('animate-bounce')
      setTimeout(() => targetEl.classList.remove('animate-bounce'), 360)
    })
    setTimeout(() => dot.remove(), 620)
  }

  // ---- Carrinho ----
  const addItemDireto = useCallback((produto) => {
    setProdutoDetalhe(produto)
    setVariacaoSel(produto.variacoes?.[0]?.id || null)
    setAdicionaisSel([])
    setQtdDetalhe(1)
    setObsDetalhe('')
  }, [])

  function addItemConfigurado(e) {
    const p = produtoDetalhe
    const variacao = p.variacoes?.find((v) => v.id === variacaoSel) || null
    const adds = p.adicionais?.filter((a) => adicionaisSel.includes(a.id)) || []
    const precoBase = variacao ? Number(variacao.preco) : Number(p.preco)
    const precoAdds = adds.reduce((s, a) => s + Number(a.preco), 0)
    const precoUnit = precoBase + precoAdds

    const chave = gerarChaveCarrinho(p.id, variacao?.id, adicionaisSel)
    setCarrinho((prev) => ({
      ...prev,
      [chave]: {
        produto: p, variacao, adicionais: adds, precoUnit,
        obs: obsDetalhe || '',
        qtd: (prev[chave]?.qtd || 0) + qtdDetalhe,
      },
    }))
    mostrarToast(`${qtdDetalhe}x ${p.nome} adicionado`)
    runFlyToCart(e?.currentTarget, p.imagem_url)
    setProdutoDetalhe(null)
    setQtdDetalhe(1)
    setObsDetalhe('')
  }

  function removeItem(chave) {
    setCarrinho((prev) => {
      const cur = prev[chave]
      if (!cur) return prev
      if (cur.qtd <= 1) { const next = { ...prev }; delete next[chave]; return next }
      return { ...prev, [chave]: { ...cur, qtd: cur.qtd - 1 } }
    })
  }

  function addItemByKey(chave) {
    setCarrinho((prev) => {
      const cur = prev[chave]
      if (!cur) return prev
      return { ...prev, [chave]: { ...cur, qtd: cur.qtd + 1 } }
    })
  }

  function removeItemCompletely(chave) {
    setCarrinho((prev) => {
      if (!prev[chave]) return prev
      const next = { ...prev }
      delete next[chave]
      return next
    })
  }

  const itensCarrinho = Object.entries(carrinho)
  const totalItens = itensCarrinho.reduce((s, [, i]) => s + i.qtd, 0)
  const subtotal = itensCarrinho.reduce((s, [, i]) => s + i.precoUnit * i.qtd, 0)
  const enderecoPadraoCliente = useMemo(() => {
    const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : []
    if (!enderecos.length) return null
    return enderecos.find((e) => e.padrao) || enderecos[0]
  }, [cliente?.enderecos])
  const bairroPadraoCliente = String(enderecoPadraoCliente?.bairro || '').trim()
  const bairroPadraoLojaMatch = useMemo(() => {
    const alvo = normalizeText(bairroPadraoCliente)
    if (!alvo || !Array.isArray(bairros) || bairros.length === 0) return null
    return bairros.find((b) => normalizeText(b?.nome) === alvo) || null
  }, [bairroPadraoCliente, bairros])

  const bairroSel2 = bairros.find((b) => b.nome === formPedido.bairro)
  const taxaPadraoLoja = loja ? Number(loja.taxa_entrega || 0) : 0
  const taxaEntrega = tipoEntrega === 'RETIRADA' ? 0 : (bairroSel2 ? Number(bairroSel2.taxa) : taxaPadraoLoja)
  const descontoCupom = cupomAplicado ? cupomAplicado.desconto : 0
  const totalPedido = Math.max(0, subtotal - descontoCupom + taxaEntrega)

  useEffect(() => {
    let raf = null
    const start = performance.now()
    const from = Number.isFinite(totalAnim) ? totalAnim : 0
    const to = Number(totalPedido || 0)
    const duration = 260
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setTotalAnim(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [totalPedido])

  async function handleAplicarCupom() {
    if (!codigoCupom.trim()) return
    setCupomErro('')
    setCupomCarregando(true)
    try {
      const res = await api.cupons.aplicar({ loja_id: loja.id, codigo_cupom: codigoCupom.trim(), subtotal })
      setCupomAplicado(res)
    } catch (err) {
      setCupomErro(err.message)
      setCupomAplicado(null)
    } finally { setCupomCarregando(false) }
  }

  function handleRemoverCupom() {
    setCupomAplicado(null)
    setCodigoCupom('')
    setCupomErro('')
  }

  function formatarValidadeCupom(dataFim) {
    if (!dataFim) return 'sem validade definida'
    const d = new Date(dataFim)
    if (Number.isNaN(d.getTime())) return 'sem validade definida'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  function irParaCheckout() {
    if (!logado) { navigate(`/login?voltar=${encodeURIComponent(`/loja/${slug}`)}`); return }
    if (!aceitaEntrega && aceitaRetirada) setTipoEntrega('RETIRADA')
    if (!aceitaRetirada && aceitaEntrega) setTipoEntrega('ENTREGA')
    const enderecos = cliente?.enderecos || []

    if (tipoEntrega === 'ENTREGA') {
      if (enderecos.length === 0) {
        alert('Cadastre um endereço antes de finalizar o pedido.')
        navigate('/perfil')
        return
      }
      const enderecoPadrao = enderecos.find((e) => e.padrao) || enderecos[0]
      setFormPedido((prev) => ({
        ...prev,
        nome_cliente: cliente?.nome || prev.nome_cliente,
        telefone_cliente: cliente?.telefone || prev.telefone_cliente,
        endereco: `${enderecoPadrao.rua}, ${enderecoPadrao.numero}`,
        bairro: enderecoPadrao.bairro,
        complemento: enderecoPadrao.complemento || '',
        referencia: enderecoPadrao.referencia || '',
      }))
      setEnderecoSel(enderecoPadrao)
    } else {
      setFormPedido((prev) => ({
        ...prev,
        nome_cliente: cliente?.nome || prev.nome_cliente,
        telefone_cliente: cliente?.telefone || prev.telefone_cliente,
        endereco: '',
        bairro: '',
        complemento: '',
        referencia: '',
      }))
      setEnderecoSel(null)
    }
    setEtapa('checkout')
  }

  function selecionarEndereco(end) {
    setEnderecoSel(end)
    setFormPedido((prev) => ({
      ...prev,
      endereco: `${end.rua}, ${end.numero}`,
      bairro: end.bairro,
      complemento: end.complemento || '',
      referencia: end.referencia || '',
    }))
  }

  const addComboAoCarrinho = useCallback((combo, sourceEl) => {
    const chave = `combo__${combo.id}`
    setCarrinho((prev) => ({
      ...prev,
      [chave]: {
        produto: { id: combo.id, nome: combo.nome, preco: combo.preco, imagem_url: combo.imagem_url },
        variacao: null, adicionais: [],
        precoUnit: Number(combo.preco),
        obs: combo.itens.map(i => `${i.quantidade}x ${i.produto?.nome}`).join(', '),
        qtd: (prev[chave]?.qtd || 0) + 1,
        isCombo: true,
        comboItens: combo.itens,
      },
    }))
    mostrarToast(`1x ${combo.nome} adicionado`)
    runFlyToCart(sourceEl, combo.imagem_url)
  }, [])

  function qtdProduto(produtoId) {
    return itensCarrinho.filter(([, i]) => i.produto.id === produtoId).reduce((s, [, i]) => s + i.qtd, 0)
  }

  function handleFormChange(e) { setFormPedido((prev) => ({ ...prev, [e.target.name]: e.target.value })) }

  async function handleCriarPedido(e) {
    e.preventDefault()
    setShowSubmitOverlay(true)
    setSubmitStage(0)
    setEnviando(true)
    const pagamentoPixOnline = formPedido._tipoPag === 'online' && formPedido.forma_pagamento === 'PIX'
    const payloadPedido = {
      loja_id: loja.id,
      tipo_entrega: tipoEntrega,
      nome_cliente: formPedido.nome_cliente,
      telefone_cliente: formPedido.telefone_cliente,
      endereco: formPedido.endereco,
      bairro: formPedido.bairro,
      complemento: formPedido.complemento,
      referencia: formPedido.referencia,
      taxa_entrega: taxaEntrega,
      forma_pagamento: formPedido.forma_pagamento,
      codigo_cupom: cupomAplicado ? codigoCupom.trim() : '',
      agendado_para: agendado && agendadoPara ? new Date(agendadoPara).toISOString() : null,
      observacao: [
        formPedido.observacao,
        pagamentoPixOnline ? AVISO_PIX_ONLINE : '',
        formPedido.forma_pagamento === 'CASH' && trocoPara ? `Troco para R$ ${Number(trocoPara).toFixed(2).replace('.', ',')}` : '',
        agendado && agendadoPara ? `Agendado para ${new Date(agendadoPara).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',
        ...itensCarrinho.filter(([, i]) => i.obs).map(([, i]) => `${i.produto.nome}: ${i.obs}`),
      ].filter(Boolean).join(' | '),
      itens: itensCarrinho.flatMap(([, i]) => {
        if (i.isCombo && i.comboItens) {
          return i.comboItens.map(ci => ({
            produto_id: ci.produto_id,
            quantidade: ci.quantidade * i.qtd,
            variacao_id: undefined,
            adicionais_ids: [],
          }))
        }
        return [{
          produto_id: i.produto.id,
          quantidade: i.qtd,
          variacao_id: i.variacao?.id || undefined,
          adicionais_ids: i.adicionais?.map((a) => a.id) || [],
        }]
      }),
    }

    try {
      const pedido = await api.pedidos.criar(payloadPedido)
      setSubmitStage(2)
      await new Promise((resolve) => setTimeout(resolve, 420))
      setPedidoCriado(pedido)
      addLocalOrderHistory(pedido).catch(() => { })
      const pagarOnline = pagamentoPixOnline && loja.pix_chave
      if (pagarOnline) {
        setEtapa('pix')
        setPixCarregando(true)
        try { setPixData(await api.lojas.gerarPix(loja.id, totalPedido, pedido.id)) }
        catch { setPixData(null) }
        finally { setPixCarregando(false) }
      } else {
        setEtapa('confirmado')
        setCarrinho({})
        setCupomAplicado(null)
        setCodigoCupom('')
        removeLocalItem(cartStorageKey)
        removeSessionItem(checkoutStorageKey)
        removeLocalItem(checkoutPersistentKey)
      }
    } catch (err) {
      if (!navigator.onLine) {
        await enqueuePendingOrder(payloadPedido)
        alert('Sem internet no momento. Seu pedido foi salvo e será reenviado automaticamente quando a conexão voltar.')
      } else {
        alert(err.message)
      }
    }
    finally {
      setEnviando(false)
      setTimeout(() => setShowSubmitOverlay(false), 220)
    }
  }

  function handleFinalizarPix() {
    setEtapa('confirmado')
    setCarrinho({})
    setPixData(null)
    setCupomAplicado(null)
    setCodigoCupom('')
    removeLocalItem(cartStorageKey)
    removeSessionItem(checkoutStorageKey)
    removeLocalItem(checkoutPersistentKey)
  }

  async function copiarPayload() {
    if (!pixData?.payload) return
    await navigator.clipboard.writeText(pixData.payload)
    setCopiado(true); setTimeout(() => setCopiado(false), 2500)
  }

  // ---- Loading/Error ----
  if (carregando) return (
    <div className={`max-w-lg mx-auto px-4 pt-4 transition-all duration-300 ease-out ${pageTransitionClass}`}>
      <div className="skeleton h-40 rounded-2xl mb-4" />
      <div className="flex items-center gap-3 mb-5">
        <div className="skeleton w-14 h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 rounded w-2/3" />
          <div className="skeleton h-3 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-8 rounded-full flex-1" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 rounded w-3/4" />
            <div className="skeleton h-3 rounded w-full" />
            <div className="skeleton h-4 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
  if (erro || !loja) return <div className={`flex flex-col items-center justify-center py-20 gap-4 transition-all duration-300 ease-out ${pageTransitionClass}`}><p className="text-red-500 text-sm">{erro || 'Loja não encontrada.'}</p><Link to="/" className="text-red-600 hover:underline text-sm">Voltar</Link></div>

  const aberta = loja.aberta_agora ?? loja.aberta
  const modoAtendimento = String(loja.modo_atendimento || 'AMBOS')
  const aceitaEntrega = modoAtendimento === 'ENTREGA' || modoAtendimento === 'AMBOS'
  const aceitaRetirada = modoAtendimento === 'BALCAO' || modoAtendimento === 'AMBOS'
  const taxa = bairroPadraoLojaMatch ? Number(bairroPadraoLojaMatch.taxa || 0) : Number(loja.taxa_entrega || 0)
  const numeroPedidoCurto = pedidoCriado?.id?.slice(-6).toUpperCase() || ''
  const telefoneLojaWhatsapp = normalizarTelefoneWhatsapp(loja?.telefone)
  const textoComprovante = encodeURIComponent(
    `Olá, ${loja?.nome || 'loja'}! Acabei de pagar via PIX. Segue o comprovante do pedido #${numeroPedidoCurto}.`
  )
  const linkComprovanteWhatsapp = telefoneLojaWhatsapp
    ? `https://wa.me/${telefoneLojaWhatsapp}?text=${textoComprovante}`
    : ''
  const devePedirComprovantePix = formPedido.forma_pagamento === 'PIX' && formPedido._tipoPag === 'online'

  // ---- Confirmado ----
  if (etapa === 'confirmado') {
    const PAGAMENTO_LABELS = { PIX: 'PIX', CREDIT: 'Cartão de Crédito', DEBIT: 'Cartão de Débito', CASH: 'Dinheiro' }
    return (
      <div className={`max-w-lg mx-auto px-4 py-8 transition-all duration-300 ease-out ${pageTransitionClass}`}>
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce-slow">
              <FiCheck className="text-green-600 text-3xl" />
            </div>
            <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow">
              <span className="text-white text-xs">🎉</span>
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-stone-900">Pedido confirmado!</h2>
          <p className="text-stone-500 text-sm mt-1">
            {tipoEntrega === 'RETIRADA'
              ? 'Retire seu pedido no balcão da loja.'
              : pedidoCriado?.agendado_para
                ? `Agendado para ${new Date(pedidoCriado.agendado_para).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                : 'Acompanhe o status em "Meus Pedidos"'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
          <p className="text-xs font-semibold text-stone-700 mb-2">Acompanhamento do pedido</p>
          <div className="relative h-2 rounded-full bg-stone-200 overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-linear-to-r from-amber-400 to-red-500 transition-[width] duration-150" style={{ width: `${Math.round(trackingProgress * 100)}%` }} />
            <FiTruck
              className="absolute -top-2 text-red-600 text-base transition-[left] duration-150"
              style={{ left: `calc(${Math.round(trackingProgress * 100)}% - 8px)` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-stone-500">
            <span className="text-center">Recebido</span>
            <span className="text-center">Preparando</span>
            <span className="text-center">A caminho</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm mb-4">
          <div className="flex items-center gap-3 p-4 bg-stone-50 border-b border-stone-100">
            {loja.logo_url && <img src={loja.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
            <div>
              <p className="font-bold text-stone-900 text-sm">{loja.nome}</p>
              <p className="text-[11px] text-stone-400">Pedido #{pedidoCriado?.id?.slice(-6).toUpperCase() || '...'}</p>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {pedidoCriado?.itens?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-stone-600">{item.quantidade}x {item.produto?.nome || 'Item'}</span>
                <span className="font-medium text-stone-800">R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2).replace('.', ',')}</span>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4 space-y-1.5">
            <div className="flex justify-between text-xs text-stone-400 pt-2 border-t border-stone-100">
              <span>Subtotal</span>
              <span>R$ {Number(pedidoCriado?.subtotal || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            {Number(pedidoCriado?.taxa_entrega || 0) > 0 && (
              <div className="flex justify-between text-xs text-stone-400">
                <span>Entrega</span>
                <span>R$ {Number(pedidoCriado.taxa_entrega).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {Number(pedidoCriado?.desconto || 0) > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Desconto</span>
                <span>- R$ {Number(pedidoCriado.desconto).toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-100">
              <span>Total</span>
              <span className="text-red-700">R$ {Number(pedidoCriado?.total || 0).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-stone-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Entrega</p>
            <p className="text-sm font-semibold text-stone-800 mt-0.5">{tipoEntrega === 'RETIRADA' ? 'Retirada' : 'Delivery'}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Pagamento</p>
            <p className="text-sm font-semibold text-stone-800 mt-0.5">{PAGAMENTO_LABELS[formPedido.forma_pagamento] || formPedido.forma_pagamento}</p>
          </div>
        </div>

        {loja.tempo_entrega && tipoEntrega !== 'RETIRADA' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 mb-6">
            <FiClock className="text-red-600 text-lg shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Tempo estimado: {loja.tempo_entrega}</p>
              <p className="text-[11px] text-red-600">Fique de olho nos status do seu pedido</p>
            </div>
          </div>
        )}

        {devePedirComprovantePix && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800">
              Para agilizar a confirmação, envie o comprovante do PIX para a loja.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {linkComprovanteWhatsapp && (
                <a
                  href={linkComprovanteWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-2.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  Enviar no WhatsApp da loja
                </a>
              )}
              <Link
                to="/pedidos"
                className="inline-flex items-center justify-center w-full py-2.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
              >
                Enviar dentro do sistema (chat)
              </Link>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/pedidos" className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl text-center hover:bg-red-700 text-sm">Acompanhar pedido</Link>
          <Link to="/" className="flex-1 py-3 border-2 border-stone-200 text-stone-700 font-semibold rounded-xl text-center hover:bg-stone-50 text-sm">Voltar ao início</Link>
        </div>
      </div>
    )
  }

  // ---- PIX ----
  if (etapa === 'pix') {
    return (
      <div className={`max-w-lg mx-auto px-4 py-6 transition-all duration-300 ease-out ${pageTransitionClass}`}>
        <button onClick={handleFinalizarPix} className="flex items-center gap-1 text-stone-500 hover:text-stone-900 text-sm mb-6"><FiChevronLeft /> Pular pagamento online</button>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Pagar com PIX</h2>
          <p className="text-stone-500 text-sm mb-4">Escaneie o QR Code ou copie o código</p>
          <div className="bg-red-50 rounded-xl px-4 py-2 mb-4 inline-block"><span className="text-2xl font-bold text-red-700 font-numeric">R$ {totalPedido.toFixed(2).replace('.', ',')}</span></div>
          {pixCarregando ? (
            <div className="py-12"><div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-stone-400 text-sm mt-3">Gerando QR Code...</p></div>
          ) : pixData ? (
            <>
              <div className="flex justify-center mb-4"><img src={pixData.qrcode} alt="QR Code PIX" className="w-56 h-56 rounded-xl" /></div>
              <p className="text-xs text-stone-400 mb-3">Titular: <strong className="text-stone-600">{pixData.nome_titular}</strong></p>
              <div className="bg-stone-50 rounded-lg p-3 mb-4"><p className="text-[10px] text-stone-400 mb-1 uppercase tracking-wider font-medium">PIX Copia e Cola</p><p className="text-xs text-stone-600 font-mono break-all leading-relaxed">{pixData.payload.substring(0, 80)}...</p></div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs font-semibold text-amber-800">
                  Após pagar, envie o comprovante para a loja para agilizar a confirmação.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {linkComprovanteWhatsapp && (
                    <a
                      href={linkComprovanteWhatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full py-2.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
                    >
                      Enviar no WhatsApp da loja
                    </a>
                  )}
                  <Link
                    to="/pedidos"
                    className="inline-flex items-center justify-center w-full py-2.5 bg-white border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Enviar dentro do sistema (chat)
                  </Link>
                </div>
                <p className="text-[11px] text-amber-700 mt-1.5">
                  Você pode escolher qualquer uma das opções acima.
                </p>
              </div>
              <button onClick={copiarPayload} className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 text-sm">{copiado ? <><FiCheck /> Copiado!</> : <><FiCopy /> Copiar código PIX</>}</button>
              <button onClick={handleFinalizarPix} className="w-full mt-3 py-2.5 text-green-700 bg-green-50 font-medium rounded-xl hover:bg-green-100 text-sm">Já paguei</button>
            </>
          ) : (
            <div className="py-8"><p className="text-stone-400 text-sm">Não foi possível gerar o QR Code.</p><button onClick={handleFinalizarPix} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Continuar</button></div>
          )}
        </div>
      </div>
    )
  }

  // ---- Checkout ----
  if (etapa === 'checkout') {
    const enderecosCliente = cliente?.enderecos || []
    const [tipoPagamento, setTipoPagamento] = [formPedido._tipoPag || '', (v) => setFormPedido((p) => ({ ...p, _tipoPag: v }))]

    function escolherTipoPag(tipo) {
      setTipoPagamento(tipo)
      if (tipo === 'online') {
        setFormPedido((p) => ({ ...p, forma_pagamento: 'PIX', _tipoPag: 'online' }))
      } else {
        setFormPedido((p) => ({ ...p, forma_pagamento: '', _tipoPag: 'entrega' }))
      }
    }

    const checkoutPodeEnviar = !(
      enviando ||
      totalItens === 0 ||
      (tipoEntrega === 'ENTREGA' && !enderecoSel) ||
      !formPedido.forma_pagamento ||
      (agendado && !agendadoPara) ||
      (Number(loja.pedido_minimo || 0) > 0 && subtotal < Number(loja.pedido_minimo))
    )

    const labelBotaoCheckout = enviando
      ? 'Enviando...'
      : agendado
        ? `Agendar pedido — R$ ${totalPedido.toFixed(2).replace('.', ',')}`
        : `Enviar pedido — R$ ${totalPedido.toFixed(2).replace('.', ',')}`

    return (
      <div className="fixed inset-0 z-110">
        <button
          type="button"
          onClick={() => setEtapa('cardapio')}
          className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${checkoutSheetOpen ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Fechar carrinho"
        />
        <div className={`absolute inset-x-0 bottom-0 bg-stone-50 rounded-t-3xl max-h-[92vh] overflow-y-auto transition-transform duration-300 ease-out ${checkoutSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className={`max-w-lg mx-auto px-4 py-2 pb-32 transition-all duration-300 ease-out ${pageTransitionClass}`}>
            <button onClick={() => setEtapa('cardapio')} className="flex items-center gap-1 text-stone-500 hover:text-stone-900 text-sm mb-3"><FiChevronLeft /> Voltar</button>
            <h2 className="text-2xl font-extrabold text-red-700 mb-1">ticket</h2>
            <p className="text-sm text-stone-500 mb-4">Confira os itens e escolha como deseja pagar.</p>
            <button
              type="button"
              onClick={() => setEtapa('cardapio')}
              className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50"
            >
              <FiPlus size={14} />
              Adicionar mais itens
            </button>

            {/* Resumo itens */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2">Resumo</h3>
              {itensCarrinho.map(([chave, i]) => (
                <div key={chave} className="py-1.5 border-b border-stone-50 last:border-0">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      {i.isCombo && <span className="text-[9px] font-bold bg-amber-100 text-red-700 px-1 py-0.5 rounded">COMBO</span>}
                      <span className="text-stone-600">{i.qtd}x {i.produto.nome}</span>
                    </div>
                    <span className="text-stone-900 font-medium font-numeric">R$ {(i.precoUnit * i.qtd).toFixed(2).replace('.', ',')}</span>
                  </div>
                  {i.isCombo && i.comboItens && <p className="text-[10px] text-stone-400 ml-4">{i.comboItens.map(ci => `${ci.quantidade}x ${ci.produto?.nome}`).join(', ')}</p>}
                  {i.variacao && <p className="text-[10px] text-stone-400 ml-4">Tamanho: {i.variacao.nome}</p>}
                  {i.adicionais?.length > 0 && <p className="text-[10px] text-stone-400 ml-4">+ {i.adicionais.map((a) => a.nome).join(', ')}</p>}
                  {!i.isCombo && i.obs && <p className="text-[10px] text-stone-400 ml-4 italic">Obs: {i.obs}</p>}
                  <div className="ml-4 mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeItem(chave)}
                      className="w-7 h-7 rounded-full border border-stone-300 text-stone-700 inline-flex items-center justify-center hover:bg-stone-100"
                    >
                      <FiMinus size={12} />
                    </button>
                    <span className="text-xs font-semibold text-stone-700 min-w-4 text-center">{i.qtd}</span>
                    <button
                      type="button"
                      onClick={() => addItemByKey(chave)}
                      className="w-7 h-7 rounded-full border border-stone-300 text-stone-700 inline-flex items-center justify-center hover:bg-stone-100"
                    >
                      <FiPlus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItemCompletely(chave)}
                      className="ml-1 text-[11px] font-semibold text-red-600 hover:text-red-700"
                    >
                      Remover item
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-medium font-numeric">R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-stone-500">{tipoEntrega === 'RETIRADA' ? 'Retirada no balcão' : `Entrega ${formPedido.bairro ? `(${formPedido.bairro})` : ''}`}</span>
                <span className="font-medium font-numeric">{tipoEntrega === 'RETIRADA' ? 'Grátis' : (taxaEntrega > 0 ? `R$ ${taxaEntrega.toFixed(2).replace('.', ',')}` : 'Grátis')}</span>
              </div>
              {descontoCupom > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-green-600">Desconto (cupom)</span>
                  <span className="font-medium text-green-600 font-numeric">- R$ {descontoCupom.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-stone-100"><span>Total</span><span className="text-red-700 transition-all duration-200 font-numeric">R$ {Number(totalAnim || totalPedido).toFixed(2).replace('.', ',')}</span></div>
            </div>

            {/* Tipo de entrega */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mb-4">
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1"><FiTruck className="text-red-600" /> Entrega</h3>
              {aceitaEntrega && aceitaRetirada ? (
                <div className="bg-stone-100 rounded-full p-1 grid grid-cols-2 gap-1">
                  <button type="button" onClick={() => { setTipoEntrega('ENTREGA'); if (!enderecoSel) { const ends = cliente?.enderecos || []; if (ends.length) { const ep = ends.find(e => e.padrao) || ends[0]; selecionarEndereco(ep) } } }} className={`flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors ${tipoEntrega === 'ENTREGA' ? 'bg-red-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-800'}`}>
                    <FiTruck className="text-base" />
                    <span>entrega</span>
                  </button>
                  <button type="button" onClick={() => setTipoEntrega('RETIRADA')} className={`flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-colors ${tipoEntrega === 'RETIRADA' ? 'bg-red-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-800'}`}>
                    <FiShoppingBag className="text-base" />
                    <span>retirada</span>
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-amber-800">
                    {aceitaEntrega
                      ? 'Esta loja atende somente por entrega.'
                      : 'Esta loja atende somente retirada no balcão.'}
                  </p>
                </div>
              )}
              {aceitaEntrega && tipoEntrega !== 'RETIRADA' && (
                <p className="text-xs text-stone-500 mt-3">
                  entrega: {loja.tempo_entrega || '40-60 min'} {taxaEntrega > 0 ? ` • R$ ${taxaEntrega.toFixed(2).replace('.', ',')}` : ' • grátis'}
                </p>
              )}
            </div>

            {/* Cupom de desconto */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1"><FiTag className="text-red-600" /> Cupom de desconto</h3>
                <button
                  type="button"
                  onClick={() => setMostrarCuponsDisponiveis((v) => !v)}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                >
                  {mostrarCuponsDisponiveis ? 'Ocultar cupons' : 'Ver cupons disponíveis'}
                </button>
              </div>

              {mostrarCuponsDisponiveis && (
                <div className="mb-3 bg-red-50/50 border border-red-100 rounded-xl p-2.5 space-y-2">
                  {cuponsDisponiveisCarregando ? (
                    <p className="text-xs text-stone-500">Carregando cupons...</p>
                  ) : cuponsDisponiveis.length === 0 ? (
                    <p className="text-xs text-stone-500">Nenhum cupom disponível no momento.</p>
                  ) : (
                    cuponsDisponiveis.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCodigoCupom(c.codigo); setCupomErro('') }}
                        className="w-full text-left bg-white border border-red-100 rounded-lg p-2.5 hover:border-red-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-extrabold text-red-700 font-mono">{String(c.codigo || '').toUpperCase()}</p>
                          <span className="text-[10px] text-stone-400">válido até {formatarValidadeCupom(c.data_fim)}</span>
                        </div>
                        <p className="text-[11px] text-stone-700 mt-0.5">
                          {c.tipo_desconto === 'PERCENTAGE'
                            ? `${Number(c.valor_desconto || 0)}% de desconto`
                            : `R$ ${Number(c.valor_desconto || 0).toFixed(2).replace('.', ',')} de desconto`}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-stone-500">
                          <span className="px-1.5 py-0.5 rounded-full bg-stone-100">
                            mín. {c.valor_minimo !== null ? `R$ ${Number(c.valor_minimo).toFixed(2).replace('.', ',')}` : 'sem mínimo'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-stone-100">
                            limite geral {c.max_usos !== null ? `${c.usos_restantes} restante(s)` : 'ilimitado'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-stone-100">
                            por cliente {c.usos_por_cliente !== null ? `${c.usos_por_cliente} uso(s)` : 'ilimitado'}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {cupomAplicado ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-semibold text-green-800 font-mono">{codigoCupom.toUpperCase()}</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {cupomAplicado.tipo_desconto === 'PERCENTAGE'
                        ? `${cupomAplicado.valor_desconto}% de desconto`
                        : `R$ ${cupomAplicado.valor_desconto.toFixed(2).replace('.', ',')} de desconto`}
                      {' · '}Você economiza R$ {cupomAplicado.desconto.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <button onClick={handleRemoverCupom} className="text-red-600 hover:text-red-700 text-xs font-medium">Remover</button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codigoCupom}
                      onChange={(e) => { setCodigoCupom(e.target.value); setCupomErro('') }}
                      placeholder="Digite o código"
                      className="flex-1 px-3 py-2.5 border border-stone-300 rounded-lg text-sm uppercase font-mono placeholder:normal-case placeholder:font-sans focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={handleAplicarCupom}
                      disabled={cupomCarregando || !codigoCupom.trim()}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {cupomCarregando ? '...' : 'Aplicar'}
                    </button>
                  </div>
                  {cupomErro && <p className="text-red-500 text-xs mt-2">{cupomErro}</p>}
                </div>
              )}
            </div>

            {/* Endereço de entrega (apenas para ENTREGA) */}
            {tipoEntrega === 'ENTREGA' && (
              <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1"><FiMapPin className="text-red-600" /> endereço de entrega</h3>
                  <Link to="/perfil" className="text-[11px] text-emerald-600 font-semibold hover:underline">trocar</Link>
                </div>
                <div className="space-y-2">
                  {enderecosCliente.map((end) => {
                    const sel = enderecoSel?.id === end.id
                    return (
                      <button key={end.id} type="button" onClick={() => selecionarEndereco(end)} className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${sel ? 'border-red-500 bg-white' : 'border-amber-200 bg-white/80 hover:border-amber-300'}`}>
                        <div className="flex items-center gap-2">
                          {end.apelido && <span className="text-xs font-semibold text-stone-700">{end.apelido}</span>}
                          {end.padrao && <span className="text-[9px] bg-amber-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Padrão</span>}
                        </div>
                        <p className="text-sm text-stone-800 mt-0.5">{end.rua}, {end.numero}{end.complemento ? ` - ${end.complemento}` : ''}</p>
                        <p className="text-xs text-stone-400">{end.bairro}{end.referencia ? ` · ${end.referencia}` : ''}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {tipoEntrega === 'RETIRADA' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-800 flex items-start gap-2">
                <FiInfo className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Retirada no balcão</p>
                  <p className="text-xs text-amber-700 mt-0.5">Retire seu pedido diretamente na loja. Sem taxa de entrega.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCriarPedido} className="space-y-4">
              {/* Agendar pedido */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1"><FiCalendar className="text-red-600" /> Agendar para depois?</h3>
                  <button type="button" onClick={() => { setAgendado(!agendado); if (agendado) setAgendadoPara('') }} className={`relative w-11 h-6 rounded-full transition-colors ${agendado ? 'bg-red-500' : 'bg-stone-300'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${agendado ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {agendado && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={agendadoPara}
                      onChange={(e) => setAgendadoPara(e.target.value)}
                      min={formatDateTimeLocalValue(new Date(Date.now() + 30 * 60 * 1000))}
                      className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">Mínimo 30 min a partir de agora. A loja receberá o pedido como agendado.</p>
                  </div>
                )}
              </div>

              {/* Observação */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                <label className="block text-xs font-medium text-stone-600 mb-1">Observação</label>
                <textarea name="observacao" value={formPedido.observacao} onChange={handleFormChange} rows={2} placeholder="alguma observação? • opcional" className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none" />
              </div>

              {/* Pagamento */}
              {(() => {
                const formasAceitas = (loja.formas_pagamento || 'PIX,CREDIT,DEBIT,CASH').split(',').filter(Boolean)
                const aceitaPix = formasAceitas.includes('PIX')
                const formasPresenciais = [
                  { value: 'PIX', label: 'PIX' },
                  { value: 'CREDIT', label: 'Crédito' },
                  { value: 'DEBIT', label: 'Débito' },
                  { value: 'CASH', label: 'Dinheiro' },
                ].filter((o) => formasAceitas.includes(o.value))
                const temPixOnline = aceitaPix && loja.pix_chave

                return (
                  <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-red-700 mb-3">pagamento</h3>

                    {temPixOnline ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button type="button" onClick={() => escolherTipoPag('online')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoPagamento === 'online' ? 'border-red-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
                            <span className="text-sm font-semibold text-stone-900">Pagar online</span>
                            <span className="text-[10px] text-stone-400">PIX com QR Code</span>
                          </button>
                          <button type="button" onClick={() => escolherTipoPag('entrega')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoPagamento === 'entrega' ? 'border-red-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
                            <span className="text-sm font-semibold text-stone-900">{tipoEntrega === 'RETIRADA' ? 'Pagar na retirada' : 'Pagar na entrega'}</span>
                            <span className="text-[10px] text-stone-400">Presencial</span>
                          </button>
                        </div>
                        {tipoPagamento === 'online' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2">
                            <FiCheck className="text-amber-600 shrink-0" />
                            <span>Pagamento via <strong>PIX</strong> — você receberá o QR Code após confirmar.</span>
                          </div>
                        )}
                        {tipoPagamento === 'entrega' && formasPresenciais.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {formasPresenciais.map((opt) => (
                              <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-colors text-center ${formPedido.forma_pagamento === opt.value ? 'border-red-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
                                <input type="radio" name="forma_pagamento" value={opt.value} checked={formPedido.forma_pagamento === opt.value} onChange={handleFormChange} className="sr-only" />
                                <span className="text-sm font-semibold text-stone-900">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {formPedido.forma_pagamento === 'CASH' && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <label className="block text-xs font-medium text-amber-800 mb-1.5">Precisa de troco? Para quanto?</label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-600">R$</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={trocoPara}
                                onChange={(e) => setTrocoPara(e.target.value)}
                                placeholder="Ex: 100"
                                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                              />
                            </div>
                            {trocoPara && Number(trocoPara) > totalPedido && (
                              <p className="text-xs text-amber-800 mt-1.5 font-medium">
                                Troco: R$ {(Number(trocoPara) - totalPedido).toFixed(2).replace('.', ',')}
                              </p>
                            )}
                            {trocoPara && Number(trocoPara) > 0 && Number(trocoPara) <= totalPedido && (
                              <p className="text-xs text-amber-700 mt-1.5">Valor precisa ser maior que R$ {totalPedido.toFixed(2).replace('.', ',')}</p>
                            )}
                            {!trocoPara && (
                              <p className="text-[10px] text-amber-700 mt-1.5">Deixe vazio se não precisa de troco</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {formasPresenciais.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {formasPresenciais.map((opt) => (
                              <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-colors text-center ${formPedido.forma_pagamento === opt.value ? 'border-red-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
                                <input type="radio" name="forma_pagamento" value={opt.value} checked={formPedido.forma_pagamento === opt.value} onChange={handleFormChange} className="sr-only" />
                                <span className="text-sm font-semibold text-stone-900">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        {formPedido.forma_pagamento === 'CASH' && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <label className="block text-xs font-medium text-amber-800 mb-1.5">Precisa de troco? Para quanto?</label>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-600">R$</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={trocoPara}
                                onChange={(e) => setTrocoPara(e.target.value)}
                                placeholder="Ex: 100"
                                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                              />
                            </div>
                            {trocoPara && Number(trocoPara) > totalPedido && (
                              <p className="text-xs text-amber-800 mt-1.5 font-medium">
                                Troco: R$ {(Number(trocoPara) - totalPedido).toFixed(2).replace('.', ',')}
                              </p>
                            )}
                            {trocoPara && Number(trocoPara) > 0 && Number(trocoPara) <= totalPedido && (
                              <p className="text-xs text-amber-700 mt-1.5">Valor precisa ser maior que R$ {totalPedido.toFixed(2).replace('.', ',')}</p>
                            )}
                            {!trocoPara && (
                              <p className="text-[10px] text-amber-700 mt-1.5">Deixe vazio se não precisa de troco</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {Number(loja.pedido_minimo || 0) > 0 && subtotal < Number(loja.pedido_minimo) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium">Pedido mínimo: R$ {Number(loja.pedido_minimo).toFixed(2).replace('.', ',')} — adicione mais R$ {(Number(loja.pedido_minimo) - subtotal).toFixed(2).replace('.', ',')}.</p>
                </div>
              )}

              <div className="h-24" />
              <div className="sticky bottom-0 left-0 right-0 z-40 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                <div className="w-full max-w-lg mx-auto bg-white/95 backdrop-blur rounded-2xl border border-stone-200 shadow-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-stone-500">total</p>
                    <p className="text-2xl leading-none font-extrabold text-red-700 transition-all duration-200 font-numeric">R$ {Number(totalAnim || totalPedido).toFixed(2).replace('.', ',')}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={!checkoutPodeEnviar}
                    className="px-5 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition-all text-sm"
                  >
                    {labelBotaoCheckout}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ====== DETALHE DO PRODUTO ======
  if (produtoDetalhe) {
    const p = produtoDetalhe
    const temVariacoes = p.variacoes?.length > 0
    const temAdicionais = p.adicionais?.length > 0
    const varSel = p.variacoes?.find((v) => v.id === variacaoSel)
    const precoBase = varSel ? Number(varSel.preco) : Number(p.preco)
    const precoAdds = (p.adicionais || []).filter((a) => adicionaisSel.includes(a.id)).reduce((s, a) => s + Number(a.preco), 0)
    const precoUnitario = precoBase + precoAdds
    const precoTotal = precoUnitario * qtdDetalhe

    function toggleAdicional(id) {
      setAdicionaisSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }

    return (
      <div className={`relative max-w-lg mx-auto pb-32 transition-all duration-300 ease-out ${pageTransitionClass}`}>
        <button
          onClick={() => setProdutoDetalhe(null)}
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur border border-stone-200 text-stone-700 inline-flex items-center justify-center shadow"
          aria-label="Voltar para o cardápio"
        >
          <FiChevronLeft className="text-xl" />
        </button>

        {/* Imagem */}
        {p.imagem_url && (
          <div className="w-full h-64 bg-linear-to-b from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center">
            <img src={p.imagem_url} alt={p.nome} loading="lazy" className="w-full h-full object-contain" />
          </div>
        )}

        <div className="px-4 pt-3">
          <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">{p.nome}</h1>
        </div>

        {/* Descrição */}
        {p.descricao && (
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
            <p className="text-sm text-stone-600">{p.descricao}</p>
          </div>
        )}

        {/* Tamanhos */}
        {temVariacoes && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-base font-bold text-stone-900 mb-3">qual tamanho?</p>
            {p.variacoes.map((v) => {
              const sel = variacaoSel === v.id
              return (
                <button key={v.id} onClick={() => setVariacaoSel(v.id)} className="w-full flex items-center justify-between py-3.5 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${sel ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'}`}>
                      {sel && <FiCheck className="text-white text-[10px]" />}
                    </div>
                    <span className="text-sm text-stone-800">{v.nome}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 font-numeric">R$ {Number(v.preco).toFixed(2).replace('.', ',')}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Adicionais / Complementos */}
        {temAdicionais && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-base font-bold text-stone-900 mb-1">complementos</p>
            <p className="text-xs text-stone-400 mb-3">selecione os adicionais que desejar</p>
            {p.adicionais.map((a) => {
              const sel = adicionaisSel.includes(a.id)
              return (
                <div key={a.id} className="flex items-center justify-between py-3.5 border-b border-stone-100">
                  <span className="text-sm text-stone-800">{a.nome}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-600 font-numeric">R$ {Number(a.preco).toFixed(2).replace('.', ',')}</span>
                    <button onClick={() => toggleAdicional(a.id)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${sel ? 'bg-emerald-500 text-white' : 'border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-50'}`}>
                      {sel ? <FiCheck /> : <FiPlus />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quantidade */}
        <div className="px-4 pt-6 pb-4">
          <p className="text-base font-bold text-stone-900 mb-4">quantos?</p>
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-stone-500">valor unitário: <span className="font-bold text-stone-900 font-numeric">R$ {precoUnitario.toFixed(2).replace('.', ',')}</span></p>
            <div className="flex items-center gap-5">
              <button onClick={() => setQtdDetalhe((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full border-2 border-emerald-500 text-emerald-500 flex items-center justify-center hover:bg-emerald-50 transition-colors">
                <FiMinus />
              </button>
              <span className="text-2xl font-bold text-stone-900 w-8 text-center">{qtdDetalhe}</span>
              <button onClick={() => setQtdDetalhe((q) => q + 1)} className="w-10 h-10 rounded-full border-2 border-emerald-500 text-emerald-500 flex items-center justify-center hover:bg-emerald-50 transition-colors">
                <FiPlus />
              </button>
            </div>
          </div>
        </div>

        {/* Observação */}
        <div className="px-4 pb-6">
          <input
            type="text"
            value={obsDetalhe}
            onChange={(e) => setObsDetalhe(e.target.value)}
            placeholder="alguma observação?"
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {/* Botão fixo */}
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-3">
          <button
            onClick={addItemConfigurado}
            disabled={temVariacoes && !variacaoSel}
            className="w-full max-w-lg mx-auto block bg-red-600 text-white py-3.5 rounded-xl shadow-lg hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 transition-all font-semibold text-sm"
          >
            põe no ticket - R$ {precoTotal.toFixed(2).replace('.', ',')}
          </button>
        </div>
      </div>
    )
  }

  // ====== CARDÁPIO ======
  const produtosPorCategoria = {}
  produtos.dados.forEach((p) => {
    const cat = p.categoria || 'Outros'
    if (!produtosPorCategoria[cat]) produtosPorCategoria[cat] = []
    produtosPorCategoria[cat].push(p)
  })
  const categorias = Object.keys(produtosPorCategoria)
  const DIAS_SEMANA_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const DIAS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  let horariosSemana = []
  try { horariosSemana = JSON.parse(loja.horarios_semana || '[]') } catch { }
  const temSemana = Array.isArray(horariosSemana) && horariosSemana.length === 7
  const horarioHoje = temSemana ? horariosSemana[new Date().getDay()] : null
  const horaFecha = horarioHoje?.fechamento || loja.horario_fechamento || null

  const openingHoursSpec = temSemana
    ? horariosSemana.filter(h => h.aberto).map(h => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DIAS_EN[h.dia],
      opens: h.abertura,
      closes: h.fechamento,
    }))
    : loja.horario_abertura && loja.horario_fechamento
      ? { '@type': 'OpeningHoursSpecification', dayOfWeek: DIAS_EN, opens: loja.horario_abertura, closes: loja.horario_fechamento }
      : undefined

  const lojaJsonLd = loja ? {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: loja.nome,
    image: loja.logo_url || '',
    address: { '@type': 'PostalAddress', addressLocality: loja.cidade || '', streetAddress: loja.endereco || '' },
    url: `https://marketlajinha.com.br/loja/${loja.slug}`,
    servesCuisine: loja.categoria_negocio || '',
    openingHoursSpecification: openingHoursSpec,
  } : null

  return (
    <div className={`max-w-lg mx-auto pb-24 transition-all duration-300 ease-out ${pageTransitionClass}`}>
      {loja && (
        <SEO
          title={loja.nome}
          description={`Peça no ${loja.nome}. ${loja.categoria_negocio || 'Restaurante'} em ${loja.cidade || 'sua cidade'}. Cardápio completo com entrega.`}
          image={loja.logo_url}
          url={`https://marketlajinha.com.br/loja/${loja.slug}`}
          type="restaurant"
          jsonLd={lojaJsonLd}
        />
      )}
      <Link
        to="/"
        className="absolute left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 w-9 h-9 bg-white/90 backdrop-blur rounded-full border border-stone-200 flex items-center justify-center shadow text-stone-700 hover:bg-white"
        aria-label="Voltar para lojas"
      >
        <FiChevronLeft />
      </Link>

      {/* Banner */}
      <div className="relative w-full h-60 bg-stone-200 overflow-hidden">
        {String(loja.banner_url || '').trim() ? (
          <img
            src={loja.banner_url}
            alt=""
            className={`w-full h-full object-cover ${!aberta ? 'grayscale brightness-75' : ''}`}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className={`w-full h-full bg-black flex items-center justify-center ${!aberta ? 'brightness-75' : ''}`}>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-extrabold leading-none">
                <span className="text-red-500">Uai</span>
                <span className="text-yellow-400">Food</span>
              </span>
              <span className="text-stone-300 text-base font-medium mb-0.5">delivery</span>
            </div>
          </div>
        )}
        <div className="absolute bottom-4 right-4 w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white">
          <img src={loja.logo_url || ''} alt={loja.nome} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          <div className="w-full h-full items-center justify-center text-2xl font-bold text-white hidden" style={{ backgroundColor: loja.cor_primaria || '#78716c' }}>{loja.nome?.charAt(0)}</div>
        </div>
        {horaFecha && aberta && <span className="absolute bottom-5 right-32 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">fecha às {horaFecha}</span>}
        {!aberta && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><span className="bg-black/60 text-white text-sm font-bold px-4 py-2 rounded-full">Fechada</span></div>}
      </div>

      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">{loja.nome}</h1>
        <button onClick={() => setShowInfo(!showInfo)} className="flex items-center gap-1 text-xs text-stone-400 mt-1 hover:text-stone-600"><FiInfo className="text-[11px]" /> infos da loja <FiChevronRight className="text-[10px]" /></button>
        {showInfo && (
          <div className="mt-3 bg-stone-50 rounded-xl p-3 text-xs text-stone-500 space-y-1">
            <p><strong>Categoria:</strong> {loja.categoria_negocio}</p>
            <p><strong>Cidade:</strong> {loja.cidade}</p>
            {loja.endereco && <p><strong>Endereço:</strong> {loja.endereco}</p>}
            {loja.telefone && <p><strong>Telefone:</strong> {loja.telefone}</p>}
            {temSemana ? (
              <div>
                <strong>Horários:</strong>
                <div className="mt-1 space-y-0.5">
                  {horariosSemana.map((h, i) => (
                    <div key={i} className={`flex justify-between ${new Date().getDay() === i ? 'text-stone-800 font-semibold' : ''}`}>
                      <span>{DIAS_SEMANA_PT[i]}</span>
                      <span>{h.aberto ? `${h.abertura} - ${h.fechamento}` : 'Fechado'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : loja.horario_funcionamento ? (
              <p><strong>Funcionamento:</strong> {loja.horario_funcionamento}</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-stretch justify-between bg-white rounded-xl border border-stone-100 divide-x divide-stone-100">
          <button onClick={() => notaMedia.total > 0 && setShowAvaliacoes(!showAvaliacoes)} className="flex-1 flex flex-col items-center py-3 gap-0.5">
            <div className="flex items-center gap-1 text-xs"><FiStar className="text-yellow-500 text-[11px]" /><span className="font-semibold text-stone-800">{notaMedia.media > 0 ? notaMedia.media.toFixed(1) : 'Novo'}</span></div>
            <span className="text-[10px] text-stone-400">{notaMedia.total > 0 ? `${notaMedia.total} avaliação${notaMedia.total !== 1 ? 'ões' : ''}` : 'sem notas'}</span>
          </button>
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs"><FiClock className="text-red-500 text-[11px]" /><span className="font-semibold text-stone-800">{loja.tempo_entrega || '—'}</span></div><span className="text-[10px] text-stone-400">minutos</span></div>
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs"><span className="font-semibold text-stone-800">{Number(loja.pedido_minimo || 0) > 0 ? `R$ ${Number(loja.pedido_minimo).toFixed(0)}` : 'R$ 0'}</span></div><span className="text-[10px] text-stone-400">mínimo</span></div>
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5">
            <div className="flex items-center gap-1 text-xs">
              {aceitaEntrega ? <FiTruck className="text-red-500 text-[11px]" /> : <FiShoppingBag className="text-red-500 text-[11px]" />}
              <span className="font-semibold text-stone-800">
                {aceitaEntrega ? (taxa === 0 ? 'Grátis' : `R$ ${taxa.toFixed(0)}`) : 'Balcão'}
              </span>
            </div>
            <span className="text-[10px] text-stone-400">{aceitaEntrega ? 'entrega' : 'retirada'}</span>
          </div>
        </div>
      </div>

      {/* Avaliações */}
      {showAvaliacoes && avaliacoes.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-900">Avaliações</h3>
              <div className="flex items-center gap-1">
                <FiStar className="text-yellow-500 text-sm fill-yellow-500" />
                <span className="text-sm font-bold text-stone-900">{notaMedia.media.toFixed(1)}</span>
                <span className="text-xs text-stone-400">({notaMedia.total})</span>
              </div>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {avaliacoes.map((a) => (
                <div key={a.id} className="border-b border-stone-50 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-700">{a.cliente?.nome || 'Cliente'}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <FiStar key={n} className={`text-[10px] ${n <= a.nota ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}`} />
                      ))}
                    </div>
                  </div>
                  {a.comentario && <p className="text-xs text-stone-500 mt-1">{a.comentario}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pedido mínimo */}
      {Number(loja.pedido_minimo || 0) > 0 && totalItens > 0 && subtotal < Number(loja.pedido_minimo) && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-red-700 font-medium">Pedido mínimo: R$ {Number(loja.pedido_minimo).toFixed(2).replace('.', ',')} — faltam R$ {(Number(loja.pedido_minimo) - subtotal).toFixed(2).replace('.', ',')}</p>
        </div>
      )}

      {!aberta && (
        <div className="mx-4 mb-4 bg-stone-100 border border-stone-200 rounded-xl p-3.5 text-center">
          <p className="text-stone-600 font-medium text-sm">Loja fechada no momento</p>
          <p className="text-stone-400 text-xs mt-0.5">
            {(() => {
              if (temSemana) {
                if (horarioHoje?.aberto) return `Abre hoje às ${horarioHoje.abertura}`
                const diaAtual = new Date().getDay()
                for (let i = 1; i <= 7; i++) {
                  const prox = horariosSemana[(diaAtual + i) % 7]
                  if (prox?.aberto) return `Abre ${DIAS_SEMANA_PT[(diaAtual + i) % 7]} às ${prox.abertura}`
                }
                return 'Volte mais tarde'
              }
              return loja.horario_abertura ? `Abre às ${loja.horario_abertura}` : 'Volte mais tarde'
            })()}
          </p>
        </div>
      )}

      <div className="h-2 bg-stone-100" />

      <div className={`px-4 pt-4 ${!aberta ? 'opacity-50 pointer-events-none' : ''}`}>
        {!produtosCarregando && Array.isArray(promocoes) && promocoes.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FiTag className="text-red-500" />
              <h2 className="text-base font-bold text-stone-900">Promoções da loja</h2>
            </div>
            <HorizontalCards
              items={promocoes}
              renderItem={(promo) => (
                <div key={promo.id} className="snap-start shrink-0 w-64 bg-linear-to-br from-amber-50 to-red-50 rounded-2xl border border-amber-200 overflow-hidden">
                  {(promo.imagem_url || promo.produto?.imagem_url) ? (
                    <img src={promo.imagem_url || promo.produto?.imagem_url} alt={promo.titulo} loading="lazy" className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-amber-100 flex items-center justify-center">
                      <FiTag className="text-amber-600 text-2xl" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{promo.titulo}</h3>
                    {promo.produto?.nome && <p className="text-[11px] text-stone-500 mt-1">Produto: {promo.produto.nome}</p>}
                    {promo.descricao && <p className="text-[11px] text-stone-600 mt-1 line-clamp-2">{promo.descricao}</p>}
                    {Number(promo.preco_promocional || 0) > 0 && (
                      <div className="mt-2">
                        {Number(promo.produto?.preco || 0) > 0 && (
                          <p className="text-xs text-stone-400 line-through font-numeric">
                            R$ {Number(promo.produto.preco).toFixed(2).replace('.', ',')}
                          </p>
                        )}
                        <p className="text-lg font-extrabold text-red-700 font-numeric">
                          R$ {Number(promo.preco_promocional).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {produtosCarregando && (
          <div className="space-y-2">
            <div className="skeleton h-5 rounded w-24 mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 p-3">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 rounded w-3/4" />
                  <div className="skeleton h-3 rounded w-full" />
                  <div className="skeleton h-4 rounded w-1/3" />
                </div>
                <div className="skeleton w-16 h-16 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Carrossel de destaques */}
        {!produtosCarregando && categoriaSel === null && (() => {
          const destaques = produtos.dados.filter((p) => p.destaque === true).slice(0, 10)
          if (destaques.length === 0) return null
          return (
            <CarrosselDestaques produtos={destaques} onAdd={addItemDireto} />
          )
        })()}

        {/* Combos em destaque */}
        {!produtosCarregando && combos.length > 0 && categoriaSel === null && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FiGift className="text-red-500" />
              <h2 className="text-base font-bold text-stone-900">Combos</h2>
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">OFERTA</span>
            </div>
            <HorizontalCards
              items={combos}
              renderItem={(c) => {
                const original = c.itens.reduce((s, i) => s + Number(i.produto?.preco || 0) * i.quantidade, 0)
                const economia = original - Number(c.preco)
                const qtdNoCarrinho = carrinho[`combo__${c.id}`]?.qtd || 0
                return (
                  <div key={c.id} className="snap-start shrink-0 w-64 bg-linear-to-br from-red-50 to-yellow-50 rounded-2xl border-2 border-red-200 overflow-hidden">
                    {c.imagem_url && (
                      <img src={c.imagem_url} alt={c.nome} loading="lazy" className="w-full h-28 object-cover" />
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-stone-900 leading-tight">{c.nome}</h3>
                        {qtdNoCarrinho > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">{qtdNoCarrinho}</span>}
                      </div>
                      <p className="text-[11px] text-stone-500 mb-2 line-clamp-2">
                        {c.itens.map(i => `${i.quantidade}x ${i.produto?.nome}`).join(' + ')}
                      </p>
                      {c.descricao && <p className="text-[10px] text-stone-400 mb-2 italic">{c.descricao}</p>}
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-extrabold text-red-700 font-numeric">R$ {Number(c.preco).toFixed(2).replace('.', ',')}</span>
                          </div>
                          {economia > 0 && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-stone-400 line-through font-numeric">R$ {original.toFixed(2).replace('.', ',')}</span>
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full font-numeric">-R$ {economia.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => addComboAoCarrinho(c, e.currentTarget)}
                          className="w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all shadow-md"
                        >
                          <FiPlus size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }}
            />
          </div>
        )}

        {!produtosCarregando && categoriaSel === null ? (
          <>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-extrabold text-stone-900">Cardápio</h2>
              <span className="text-[11px] font-semibold text-stone-400">
                {categorias.length} categoria{categorias.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2.5">
              {categorias.map((cat) => {
                const qtdCat = produtosPorCategoria[cat].length
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoriaSel(cat)}
                    className="group w-full flex items-center gap-3 bg-white rounded-2xl border border-stone-200/70 p-3.5 hover:border-red-200 hover:bg-red-50/20 active:bg-red-50 transition-all duration-200 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base leading-tight font-serif font-bold text-stone-900 flex items-center gap-1.5">
                        <span aria-hidden="true">🔹</span>
                        <span className="truncate">{cat}</span>
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">{qtdCat} {qtdCat === 1 ? 'item disponível' : 'itens disponíveis'}</p>
                    </div>
                    <div className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100 rounded-full px-2 py-1">
                      Abrir
                    </div>
                    <FiChevronRight className="text-stone-300 group-hover:text-red-400 text-lg shrink-0 transition-colors" />
                  </button>
                )
              })}
            </div>

          </>
        ) : (
          <>
            <button onClick={() => setCategoriaSel(null)} className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm mb-3"><FiChevronLeft /> Voltar às categorias</button>
            <h2 className="text-base font-serif font-bold text-stone-900 mb-3 flex items-center gap-1.5">
              <span aria-hidden="true">🔹</span>
              <span>{categoriaSel}</span>
            </h2>
            <div className="space-y-2">
              {(produtosPorCategoria[categoriaSel] || []).map((p) => {
                const qtd = qtdProduto(p.id)
                const temConfig = (p.variacoes?.length > 0) || (p.adicionais?.length > 0)
                const precoMin = p.variacoes?.length > 0 ? Math.min(...p.variacoes.map((v) => Number(v.preco))) : Number(p.preco)
                return (
                  <button key={p.id} onClick={() => addItemDireto(p)} className="w-full flex items-center gap-3 bg-white rounded-xl border border-stone-100 p-3 text-left hover:bg-stone-50 active:bg-stone-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-stone-900">{p.nome}</h3>
                      {p.descricao && <p className="text-xs text-stone-400 line-clamp-2 mt-0.5">{p.descricao}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-red-600 font-bold text-sm font-numeric">
                          {p.variacoes?.length > 0 ? `a partir de R$ ${precoMin.toFixed(2).replace('.', ',')}` : `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}`}
                        </p>
                        {temConfig && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">personalizar</span>}
                      </div>
                    </div>
                    {p.imagem_url && <img src={p.imagem_url} alt="" loading="lazy" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                    {qtd > 0 && <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{qtd}</span>}
                  </button>
                )
              })}
            </div>

          </>
        )}
      </div>

      {totalItens > 0 && aberta && (
        <div className="fixed bottom-16 left-0 right-0 z-60 px-4 pb-2">
          <button ref={cartButtonRef} onClick={irParaCheckout} className="w-full max-w-lg mx-auto flex items-center justify-between bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-lg hover:bg-red-700 transition-all">
            <div className="flex items-center gap-2"><FiShoppingBag /><span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{totalItens}</span></div>
            <span className="font-semibold text-sm">{Number(loja.pedido_minimo || 0) > 0 && subtotal < Number(loja.pedido_minimo) ? `Mín. R$ ${Number(loja.pedido_minimo).toFixed(0)}` : 'Ver carrinho'}</span>
            <span className="font-bold font-numeric">R$ {Number(totalAnim || subtotal).toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}

      {showSubmitOverlay && (
        <div className="fixed inset-0 z-120 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200 p-4">
            <p className="text-sm font-bold text-stone-900 mb-3">Finalizando pedido</p>
            <div className="relative h-2 rounded-full bg-stone-200 overflow-hidden mb-4">
              <div
                className="absolute left-0 top-0 h-full bg-linear-to-r from-amber-400 to-red-500 transition-[width] duration-500"
                style={{ width: submitStage === 0 ? '30%' : submitStage === 1 ? '68%' : '100%' }}
              />
            </div>
            <div className="space-y-2 text-sm">
              <p className={`transition-colors ${submitStage >= 0 ? 'text-stone-800 font-semibold' : 'text-stone-400'}`}>🔄 Enviando pedido...</p>
              <p className={`transition-colors ${submitStage >= 1 ? 'text-amber-700 font-semibold' : 'text-stone-400'}`}>🟡 Restaurante recebendo...</p>
              <p className={`transition-colors ${submitStage >= 2 ? 'text-green-700 font-semibold' : 'text-stone-400'}`}>🟢 Confirmado!</p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 animate-fade-in-up">
          <div className="bg-stone-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <FiShoppingBag className="text-red-400 shrink-0" />
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
