/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // OBSIDIAN GLASS THEME
                obsidian: '#030303',
                charcoal: '#0a0a0a',
                primary: {
                    DEFAULT: '#ff4d00',
                    glow: 'rgba(255, 77, 0, 0.4)',
                    dim: 'rgba(255, 77, 0, 0.1)',
                },
                glass: {
                    DEFAULT: 'rgba(255, 255, 255, 0.03)',
                    hover: 'rgba(255, 255, 255, 0.06)',
                    border: 'rgba(255, 255, 255, 0.08)',
                    shine: 'rgba(255, 255, 255, 0.15)',
                },
                text: {
                    heading: '#ffffff',
                    body: '#94a3b8',
                    muted: '#64748b',
                    highlight: '#e2e8f0',
                },
                // Status Colors
                success: {
                    DEFAULT: '#10b981',
                    glow: 'rgba(16, 185, 129, 0.4)',
                },
                danger: {
                    DEFAULT: '#ef4444',
                    glow: 'rgba(239, 68, 68, 0.4)',
                }
            },
            fontFamily: {
                main: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                glow: '0 0 20px rgba(255, 77, 0, 0.3)',
                'glow-lg': '0 0 30px rgba(255, 77, 0, 0.4)',
            },
            borderRadius: {
                '4xl': '2rem',
            }
        },
    },
    plugins: [],
}
