import type { FaqEntry } from "@/lib/faq";

export type AdminFaqInput = {
  question_fr: string;
  answer_fr: string;
  question_en: string;
  answer_en: string;
  category: string | null;
  position: number;
  is_published: boolean;
};

export interface AdminFaqText {
  breadcrumbCurrent: string;
  breadcrumbDashboard: string;
  title: string;
  subtitle: string;
  empty: string;
  filters: {
    searchPlaceholder: string;
    status: string;
    all: string;
    published: string;
    unpublished: string;
  };
  metrics: {
    total: string;
    published: string;
    unpublished: string;
    totalDescription: string;
    publishedDescription: string;
    unpublishedDescription: string;
  };
  columns: {
    position: string;
    question: string;
    status: string;
    updatedAt: string;
    actions: string;
  };
  statuses: {
    published: string;
    unpublished: string;
  };
  actions: {
    create: string;
    edit: string;
    delete: string;
    moveUp: string;
    moveDown: string;
    togglePublish: string;
  };
  dialog: {
    createTitle: string;
    editTitle: string;
    questionFrLabel: string;
    answerFrLabel: string;
    questionEnLabel: string;
    answerEnLabel: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    positionLabel: string;
    isPublishedLabel: string;
    save: string;
    saving: string;
    cancel: string;
    deleteTitle: string;
    deleteDescription: string;
    deleteConfirm: string;
    requiredField: string;
  };
  toasts: {
    createSuccess: string;
    updateSuccess: string;
    deleteSuccess: string;
    publishSuccess: string;
    unpublishSuccess: string;
    errorTitle: string;
  };
}

export const filterFaqEntries = ({
  entries,
  query,
  statusFilter,
}: {
  entries: FaqEntry[];
  query: string;
  statusFilter: string;
}): FaqEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (statusFilter === "published" && !entry.is_published) return false;
    if (statusFilter === "unpublished" && entry.is_published) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      entry.question_fr,
      entry.answer_fr,
      entry.question_en,
      entry.answer_en,
      entry.category ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};

export const buildFaqStats = (entries: FaqEntry[]) => {
  const published = entries.filter((entry) => entry.is_published).length;
  return {
    total: entries.length,
    published,
    unpublished: entries.length - published,
  };
};

export const nextFaqPosition = (entries: FaqEntry[]): number => {
  if (entries.length === 0) return 10;
  const max = entries.reduce((acc, entry) => Math.max(acc, entry.position), 0);
  return max + 10;
};
