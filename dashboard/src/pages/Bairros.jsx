import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import BAIRROS_DISPONIVEIS from '../data/bairros'
import { FiSearch, FiEdit2, FiTrash2, FiMapPin, FiSave, FiX, FiCheck, FiDollarSign } from 'react-icons/fi'

function formatCurrency(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Bairros() {
  const { loja } = useAuth()
  const [bairros, setBairros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  const [selecionando, setSelecionando] = useState(false)
  const [buscaSelect, setBuscaSelect] = useState('')
  const [taxaPadrao, setTaxaPadrao] = useState('5')

  const [editandoId, setEditandoId] = useState(null)
  const [editTaxa, setEditTaxa] = useState('')

  const [taxaEmLote, setTaxaEmLote] = useState('')
  const [aplicandoLote, setAplicandoLote] = useState(false)

  useEffect(() => {
    if (loja) carregarBairros()
  }, [loja])

  async function carregarBairros() {
    setCarregando(true)
    try {
      const res = await api.bairros.listar(loja.id)
      setBairros(Array.isArray(res) ? res : [])
    } catch {
      setBairros([])
    } finally {
      setCarregando(false)
    }
  }

  const bairrosCadastrados = useMemo(() => {
    return new Set(bairros.map((b) => b.nome.toLowerCase()))
  }, [bairros])

  const bairrosDispFiltrados = useMemo(() => {
    const q = buscaSelect.toLowerCase()
    return BAIRROS_DISPONIVEIS.filter((nome) => {
      if (bairrosCadastrados.has(nome.toLowerCase())) return false
      return !q || nome.toLowerCase().includes(q)
    })
  }, [buscaSelect, bairrosCadastrados])

  const filtrados = useMemo(() => {
    if (!busca) return bairros
    const q = busca.toLowerCase()
    return bairros.filter((b) => b.nome.toLowerCase().includes(q))
  }, [bairros, busca])

  async function adicionarBairro(nome) {
    try {
      const bairro = await api.bairros.criar(loja.id, nome, Number(taxaPadrao) || 0)
      setBairros((prev) => [...prev, bairro].sort((a, b) => a.nome.localeCompare(b.nome)))
    } catch (err) {
      alert(err.message)
    }
  }

  async function adicionarTodos() {
    const faltantes = BAIRROS_DISPONIVEIS.filter(
      (nome) => !bairrosCadastrados.has(nome.toLowerCase())
    )
    if (faltantes.length === 0) return
    const taxa = Number(taxaPadrao) || 0
    const lote = faltantes.map((nome) => ({ nome, taxa }))
    try {
      await api.bairros.criarLote(loja.id, lote)
      carregarBairros()
      setSelecionando(false)
    } catch (err) {
      alert(err.message)
    }
  }

  function iniciarEdicao(b) {
    setEditandoId(b.id)
    setEditTaxa(String(Number(b.taxa)))
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditTaxa('')
  }

  async function salvarEdicao(id) {
    try {
      const atualizado = await api.bairros.atualizar(loja.id, id, {
        taxa: Number(editTaxa) || 0,
      })
      setBairros((prev) => prev.map((b) => (b.id === id ? atualizado : b)))
      cancelarEdicao()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Remover este bairro?')) return
    try {
      await api.bairros.excluir(loja.id, id)
      setBairros((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      alert(err.message)
    }
  }

  async function aplicarTaxaEmLote() {
    if (!taxaEmLote && taxaEmLote !== '0') return
    setAplicandoLote(true)
    const taxa = Number(taxaEmLote) || 0
    const lote = bairros.map((b) => ({ nome: b.nome, taxa }))
    try {
      await api.bairros.criarLote(loja.id, lote)
      carregarBairros()
      setTaxaEmLote('')
    } catch (err) {
      alert(err.message)
    } finally {
      setAplicandoLote(false)
    }
  }

  if (carregando) {
    return <div className="flex items-center justify-center py-20 text-stone-400">Carregando...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Bairros e Taxas de Entrega</h1>
        <p className="text-stone-500 text-sm mt-1">
          {bairros.length} de {BAIRROS_DISPONIVEIS.length} bairros selecionados
        </p>
      </div>

      {/* Botão abrir seleção */}
      <div className="flex gap-3">
        <button
          onClick={() => setSelecionando(!selecionando)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors text-sm"
        >
          <FiMapPin /> {selecionando ? 'Fechar seleção' : 'Selecionar bairros'}
        </button>
        {!selecionando && bairrosCadastrados.size < BAIRROS_DISPONIVEIS.length && (
          <button
            onClick={() => { setSelecionando(true); adicionarTodos() }}
            className="px-4 py-2 bg-white border border-stone-200 text-stone-700 font-medium rounded-lg hover:bg-stone-50 transition-colors text-sm"
          >
            Adicionar todos
          </button>
        )}
      </div>

      {/* Modal/painel de seleção de bairros */}
      {selecionando && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 space-y-3">
            <p className="text-sm font-medium text-stone-700">Selecione os bairros que sua loja atende</p>
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar bairro..."
                  value={buscaSelect}
                  onChange={(e) => setBuscaSelect(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div className="w-32">
                <label className="block text-xs text-stone-400 mb-1">Taxa padrão</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-400">R$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={taxaPadrao}
                    onChange={(e) => setTaxaPadrao(e.target.value)}
                    className="w-full px-2 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-stone-50">
            {bairrosDispFiltrados.length === 0 ? (
              <p className="p-6 text-center text-stone-400 text-sm">
                {buscaSelect ? 'Nenhum bairro encontrado.' : 'Todos os bairros já foram adicionados!'}
              </p>
            ) : (
              bairrosDispFiltrados.map((nome) => (
                <button
                  key={nome}
                  onClick={() => adicionarBairro(nome)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors text-left"
                >
                  <span className="text-sm text-stone-900">{nome}</span>
                  <span className="text-xs text-amber-600 font-medium">+ Adicionar</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Ação em lote - alterar taxa de todos */}
      {bairros.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Alterar taxa de todos os bairros</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-400">R$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={taxaEmLote}
                  onChange={(e) => setTaxaEmLote(e.target.value)}
                  placeholder="Nova taxa para todos"
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>
            <button
              onClick={aplicarTaxaEmLote}
              disabled={aplicandoLote || (!taxaEmLote && taxaEmLote !== '0')}
              className="px-4 py-2 bg-stone-700 text-white font-medium rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors text-sm whitespace-nowrap"
            >
              {aplicandoLote ? 'Aplicando...' : 'Aplicar a todos'}
            </button>
          </div>
        </div>
      )}

      {/* Busca na lista cadastrada */}
      {bairros.length > 5 && (
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar nos bairros cadastrados..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
      )}

      {/* Lista de bairros cadastrados */}
      {bairros.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <FiMapPin className="text-4xl text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium mb-1">Nenhum bairro selecionado</p>
          <p className="text-stone-400 text-sm">
            Clique em "Selecionar bairros" para escolher os bairros que sua loja atende.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-2 bg-stone-50 border-b border-stone-200 text-xs font-medium text-stone-500 uppercase tracking-wide">
            <span>Bairro</span>
            <span className="w-28 text-right">Taxa entrega</span>
            <span className="w-20" />
          </div>
          <div className="divide-y divide-stone-100">
            {filtrados.map((b) => {
              const isEditing = editandoId === b.id

              if (isEditing) {
                return (
                  <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-2 bg-amber-50/50">
                    <span className="text-sm font-medium text-stone-900">{b.nome}</span>
                    <div className="w-28 flex items-center gap-1 justify-end">
                      <span className="text-xs text-stone-400">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={editTaxa}
                        onChange={(e) => setEditTaxa(e.target.value)}
                        autoFocus
                        className="w-20 px-2 py-1.5 border border-stone-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-amber-500"
                        onKeyDown={(e) => e.key === 'Enter' && salvarEdicao(b.id)}
                      />
                    </div>
                    <div className="w-20 flex gap-1 justify-end">
                      <button onClick={() => salvarEdicao(b.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Salvar">
                        <FiSave className="text-sm" />
                      </button>
                      <button onClick={cancelarEdicao} className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg" title="Cancelar">
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={b.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 py-3 hover:bg-stone-50/50 transition-colors group">
                  <div className="flex items-center gap-2">
                    <FiCheck className="text-green-500 text-xs flex-shrink-0" />
                    <span className="text-sm text-stone-900">{b.nome}</span>
                  </div>
                  <span className="w-28 text-right text-sm font-semibold text-stone-900">
                    {formatCurrency(b.taxa)}
                  </span>
                  <div className="w-20 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => iniciarEdicao(b)} className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Editar taxa">
                      <FiEdit2 className="text-sm" />
                    </button>
                    <button onClick={() => handleExcluir(b.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remover">
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
