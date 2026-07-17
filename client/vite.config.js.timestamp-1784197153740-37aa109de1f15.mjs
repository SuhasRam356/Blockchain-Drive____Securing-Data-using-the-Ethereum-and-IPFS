// vite.config.js
import { defineConfig } from "file:///E:/Blockchain-Drive____Securing-Data-using-the-Ethereum-and-IPFS-main/client/node_modules/vite/dist/node/index.js";
import react from "file:///E:/Blockchain-Drive____Securing-Data-using-the-Ethereum-and-IPFS-main/client/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { nodePolyfills } from "file:///E:/Blockchain-Drive____Securing-Data-using-the-Ethereum-and-IPFS-main/client/node_modules/vite-plugin-node-polyfills/dist/index.js";
var vite_config_default = defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5050
  },
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "stream", "util", "crypto"],
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJFOlxcXFxCbG9ja2NoYWluLURyaXZlX19fX1NlY3VyaW5nLURhdGEtdXNpbmctdGhlLUV0aGVyZXVtLWFuZC1JUEZTLW1haW5cXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJFOlxcXFxCbG9ja2NoYWluLURyaXZlX19fX1NlY3VyaW5nLURhdGEtdXNpbmctdGhlLUV0aGVyZXVtLWFuZC1JUEZTLW1haW5cXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9FOi9CbG9ja2NoYWluLURyaXZlX19fX1NlY3VyaW5nLURhdGEtdXNpbmctdGhlLUV0aGVyZXVtLWFuZC1JUEZTLW1haW4vY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscydcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJywgIFxuICAgIHBvcnQ6IDUwNTAsICAgICAgXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG5vZGVQb2x5ZmlsbHMoe1xuICAgICAgaW5jbHVkZTogWydidWZmZXInLCAnc3RyZWFtJywgJ3V0aWwnLCAnY3J5cHRvJ10sXG4gICAgICBnbG9iYWxzOiB7XG4gICAgICAgIEJ1ZmZlcjogdHJ1ZSxcbiAgICAgICAgZ2xvYmFsOiB0cnVlLFxuICAgICAgICBwcm9jZXNzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRaLFNBQVMsb0JBQW9CO0FBQ3piLE9BQU8sV0FBVztBQUNsQixTQUFTLHFCQUFxQjtBQUc5QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLFVBQVUsVUFBVSxRQUFRLFFBQVE7QUFBQSxNQUM5QyxTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
