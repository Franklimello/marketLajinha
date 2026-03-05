import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { FiCheckCircle, FiAlertCircle, FiChevronLeft, FiChevronRight, FiPlus, FiTrash2 } from 'react-icons/fi'

const TAMANHOS_INICIAIS = [
  { nome: 'Broto', permiteMeio: false },
  { nome: 'M', permiteMeio: true },
  { nome: 'G', permiteMeio: true },
  { nome: 'GG', permiteMeio: true },
]

function normalizarNomeTamanho(valor) {
  return String(valor || '').trim()
}

function criarPrecosIniciais(tamanhos = []) {
  const precos = {}
  tamanhos.forEach((t) => {
    const nome = normalizarNomeTamanho(t?.nome)
    if (!nome) return
    precos[nome] = ''
  })
  return precos
}

function mapProdutoParaPizza(produto) {
  const variacoes = Array.isArray(produto?.variacoes) ? produto.variacoes : []
  const adicionais = Array.isArray(produto?.adicionais) ? produto.adicionais : []
  const tamanhos = variacoes.map((v) => ({
    nome: String(v.nome || '').trim() || 'Tamanho',
    permiteMeio: Number(v.max_sabores || 1) >= 2,
  }))
  const sabores = adicionais
    .filter((a) => !!a.is_sabor)
    .map((a) => {
      const precos = criarPrecosIniciais(tamanhos)
      const tabela = Array.isArray(a.precos_variacoes) ? a.precos_variacoes : []
      for (const pv of tabela) {
        const nome = String(pv?.variacao?.nome || '').trim()
        if (!nome) continue
        precos[nome] = String(Number(pv.preco || 0))
      }
      return {
        nome: a.nome || '',
        descricao: a.descricao || '',
        precos,
      }
    })
  return {
    nome: produto?.nome || 'Pizza',
    descricao: produto?.descricao || '',
    meioAMeio: tamanhos.some((t) => t.permiteMeio),
    tamanhos: tamanhos.length ? tamanhos : TAMANHOS_INICIAIS,
    sabores,
  }
}

