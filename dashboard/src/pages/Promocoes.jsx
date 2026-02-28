import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTag } from 'react-icons/fi'

const EMPTY = {
  produto_id: '',
  preco_promocional: '',
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

  const produtosAtivos = useMemo(
    () => produtos.filter((p) => p.ativo),
    [produtos]
  )

  function abrirModal(promocao = null) {
    if (promocao) {
      setEditando(promocao.id)
      setForm({
        produto_id: promocao.produto_id || '',
        preco_promocional: Number(promocao.preco_promocional || 0),
        ativo: promocao.ativo ?? true,
        destaque_inicio: toLocalInput(promocao.destaque_inicio),
        destaque_fim: toLocalInput(promocao.destaque_fim),
      })
    } else {
      setEditando(null)
      setForm(EMPTY)
    }
    setErro('')
    setModal(true)
  }

  async function handleSalvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.produto_id) return setErro('Selecione um produto da loja.')
    if (Number(form.preco_promocional) <= 0) return setErro('Preço promocional deve ser maior que zero.')
    if (!form.destaque_inicio || !form.destaque_fim) return setErro('Informe início e fim do período da promoção.')
    if (new Date(form.destaque_fim) <= new Date(form.destaque_inicio)) return setErro('Fim deve ser maior que início.')
    const produtoSelecionado = produtos.find((p) => p.id === form.produto_id)
    if (!produtoSelecionado) return setErro('Produto selecionado não encontrado.')
    if (Number(form.preco_promocional) >= Number(produtoSelecionado.preco || 0)) {
      return setErro('Preço promocional deve ser menor que o preço original do produto.')
    }

    setSalvando(true)
    try {
      const payload = {
        produto_id: form.produto_id,
        preco_promocional: Number(form.preco_promocional || 0),
        ativo: !!form.ativo,
        destaque_inicio: form.destaque_inicio,
        destaque_fim: form.destaque_fim,
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
          <h1 className="text-xl font-bold text-stone-900">Promoções do dia</h1>
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
                    <p className="font-semibold text-stone-900 truncate">{p.produto?.nome || p.titulo}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {p.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {p.destaque_inicio && p.destaque_fim && (
                    <p className="text-xs text-stone-500 mt-1">
                      {new Date(p.destaque_inicio).toLocaleDateString('pt-BR')} até {new Date(p.destaque_fim).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {Number(p.preco_promocional) > 0 && (
                    <div className="mt-1">
                      {Number(p.produto?.preco || 0) > 0 && (
                        <p className="text-xs text-stone-400 line-through font-numeric">
                          R$ {Number(p.produto.preco).toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      <p className="text-sm font-bold text-amber-600 font-numeric">
                        R$ {Number(p.preco_promocional).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
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
                    setForm((p) => ({
                      ...p,
                      produto_id: produtoId,
                    }))
                  }}
                  required
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm bg-white"
                >
                  <option value="">{produtosCarregando ? 'Carregando produtos...' : 'Selecione um produto'}</option>
                  {produtosAtivos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — R$ {Number(p.preco || 0).toFixed(2).replace('.', ',')}
                    </option>
                  ))}
                </select>
              </div>
              {(() => {
                const produto = produtosAtivos.find((p) => p.id === form.produto_id)
                if (!produto) return null
                const precoPromo = Number(form.preco_promocional || 0)
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-3">
                    {produto.imagem_url ? (
                      <img src={produto.imagem_url} alt={produto.nome} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <FiTag />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{produto.nome}</p>
                      <p className="text-xs text-stone-400 line-through font-numeric">
                        R$ {Number(produto.preco || 0).toFixed(2).replace('.', ',')}
                      </p>
                      {precoPromo > 0 && (
                        <p className="text-sm font-bold text-red-600 font-numeric">
                          R$ {precoPromo.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Preço promocional (R$)</label>
                <input type="number" step="0.01" min="0" value={form.preco_promocional} onChange={(e) => setForm((p) => ({ ...p, preco_promocional: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Início da promoção</label>
                  <input type="datetime-local" value={form.destaque_inicio} onChange={(e) => setForm((p) => ({ ...p, destaque_inicio: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Fim da promoção</label>
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
