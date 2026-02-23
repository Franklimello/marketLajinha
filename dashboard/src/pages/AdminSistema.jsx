import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import {
  FiShield, FiTrash2, FiLock, FiUnlock, FiSearch,
  FiUsers, FiPackage, FiClipboard, FiShoppingBag,
  FiChevronDown, FiChevronUp, FiAlertTriangle, FiEye,
  FiKey, FiRefreshCw
} from 'react-icons/fi'

function formatCurrency(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPercent(v) {
  return `${Number(v || 0).toFixed(1).replace('.', ',')}%`
}

export default function AdminSistema() {
  const [stats, setStats] = useState(null)
  const [lojas, setLojas] = useState([])
  const [filtro, setFiltro] = useState('')
  const [expandida, setExpandida] = useState(null)
  const [detalheLoja, setDetalheLoja] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [modal, setModal] = useState(null)
  const [processando, setProcessando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([api.admin.stats(), api.admin.listarLojas()])
      setStats(s)
      setLojas(l)
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function handleBloquear(id) {
    setProcessando(true)
    try {
      await api.admin.bloquearLoja(id)
      await carregar()
      setModal(null)
    } catch (e) {
      alert(e.message)
    } finally { setProcessando(false) }
  }

  async function handleDesbloquear(id) {
    setProcessando(true)
    try {
      await api.admin.desbloquearLoja(id)
      await carregar()
    } catch (e) {
      alert(e.message)
    } finally { setProcessando(false) }
  }

  async function handleExcluir(id) {
    setProcessando(true)
    try {
      await api.admin.excluirLoja(id)
      await carregar()
      setModal(null)
      setExpandida(null)
      setDetalheLoja(null)
    } catch (e) {
      alert(e.message)
    } finally { setProcessando(false) }
  }

  async function verDetalhes(id) {
    if (expandida === id) {
      setExpandida(null)
      setDetalheLoja(null)
      return
    }
    try {
      const d = await api.admin.buscarLoja(id)
      setDetalheLoja(d)
      setExpandida(id)
    } catch (e) {
      alert(e.message)
    }
  }

  const lojasFiltradas = lojas.filter(
    (l) =>
      l.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
      l.slug?.toLowerCase().includes(filtro.toLowerCase()) ||
      l.cidade?.toLowerCase().includes(filtro.toLowerCase())
  )

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Carregando painel admin...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <FiShield className="text-xl text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-900">Painel do Administrador</h1>
          <p className="text-sm text-stone-500">Gerencie todas as lojas do sistema</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <StatCard icon={FiShoppingBag} label="Lojas" value={stats.lojas} sub={`${stats.lojasAtivas} ativas`} color="amber" />
          <StatCard icon={FiUsers} label="Usuários" value={stats.usuarios} color="blue" />
          <StatCard icon={FiPackage} label="Produtos" value={stats.produtos} color="green" />
          <StatCard icon={FiClipboard} label="Pedidos" value={stats.pedidos} color="purple" />
          <StatCard icon={FiUsers} label="Clientes" value={stats.clientes} color="rose" />
          <StatCard icon={FiClipboard} label="Pedidos 30d" value={stats.pedidos30d || 0} color="indigo" />
          <StatCard icon={FiShoppingBag} label="Faturamento 30d" value={formatCurrency(stats.faturamento30d)} color="emerald" />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar loja por nome, slug ou cidade..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Lojas */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 bg-stone-50">
          <h2 className="font-semibold text-stone-700 text-sm">
            {lojasFiltradas.length} loja{lojasFiltradas.length !== 1 ? 's' : ''} encontrada{lojasFiltradas.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {lojasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-stone-400">Nenhuma loja encontrada.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {lojasFiltradas.map((loja) => (
              <div key={loja.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
                  {/* Logo */}
                  {loja.logo_url ? (
                    <img src={loja.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0 text-sm">
                      {loja.nome?.charAt(0)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 text-sm truncate">{loja.nome}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        loja.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {loja.ativa ? 'Ativa' : 'Bloqueada'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                      <span>/{loja.slug}</span>
                      {loja.cidade && <span>• {loja.cidade}</span>}
                      <span>• {loja._count?.produtos || 0} prod.</span>
                      <span>• {loja.metricas?.pedidos_total || 0} ped.</span>
                    </div>
                    <div className="text-[11px] mt-1 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                        {formatCurrency(loja.metricas?.faturamento_total)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
                        Ticket {formatCurrency(loja.metricas?.ticket_medio)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                        30d: {formatCurrency(loja.metricas?.faturamento_30d)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        (loja.metricas?.taxa_cancelamento || 0) > 20
                          ? 'bg-red-50 text-red-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        Cancel.: {formatPercent(loja.metricas?.taxa_cancelamento)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => verDetalhes(loja.id)}
                      className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                      title="Ver detalhes"
                    >
                      {expandida === loja.id ? <FiChevronUp /> : <FiEye />}
                    </button>

                    {loja.ativa ? (
                      <button
                        onClick={() => setModal({ tipo: 'bloquear', loja })}
                        className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                        title="Bloquear loja"
                      >
                        <FiLock />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDesbloquear(loja.id)}
                        disabled={processando}
                        className="p-2 rounded-lg text-green-500 hover:bg-green-50 hover:text-green-700 transition-colors"
                        title="Desbloquear loja"
                      >
                        <FiUnlock />
                      </button>
                    )}

                    <button
                      onClick={() => setModal({ tipo: 'excluir', loja })}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Excluir loja"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandida === loja.id && detalheLoja && (
                  <div className="px-4 pb-4 bg-stone-50 border-t border-stone-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      {/* Métricas comerciais */}
                      <div className="bg-white rounded-lg p-3 border border-stone-200 sm:col-span-2">
                        <h4 className="text-xs font-semibold text-stone-500 uppercase mb-2">Performance comercial</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <InfoBox label="Pedidos total" value={detalheLoja.metricas?.pedidos_total || 0} />
                          <InfoBox label="Pedidos 30d" value={detalheLoja.metricas?.pedidos_30d || 0} />
                          <InfoBox label="Faturamento total" value={formatCurrency(detalheLoja.metricas?.faturamento_total)} />
                          <InfoBox label="Faturamento 30d" value={formatCurrency(detalheLoja.metricas?.faturamento_30d)} />
                          <InfoBox label="Ticket médio" value={formatCurrency(detalheLoja.metricas?.ticket_medio)} />
                          <InfoBox label="Cancelados" value={detalheLoja.metricas?.pedidos_cancelados || 0} />
                          <InfoBox label="Taxa cancel." value={formatPercent(detalheLoja.metricas?.taxa_cancelamento)} />
                          <InfoBox label="Status dominante" value={statusDominante(detalheLoja.metricas?.status)} />
                        </div>
                      </div>

                      {/* Usuários da loja */}
                      <div className="bg-white rounded-lg p-3 border border-stone-200">
                        <h4 className="text-xs font-semibold text-stone-500 uppercase mb-2">Usuários ({detalheLoja.usuarios?.length || 0})</h4>
                        {detalheLoja.usuarios?.length ? (
                          <div className="space-y-1.5">
                            {detalheLoja.usuarios.map((u) => (
                              <div key={u.id} className="flex justify-between items-center text-sm">
                                <span className="text-stone-700">{u.nome || u.email}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  u.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>{u.role}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400">Nenhum usuário</p>
                        )}
                      </div>

                      {/* Produtos da loja */}
                      <div className="bg-white rounded-lg p-3 border border-stone-200">
                        <h4 className="text-xs font-semibold text-stone-500 uppercase mb-2">Produtos ({detalheLoja.produtos?.length || 0})</h4>
                        {detalheLoja.produtos?.length ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {detalheLoja.produtos.map((p) => (
                              <div key={p.id} className="flex justify-between items-center text-sm">
                                <span className="text-stone-700 truncate">{p.nome}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-stone-400">{p.categoria}</span>
                                  <span className="text-xs font-medium text-stone-600">
                                    R$ {Number(p.preco).toFixed(2).replace('.', ',')}
                                  </span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${p.ativo ? 'bg-green-500' : 'bg-red-400'}`} />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-stone-400">Nenhum produto</p>
                        )}
                      </div>
                    </div>

                    {/* Extra info */}
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <InfoBox label="Telefone" value={detalheLoja.telefone || '—'} />
                      <InfoBox label="Cidade" value={detalheLoja.cidade || '—'} />
                      <InfoBox label="Categoria" value={detalheLoja.categoria_negocio || '—'} />
                      <InfoBox label="PIX" value={detalheLoja.pix_chave ? 'Configurado' : 'Não configurado'} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !processando && setModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${modal.tipo === 'excluir' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <FiAlertTriangle className={`text-xl ${modal.tipo === 'excluir' ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <h3 className="font-semibold text-stone-900">
                {modal.tipo === 'excluir' ? 'Excluir Loja' : 'Bloquear Loja'}
              </h3>
            </div>

            <p className="text-sm text-stone-600 mb-1">
              {modal.tipo === 'excluir'
                ? `Tem certeza que deseja excluir permanentemente a loja "${modal.loja.nome}"?`
                : `Deseja bloquear a loja "${modal.loja.nome}"? Ela ficará invisível no marketplace.`}
            </p>

            {modal.tipo === 'excluir' && (
              <p className="text-xs text-red-500 mb-4">
                Esta ação é irreversível. Todos os produtos, pedidos e dados serão removidos.
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setModal(null)}
                disabled={processando}
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  modal.tipo === 'excluir'
                    ? handleExcluir(modal.loja.id)
                    : handleBloquear(modal.loja.id)
                }
                disabled={processando}
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
                  modal.tipo === 'excluir'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                } disabled:opacity-50`}
              >
                {processando ? 'Processando...' : modal.tipo === 'excluir' ? 'Excluir' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Seção Reset de Senhas */}
      <ResetSenhas />
    </div>
  )
}

function ResetSenhas() {
  const [aba, setAba] = useState('motoboys')
  const [motoboys, setMotoboys] = useState([])
  const [lojistas, setLojistas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [resetModal, setResetModal] = useState(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [processando, setProcessando] = useState(false)
  const [sucesso, setSucesso] = useState('')

  async function carregar() {
    setCarregando(true)
    try {
      if (aba === 'motoboys') {
        setMotoboys(await api.admin.listarMotoboys())
      } else {
        setLojistas(await api.admin.listarLojistas())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [aba])

  async function handleReset() {
    if (!novaSenha) return
    setProcessando(true)
    setSucesso('')
    try {
      if (resetModal.tipo === 'motoboy') {
        const r = await api.admin.resetSenhaMotoboy(resetModal.id, novaSenha)
        setSucesso(r.mensagem)
      } else {
        const r = await api.admin.resetSenhaLojista(resetModal.id, novaSenha)
        setSucesso(r.mensagem)
      }
      setNovaSenha('')
      setTimeout(() => { setResetModal(null); setSucesso('') }, 2000)
    } catch (e) {
      alert(e.message)
    } finally {
      setProcessando(false)
    }
  }

  const lista = aba === 'motoboys' ? motoboys : lojistas
  const filtrados = lista.filter(
    (u) =>
      u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      u.email?.toLowerCase().includes(busca.toLowerCase()) ||
      u.loja?.nome?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <FiKey className="text-amber-600 text-sm" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-700 text-sm">Recuperar Senhas</h2>
            <p className="text-[10px] text-stone-400">Redefina a senha de lojistas e motoboys</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Abas */}
          <div className="flex gap-2">
            <button
              onClick={() => { setAba('motoboys'); setBusca('') }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${aba === 'motoboys' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              Motoboys
            </button>
            <button
              onClick={() => { setAba('lojistas'); setBusca('') }}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${aba === 'lojistas' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              Lojistas
            </button>
          </div>

          {/* Busca */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou loja..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Lista */}
          {carregando ? (
            <div className="text-center py-6 text-stone-400 text-sm">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-6 text-stone-400 text-sm">Nenhum resultado.</div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto">
              {filtrados.map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                    {u.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{u.nome || u.email}</p>
                    <p className="text-[11px] text-stone-400 truncate">{u.email} • {u.loja?.nome || '—'}</p>
                  </div>
                  <button
                    onClick={() => { setResetModal({ id: u.id, nome: u.nome || u.email, tipo: aba === 'motoboys' ? 'motoboy' : 'lojista' }); setNovaSenha(''); setSucesso('') }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    <FiRefreshCw className="text-[10px]" /> Resetar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal reset */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !processando && setResetModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FiKey className="text-xl text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Redefinir Senha</h3>
                <p className="text-xs text-stone-400">{resetModal.nome}</p>
              </div>
            </div>

            {sucesso ? (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 text-center font-medium">
                {sucesso}
              </div>
            ) : (
              <>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Nova senha</label>
                <input
                  type="text"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder={resetModal.tipo === 'motoboy' ? 'Mínimo 4 caracteres' : 'Mínimo 6 caracteres'}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 mb-1"
                  autoFocus
                />
                <p className="text-[10px] text-stone-400 mb-4">
                  Informe a nova senha ao {resetModal.tipo === 'motoboy' ? 'motoboy' : 'lojista'} após redefinir.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setResetModal(null)}
                    disabled={processando}
                    className="flex-1 px-4 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={processando || !novaSenha}
                    className="flex-1 px-4 py-2 text-sm rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {processando ? 'Salvando...' : 'Redefinir'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colors[color]}`}>
          <Icon className="text-sm" />
        </div>
        <span className="text-xs font-medium text-stone-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function statusDominante(status = {}) {
  const labels = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovado',
    IN_ROUTE: 'Em rota',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
  }
  const entrada = Object.entries(status || {}).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0]
  if (!entrada || Number(entrada[1] || 0) === 0) return '—'
  return labels[entrada[0]] || entrada[0]
}

function InfoBox({ label, value }) {
  return (
    <div className="bg-white rounded-lg p-2 border border-stone-200">
      <p className="text-stone-400 text-[10px] uppercase font-medium">{label}</p>
      <p className="text-stone-700 text-sm truncate">{value}</p>
    </div>
  )
}
