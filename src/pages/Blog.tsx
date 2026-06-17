import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/use-seo";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";

interface Post {
  id: string;
  title_fr: string;
  slug_fr: string;
  excerpt_fr: string;
  title_en: string;
  slug_en: string;
  excerpt_en: string;
  image_url: string;
  created_at: string;
}

const Blog = () => {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useSEO({
    title: t.blog.seoTitle,
    description: t.blog.seoDescription,
  });

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPosts(data as Post[]);
      }

      setIsLoading(false);
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container">
          <ScrollReveal animation="fade-in">
            <div className="mb-16 max-w-3xl">
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {t.blog.heroTitleLeading}
                <span className="block text-primary">{t.blog.heroTitleHighlight}</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                {t.blog.heroSubtitle}
              </p>
            </div>
          </ScrollReveal>

          {isLoading ? (
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => {
                const title = language === "fr" ? post.title_fr : post.title_en;
                const slug = language === "fr" ? post.slug_fr : post.slug_en;
                const excerpt = language === "fr" ? post.excerpt_fr : post.excerpt_en;

                return (
                  <ScrollReveal key={post.id} animation="slide-up" delay={index * 100}>
                    <Link to={`/blog/${slug}`} className="group block">
                      <article className="space-y-5">
                        <div className="aspect-video overflow-hidden rounded-2xl border border-border/40 bg-secondary/20 shadow-soft">
                          {post.image_url ? (
                            <img
                              src={post.image_url}
                              alt={title || t.blog.untitled}
                              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/20">
                              <Clock size={40} />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(post.created_at).toLocaleDateString(
                                language === "fr" ? "fr-FR" : "en-US",
                              )}
                            </span>
                          </div>

                          <h2 className="font-display text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                            {title || t.blog.untitled}
                          </h2>

                          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {excerpt || t.blog.noDescription}
                          </p>

                          <div className="flex items-center gap-2 pt-2 text-xs font-bold uppercase tracking-widest text-primary">
                            <span>{t.blog.readMore}</span>
                            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </article>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border/60 py-20 text-center">
              <p className="italic text-muted-foreground">{t.blog.empty}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
