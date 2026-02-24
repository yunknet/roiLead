import React from 'react';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    dark?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = '2xl', dark = false }) => {
    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-xl',
        xl: 'text-2xl',
        '2xl': 'text-3xl',
        '3xl': 'text-4xl',
    };

    return (
        <div
            className={`flex items-center font-normal tracking-tighter select-none ${sizeClasses[size]} ${className}`}
            style={{ fontFamily: "'Varela Round', sans-serif" }}
        >
            <span style={{ color: '#81BB3D' }}>roi</span>
            <span className={dark ? 'text-white' : 'text-[#2D3E50] dark:text-white'}>Lead</span>
        </div>
    );
};

export default Logo;
