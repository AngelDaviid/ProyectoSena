let tailwindPlugin;
try {
    // tailwind v4 usa @tailwindcss/postcss
    tailwindPlugin = require('@tailwindcss/postcss');
} catch (e) {
    // fallback a la forma clásica
    tailwindPlugin = require('tailwindcss');
}

module.exports = {
    plugins: [
        tailwindPlugin(),
        require('autoprefixer'),
    ],
}