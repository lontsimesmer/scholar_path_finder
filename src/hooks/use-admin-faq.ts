import { useCallback, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { type FaqEntry, sortFaqEntriesForDisplay } from "@/lib/faq";
import { type AdminFaqInput, nextFaqPosition } from "@/lib/admin-faq";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminFaq");

type MutationResult = { success: true } | { success: false; message: string };

export const useAdminFaq = () => {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("faq_entries")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setEntries((data as FaqEntry[]) ?? []);
    } catch (error: unknown) {
      logger.error("Failed to load admin FAQ entries", {
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEntry = useCallback(
    async (input: Partial<AdminFaqInput>): Promise<MutationResult> => {
      const position =
        typeof input.position === "number" && Number.isFinite(input.position)
          ? input.position
          : nextFaqPosition(entries);
      const { error } = await supabase.from("faq_entries").insert({
        question_fr: input.question_fr ?? "",
        answer_fr: input.answer_fr ?? "",
        question_en: input.question_en ?? "",
        answer_en: input.answer_en ?? "",
        category: input.category ?? null,
        position,
        is_published: input.is_published ?? true,
      });
      if (error) {
        logger.warn("Failed to create FAQ entry", { message: error.message });
        return { success: false, message: error.message };
      }
      await loadEntries();
      return { success: true };
    },
    [entries, loadEntries],
  );

  const updateEntry = useCallback(
    async (id: string, input: Partial<AdminFaqInput>): Promise<MutationResult> => {
      const { error } = await supabase
        .from("faq_entries")
        .update({
          ...(input.question_fr !== undefined ? { question_fr: input.question_fr } : {}),
          ...(input.answer_fr !== undefined ? { answer_fr: input.answer_fr } : {}),
          ...(input.question_en !== undefined ? { question_en: input.question_en } : {}),
          ...(input.answer_en !== undefined ? { answer_en: input.answer_en } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.position !== undefined ? { position: input.position } : {}),
          ...(input.is_published !== undefined ? { is_published: input.is_published } : {}),
        })
        .eq("id", id);
      if (error) {
        logger.warn("Failed to update FAQ entry", { id, message: error.message });
        return { success: false, message: error.message };
      }
      await loadEntries();
      return { success: true };
    },
    [loadEntries],
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<MutationResult> => {
      const { error } = await supabase.from("faq_entries").delete().eq("id", id);
      if (error) {
        logger.warn("Failed to delete FAQ entry", { id, message: error.message });
        return { success: false, message: error.message };
      }
      await loadEntries();
      return { success: true };
    },
    [loadEntries],
  );

  const togglePublish = useCallback(
    async (entry: FaqEntry): Promise<MutationResult> => {
      return updateEntry(entry.id, { is_published: !entry.is_published });
    },
    [updateEntry],
  );

  const moveEntry = useCallback(
    async (entry: FaqEntry, direction: "up" | "down"): Promise<MutationResult> => {
      const sorted = sortFaqEntriesForDisplay(entries);
      const index = sorted.findIndex((item) => item.id === entry.id);
      if (index === -1) return { success: false, message: "entry_not_found" };
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= sorted.length) {
        return { success: false, message: "out_of_range" };
      }
      const other = sorted[swapIndex];
      // Swap positions
      const [a, b] = [entry.position, other.position];
      const firstUpdate = await updateEntry(entry.id, { position: b });
      if (!firstUpdate.success) return firstUpdate;
      const secondUpdate = await updateEntry(other.id, { position: a });
      return secondUpdate;
    },
    [entries, updateEntry],
  );

  return {
    entries,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    togglePublish,
    moveEntry,
  };
};
