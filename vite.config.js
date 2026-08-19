import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// React Compiler (babel-plugin-react-compiler) is disabled: its conditional-JSX
// memoization was evaluating modal form fields (e.g. `editing.abv`) even when
// the guarding `editing &&` was false, crashing every Edit/Delete modal with
// "null is not an object". Re-enable once that's fixed upstream.
// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
});
