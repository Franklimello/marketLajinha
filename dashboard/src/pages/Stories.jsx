import { useEffect, useMemo, useRef, useState } from 'react'
import { FiCamera, FiClock, FiImage, FiTrash2, FiUpload } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadImagem } from '../config/firebase'

const MAX_STORIES = 5

function formatarTempoRestante(expiresAt) {
  const fim = new Date(expiresAt).getTime()
  const agora = Date.now()
  const diff = Math.max(0, fim - agora)
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${h}h ${m}min`
}

export default function Stories() {
  const { loja } = useAuth()
  const [stories, setStories] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [preview, setPreview] = useState('')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const restantes = useMemo(() => Math.max(0, MAX_STORIES - stories.length), [stories.length])

  async function carregar() {
    setCarregando(true)
    try {
      const data = await api.stories.listarMinhas()
      setStories(Array.isArray(data) ? data : [])
    } catch (e) {
      setErro(e.message || 'Erro ao carregar stories.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErro('Selecione uma imagem válida (JPG/JPEG/PNG).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro('Imagem deve ter no máximo 5MB.')
      return
    }
    setArquivo(file)
    setPreview(URL.createObjectURL(file))
    setErro('')
  }

  async function publicar() {
    if (!arquivo) {
      setErro('Selecione uma imagem para publicar.')
      return
    }
    if (!loja?.id) {
      setErro('Loja não encontrada.')
      return
    }
    if (stories.length >= MAX_STORIES) {
      setErro('Você já atingiu o limite de 5 stories ativos.')
      return
    }

    setSalvando(true)
    setErro('')
    try {
      const path = `stories/${loja.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`
      const image_url = await uploadImagem(arquivo, path)
      await api.stories.criar(loja.id, { image_url })
      setArquivo(null)
      setPreview('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
      await carregar()
    } catch (e) {
      setErro(e.message || 'Erro ao publicar story.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    if (!confirm('Deseja excluir este story?')) return
    try {
      await api.stories.excluir(id)
      await carregar()
    } catch (e) {
      setErro(e.message || 'Erro ao excluir story.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-stone-900">UaiFood Stories</h1>
        <p className="text-sm text-stone-500 mt-1">Publique stories que expiram automaticamente em 24 horas.</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-stone-800">Novo story</p>
          <span className="text-xs text-stone-500">{stories.length}/{MAX_STORIES} ativos</span>
        </div>

        {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{erro}</p>}

        <div className="flex items-center gap-3">
          {preview ? (
            <img src={preview} alt="Preview story" className="w-24 h-24 rounded-xl object-cover border border-stone-200" />
          ) : (
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400">
              <FiImage size={24} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium">
                <FiUpload /> Galeria
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                <FiCamera /> Câmera
              </button>
            </div>
            <p className="text-[11px] text-stone-400">Formatos: JPG/JPEG/PNG • máximo 5MB</p>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={onFileChange} className="hidden" />
        <input ref={cameraInputRef} type="file" accept="image/jpeg,image/jpg,image/png" capture="environment" onChange={onFileChange} className="hidden" />

        <button
          type="button"
          onClick={publicar}
          disabled={salvando || !arquivo || restantes <= 0}
          className="mt-4 w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
        >
          {salvando ? 'Publicando...' : 'Publicar story'}
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-stone-800">Stories ativos</p>
          {!carregando && <span className="text-xs text-stone-500">{stories.length} item(ns)</span>}
        </div>

        {carregando ? (
          <p className="text-sm text-stone-400">Carregando...</p>
        ) : stories.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum story ativo no momento.</p>
        ) : (
          <div className="grid gap-3">
            {stories.map((story) => (
              <div key={story.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-2.5">
                <img src={story.image_url} alt="Story ativo" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-700 font-medium">Publicado em {new Date(story.created_at).toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-stone-500 inline-flex items-center gap-1 mt-1">
                    <FiClock size={12} /> expira em {formatarTempoRestante(story.expires_at)}
                  </p>
                </div>
                <button type="button" onClick={() => excluir(story.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500">
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
