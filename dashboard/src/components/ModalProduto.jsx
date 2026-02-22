import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { uploadImagem } from '../config/firebase'
import { FiUpload, FiCamera, FiPlus, FiTrash2 } from 'react-icons/fi'

export default function ModalProduto({ lojaId, produto, categoriaInicial, categoriasExistentes = [], onFechar, onSalvo }) {
  const [form, setForm] = useState({
    nome: '', descricao: '', preco: 0, estoque: 0,
    imagem_url: '', categoria: categoriaInicial || '', setor_impressao: '', ativo: true,
  })
  const [variacoes, setVariacoes] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [imagemFile, setImagemFile] = useState(null)
  const [imagemPreview, setImagemPreview] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('info')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (produto) {
      setForm({
        nome: produto.nome || '', descricao: produto.descricao || '',
        preco: Number(produto.preco) || 0, estoque: produto.estoque ?? 0,
        imagem_url: produto.imagem_url || '',
        categoria: produto.categoria || categoriaInicial || '',
        setor_impressao: produto.setor_impressao || '',
        ativo: produto.ativo ?? true,
      })
      setVariacoes((produto.variacoes || []).map((v) => ({ nome: v.nome, preco: Number(v.preco) })))
      setAdicionais((produto.adicionais || []).map((a) => ({ nome: a.nome, preco: Number(a.preco) })))
      setImagemFile(null)
      setImagemPreview(null)
    } else {
      setForm({
        nome: '', descricao: '', preco: 0, estoque: 0,
        imagem_url: '', categoria: categoriaInicial || '', setor_impressao: '', ativo: true,
      })
      setVariacoes([])
      setAdicionais([])
    }
  }, [produto, categoriaInicial])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : ['preco', 'estoque'].includes(name) ? (parseFloat(value) || 0) : value,
    }))
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Selecione um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem deve ter no máximo 5 MB.'); return }
    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
    setErro('')
  }

  function removerImagem() {
    setImagemFile(null)
    setImagemPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Variações
  function addVariacao() { setVariacoes((prev) => [...prev, { nome: '', preco: 0 }]) }
  function removeVariacao(i) { setVariacoes((prev) => prev.filter((_, idx) => idx !== i)) }
  function handleVariacaoChange(i, field, value) {
    setVariacoes((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: field === 'preco' ? (parseFloat(value) || 0) : value } : v))
  }

  // Adicionais
  function addAdicional() { setAdicionais((prev) => [...prev, { nome: '', preco: 0 }]) }
  function removeAdicional(i) { setAdicionais((prev) => prev.filter((_, idx) => idx !== i)) }
  function handleAdicionalChange(i, field, value) {
    setAdicionais((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: field === 'preco' ? (parseFloat(value) || 0) : value } : a))
  }

  const imagemExibida = imagemPreview || form.imagem_url

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      let imagem_url = form.imagem_url
      if (imagemFile) {
        const path = `produtos/${lojaId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
        imagem_url = await uploadImagem(imagemFile, path)
      }

      const variacoesLimpas = variacoes.filter((v) => v.nome.trim())
      const adicionaisLimpos = adicionais.filter((a) => a.nome.trim())
      const dados = { ...form, imagem_url, variacoes: variacoesLimpas, adicionais: adicionaisLimpos }

      if (produto) {
        await api.produtos.atualizar(produto.id, dados)
      } else {
        await api.produtos.criar({ ...dados, loja_id: lojaId })
      }
      onSalvo()
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const abas = [
    { id: 'info', label: 'Informações' },
    { id: 'tamanhos', label: `Tamanhos (${variacoes.length})` },
    { id: 'adicionais', label: `Adicionais (${adicionais.length})` },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-stone-900">
            {produto ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button onClick={onFechar} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-stone-200 px-5 flex-shrink-0">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                abaAtiva === aba.id ? 'border-amber-500 text-amber-700' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ABA INFO */}
          {abaAtiva === 'info' && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Foto do produto</label>
                <div className="flex items-start gap-4">
                  {imagemExibida ? (
                    <div className="relative">
                      <img src={imagemExibida} alt="Preview" className="w-24 h-24 rounded-xl object-cover border-2 border-stone-200" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 shadow">
                        <FiCamera className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-amber-400 hover:bg-amber-50/50 cursor-pointer">
                      <FiUpload className="text-lg text-stone-400" />
                      <span className="text-xs text-stone-400">Enviar</span>
                    </button>
                  )}
                  <div className="flex-1 text-sm text-stone-500 pt-1">
                    <p>JPG, PNG ou WebP (máx. 5 MB)</p>
                    {imagemFile && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Nova imagem</span>
                        <button type="button" onClick={removerImagem} className="text-xs text-red-500 hover:underline">Cancelar</button>
                      </div>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome *</label>
                <input name="nome" value={form.nome} onChange={handleChange} required placeholder="ex: X-Burguer" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descrição / Ingredientes</label>
                <textarea name="descricao" value={form.descricao} onChange={handleChange} rows={3} placeholder="ex: pão, bife, maionese, milho, alface..." className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Categoria *</label>
                {!novaCategoria && categoriasExistentes.length > 0 ? (
                  <div className="space-y-2">
                    <select name="categoria" value={form.categoria} onChange={handleChange} required className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm">
                      <option value="">Selecione uma categoria</option>
                      {categoriasExistentes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => { setNovaCategoria(true); setForm((p) => ({ ...p, categoria: '' })) }} className="text-xs text-amber-600 hover:underline">+ Criar nova categoria</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input name="categoria" value={form.categoria} onChange={handleChange} required placeholder="ex: Hambúrgueres Tradicionais" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                    {categoriasExistentes.length > 0 && (
                      <button type="button" onClick={() => setNovaCategoria(false)} className="text-xs text-amber-600 hover:underline">Escolher existente</button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Setor de impressão</label>
                <div className="space-y-2">
                  <select
                    name="setor_impressao"
                    value={form.setor_impressao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="">Nenhum (não imprime)</option>
                    <option value="COZINHA">Cozinha</option>
                    <option value="BAR">Bar</option>
                    <option value="PIZZARIA">Pizzaria</option>
                    <option value="CONFEITARIA">Confeitaria</option>
                    <option value="BALCAO">Balcão</option>
                    <option value="GERAL">Geral</option>
                  </select>
                  <p className="text-xs text-stone-400">Define para qual impressora o item vai quando o pedido for aprovado</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Preço base (R$) {variacoes.length > 0 && <span className="text-stone-400 font-normal">(sem tamanhos)</span>}
                  </label>
                  <input name="preco" type="number" step="0.01" min="0" value={form.preco} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Estoque</label>
                  <input name="estoque" type="number" min="0" value={form.estoque} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                </div>
              </div>
              {variacoes.length > 0 && (
                <p className="text-xs text-stone-400">Quando há tamanhos, o preço base é ignorado — cada tamanho tem seu preço.</p>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} className="rounded text-amber-600 focus:ring-amber-500" />
                <span className="text-sm font-medium text-stone-700">Produto ativo</span>
              </label>
            </>
          )}

          {/* ABA TAMANHOS */}
          {abaAtiva === 'tamanhos' && (
            <>
              <p className="text-xs text-stone-400">
                Defina tamanhos/variações para este produto. Ex: P, M, G ou 300ml, 500ml. Cada tamanho tem seu preço próprio.
              </p>
              <div className="space-y-2">
                {variacoes.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={v.nome}
                      onChange={(e) => handleVariacaoChange(i, 'nome', e.target.value)}
                      placeholder="Nome (ex: G)"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.preco}
                        onChange={(e) => handleVariacaoChange(i, 'preco', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button type="button" onClick={() => removeVariacao(i)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addVariacao} className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
                <FiPlus /> Adicionar tamanho
              </button>
            </>
          )}

          {/* ABA ADICIONAIS */}
          {abaAtiva === 'adicionais' && (
            <>
              <p className="text-xs text-stone-400">
                Defina adicionais opcionais. O cliente pode escolher vários. Ex: Cheddar, Bacon, Bife extra.
              </p>
              <div className="space-y-2">
                {adicionais.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={a.nome}
                      onChange={(e) => handleAdicionalChange(i, 'nome', e.target.value)}
                      placeholder="Nome (ex: Cheddar)"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={a.preco}
                        onChange={(e) => handleAdicionalChange(i, 'preco', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button type="button" onClick={() => removeAdicional(i)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addAdicional} className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
                <FiPlus /> Adicionar item
              </button>
            </>
          )}

          {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{erro}</p>}
          <button type="submit" disabled={carregando} className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {carregando ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  )
}
