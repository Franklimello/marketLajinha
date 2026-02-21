import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { FiClock, FiMinus, FiPlus, FiShoppingBag, FiChevronLeft, FiCopy, FiCheck, FiChevronRight, FiInfo, FiTruck, FiDollarSign, FiMapPin, FiTag } from 'react-icons/fi'

function gerarChaveCarrinho(produtoId, variacaoId, adicionaisIds) {
  return `${produtoId}__${variacaoId || ''}__${(adicionaisIds || []).sort().join(',')}`
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
  const [bairros, setBairros] = useState([])
  const [enderecoSel, setEnderecoSel] = useState(null)
  const [formPedido, setFormPedido] = useState({
    nome_cliente: '', telefone_cliente: '', endereco: '',
    bairro: '', forma_pagamento: 'PIX', observacao: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [pixData, setPixData] = useState(null)
  const [pixCarregando, setPixCarregando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const [codigoCupom, setCodigoCupom] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState(null)
  const [cupomErro, setCupomErro] = useState('')
  const [cupomCarregando, setCupomCarregando] = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([api.lojas.buscarPorSlug(slug), api.lojas.produtos(slug, 1)])
      .then(([lojaData, produtosData]) => {
        setLoja(lojaData)
        setProdutos(produtosData)
        if (lojaData?.id) api.lojas.bairros(lojaData.id).then(setBairros).catch(() => {})
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
  const taxaEntrega = bairroSel2 ? Number(bairroSel2.taxa) : (bairros.length === 0 && loja ? Number(loja.taxa_entrega || 0) : 0)
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
    if (enderecos.length === 0) {
      alert('Cadastre um endereço antes de finalizar o pedido.')
      navigate('/perfil')
      return
    }
    const enderecoPadrao = enderecos.find((e) => e.padrao) || enderecos[0]
    let endStr = `${enderecoPadrao.rua}, ${enderecoPadrao.numero}`
    if (enderecoPadrao.complemento) endStr += ` - ${enderecoPadrao.complemento}`
    if (enderecoPadrao.referencia) endStr += ` (${enderecoPadrao.referencia})`
    setFormPedido((prev) => ({
      ...prev,
      nome_cliente: cliente?.nome || prev.nome_cliente,
      telefone_cliente: cliente?.telefone || prev.telefone_cliente,
      endereco: endStr,
      bairro: enderecoPadrao.bairro,
    }))
    setEnderecoSel(enderecoPadrao)
    setEtapa('checkout')
  }

  function selecionarEndereco(end) {
    setEnderecoSel(end)
    let endereco = `${end.rua}, ${end.numero}`
    if (end.complemento) endereco += ` - ${end.complemento}`
    if (end.referencia) endereco += ` (${end.referencia})`
    setFormPedido((prev) => ({
      ...prev,
      endereco,
      bairro: end.bairro,
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
        nome_cliente: formPedido.nome_cliente,
        telefone_cliente: formPedido.telefone_cliente,
        endereco: formPedido.endereco,
        bairro: formPedido.bairro,
        taxa_entrega: taxaEntrega,
        forma_pagamento: formPedido.forma_pagamento,
        codigo_cupom: cupomAplicado ? codigoCupom.trim() : '',
        observacao: [
          formPedido.observacao,
          ...itensCarrinho.filter(([, i]) => i.obs).map(([, i]) => `${i.produto.nome}: ${i.obs}`),
        ].filter(Boolean).join(' | '),
        itens: itensCarrinho.map(([, i]) => ({
          produto_id: i.produto.id,
          quantidade: i.qtd,
          variacao_id: i.variacao?.id || undefined,
          adicionais_ids: i.adicionais?.map((a) => a.id) || [],
        })),
      })
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
  if (carregando) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  if (erro || !loja) return <div className="flex flex-col items-center justify-center py-20 gap-4"><p className="text-red-500 text-sm">{erro || 'Loja não encontrada.'}</p><Link to="/" className="text-amber-600 hover:underline text-sm">Voltar</Link></div>

  const aberta = loja.aberta_agora ?? loja.aberta
  const taxa = loja.taxa_entrega ?? 0

  // ---- Confirmado ----
  if (etapa === 'confirmado') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><FiCheck className="text-green-600 text-2xl" /></div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Pedido enviado!</h2>
        <p className="text-stone-500 text-sm mb-6">Seu pedido foi recebido por <strong>{loja.nome}</strong>.{formPedido.forma_pagamento !== 'PIX' && ' Realize o pagamento na entrega.'}</p>
        <Link to="/" className="inline-block px-6 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 text-sm">Voltar ao início</Link>
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
          <div className="bg-amber-50 rounded-xl px-4 py-2 mb-4 inline-block"><span className="text-2xl font-bold text-amber-700">R$ {totalPedido.toFixed(2).replace('.', ',')}</span></div>
          {pixCarregando ? (
            <div className="py-12"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-stone-400 text-sm mt-3">Gerando QR Code...</p></div>
          ) : pixData ? (
            <>
              <div className="flex justify-center mb-4"><img src={pixData.qrcode} alt="QR Code PIX" className="w-56 h-56 rounded-xl" /></div>
              <p className="text-xs text-stone-400 mb-3">Titular: <strong className="text-stone-600">{pixData.nome_titular}</strong></p>
              <div className="bg-stone-50 rounded-lg p-3 mb-4"><p className="text-[10px] text-stone-400 mb-1 uppercase tracking-wider font-medium">PIX Copia e Cola</p><p className="text-xs text-stone-600 font-mono break-all leading-relaxed">{pixData.payload.substring(0, 80)}...</p></div>
              <button onClick={copiarPayload} className="flex items-center justify-center gap-2 w-full py-3 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 text-sm">{copiado ? <><FiCheck /> Copiado!</> : <><FiCopy /> Copiar código PIX</>}</button>
              <button onClick={handleFinalizarPix} className="w-full mt-3 py-2.5 text-green-700 bg-green-50 font-medium rounded-xl hover:bg-green-100 text-sm">Já paguei</button>
            </>
          ) : (
            <div className="py-8"><p className="text-stone-400 text-sm">Não foi possível gerar o QR Code.</p><button onClick={handleFinalizarPix} className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium">Continuar</button></div>
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
                <span className="text-stone-600">{i.qtd}x {i.produto.nome}</span>
                <span className="text-stone-900 font-medium">R$ {(i.precoUnit * i.qtd).toFixed(2).replace('.', ',')}</span>
              </div>
              {i.variacao && <p className="text-[10px] text-stone-400 ml-4">Tamanho: {i.variacao.nome}</p>}
              {i.adicionais?.length > 0 && <p className="text-[10px] text-stone-400 ml-4">+ {i.adicionais.map((a) => a.nome).join(', ')}</p>}
              {i.obs && <p className="text-[10px] text-stone-400 ml-4 italic">Obs: {i.obs}</p>}
            </div>
          ))}
          <div className="border-t border-stone-100 mt-2 pt-2 flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span className="font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-stone-500">Entrega {formPedido.bairro ? `(${formPedido.bairro})` : ''}</span>
            <span className="font-medium">{taxaEntrega > 0 ? `R$ ${taxaEntrega.toFixed(2).replace('.', ',')}` : 'Grátis'}</span>
          </div>
          {descontoCupom > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-green-600">Desconto (cupom)</span>
              <span className="font-medium text-green-600">- R$ {descontoCupom.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-stone-100"><span>Total</span><span className="text-amber-700">R$ {totalPedido.toFixed(2).replace('.', ',')}</span></div>
        </div>

        {/* Cupom de desconto */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-1"><FiTag className="text-amber-600" /> Cupom de desconto</h3>
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
                  className="flex-1 px-3 py-2.5 border border-stone-300 rounded-lg text-sm uppercase font-mono placeholder:normal-case placeholder:font-sans focus:ring-2 focus:ring-amber-500"
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

        {/* Endereço de entrega */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1"><FiMapPin className="text-amber-600" /> Endereço de entrega</h3>
            <Link to="/perfil" className="text-[10px] text-amber-600 font-medium hover:underline">Alterar</Link>
          </div>
          <div className="space-y-2">
            {enderecosCliente.map((end) => {
              const sel = enderecoSel?.id === end.id
              return (
                <button key={end.id} type="button" onClick={() => selecionarEndereco(end)} className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${sel ? 'border-amber-500 bg-amber-50/50' : 'border-stone-200 hover:border-stone-300'}`}>
                  <div className="flex items-center gap-2">
                    {end.apelido && <span className="text-xs font-semibold text-stone-700">{end.apelido}</span>}
                    {end.padrao && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Padrão</span>}
                  </div>
                  <p className="text-sm text-stone-800 mt-0.5">{end.rua}, {end.numero}{end.complemento ? ` - ${end.complemento}` : ''}</p>
                  <p className="text-xs text-stone-400">{end.bairro}{end.referencia ? ` · ${end.referencia}` : ''}</p>
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleCriarPedido} className="space-y-4">
          {/* Observação */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <label className="block text-xs font-medium text-stone-600 mb-1">Observação</label>
            <textarea name="observacao" value={formPedido.observacao} onChange={handleFormChange} rows={2} placeholder="Ex: troco pra 50, interfone 302..." className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 resize-none" />
          </div>

          {/* Pagamento */}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Como deseja pagar?</h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => escolherTipoPag('online')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoPagamento === 'online' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'}`}>
                <span className="text-sm font-semibold text-stone-900">Pagar online</span>
                <span className="text-[10px] text-stone-400">PIX com QR Code</span>
              </button>
              <button type="button" onClick={() => escolherTipoPag('entrega')} className={`flex flex-col items-center gap-1 p-4 border-2 rounded-xl transition-colors ${tipoPagamento === 'entrega' ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'}`}>
                <span className="text-sm font-semibold text-stone-900">Pagar na entrega</span>
                <span className="text-[10px] text-stone-400">Presencial</span>
              </button>
            </div>

            {tipoPagamento === 'online' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 flex items-center gap-2">
                <FiCheck className="text-emerald-600 shrink-0" />
                <span>Pagamento via <strong>PIX</strong> — você receberá o QR Code após confirmar.</span>
              </div>
            )}

            {tipoPagamento === 'entrega' && (
              <div className="grid grid-cols-3 gap-2">
                {[{ value: 'PIX', label: 'PIX' }, { value: 'CREDIT', label: 'Crédito' }, { value: 'DEBIT', label: 'Débito' }, { value: 'CASH', label: 'Dinheiro' }].map((opt) => (
                  <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-colors text-center ${formPedido.forma_pagamento === opt.value ? 'border-amber-500 bg-amber-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <input type="radio" name="forma_pagamento" value={opt.value} checked={formPedido.forma_pagamento === opt.value} onChange={handleFormChange} className="sr-only" />
                    <span className="text-sm font-semibold text-stone-900">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={enviando || totalItens === 0 || !enderecoSel || !formPedido.forma_pagamento} className="w-full py-3.5 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 text-sm">
            {enviando ? 'Enviando...' : `Enviar pedido — R$ ${totalPedido.toFixed(2).replace('.', ',')}`}
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
            className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Botão fixo */}
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-3">
          <button
            onClick={addItemConfigurado}
            disabled={temVariacoes && !variacaoSel}
            className="w-full max-w-lg mx-auto block bg-amber-600 text-white py-3.5 rounded-xl shadow-lg hover:bg-amber-700 disabled:opacity-50 transition-colors font-semibold text-sm"
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
  const horaFecha = loja.horario_fechamento || null

  return (
    <div className="max-w-lg mx-auto pb-24">
      <Link to="/" className="absolute top-4 left-4 z-20 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow text-stone-700 hover:bg-white"><FiChevronLeft /></Link>

      {/* Banner */}
      <div className="relative w-full h-44 bg-stone-200 overflow-hidden">
        <img src={loja.logo_url || ''} alt="" className={`w-full h-full object-cover ${!aberta ? 'grayscale brightness-75' : ''}`} onError={(e) => { e.target.style.display = 'none' }} />
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
            {loja.horario_funcionamento && <p><strong>Funcionamento:</strong> {loja.horario_funcionamento}</p>}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-stretch justify-between bg-white rounded-xl border border-stone-100 divide-x divide-stone-100">
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs text-stone-500"><FiTruck className="text-amber-500 text-[11px]" /><span className="font-semibold text-stone-800">{taxa === 0 ? 'Grátis' : `R$ ${taxa.toFixed(2).replace('.', ',')}`}</span></div><span className="text-[10px] text-stone-400">entrega</span></div>
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs"><FiClock className="text-amber-500 text-[11px]" /><span className="font-semibold text-stone-800">{loja.tempo_entrega || '—'}</span></div><span className="text-[10px] text-stone-400">minutos</span></div>
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs"><span className="font-semibold text-stone-800">R$ 0</span></div><span className="text-[10px] text-stone-400">mínimo</span></div>
          <div className="flex-1 flex flex-col items-center py-3 gap-0.5"><div className="flex items-center gap-1 text-xs text-stone-500"><FiDollarSign className="text-amber-500 text-[11px]" /></div><span className="text-[10px] text-stone-400">pagamento</span></div>
        </div>
      </div>

      {!aberta && <div className="mx-4 mb-4 bg-stone-100 border border-stone-200 rounded-xl p-3.5 text-center"><p className="text-stone-600 font-medium text-sm">Loja fechada no momento</p><p className="text-stone-400 text-xs mt-0.5">{loja.horario_abertura ? `Abre às ${loja.horario_abertura}` : 'Volte mais tarde'}</p></div>}

      <div className="h-2 bg-stone-100" />

      <div className={`px-4 pt-4 ${!aberta ? 'opacity-50 pointer-events-none' : ''}`}>
        {categoriaSel === null ? (
          <>
            <h2 className="text-base font-bold text-stone-900 mb-3">Cardápio</h2>
            <div className="space-y-2">
              {categorias.map((cat) => {
                const qtdCat = produtosPorCategoria[cat].length
                return (
                  <button key={cat} onClick={() => setCategoriaSel(cat)} className="w-full flex items-center gap-3 bg-white rounded-xl border border-stone-100 p-3 hover:bg-stone-50 active:bg-stone-100 transition-colors text-left">
                    <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
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
                        <p className="text-amber-600 font-bold text-sm">
                          {p.variacoes?.length > 0 ? `a partir de R$ ${precoMin.toFixed(2).replace('.', ',')}` : `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}`}
                        </p>
                        {temConfig && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">personalizar</span>}
                      </div>
                    </div>
                    {p.imagem_url && <img src={p.imagem_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                    {qtd > 0 && <span className="w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">{qtd}</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {totalItens > 0 && aberta && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
          <button onClick={irParaCheckout} className="w-full max-w-lg mx-auto flex items-center justify-between bg-amber-600 text-white px-5 py-3.5 rounded-xl shadow-lg hover:bg-amber-700 transition-colors">
            <div className="flex items-center gap-2"><FiShoppingBag /><span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{totalItens}</span></div>
            <span className="font-semibold text-sm">Ver carrinho</span>
            <span className="font-bold">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