export default function ModalPizza({ lojaId, produto, onFechar, onSalvo }) {
  const [pizza, setPizza] = useState(() => (produto ? mapProdutoParaPizza(produto) : {
    nome: 'Pizza',
    descricao: '',
    meioAMeio: true,
    tamanhos: TAMANHOS_INICIAIS,
    sabores: [],
  }))
  const [novoTamanho, setNovoTamanho] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('info')

  const quantidadeSaboresMax = useMemo(
    () => pizza.tamanhos.some((t) => t.permiteMeio) && pizza.meioAMeio ? 2 : 1,
    [pizza.tamanhos, pizza.meioAMeio]
  )

  const totalPrecosConfigurados = useMemo(
    () => pizza.sabores.reduce((soma, sabor) => (
      soma + pizza.tamanhos.filter((t) => Number(sabor?.precos?.[t.nome] || 0) > 0).length
    ), 0),
    [pizza.sabores, pizza.tamanhos]
  )

  const algumSaborSemNome = useMemo(
    () => pizza.sabores.some((sabor) => !String(sabor?.nome || '').trim()),
    [pizza.sabores]
  )

  const abas = [
    { id: 'info', label: 'Informacoes', dica: 'Dados gerais da pizza.' },
    { id: 'tamanhos', label: `Tamanhos (${pizza.tamanhos.length})`, dica: 'Tamanhos e meio a meio.' },
    { id: 'sabores', label: `Sabores (${pizza.sabores.length})`, dica: 'Cadastro de sabores e precos.' },
  ]

  const statusAbas = useMemo(
    () => ({
      info: Boolean(String(pizza.nome || '').trim()),
      tamanhos: pizza.tamanhos.length > 0,
      sabores: pizza.sabores.length > 0 && !algumSaborSemNome,
    }),
    [pizza.nome, pizza.tamanhos.length, pizza.sabores.length, algumSaborSemNome]
  )

  const indiceAbaAtual = Math.max(0, abas.findIndex((aba) => aba.id === abaAtiva))
  const abaAtual = abas[indiceAbaAtual] || abas[0]
  const podeVoltar = indiceAbaAtual > 0
  const podeAvancar = indiceAbaAtual < abas.length - 1

  function adicionarTamanho() {
    setErro('')
    const nome = normalizarNomeTamanho(novoTamanho)
    if (!nome) return
    if (pizza.tamanhos.some((t) => normalizarNomeTamanho(t.nome).toLowerCase() === nome.toLowerCase())) {
      setAbaAtiva('tamanhos')
      setErro('Esse tamanho já está cadastrado.')
      return
    }

    const novosTamanhos = [
      ...pizza.tamanhos,
      { nome, permiteMeio: !!pizza.meioAMeio },
    ]
    setPizza((prev) => ({
      ...prev,
      tamanhos: novosTamanhos,
      sabores: prev.sabores.map((s) => ({
        ...s,
        precos: { ...s.precos, [nome]: '' },
      })),
    }))
    setNovoTamanho('')
  }

  function removerTamanho(index) {
    setErro('')
    const nomeRemovido = pizza.tamanhos[index]?.nome
    const novos = pizza.tamanhos.filter((_, i) => i !== index)
    setPizza((prev) => ({
      ...prev,
      tamanhos: novos,
      sabores: prev.sabores.map((s) => {
        const copia = { ...s, precos: { ...s.precos } }
        delete copia.precos[nomeRemovido]
        return copia
      }),
    }))
  }

  function togglePermiteMeio(index) {
    setErro('')
    const novos = [...pizza.tamanhos]
    novos[index].permiteMeio = !novos[index].permiteMeio
    setPizza({ ...pizza, tamanhos: novos })
  }

  function adicionarSabor() {
    setErro('')
    const precosIniciais = criarPrecosIniciais(pizza.tamanhos)
    setPizza({
      ...pizza,
      sabores: [
        ...pizza.sabores,
        {
          nome: '',
          descricao: '',
          precos: precosIniciais,
        },
      ],
    })
  }

  function atualizarSabor(index, campo, valor) {
    if (erro) setErro('')
    const novos = [...pizza.sabores]
    novos[index][campo] = valor
    setPizza({ ...pizza, sabores: novos })
  }

  function atualizarPreco(index, tamanho, valor) {
    if (erro) setErro('')
    const novos = [...pizza.sabores]
    novos[index].precos[tamanho] = valor
    setPizza({ ...pizza, sabores: novos })
  }

  function removerSabor(index) {
    setErro('')
    const novos = pizza.sabores.filter((_, i) => i !== index)
    setPizza({ ...pizza, sabores: novos })
  }

  function irParaAba(id) {
    setAbaAtiva(id)
    setErro('')
  }

  function irParaAbaAnterior() {
    if (!podeVoltar) return
    irParaAba(abas[indiceAbaAtual - 1].id)
  }

  function irParaProximaAba() {
    if (!podeAvancar) return
    irParaAba(abas[indiceAbaAtual + 1].id)
  }

  async function salvarPizza(e) {
    e.preventDefault()
    setErro('')

    if (!pizza.nome.trim()) {
      setAbaAtiva('info')
      setErro('Informe o nome da pizza.')
      return
    }
    if (pizza.tamanhos.length === 0) {
      setAbaAtiva('tamanhos')
      setErro('Adicione pelo menos um tamanho.')
      return
    }
    if (pizza.sabores.length === 0) {
      setAbaAtiva('sabores')
      setErro('Adicione pelo menos um sabor.')
      return
    }

    const variacoes = pizza.tamanhos.map((t) => ({
      nome: normalizarNomeTamanho(t.nome).toUpperCase(),
      preco: 0,
      fatias: 0,
      max_sabores: t.permiteMeio && pizza.meioAMeio ? 2 : 1,
    }))

    const adicionais = pizza.sabores.map((s, idx) => ({
      nome: String(s.nome || '').trim(),
      descricao: String(s.descricao || '').trim(),
      ativo: true,
      preco: 0,
      is_sabor: true,
      grupo_nome: 'Escolha os sabores',
      grupo_min: 1,
      grupo_max: quantidadeSaboresMax,
      ordem_grupo: 0,
      ordem_item: idx,
      precos_variacoes: pizza.tamanhos.map((t) => ({
        variacao_nome: normalizarNomeTamanho(t.nome).toUpperCase(),
        preco: Number(s.precos?.[t.nome] || 0),
      })),
    }))

    if (adicionais.some((a) => !a.nome)) {
      setAbaAtiva('sabores')
      setErro('Preencha o nome de todos os sabores.')
      return
    }

    const payload = {
      loja_id: lojaId,
      nome: pizza.nome.trim(),
      descricao: pizza.descricao || '',
      categoria: 'Pizza',
      tipo_produto: 'PIZZA',
      pizza_preco_sabores: 'MAIOR',
      setor_impressao: 'PIZZARIA',
      ativo: true,
      destaque: false,
      controla_estoque: false,
      estoque: 0,
      preco: 0,
      imagem_url: '',
      variacoes,
      adicionais,
    }

    setSalvando(true)
    try {
      const salvo = produto
        ? await api.produtos.atualizar(produto.id, payload)
        : await api.produtos.criar(payload)
      onSalvo(salvo, !produto)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar pizza.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={salvarPizza}
        className="bg-white w-full max-w-5xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
      >
        <div className="p-5 border-b border-stone-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">{produto ? 'Editar pizza' : 'Cadastro de pizza'}</h1>
            <p className="text-xs text-stone-500 mt-1">Fluxo em 3 etapas: informações, tamanhos e sabores.</p>
          </div>
          <button type="button" onClick={onFechar} className="text-2xl text-stone-400 hover:text-stone-600 leading-none">&times;</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-stone-200 px-3 sm:px-5 py-2 gap-1 shrink-0 bg-stone-50/70">
          {abas.map((aba, idx) => {
            const ativa = abaAtiva === aba.id
            const concluida = statusAbas[aba.id]
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => irParaAba(aba.id)}
                className={`px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-colors ${ativa
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{idx + 1}. {aba.label}</span>
                  {concluida ? (
                    <FiCheckCircle className="text-green-600 shrink-0" />
                  ) : (
                    <FiAlertCircle className="text-amber-500 shrink-0" />
                  )}
                </span>
                <span className="block text-[11px] text-stone-500 mt-1">{aba.dica}</span>
              </button>
            )
          })}
        </div>

        <div className="px-5 py-3 border-b border-stone-200 bg-white shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Tamanhos</p>
              <p className="font-semibold text-stone-800">{pizza.tamanhos.length}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Sabores</p>
              <p className="font-semibold text-stone-800">{pizza.sabores.length}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Precos preenchidos</p>
              <p className="font-semibold text-stone-800">{totalPrecosConfigurados}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Meio a meio</p>
              <p className={`font-semibold ${pizza.meioAMeio ? 'text-green-700' : 'text-stone-700'}`}>{pizza.meioAMeio ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-4">
          {abaAtiva === 'info' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-800">Etapa 1 - Informações gerais</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Defina o nome da pizza e a descrição usada no cardápio.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome da pizza *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Pizza Tradicional"
                  value={pizza.nome}
                  onChange={(e) => {
                    if (erro) setErro('')
                    setPizza({ ...pizza, nome: e.target.value })
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descrição</label>
                <textarea
                  placeholder="Ex: massa tradicional, molho artesanal..."
                  value={pizza.descricao}
                  onChange={(e) => {
                    if (erro) setErro('')
                    setPizza({ ...pizza, descricao: e.target.value })
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  rows={3}
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={pizza.meioAMeio}
                  onChange={(e) => {
                    if (erro) setErro('')
                    setPizza({ ...pizza, meioAMeio: e.target.checked })
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Permitir meio a meio na loja
              </label>
            </div>
          )}

          {abaAtiva === 'tamanhos' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-stone-700">Etapa 2 - Tamanhos</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Configure os tamanhos disponíveis e se cada um aceita meio a meio.</p>
              </div>

              <div className="space-y-2">
                {pizza.tamanhos.length === 0 && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">Nenhum tamanho cadastrado.</p>
                )}
                {pizza.tamanhos.map((t, index) => (
                  <div key={`${t.nome}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-3 border border-stone-200 bg-white rounded-lg px-3 py-2.5">
                    <span className="font-semibold text-stone-800 min-w-16">{t.nome}</span>
                    <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={t.permiteMeio && pizza.meioAMeio}
                        disabled={!pizza.meioAMeio}
                        onChange={() => togglePermiteMeio(index)}
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      Permite meio a meio
                    </label>
                    <button
                      type="button"
                      onClick={() => removerTamanho(index)}
                      className="sm:ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 className="text-sm" />
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Novo tamanho (ex: Família)"
                  value={novoTamanho}
                  onChange={(e) => setNovoTamanho(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarTamanho())}
                  className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm flex-1"
                />
                <button type="button" onClick={adicionarTamanho} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">
                  <FiPlus className="text-sm" />
                  Adicionar tamanho
                </button>
              </div>

              {!pizza.meioAMeio && (
                <p className="text-[11px] text-stone-500">Com meio a meio desativado, todos os tamanhos aceitam apenas 1 sabor.</p>
              )}
            </div>
          )}

          {abaAtiva === 'sabores' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-stone-700">Etapa 3 - Sabores e preços</p>
                <p className="text-[11px] text-stone-500 mt-0.5">Cadastre os sabores e informe preço por tamanho para cada um.</p>
              </div>

              {pizza.sabores.length === 0 && (
                <p className="text-xs text-stone-500 border border-stone-200 rounded-lg p-3 bg-stone-50">Nenhum sabor adicionado ainda.</p>
              )}

              <div className="space-y-3">
                {pizza.sabores.map((sabor, index) => (
                  <div key={index} className="border border-stone-200 rounded-xl p-4 space-y-3 bg-stone-50">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-stone-800">Sabor {index + 1}</h3>
                      <button type="button" onClick={() => removerSabor(index)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
                        <FiTrash2 className="text-sm" />
                        Remover
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Nome do sabor"
                      value={sabor.nome}
                      onChange={(e) => atualizarSabor(index, 'nome', e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                    />

                    <textarea
                      placeholder="Descrição do sabor"
                      value={sabor.descricao}
                      onChange={(e) => atualizarSabor(index, 'descricao', e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                      rows={2}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {pizza.tamanhos.map((t) => (
                        <label key={t.nome} className="text-xs text-stone-700">
                          <span className="block mb-1 font-semibold">{t.nome} (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={sabor.precos[t.nome] || ''}
                            onChange={(e) => atualizarPreco(index, t.nome, e.target.value)}
                            className="w-full px-2.5 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={adicionarSabor} className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700">
                <FiPlus className="text-sm" />
                Adicionar sabor
              </button>
            </div>
          )}

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>}

          <div className="-mx-5 mt-2 sticky bottom-0 border-t border-stone-200 bg-white/95 backdrop-blur px-5 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-700">Etapa {indiceAbaAtual + 1} de {abas.length}: {abaAtual?.label}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">{abaAtual?.dica}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={irParaAbaAnterior}
                  disabled={!podeVoltar}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="text-sm" />
                  Anterior
                </button>
                {podeAvancar && (
                  <button
                    type="button"
                    onClick={irParaProximaAba}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-800 bg-amber-50 rounded-lg text-xs font-semibold hover:bg-amber-100"
                  >
                    Próxima
                    <FiChevronRight className="text-sm" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar pizza'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
