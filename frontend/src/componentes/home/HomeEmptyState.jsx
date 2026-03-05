export default function HomeEmptyState({ busca }) {
  return (
    <section className="border-t border-stone-200 px-1 py-10 text-center animate-fade-in-up">
      <div className="text-5xl mb-3">🔍</div>
      <p className="text-stone-800 font-bold text-sm mb-1">Nenhuma loja encontrada</p>
      <p className="text-stone-500 text-xs leading-relaxed">
        {busca ? 'Tente buscar por outro nome, bairro ou categoria.' : 'Não há lojas disponíveis nesta categoria agora.'}
      </p>
    </section>
  )
}
