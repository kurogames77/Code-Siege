import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
            <Link to="/" className="flex items-center gap-2 group">
                <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                    <Shield className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase italic">
                    Code <span className="text-primary italic">Siege</span>
                </span>
            </Link>

            <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
                <Link to="/about" className="hover:text-white transition-colors">About</Link>
                <Link to="/" state={{ openLogin: true }} className="text-white hover:text-primary transition-colors hover:scale-105 transform">Login</Link>
            </div>
        </nav>
    );
};

export default Navbar;
