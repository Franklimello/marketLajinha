import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { FiPrinter, FiPlus, FiTrash2, FiEdit2, FiZap, FiWifi, FiWifiOff, FiKey, FiCopy, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi'

const SETORES_SUGESTOES = ['COZINHA', 'BAR', 'PIZZARIA', 'CONFEITARIA', 'GERAL', 'BALCAO']

export default function Impressoras() {
  const [impressoras, setImpressoras] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ setor: '', nome: '', ip: '', porta: 9100, largura: 80 })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(null)
  const [tokenImpressao, setTokenImpressao] = useState('')
  const [tokenAberto, setTokenAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [gerandoToken, setGerandoToken] = useState(false)

  const carregarToken = useCallback(async () => {
    try {
      const res = await api.impressoras.obterToken()
      setTokenImpressao(res.token_impressao || '')
    } catch {}
  }, [])

  const carregar = useCallback(async () => {
    try {
      setImpressoras(await api.impressoras.listar())
    } catch { /* ignore */ }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregar(); carregarToken() }, [carregar, carregarToken])

  function abrirNova() {
    setForm({ setor: '', nome: '', ip: '', porta: 9100, largura: 80 })
    setErro('')
    setModal('nova')
  }

  function abrirEditar(imp) {
    setForm({ setor: imp.setor, nome: imp.nome || '', ip: imp.ip, porta: imp.porta, largura: imp.largura || 80 })
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
        <strong>Como funciona:</strong> Quando um pedido chega, os itens são separados por setor (cozinha, bar, etc.)
        e enviados para a impressora certa automaticamente. Configure as impressoras aqui e o programa de impressão no
        computador da loja (veja abaixo).
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
                <p className="text-sm text-stone-500 mt-0.5 font-mono">{imp.ip}:{imp.porta} · {imp.largura || 80}mm</p>
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

      {/* Token do Agente Local */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setTokenAberto(!tokenAberto)}
          className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FiKey className="text-purple-600" size={18} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-stone-900 text-sm">Agente de Impressão Local</p>
              <p className="text-xs text-stone-500">Configure o programa que roda no PC da loja</p>
            </div>
          </div>
          {tokenAberto ? <FiChevronUp className="text-stone-400" /> : <FiChevronDown className="text-stone-400" />}
        </button>

        {tokenAberto && (
          <div className="border-t border-stone-100 p-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Por que preciso disso?</strong> Como o servidor roda na nuvem (Railway), ele não consegue acessar
              as impressoras na rede local da loja. O agente roda no PC da loja, busca os pedidos pendentes e envia
              para as impressoras automaticamente.
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Token de acesso</label>
              {tokenImpressao ? (
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2.5 bg-stone-100 rounded-lg text-xs font-mono text-stone-700 break-all select-all">
                    {tokenImpressao}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(tokenImpressao); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }}
                    className="px-3 py-2 bg-stone-100 rounded-lg text-stone-600 hover:bg-stone-200 transition-colors text-sm flex items-center gap-1.5"
                  >
                    <FiCopy size={14} />
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">Nenhum token gerado ainda.</p>
              )}
              <button
                onClick={async () => {
                  if (tokenImpressao && !confirm('Gerar novo token? O token atual será invalidado e o agente precisará ser reconfigurado.')) return
                  setGerandoToken(true)
                  try {
                    const res = await api.impressoras.gerarToken()
                    setTokenImpressao(res.token_impressao)
                  } catch {} finally { setGerandoToken(false) }
                }}
                disabled={gerandoToken}
                className="mt-2 flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw size={14} className={gerandoToken ? 'animate-spin' : ''} />
                {tokenImpressao ? 'Gerar novo token' : 'Gerar token'}
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-stone-700 mb-2">Como configurar (simples!)</p>
              <ol className="text-sm text-stone-600 space-y-3">
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <span className="font-medium text-stone-800">Copie o arquivo para o computador da loja</span>
                    <p className="text-xs text-stone-400 mt-0.5">Salve o <strong>MarketLajinha-Impressao.exe</strong> na área de trabalho</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <span className="font-medium text-stone-800">Dê duplo clique no programa</span>
                    <p className="text-xs text-stone-400 mt-0.5">A tela de configuração abre automaticamente no navegador</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <span className="font-medium text-stone-800">Cole o endereço do servidor e o token</span>
                    <p className="text-xs text-stone-400 mt-0.5">Copie o token acima e cole na tela do programa</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <div>
                    <span className="font-medium text-stone-800">Clique em "Iniciar impressão"</span>
                    <p className="text-xs text-stone-400 mt-0.5">Pronto! Os pedidos serão impressos automaticamente</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-stone-50 rounded-lg p-3 text-xs text-stone-500">
              <strong className="text-stone-700">Importante:</strong> O programa precisa ficar aberto no computador da loja para as impressões funcionarem.
              Não precisa instalar nada — é só abrir o <strong>MarketLajinha-Impressao.exe</strong>.
            </div>
          </div>
        )}
      </div>

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

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Largura do papel</label>
                <div className="flex gap-3">
                  {[
                    { value: 58, label: '58mm', desc: 'Bobina estreita (32 colunas)' },
                    { value: 80, label: '80mm', desc: 'Bobina padrão (48 colunas)' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, largura: opt.value }))}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition-colors ${
                        form.largura === opt.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-sm font-bold text-stone-900">{opt.label}</span>
                      <p className="text-[11px] text-stone-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
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
