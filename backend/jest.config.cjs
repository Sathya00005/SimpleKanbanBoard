module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Try mapping to .ts first, fall back to .js for node_modules
    '^(\\.{1,2}/.*)\\.js$': ['$1.ts', '$1.js'],
  },
  testMatch: [
    '**/*.integration.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: { module: 'CommonJS' } },
    ],
  },
};