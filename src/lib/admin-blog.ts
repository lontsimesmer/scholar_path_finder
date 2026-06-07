export interface BlogPostRecord {
  id: string;
  title_fr: string;
  slug_fr: string;
  content_fr: string;
  excerpt_fr: string;
  title_en: string;
  slug_en: string;
  content_en: string;
  excerpt_en: string;
  status: "draft" | "published";
  image_url: string;
}

export type EditableBlogPost = Partial<BlogPostRecord>;

export interface AdminBlogText {
  articleColumn: string;
  breadcrumbCurrent: string;
  breadcrumbDashboard: string;
  cancel: string;
  contentEn: string;
  contentEnHelper: string;
  contentFr: string;
  contentFrHelper: string;
  coverImagePlaceholder: string;
  coverImageUrl: string;
  createArticle: string;
  deleteConfirm: string;
  deleteSuccessDescription: string;
  deleteSuccessTitle: string;
  draft: string;
  editArticle: string;
  empty: string;
  enTab: string;
  errorTitle: string;
  excerptEn: string;
  excerptEnPlaceholder: string;
  excerptFr: string;
  excerptFrPlaceholder: string;
  fieldLabels: Record<Exclude<keyof BlogPostRecord, "id">, string>;
  frTab: string;
  globalStatus: string;
  hidden: string;
  hiddenTitle: string;
  missingFieldsTitle: string;
  newArticle: string;
  published: string;
  publishedTitle: string;
  quickActions: string;
  requiredHint: string;
  save: string;
  saveSuccessDescription: string;
  saveSuccessTitle: string;
  slugEn: string;
  slugEnPlaceholder: string;
  slugFr: string;
  slugFrPlaceholder: string;
  statusColumn: string;
  subtitle: string;
  title: string;
  titleEn: string;
  titleEnPlaceholder: string;
  titleFr: string;
  titleFrPlaceholder: string;
  translationMissing: string;
  untitled: string;
  visible: string;
  editor: Record<string, string>;
}

export const createEmptyBlogPost = (): EditableBlogPost => ({
  status: "draft",
  image_url: "",
  title_fr: "",
  slug_fr: "",
  content_fr: "",
  excerpt_fr: "",
  title_en: "",
  slug_en: "",
  content_en: "",
  excerpt_en: "",
});

export const normalizeBlogPost = (post: EditableBlogPost | null | undefined): EditableBlogPost => ({
  ...createEmptyBlogPost(),
  ...post,
  image_url: post?.image_url ?? "",
  title_fr: post?.title_fr ?? "",
  slug_fr: post?.slug_fr ?? "",
  content_fr: post?.content_fr ?? "",
  excerpt_fr: post?.excerpt_fr ?? "",
  title_en: post?.title_en ?? "",
  slug_en: post?.slug_en ?? "",
  content_en: post?.content_en ?? "",
  excerpt_en: post?.excerpt_en ?? "",
  status: post?.status ?? "draft",
});

export const isBlogFieldFilled = (value: unknown) =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);
