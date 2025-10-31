import type { StoryChapter } from "../../hooks/useStory";
import type { Equipment } from "../../hooks/useEquipment";

type StoryUnlockModalProps = {
  open: boolean;
  chapter: StoryChapter | null;
  rewardEquipment?: Equipment | null;
  onClose: () => void;
};

export function StoryUnlockModal({
  open,
  chapter,
  rewardEquipment,
  onClose,
}: StoryUnlockModalProps) {
  if (!open || !chapter) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal__header">
          <h2>新章解放！</h2>
          <button className="btn ghost" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="modal__content">
          <h3>{chapter.title}</h3>
          {chapter.logline && (
            <p className="muted" style={{ marginTop: 8 }}>
              {chapter.logline}
            </p>
          )}
          {chapter.summary && (
            <p style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
              {chapter.summary}
            </p>
          )}
          {rewardEquipment && (
            <div className="card card--subtle" style={{ marginTop: 20 }}>
              <strong>報酬装備</strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {rewardEquipment.name}（{rewardEquipment.slot}）
              </div>
              {rewardEquipment.description && (
                <div className="muted" style={{ marginTop: 4 }}>
                  {rewardEquipment.description}
                </div>
              )}
              <div className="chip-row" style={{ marginTop: 8 }}>
                <span className="chip">
                  {rewardEquipment.effect_type} +{rewardEquipment.effect_value}
                </span>
              </div>
            </div>
          )}
        </div>
        <footer className="modal__footer">
          <button className="btn primary" onClick={onClose}>
            冒険を続ける
          </button>
        </footer>
      </div>
    </div>
  );
}
