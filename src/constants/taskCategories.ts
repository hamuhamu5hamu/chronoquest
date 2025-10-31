export type DbCategory = "exercise" | "study" | "life";
export type UiCategory = "運動" | "勉強" | "生活";

export const UI_CATEGORIES: UiCategory[] = ["運動", "勉強", "生活"];

export const CATEGORY_LABELS: Record<DbCategory, UiCategory> = {
  exercise: "運動",
  study: "勉強",
  life: "生活",
};

export const toDbCategory = (ui: UiCategory): DbCategory => {
  switch (ui) {
    case "運動":
      return "exercise";
    case "勉強":
      return "study";
    case "生活":
    default:
      return "life";
  }
};

export const toUiCategory = (db: DbCategory): UiCategory => CATEGORY_LABELS[db];
