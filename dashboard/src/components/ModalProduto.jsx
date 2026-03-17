import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../api/client'
import { uploadImagem } from '../config/firebase'
import { FiUpload, FiCamera, FiImage, FiPlus, FiTrash2, FiCheckCircle, FiAlertCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const TAMANHOS_PADRAO = ['P', 'M', 'G', 'GG']
const TAMANHOS_PIZZA_PADRAO = ['BROTO', 'MEDIA', 'GRANDE', 'FAMILIA']
const TAMANHOS_PIZZA_LABEL = { BROTO: 'Broto', MEDIA: 'Média', GRANDE: 'Grande', FAMILIA: 'Família' }
const TAMANHOS_ML_PADRAO = ['100ML', '200ML', '300ML', '400ML', '500ML', '600ML', '700ML', '800ML', '900ML', '1L']
const TAMANHOS_RAPIDOS = [...TAMANHOS_PADRAO, ...TAMANHOS_ML_PADRAO]
const ESTRATEGIAS_PRECO_SABORES = [
  { id: 'MAIOR', label: 'Cobrar sabor mais caro (padrão iFood)' },
  { id: 'MEDIA', label: 'Cobrar média dos sabores' },
  { id: 'SOMA_PROPORCIONAL', label: 'Cobrar soma proporcional dos sabores' },
]
const TIPOS_PRODUTO_UI = [
  { id: 'NORMAL', label: 'Normal' },
  { id: 'HAMBURGUER', label: 'Hambúrguer' },
  { id: 'ROUPA', label: 'Roupa' },
  { id: 'FARMACIA', label: 'Farmácia' },
  { id: 'MERCEARIA', label: 'Mercearia' },
  { id: 'ACAI', label: 'Açaí' },
  { id: 'MARMITA', label: 'Marmita' },
  { id: 'BEBIDAS', label: 'Bebidas' },
]

function getPresetPizza(nome) {
  const normalizado = String(nome || '').trim().toUpperCase()
  const mapa = {
    BROTO: { fatias: 4, max_sabores: 1 },
    MEDIA: { fatias: 6, max_sabores: 2 },
    GRANDE: { fatias: 8, max_sabores: 2 },
    FAMILIA: { fatias: 12, max_sabores: 3 },
  }
  return mapa[normalizado] || { fatias: 8, max_sabores: 2 }
}

function isNomeTamanhoPizza(nome) {
  return TAMANHOS_PIZZA_PADRAO.includes(String(nome || '').trim().toUpperCase())
}

function parseIngredientes(texto) {
  return String(texto || '')
    .split(/[,;\n]/)
    .map((i) => i.trim())
    .filter(Boolean)
    .filter((item, idx, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === idx)
}

function agruparAdicionais(adicionais = []) {
  const map = new Map()
  adicionais.forEach((a) => {
    const grupoNome = String(a.grupo_nome || 'Complementos').trim() || 'Complementos'
    if (!map.has(grupoNome)) {
      map.set(grupoNome, {
        nome: grupoNome,
        min: Number.isFinite(a.grupo_min) ? Number(a.grupo_min) : 0,
        max: Number.isFinite(a.grupo_max) ? Number(a.grupo_max) : 99,
        ordem_grupo: Number.isFinite(a.ordem_grupo) ? Number(a.ordem_grupo) : 0,
        itens: [],
      })
    }
    const g = map.get(grupoNome)
    g.itens.push({
      nome: a.nome || '',
      preco: Number(a.preco || 0),
      is_sabor: !!a.is_sabor,
      descricao: a.descricao || '',
      ativo: a.ativo !== false,
      precos_variacoes: Object.fromEntries(
        (Array.isArray(a.precos_variacoes) ? a.precos_variacoes : [])
          .filter((pv) => String(pv?.variacao?.nome || '').trim())
          .map((pv) => [
            String(pv?.variacao?.nome || '').trim().toUpperCase(),
            Number(pv?.preco || 0),
          ])
      ),
      ordem_item: Number.isFinite(a.ordem_item) ? Number(a.ordem_item) : g.itens.length,
    })
  })
  return [...map.values()]
    .sort((a, b) => a.ordem_grupo - b.ordem_grupo || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((g) => ({
      ...g,
      itens: g.itens.sort((a, b) => a.ordem_item - b.ordem_item || a.nome.localeCompare(b.nome, 'pt-BR')),
    }))
}

export default function ModalProduto({ lojaId, produto, categoriaInicial, categoriasExistentes = [], onFechar, onSalvo }) {
  const [form, setForm] = useState({
    nome: '', descricao: '', preco: 0, estoque: 0,
    controla_estoque: false,
    imagem_url: '', categoria: categoriaInicial || '', setor_impressao: '', ativo: true, destaque: false,
    tipo_produto: 'NORMAL',
    pizza_preco_sabores: 'MAIOR',
  })
  const [variacoes, setVariacoes] = useState([])
  const [gruposAdicionais, setGruposAdicionais] = useState([])
  const [imagemFile, setImagemFile] = useState(null)
  const [imagemPreview, setImagemPreview] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('info')
  const [tipoProdutoUi, setTipoProdutoUi] = useState('NORMAL')
  const [ingredientes, setIngredientes] = useState([])
  const [novoIngrediente, setNovoIngrediente] = useState('')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const autoAdicionaisRef = useRef(false)

  useEffect(() => {
    if (produto) {
      setForm({
        nome: produto.nome || '', descricao: produto.descricao || '',
        preco: Number(produto.preco) || 0, estoque: produto.estoque ?? 0,
        controla_estoque: !!produto.controla_estoque,
        imagem_url: produto.imagem_url || '',
        categoria: produto.categoria || categoriaInicial || '',
        setor_impressao: produto.setor_impressao || '',
        ativo: produto.ativo ?? true,
        destaque: produto.destaque ?? false,
        tipo_produto: produto.tipo_produto || 'NORMAL',
        pizza_preco_sabores: produto.pizza_preco_sabores || 'MAIOR',
      })
      setTipoProdutoUi(produto.tipo_produto || 'NORMAL')
      setVariacoes((produto.variacoes || []).map((v) => ({
        nome: v.nome,
        preco: Number(v.preco),
        fatias: Number(v.fatias || 0),
        max_sabores: Number(v.max_sabores || 1),
      })))
      setGruposAdicionais(agruparAdicionais(produto.adicionais || []))
      setIngredientes(parseIngredientes(produto.descricao || ''))
      setImagemFile(null)
      setImagemPreview(null)
      setNovoIngrediente('')
      autoAdicionaisRef.current = false
    } else {
      setForm({
        nome: '', descricao: '', preco: 0, estoque: 0,
        controla_estoque: false,
        imagem_url: '', categoria: categoriaInicial || '', setor_impressao: '', ativo: true, destaque: false,
        tipo_produto: 'NORMAL',
        pizza_preco_sabores: 'MAIOR',
      })
      setTipoProdutoUi('NORMAL')
      setVariacoes([])
      setGruposAdicionais([])
      setIngredientes([])
      setNovoIngrediente('')
      autoAdicionaisRef.current = false
    }
  }, [produto, categoriaInicial])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    if (name === 'tipo_produto') {
      setTipoProdutoUi(value)
      if (value === 'PIZZA') {
        setForm((prev) => ({ ...prev, tipo_produto: 'PIZZA' }))
      } else {
        // Tipos visuais por segmento continuam salvando como NORMAL no backend.
        setForm((prev) => ({ ...prev, tipo_produto: 'NORMAL' }))
      }
      return
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : ['preco', 'estoque'].includes(name) ? (parseFloat(value) || 0) : value,
    }))
    if (name === 'descricao') {
      setIngredientes(parseIngredientes(value))
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Selecione um arquivo de imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { setErro('Imagem deve ter no máximo 5 MB.'); return }
    setImagemFile(file)
    setImagemPreview(URL.createObjectURL(file))
    setErro('')
  }

  function removerImagem() {
    setImagemFile(null)
    setImagemPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  // Variações
  function addVariacao() {
    setVariacoes((prev) => [...prev, { nome: '', preco: 0, fatias: 0, max_sabores: 1 }])
  }
  function removeVariacao(i) { setVariacoes((prev) => prev.filter((_, idx) => idx !== i)) }
  function handleVariacaoChange(i, field, value) {
    setVariacoes((prev) => prev.map((v, idx) => {
      if (idx !== i) return v
      if (field === 'preco') return { ...v, preco: parseFloat(value) || 0 }
      if (field === 'fatias') return { ...v, fatias: Math.max(0, parseInt(value || 0, 10) || 0) }
      if (field === 'max_sabores') return { ...v, max_sabores: Math.max(1, parseInt(value || 1, 10) || 1) }
      return { ...v, [field]: value }
    }))
  }

  function isTamanhoPadrao(nome) {
    const normalizado = String(nome || '').trim().toUpperCase()
    return TAMANHOS_RAPIDOS.includes(normalizado) || isNomeTamanhoPizza(normalizado)
  }

  function indiceVariacaoPorNome(nome) {
    return variacoes.findIndex((v) => String(v.nome || '').trim().toUpperCase() === String(nome || '').trim().toUpperCase())
  }

  function toggleTamanhoPadrao(nome) {
    const target = String(nome || '').trim().toUpperCase()
    setVariacoes((prev) => {
      const idx = prev.findIndex((v) => String(v.nome || '').trim().toUpperCase() === target)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      const base = { nome: target, preco: 0, fatias: 0, max_sabores: 1 }
      return [...prev, isNomeTamanhoPizza(target) ? { ...base, ...getPresetPizza(target) } : base]
    })
  }

  function setPrecoTamanhoPadrao(nome, valor) {
    const target = String(nome || '').trim().toUpperCase()
    const preco = parseFloat(valor) || 0
    setVariacoes((prev) => {
      const idx = prev.findIndex((v) => String(v.nome || '').trim().toUpperCase() === target)
      if (idx >= 0) {
        return prev.map((v, i) => (i === idx ? { ...v, preco } : v))
      }
      const base = { nome: target, preco, fatias: 0, max_sabores: 1 }
      return [...prev, isNomeTamanhoPizza(target) ? { ...base, ...getPresetPizza(target) } : base]
    })
  }

  function aplicarConfiguracaoRapidaPizza() {
    setVariacoes((prev) => {
      const precosExistentes = new Map(
        (prev || []).map((v) => [String(v.nome || '').trim().toUpperCase(), Number(v.preco || 0)])
      )
      return TAMANHOS_PIZZA_PADRAO.map((tam) => ({
        nome: tam,
        preco: Number(precosExistentes.get(tam) || 0),
        ...getPresetPizza(tam),
      }))
    })
  }

  const variacoesCustomizadas = variacoes.filter((v) => !isTamanhoPadrao(v.nome))

  // Adicionais
  function addGrupoAdicional() {
    setGruposAdicionais((prev) => [
      ...prev,
      { nome: '', min: '', max: '', ordem_grupo: prev.length, itens: [] },
    ])
  }

  function removeGrupoAdicional(idxGrupo) {
    setGruposAdicionais((prev) => prev.filter((_, idx) => idx !== idxGrupo))
  }

  function updateGrupoAdicional(idxGrupo, field, value) {
    setGruposAdicionais((prev) => prev.map((g, idx) => {
      if (idx !== idxGrupo) return g
      const next = { ...g }
      if (field === 'nome') next.nome = value
      if (field === 'min') {
        const raw = String(value ?? '').trim()
        next.min = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0)
      }
      if (field === 'max') {
        const raw = String(value ?? '').trim()
        next.max = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0)
      }
      if (field === 'ordem_grupo') next.ordem_grupo = Math.max(0, parseInt(value || 0, 10) || 0)
      if (next.min !== '' && next.max !== '' && Number(next.max) < Number(next.min)) next.max = next.min
      return next
    }))
  }

  function addItemGrupo(idxGrupo) {
    setGruposAdicionais((prev) => prev.map((g, idx) => {
      if (idx !== idxGrupo) return g
      return {
        ...g,
        itens: [...g.itens, {
          nome: '',
          preco: '',
          descricao: '',
          ativo: true,
          ordem_item: g.itens.length,
          is_sabor: false,
          precos_variacoes: {},
        }],
      }
    }))
  }

  function removeItemGrupo(idxGrupo, idxItem) {
    setGruposAdicionais((prev) => prev.map((g, idx) => {
      if (idx !== idxGrupo) return g
      return {
        ...g,
        itens: g.itens.filter((_, i) => i !== idxItem),
      }
    }))
  }

  function updateItemGrupo(idxGrupo, idxItem, field, value) {
    setGruposAdicionais((prev) => prev.map((g, idx) => {
      if (idx !== idxGrupo) return g
      return {
        ...g,
        itens: g.itens.map((it, i) => {
          if (i !== idxItem) return it
          return {
            ...it,
            [field]: field === 'preco'
              ? (String(value ?? '').trim() === '' ? '' : (parseFloat(value) || 0))
              : field === 'ordem_item'
                ? (parseInt(value || 0, 10) || 0)
                : field === 'is_sabor'
                  ? !!value
                : field === 'ativo'
                  ? !!value
                : value,
          }
        }),
      }
    }))
  }

  function setPrecoVariacaoItem(idxGrupo, idxItem, variacaoNome, valor) {
    const key = String(variacaoNome || '').trim().toUpperCase()
    const preco = String(valor ?? '').trim() === '' ? '' : (parseFloat(valor) || 0)
    setGruposAdicionais((prev) => prev.map((g, idx) => {
      if (idx !== idxGrupo) return g
      return {
        ...g,
        itens: g.itens.map((it, i) => {
          if (i !== idxItem) return it
          return {
            ...it,
            precos_variacoes: {
              ...(it.precos_variacoes || {}),
              [key]: preco,
            },
          }
        }),
      }
    }))
  }

  function setIngredientesNoFormulario(lista) {
    const limpa = lista
      .map((i) => String(i || '').trim())
      .filter(Boolean)
      .filter((item, idx, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === idx)
    setIngredientes(limpa)
    setForm((prev) => ({ ...prev, descricao: limpa.join(', ') }))
  }

  function addIngrediente() {
    const valor = String(novoIngrediente || '').trim()
    if (!valor) return
    setIngredientesNoFormulario([...ingredientes, valor])
    setNovoIngrediente('')
  }

  function removeIngrediente(nome) {
    setIngredientesNoFormulario(ingredientes.filter((i) => i.toLowerCase() !== String(nome).toLowerCase()))
  }

  function sincronizarIngredientesComoAdicionais() {
    if (ingredientes.length === 0) return
    setGruposAdicionais((prev) => {
      const base = prev.length
        ? [...prev]
        : [{ nome: 'Complementos', min: 0, max: ingredientes.length, ordem_grupo: 0, itens: [] }]
      const primeiro = base[0]
      const existentes = new Set(primeiro.itens.map((a) => String(a.nome || '').trim().toLowerCase()))
      const novos = ingredientes
        .filter((ing) => !existentes.has(String(ing || '').trim().toLowerCase()))
        .map((ing, idx) => ({
          nome: ing,
          preco: 0,
          descricao: '',
          ativo: true,
          is_sabor: false,
          precos_variacoes: {},
          ordem_item: primeiro.itens.length + idx,
        }))
      base[0] = { ...primeiro, itens: [...primeiro.itens, ...novos], max: Math.max(primeiro.max || 0, primeiro.itens.length + novos.length) }
      return base
    })
  }

  function aplicarGrupoSaboresPizza() {
    setGruposAdicionais((prev) => {
      const nomeGrupo = 'Escolha os sabores'
      const idxExistente = prev.findIndex(
        (g) => String(g?.nome || '').trim().toLowerCase() === nomeGrupo.toLowerCase()
      )

      const saboresBase = ingredientes.length
        ? ingredientes
        : ['Calabresa', 'Frango com Catupiry', 'Portuguesa', 'Marguerita']

      const itensPadrao = saboresBase.map((nome, idx) => ({
        nome,
        preco: 0,
        descricao: '',
        ativo: true,
        ordem_item: idx,
        is_sabor: true,
        precos_variacoes: {},
      }))

      if (idxExistente >= 0) {
        const copia = [...prev]
        const atual = copia[idxExistente]
        const existentes = new Set((atual.itens || []).map((i) => String(i.nome || '').trim().toLowerCase()))
        const novos = itensPadrao
          .filter((it) => !existentes.has(String(it.nome || '').trim().toLowerCase()))
          .map((it, i) => ({ ...it, ordem_item: (atual.itens?.length || 0) + i }))
        copia[idxExistente] = {
          ...atual,
          nome: nomeGrupo,
          min: Math.max(1, Number(atual.min || 1)),
          max: Math.max(3, Number(atual.max || 3)),
          itens: [
            ...(atual.itens || []).map((it, i) => ({ ...it, ordem_item: Number.isFinite(it.ordem_item) ? it.ordem_item : i })),
            ...novos,
          ],
        }
        return copia
      }

      return [
        ...prev,
        {
          nome: nomeGrupo,
          min: 1,
          max: 3,
          ordem_grupo: prev.length,
          itens: itensPadrao,
        },
      ]
    })
  }

  useEffect(() => {
    if (produto) return
    if (autoAdicionaisRef.current) return
    if (ingredientes.length === 0) return
    setGruposAdicionais((prev) => (prev.length > 0
      ? prev
      : [{
        nome: 'Complementos',
        min: 0,
        max: ingredientes.length,
        ordem_grupo: 0,
        itens: ingredientes.map((ing, idx) => ({
          nome: ing,
          preco: 0,
          descricao: '',
          ativo: true,
          is_sabor: false,
          precos_variacoes: {},
          ordem_item: idx,
        })),
      }]))
    autoAdicionaisRef.current = true
  }, [produto, ingredientes])

  const imagemExibida = imagemPreview || form.imagem_url
  const totalItensAdicionais = useMemo(
    () => gruposAdicionais.reduce((soma, grupo) => soma + (grupo.itens?.length || 0), 0),
    [gruposAdicionais]
  )

  const temSaborPizzaCadastrado = useMemo(
    () => gruposAdicionais.some((grupo) => (grupo.itens || []).some((item) => !!item?.is_sabor && String(item?.nome || '').trim())),
    [gruposAdicionais]
  )

  const temTamanhoPizzaComPreco = useMemo(
    () => variacoes.some((v) => String(v.nome || '').trim() && Number(v.preco || 0) > 0),
    [variacoes]
  )

  const abas = [
    { id: 'info', label: 'Informações', dica: 'Dados principais e classificação.' },
    { id: 'tamanhos', label: `Tamanhos (${variacoes.length})`, dica: 'Preço por tamanho e variações.' },
    { id: 'adicionais', label: `Complementos (${totalItensAdicionais})`, dica: 'Grupos, itens e regras de escolha.' },
  ]

  const statusAbas = useMemo(
    () => ({
      info: Boolean(String(form.nome || '').trim() && String(form.categoria || '').trim()),
      tamanhos: form.tipo_produto === 'PIZZA' ? temTamanhoPizzaComPreco : true,
      adicionais: form.tipo_produto === 'PIZZA' ? temSaborPizzaCadastrado : true,
    }),
    [form.nome, form.categoria, form.tipo_produto, temTamanhoPizzaComPreco, temSaborPizzaCadastrado]
  )

  const indiceAbaAtual = Math.max(0, abas.findIndex((aba) => aba.id === abaAtiva))
  const abaAtual = abas[indiceAbaAtual] || abas[0]
  const podeVoltar = indiceAbaAtual > 0
  const podeAvancar = indiceAbaAtual < abas.length - 1

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

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      if (!String(form.nome || '').trim()) {
        setAbaAtiva('info')
        throw new Error('Informe o nome do produto.')
      }
      if (!String(form.categoria || '').trim()) {
        setAbaAtiva('info')
        throw new Error('Selecione ou crie uma categoria para o produto.')
      }

      let imagem_url = form.imagem_url
      if (imagemFile) {
        const path = `produtos/${lojaId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
        imagem_url = await uploadImagem(imagemFile, path)
      }

      const variacoesLimpas = variacoes
        .filter((v) => v.nome.trim())
        .map((v) => ({
          nome: String(v.nome || '').trim(),
          preco: Number(v.preco || 0),
          fatias: Math.max(0, parseInt(v.fatias || 0, 10) || 0),
          max_sabores: Math.max(1, parseInt(v.max_sabores || 1, 10) || 1),
        }))
      const adicionaisLimpos = gruposAdicionais.flatMap((grupo, idxGrupo) => {
        const nomeGrupo = String(grupo.nome || '').trim()
        if (!nomeGrupo) return []
        const min = Math.max(0, parseInt(grupo.min || 0, 10) || 0)
        const max = Math.max(min, parseInt(grupo.max || 0, 10) || 0)
        return (grupo.itens || [])
          .map((item, idxItem) => ({ item, idxItem }))
          .filter(({ item }) => String(item.nome || '').trim())
          .map(({ item, idxItem }) => ({
            nome: String(item.nome || '').trim(),
            preco: Number(item.preco || 0),
            descricao: String(item.descricao || '').trim(),
            ativo: item.ativo !== false,
            is_sabor: !!item.is_sabor,
            grupo_nome: nomeGrupo,
            grupo_min: min,
            grupo_max: max,
            ordem_grupo: Number.isFinite(grupo.ordem_grupo) ? Number(grupo.ordem_grupo) : idxGrupo,
            ordem_item: Number.isFinite(item.ordem_item) ? Number(item.ordem_item) : idxItem,
            precos_variacoes: Object.entries(item.precos_variacoes || {})
              .filter(([variacao_nome]) => String(variacao_nome || '').trim())
              .map(([variacao_nome, precoVariacao]) => ({
                variacao_nome: String(variacao_nome || '').trim().toUpperCase(),
                preco: Number(precoVariacao || 0),
              })),
          }))
      })
      if (form.tipo_produto === 'PIZZA') {
        if (!variacoesLimpas.length) {
          setAbaAtiva('tamanhos')
          throw new Error('Pizza precisa ter pelo menos um tamanho com preço.')
        }
        const temSabor = adicionaisLimpos.some((a) => a.is_sabor)
        if (!temSabor) {
          setAbaAtiva('adicionais')
          throw new Error('Marque pelo menos um item como sabor de pizza no grupo de adicionais.')
        }
      }
      const dados = {
        ...form,
        estoque: form.controla_estoque ? Number(form.estoque || 0) : 0,
        imagem_url,
        variacoes: variacoesLimpas,
        adicionais: adicionaisLimpos,
      }

      let produtoSalvo
      if (produto) {
        produtoSalvo = await api.produtos.atualizar(produto.id, dados)
      } else {
        produtoSalvo = await api.produtos.criar({ ...dados, loja_id: lojaId })
      }
      onSalvo(produtoSalvo, !produto)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg lg:max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-stone-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {produto ? 'Editar produto' : 'Novo produto'}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Fluxo em 3 etapas: informações, tamanhos e complementos.
            </p>
          </div>
          <button onClick={onFechar} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Abas */}
        <div className="flex gap-2 overflow-x-auto border-b border-stone-200 px-3 sm:px-5 py-2 shrink-0 bg-stone-50/70">
          {abas.map((aba, idx) => {
            const ativa = abaAtiva === aba.id
            const concluida = statusAbas[aba.id]
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => irParaAba(aba.id)}
                className={`min-w-[190px] sm:min-w-0 sm:flex-1 px-3 py-2.5 rounded-lg text-left text-xs font-medium border transition-colors ${ativa
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

        <div className="hidden sm:block px-5 py-3 border-b border-stone-200 bg-white shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Foto</p>
              <p className="font-semibold text-stone-800">{imagemExibida ? 'Configurada' : 'Opcional'}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Tamanhos</p>
              <p className="font-semibold text-stone-800">{variacoes.length}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Complementos</p>
              <p className="font-semibold text-stone-800">{totalItensAdicionais}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2">
              <p className="text-stone-500">Status</p>
              <p className={`font-semibold ${form.ativo ? 'text-green-700' : 'text-red-600'}`}>{form.ativo ? 'Ativo' : 'Inativo'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 pb-8 sm:pb-24 space-y-4">
          {/* ABA INFO */}
          {abaAtiva === 'info' && (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-800">Etapa 1 - Informações principais</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Preencha nome e categoria para liberar um cadastro consistente no cardápio.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Foto do produto</label>
                <div className="flex items-start gap-4">
                  {imagemExibida ? (
                    <div className="relative">
                      <img src={imagemExibida} alt="Preview" className="w-24 h-24 rounded-xl object-cover border-2 border-stone-200" />
                      <button type="button" onClick={removerImagem} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow text-xs">&times;</button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed border-stone-300 rounded-xl flex items-center justify-center">
                      <FiUpload className="text-xl text-stone-300" />
                    </div>
                  )}
                  <div className="flex-1 pt-0.5">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-700 transition-colors">
                        <FiImage className="text-sm" /> Galeria
                      </button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-medium text-amber-700 transition-colors">
                        <FiCamera className="text-sm" /> Câmera
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1.5">JPG, PNG ou WebP (máx. 5 MB)</p>
                    {imagemFile && (
                      <span className="inline-block text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full mt-1">Nova imagem selecionada</span>
                    )}
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome *</label>
                <input name="nome" value={form.nome} onChange={handleChange} required placeholder="ex: X-Burguer" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de produto *</label>
                  <select
                    name="tipo_produto"
                    value={tipoProdutoUi}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    {TIPOS_PRODUTO_UI.map((op) => (
                      <option key={op.id} value={op.id}>{op.label}</option>
                    ))}
                  </select>
                </div>
                {tipoProdutoUi === 'PIZZA' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Preço dos sabores</label>
                    <select
                      name="pizza_preco_sabores"
                      value={form.pizza_preco_sabores}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      {ESTRATEGIAS_PRECO_SABORES.map((op) => (
                        <option key={op.id} value={op.id}>{op.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Descrição / Ingredientes</label>
                <textarea name="descricao" value={form.descricao} onChange={handleChange} rows={3} placeholder="ex: pão, bife, maionese, milho, alface..." className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                <div className="mt-2 rounded-xl border border-stone-200 p-3 bg-stone-50">
                  <p className="text-xs font-medium text-stone-700 mb-2">Ingredientes (entrada rápida)</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {ingredientes.length === 0 && (
                      <span className="text-xs text-stone-400">Nenhum ingrediente adicionado ainda.</span>
                    )}
                    {ingredientes.map((ing) => (
                      <span key={ing} className="inline-flex items-center gap-1.5 text-xs bg-white border border-stone-200 text-stone-700 px-2 py-1 rounded-full">
                        {ing}
                        <button type="button" onClick={() => removeIngrediente(ing)} className="text-red-500 hover:text-red-700 leading-none">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={novoIngrediente}
                      onChange={(e) => setNovoIngrediente(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngrediente())}
                      placeholder="Adicionar ingrediente (ex: queijo prato)"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                    />
                    <button type="button" onClick={addIngrediente} className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700">
                      Adicionar
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2">
                    Os ingredientes são usados como adicionais padrão (preço R$ 0,00) e você ainda pode criar adicionais personalizados.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Categoria *</label>
                {!novaCategoria && categoriasExistentes.length > 0 ? (
                  <div className="space-y-2">
                    <select name="categoria" value={form.categoria} onChange={handleChange} required className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm">
                      <option value="">Selecione uma categoria</option>
                      {categoriasExistentes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => { setNovaCategoria(true); setForm((p) => ({ ...p, categoria: '' })) }} className="text-xs text-amber-600 hover:underline">+ Criar nova categoria</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input name="categoria" value={form.categoria} onChange={handleChange} required placeholder="ex: Hambúrgueres Tradicionais" className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                    {categoriasExistentes.length > 0 && (
                      <button type="button" onClick={() => setNovaCategoria(false)} className="text-xs text-amber-600 hover:underline">Escolher existente</button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Setor de impressão</label>
                <div className="space-y-2">
                  <select
                    name="setor_impressao"
                    value={form.setor_impressao}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="">Nenhum (não imprime)</option>
                    <option value="COZINHA">Cozinha</option>
                    <option value="BAR">Bar</option>
                    <option value="PIZZARIA">Pizzaria</option>
                    <option value="CONFEITARIA">Confeitaria</option>
                    <option value="BALCAO">Balcão</option>
                    <option value="GERAL">Geral</option>
                  </select>
                  <p className="text-xs text-stone-400">Define para qual impressora o item vai quando o pedido for aprovado</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Preço base (R$) {variacoes.length > 0 && <span className="text-stone-400 font-normal">(sem tamanhos)</span>}
                  </label>
                  <input name="preco" type="number" step="0.01" min="0" value={form.preco} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                </div>
                {form.controla_estoque && (
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Estoque</label>
                    <input name="estoque" type="number" min="0" value={form.estoque} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm" />
                  </div>
                )}
              </div>
              {variacoes.length > 0 && (
                <p className="text-xs text-stone-400">Quando há tamanhos, o preço base é ignorado — cada tamanho tem seu preço.</p>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="controla_estoque" checked={!!form.controla_estoque} onChange={handleChange} className="rounded text-amber-600 focus:ring-amber-500" />
                <span className="text-sm font-medium text-stone-700">Controlar estoque deste produto</span>
              </label>
              {!form.controla_estoque && (
                <p className="text-xs text-stone-400 -mt-1">Quando desativado, o sistema não limita vendas por quantidade disponível.</p>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} className="rounded text-amber-600 focus:ring-amber-500" />
                <span className="text-sm font-medium text-stone-700">Produto ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="destaque" checked={!!form.destaque} onChange={handleChange} className="rounded text-amber-600 focus:ring-amber-500" />
                <span className="text-sm font-medium text-stone-700">Marcar como destaque</span>
              </label>
            </>
          )}

          {/* ABA TAMANHOS */}
          {abaAtiva === 'tamanhos' && (
            <>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-stone-700">Etapa 2 - Tamanhos e preços</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {form.tipo_produto === 'PIZZA'
                    ? 'Pizza precisa de pelo menos um tamanho com preço, fatias e limite de sabores.'
                    : 'Defina tamanhos/variações para este produto. Cada tamanho usa seu próprio preço.'}
                </p>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-medium text-stone-600">
                  {form.tipo_produto === 'PIZZA' ? 'Tamanhos rápidos de pizza' : 'Tamanhos rápidos (tradicionais)'}
                </p>
                {form.tipo_produto === 'PIZZA' && (
                  <button
                    type="button"
                    onClick={aplicarConfiguracaoRapidaPizza}
                    className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    Configuração rápida de pizza (Broto, Média, Grande e Família)
                  </button>
                )}
                {(form.tipo_produto === 'PIZZA' ? TAMANHOS_PIZZA_PADRAO : TAMANHOS_PADRAO).map((tam) => {
                  const idx = indiceVariacaoPorNome(tam)
                  const ativo = idx >= 0
                  const precoAtual = ativo ? variacoes[idx].preco : 0
                  const labelTam = form.tipo_produto === 'PIZZA' ? (TAMANHOS_PIZZA_LABEL[tam] || tam) : tam
                  return (
                    <div key={tam} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTamanhoPadrao(tam)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold border transition-colors ${ativo
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-white border-stone-300 text-stone-600 hover:border-amber-400'
                          }`}
                      >
                        {labelTam}
                      </button>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={precoAtual}
                          disabled={!ativo}
                          onFocus={() => { if (!ativo) toggleTamanhoPadrao(tam) }}
                          onChange={(e) => setPrecoTamanhoPadrao(tam, e.target.value)}
                          placeholder={`Preço ${labelTam}`}
                          className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 ${ativo ? 'border-stone-300 bg-white' : 'border-stone-200 bg-stone-100 text-stone-400'
                            }`}
                        />
                      </div>
                    </div>
                  )
                })}
                {form.tipo_produto !== 'PIZZA' && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-stone-600 mb-2">Tamanhos rápidos em ml</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TAMANHOS_ML_PADRAO.map((tam) => {
                      const idx = indiceVariacaoPorNome(tam)
                      const ativo = idx >= 0
                      const precoAtual = ativo ? variacoes[idx].preco : 0
                      const label = tam === '1L' ? '1 litro' : tam.toLowerCase()

                      return (
                        <div key={tam} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTamanhoPadrao(tam)}
                            className={`w-16 h-9 rounded-lg text-[11px] font-bold border transition-colors ${ativo
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-white border-stone-300 text-stone-600 hover:border-amber-400'
                              }`}
                            title={label}
                          >
                            {label}
                          </button>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={precoAtual}
                              disabled={!ativo}
                              onFocus={() => { if (!ativo) toggleTamanhoPadrao(tam) }}
                              onChange={(e) => setPrecoTamanhoPadrao(tam, e.target.value)}
                              placeholder={`Preço ${label}`}
                              className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 ${ativo ? 'border-stone-300 bg-white' : 'border-stone-200 bg-stone-100 text-stone-400'
                                }`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}
                <p className="text-[11px] text-stone-400">
                  Toque no tamanho para ativar/desativar. Com os tamanhos ativos, cada um usa seu próprio preço.
                </p>
              </div>
              <div className="space-y-2">
                {variacoesCustomizadas.length > 0 && (
                  <div className="hidden sm:grid sm:grid-cols-[1fr_7rem_2rem] gap-2 px-1">
                    <span className="text-[11px] font-semibold text-stone-600">Tamanho / Variação</span>
                    <span className="text-[11px] font-semibold text-stone-600">Preço (R$)</span>
                    <span className="text-[11px] font-semibold text-stone-600 text-center">Ação</span>
                  </div>
                )}
                {variacoesCustomizadas.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={v.nome}
                      onChange={(e) => {
                        const idxReal = variacoes.findIndex((x) => x === v)
                        handleVariacaoChange(idxReal, 'nome', e.target.value)
                      }}
                      placeholder="Nome (ex: G)"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.preco}
                        onChange={(e) => {
                          const idxReal = variacoes.findIndex((x) => x === v)
                          handleVariacaoChange(idxReal, 'preco', e.target.value)
                        }}
                        className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const idxReal = variacoes.findIndex((x) => x === v)
                        removeVariacao(idxReal)
                      }}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addVariacao} className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
                <FiPlus /> Adicionar tamanho personalizado
              </button>
              {form.tipo_produto === 'PIZZA' && variacoes.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">Regras por tamanho da pizza</p>
                  <div className="hidden sm:grid sm:grid-cols-3 gap-2 px-1">
                    <span className="text-[11px] font-semibold text-amber-900">Tamanho</span>
                    <span className="text-[11px] font-semibold text-amber-900">Fatias</span>
                    <span className="text-[11px] font-semibold text-amber-900">Máx. sabores</span>
                  </div>
                  {variacoes.map((v, i) => (
                    <div key={`${v.nome}-${i}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={v.nome}
                        onChange={(e) => handleVariacaoChange(i, 'nome', e.target.value)}
                        placeholder="Tamanho"
                        aria-label="Tamanho da pizza"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        value={v.fatias || 0}
                        onChange={(e) => handleVariacaoChange(i, 'fatias', e.target.value)}
                        placeholder="Fatias"
                        aria-label="Quantidade de fatias"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                      />
                      <input
                        type="number"
                        min="1"
                        value={v.max_sabores || 1}
                        onChange={(e) => handleVariacaoChange(i, 'max_sabores', e.target.value)}
                        placeholder="Máx. sabores"
                        aria-label="Máximo de sabores permitido"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white"
                      />
                    </div>
                  ))}
                  <p className="text-[11px] text-amber-700">
                    Exemplo recomendado: Broto 1 sabor, Média 2, Grande 2, Família 3.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ABA ADICIONAIS */}
          {abaAtiva === 'adicionais' && (
            <>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-stone-700">Etapa 3 - Complementos e regras</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Separe os complementos por grupo e configure mínimo/máximo de escolha para cada grupo.
                </p>
              </div>
              {form.tipo_produto === 'PIZZA' && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Marque como <strong>Sabor</strong> os itens do grupo "Escolha os sabores". O limite máximo será definido automaticamente pelo tamanho selecionado.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={sincronizarIngredientesComoAdicionais}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                >
                  <FiPlus /> Usar ingredientes como adicionais
                </button>
                {form.tipo_produto === 'PIZZA' && (
                  <button
                    type="button"
                    onClick={aplicarGrupoSaboresPizza}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-400 bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
                  >
                    <FiPlus /> Configuração rápida de sabores (pizza)
                  </button>
                )}
                <span className="text-[11px] text-stone-400">
                  Adiciona os ingredientes no primeiro grupo.
                </span>
              </div>
              <div className="space-y-3">
                {gruposAdicionais.map((grupo, idxGrupo) => (
                  <div key={idxGrupo} className="border border-stone-200 rounded-xl p-3 bg-stone-50">
                    <div className="hidden sm:grid sm:grid-cols-4 gap-2 px-1 mb-1">
                      <span className="sm:col-span-2 text-[11px] font-semibold text-stone-600">Nome do grupo</span>
                      <span className="text-[11px] font-semibold text-stone-600">Mínimo</span>
                      <span className="text-[11px] font-semibold text-stone-600">Máximo</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                      <input
                        value={grupo.nome}
                        onChange={(e) => updateGrupoAdicional(idxGrupo, 'nome', e.target.value)}
                        placeholder="Nome do grupo (ex: Frutas)"
                        className="sm:col-span-2 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        value={grupo.min}
                        onChange={(e) => updateGrupoAdicional(idxGrupo, 'min', e.target.value)}
                        placeholder="Mín"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <input
                        type="number"
                        min="0"
                        value={grupo.max}
                        onChange={(e) => updateGrupoAdicional(idxGrupo, 'max', e.target.value)}
                        placeholder="Máx"
                        className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      {(grupo.itens?.length || 0) > 0 && (
                        <div className={`hidden sm:grid gap-2 px-1 ${form.tipo_produto === 'PIZZA' ? 'sm:grid-cols-[1fr_7rem_6rem_2rem]' : 'sm:grid-cols-[1fr_7rem_2rem]'}`}>
                          <span className="text-[11px] font-semibold text-stone-600">Item</span>
                          <span className="text-[11px] font-semibold text-stone-600">Preço (R$)</span>
                          {form.tipo_produto === 'PIZZA' && <span className="text-[11px] font-semibold text-stone-600">Tipo</span>}
                          <span className="text-[11px] font-semibold text-stone-600 text-center">Ação</span>
                        </div>
                      )}
                      {grupo.itens.map((item, idxItem) => (
                        <div key={idxItem} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              value={item.nome}
                              onChange={(e) => updateItemGrupo(idxGrupo, idxItem, 'nome', e.target.value)}
                              placeholder="Nome do item (ex: Morango)"
                              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                            />
                            <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.preco}
                                onChange={(e) => updateItemGrupo(idxGrupo, idxItem, 'preco', e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                              />
                            </div>
                            {form.tipo_produto === 'PIZZA' && (
                              <label className="inline-flex items-center gap-1.5 text-xs text-stone-700 px-2 py-1 rounded-md bg-white border border-stone-200">
                                <input
                                  type="checkbox"
                                  checked={!!item.is_sabor}
                                  onChange={(e) => updateItemGrupo(idxGrupo, idxItem, 'is_sabor', e.target.checked)}
                                  className="rounded text-amber-600 focus:ring-amber-500"
                                />
                                Sabor
                              </label>
                            )}
                            <button type="button" onClick={() => removeItemGrupo(idxGrupo, idxItem)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                          {form.tipo_produto === 'PIZZA' && item.is_sabor && variacoes.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                              <p className="text-[11px] font-semibold text-amber-800 mb-2">
                                Preço por tamanho deste sabor
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {variacoes.map((v, idxVar) => {
                                  const nomeVariacao = String(v.nome || '').trim().toUpperCase()
                                  return (
                                    <label key={`${nomeVariacao}-${idxVar}`} className="text-[11px] text-amber-900">
                                      <span className="block mb-1 font-semibold">{nomeVariacao}</span>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400">R$</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={item?.precos_variacoes?.[nomeVariacao] ?? ''}
                                          onChange={(e) => setPrecoVariacaoItem(idxGrupo, idxItem, nomeVariacao, e.target.value)}
                                          className="w-full pl-7 pr-2 py-1.5 border border-amber-200 rounded-md text-xs bg-white focus:ring-2 focus:ring-amber-400"
                                        />
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button type="button" onClick={() => addItemGrupo(idxGrupo)} className="text-xs text-amber-700 font-medium hover:underline">
                        + Adicionar item no grupo
                      </button>
                      <button type="button" onClick={() => removeGrupoAdicional(idxGrupo)} className="text-xs text-red-600 font-medium hover:underline">
                        Remover grupo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addGrupoAdicional} className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
                <FiPlus /> Adicionar grupo de complementos
              </button>
            </>
          )}

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{erro}</p>}

          <div className="-mx-5 mt-2 border-t border-stone-200 bg-white/95 backdrop-blur px-5 py-3 sm:sticky sm:bottom-0 sm:z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-700">
                  Etapa {indiceAbaAtual + 1} de {abas.length}: {abaAtual?.label}
                </p>
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
                <button type="submit" disabled={carregando} className="px-4 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm">
                  {carregando ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
