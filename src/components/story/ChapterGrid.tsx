import type { StoryChapter, UserChapterProgress } from "../../hooks/useStory";

type Status = "locked" | "current" | "next" | "cleared";

type ChapterGridProps = {
  chapters: StoryChapter[];
  unlockedChapterIds: Set<string>;
  currentChapter: StoryChapter | null;
  nextChapter: StoryChapter | null;
  progress: UserChapterProgress[];
};

const statusLabel: Record<Status, string> = {
  locked: "未解放",
  next: "次の章",
  current: "進行中",
  cleared: "完了",
};

export function ChapterGrid({
  chapters,
  unlockedChapterIds,
  currentChapter,
  nextChapter,
  progress,
}: ChapterGridProps) {
  const clearedIds = new Set(
    progress
      .filter((p) => unlockedChapterIds.has(p.chapter_id))
      .map((p) => p.chapter_id)
  );

  const getStatus = (chapter: StoryChapter): Status => {
    if (currentChapter && chapter.id === currentChapter.id) return "current";
    if (nextChapter && chapter.id === nextChapter.id) return "next";
    if (clearedIds.has(chapter.id)) return "cleared";
    return "locked";
  };

  return (
    <section>
      <h3>ワールドマップ</h3>
      <div className="chapter-grid">
        {chapters.map((chapter) => {
          const status = getStatus(chapter);
          const unlockedAt = progress.find((p) => p.chapter_id === chapter.id)?.unlocked_at;
          return (
            <article key={chapter.id} className={`chapter-card chapter-card--${status}`}>
              <header>
                <div className="chip-row">
                  <span className={`chip chip--${status}`}>{statusLabel[status]}</span>
                  {unlockedAt && (
                    <span className="chip chip--ghost">
                      {new Date(unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h4>{chapter.title}</h4>
              </header>
              {chapter.logline && (
                <p className="muted" style={{ marginTop: 6 }}>
                  {chapter.logline}
                </p>
              )}
              {chapter.summary && (
                <p className="muted" style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                  {chapter.summary}
                </p>
              )}
              {chapter.reward_equipment_id && (
                <div className="muted" style={{ marginTop: 12 }}>
                  報酬: 装備 #{chapter.reward_equipment_id}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
