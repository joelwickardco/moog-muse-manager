import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: '.vite/build/main',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        '@vscode/sqlite3',
        'better-sqlite3',
        'fs',
        'path',
        'crypto',
        'os',
        'child_process',
        'events',
        'stream',
        'util',
        'assert',
        'buffer',
        'constants',
        'module',
        'process',
        'url',
        'vm',
        'mysql2',
        'pg',
        'oracledb',
        'mssql',
        'mongodb',
        '@google-cloud/spanner',
        '@sap/hana-client',
        '@sap/hana-client/extension/Stream',
        'hdb-pool',
        'pg-native',
        'pg-query-stream',
        'typeorm-aurora-data-api-driver',
        'redis',
        'ioredis',
        'sql.js',
      ],
      output: {
        entryFileNames: 'main.js',
      },
    },
    target: 'node16',
    minify: false,
    commonjsOptions: {
      include: [/node_modules/],
      extensions: ['.js', '.cjs', '.ts', '.tsx', '.json'],
      dynamicRequireTargets: [
        'node_modules/better-sqlite3/*.node',
        'node_modules/@vscode/sqlite3/*.node'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@vscode/sqlite3', 'better-sqlite3']
  },
  ssr: {
    noExternal: ['@vscode/sqlite3', 'better-sqlite3']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  plugins: [
    {
      name: 'vite-plugin-node-polyfills',
      apply: 'build',
      enforce: 'pre',
      configResolved(config) {
        if (config.command === 'build' && config.build.rollupOptions.external) {
          const externals = Array.isArray(config.build.rollupOptions.external)
            ? config.build.rollupOptions.external
            : [config.build.rollupOptions.external];
          config.build.rollupOptions.external = externals.filter((ext): ext is string | RegExp => 
            typeof ext === 'string' || ext instanceof RegExp
          );
        }
      }
    }
  ],
  publicDir: false
}); 