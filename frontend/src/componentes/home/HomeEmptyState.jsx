export default function HomeEmptyState({ busca }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white px-4 py-12 text-center animate-fade-in-up shadow-[0_14px_30px_-32px_rgba(15,23,42,0.5)]">
      <div className="text-5xl mb-3">🔍</div>
      <p className="text-stone-800 font-bold text-sm mb-1">Nenhuma loja encontrada</p>
      <p className="text-stone-500 text-xs leading-relaxed">
        {busca ? 'Tente buscar por outro nome, bairro ou categoria.' : 'Não há lojas disponíveis nesta categoria agora.'}
      </p>
    </section>
  )
}
