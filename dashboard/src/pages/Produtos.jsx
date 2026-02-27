import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import ModalProduto from '../components/ModalProduto'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiPackage, FiStar, FiX, FiTag } from 'react-icons/fi'

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function produtoTemPromocaoAtiva(produto) {
  return !!produto?.em_promocao && Number(produto?.preco_promocional || 0) > 0
}

/** Toggle switch simples */
function ToggleSwitch({ checked, onChange, title, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={`relative inline-flex items-center shrink-0 h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-amber-500' : 'bg-stone-300'
        }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'
          }`}
      />
    </button>
  )
}

export default function Produtos() {
  const { loja } = useAuth()
  const [todosProdutos, setTodosProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState(null)
  const [categoriaModal, setCategoriaModal] = useState('')
  const [busca, setBusca] = useState('')
  const [categoriasAbertas, setCategoriasAbertas] = useState({})
  const [modalCategoria, setModalCategoria] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [modalEditarCategoria, setModalEditarCategoria] = useState(false)
  const [categoriaAtualEdicao, setCategoriaAtualEdicao] = useState('')
  const [categoriaNovoNome, setCategoriaNovoNome] = useState('')
  const [salvandoEdicaoCategoria, setSalvandoEdicaoCategoria] = useState(false)
  const [produtoPromocao, setProdutoPromocao] = useState(null)
  const [precoPromocionalInput, setPrecoPromocionalInput] = useState('')
  const [salvandoPromocao, setSalvandoPromocao] = useState(false)

  // Categorias desativadas (nomes em um Set para lookup O(1))
  const [catsDesativadas, setCatsDesativadas] = useState(new Set())
  const [salvandoCatToggle, setSalvandoCatToggle] = useState(false)

  // Produtos com toggle em loading
  const [produtoToggleLoading, setProdutoToggleLoading] = useState(new Set())

  useEffect(() => {
    if (loja) carregarProdutos()
  }, [loja])

  async function carregarProdutos() {
    setCarregando(true)
    try {
      const res = await api.produtos.listar(loja.id, 1)
      const dados = res.dados || []
      setTodosProdutos(dados)
      const abertos = {}
      dados.forEach((p) => {
        if (p.categoria && abertos[p.categoria] === undefined) abertos[p.categoria] = false
      })
      abertos[''] = false
      setCategoriasAbertas((prev) => ({ ...abertos, ...prev }))
    } catch {
      setTodosProdutos([])
    } finally {
      setCarregando(false)
    }

    // Carrega categorias desativadas da loja
    try {
      const minhaLoja = await api.lojas.minha()
      let parsed = []
      try { parsed = JSON.parse(minhaLoja.categorias_desativadas || '[]') } catch { parsed = [] }
      if (!Array.isArray(parsed)) parsed = []
      setCatsDesativadas(new Set(parsed.filter((c) => typeof c === 'string')))
    } catch {
      // silencioso — mantém estado atual
    }
  }

  const categorias = useMemo(() => {
    const cats = new Set(todosProdutos.map((p) => p.categoria || '').filter(Boolean))
    return [...cats].sort()
  }, [todosProdutos])

  const semCategoria = useMemo(() => {
    return todosProdutos.filter((p) => !p.categoria)
  }, [todosProdutos])

  const produtosDestaque = useMemo(() => {
    return todosProdutos
      .filter((p) => p.destaque === true)
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
  }, [todosProdutos])

  const produtosFiltrados = useMemo(() => {
    if (!busca) return todosProdutos
    const q = busca.toLowerCase()
    return todosProdutos.filter(
      (p) => p.nome?.toLowerCase().includes(q) || p.descricao?.toLowerCase().includes(q) || p.categoria?.toLowerCase().includes(q)
    )
  }, [todosProdutos, busca])

  const porCategoria = useMemo(() => {
    const map = {}
    produtosFiltrados.forEach((p) => {
      const cat = p.categoria || ''
      if (!map[cat]) map[cat] = []
      map[cat].push(p)
    })
    return map
  }, [produtosFiltrados])

  const categoriasOrdenadas = useMemo(() => {
    const cats = Object.keys(porCategoria).filter(Boolean).sort()
    if (porCategoria['']) cats.push('')
    return cats
  }, [porCategoria])

  function toggleCategoria(cat) {
    setCategoriasAbertas((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  async function handleExcluir(id) {
    if (!confirm('Excluir este produto?')) return
    try {
      await api.produtos.excluir(id)
      setTodosProdutos((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  async function removerDestaqueRapido(produto) {
    if (!produto?.id) return
    try {
      await api.produtos.atualizar(produto.id, { destaque: false })
      setTodosProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, destaque: false } : p))
      )
    } catch (err) {
      alert(err.message || 'Não foi possível remover o destaque.')
    }
  }

  function abrirModalPromocao(produto) {
    if ((produto?.variacoes || []).length > 0) {
      alert('Para produto com tamanhos/variações, ajuste os preços nas próprias variações.')
      return
    }
    setProdutoPromocao(produto)
    setPrecoPromocionalInput(Number(produto?.preco_promocional || 0) > 0 ? String(produto.preco_promocional) : '')
  }

  function fecharModalPromocao() {
    if (salvandoPromocao) return
    setProdutoPromocao(null)
    setPrecoPromocionalInput('')
  }

  async function salvarPromocaoProduto() {
    if (!produtoPromocao?.id) return
    const precoBase = Number(produtoPromocao.preco || 0)
    const precoPromo = Number(precoPromocionalInput || 0)

    if (!(precoPromo > 0)) {
      alert('Informe um preço promocional maior que zero.')
      return
    }
    if (precoPromo >= precoBase) {
      alert('O preço promocional deve ser menor que o preço original.')
      return
    }

    setSalvandoPromocao(true)
    try {
      const atualizado = await api.produtos.atualizar(produtoPromocao.id, {
        em_promocao: true,
        preco_promocional: precoPromo,
      })
      setTodosProdutos((prev) => prev.map((p) => (p.id === atualizado.id ? { ...p, ...atualizado } : p)))
      fecharModalPromocao()
    } catch (err) {
      alert(err.message || 'Não foi possível ativar a promoção.')
    } finally {
      setSalvandoPromocao(false)
    }
  }

  async function desfazerPromocaoProduto(produto) {
    if (!produto?.id) return
    if (!confirm(`Desfazer promoção de "${produto.nome}"?`)) return
    try {
      const atualizado = await api.produtos.atualizar(produto.id, {
        em_promocao: false,
        preco_promocional: 0,
      })
      setTodosProdutos((prev) => prev.map((p) => (p.id === atualizado.id ? { ...p, ...atualizado } : p)))
    } catch (err) {
      alert(err.message || 'Não foi possível desfazer a promoção.')
    }
  }

  /** Toggle ativo/inativo de um produto */
  const handleToggleProduto = useCallback(async (produto, novoValor) => {
    if (produtoToggleLoading.has(produto.id)) return
    setProdutoToggleLoading((prev) => new Set([...prev, produto.id]))
    // Otimista
    setTodosProdutos((prev) =>
      prev.map((p) => (p.id === produto.id ? { ...p, ativo: novoValor } : p))
    )
    try {
      await api.produtos.atualizar(produto.id, { ativo: novoValor })
    } catch (err) {
      // Reverte
      setTodosProdutos((prev) =>
        prev.map((p) => (p.id === produto.id ? { ...p, ativo: !novoValor } : p))
      )
      alert(err.message || 'Não foi possível alterar o status do produto.')
    } finally {
      setProdutoToggleLoading((prev) => {
        const next = new Set(prev)
        next.delete(produto.id)
        return next
      })
    }
  }, [produtoToggleLoading])

  /** Toggle ativo/inativo de uma categoria */
  const handleToggleCategoria = useCallback(async (cat, ativar) => {
    if (!loja?.id || salvandoCatToggle) return
    setSalvandoCatToggle(true)

    const novasCats = new Set(catsDesativadas)
    if (ativar) {
      novasCats.delete(cat)
    } else {
      novasCats.add(cat)
    }

    // Otimista
    setCatsDesativadas(novasCats)

    try {
      await api.lojas.atualizarCategoriasDesativadas(loja.id, [...novasCats])
    } catch (err) {
      // Reverte
      setCatsDesativadas(catsDesativadas)
      alert(err.message || 'Não foi possível alterar o status da categoria.')
    } finally {
      setSalvandoCatToggle(false)
    }
  }, [loja, catsDesativadas, salvandoCatToggle])

  function abrirNovoProduto(categoria = '') {
    setProdutoEditando(null)
    setCategoriaModal(categoria)
    setModalAberto(true)
  }

  function abrirEditar(p) {
    setProdutoEditando(p)
    setCategoriaModal(p.categoria || '')
    setModalAberto(true)
  }

  function handleSalvo(produtoSalvo, isNovo) {
    setModalAberto(false)
    setProdutoEditando(null)
    setCategoriaModal('')
    if (isNovo) {
      // Produto novo: busca a lista completa para incluí-lo na posição certa
      carregarProdutos()
    } else if (produtoSalvo) {
      // Edição: atualiza apenas o produto alterado no estado local — sem refetch
      setTodosProdutos((prev) =>
        prev.map((p) => (p.id === produtoSalvo.id ? { ...p, ...produtoSalvo } : p))
      )
    }
  }

  function criarCategoria() {
    if (!novaCategoriaNome.trim()) return
    setModalCategoria(false)
    abrirNovoProduto(novaCategoriaNome.trim())
    setNovaCategoriaNome('')
  }

  function abrirEditarCategoria(categoria) {
    setCategoriaAtualEdicao(categoria)
    setCategoriaNovoNome(categoria)
    setModalEditarCategoria(true)
  }

  function fecharEditarCategoria() {
    if (salvandoEdicaoCategoria) return
    setModalEditarCategoria(false)
    setCategoriaAtualEdicao('')
    setCategoriaNovoNome('')
  }

  async function salvarEdicaoCategoria() {
    const origem = String(categoriaAtualEdicao || '').trim()
    const destino = String(categoriaNovoNome || '').trim()

    if (!origem || !destino) return
    if (origem === destino) {
      fecharEditarCategoria()
      return
    }

    const produtosDaCategoria = todosProdutos.filter((p) => String(p.categoria || '').trim() === origem)
    if (!produtosDaCategoria.length) {
      fecharEditarCategoria()
      return
    }

    setSalvandoEdicaoCategoria(true)
    try {
      await Promise.all(
        produtosDaCategoria.map((p) => api.produtos.atualizar(p.id, { categoria: destino }))
      )

      setTodosProdutos((prev) =>
        prev.map((p) =>
          String(p.categoria || '').trim() === origem ? { ...p, categoria: destino } : p
        )
      )

      // Atualiza categorias desativadas se a categoria renomeada estava desativada
      if (catsDesativadas.has(origem)) {
        const novasCats = new Set(catsDesativadas)
        novasCats.delete(origem)
        novasCats.add(destino)
        setCatsDesativadas(novasCats)
        await api.lojas.atualizarCategoriasDesativadas(loja.id, [...novasCats]).catch(() => { })
      }

      setCategoriasAbertas((prev) => {
        const next = { ...prev }
        const estavaAberta = prev[origem] !== false
        delete next[origem]
        if (next[destino] === undefined) next[destino] = estavaAberta
        return next
      })

      fecharEditarCategoria()
    } catch (err) {
      alert(err.message || 'Não foi possível renomear a categoria.')
    } finally {
      setSalvandoEdicaoCategoria(false)
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Cardápio</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {todosProdutos.length} produto(s) em {categorias.length} categoria(s)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalCategoria(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border border-stone-200 text-stone-700 font-medium rounded-lg hover:bg-stone-50 transition-colors text-xs sm:text-sm"
          >
            <FiPlus /> Categoria
          </button>
          <button
            onClick={() => abrirNovoProduto('')}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors text-xs sm:text-sm"
          >
            <FiPlus /> Produto
          </button>
        </div>
      </div>

      {/* Busca */}
      {todosProdutos.length > 0 && (
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar produto por nome, descrição ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          />
        </div>
      )}

      {/* Sessão de destaques para desmarcar rápido */}
      {produtosDestaque.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiStar className="text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900">Produtos em destaque</h2>
            <span className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
              {produtosDestaque.length}
            </span>
          </div>
          <p className="text-xs text-stone-500 mb-3">
            Use esta área para remover rapidamente produtos marcados como destaque.
          </p>
          <div className="flex flex-wrap gap-2">
            {produtosDestaque.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => removerDestaqueRapido(p)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-amber-200 text-stone-700 rounded-lg text-xs hover:bg-amber-100 transition-colors"
                title={`Remover destaque de ${p.nome}`}
              >
                <span className="max-w-[180px] truncate">{p.nome}</span>
                <FiX className="text-amber-700" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categorias agrupadas */}
      {todosProdutos.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiPackage className="text-4xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium mb-1">Nenhum produto cadastrado</p>
          <p className="text-stone-400 text-sm mb-4">
            Comece criando uma categoria (ex: "Hambúrgueres Tradicionais") e adicione os produtos dentro dela.
          </p>
          <button
            onClick={() => setModalCategoria(true)}
            className="px-5 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors text-sm"
          >
            Criar primeira categoria
          </button>
        </div>
      ) : categoriasOrdenadas.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-stone-400">Nenhum resultado para "{busca}"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoriasOrdenadas.map((cat) => {
            const produtos = porCategoria[cat] || []
            const aberta = categoriasAbertas[cat] === true
            const nomeCategoria = cat || 'Sem categoria'
            const catDesativada = cat ? catsDesativadas.has(cat) : false

            return (
              <div
                key={cat}
                className={`bg-white rounded-xl border overflow-hidden transition-opacity ${catDesativada ? 'border-stone-200 opacity-60' : 'border-stone-200'
                  }`}
              >
                {/* Header da categoria */}
                <button
                  onClick={() => toggleCategoria(cat)}
                  className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <h2 className="font-semibold text-stone-900 text-lg truncate">{nomeCategoria}</h2>
                    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full shrink-0">
                      {produtos.length} item(ns)
                    </span>
                    {catDesativada && (
                      <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                        Inativa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle de categoria — só para categorias nomeadas */}
                    {cat && (
                      <div className="flex items-center gap-1.5" title={catDesativada ? 'Ativar categoria' : 'Desativar categoria'}>
                        <ToggleSwitch
                          checked={!catDesativada}
                          onChange={(ativar) => handleToggleCategoria(cat, ativar)}
                          title={catDesativada ? 'Ativar categoria no cardápio' : 'Desativar categoria no cardápio'}
                          disabled={salvandoCatToggle}
                        />
                      </div>
                    )}
                    {cat && (
                      <span
                        onClick={(e) => { e.stopPropagation(); abrirNovoProduto(cat) }}
                        className="text-xs text-amber-600 hover:text-amber-700 hover:underline px-2 py-1"
                      >
                        + Adicionar
                      </span>
                    )}
                    {cat && (
                      <span
                        onClick={(e) => { e.stopPropagation(); abrirEditarCategoria(cat) }}
                        className="text-xs text-stone-500 hover:text-amber-700 hover:underline px-2 py-1"
                      >
                        Renomear
                      </span>
                    )}
                    {aberta ? (
                      <FiChevronUp className="text-stone-400" />
                    ) : (
                      <FiChevronDown className="text-stone-400" />
                    )}
                  </div>
                </button>

                {/* Produtos da categoria */}
                {aberta && (
                  <div className="border-t border-stone-100 divide-y divide-stone-50">
                    {produtos.map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-stone-50/50 transition-colors ${!p.ativo ? 'opacity-50' : ''
                          }`}
                      >
                        {(() => {
                          const temPromocao = produtoTemPromocaoAtiva(p)
                          return (
                            <>
                        {p.imagem_url ? (
                          <img src={p.imagem_url} alt={p.nome} className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                            <FiPackage className="text-stone-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-stone-900 text-sm sm:text-base truncate">{p.nome}</h3>
                            {!p.ativo && (
                              <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full shrink-0">Inativo</span>
                            )}
                          </div>
                          {p.descricao && (
                            <p className="text-xs sm:text-sm text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-2">{p.descricao}</p>
                          )}
                          <div className="mt-0.5 sm:hidden">
                            {temPromocao ? (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-stone-400 line-through">{formatCurrency(p.preco)}</p>
                                <p className="font-bold text-red-600 text-sm">{formatCurrency(p.preco_promocional)}</p>
                              </div>
                            ) : (
                              <p className="font-bold text-stone-900 text-sm">{formatCurrency(p.preco)}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 hidden sm:block">
                          {temPromocao ? (
                            <>
                              <p className="text-xs text-stone-400 line-through">{formatCurrency(p.preco)}</p>
                              <p className="font-bold text-red-600">{formatCurrency(p.preco_promocional)}</p>
                            </>
                          ) : (
                            <p className="font-bold text-stone-900">{formatCurrency(p.preco)}</p>
                          )}
                          {p.controla_estoque ? (
                            <p className={`text-xs ${p.estoque > 0 ? 'text-stone-400' : 'text-red-500 font-semibold'}`}>
                              Est: {p.estoque}
                            </p>
                          ) : (
                            <p className="text-xs text-stone-300">Sem controle</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {temPromocao ? (
                            <button
                              onClick={() => desfazerPromocaoProduto(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                              title="Desfazer promoção"
                            >
                              Desfazer promoção
                            </button>
                          ) : (
                            <button
                              onClick={() => abrirModalPromocao(p)}
                              className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors inline-flex items-center gap-1"
                              title="Colocar em promoção"
                            >
                              <FiTag className="text-xs" />
                              Promoção
                            </button>
                          )}
                          {/* Toggle ativo/inativo do produto */}
                          <ToggleSwitch
                            checked={p.ativo}
                            onChange={(val) => handleToggleProduto(p, val)}
                            title={p.ativo ? 'Desativar produto' : 'Ativar produto'}
                            disabled={produtoToggleLoading.has(p.id)}
                          />
                          <button
                            onClick={() => abrirEditar(p)}
                            className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <FiEdit2 className="text-base" />
                          </button>
                          <button
                            onClick={() => handleExcluir(p.id)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <FiTrash2 className="text-base" />
                          </button>
                        </div>
                            </>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {produtoPromocao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Colocar em promoção</h2>
              <button onClick={fecharModalPromocao} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-stone-900">{produtoPromocao.nome}</p>
                <p className="text-xs text-stone-500 mt-1">
                  Preço atual: <span className="font-semibold">{formatCurrency(produtoPromocao.preco)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Preço promocional (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoPromocionalInput}
                  onChange={(e) => setPrecoPromocionalInput(e.target.value)}
                  placeholder="Ex: 24.90"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                />
                <p className="text-xs text-stone-400 mt-1">O valor promocional deve ser menor que o preço atual.</p>
              </div>
              <button
                onClick={salvarPromocaoProduto}
                disabled={salvandoPromocao}
                className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {salvandoPromocao ? 'Salvando...' : 'Ativar promoção'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar categoria */}
      {modalCategoria && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Nova categoria</h2>
              <button onClick={() => { setModalCategoria(false); setNovaCategoriaNome('') }} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome da categoria *</label>
                <input
                  value={novaCategoriaNome}
                  onChange={(e) => setNovaCategoriaNome(e.target.value)}
                  placeholder="ex: Hambúrgueres Tradicionais"
                  autoFocus
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && criarCategoria()}
                />
              </div>
              <p className="text-xs text-stone-400">
                Ao criar a categoria, você será direcionado para adicionar o primeiro produto nela.
              </p>
              <button
                onClick={criarCategoria}
                disabled={!novaCategoriaNome.trim()}
                className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                Criar e adicionar produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar categoria */}
      {modalEditarCategoria && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">Editar categoria</h2>
              <button onClick={fecharEditarCategoria} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Novo nome da categoria *</label>
                <input
                  value={categoriaNovoNome}
                  onChange={(e) => setCategoriaNovoNome(e.target.value)}
                  placeholder="ex: Hambúrgueres Tradicionais"
                  autoFocus
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && salvarEdicaoCategoria()}
                />
              </div>
              <p className="text-xs text-stone-400">
                Todos os produtos da categoria "{categoriaAtualEdicao}" serão atualizados para o novo nome.
              </p>
              <button
                onClick={salvarEdicaoCategoria}
                disabled={!categoriaNovoNome.trim() || salvandoEdicaoCategoria}
                className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {salvandoEdicaoCategoria ? 'Salvando...' : 'Salvar categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal produto */}
      {modalAberto && (
        <ModalProduto
          lojaId={loja.id}
          produto={produtoEditando}
          categoriaInicial={categoriaModal}
          categoriasExistentes={categorias}
          onFechar={() => {
            setModalAberto(false)
            setProdutoEditando(null)
            setCategoriaModal('')
          }}
          onSalvo={handleSalvo}
        />
      )}
    </div>
  )
}
