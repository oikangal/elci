
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brandPink: '#F7A8E2',
        brandPurple: '#B277F6'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(178,119,246,0.25)'
      }
    }
  },
  plugins: []
}
