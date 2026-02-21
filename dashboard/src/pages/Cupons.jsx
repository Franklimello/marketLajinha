import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiX, FiPercent, FiDollarSign, FiToggleLeft, FiToggleRight } from 'react-icons/fi'

const EMPTY = {
  codigo: '',
  tipo_desconto: 'PERCENTAGE',
  valor_desconto: '',
  valor_minimo: '',
  max_usos: '',
  usos_por_cliente: '',
  data_inicio: '',
  data_fim: '',
  ativo: true,
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function tempoRestante(fim) {
  const diff = new Date(fim) - new Date()
  if (diff <= 0) return null
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}min restante${min !== 1 ? 's' : ''}`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h < 24) return `${h}h${m > 0 ? `${m}min` : ''} restante${h !== 1 ? 's' : ''}`
  const dias = Math.floor(h / 24)
  return `${dias} dia${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}`
}

function statusCupom(c) {
  if (!c.ativo) return { label: 'Inativo', cor: 'bg-stone-100 text-stone-500' }
  const agora = new Date()
  if (agora < new Date(c.data_inicio)) return { label: 'Agendado', cor: 'bg-blue-100 text-blue-700' }
  if (agora > new Date(c.data_fim)) return { label: 'Expirado', cor: 'bg-red-100 text-red-600' }
  if (c.max_usos !== null && c.usos_count >= c.max_usos) return { label: 'Esgotado', cor: 'bg-orange-100 text-orange-600' }
  return { label: 'Ativo', cor: 'bg-green-100 text-green-700' }
}

export default function Cupons() {
  const [cupons, setCupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    try {
      setCupons(await api.cupons.listar())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  function abrirModal(cupom = null) {
    if (cupom) {
      setEditando(cupom.id)
      setForm({
        codigo: cupom.codigo,
        tipo_desconto: cupom.tipo_desconto,
        valor_desconto: Number(cupom.valor_desconto),
        valor_minimo: cupom.valor_minimo ? Number(cupom.valor_minimo) : '',
        max_usos: cupom.max_usos ?? '',
        usos_por_cliente: cupom.usos_por_cliente ?? '',
        data_inicio: toLocalInput(cupom.data_inicio),
        data_fim: toLocalInput(cupom.data_fim),
        ativo: cupom.ativo,
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
    setSalvando(true)
    setErro('')
    try {
      const payload = {
        codigo: form.codigo,
        tipo_desconto: form.tipo_desconto,
        valor_desconto: Number(form.valor_desconto),
        valor_minimo: form.valor_minimo === '' ? null : Number(form.valor_minimo),
        max_usos: form.max_usos === '' ? null : Number(form.max_usos),
        usos_por_cliente: form.usos_por_cliente === '' ? null : Number(form.usos_por_cliente),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        ativo: form.ativo,
      }
      if (editando) {
        await api.cupons.atualizar(editando, payload)
      } else {
        await api.cupons.criar(payload)
      }
      setModal(false)
      carregar()
    } catch (err) { setErro(err.message) }
    finally { setSalvando(false) }
  }

  async function handleExcluir(id) {
    if (!confirm('Excluir este cupom?')) return
    try {
      await api.cupons.excluir(id)
      carregar()
    } catch (err) { alert(err.message) }
  }

  async function toggleAtivo(cupom) {
    try {
      await api.cupons.atualizar(cupom.id, { ativo: !cupom.ativo })
      carregar()
    } catch (err) { alert(err.message) }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Cupons de desconto</h1>
          <p className="text-sm text-stone-500 mt-0.5">Gerencie os cupons da sua loja</p>
        </div>
        <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
          <FiPlus /> Novo cupom
        </button>
      </div>

      {cupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiTag className="text-4xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Nenhum cupom criado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {cupons.map((c) => {
            const st = statusCupom(c)
            return (
              <div key={c.id} className="bg-white rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                      {c.tipo_desconto === 'PERCENTAGE' ? <FiPercent className="text-amber-600" /> : <FiDollarSign className="text-amber-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 font-mono tracking-wider">{c.codigo}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cor}`}>{st.label}</span>
                      </div>
                      <p className="text-sm text-stone-500 mt-0.5">
                        {c.tipo_desconto === 'PERCENTAGE'
                          ? `${Number(c.valor_desconto)}% de desconto`
                          : `R$ ${Number(c.valor_desconto).toFixed(2).replace('.', ',')} de desconto`}
                        {c.valor_minimo !== null && ` · Mín. R$ ${Number(c.valor_minimo).toFixed(2).replace('.', ',')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleAtivo(c)} className="p-2 rounded-lg hover:bg-stone-100" title={c.ativo ? 'Desativar' : 'Ativar'}>
                      {c.ativo ? <FiToggleRight className="text-green-600 text-lg" /> : <FiToggleLeft className="text-stone-400 text-lg" />}
                    </button>
                    <button onClick={() => abrirModal(c)} className="p-2 rounded-lg hover:bg-stone-100"><FiEdit2 className="text-stone-400" /></button>
                    <button onClick={() => handleExcluir(c.id)} className="p-2 rounded-lg hover:bg-red-50"><FiTrash2 className="text-red-400" /></button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-stone-400">
                  <span>{formatDate(c.data_inicio)} — {formatDate(c.data_fim)}</span>
                  {(() => { const tr = tempoRestante(c.data_fim); return tr && c.ativo ? <span className="text-amber-600 font-medium">{tr}</span> : null })()}
                  <span>Usos: {c.usos_count}{c.max_usos !== null ? `/${c.max_usos}` : ''}</span>
                  {c.usos_por_cliente !== null && <span>Máx/cliente: {c.usos_por_cliente}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setModal(false)} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-900">{editando ? 'Editar cupom' : 'Novo cupom'}</h2>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-stone-100 rounded-lg"><FiX /></button>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              {erro && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{erro}</p>}

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Código do cupom</label>
                <input name="codigo" value={form.codigo} onChange={handleChange} required placeholder="EX: DESCONTO10" className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm uppercase font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Tipo de desconto</label>
                  <select name="tipo_desconto" value={form.tipo_desconto} onChange={handleChange} className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm">
                    <option value="PERCENTAGE">Percentual (%)</option>
                    <option value="FIXED">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Valor do desconto {form.tipo_desconto === 'PERCENTAGE' ? '(%)' : '(R$)'}
                  </label>
                  <input name="valor_desconto" type="number" step="0.01" min="0" value={form.valor_desconto} onChange={handleChange} required className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Valor mínimo do pedido (opcional)</label>
                <input name="valor_minimo" type="number" step="0.01" min="0" value={form.valor_minimo} onChange={handleChange} placeholder="Sem mínimo" className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Máximo de usos total (opcional)</label>
                  <input name="max_usos" type="number" min="1" value={form.max_usos} onChange={handleChange} placeholder="Ilimitado" className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Máx. usos por cliente (opcional)</label>
                  <input name="usos_por_cliente" type="number" min="1" value={form.usos_por_cliente} onChange={handleChange} placeholder="Ilimitado" className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">Duração rápida (a partir de agora)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: '30 min', min: 30 },
                    { label: '1 hora', min: 60 },
                    { label: '2 horas', min: 120 },
                    { label: '6 horas', min: 360 },
                    { label: '12 horas', min: 720 },
                    { label: '1 dia', min: 1440 },
                    { label: '3 dias', min: 4320 },
                    { label: '7 dias', min: 10080 },
                    { label: '30 dias', min: 43200 },
                  ].map((opt) => (
                    <button
                      key={opt.min}
                      type="button"
                      onClick={() => {
                        const agora = new Date()
                        const fim = new Date(agora.getTime() + opt.min * 60000)
                        setForm((p) => ({ ...p, data_inicio: toLocalInput(agora), data_fim: toLocalInput(fim) }))
                      }}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-800 rounded-lg text-xs font-medium transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Início (data e hora)</label>
                  <input name="data_inicio" type="datetime-local" value={form.data_inicio} onChange={handleChange} required className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Fim (data e hora)</label>
                  <input name="data_fim" type="datetime-local" value={form.data_fim} onChange={handleChange} required className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input name="ativo" type="checkbox" checked={form.ativo} onChange={handleChange} className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500" />
                <span className="text-sm text-stone-700">Cupom ativo</span>
              </label>

              <button type="submit" disabled={salvando} className="w-full py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 text-sm">
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar cupom'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
