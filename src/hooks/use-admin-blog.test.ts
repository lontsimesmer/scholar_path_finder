import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminBlog } from "@/hooks/use-admin-blog";
import type { AdminBlogText, BlogPostRecord } from "@/lib/admin-blog";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  deleteEq: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  orderCreatedAt: vi.fn(),
  orderId: vi.fn(),
  orderStatus: vi.fn(),
  select: vi.fn(),
  toast: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
  },
}));

const text = {
  deleteConfirm: "Supprimer ?",
  deleteSuccessDescription: "Article supprime",
  deleteSuccessTitle: "Supprime",
  errorTitle: "Erreur",
  fieldLabels: {
    content_en: "Contenu EN",
    content_fr: "Contenu FR",
    excerpt_en: "Extrait EN",
    excerpt_fr: "Extrait FR",
    image_url: "Image",
    slug_en: "Slug EN",
    slug_fr: "Slug FR",
    status: "Statut",
    title_en: "Titre EN",
    title_fr: "Titre FR",
  },
  hiddenTitle: "Masque",
  missingFieldsTitle: "Champs requis",
  publishedTitle: "Publie",
  saveSuccessDescription: "Article enregistre",
  saveSuccessTitle: "Enregistre",
} as Pick<
  AdminBlogText,
  | "deleteConfirm"
  | "deleteSuccessDescription"
  | "deleteSuccessTitle"
  | "errorTitle"
  | "fieldLabels"
  | "hiddenTitle"
  | "missingFieldsTitle"
  | "publishedTitle"
  | "saveSuccessDescription"
  | "saveSuccessTitle"
>;

const post: BlogPostRecord = {
  content_en: "<p>English</p>",
  content_fr: "<p>Francais</p>",
  excerpt_en: "English",
  excerpt_fr: "Francais",
  id: "post-1",
  image_url: "https://example.com/image.jpg",
  slug_en: "english",
  slug_fr: "francais",
  status: "draft",
  title_en: "English",
  title_fr: "Francais",
};

const mockFetchPosts = (posts: BlogPostRecord[] = [post]) => {
  mocks.orderId.mockResolvedValue({ data: posts, error: null });
  mocks.orderCreatedAt.mockReturnValue({ order: mocks.orderId });
  mocks.orderStatus.mockReturnValue({ order: mocks.orderCreatedAt });
  mocks.select.mockReturnValue({ order: mocks.orderStatus });
};

describe("useAdminBlog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", mocks.confirm);
    mocks.confirm.mockReturnValue(true);
    mockFetchPosts();
    mocks.insert.mockResolvedValue({ error: null });
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
    mocks.deleteEq.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({
      delete: () => ({ eq: mocks.deleteEq }),
      insert: mocks.insert,
      select: mocks.select,
      update: mocks.update,
    });
  });

  it("loads blog posts ordered for admin display", async () => {
    const { result } = renderHook(() => useAdminBlog({ text, toast: mocks.toast }));

    await act(async () => {
      await result.current.fetchPosts();
    });

    expect(mocks.from).toHaveBeenCalledWith("blog_posts");
    expect(mocks.orderStatus).toHaveBeenCalledWith("status", { ascending: false });
    expect(mocks.orderCreatedAt).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mocks.orderId).toHaveBeenCalledWith("id", { ascending: false });
    expect(result.current.posts).toEqual([post]);
    expect(result.current.isLoading).toBe(false);
  });

  it("blocks saving when required bilingual fields are missing", async () => {
    const { result } = renderHook(() => useAdminBlog({ text, toast: mocks.toast }));

    act(() => {
      result.current.openNewPostDialog();
    });
    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Champs requis",
        variant: "destructive",
      }),
    );
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("creates a sanitized blog post and refreshes the list", async () => {
    const { result } = renderHook(() => useAdminBlog({ text, toast: mocks.toast }));

    act(() => {
      result.current.openNewPostDialog();
      result.current.updateEditingPost({
        ...post,
        id: undefined,
        content_fr: '<p onclick="alert(1)">Francais</p>',
      });
    });
    await act(async () => {
      await result.current.handleSave({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        content_fr: "<p>Francais</p>",
        slug_fr: "francais",
        title_fr: "Francais",
      }),
    ]);
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Article enregistre",
      title: "Enregistre",
    });
    await waitFor(() => {
      expect(result.current.isDialogOpen).toBe(false);
    });
  });

  it("toggles publication status and deletes after confirmation", async () => {
    const { result } = renderHook(() => useAdminBlog({ text, toast: mocks.toast }));

    await act(async () => {
      await result.current.toggleStatus(post);
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
      }),
    );
    expect(mocks.updateEq).toHaveBeenCalledWith("id", "post-1");
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Publie" });

    await act(async () => {
      await result.current.handleDelete("post-1");
    });
    expect(mocks.confirm).toHaveBeenCalledWith("Supprimer ?");
    expect(mocks.deleteEq).toHaveBeenCalledWith("id", "post-1");
    expect(mocks.toast).toHaveBeenCalledWith({
      description: "Article supprime",
      title: "Supprime",
    });
  });
});
