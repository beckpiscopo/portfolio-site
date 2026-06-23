/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    "./*.html",
    "./src/**/*.{html,js}",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        libre: ['"Young Serif"', ...defaultTheme.fontFamily.sans]
      },
    },
  },
  plugins: [
    require('flowbite/plugin')
  ]
}
