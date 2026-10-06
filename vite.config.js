import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import readline from 'node:readline'

// Windows Ctrl+C bridge
if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

function wildlifePortalBanner(backendUrl) {
  return {
    name: 'wildlife-portal-banner',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        const actualPort = typeof address === 'object' && address ? address.port : 7051;
        const divider = '═'.repeat(72);

        setTimeout(() => {
          console.log('\n' + divider);
          console.log('🦁 \x1b[1m\x1b[32mSMART WILDLIFE CONSERVATION SYSTEM - OPERATIONS PORTAL\x1b[0m');
          console.log(divider);
          console.log(`💻 \x1b[1mPortal URL:\x1b[0m        \x1b[36mhttp://localhost:${actualPort}/\x1b[0m`);
          console.log(`🔗 \x1b[1mAPI Proxy Route:\x1b[0m   \x1b[35m/api  ──►  ${backendUrl}\x1b[0m`);
          console.log(`⚡ \x1b[1mStack Engine:\x1b[0m      \x1b[33mVite + React 19 + Tailwind CSS\x1b[0m`);
          console.log(`🛡️  \x1b[1mPort Isolation:\x1b[0m    \x1b[32mSafe (Unique Port ${actualPort})\x1b[0m`);
          console.log(divider);
          console.log('✨ \x1b[90mPortal is ready. Press \x1b[1m[Ctrl+C]\x1b[0m\x1b[90m to stop.\x1b[0m\n');
        }, 150);
      });

      let isShuttingDown = false;
      const gracefulExit = (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        console.log(`\n\n🛑 \x1b[33m[Shutdown]\x1b[0m Received \x1b[1m${signal}\x1b[0m. Closing Operations Portal...`);
        server.close().then(() => {
          console.log('   ✔  \x1b[32mVite dev server closed cleanly.\x1b[0m');
          console.log('\n🦁 \x1b[32mFrontend operations stopped safely. Goodbye!\x1b[0m 👋\n');
          process.exit(0);
        });
      };

      process.once('SIGINT', () => gracefulExit('SIGINT (Ctrl+C)'));
      process.once('SIGTERM', () => gracefulExit('SIGTERM'));
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.VITE_PORT || '7051', 10)
  const targetBackend = env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://localhost:7050'

  return {
    plugins: [react(), tailwindcss(), wildlifePortalBanner(targetBackend)],
    server: {
      port,
      strictPort: false,
      open: false,
      proxy: {
        '/api': {
          target: targetBackend,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: port + 10,
    },
  }
})
