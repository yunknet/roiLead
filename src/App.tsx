
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Signup from "./pages/Signup";
import { DashboardLayout } from "./layouts/DashboardLayout";
import Search from "./pages/dashboard/Search";
import Crm from "./pages/dashboard/Crm";
import SubscriptionPage from "./pages/dashboard/Subscription";
import Settings from "./pages/dashboard/Settings";
import CupulaLeadsPage from "./pages/dashboard/CupulaLeads";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import CompleteRegistration from "./pages/CompleteRegistration";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";
import AboutUs from "./pages/AboutUs";
import CupulaLeads from "./pages/CupulaLeads";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Search />} />
              <Route path="crm" element={<Crm />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="cupula_leads" element={<CupulaLeadsPage />} />
            </Route>
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/complete-registration" element={<CompleteRegistration />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/sobre" element={<AboutUs />} />
            <Route path="/cupula-de-leads" element={<CupulaLeads />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
