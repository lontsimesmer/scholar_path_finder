import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ScrollToHash from "@/components/ScrollToHash";

const Index = lazy(() => import("./pages/Index"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Verify2FA = lazy(() => import("./pages/Verify2FA"));
const VerifyContact = lazy(() => import("./pages/VerifyContact"));
const StartProcedure = lazy(() => import("./pages/StartProcedure"));
const LegalDocument = lazy(() => import("./pages/LegalDocument"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const AdminCRM = lazy(() => import("./pages/AdminCRM"));
const AdminCRMStudent = lazy(() => import("./pages/AdminCRMStudent"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminManualPayments = lazy(() => import("./pages/AdminManualPayments"));
const AdminFAQ = lazy(() => import("./pages/AdminFAQ"));
const AdminTeam = lazy(() => import("./pages/AdminTeam"));
const AdminNotifications = lazy(() => import("./pages/AdminNotifications"));
const AdminFollowupSettings = lazy(() => import("./pages/AdminFollowupSettings"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="page-shell flex items-center justify-center">
    <div className="relative z-10 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Loading experience...</p>
    </div>
  </div>
);

// Redirects legacy bare public URLs to their /fr/ equivalent (default language)
// while preserving the search and hash so anchor links keep working.
const LegacyRedirect = ({ to }: { to: string }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
};

const LegacyBlogSlugRedirect = () => {
  const { slug } = useParams();
  const location = useLocation();
  return <Navigate to={`/fr/blog/${slug ?? ""}${location.search}${location.hash}`} replace />;
};

const LegacyLegalRedirect = () => {
  const { document } = useParams();
  const location = useLocation();
  return <Navigate to={`/fr/legal/${document ?? ""}${location.search}${location.hash}`} replace />;
};

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public routes — localized under /fr/... and /en/... */}
      <Route path="/fr" element={<Index />} />
      <Route path="/en" element={<Index />} />
      <Route path="/fr/blog" element={<Blog />} />
      <Route path="/en/blog" element={<Blog />} />
      <Route path="/fr/blog/:slug" element={<BlogPost />} />
      <Route path="/en/blog/:slug" element={<BlogPost />} />
      <Route path="/fr/legal/:document" element={<LegalDocument />} />
      <Route path="/en/legal/:document" element={<LegalDocument />} />

      {/* Legacy URLs -> 301 to French (default) equivalents. Hosting
          rewrites in _redirects handle the same at the CDN edge; these
          in-app fallbacks cover local dev and any SPA-side navigation. */}
      <Route path="/" element={<LegacyRedirect to="/fr" />} />
      <Route path="/blog" element={<LegacyRedirect to="/fr/blog" />} />
      <Route path="/blog/:slug" element={<LegacyBlogSlugRedirect />} />
      <Route path="/legal/:document" element={<LegacyLegalRedirect />} />

      {/* Private / transactional routes stay unprefixed */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-2fa" element={<Verify2FA />} />
      <Route path="/verify-contact" element={<VerifyContact />} />
      <Route path="/start-procedure" element={<StartProcedure />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/blog" element={<AdminBlog />} />
      <Route path="/admin/leads" element={<AdminLeads />} />
      <Route path="/admin/payments" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/manual-payments" element={<AdminManualPayments />} />
      <Route path="/admin/faq" element={<AdminFAQ />} />
      <Route path="/admin/team" element={<AdminTeam />} />
      <Route path="/admin/notifications" element={<AdminNotifications />} />
      <Route path="/admin/followup-settings" element={<AdminFollowupSettings />} />
      <Route path="/admin/students/:studentId" element={<AdminCRMStudent />} />
      <Route path="/admin/crm" element={<AdminCRM />} />
      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ScrollToHash />
          <AppRoutes />
        </TooltipProvider>
      </LanguageProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
