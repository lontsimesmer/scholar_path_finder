import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ScrollToHash from "@/components/ScrollToHash";

const Index = lazy(() => import("./pages/Index"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Login = lazy(() => import("./pages/Login"));
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
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToHash />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify-contact" element={<VerifyContact />} />
              <Route path="/start-procedure" element={<StartProcedure />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/legal/:document" element={<LegalDocument />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/leads" element={<AdminLeads />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route path="/admin/students/:studentId" element={<AdminCRMStudent />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/admin/crm" element={<AdminCRM />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
