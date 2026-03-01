import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { FiPrinter, FiPlus, FiTrash2, FiEdit2, FiZap, FiWifi, FiWifiOff, FiDownload, FiMonitor, FiInfo } from 'react-icons/fi'

const SETORES_SUGESTOES = ['COZINHA', 'BAR', 'PIZZARIA', 'CONFEITARIA', 'GERAL', 'BALCAO']

const SETOR_ICONES = {
  COZINHA: '🍳',
  BAR: '🍺',
  PIZZARIA: '🍕',
  CONFEITARIA: '🧁',
  GERAL: '🖨️',
  BALCAO: '🛎️',
}

export default function Impressoras() {
  const [impressoras, setImpressoras] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({
    setor: '', nome: '', type: 'ip', ip: '', porta: 9100, usb_identifier: '', largura: 80,
  })
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
    setForm({ setor: '', nome: '', type: 'ip', ip: '', porta: 9100, usb_identifier: '', largura: 80 })
    setErro('')
    setModal('nova')
  }

  function abrirEditar(imp) {
    setForm({
      setor: imp.setor,
      nome: imp.nome || '',
      type: String(imp?.type || 'IP').toUpperCase() === 'USB' ? 'usb' : 'ip',
      ip: imp.ip || '',
      porta: imp.porta || 9100,
      usb_identifier: imp.usb_identifier || '',
      largura: imp.largura || 80,
    })
    setErro('')
    setModal(imp.id)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!form.setor.trim()) {
      setErro('Setor é obrigatório.')
      return
    }
    if (form.type === 'ip' && !String(form.ip || '').trim()) {
      setErro('IP é obrigatório para impressora do tipo IP.')
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
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-stone-200 rounded-lg w-48" />
        <div className="h-4 bg-stone-100 rounded w-72" />
        <div className="h-32 bg-stone-100 rounded-xl" />
        <div className="h-20 bg-stone-100 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Impressoras</h1>
          <p className="text-stone-500 text-sm mt-1">Gerencie as impressoras térmicas da sua loja</p>
        </div>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm"
        >
          <FiPlus size={16} /> Adicionar
        </button>
      </div>

      {/* Como funciona - compacto */}
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-4">
        <div className="flex gap-3 items-start">
          <div className="p-2 bg-blue-100 rounded-lg shrink-0">
            <FiInfo className="text-blue-600" size={16} />
          </div>
          <div className="text-sm text-blue-800">
            <strong>Como funciona?</strong> Cada produto tem um <strong>setor de impressão</strong> (cozinha, bar...).
            Quando chega um pedido, cada item vai automaticamente para a impressora do setor certo.
          </div>
        </div>
      </div>

      {/* Lista de impressoras */}
      {impressoras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiPrinter className="text-2xl text-stone-400" />
          </div>
          <p className="text-stone-700 font-semibold text-lg">Nenhuma impressora cadastrada</p>
          <p className="text-stone-400 text-sm mt-1 max-w-xs mx-auto">
            Cadastre as impressoras da sua loja para receber os pedidos automaticamente
          </p>
          <button
            onClick={abrirNova}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            <FiPlus size={16} /> Adicionar primeira impressora
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {impressoras.map((imp) => (
            <div key={imp.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${imp.ativa ? 'border-stone-200' : 'border-stone-200/60 opacity-60'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${imp.ativa ? 'bg-green-50' : 'bg-stone-100'}`}>
                {SETOR_ICONES[imp.setor] || '🖨️'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-stone-900">{imp.setor}</span>
                  {imp.nome && <span className="text-sm text-stone-400 truncate">· {imp.nome}</span>}
                </div>
              <p className="text-sm text-stone-500 mt-0.5 font-mono">
                {String(imp?.type || 'IP').toUpperCase() === 'USB'
                  ? `USB ${imp.usb_identifier ? `· ${imp.usb_identifier}` : ''}`
                  : `${imp.ip}:${imp.porta}`
                } · {imp.largura || 80}mm
              </p>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => testar(imp.id)}
                  disabled={testando === imp.id}
                  className="p-2.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                  title="Testar impressão"
                >
                  <FiZap size={16} className={testando === imp.id ? 'animate-pulse' : ''} />
                </button>
                <button
                  onClick={() => toggleAtiva(imp)}
                  className={`p-2.5 rounded-lg transition-colors ${
                    imp.ativa ? 'text-green-500 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-50'
                  }`}
                  title={imp.ativa ? 'Desativar' : 'Ativar'}
                >
                  {imp.ativa ? <FiWifi size={16} /> : <FiWifiOff size={16} />}
                </button>
                <button
                  onClick={() => abrirEditar(imp)}
                  className="p-2.5 rounded-lg text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors"
                  title="Editar"
                >
                  <FiEdit2 size={16} />
                </button>
                <button
                  onClick={() => excluir(imp.id)}
                  className="p-2.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Excluir"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Programa de Impressão */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-50 rounded-xl shrink-0">
              <FiMonitor className="text-amber-600" size={22} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-stone-900">Programa de Impressão</h3>
              <p className="text-sm text-stone-500 mt-1">
                Instale no computador da loja para que os pedidos sejam impressos automaticamente.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                  <span className="text-lg">1️⃣</span>
                  <span className="text-sm text-stone-700 font-medium">Instalar no PC</span>
                </div>
                <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                  <span className="text-lg">2️⃣</span>
                  <span className="text-sm text-stone-700 font-medium">Fazer login</span>
                </div>
                <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                  <span className="text-lg">3️⃣</span>
                  <span className="text-sm text-stone-700 font-medium">Pronto!</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://github.com/Franklimello/marketLajinha/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <FiDownload size={16} /> Baixar programa
                </a>
              </div>

              <p className="mt-3 text-xs text-stone-400">
                Use o mesmo email e senha do painel para entrar. O programa detecta as impressoras e imprime sozinho.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !salvando && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">
                {modal === 'nova' ? 'Nova impressora' : 'Editar impressora'}
              </h2>
              <button onClick={() => setModal(null)} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={salvar} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Setor *</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SETORES_SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, setor: s }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        form.setor === s
                          ? 'bg-amber-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <span>{SETOR_ICONES[s] || '🖨️'}</span>
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  value={form.setor}
                  onChange={(e) => setForm((p) => ({ ...p, setor: e.target.value.toUpperCase() }))}
                  required
                  placeholder="Ou digite um setor personalizado..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome (opcional)</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="ex: Impressora da cozinha principal"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: String(e.target.value || 'ip') }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="ip">IP (rede)</option>
                    <option value="usb">USB (local)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  {form.type === 'ip' ? (
                    <>
                      <label className="block text-sm font-medium text-stone-700 mb-1">IP da impressora *</label>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          value={form.ip}
                          onChange={(e) => setForm((p) => ({ ...p, ip: e.target.value }))}
                          required
                          placeholder="192.168.1.100"
                          className="col-span-2 w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                        />
                        <input
                          type="number"
                          value={form.porta}
                          onChange={(e) => setForm((p) => ({ ...p, porta: parseInt(e.target.value) || 9100 }))}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Identificador USB</label>
                      <input
                        value={form.usb_identifier}
                        onChange={(e) => setForm((p) => ({ ...p, usb_identifier: e.target.value }))}
                        placeholder="Ex.: VID:04B8_PID:0202"
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Largura do papel</label>
                <div className="flex gap-3">
                  {[
                    { value: 58, label: '58mm', desc: 'Bobina estreita' },
                    { value: 80, label: '80mm', desc: 'Bobina padrão' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, largura: opt.value }))}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        form.largura === opt.value
                          ? 'border-amber-500 bg-amber-50 shadow-sm'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-base font-bold text-stone-900">{opt.label}</span>
                      <p className="text-[11px] text-stone-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>}

              <button
                type="submit"
                disabled={salvando}
                className="w-full py-3 bg-amber-600 text-white font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {salvando ? 'Salvando...' : 'Salvar impressora'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
