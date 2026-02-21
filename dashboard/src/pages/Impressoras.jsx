import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { FiPrinter, FiPlus, FiTrash2, FiEdit2, FiZap, FiWifi, FiWifiOff } from 'react-icons/fi'

const SETORES_SUGESTOES = ['COZINHA', 'BAR', 'PIZZARIA', 'CONFEITARIA', 'GERAL', 'BALCAO']

export default function Impressoras() {
  const [impressoras, setImpressoras] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ setor: '', nome: '', ip: '', porta: 9100 })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(null)

  const carregar = useCallback(async () => {
    try {
      setImpressoras(await api.impressoras.listar())
    } catch { /* ignore */ }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirNova() {
    setForm({ setor: '', nome: '', ip: '', porta: 9100 })
    setErro('')
    setModal('nova')
  }

  function abrirEditar(imp) {
    setForm({ setor: imp.setor, nome: imp.nome || '', ip: imp.ip, porta: imp.porta })
    setErro('')
    setModal(imp.id)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.setor.trim() || !form.ip.trim()) {
      setErro('Setor e IP são obrigatórios.')
      return
    }
    setSalvando(true)
    try {
      if (modal === 'nova') {
        await api.impressoras.criar(form)
      } else {
        await api.impressoras.atualizar(modal, form)
      }
      setModal(null)
      await carregar()
    } catch (err) {
      setErro(err.message)
    } finally { setSalvando(false) }
  }

  async function excluir(id) {
    if (!confirm('Remover esta impressora?')) return
    try {
      await api.impressoras.excluir(id)
      await carregar()
    } catch (err) { alert(err.message) }
  }

  async function testar(id) {
    setTestando(id)
    try {
      const res = await api.impressoras.testar(id)
      alert(res.mensagem || 'Teste enviado!')
    } catch (err) {
      alert(`Falha: ${err.message}`)
    } finally { setTestando(null) }
  }

  async function toggleAtiva(imp) {
    try {
      await api.impressoras.atualizar(imp.id, { ativa: !imp.ativa })
      await carregar()
    } catch (err) { alert(err.message) }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando impressoras...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Impressoras</h1>
          <p className="text-stone-500 text-sm mt-1">Configure impressoras térmicas por setor de produção</p>
        </div>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
        >
          <FiPlus /> Adicionar
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Como funciona:</strong> Quando um pedido é aprovado, os itens são separados por setor e cada impressora
        recebe apenas os itens do seu setor. Defina o setor de cada produto no cadastro de produtos.
      </div>

      {impressoras.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiPrinter className="text-4xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">Nenhuma impressora cadastrada</p>
          <p className="text-stone-400 text-sm mt-1">Adicione sua primeira impressora para impressão automática de pedidos</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {impressoras.map((imp) => (
            <div key={imp.id} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${imp.ativa ? 'bg-green-50' : 'bg-stone-100'}`}>
                <FiPrinter className={`text-xl ${imp.ativa ? 'text-green-600' : 'text-stone-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900">{imp.setor}</span>
                  {imp.nome && <span className="text-sm text-stone-400">({imp.nome})</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    imp.ativa ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {imp.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-sm text-stone-500 mt-0.5 font-mono">{imp.ip}:{imp.porta}</p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => testar(imp.id)}
                  disabled={testando === imp.id}
                  className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                  title="Testar impressão"
                >
                  <FiZap className={testando === imp.id ? 'animate-pulse' : ''} />
                </button>
                <button
                  onClick={() => toggleAtiva(imp)}
                  className={`p-2 rounded-lg transition-colors ${
                    imp.ativa ? 'text-green-500 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-50'
                  }`}
                  title={imp.ativa ? 'Desativar' : 'Ativar'}
                >
                  {imp.ativa ? <FiWifi /> : <FiWifiOff />}
                </button>
                <button
                  onClick={() => abrirEditar(imp)}
                  className="p-2 rounded-lg text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
                  title="Editar"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => excluir(imp.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Excluir"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !salvando && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">
                {modal === 'nova' ? 'Nova impressora' : 'Editar impressora'}
              </h2>
              <button onClick={() => setModal(null)} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={salvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Setor *</label>
                <div className="space-y-2">
                  <input
                    value={form.setor}
                    onChange={(e) => setForm((p) => ({ ...p, setor: e.target.value.toUpperCase() }))}
                    required
                    placeholder="ex: COZINHA"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {SETORES_SUGESTOES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, setor: s }))}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          form.setor === s ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome (opcional)</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="ex: Impressora da cozinha principal"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">IP da impressora *</label>
                  <input
                    value={form.ip}
                    onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))}
                    required
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Porta</label>
                  <input
                    type="number"
                    value={form.porta}
                    onChange={(e) => setForm((p) => ({ ...p, porta: parseInt(e.target.value) || 9100 }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{erro}</p>}

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
