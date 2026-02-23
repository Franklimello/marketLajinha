import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiSearch, FiX, FiStar, FiMapPin } from 'react-icons/fi'
import { api } from '../api/client'
import SEO from '../componentes/SEO'

export default function BuscaPage() {
  const [lojas, setLojas] = useState([])
  const [busca, setBusca] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.lojas
      .listarAtivas()
      .then(setLojas)
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const categorias = useMemo(() => {
    const cats = [...new Set(lojas.map((l) => l.categoria_negocio).filter(Boolean))]
    return cats.sort()
  }, [lojas])

  const resultados = useMemo(() => {
    let lista = [...lojas]

    if (categoriaSel) {
      lista = lista.filter((l) => l.categoria_negocio === categoriaSel)
    }

    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          l.categoria_negocio?.toLowerCase().includes(q) ||
          l.cidade?.toLowerCase().includes(q)
      )
    }

    const abertas = lista.filter((l) => l.aberta_agora ?? l.aberta)
    const fechadas = lista.filter((l) => !(l.aberta_agora ?? l.aberta))
    return [...abertas, ...fechadas]
  }, [lojas, busca, categoriaSel])

  return (
    <div className="max-w-lg mx-auto px-4 pb-4">
      <SEO
        title="Buscar estabelecimentos"
        description="Encontre restaurantes, lanchonetes, pizzarias e outros estabelecimentos na sua cidade."
      />
      {/* Search input */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, categoria ou cidade..."
          autoFocus
          className="w-full pl-10 pr-10 py-3 bg-stone-100 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <FiX />
          </button>
        )}
      </div>

      {/* Categories */}
      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <button
            onClick={() => setCategoriaSel('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !categoriaSel
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaSel(categoriaSel === cat ? '' : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoriaSel === cat
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {(busca || categoriaSel) && (
        <p className="text-xs text-stone-400 mb-3">
          {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
          {categoriaSel && <span> em <strong className="text-stone-600">{categoriaSel}</strong></span>}
        </p>
      )}

      {/* Loading */}
      {carregando && (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {!carregando && (
        <div className="space-y-1">
          {resultados.map((loja) => {
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
                <div className="relative shrink-0">
                  <img
                    src={loja.logo_url || ''}
                    alt={loja.nome}
                    className={`w-16 h-16 rounded-xl object-cover bg-stone-200 ${!aberta ? 'grayscale' : ''}`}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
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

                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-stone-900 truncate">{loja.nome}</h3>
                  <p className="text-xs text-stone-400 truncate mt-0.5">{loja.categoria_negocio}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-500">
                    <FiStar className="text-yellow-500 fill-yellow-500 text-[11px]" />
                    <span className="font-medium text-stone-700">4,9</span>
                    <span className="text-stone-300">&bull;</span>
                    {taxa === 0 ? (
                      <span className="font-semibold text-green-600">Entrega grátis</span>
                    ) : (
                      <span>R$ {taxa.toFixed(2).replace('.', ',')}</span>
                    )}
                    {loja.tempo_entrega && (
                      <>
                        <span className="text-stone-300">&bull;</span>
                        <span>{loja.tempo_entrega}</span>
                      </>
                    )}
                    {loja.cidade && (
                      <>
                        <span className="text-stone-300">&bull;</span>
                        <FiMapPin className="text-[10px]" />
                        <span>{loja.cidade}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}

          {resultados.length === 0 && !carregando && (
            <div className="text-center py-16">
              <FiSearch className="mx-auto text-3xl text-stone-300 mb-3" />
              <p className="text-stone-500 text-sm font-medium">Nenhuma loja encontrada</p>
              <p className="text-stone-400 text-xs mt-1">Tente buscar com outros termos</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
