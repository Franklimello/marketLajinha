import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'
import { FiClock, FiMinus, FiPlus, FiShoppingBag, FiChevronLeft, FiCopy, FiCheck, FiChevronRight, FiInfo, FiTruck, FiDollarSign, FiMapPin, FiTag, FiGift, FiStar, FiCalendar } from 'react-icons/fi'

function gerarChaveCarrinho(produtoId, variacaoId, adicionaisIds) {
  return `${produtoId}__${variacaoId || ''}__${(adicionaisIds || []).sort().join(',')}`
}

function CarrosselDestaques({ produtos, onAdd }) {
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
                <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-semibold text-stone-900 mt-1.5 line-clamp-1">{p.nome}</p>
              <p className="text-xs text-red-700 font-bold">
                {p.variacoes?.length > 0 && 'a partir de '}R$ {preco.toFixed(2).replace('.', ',')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function LojaPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { logado, cliente, carregando: authCarregando } = useAuth()
  const [loja, setLoja] = useState(null)
  const [produtos, setProdutos] = useState({ dados: [], total: 0 })
  const [carregando, setCarregando] = useState(true)
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
  const [pixData, setPixData] = useState(null)
  const [pixCarregando, setPixCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const [combos, setCombos] = useState([])
  const [notaMedia, setNotaMedia] = useState({ media: 0, total: 0 })
  const [avaliacoes, setAvaliacoes] = useState([])
  const [showAvaliacoes, setShowAvaliacoes] = useState(false)
  const [agendado, setAgendado] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [pedidoCriado, setPedidoCriado] = useState(null)

  const [codigoCupom, setCodigoCupom] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState(null)
  const [cupomErro, setCupomErro] = useState('')
  const [cupomCarregando, setCupomCarregando] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function mostrarToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }

  useEffect(() => {
    if (!slug) return
    Promise.all([api.lojas.buscarPorSlug(slug), api.lojas.produtos(slug, 1)])
      .then(([lojaData, produtosData]) => {
        setLoja(lojaData)
        setProdutos(produtosData)
        if (lojaData?.id) {
          api.lojas.bairros(lojaData.id).then(setBairros).catch(() => {})
          api.combos.listarPorLoja(lojaData.id).then(setCombos).catch(() => {})
          api.avaliacoes.mediaPorLoja(lojaData.id).then(setNotaMedia).catch(() => {})
          api.avaliacoes.listarPorLoja(lojaData.id).then((r) => setAvaliacoes(r.dados || [])).catch(() => {})
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [slug])

  // ---- Carrinho ----
  function addItemDireto(produto) {
    setProdutoDetalhe(produto)
    setVariacaoSel(produto.variacoes?.[0]?.id || null)
    setAdicionaisSel([])
    setQtdDetalhe(1)
    setObsDetalhe('')
  }

  function addItemConfigurado() {
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

  const itensCarrinho = Object.entries(carrinho)
  const totalItens = itensCarrinho.reduce((s, [, i]) => s + i.qtd, 0)
  const subtotal = itensCarrinho.reduce((s, [, i]) => s + i.precoUnit * i.qtd, 0)
  const bairroSel2 = bairros.find((b) => b.nome === formPedido.bairro)
  const taxaEntrega = tipoEntrega === 'RETIRADA' ? 0 : (bairroSel2 ? Number(bairroSel2.taxa) : (bairros.length === 0 && loja ? Number(loja.taxa_entrega || 0) : 0))
  const descontoCupom = cupomAplicado ? cupomAplicado.desconto : 0
  const totalPedido = Math.max(0, subtotal - descontoCupom + taxaEntrega)

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

  function irParaCheckout() {
    if (!logado) { navigate(`/login?voltar=${encodeURIComponent(`/loja/${slug}`)}`); return }
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

  function addComboAoCarrinho(combo) {
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
  }

  function qtdProduto(produtoId) {
    return itensCarrinho.filter(([, i]) => i.produto.id === produtoId).reduce((s, [, i]) => s + i.qtd, 0)
  }

  function handleFormChange(e) { setFormPedido((prev) => ({ ...prev, [e.target.name]: e.target.value })) }

  async function handleCriarPedido(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const pedido = await api.pedidos.criar({
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
      })
      setPedidoCriado(pedido)
      const pagarOnline = formPedido._tipoPag === 'online' && formPedido.forma_pagamento === 'PIX' && loja.pix_chave
      if (pagarOnline) {
        setEtapa('pix')
        setPixCarregando(true)
        try { setPixData(await api.lojas.gerarPix(loja.id, totalPedido, pedido.id)) }
        catch { setPixData(null) }
        finally { setPixCarregando(false) }
      } else { setEtapa('confirmado'); setCarrinho({}); setCupomAplicado(null); setCodigoCupom('') }
    } catch (err) { alert(err.message) }
    finally { setEnviando(false) }
  }

  function handleFinalizarPix() { setEtapa('confirmado'); setCarrinho({}); setPixData(null); setCupomAplicado(null); setCodigoCupom('') }

  async function copiarPayload() {
    if (!pixData?.payload) return
    await navigator.clipboard.writeText(pixData.payload)
    setCopiado(true); setTimeout(() => setCopiado(false), 2500)
  }

  // ---- Loading/Error ----
  if (carregando) return (
    <div className="max-w-lg mx-auto px-4 pt-4">
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
  if (erro || !loja) return <div className="flex flex-col items-center justify-center py-20 gap-4"><p className="text-red-500 text-sm">{erro || 'Loja não encontrada.'}</p><Link to="/" className="text-red-600 hover:underline text-sm">Voltar</Link></div>

  const aberta = loja.aberta_agora ?? loja.aberta
  const taxa = loja.taxa_entrega ?? 0

  // ---- Confirmado ----
  if (etapa === 'confirmado') {
    const PAGAMENTO_LABELS = { PIX: 'PIX', CREDIT: 'Cartão de Crédito', DEBIT: 'Cartão de Débito', CASH: 'Dinheiro' }
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
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
      <div className="max-w-lg mx-auto px-4 py-6">
        <button onClick={handleFinalizarPix} className="flex items-center gap-1 text-stone-500 hover:text-stone-900 text-sm mb-6"><FiChevronLeft /> Pular pagamento online</button>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Pagar com PIX</h2>
          <p className="text-stone-500 text-sm mb-4">Escaneie o QR Code ou copie o código</p>
          <div className="bg-red-50 rounded-xl px-4 py-2 mb-4 inline-block"><span className="text-2xl font-bold text-red-700">R$ {totalPedido.toFixed(2).replace('.', ',')}</span></div>
          {pixCarregando ? (
            <div className="py-12"><div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-stone-400 text-sm mt-3">Gerando QR Code...</p></div>
          ) : pixData ? (
            <>
              <div className="flex justify-center mb-4"><img src={pixData.qrcode} alt="QR Code PIX" className="w-56 h-56 rounded-xl" /></div>
              <p className="text-xs text-stone-400 mb-3">Titular: <strong className="text-stone-600">{pixData.nome_titular}</strong></p>
              <div className="bg-stone-50 rounded-lg p-3 mb-4"><p className="text-[10px] text-stone-400 mb-1 uppercase tracking-wider font-medium">PIX Copia e Cola</p><p className="text-xs text-stone-600 font-mono break-all leading-relaxed">{pixData.payload.substring(0, 80)}...</p></div>
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

    return (
      <div className="max-w-lg mx-auto px-4 py-2 pb-8">
        <button onClick={() => setEtapa('cardapio')} className="flex items-center gap-1 text-stone-500 hover:text-stone-900 text-sm mb-4"><FiChevronLeft /> Voltar ao cardápio</button>
        <h2 className="text-lg font-bold text-stone-900 mb-4">Finalizar pedido</h2>

        {/* Resumo itens */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Resumo</h3>
          {itensCarrinho.map(([chave, i]) => (
            <div key={chave} className="py-1.5 border-b border-stone-50 last:border-0">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  {i.isCombo && <span className="text-[9px] font-bold bg-red-100 text-red-700 px-1 py-0.5 rounded">COMBO</span>}
                  <span className="text-stone-600">{i.qtd}x {i.produto.nome}</span>
                </div>
                <span className="text-stone-900 font-medium">R$ {(i.precoUnit * i.qtd).toFixed(2).replace('.', ',')}</span>
              </div>
              {i.isCombo && i.comboItens && <p className="text-[10px] text-stone-400 ml-4">{i.comboItens.map(ci => `${ci.quantidade}x ${ci.produto?.nome}`).join(', ')}</p>}
              {i.variacao && <p className="text-[10px] text-stone-400 ml-4">Tamanho: {i.variacao.nome}</p>}
              {i.adicionais?.length > 0 && <p className="text-[10px] text-stone-400 ml-4">+ {i.adicionais.map((a) => a.nome).join(', ')}</p>}
              {!i.isCombo && i.obs && <p className="text-[10px] text-stone-400 ml-4 italic">Obs: {i.obs}</p>}
            </div>
          ))}
          <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-stone-500">{tipoEntrega === 'RETIRADA' ? 'Retirada no balcão' : `Entrega ${formPedido.bairro ? `(${formPedido.bairro})` : ''}`}</span>
            <span className="font-medium">{tipoEntrega === 'RETIRADA' ? 'Grátis' : (taxaEntrega > 0 ? `R$ ${taxaEntrega.toFixed(2).replace('.', ',')}` : 'Grátis')}</span>
          </div>
          {descontoCupom > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-green-600">Desconto (cupom)</span>
              <span className="font-medium text-green-600">- R$ {descontoCupom.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-stone-100"><span>Total</span><span className="text-red-700">R$ {totalPedido.toFixed(2).replace('.', ',')}</span></div>
        </div>

        {/* Tipo de entrega */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-1"><FiTruck className="text-red-600" /> Como deseja receber?</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setTipoEntrega('ENTREGA'); if (!enderecoSel) { const ends = cliente?.enderecos || []; if (ends.length) { const ep = ends.find(e => e.padrao) || ends[0]; selecionarEndereco(ep) } } }} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoEntrega === 'ENTREGA' ? 'border-red-500 bg-red-50' : 'border-stone-200 hover:border-stone-300'}`}>
              <FiTruck className={`text-lg ${tipoEntrega === 'ENTREGA' ? 'text-red-600' : 'text-stone-400'}`} />
              <span className="text-sm font-semibold text-stone-900">Entrega</span>
              <span className="text-[10px] text-stone-400">Receber em casa</span>
            </button>
            <button type="button" onClick={() => setTipoEntrega('RETIRADA')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoEntrega === 'RETIRADA' ? 'border-red-500 bg-red-50' : 'border-stone-200 hover:border-stone-300'}`}>
              <FiShoppingBag className={`text-lg ${tipoEntrega === 'RETIRADA' ? 'text-red-600' : 'text-stone-400'}`} />
              <span className="text-sm font-semibold text-stone-900">Retirar no balcão</span>
              <span className="text-[10px] text-stone-400">Buscar na loja</span>
            </button>
          </div>
        </div>

        {/* Cupom de desconto */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-1"><FiTag className="text-red-600" /> Cupom de desconto</h3>
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
              <button onClick={handleRemoverCupom} className="text-red-500 hover:text-red-700 text-xs font-medium">Remover</button>
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
                  className="px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
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
          <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1"><FiMapPin className="text-red-600" /> Endereço de entrega</h3>
              <Link to="/perfil" className="text-[10px] text-red-600 font-medium hover:underline">Alterar</Link>
            </div>
            <div className="space-y-2">
              {enderecosCliente.map((end) => {
                const sel = enderecoSel?.id === end.id
                return (
                  <button key={end.id} type="button" onClick={() => selecionarEndereco(end)} className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${sel ? 'border-red-500 bg-red-50/50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <div className="flex items-center gap-2">
                      {end.apelido && <span className="text-xs font-semibold text-stone-700">{end.apelido}</span>}
                      {end.padrao && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">Padrão</span>}
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-800 flex items-start gap-2">
            <FiInfo className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Retirada no balcão</p>
              <p className="text-xs text-red-600 mt-0.5">Retire seu pedido diretamente na loja. Sem taxa de entrega!</p>
            </div>
          </div>
        )}

        <form onSubmit={handleCriarPedido} className="space-y-4">
          {/* Agendar pedido */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1"><FiCalendar className="text-red-600" /> Agendar para depois?</h3>
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
                  min={new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[10px] text-stone-400 mt-1">Mínimo 30 min a partir de agora. A loja receberá o pedido como agendado.</p>
              </div>
            )}
          </div>

          {/* Observação */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <label className="block text-xs font-medium text-stone-600 mb-1">Observação</label>
            <textarea name="observacao" value={formPedido.observacao} onChange={handleFormChange} rows={2} placeholder="Ex: troco pra 50, interfone 302..." className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 resize-none" />
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
              <div className="bg-white rounded-xl border border-stone-200 p-4">
                <h3 className="text-sm font-semibold text-stone-700 mb-3">Como deseja pagar?</h3>

                {temPixOnline ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button type="button" onClick={() => escolherTipoPag('online')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoPagamento === 'online' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'}`}>
                        <span className="text-sm font-semibold text-stone-900">Pagar online</span>
                        <span className="text-[10px] text-stone-400">PIX com QR Code</span>
                      </button>
                      <button type="button" onClick={() => escolherTipoPag('entrega')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoPagamento === 'entrega' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'}`}>
                        <span className="text-sm font-semibold text-stone-900">{tipoEntrega === 'RETIRADA' ? 'Pagar na retirada' : 'Pagar na entrega'}</span>
                        <span className="text-[10px] text-stone-400">Presencial</span>
                      </button>
                    </div>
                    {tipoPagamento === 'online' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 flex items-center gap-2">
                        <FiCheck className="text-emerald-600 shrink-0" />
                        <span>Pagamento via <strong>PIX</strong> — você receberá o QR Code após confirmar.</span>
                      </div>
                    )}
                    {tipoPagamento === 'entrega' && formasPresenciais.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {formasPresenciais.map((opt) => (
                          <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-colors text-center ${formPedido.forma_pagamento === opt.value ? 'border-red-500 bg-red-50' : 'border-stone-200 hover:border-stone-300'}`}>
                            <input type="radio" name="forma_pagamento" value={opt.value} checked={formPedido.forma_pagamento === opt.value} onChange={handleFormChange} className="sr-only" />
                            <span className="text-sm font-semibold text-stone-900">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {formPedido.forma_pagamento === 'CASH' && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                        <label className="block text-xs font-medium text-red-800 mb-1.5">Precisa de troco? Para quanto?</label>
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
                            className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                          />
                        </div>
                        {trocoPara && Number(trocoPara) > totalPedido && (
                          <p className="text-xs text-red-700 mt-1.5 font-medium">
                            Troco: R$ {(Number(trocoPara) - totalPedido).toFixed(2).replace('.', ',')}
                          </p>
                        )}
                        {trocoPara && Number(trocoPara) > 0 && Number(trocoPara) <= totalPedido && (
                          <p className="text-xs text-red-600 mt-1.5">Valor precisa ser maior que R$ {totalPedido.toFixed(2).replace('.', ',')}</p>
                        )}
                        {!trocoPara && (
                          <p className="text-[10px] text-red-600 mt-1.5">Deixe vazio se não precisa de troco</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {formasPresenciais.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {formasPresenciais.map((opt) => (
                          <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-colors text-center ${formPedido.forma_pagamento === opt.value ? 'border-red-500 bg-red-50' : 'border-stone-200 hover:border-stone-300'}`}>
                            <input type="radio" name="forma_pagamento" value={opt.value} checked={formPedido.forma_pagamento === opt.value} onChange={handleFormChange} className="sr-only" />
                            <span className="text-sm font-semibold text-stone-900">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {formPedido.forma_pagamento === 'CASH' && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                        <label className="block text-xs font-medium text-red-800 mb-1.5">Precisa de troco? Para quanto?</label>
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
                            className="flex-1 px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 bg-white"
                          />
                        </div>
                        {trocoPara && Number(trocoPara) > totalPedido && (
                          <p className="text-xs text-red-700 mt-1.5 font-medium">
                            Troco: R$ {(Number(trocoPara) - totalPedido).toFixed(2).replace('.', ',')}
                          </p>
                        )}
                        {trocoPara && Number(trocoPara) > 0 && Number(trocoPara) <= totalPedido && (
                          <p className="text-xs text-red-600 mt-1.5">Valor precisa ser maior que R$ {totalPedido.toFixed(2).replace('.', ',')}</p>
                        )}
                        {!trocoPara && (
                          <p className="text-[10px] text-red-600 mt-1.5">Deixe vazio se não precisa de troco</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          {Number(loja.pedido_minimo || 0) > 0 && subtotal < Number(loja.pedido_minimo) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-xs text-red-600 font-medium">Pedido mínimo: R$ {Number(loja.pedido_minimo).toFixed(2).replace('.', ',')} — adicione mais R$ {(Number(loja.pedido_minimo) - subtotal).toFixed(2).replace('.', ',')}.</p>
            </div>
          )}

          <button type="submit" disabled={enviando || totalItens === 0 || (tipoEntrega === 'ENTREGA' && !enderecoSel) || !formPedido.forma_pagamento || (agendado && !agendadoPara) || (Number(loja.pedido_minimo || 0) > 0 && subtotal < Number(loja.pedido_minimo))} className="w-full py-3.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm">
            {enviando ? 'Enviando...' : agendado ? `Agendar pedido — R$ ${totalPedido.toFixed(2).replace('.', ',')}` : `Enviar pedido — R$ ${totalPedido.toFixed(2).replace('.', ',')}`}
          </button>
        </form>
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
      <div className="max-w-lg mx-auto pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-stone-100">
          <button onClick={() => setProdutoDetalhe(null)} className="text-stone-500 hover:text-stone-900">
            <FiChevronLeft className="text-xl" />
          </button>
          <h1 className="text-lg font-bold text-stone-900">{p.nome}</h1>
        </div>

        {/* Imagem */}
        {p.imagem_url && (
          <img src={p.imagem_url} alt={p.nome} className="w-full h-48 object-cover" />
        )}

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
                  <span className="text-sm font-semibold text-emerald-600">R$ {Number(v.preco).toFixed(2).replace('.', ',')}</span>
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
                    <span className="text-sm font-semibold text-emerald-600">R$ {Number(a.preco).toFixed(2).replace('.', ',')}</span>
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
            <p className="text-sm text-stone-500">valor unitário: <span className="font-bold text-stone-900">R$ {precoUnitario.toFixed(2).replace('.', ',')}</span></p>
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
            className="w-full max-w-lg mx-auto block bg-red-600 text-white py-3.5 rounded-xl shadow-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-semibold text-sm"
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
  try { horariosSemana = JSON.parse(loja.horarios_semana || '[]') } catch {}
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
    <div className="max-w-lg mx-auto pb-24">
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
      <Link to="/" className="absolute top-4 left-4 z-20 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow text-stone-700 hover:bg-white"><FiChevronLeft /></Link>

      {/* Banner */}
      <div className="relative w-full h-44 bg-stone-200 overflow-hidden">
        <img src={loja.banner_url || loja.logo_url || ''} alt="" className={`w-full h-full object-cover ${!aberta ? 'grayscale brightness-75' : ''}`} onError={(e) => { e.target.style.display = 'none' }} />
        <div className="absolute bottom-3 right-4 w-20 h-20 rounded-2xl overflow-hidden border-3 border-white shadow-lg bg-white">
          <img src={loja.logo_url || ''} alt={loja.nome} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
          <div className="w-full h-full items-center justify-center text-2xl font-bold text-white hidden" style={{ backgroundColor: loja.cor_primaria || '#78716c' }}>{loja.nome?.charAt(0)}</div>
        </div>
        {horaFecha && aberta && <span className="absolute bottom-3 right-28 bg-white/90 backdrop-blur-sm text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">fecha às {horaFecha}</span>}
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
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs"><FiTruck className="text-red-500 text-[11px]" /><span className="font-semibold text-stone-800">{taxa === 0 ? 'Grátis' : `R$ ${taxa.toFixed(0)}`}</span></div><span className="text-[10px] text-stone-400">entrega</span></div>
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
        {/* Carrossel de destaques */}
        {categoriaSel === null && (() => {
          const destaques = produtos.dados.filter(p => p.imagem_url).slice(0, 10)
          if (destaques.length === 0) return null
          return (
            <CarrosselDestaques produtos={destaques} onAdd={addItemDireto} />
          )
        })()}

        {/* Combos em destaque */}
        {combos.length > 0 && categoriaSel === null && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <FiGift className="text-red-500" />
              <h2 className="text-base font-bold text-stone-900">Combos</h2>
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">OFERTA</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {combos.map((c) => {
                const original = c.itens.reduce((s, i) => s + Number(i.produto?.preco || 0) * i.quantidade, 0)
                const economia = original - Number(c.preco)
                const qtdNoCarrinho = carrinho[`combo__${c.id}`]?.qtd || 0
                return (
                  <div key={c.id} className="snap-start flex-shrink-0 w-64 bg-gradient-to-br from-red-50 to-yellow-50 rounded-2xl border-2 border-red-200 overflow-hidden">
                    {c.imagem_url && (
                      <img src={c.imagem_url} alt={c.nome} className="w-full h-28 object-cover" />
                    )}
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-stone-900 leading-tight">{c.nome}</h3>
                        {qtdNoCarrinho > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">{qtdNoCarrinho}</span>}
                      </div>
                      <p className="text-[11px] text-stone-500 mb-2 line-clamp-2">
                        {c.itens.map(i => `${i.quantidade}x ${i.produto?.nome}`).join(' + ')}
                      </p>
                      {c.descricao && <p className="text-[10px] text-stone-400 mb-2 italic">{c.descricao}</p>}
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-extrabold text-red-700">R$ {Number(c.preco).toFixed(2).replace('.', ',')}</span>
                          </div>
                          {economia > 0 && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-stone-400 line-through">R$ {original.toFixed(2).replace('.', ',')}</span>
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">-R$ {economia.toFixed(2).replace('.', ',')}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => addComboAoCarrinho(c)}
                          className="w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-md"
                        >
                          <FiPlus size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {categoriaSel === null ? (
          <>
            <h2 className="text-base font-bold text-stone-900 mb-3">Cardápio</h2>
            <div className="space-y-2">
              {categorias.map((cat) => {
                const qtdCat = produtosPorCategoria[cat].length
                return (
                  <button key={cat} onClick={() => setCategoriaSel(cat)} className="w-full flex items-center gap-3 bg-white rounded-xl border border-stone-100 p-3 hover:bg-stone-50 active:bg-stone-100 transition-colors text-left">
                    <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <span className="text-lg">🍽️</span>
                    </div>
                    <div className="flex-1 min-w-0"><h3 className="text-sm font-bold text-stone-900">{cat}</h3><p className="text-xs text-stone-400">{qtdCat} {qtdCat === 1 ? 'item' : 'itens'}</p></div>
                    <FiChevronRight className="text-stone-300 text-lg shrink-0" />
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setCategoriaSel(null)} className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm mb-3"><FiChevronLeft /> Voltar às categorias</button>
            <h2 className="text-base font-bold text-stone-900 mb-3">{categoriaSel}</h2>
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
                        <p className="text-red-600 font-bold text-sm">
                          {p.variacoes?.length > 0 ? `a partir de R$ ${precoMin.toFixed(2).replace('.', ',')}` : `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}`}
                        </p>
                        {temConfig && <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">personalizar</span>}
                      </div>
                    </div>
                    {p.imagem_url && <img src={p.imagem_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                    {qtd > 0 && <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{qtd}</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {totalItens > 0 && aberta && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
          <button onClick={irParaCheckout} className="w-full max-w-lg mx-auto flex items-center justify-between bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-lg hover:bg-red-700 transition-colors">
            <div className="flex items-center gap-2"><FiShoppingBag /><span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{totalItens}</span></div>
            <span className="font-semibold text-sm">{Number(loja.pedido_minimo || 0) > 0 && subtotal < Number(loja.pedido_minimo) ? `Mín. R$ ${Number(loja.pedido_minimo).toFixed(0)}` : 'Ver carrinho'}</span>
            <span className="font-bold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </button>
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
