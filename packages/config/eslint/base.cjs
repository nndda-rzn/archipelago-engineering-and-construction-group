// Shared ESLint base — consumed via packages/config
module.exports = {
  root: true,
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    eqeqeq: ['error', 'smart'],
  },
};
