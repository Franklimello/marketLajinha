import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { FiSend, FiMessageCircle, FiImage, FiBarChart2, FiClock } from 'react-icons/fi'

function fmtTempoRelativo(data) {
  const ms = Date.now() - new Date(data).getTime()
  const min = Math.max(1, Math.floor(ms / 60000))
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} hora${h > 1 ? 's' : ''}`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

const FORM_INICIAL = {
  content: '',
  image_url: '',
  post_type: 'normal',
  poll_options_text: '',
}

export default function Posts() {
  const { loja } = useAuth()
  const [form, setForm] = useState(FORM_INICIAL)
  const [postsAtivos, setPostsAtivos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const isPoll = form.post_type === 'poll'

  const pollOptions = useMemo(() => {
    return String(form.poll_options_text || '')
      .split('\n')
      .map((opt) => opt.trim())
      .filter(Boolean)
  }, [form.poll_options_text])

  async function carregarPostsAtivos() {
    if (!loja?.cidade_id) {
      setPostsAtivos([])
      return
    }
    setCarregando(true)
    try {
      const lista = await api.feed.listarPorCidade(loja.cidade_id)
      const daLoja = (Array.isArray(lista) ? lista : []).filter((p) => p.store_id === loja.id)
      setPostsAtivos(daLoja)
    } catch {
      setPostsAtivos([])
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarPostsAtivos()
  }, [loja?.id, loja?.cidade_id])

  async function criarPost(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const content = String(form.content || '').trim()
    if (!content) {
      setErro('Conteúdo é obrigatório.')
      return
    }
    if (isPoll && pollOptions.length < 2) {
      setErro('Enquete precisa de pelo menos 2 opções.')
      return
    }

    setSalvando(true)
    try {
      await api.feed.criarPost({
        content,
        image_url: String(form.image_url || '').trim() || null,
        post_type: isPoll ? 'poll' : 'normal',
        poll_options: isPoll ? pollOptions : null,
      })
      setSucesso('Post publicado com sucesso! (expira em 72h)')
      setForm(FORM_INICIAL)
      await carregarPostsAtivos()
    } catch (err) {
      setErro(err.message || 'Não foi possível publicar o post.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Post</h1>
        <p className="text-sm text-stone-500 mt-0.5">Publique novidades no Feed da Cidade da sua loja.</p>
        <p className="text-xs text-stone-400 mt-1">Limite: até 3 posts ativos por loja (expiram em 72h).</p>
      </div>

      {!loja?.cidade_id && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Sua loja ainda está sem cidade vinculada internamente. Você consegue publicar, mas para listar os posts aqui precisamos da cidade vinculada no cadastro.
          </p>
        </div>
      )}

      {erro && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{erro}</p>
        </div>
      )}
      {sucesso && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-700">{sucesso}</p>
        </div>
      )}

      <form onSubmit={criarPost} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">Tipo de post</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, post_type: 'normal' }))}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                !isPoll ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><FiMessageCircle size={14} /> Normal</span>
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, post_type: 'poll' }))}
              className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                isPoll ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><FiBarChart2 size={14} /> Enquete</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">Conteúdo</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
            maxLength={1000}
            rows={4}
            placeholder="Escreva a novidade da loja..."
            className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">URL da imagem (opcional)</label>
          <div className="relative">
            <FiImage className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
            <input
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full pl-9 pr-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {isPoll && (
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Opções da enquete (uma por linha)</label>
            <textarea
              value={form.poll_options_text}
              onChange={(e) => setForm((prev) => ({ ...prev, poll_options_text: e.target.value }))}
              rows={4}
              placeholder={'Ex:\nSabor novo\nCupom hoje\nFrete grátis'}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none"
            />
            <p className="text-xs text-stone-500 mt-1">Mínimo de 2 opções.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 disabled:opacity-50"
        >
          <FiSend size={14} />
          {salvando ? 'Publicando...' : 'Publicar no Feed da Cidade'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-stone-900">Posts ativos da loja</h2>
          {carregando && <span className="text-xs text-stone-400">Carregando...</span>}
        </div>
        {postsAtivos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum post ativo no momento.</p>
        ) : (
          <div className="space-y-2">
            {postsAtivos.map((post) => (
              <div key={post.id} className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    post.post_type === 'poll' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {post.post_type === 'poll' ? 'ENQUETE' : 'NORMAL'}
                  </span>
                  <span className="text-xs text-stone-400 inline-flex items-center gap-1">
                    <FiClock size={11} /> {fmtTempoRelativo(post.created_at)}
                  </span>
                </div>
                <p className="text-sm text-stone-700">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
