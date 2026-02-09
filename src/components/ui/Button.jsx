import { motion } from 'framer-motion';
import useSound from '../../hooks/useSound';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20',
        outline: 'border-2 border-primary/50 text-primary hover:bg-primary/10',
        ghost: 'hover:bg-primary/10 text-primary-light',
        accent: 'bg-accent hover:bg-amber-500 text-slate-900 font-bold',
    };

    const { playClick } = useSound();

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
                playClick();
                if (onClick) onClick(e);
            }}
            className={`px-6 py-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
