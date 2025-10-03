module.exports = {
  env: {
    node: true,
    jest: true,
    es6: true,
    es2022: true
  },
  extends: [
    'eslint:recommended',
		'plugin:unicorn/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'es2022',
    project: './tsconfig.json',
    sourceType: 'module',
    tsconfigRootDir: __dirname
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'unicorn',
    'eslint-plugin-tsdoc'
  ],
  root: true,
  rules: {
    semi: "off",
    'unicorn/prefer-node-protocol': 1,              // import {...} from 'node:xxx'
    'unicorn/filename-case': [
      "error",
      { "case": "camelCase" }                       // Opigence
    ],
    'unicorn/prevent-abbreviations': 0,             // Best judgment is sufficient
    'unicorn/no-unreadable-array-destructuring': 0, // prefer-destructuring conflict
    'unicorn/numeric-separators-style': [
      "error",  //"onlyIfContainsSeparator": false,
      {
        "hexadecimal": {
          minimumDigits: 0,
          groupLength: 2
        },
        "binary": {
          minimumDigits: 0,
          groupLength: 4
        },
        "octal": {
          minimumDigits: 0,
          groupLength: 4
        },
        "number": {
          minimumDigits: 4,
          groupLength: 3
        }
      }
    ],
    'tsdoc/syntax': 'warn'
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: 'tsconfig.json',
      },
    },
  },
}
