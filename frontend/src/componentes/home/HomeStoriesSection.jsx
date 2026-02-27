export default function HomeStoriesSection({
  storiesCarregando,
  storiesGroups,
  storiesSeenMap,
  onOpenStories,
  StoriesRailComponent,
}) {
  if (storiesCarregando) {
    return (
      <section className="mb-5" aria-hidden="true">
        <div className="flex items-center justify-between mb-2">
          <div className="skeleton h-4 rounded w-28" />
        </div>
        <div className="flex gap-3 overflow-hidden pb-1">
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
    <StoriesRailComponent
      grupos={storiesGroups}
      seenMap={storiesSeenMap}
      onOpen={onOpenStories}
    />
  )
}
