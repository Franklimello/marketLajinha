import { Fragment, useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { uploadImagem } from '../config/firebase'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiPackage, FiSearch, FiMinus, FiUpload, FiCamera, FiImage, FiCheck } from 'react-icons/fi'

const EMPTY_FORM = { nome: '', descricao: '', preco: '', itens: [] }
const MAX_COMBO_IMAGES = 4

function sanitizeUrls(urls) {
  return [...new Set((urls || []).map((u) => String(u || '').trim()).filter(Boolean))].slice(0, MAX_COMBO_IMAGES)
}

function comboImages(combo) {
  return sanitizeUrls([
    ...(Array.isArray(combo?.imagens_urls) ? combo.imagens_urls : []),
    combo?.imagem_url || '',
    ...(combo?.itens || []).map((i) => i?.produto?.imagem_url || ''),
  ])
}

function ComboImageRow({ images, small = false }) {
  if (!images?.length) {
    return (
      <div className={`${small ? 'w-16 h-16' : 'w-24 h-24'} rounded-xl bg-linear-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0`}>
        <FiPackage className="text-amber-600" size={small ? 20 : 24} />
      </div>
    )
  }

  return (
    <div className={`flex items-center ${small ? 'gap-1' : 'gap-1.5'} min-h-[64px]`}>
      {images.slice(0, MAX_COMBO_IMAGES).map((url, idx, arr) => (
        <Fragment key={`${url}-${idx}`}>
          <img
            src={url}
            alt=""
            className={`${small ? 'w-12 h-12 rounded-lg' : 'w-16 h-16 rounded-xl'} object-cover border border-stone-200 shrink-0`}
          />
          {idx < arr.length - 1 && <span className={`font-bold ${small ? 'text-stone-300 text-sm' : 'text-stone-300'}`}>+</span>}
        </Fragment>
      ))}
    </div>
  )
}

