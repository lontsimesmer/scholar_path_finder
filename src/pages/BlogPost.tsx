import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, ArrowLeft, Facebook, Twitter, Link2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useSEO } from "@/hooks/use-seo";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeRichTextHtml } from "@/lib/sanitize-rich-text";

interface Post {
  id: string;
  title_fr: string;
  slug_fr: string;
  content_fr: string;
  excerpt_fr: string;
  title_en: string;
  slug_en: string;
  content_en: string;
  excerpt_en: string;
  image_url: string;
  created_at: string;
  meta_title_fr?: string;
  meta_description_fr?: string;
  meta_title_en?: string;
  meta_description_en?: string;
}

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .or(`slug_fr.eq.${slug},slug_en.eq.${slug}`)
        .eq("status", "published")
        .maybeSingle();

      if (error || !data) {
        navigate("/blog");
        return;
      }

      setPost(data as Post);
      setIsLoading(false);
    };

    fetchPost();
  }, [slug, navigate]);

  const title = language === "fr" ? post?.title_fr : post?.title_en;
  const content = language === "fr" ? post?.content_fr : post?.content_en;
  const excerpt = language === "fr" ? post?.excerpt_fr : post?.excerpt_en;
  const sanitizedContent = useMemo(
    () => sanitizeRichTextHtml(content),
    [content],
  );
  const publicationDate = post
    ? new Date(post.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")
    : "";

  useSEO({
    title: title || "",
    description: excerpt || "",
    image: post?.image_url,
  });

  const handleShare = async (platform: "facebook" | "twitter" | "link") => {
    const currentUrl = window.location.href;

    if (platform === "link") {
      await navigator.clipboard.writeText(currentUrl);
      return;
    }

    const shareText = encodeURIComponent(title || "Power Prestation");
    const shareUrl = encodeURIComponent(currentUrl);

    const targetUrl =
      platform === "facebook"
        ? `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`
        : `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`;

    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pb-20 pt-32">
          <div className="section-container max-w-4xl">
            <Skeleton className="mb-8 h-4 w-32" />
            <Skeleton className="mb-6 h-12 w-full" />
            <Skeleton className="mb-12 aspect-video w-full rounded-3xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-32">
        <article className="section-container max-w-4xl">
          <ScrollReveal animation="fade-in">
            <button
              onClick={() => navigate("/blog")}
              className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft size={14} />
              {t.blogPost.backToBlog}
            </button>

            <header className="mb-12 space-y-8">
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-primary/60">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {publicationDate}
                </span>
              </div>

              <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
                {title}
              </h1>

              <div className="flex items-center justify-between border-y border-border/40 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    PP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Power Prestation</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.blogPost.authorRole}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleShare("facebook")}
                    className="p-2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Facebook size={18} />
                  </button>
                  <button
                    onClick={() => handleShare("twitter")}
                    className="p-2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Twitter size={18} />
                  </button>
                  <button
                    onClick={() => handleShare("link")}
                    className="p-2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Link2 size={18} />
                  </button>
                </div>
              </div>
            </header>
          </ScrollReveal>

          <ScrollReveal animation="fade-in" delay={200}>
            <div className="mb-16 aspect-[16/9] overflow-hidden rounded-[2.5rem] border border-border/40 shadow-strong">
              <img src={post?.image_url} alt={title} className="h-full w-full object-cover" />
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-in" delay={300}>
            <div
              className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-p:text-muted-foreground/90"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            <div className="mt-20 space-y-8 rounded-[2.5rem] border border-border/40 bg-secondary/30 p-10 text-center">
              <h3 className="font-display text-2xl font-bold text-foreground">{t.blogPost.ctaTitle}</h3>
              <p className="mx-auto max-w-xl text-muted-foreground">{t.blogPost.ctaDescription}</p>
              <Button size="xl" asChild className="px-10">
                <a href="/#contact">{t.blogPost.ctaButton}</a>
              </Button>
            </div>
          </ScrollReveal>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
