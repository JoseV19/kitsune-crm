import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kiriko: {
          900: '#0f172a', // Fondo oscuro (Noche)
          800: '#1e293b', // Fondo de tarjetas
          teal: '#2dd4bf', // El color del espíritu zorro (Cian)
          red: '#f43f5e',  // El color del traje (Rojo)
        }
      },
      boxShadow: {
        'ofuda': '0 0 15px -3px rgba(45, 212, 191, 0.5)', // Resplandor mágico
      }
    },
  },
  plugins: [],
};
export default config;