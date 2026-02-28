import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowLeft, FiMessageCircle, FiSend, FiThumbsUp, FiBarChart2 } from 'react-icons/fi'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SEO from '../componentes/SEO'
import { getItem as getLocalItem } from '../storage/localStorageService'

const SELECTED_CITY_KEY = 'selectedCity'

function tempoRelativo(data) {
  const ms = Date.now() - new Date(data).getTime()
  const min = Math.max(1, Math.floor(ms / 60000))
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} hora${h > 1 ? 's' : ''}`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

function cidadeDoCliente(cliente) {
  const enderecos = Array.isArray(cliente?.enderecos) ? cliente.enderecos : []
  if (!enderecos.length) return ''
  const padrao = enderecos.find((e) => e?.padrao) || enderecos[0]
  return String(padrao?.cidade || '').trim()
}

function PostCard({ post, onCurtir, onVotar, onAbrirComentarios, comentariosAbertos }) {
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [carregandoComentarios, setCarregandoComentarios] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [erroComentario, setErroComentario] = useState('')
  const [votando, setVotando] = useState(false)

  async function toggleComentarios() {
    if (comentariosAbertos) {
      onAbrirComentarios(post.id, false, [])
      return
    }
    setCarregandoComentarios(true)
    try {
      const lista = await api.feed.listarComentarios(post.id)
      setComentarios(lista)
      onAbrirComentarios(post.id, true, lista)
    } catch {
      onAbrirComentarios(post.id, true, [])
    } finally {
      setCarregandoComentarios(false)
    }
  }

  async function enviarComentario(e) {
    e.preventDefault()
    if (!comentario.trim() || enviando) return
    setEnviando(true)
    setErroComentario('')
    try {
      const res = await api.feed.comentar(post.id, comentario.trim())
      const novo = res?.comment
      if (novo) {
        const atualizados = [...comentarios, novo]
        setComentarios(atualizados)
        onAbrirComentarios(post.id, true, atualizados, res?.comment_count)
      }
      setComentario('')
    } catch (err) {
      setErroComentario(err.message || 'Não foi possível comentar.')
    } finally {
      setEnviando(false)
    }
  }

  async function votar(option) {
    if (post.has_voted || votando) return
    setVotando(true)
    try {
      const res = await api.feed.votar(post.id, option)
      onVotar(post.id, res?.vote_results || [])
    } finally {
      setVotando(false)
    }
  }

  const resultadosPorOpcao = useMemo(() => {
    const map = new Map()
    for (const row of post.vote_results || []) {
      map.set(String(row.option_selected), Number(row.count || 0))
    }
    return map
  }, [post.vote_results])

  return (
    <article className="bg-white rounded-2xl border border-stone-200 p-4">
      <div className="flex items-center gap-3">
        {post.store?.logo_url ? (
          <img src={post.store.logo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-stone-200" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
            {post.store?.nome?.charAt(0) || 'L'}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{post.store?.nome || 'Loja'}</p>
          <p className="text-xs text-stone-400">{tempoRelativo(post.created_at)}</p>
        </div>
      </div>

      <p className="text-sm text-stone-700 leading-relaxed mt-3 whitespace-pre-wrap">{post.content}</p>

      {post.image_url && (
        <div className="mt-3 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
          <img src={post.image_url} alt="" className="w-full object-cover max-h-80" loading="lazy" />
        </div>
      )}

      {post.post_type === 'poll' && Array.isArray(post.poll_options) && post.poll_options.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">
            <FiBarChart2 size={12} /> Enquete
          </div>
          {post.poll_options.map((opt) => {
            const votos = resultadosPorOpcao.get(String(opt)) || 0
            return (
              <button
                key={`${post.id}-${opt}`}
                type="button"
                disabled={post.has_voted || votando}
                onClick={() => votar(opt)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  post.has_voted
                    ? 'bg-stone-50 border-stone-200 text-stone-700 cursor-default'
                    : 'bg-white border-stone-300 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{opt}</span>
                  {post.has_voted && <span className="text-xs font-semibold text-stone-500">{votos}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCurtir(post.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            post.has_liked
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <FiThumbsUp size={13} /> {post.like_count}
        </button>
        <button
          type="button"
          onClick={toggleComentarios}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
        >
          <FiMessageCircle size={13} /> {post.comment_count}
        </button>
      </div>

      {comentariosAbertos && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          {carregandoComentarios ? (
            <p className="text-xs text-stone-400">Carregando comentários...</p>
          ) : comentarios.length === 0 ? (
            <p className="text-xs text-stone-400">Nenhum comentário ainda.</p>
          ) : (
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
              {comentarios.map((c) => (
                <div key={c.id} className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2">
                  <p className="font-semibold text-stone-700">{c.user?.nome || 'Cliente'}</p>
                  <p className="text-stone-600 mt-0.5">{c.comment}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={enviarComentario} className="flex items-center gap-2">
            <input
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength={280}
              placeholder="Comentar..."
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              disabled={enviando || !comentario.trim()}
              className="w-9 h-9 rounded-lg bg-red-600 text-white inline-flex items-center justify-center disabled:opacity-50"
            >
              <FiSend size={14} />
            </button>
          </form>
          {erroComentario && <p className="text-xs text-red-600 mt-1.5">{erroComentario}</p>}
        </div>
      )}
    </article>
  )
}

export default function FeedCidadePage() {
  const { cliente } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [posts, setPosts] = useState([])
  const [cityInfo, setCityInfo] = useState(null)
  const [comentariosAbertos, setComentariosAbertos] = useState({})

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      setLoading(true)
      setErro('')
      try {
        const cidadeSelecionada = String(getLocalItem(SELECTED_CITY_KEY, '') || '').trim()
        const cidadeFallback = cidadeDoCliente(cliente)
        const cidadeBase = cidadeSelecionada || cidadeFallback

        const lojas = await api.lojas.home()
        const lista = Array.isArray(lojas) ? lojas : []
        const cidadesMap = new Map()
        for (const loja of lista) {
          const id = String(loja?.cidade_id || '').trim()
          const nome = String(loja?.cidade || '').trim()
          if (!id || !nome || cidadesMap.has(id)) continue
          cidadesMap.set(id, { id, nome })
        }
        const cidades = [...cidadesMap.values()]
        const alvo = cidades.find((c) => c.nome.toLowerCase() === cidadeBase.toLowerCase()) || cidades[0]
        if (!alvo?.id) {
          throw new Error('Nenhuma cidade com lojas disponível para o feed.')
        }

        const feed = await api.feed.listarPorCidade(alvo.id)
        if (cancelado) return
        setCityInfo(alvo)
        setPosts(Array.isArray(feed) ? feed : [])
      } catch (e) {
        if (!cancelado) setErro(e.message || 'Não foi possível carregar o feed.')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => { cancelado = true }
  }, [cliente])

  async function curtir(postId) {
    try {
      const res = await api.feed.curtirToggle(postId)
      setPosts((prev) => prev.map((p) => (
        p.id === postId
          ? { ...p, has_liked: !!res?.has_liked, like_count: Number(res?.like_count || 0) }
          : p
      )))
    } catch {}
  }

  function atualizarVoto(postId, voteResults) {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p
      const total = Array.isArray(voteResults)
        ? voteResults.reduce((s, r) => s + Number(r.count || 0), 0)
        : Number(p.vote_count || 0)
      return {
        ...p,
        has_voted: true,
        vote_results: Array.isArray(voteResults) ? voteResults : [],
        vote_count: total,
      }
    }))
  }

  function atualizarComentarios(postId, aberto, lista, novoCount) {
    setComentariosAbertos((prev) => ({ ...prev, [postId]: aberto }))
    if (Array.isArray(lista)) {
      setPosts((prev) => prev.map((p) => (
        p.id === postId
          ? { ...p, comment_count: typeof novoCount === 'number' ? novoCount : lista.length }
          : p
      )))
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-24">
      <SEO title="Feed da Cidade" noIndex />
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/"
          className="w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-700 inline-flex items-center justify-center"
        >
          <FiArrowLeft />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold text-stone-900">📢 Feed da Cidade</h1>
          <p className="text-xs text-stone-500">{cityInfo?.nome || 'Carregando cidade...'}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : erro ? (
        <div className="bg-white border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{erro}</div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl px-4 py-8 text-center">
          <p className="text-sm text-stone-500">Sem publicações ativas na sua cidade no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onCurtir={curtir}
              onVotar={atualizarVoto}
              onAbrirComentarios={atualizarComentarios}
              comentariosAbertos={!!comentariosAbertos[post.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
