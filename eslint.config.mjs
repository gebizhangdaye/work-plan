import js from '@eslint/js'
import tseslint from 'typescript-eslint'

const SCRIPTS = ['**/*.js', '**/*.mjs', '**/*.cjs']

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'release/**', 'node_modules/**', 'resources/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }]
    }
  },
  {
    // 体积与复杂度门禁只管应用代码；生成图标的脚本是像素采样循环，形态天然不同
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 8],
      'max-depth': ['error', 3],
      'max-params': ['error', 5]
    }
  },
  {
    files: ['src/renderer/**/*.tsx'],
    rules: { 'max-lines': ['error', { max: 120, skipBlankLines: true, skipComments: true }] }
  },
  {
    // 构建脚本是纯 JS，不带类型信息
    files: SCRIPTS,
    ...tseslint.configs.disableTypeChecked
  },
  {
    // 必须单列一块：写进上面那块会被 rules 键整体覆盖
    files: SCRIPTS,
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
)
