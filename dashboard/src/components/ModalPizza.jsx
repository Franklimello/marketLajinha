import { useMemo, useState } from 'react'
import { api } from '../api/client'

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

  const quantidadeSaboresMax = useMemo(
    () => pizza.tamanhos.some((t) => t.permiteMeio) && pizza.meioAMeio ? 2 : 1,
    [pizza.tamanhos, pizza.meioAMeio]
  )

  function adicionarTamanho() {
    const nome = normalizarNomeTamanho(novoTamanho)
    if (!nome) return
    if (pizza.tamanhos.some((t) => normalizarNomeTamanho(t.nome).toLowerCase() === nome.toLowerCase())) {
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
    const novos = [...pizza.tamanhos]
    novos[index].permiteMeio = !novos[index].permiteMeio
    setPizza({ ...pizza, tamanhos: novos })
  }

  function adicionarSabor() {
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
    const novos = [...pizza.sabores]
    novos[index][campo] = valor
    setPizza({ ...pizza, sabores: novos })
  }

  function atualizarPreco(index, tamanho, valor) {
    const novos = [...pizza.sabores]
    novos[index].precos[tamanho] = valor
    setPizza({ ...pizza, sabores: novos })
  }

  function removerSabor(index) {
    const novos = pizza.sabores.filter((_, i) => i !== index)
    setPizza({ ...pizza, sabores: novos })
  }

  async function salvarPizza(e) {
    e.preventDefault()
    setErro('')

    if (!pizza.nome.trim()) {
      setErro('Informe o nome da pizza.')
      return
    }
    if (pizza.tamanhos.length === 0) {
      setErro('Adicione pelo menos um tamanho.')
      return
    }
    if (pizza.sabores.length === 0) {
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
        className="bg-white w-full max-w-5xl rounded-xl shadow-lg p-6 md:p-8 space-y-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">{produto ? 'Editar Pizza' : 'Cadastro de Pizza'}</h1>
          <button type="button" onClick={onFechar} className="text-2xl text-stone-400 hover:text-stone-600 leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Informações Gerais</h2>

          <input
            required
            type="text"
            placeholder="Nome da Pizza"
            value={pizza.nome}
            onChange={(e) => setPizza({ ...pizza, nome: e.target.value })}
            className="w-full border rounded-lg px-4 py-2"
          />

          <textarea
            placeholder="Descrição"
            value={pizza.descricao}
            onChange={(e) => setPizza({ ...pizza, descricao: e.target.value })}
            className="w-full border rounded-lg px-4 py-2"
          />

          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={pizza.meioAMeio}
              onChange={(e) => setPizza({ ...pizza, meioAMeio: e.target.checked })}
            />
            Permite meio a meio na loja
          </label>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Tamanhos</h2>

          {pizza.tamanhos.map((t, index) => (
            <div key={`${t.nome}-${index}`} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
              <span className="font-medium">{t.nome}</span>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={t.permiteMeio && pizza.meioAMeio}
                  disabled={!pizza.meioAMeio}
                  onChange={() => togglePermiteMeio(index)}
                />
                Permite meio a meio
              </label>

              <button type="button" onClick={() => removerTamanho(index)} className="text-red-500 ml-auto">
                ✕
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Novo tamanho (ex: Família)"
              value={novoTamanho}
              onChange={(e) => setNovoTamanho(e.target.value)}
              className="border rounded-lg px-3 py-2 flex-1"
            />
            <button type="button" onClick={adicionarTamanho} className="bg-orange-500 text-white px-4 rounded-lg">
              Adicionar
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-semibold text-lg">Sabores</h2>

          {pizza.sabores.map((sabor, index) => (
            <div key={index} className="border p-5 rounded-lg space-y-4 bg-gray-50">
              <div className="flex justify-between">
                <h3 className="font-medium">Sabor {index + 1}</h3>
                <button type="button" onClick={() => removerSabor(index)} className="text-red-500">
                  ✕
                </button>
              </div>

              <input
                type="text"
                placeholder="Nome do sabor"
                value={sabor.nome}
                onChange={(e) => atualizarSabor(index, 'nome', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />

              <textarea
                placeholder="Descrição do sabor"
                value={sabor.descricao}
                onChange={(e) => atualizarSabor(index, 'descricao', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pizza.tamanhos.map((t) => (
                  <div key={t.nome}>
                    <label className="text-sm font-medium">{t.nome} (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sabor.precos[t.nome] || ''}
                      onChange={(e) => atualizarPreco(index, t.nome, e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button type="button" onClick={adicionarSabor} className="bg-orange-500 text-white px-4 py-2 rounded-lg">
            + Adicionar Sabor
          </button>
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar Pizza'}
        </button>
      </form>
    </div>
  )
}
