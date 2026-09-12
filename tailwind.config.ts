import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zhihu: {
          blue: "#056de8",
          ink: "#17233c"
        }
      }
    }
  },
  plugins: []
};

export default config;
