import type { StoryChapter } from "../../hooks/useStory";

type Props = {
  currentChapter: StoryChapter | null;
  nextChapter: StoryChapter | null;
  renderContent?: React.ReactNode;
};

export function StoryCard({ currentChapter, renderContent }: Props) {
  return (
    <div className="card">
      {currentChapter ? (
        <>
          <h2>{currentChapter.title}</h2>
          {currentChapter.logline && <p className="muted">{currentChapter.logline}</p>}
          {renderContent}
        </>
      ) : (
        <>
          <h2>新しい物語が待っています</h2>
          <p className="muted">クエストを進めて次の章を解放しよう。</p>
          {renderContent}
        </>
      )}
    </div>
  );
}
