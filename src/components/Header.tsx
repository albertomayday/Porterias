import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="border-b-2 border-primary bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="group">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight transition-opacity group-hover:opacity-70">
                PAPERBOY
              </h1>
              <p className="text-sm tracking-[0.3em] uppercase text-muted-foreground">
                La Portería
              </p>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/archivo" 
              className="text-sm uppercase tracking-wider font-medium hover:opacity-60 transition-opacity"
            >
              Archivo
            </Link>
            <Link 
              to="/porteria" 
              className="text-sm uppercase tracking-wider font-medium hover:opacity-60 transition-opacity"
            >
              Portería
            </Link>
            <Link 
              to="/sobre-mi" 
              className="text-sm uppercase tracking-wider font-medium hover:opacity-60 transition-opacity"
            >
              Sobre Mí
            </Link>
            <Link 
              to="/admin" 
              className="text-sm uppercase tracking-wider font-medium hover:opacity-60 transition-opacity"
            >
              Admin
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <button className="md:hidden p-2 hover:bg-accent transition-colors">
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
