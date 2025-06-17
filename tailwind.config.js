/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/styles/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cleanapp-green': '#EBF1E8',
      },
    },
  },
  plugins: [],
}
