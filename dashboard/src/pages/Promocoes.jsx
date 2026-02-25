import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadImagem } from '../config/firebase'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTag, FiImage, FiCamera, FiPackage } from 'react-icons/fi'

const EMPTY = {
  produto_id: '',
  titulo: '',
  descricao: '',
  preco_promocional: '',
  imagem_url: '',
  ativo: true,
  destaque_inicio: '',
  destaque_fim: '',
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Promocoes() {
  const { loja } = useAuth()
  const [promocoes, setPromocoes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [produtosCarregando, setProdutosCarregando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [imagemFile, setImagemFile] = useState(null)
  const [imagemPreview, setImagemPreview] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  async function carregar() {
    try { setPromocoes(await api.promocoes.listar()) } catch {}
    finally { setLoading(false) }
  }

  async function carregarProdutos() {
    if (!loja?.id) return
    setProdutosCarregando(true)
    try {
      let pagina = 1
      let total = 0
      let acc = []
      do {
        const res = await api.produtos.listar(loja.id, pagina)
        const dados = Array.isArray(res?.dados) ? res.dados : []
        total = Number(res?.total || dados.length || 0)
        acc = [...acc, ...dados]
        pagina += 1
      } while (acc.length < total)
      setProdutos(acc)
    } catch {
      setProdutos([])
    } finally {
      setProdutosCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])
  useEffect(() => { carregarProdutos() }, [loja?.id])

  function abrirModal(promocao = null) {
    if (promocao) {
      setEditando(promocao.id)
      setForm({
        produto_id: promocao.produto_id || '',
        titulo: promocao.titulo || '',
        descricao: promocao.descricao || '',
        preco_promocional: Number(promocao.preco_promocional || 0),
        imagem_url: promocao.imagem_url || '',
        ativo: promocao.ativo ?? true,
        destaque_inicio: toLocalInput(promocao.destaque_inicio),
        destaque_fim: toLocalInput(promocao.destaque_fim),
      })
    } else {
      setEditando(null)
      setForm(EMPTY)
    }
    setImagemFile(null)
    setImagemPreview(null)
    setErro('')
    setModal(true)
  }

  function handleImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Selecione uma imagem válida.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('A imagem deve ter no máximo 5 MB.'); return }
    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
    setErro('')
  }

  function removerImagem() {
    setImagemFile(null)
    setImagemPreview(null)
    setForm((p) => ({ ...p, imagem_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.produto_id) return setErro('Selecione um produto da loja.')
    if (!form.titulo.trim()) return setErro('Título é obrigatório.')
    if (Number(form.preco_promocional) <= 0) return setErro('Preço promocional deve ser maior que zero.')
    setSalvando(true)
    try {
      let imagem_url = form.imagem_url || ''
      if (imagemFile) {
        const path = `promocoes/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
        imagem_url = await uploadImagem(imagemFile, path)
      }
      const payload = {
        produto_id: form.produto_id,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        preco_promocional: Number(form.preco_promocional || 0),
        imagem_url,
        ativo: !!form.ativo,
        destaque_inicio: form.destaque_inicio || undefined,
        destaque_fim: form.destaque_fim || undefined,
      }
      if (editando) await api.promocoes.atualizar(editando, payload)
      else await api.promocoes.criar(payload)
      setModal(false)
      carregar()
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  async function handleExcluir(id) {
    if (!confirm('Excluir esta promoção?')) return
    try { await api.promocoes.excluir(id); carregar() } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Promoções</h1>
          <p className="text-sm text-stone-500 mt-0.5">Crie ofertas para destacar na sua loja</p>
        </div>
        <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
          <FiPlus /> Nova promoção
        </button>
      </div>

      {promocoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiTag className="text-4xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Nenhuma promoção criada ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {promocoes.map((p) => (
            <div key={p.id} className={`bg-white rounded-xl border border-stone-200 p-4 ${!p.ativo ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                {(p.imagem_url || p.produto?.imagem_url) ? (
                  <img src={p.imagem_url || p.produto?.imagem_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><FiTag /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-stone-900 truncate">{p.titulo}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {p.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {p.descricao && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{p.descricao}</p>}
                  {p.produto?.nome && (
                    <p className="text-xs text-stone-500 mt-1 inline-flex items-center gap-1">
                      <FiPackage className="text-stone-400" />
                      Produto: {p.produto.nome}
                    </p>
                  )}
                  {Number(p.preco_promocional) > 0 && (
                    <p className="text-sm font-bold text-amber-600 mt-1">R$ {Number(p.preco_promocional).toFixed(2).replace('.', ',')}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => abrirModal(p)} className="p-2 rounded-lg hover:bg-stone-100"><FiEdit2 className="text-stone-400" /></button>
                  <button onClick={() => handleExcluir(p.id)} className="p-2 rounded-lg hover:bg-red-50"><FiTrash2 className="text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModal(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">{editando ? 'Editar promoção' : 'Nova promoção'}</h2>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-stone-100 rounded-lg"><FiX /></button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              {erro && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{erro}</p>}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Produto da promoção</label>
                <select
                  value={form.produto_id}
                  onChange={(e) => {
                    const produtoId = e.target.value
                    const produtoSel = produtos.find((p) => p.id === produtoId)
                    setForm((p) => ({
                      ...p,
                      produto_id: produtoId,
                      titulo: p.titulo || produtoSel?.nome || '',
                      imagem_url: p.imagem_url || produtoSel?.imagem_url || '',
                    }))
                  }}
                  required
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white"
                >
                  <option value="">{produtosCarregando ? 'Carregando produtos...' : 'Selecione um produto'}</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — R$ {Number(p.preco || 0).toFixed(2).replace('.', ',')} {!p.ativo ? '(inativo)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Título</label>
                <input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} required className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">Imagem da promoção</label>
                <div className="flex items-center gap-3">
                  {(imagemPreview || form.imagem_url) ? (
                    <div className="relative">
                      <img src={imagemPreview || form.imagem_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-stone-200" />
                      <button type="button" onClick={removerImagem} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"><FiX /></button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-300"><FiImage /></div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-xs font-medium text-stone-700"><FiImage /> Galeria</button>
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-xs font-medium text-amber-700"><FiCamera /> Câmera</button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagem} className="hidden" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImagem} className="hidden" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Preço promocional (R$)</label>
                <input type="number" step="0.01" min="0" value={form.preco_promocional} onChange={(e) => setForm((p) => ({ ...p, preco_promocional: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Início do destaque</label>
                  <input type="datetime-local" value={form.destaque_inicio} onChange={(e) => setForm((p) => ({ ...p, destaque_inicio: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Fim do destaque</label>
                  <input type="datetime-local" value={form.destaque_fim} onChange={(e) => setForm((p) => ({ ...p, destaque_fim: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.ativo} onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))} className="w-4 h-4 rounded border-stone-300 text-amber-600" />
                <span className="text-sm text-stone-700">Promoção ativa</span>
              </label>
              <button type="submit" disabled={salvando} className="w-full py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 text-sm">
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar promoção'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
