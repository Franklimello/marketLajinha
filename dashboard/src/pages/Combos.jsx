import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiSearch, FiMinus } from 'react-icons/fi'

const EMPTY_FORM = { nome: '', descricao: '', preco: '', imagem_url: '', itens: [] }

export default function Combos() {
  const { loja } = useAuth()
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    try {
      setCombos(await api.combos.listar())
    } catch {} finally { setLoading(false) }
  }, [])

  const carregarProdutos = useCallback(async () => {
    if (!loja) return
    try {
      const res = await api.produtos.listar(loja.id, 1)
      setProdutos(res.dados || res || [])
    } catch {}
  }, [loja])

  useEffect(() => { carregar(); carregarProdutos() }, [carregar, carregarProdutos])

  function precoOriginal(itens) {
    return itens.reduce((s, it) => {
      const prod = it.produto || produtos.find(p => p.id === it.produto_id)
      return s + (Number(prod?.preco) || 0) * (it.quantidade || 1)
    }, 0)
  }

  function abrirModal(combo = null) {
    if (combo) {
      setEditId(combo.id)
      setForm({
        nome: combo.nome,
        descricao: combo.descricao || '',
        preco: Number(combo.preco),
        imagem_url: combo.imagem_url || '',
        itens: combo.itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, produto: i.produto })),
      })
    } else {
      setEditId(null)
      setForm(EMPTY_FORM)
    }
    setErro('')
    setBusca('')
    setModal(true)
  }

  function addProduto(prod) {
    const existe = form.itens.find(i => i.produto_id === prod.id)
    if (existe) {
      setForm(f => ({ ...f, itens: f.itens.map(i => i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i) }))
    } else {
      setForm(f => ({ ...f, itens: [...f.itens, { produto_id: prod.id, quantidade: 1, produto: prod }] }))
    }
  }

  function removerProduto(prodId) {
    setForm(f => ({ ...f, itens: f.itens.filter(i => i.produto_id !== prodId) }))
  }

  function alterarQtd(prodId, delta) {
    setForm(f => ({
      ...f,
      itens: f.itens.map(i => {
        if (i.produto_id !== prodId) return i
        const novaQtd = Math.max(1, i.quantidade + delta)
        return { ...i, quantidade: novaQtd }
      }),
    }))
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (!form.preco || Number(form.preco) <= 0) { setErro('Preço deve ser maior que zero.'); return }
    if (form.itens.length < 2) { setErro('Adicione pelo menos 2 produtos ao combo.'); return }

    setSalvando(true)
    try {
      const data = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        preco: Number(form.preco),
        imagem_url: form.imagem_url,
        itens: form.itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      }
      if (editId) {
        await api.combos.atualizar(editId, data)
      } else {
        await api.combos.criar(data)
      }
      setModal(false)
      carregar()
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  async function handleExcluir(id, nome) {
    if (!confirm(`Excluir combo "${nome}"?`)) return
    try { await api.combos.excluir(id); carregar() } catch {}
  }

  async function toggleAtivo(combo) {
    try {
      await api.combos.atualizar(combo.id, { ativo: !combo.ativo })
      carregar()
    } catch {}
  }

  const produtosFiltrados = produtos.filter(p =>
    p.ativo && p.nome.toLowerCase().includes(busca.toLowerCase()) &&
    !form.itens.find(i => i.produto_id === p.id)
  )

  function fmt(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Combos</h1>
          <p className="text-sm text-stone-500 mt-0.5">Junte produtos com preço especial</p>
        </div>
        <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors">
          <FiPlus size={16} /> Novo combo
        </button>
      </div>

      {combos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <FiPackage className="mx-auto text-stone-300 mb-3" size={48} />
          <p className="text-stone-500 text-sm">Nenhum combo criado.</p>
          <p className="text-stone-400 text-xs mt-1">Crie combos para oferecer preços especiais aos clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {combos.map((c) => {
            const original = precoOriginal(c.itens)
            const economia = original - Number(c.preco)
            return (
              <div key={c.id} className={`bg-white rounded-xl border border-stone-200 p-4 ${!c.ativo ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  {c.imagem_url ? (
                    <img src={c.imagem_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                      <FiPackage className="text-amber-600" size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-stone-900 text-sm truncate">{c.nome}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg font-bold text-amber-600">{fmt(c.preco)}</span>
                      {economia > 0 && (
                        <>
                          <span className="text-xs text-stone-400 line-through">{fmt(original)}</span>
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">-{fmt(economia)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">
                      {c.itens.map(i => `${i.quantidade}x ${i.produto?.nome}`).join(' + ')}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => toggleAtivo(c)} className={`px-2 py-1 text-[11px] font-medium rounded-lg ${c.ativo ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => abrirModal(c)} className="p-2 text-stone-400 hover:text-blue-600"><FiEdit2 size={15} /></button>
                    <button onClick={() => handleExcluir(c.id, c.nome)} className="p-2 text-stone-400 hover:text-red-600"><FiTrash2 size={15} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">{editId ? 'Editar combo' : 'Novo combo'}</h2>
              <button onClick={() => setModal(false)} className="p-1 text-stone-400 hover:text-stone-600"><FiX size={20} /></button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome do combo</label>
                <input type="text" value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none" placeholder="ex: Combo Família" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descrição (opcional)</label>
                <input type="text" value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none" placeholder="Perfeito para 4 pessoas" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">URL da imagem (opcional)</label>
                <input type="text" value={form.imagem_url} onChange={(e) => setForm(f => ({ ...f, imagem_url: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none" placeholder="https://..." />
              </div>

              {/* Produtos do combo */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Produtos do combo</label>

                {form.itens.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {form.itens.map((item) => {
                      const prod = item.produto || produtos.find(p => p.id === item.produto_id)
                      return (
                        <div key={item.produto_id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                          <span className="flex-1 text-sm font-medium text-stone-800 truncate">{prod?.nome || 'Produto'}</span>
                          <span className="text-xs text-stone-500">{fmt(prod?.preco || 0)}</span>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => alterarQtd(item.produto_id, -1)} className="w-6 h-6 flex items-center justify-center bg-white border border-stone-300 rounded-md text-stone-600 hover:bg-stone-100">
                              <FiMinus size={12} />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">{item.quantidade}</span>
                            <button type="button" onClick={() => alterarQtd(item.produto_id, 1)} className="w-6 h-6 flex items-center justify-center bg-white border border-stone-300 rounded-md text-stone-600 hover:bg-stone-100">
                              <FiPlus size={12} />
                            </button>
                          </div>
                          <button type="button" onClick={() => removerProduto(item.produto_id)} className="p-1 text-red-400 hover:text-red-600">
                            <FiX size={14} />
                          </button>
                        </div>
                      )
                    })}
                    <div className="text-right text-xs text-stone-500">
                      Preço separado: <span className="font-semibold line-through">{fmt(precoOriginal(form.itens))}</span>
                    </div>
                  </div>
                )}

                <div className="relative mb-2">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar produto para adicionar..."
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
                  />
                </div>

                {busca && produtosFiltrados.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-xl">
                    {produtosFiltrados.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { addProduto(p); setBusca('') }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-amber-50 transition-colors border-b border-stone-100 last:border-0"
                      >
                        <span className="text-stone-800">{p.nome}</span>
                        <span className="text-xs text-stone-500">{fmt(p.preco)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {form.itens.length < 2 && (
                  <p className="text-xs text-amber-600 mt-1">Adicione pelo menos 2 produtos</p>
                )}
              </div>

              {/* Preço do combo */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Preço do combo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco}
                    onChange={(e) => setForm(f => ({ ...f, preco: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
                {form.preco && form.itens.length >= 2 && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Economia de {fmt(precoOriginal(form.itens) - Number(form.preco))} para o cliente
                  </p>
                )}
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

              <button type="submit" disabled={salvando} className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50">
                {salvando ? 'Salvando...' : editId ? 'Salvar alterações' : 'Criar combo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
