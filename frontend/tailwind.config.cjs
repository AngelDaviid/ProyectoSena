/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            screens: {
                laptop: { max: "1366px" },
            },
            backgroundImage: {
                "login-1920": "url('/public/fondo1920x1080.jpeg')",
                "login-1366": "url('/public/fondo1366x768.jpeg')",
            },
        },
    },
    plugins: [],
};