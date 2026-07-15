module.exports = {
  env: {
    es2022: true,
    node: true,
    mocha: true
  },
  extends: [
    'eslint:recommended',
    'semistandard'
  ],
  rules: {
    complexity: ['error', 10],
    'no-useless-return': 'error',
    'prefer-const': 'error'
  }
};
