module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '../',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1'
  },
  setupFiles: ['<rootDir>/config/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/src/main/__tests__/renderer/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/main/__tests__/**/*.test.[jt]s?(x)',
    '<rootDir>/src/main/__tests__/**/*.spec.[jt]s?(x)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(better-sqlite3)/)'
  ],
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.vite/',
    '/dist/'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.vite/',
    '/dist/',
    '/__tests__/'
  ]
};