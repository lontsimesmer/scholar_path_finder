import { Tables } from "@/integrations/supabase/types";

export type FaqEntry = Tables<"faq_entries">;

export type FaqLocalizedItem = {
  id: string;
  question: string;
  answer: string;
};

export const localizeFaqEntries = (
  entries: FaqEntry[],
  language: "fr" | "en",
): FaqLocalizedItem[] =>
  entries.map((entry) => ({
    id: entry.id,
    question: language === "fr" ? entry.question_fr : entry.question_en,
    answer: language === "fr" ? entry.answer_fr : entry.answer_en,
  }));

export const sortFaqEntriesForDisplay = (entries: FaqEntry[]): FaqEntry[] =>
  [...entries].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.created_at.localeCompare(b.created_at);
  });
