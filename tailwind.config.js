/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    gold: '#a07830',
                    crimson: '#b85c4a',
                    dark: 'rgb(var(--brand-dark) / <alpha-value>)',
                    panel: 'rgb(var(--brand-panel) / <alpha-value>)',
                    soft: 'rgb(var(--brand-soft) / <alpha-value>)',
                    border: 'rgba(0,0,0,0.08)',
                }
            },
            fontFamily: {
                display: ['"Inter"', 'sans-serif'],
                body: ['"Inter"', 'sans-serif'],
                serif: ['"Inter"', 'sans-serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-in-right': 'slideInRight 0.3s ease-out',
                'shimmer': 'shimmer 1.5s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                slideInRight: { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
                shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
            }
        },
    },
    plugins: [],
}
