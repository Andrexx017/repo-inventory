import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Regla nueva del "React Compiler" que marca como error el patrón estándar
      // de "cargar datos al montar" (useEffect -> función async -> setState) que
      // usan todas las pantallas de este proyecto (Branches, Users, Roles, etc.).
      // No hay un bug real detrás; se apaga puntualmente esta regla.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
