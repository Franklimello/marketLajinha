export default function HomeEmptyState({ busca }) {
  return (
    <div className="text-center py-16 animate-fade-in-up">
      <div className="text-5xl mb-3">🔍</div>
      <p className="text-stone-700 font-medium text-sm mb-1">Nenhuma loja encontrada</p>
      <p className="text-stone-400 text-xs">
        {busca ? 'Tente buscar por outro nome ou categoria' : 'Não há lojas nesta categoria'}
      </p>
    </div>
  )
}
