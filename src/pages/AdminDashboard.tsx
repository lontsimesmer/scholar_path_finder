import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, FileText, Settings, ArrowRight, PlusCircle, BarChart3, Globe, LogOut } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useLanguage } from "@/i18n/language";
import { supabase } from "@/integrations/supabase/client";

const AUTHORIZED_EMAILS = [
  "toubi.prestation@gmail.com",
  "powerprestationint@gmail.com",
  "admin@powerprestation.com",
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stats, setStats] = useState({ students: 0, blogs: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !AUTHORIZED_EMAILS.includes(session.user.email || "")) {
        navigate("/");
        return;
      }

      const { count: studentCount } = await supabase
        .from("student_applications")
        .select("*", { count: "exact", head: true });

      const { count: blogCount } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true });

      setStats({
        students: studentCount || 0,
        blogs: blogCount || 0,
      });
    };

    checkAuth();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-secondary/10">
      <Header />

      <main className="pb-20 pt-32">
        <div className="section-container">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground">{t.adminDashboard.title}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{t.adminDashboard.subtitle}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut size={16} />
              {t.adminDashboard.signOut}
            </Button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <ScrollReveal animation="slide-up">
              <Card className="group overflow-hidden rounded-[2.5rem] border-none shadow-strong transition-all hover:ring-2 ring-primary/20">
                <CardHeader className="p-8 pb-4 lg:p-10">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Users size={28} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t.adminDashboard.studentsTotal}
                      </p>
                      <p className="text-3xl font-bold text-foreground">{stats.students}</p>
                    </div>
                  </div>
                  <CardTitle className="mt-6 font-display text-2xl">{t.adminDashboard.crmTitle}</CardTitle>
                  <CardDescription className="text-base">{t.adminDashboard.crmDescription}</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 lg:p-10">
                  <Button
                    asChild
                    className="w-full gap-3 rounded-2xl py-7 text-sm font-bold uppercase tracking-[0.2em]"
                    size="xl"
                  >
                    <Link to="/admin/crm">
                      {t.adminDashboard.openCrm}
                      <ArrowRight size={18} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </ScrollReveal>

            <ScrollReveal animation="slide-up" delay={100}>
              <Card className="group overflow-hidden rounded-[2.5rem] border-none shadow-strong transition-all hover:ring-2 ring-primary/20">
                <CardHeader className="p-8 pb-4 lg:p-10">
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileText size={28} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t.adminDashboard.publishedPosts}
                      </p>
                      <p className="text-3xl font-bold text-foreground">{stats.blogs}</p>
                    </div>
                  </div>
                  <CardTitle className="mt-6 font-display text-2xl">{t.adminDashboard.blogTitle}</CardTitle>
                  <CardDescription className="text-base">{t.adminDashboard.blogDescription}</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 lg:p-10">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      asChild
                      variant="outline"
                      className="gap-3 rounded-2xl py-7 text-[11px] font-bold uppercase tracking-widest"
                      size="xl"
                    >
                      <Link to="/admin/blog">{t.adminDashboard.manageBlogs}</Link>
                    </Button>
                    <Button
                      asChild
                      className="gap-3 rounded-2xl py-7 text-[11px] font-bold uppercase tracking-widest"
                      size="xl"
                    >
                      <Link to="/admin/blog?action=new">
                        <PlusCircle size={18} />
                        {t.adminDashboard.newArticle}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-[2rem] border border-border/40 bg-white p-6 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <Globe size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminDashboard.publicSite}
                </p>
                <Link to="/" className="flex items-center gap-1 text-sm font-bold hover:text-primary">
                  {t.adminDashboard.viewSite} <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-[2rem] border border-border/40 bg-white p-6 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminDashboard.seoHealth}
                </p>
                <p className="text-sm font-bold text-foreground">{t.adminDashboard.optimizationOk}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-[2rem] border border-border/40 bg-white p-6 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Settings size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t.adminDashboard.settings}
                </p>
                <p className="text-sm font-bold text-foreground">V 2.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
