import { describe, expect, it } from "vitest";

import {
  buildFaqStats,
  filterFaqEntries,
  nextFaqPosition,
} from "@/lib/admin-faq";
import { sortFaqEntriesForDisplay } from "@/lib/faq";
import type { FaqEntry } from "@/lib/faq";

const baseEntry: FaqEntry = {
  id: "1",
  question_fr: "Combien ça coûte ?",
  answer_fr: "Cela dépend du forfait.",
  question_en: "How much?",
  answer_en: "Depends on the package.",
  category: "Pricing",
  position: 10,
  is_published: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const make = (overrides: Partial<FaqEntry>): FaqEntry => ({ ...baseEntry, ...overrides });

describe("admin FAQ helpers", () => {
  it("filters by status and free-text query", () => {
    const published = make({ id: "1", position: 10 });
    const draft = make({
      id: "2",
      position: 20,
      is_published: false,
      question_fr: "Délais ?",
      question_en: "Lead time?",
      category: null,
    });

    expect(
      filterFaqEntries({ entries: [published, draft], query: "", statusFilter: "published" }),
    ).toEqual([published]);

    expect(
      filterFaqEntries({ entries: [published, draft], query: "lead time", statusFilter: "all" }),
    ).toEqual([draft]);

    expect(
      filterFaqEntries({ entries: [published, draft], query: "pricing", statusFilter: "all" }),
    ).toEqual([published]);
  });

  it("computes published / unpublished stats", () => {
    const entries = [
      make({ id: "1" }),
      make({ id: "2", is_published: false }),
      make({ id: "3", is_published: true }),
    ];
    expect(buildFaqStats(entries)).toEqual({ total: 3, published: 2, unpublished: 1 });
  });

  it("returns the next position based on current entries", () => {
    expect(nextFaqPosition([])).toBe(10);
    expect(
      nextFaqPosition([
        make({ id: "1", position: 10 }),
        make({ id: "2", position: 30 }),
        make({ id: "3", position: 20 }),
      ]),
    ).toBe(40);
  });

  it("sorts entries by position then by created_at", () => {
    const sorted = sortFaqEntriesForDisplay([
      make({ id: "b", position: 20, created_at: "2026-01-02T00:00:00.000Z" }),
      make({ id: "a", position: 20, created_at: "2026-01-01T00:00:00.000Z" }),
      make({ id: "c", position: 10, created_at: "2026-01-03T00:00:00.000Z" }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["c", "a", "b"]);
  });
});
