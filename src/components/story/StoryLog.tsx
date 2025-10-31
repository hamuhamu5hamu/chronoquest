import type { UserChapterProgress, StoryChapter } from "../../hooks/useStory";

type StoryLogProps = {
  progress: UserChapterProgress[];
  chaptersById: Map<string, StoryChapter>;
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export function StoryLog({ progress, chaptersById }: StoryLogProps) {
  if (progress.length === 0) {
    return <p className="muted">まだ開放された章はありません。</p>;
  }

  const sorted = [...progress].sort(
    (a, b) =>
      new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
  );

  return (
    <ol className="story-log">
      {sorted.map((entry) => {
        const chapter = chaptersById.get(entry.chapter_id);
        return (
          <li key={entry.chapter_id} className="story-log__item">
            <div>
              <strong>{chapter?.title ?? "未知の章"}</strong>
              <div className="muted">{formatDateTime(entry.unlocked_at)}</div>
            </div>
            {chapter?.logline && (
              <p className="muted" style={{ marginTop: 6 }}>
                {chapter.logline}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