export default function Combos() {
  const { loja } = useAuth()
  const [combos, setCombos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [imagensSlots, setImagensSlots] = useState([])

  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  function limparImagensSlots() {
    setImagensSlots((prev) => {
      prev.forEach((img) => {
        if (img.tipo === 'file' && img.preview) URL.revokeObjectURL(img.preview)
      })
      return []
    })
  }

  function fecharModal() {
    limparImagensSlots()
    setModal(false)
  }

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
    limparImagensSlots()
    if (combo) {
      setEditId(combo.id)
      setForm({
        nome: combo.nome,
        descricao: combo.descricao || '',
        preco: Number(combo.preco),
        itens: combo.itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, produto: i.produto })),
      })
      const urls = comboImages(combo)
      setImagensSlots(urls.map((url) => ({ tipo: 'url', url })))
    } else {
      setEditId(null)
      setForm(EMPTY_FORM)
    }
    setErro('')
    setBusca('')
    setModal(true)
  }

  function adicionarArquivos(filesList) {
    const files = Array.from(filesList || [])
    if (!files.length) return
    const slotsLivres = MAX_COMBO_IMAGES - imagensSlots.length
    if (slotsLivres <= 0) {
      setErro('Você pode enviar no máximo 4 fotos por combo.')
      return
    }

    const paraAdicionar = []
    let mensagemErro = ''
    for (const file of files.slice(0, slotsLivres)) {
      if (!file.type.startsWith('image/')) {
        mensagemErro = 'Use apenas imagens JPG, PNG ou WebP.'
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        mensagemErro = 'Cada imagem deve ter no máximo 5 MB.'
        continue
      }
      paraAdicionar.push({ tipo: 'file', file, preview: URL.createObjectURL(file) })
    }

    if (paraAdicionar.length) {
      setImagensSlots((prev) => [...prev, ...paraAdicionar].slice(0, MAX_COMBO_IMAGES))
      setErro('')
    } else if (mensagemErro) {
      setErro(mensagemErro)
    }
  }

  function handleFileChange(e) {
    adicionarArquivos(e.target.files)
    e.target.value = ''
  }

  function removerImagem(index) {
    setImagensSlots((prev) => {
      const alvo = prev[index]
      if (alvo?.tipo === 'file' && alvo.preview) URL.revokeObjectURL(alvo.preview)
      return prev.filter((_, i) => i !== index)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
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
      const imagens_urls = []
      for (const img of imagensSlots) {
        if (img.tipo === 'url') {
          imagens_urls.push(img.url)
          continue
        }
        if (img.tipo === 'file' && img.file) {
          const path = `combos/${loja.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
          const uploaded = await uploadImagem(img.file, path)
          imagens_urls.push(uploaded)
        }
      }

      const imagensDosProdutos = sanitizeUrls(
        form.itens
          .map((i) => (i.produto || produtos.find((p) => p.id === i.produto_id))?.imagem_url)
      )
      const imagensFinal = sanitizeUrls(imagens_urls.length ? imagens_urls : imagensDosProdutos)
      const data = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        preco: Number(form.preco),
        imagem_url: imagensFinal[0] || '',
        imagens_urls: imagensFinal,
        itens: form.itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      }
      if (editId) {
        await api.combos.atualizar(editId, data)
      } else {
        await api.combos.criar(data)
      }
      fecharModal()
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
    p.ativo && p.nome.toLowerCase().includes(busca.toLowerCase())
  )

  function fmt(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

  useEffect(() => () => {
    limparImagensSlots()
  }, [])

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
            const imagens = comboImages(c)
            return (
              <div key={c.id} className={`bg-white rounded-xl border border-stone-200 p-4 ${!c.ativo ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <ComboImageRow images={imagens} small />
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
                  <div className="flex gap-1 shrink-0">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={fecharModal}>
          <div className="bg-white rounded-2xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">{editId ? 'Editar combo' : 'Novo combo'}</h2>
              <button onClick={fecharModal} className="p-1 text-stone-400 hover:text-stone-600"><FiX size={20} /></button>
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
                <label className="block text-sm font-medium text-stone-700 mb-2">Fotos do combo (até 4)</label>
                <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                  <ComboImageRow images={imagensSlots.map((img) => (img.tipo === 'file' ? img.preview : img.url))} />
                  {!!imagensSlots.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {imagensSlots.map((img, idx) => (
                        <button
                          key={`${idx}-${img.tipo}`}
                          type="button"
                          onClick={() => removerImagem(idx)}
                          className="text-[11px] px-2 py-1 rounded-md bg-white border border-stone-200 text-stone-600 hover:text-red-600"
                        >
                          Remover foto {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors"
                  >
                    <FiImage className="text-sm" /> Galeria
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-medium text-amber-700 transition-colors"
                  >
                    <FiCamera className="text-sm" /> Câmera
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5">
                  Se você não enviar fotos, o sistema usa automaticamente as imagens dos produtos selecionados.
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
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

                <div className="max-h-52 overflow-y-auto border border-stone-200 rounded-xl p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {produtosFiltrados.slice(0, 30).map((p) => {
                    const selecionado = !!form.itens.find((i) => i.produto_id === p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduto(p)}
                        className={`text-left rounded-lg border p-2 transition-colors ${
                          selecionado ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-amber-300 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt="" className="w-9 h-9 rounded-md object-cover border border-stone-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                              <FiPackage size={14} className="text-stone-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-stone-800 truncate">{p.nome}</p>
                            <p className="text-[11px] text-stone-500">{fmt(p.preco)}</p>
                          </div>
                          {selecionado && <FiCheck className="text-amber-600 shrink-0" size={14} />}
                        </div>
                      </button>
                    )
                  })}
                  {produtosFiltrados.length === 0 && (
                    <p className="text-xs text-stone-500 px-1 py-2 col-span-full">Nenhum produto encontrado para o filtro atual.</p>
                  )}
                </div>

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
