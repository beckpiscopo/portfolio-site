/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        libre: ['"Young Serif"', ...defaultTheme.fontFamily.sans]
    },
  },
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {}
  }
}
}
