import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminFaq } from "@/hooks/use-admin-faq";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

const seedEntries = [
  {
    id: "1",
    question_fr: "Q1",
    answer_fr: "A1",
    question_en: "Q1en",
    answer_en: "A1en",
    category: null,
    position: 10,
    is_published: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

const installSelectMock = (data: unknown[] = seedEntries) => {
  const order2 = vi.fn().mockResolvedValue({ data, error: null });
  const order1 = vi.fn().mockReturnValue({ order: order2 });
  const select = vi.fn().mockReturnValue({ order: order1 });
  mocks.from.mockReturnValue({ select });
  return { select, order1, order2 };
};

describe("useAdminFaq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads entries ordered by position then created_at", async () => {
    const { order1, order2 } = installSelectMock();
    const { result } = renderHook(() => useAdminFaq());

    await act(async () => {
      await result.current.loadEntries();
    });

    expect(order1).toHaveBeenCalledWith("position", { ascending: true });
    expect(order2).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result.current.entries).toEqual(seedEntries);
    expect(result.current.isLoading).toBe(false);
  });

  it("creates an entry and reloads", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const order2 = vi.fn().mockResolvedValue({ data: seedEntries, error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const select = vi.fn().mockReturnValue({ order: order1 });
    mocks.from.mockReturnValue({ select, insert });

    const { result } = renderHook(() => useAdminFaq());
    await act(async () => {
      await result.current.loadEntries();
    });

    let outcome: { success: boolean } = { success: false };
    await act(async () => {
      outcome = await result.current.createEntry({
        question_fr: "new q",
        answer_fr: "new a",
        question_en: "new q en",
        answer_en: "new a en",
        is_published: true,
      });
    });

    expect(outcome.success).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      question_fr: "new q",
      answer_fr: "new a",
      is_published: true,
      position: 20, // nextPosition(seedEntries with max 10) = 20
    });
  });

  it("propagates Supabase errors during update", async () => {
    const eqUpdate = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "permission denied" } });
    const update = vi.fn().mockReturnValue({ eq: eqUpdate });
    const order2 = vi.fn().mockResolvedValue({ data: seedEntries, error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const select = vi.fn().mockReturnValue({ order: order1 });
    mocks.from.mockReturnValue({ select, update });

    const { result } = renderHook(() => useAdminFaq());
    let outcome: Awaited<ReturnType<typeof result.current.updateEntry>> = { success: true };
    await act(async () => {
      outcome = await result.current.updateEntry("1", { is_published: false });
    });

    expect(outcome.success).toBe(false);
    if (!outcome.success) {
      expect(outcome.message).toBe("permission denied");
    }
    expect(update).toHaveBeenCalledWith({ is_published: false });
    expect(eqUpdate).toHaveBeenCalledWith("id", "1");
  });

  it("delete forwards to supabase.from().delete().eq()", async () => {
    const eqDelete = vi.fn().mockResolvedValue({ data: null, error: null });
    const del = vi.fn().mockReturnValue({ eq: eqDelete });
    const order2 = vi.fn().mockResolvedValue({ data: seedEntries, error: null });
    const order1 = vi.fn().mockReturnValue({ order: order2 });
    const select = vi.fn().mockReturnValue({ order: order1 });
    mocks.from.mockReturnValue({ select, delete: del });

    const { result } = renderHook(() => useAdminFaq());
    let outcome: { success: boolean } = { success: false };
    await act(async () => {
      outcome = await result.current.deleteEntry("1");
    });

    expect(outcome.success).toBe(true);
    expect(eqDelete).toHaveBeenCalledWith("id", "1");
  });
});
