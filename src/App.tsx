import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Book from "./pages/Book";
import Track from "./pages/Track";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const queryClient = new QueryClient();


function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const loggedInType = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_loggedin_type") : null;

  useEffect(() => {
    // Only redirect to login if not logged in and trying to access a protected route (not /, /login, /signup)
    if (!loggedInType && location.pathname !== "/" && location.pathname !== "/login" && location.pathname !== "/signup") {
      navigate("/login", { replace: true });
      return;
    }
    // If admin, only allow /admin, /login, /signup
    if (loggedInType === "admin") {
      if (location.pathname !== "/admin" && location.pathname !== "/login" && location.pathname !== "/signup") {
        navigate("/admin", { replace: true });
      }
    }
    // If user, block /admin
    if (loggedInType === "user") {
      if (location.pathname === "/admin") {
        navigate("/", { replace: true });
      }
    }
  }, [location.pathname, loggedInType, navigate]);

  return (
    <Routes>
      {loggedInType === "admin" ? (
        <>
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Admin />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Index />} />
          <Route path="/book" element={<Book />} />
          <Route path="/track" element={<Track />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Header />
          <AppRoutes />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
