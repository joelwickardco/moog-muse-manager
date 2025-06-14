const path = require('path');
const fs = require('fs');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon',
    extraResource: [
      './assets/icon.icns',
      './assets/background.png'
    ],
    asarUnpack: [
      'node_modules/@vscode/sqlite3/**/*'
    ],
    ignore: [
      /node_modules\/(?!@vscode\/sqlite3)/
    ],
    appCopyright: 'Copyright © 2024',
    appCategoryType: 'public.app-category.music',
    appBundleId: 'com.moog-muse-manager.app',
    protocols: [
      {
        name: 'Moog Muse Manager',
        schemes: ['moog-muse-manager']
      }
    ],
    afterCopy: [
      (buildPath, electronVersion, platform, arch) => {
        const sqlite3Path = path.join(buildPath, 'node_modules', '@vscode', 'sqlite3');
        if (fs.existsSync(sqlite3Path)) {
          console.log('SQLite3 module found at:', sqlite3Path);
        } else {
          console.error('SQLite3 module not found at:', sqlite3Path);
          const sourcePath = path.join(__dirname, 'node_modules', '@vscode', 'sqlite3');
          if (fs.existsSync(sourcePath)) {
            console.log('Copying SQLite3 module from:', sourcePath);
            fs.cpSync(sourcePath, sqlite3Path, { recursive: true });
          } else {
            console.error('SQLite3 module not found in source at:', sourcePath);
          }
        }
      }
    ]
  },
  rebuildConfig: {
    onlyModules: ['@vscode/sqlite3'],
    force: true,
    electronVersion: '28.2.3',
    buildFromSource: true,
    debug: true,
    nodeGypRebuild: true,
    prebuild: true,
    runtime: 'electron',
    arch: 'arm64',
    platform: 'darwin'
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'moog-muse-manager'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {}
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        icon: './assets/icon.icns',
        background: './assets/background.png',
        format: 'ULFO',
        contents: [
          {
            x: 130,
            y: 220,
            type: 'file',
            path: './out/moog-muse-manager-darwin-arm64/moog-muse-manager.app'
          },
          {
            x: 410,
            y: 220,
            type: 'link',
            path: '/Applications'
          }
        ],
        window: {
          width: 540,
          height: 380
        }
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main/main.ts',
            config: 'vite.main.config.ts',
            outDir: '.vite/build/main'
          },
          {
            entry: 'src/preload/preload.ts',
            config: 'vite.preload.config.ts',
            outDir: '.vite/build/preload'
          }
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
            outDir: '.vite/build/renderer'
          }
        ]
      }
    },
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {}
    }
  ]
}; 