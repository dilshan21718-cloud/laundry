import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Shirt, User, BarChart3 } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("laundrybuddy_loggedin_type");
    navigate("/");
    window.location.reload();
  };
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Get logged-in user type from localStorage
  const loggedInType = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_loggedin_type") : null;

  let navItems = [];
  if (loggedInType === "admin") {
    navItems = [
      { path: "/admin", label: "Admin", icon: BarChart3 },
    ];
  } else if (loggedInType === "staff") {
    navItems = [
      { path: "/staff", label: "Staff Dashboard", icon: BarChart3 },
    ];
  } else {
    navItems = [
      { path: "/", label: "Home", icon: Shirt },
      { path: "/book", label: "Book Service", icon: Shirt },
      { path: "/track", label: "Track Order", icon: BarChart3 },
      { path: "/account", label: "Account", icon: User },
    ];
  }

  // Handler for protected nav
  const handleProtectedNav = (e, path) => {
    if (!loggedInType && path !== "/signup") {
      e.preventDefault();
      navigate("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="p-2 rounded-lg accent-gradient shadow-accent">
            <Shirt className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient-accent">
            CleanWave
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} onClick={e => handleProtectedNav(e, item.path)}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                className={`transition-all duration-200 ${isActive(item.path) ? "shadow-soft" : ""}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          {/* Login & Signup Buttons */}
          {!loggedInType ? (
            <>
              <Link to="/login">
                <Button variant="outline" className="ml-4">Login</Button>
              </Link>
              <Link to="/signup">
                <Button variant="hero" className="ml-2">Sign Up</Button>
              </Link>
            </>
          ) : (
            <Button variant="outline" className="ml-4" onClick={handleLogout}>Logout</Button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={e => { handleProtectedNav(e, item.path); setIsMenuOpen(false); }}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            {/* Login & Signup Buttons for Mobile */}
            {!loggedInType ? (
              <>
                <Link to="/login">
                  <Button variant="outline" className="w-full justify-start mt-2" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="hero" className="w-full justify-start mt-2" onClick={() => setIsMenuOpen(false)}>
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <Button variant="outline" className="w-full justify-start mt-2" onClick={() => { setIsMenuOpen(false); handleLogout(); }}>
                Logout
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;