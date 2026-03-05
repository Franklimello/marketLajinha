export default function HomeStoriesSection(props) {
  if (props.storiesCarregando) {
    return (
      <section className="mb-6 rounded-3xl border border-stone-200 bg-white/90 p-3.5 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.45)]" aria-hidden="true">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-4 rounded w-32" />
          <div className="skeleton h-4 rounded w-14" />
        </div>
        <div className="flex gap-3 overflow-hidden pb-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[84px] text-center">
              <div className="skeleton w-[76px] h-[76px] rounded-full mx-auto" />
              <div className="skeleton h-2.5 rounded w-12 mx-auto mt-2" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <props.StoriesRailComponent
      grupos={props.storiesGroups}
      seenMap={props.storiesSeenMap}
      onOpen={props.onOpenStories}
    />
  )
}
