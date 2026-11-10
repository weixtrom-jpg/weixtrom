import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.service.ts', '!**/node_modules/**'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@weixtrom/shared(.*)$': '<rootDir>/../../packages/shared/src$1',
    '^@nestjs/schedule$': '<rootDir>/test/__mocks__/nestjs-schedule.ts',
  },
};

export default config;
