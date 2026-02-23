import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FiStar, FiSearch, FiX, FiMessageCircle, FiInstagram } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { api } from '../api/client'
import SEO from '../componentes/SEO'

const SUPORTE_WHATSAPP = '5519997050303'
const SUPORTE_NOME = 'Franklim'
const SUPORTE_INSTAGRAM = 'https://www.instagram.com/franklimello30/'

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

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function LojaCard({ loja, idx }) {
  const aberta = loja.aberta_agora ?? loja.aberta
  const taxa = loja.taxa_entrega ?? 0
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const isAboveFold = idx < 4

  return (
    <Link
      to={`/loja/${loja.slug}`}
      className={`flex items-center gap-4 px-2 py-3.5 rounded-xl transition-all duration-200 hover:bg-stone-50 active:scale-[0.98] animate-fade-in-up ${
        !aberta ? 'opacity-50' : ''
      }`}
      style={{ animationDelay: `${Math.min(idx, 10) * 50}ms` }}
    >
      <div className="relative shrink-0">
        {!imgError && loja.logo_url ? (
          <img
            src={loja.logo_url}
            alt={loja.nome}
            loading={isAboveFold ? 'eager' : 'lazy'}
            fetchPriority={isAboveFold ? 'high' : 'auto'}
            decoding={isAboveFold ? 'sync' : 'async'}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`w-16 h-16 rounded-xl object-cover bg-stone-200 transition-opacity duration-300 ${!aberta ? 'grayscale' : ''} ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold text-white"
            style={{ backgroundColor: loja.cor_primaria || '#78716c' }}
          >
            {loja.nome?.charAt(0)}
          </div>
        )}
        {!imgLoaded && !imgError && loja.logo_url && (
          <div className="absolute inset-0 w-16 h-16 rounded-xl skeleton" />
        )}
        {!aberta && (
          <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Fechada</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-bold text-stone-900 truncate">{loja.nome}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-stone-500">
          {(loja.nota_media ?? 0) > 0 && (
            <>
              <FiStar className="text-yellow-500 fill-yellow-500 text-[11px]" />
              <span className="font-medium text-stone-700">{Number(loja.nota_media).toFixed(1).replace('.', ',')}</span>
              <span className="text-stone-300">&bull;</span>
            </>
          )}
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
        </div>
        {!aberta && loja.horario_hoje?.aberto && (
          <p className="text-[10px] text-stone-400 mt-0.5">Abre hoje às {loja.horario_hoje.abertura}</p>
        )}
      </div>
    </Link>
  )
}

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

  const lojasAbertas = useMemo(() => lojas.filter((l) => l.aberta_agora ?? l.aberta), [lojas])
  const lojasFechadas = useMemo(() => lojas.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojas])

  const lojasFiltradas = useMemo(() => {
    let lista = [...lojasAbertas, ...lojasFechadas]
    if (busca.trim()) {
      const b = busca.toLowerCase()
      lista = lista.filter(
        (l) => l.nome.toLowerCase().includes(b) || l.categoria_negocio.toLowerCase().includes(b)
      )
    }
    if (categoriaSel) {
      const c = categoriaSel.toLowerCase()
      lista = lista.filter((l) => l.categoria_negocio.toLowerCase().includes(c))
    }
    return lista
  }, [lojasAbertas, lojasFechadas, busca, categoriaSel])

  const filtradasAbertas = useMemo(() => lojasFiltradas.filter((l) => l.aberta_agora ?? l.aberta), [lojasFiltradas])
  const filtradasFechadas = useMemo(() => lojasFiltradas.filter((l) => !(l.aberta_agora ?? l.aberta)), [lojasFiltradas])

  if (carregando) {
    return (
      <div className="max-w-lg mx-auto px-4">
        <div className="skeleton h-6 rounded w-40 mb-1" />
        <div className="skeleton h-4 rounded w-56 mb-5" />
        <div className="h-12 skeleton rounded-xl mb-5" />
        <div className="flex gap-4 overflow-hidden mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-14 h-14 rounded-full skeleton" />
              <div className="w-10 h-2 skeleton rounded" />
            </div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-2 py-3.5">
            <div className="w-16 h-16 rounded-xl skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-stone-700 font-medium text-sm mb-1">Ops, algo deu errado</p>
        <p className="text-stone-400 text-xs mb-4">{erro}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          Tentar novamente
        </button>
      </div>
    )
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'UaiFood',
    url: 'https://uaifooddelivery.vercel.app',
    description: 'Marketplace com os melhores estabelecimentos da sua cidade',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://uaifooddelivery.vercel.app/busca?q={search_term_string}',
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

      {/* Greeting */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-stone-900">{saudacao()}!</h2>
        <p className="text-sm text-stone-400 mt-0.5">
          {lojasAbertas.length > 0
            ? `${lojasAbertas.length} loja${lojasAbertas.length !== 1 ? 's' : ''} aberta${lojasAbertas.length !== 1 ? 's' : ''} agora`
            : 'Nenhuma loja aberta no momento'}
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lojas e restaurantes"
          className="w-full pl-10 pr-10 py-3 bg-stone-100 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/40"
        />
        {busca && (
          <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5">
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Categorias */}
      <div ref={catRef} className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIAS.map((cat) => {
          const ativo = categoriaSel === cat.nome
          return (
            <button
              key={cat.nome}
              onClick={() => setCategoriaSel(ativo ? null : cat.nome)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${ativo ? 'bg-red-100 ring-2 ring-red-500 scale-110' : 'bg-stone-100 hover:bg-stone-200'}`}>
                {cat.emoji}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap transition-colors ${ativo ? 'text-red-600' : 'text-stone-600'}`}>{cat.nome}</span>
            </button>
          )
        })}
      </div>

      {/* Active filter chip */}
      {categoriaSel && (
        <div className="flex items-center gap-2 mb-3 animate-fade-in-up">
          <span className="text-xs text-stone-500">Filtrando por:</span>
          <button
            onClick={() => setCategoriaSel(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
          >
            {categoriaSel} <FiX size={12} />
          </button>
        </div>
      )}

      {/* Stores */}
      {lojasFiltradas.length === 0 ? (
        <div className="text-center py-16 animate-fade-in-up">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-stone-700 font-medium text-sm mb-1">Nenhuma loja encontrada</p>
          <p className="text-stone-400 text-xs">
            {busca ? 'Tente buscar por outro nome ou categoria' : 'Não há lojas nesta categoria'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtradasAbertas.length > 0 && (
            <>
              {!busca && !categoriaSel && filtradasFechadas.length > 0 && (
                <div className="flex items-center gap-2 pt-1 pb-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-semibold text-stone-700">Abertas agora</span>
                </div>
              )}
              {filtradasAbertas.map((loja, idx) => (
                <LojaCard key={loja.id} loja={loja} idx={idx} />
              ))}
            </>
          )}

          {filtradasFechadas.length > 0 && (
            <>
              {!busca && !categoriaSel && filtradasAbertas.length > 0 && (
                <div className="flex items-center gap-2 pt-4 pb-2">
                  <span className="w-2 h-2 bg-stone-300 rounded-full" />
                  <span className="text-xs font-semibold text-stone-400">Fechadas</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>
              )}
              {filtradasFechadas.map((loja, idx) => (
                <LojaCard key={loja.id} loja={loja} idx={filtradasAbertas.length + idx} />
              ))}
            </>
          )}
        </div>
      )}

      {/* CTA Cadastrar loja */}
      <div className="mt-8 mb-4 bg-stone-950 rounded-2xl p-5 text-white animate-fade-in-up">
        <h3 className="text-lg font-bold">Tem um negócio?</h3>
        <p className="text-sm text-stone-400 mt-1 leading-relaxed">
          Cadastre sua loja no UaiFood e comece a vender online para toda a cidade!
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <a
            href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Quero cadastrar minha loja no UaiFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 transition-colors"
          >
            <FaWhatsapp className="text-lg" />
            WhatsApp
          </a>
          <a
            href={SUPORTE_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-colors"
          >
            <FiInstagram className="text-lg" />
            Instagram
          </a>
        </div>
      </div>

      {/* Suporte */}
      <div className="text-center pb-4 space-y-1">
        <p className="text-[10px] text-stone-300">Precisa de ajuda?</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso de ajuda com o UaiFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-green-600 transition-colors"
          >
            <FaWhatsapp size={11} /> WhatsApp
          </a>
          <span className="text-stone-200">·</span>
          <a
            href={SUPORTE_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-pink-600 transition-colors"
          >
            <FiInstagram size={11} /> Instagram
          </a>
        </div>
      </div>
    </div>
  )
}
