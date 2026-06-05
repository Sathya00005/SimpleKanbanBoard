module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/auth/**/*.ts'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};
