import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "src/__mocks__/react-native.tsx"),
      "lucide-react-native": path.resolve(__dirname, "src/__mocks__/lucide-react-native.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.tsx"],
    server: {
      deps: {
        fallbackCJS: true,
      },
    },
  },
});
