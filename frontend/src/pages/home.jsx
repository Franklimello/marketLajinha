import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiStar, FiSearch } from 'react-icons/fi'
import { api } from '../api/client'
import SEO from '../componentes/SEO'

const CATEGORIAS = [
  { nome: 'Pizza', emoji: '🍕' },
  { nome: 'Burguer', emoji: '🍔' },
  { nome: 'Porções', emoji: '🍗' },
  { nome: 'Marmitex', emoji: '🍱' },
  { nome: 'Carnes', emoji: '🍢' },
  { nome: 'Salgados', emoji: '🥟' },
  { nome: 'Açaí', emoji: '🍇' },
  { nome: 'Doces', emoji: '🍩' },
  { nome: 'Bebidas', emoji: '🥤' },
  { nome: 'Japonesa', emoji: '🍣' },
  { nome: 'Padaria', emoji: '🥖' },
  { nome: 'Saudável', emoji: '🥗' },
  { nome: 'Sorvetes', emoji: '🍦' },
  { nome: 'Café', emoji: '☕' },
  { nome: 'Petiscos', emoji: '🧆' },
]

export default function HomePage() {
  const [lojas, setLojas] = useState([])
  const [busca, setBusca] = useState('')
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const catRef = useRef(null)

  useEffect(() => {
    api.lojas
      .listarAtivas()
      .then(setLojas)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500 text-sm">Erro ao carregar lojas: {erro}</p>
      </div>
    )
  }

  const lojasAbertas = lojas.filter((l) => l.aberta_agora ?? l.aberta)
  const lojasFechadas = lojas.filter((l) => !(l.aberta_agora ?? l.aberta))
  const todasOrdenadas = [...lojasAbertas, ...lojasFechadas]

  let lojasFiltradas = todasOrdenadas
  if (busca.trim()) {
    const b = busca.toLowerCase()
    lojasFiltradas = lojasFiltradas.filter(
      (l) => l.nome.toLowerCase().includes(b) || l.categoria_negocio.toLowerCase().includes(b)
    )
  }
  if (categoriaSel) {
    const c = categoriaSel.toLowerCase()
    lojasFiltradas = lojasFiltradas.filter(
      (l) => l.categoria_negocio.toLowerCase().includes(c)
    )
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MarketLajinha',
    url: 'https://marketlajinha.com.br',
    description: 'Marketplace com os melhores estabelecimentos da sua cidade',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://marketlajinha.com.br/busca?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <div className="max-w-lg mx-auto px-4">
      <SEO
        title="Início"
        description="Peça dos melhores restaurantes, lanchonetes e estabelecimentos da sua cidade. Entrega rápida e segura."
        jsonLd={jsonLd}
      />
      {/* Search */}
      <div className="relative mb-5">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lojas e restaurantes"
          className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
      </div>

      {/* Categorias */}
      <div ref={catRef} className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIAS.map((cat) => {
          const ativo = categoriaSel === cat.nome
          return (
            <button
              key={cat.nome}
              onClick={() => setCategoriaSel(ativo ? null : cat.nome)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${ativo ? 'bg-amber-100 ring-2 ring-amber-500 scale-110' : 'bg-stone-100 hover:bg-stone-200'}`}>
                {cat.emoji}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${ativo ? 'text-amber-700' : 'text-stone-600'}`}>{cat.nome}</span>
            </button>
          )
        })}
      </div>

      {/* Store list */}
      <div className="space-y-1">
        {lojasFiltradas.map((loja) => {
          const aberta = loja.aberta_agora ?? loja.aberta
          const taxa = loja.taxa_entrega ?? 0

          return (
            <Link
              key={loja.id}
              to={`/loja/${loja.slug}`}
              className={`flex items-center gap-4 px-2 py-3.5 rounded-xl transition-colors hover:bg-stone-50 active:bg-stone-100 ${
                !aberta ? 'opacity-50' : ''
              }`}
            >
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <img
                  src={loja.logo_url || ''}
                  alt={loja.nome}
                  className={`w-16 h-16 rounded-xl object-cover bg-stone-200 ${!aberta ? 'grayscale' : ''}`}
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
                <div
                  className="w-16 h-16 rounded-xl items-center justify-center text-xl font-bold text-white hidden"
                  style={{ backgroundColor: loja.cor_primaria || '#78716c' }}
                >
                  {loja.nome?.charAt(0)}
                </div>
                {!aberta && (
                  <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Fechada</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-stone-900 truncate">
                  {loja.nome}
                </h3>

                <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-500">
                  <FiStar className="text-amber-500 fill-amber-500 text-[11px]" />
                  <span className="font-medium text-stone-700">4,9</span>
                  <span className="text-stone-300">&bull;</span>
                  <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h4l2-2" />
                  </svg>
                  {taxa === 0 ? (
                    <span className="font-semibold text-green-600">grátis</span>
                  ) : (
                    <span>R$ {taxa.toFixed(2).replace('.', ',')}</span>
                  )}
                  {loja.tempo_entrega && (
                    <>
                      <span className="text-stone-300">&bull;</span>
                      <span>{loja.tempo_entrega}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          )
        })}

        {lojasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-400 text-sm">Nenhuma loja encontrada.</p>
          </div>
        )}
      </div>
    </div>
  )
}
