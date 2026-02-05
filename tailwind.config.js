/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                obsidian: '#030303',
                charcoal: '#0a0a0a',
                primary: '#ff4d00',
                glass: 'rgba(255, 255, 255, 0.03)',
                'glass-border': 'rgba(255, 255, 255, 0.08)',
                'surface': 'rgba(255, 255, 255, 0.05)',
                'surface-hover': 'rgba(255, 255, 255, 0.08)',
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                glow: '0 0 20px rgba(255, 77, 0, 0.3)',
            }
        },
    },
    plugins: [],
}
