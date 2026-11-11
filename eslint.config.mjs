import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

const noComments = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      forbidden: 'Comments are not allowed. Express intent through names and structure.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const text = comment.value.trim();
          if (text.startsWith('eslint-') || text.startsWith('@ts-')) {
            continue;
          }
          context.report({ loc: comment.loc, messageId: 'forbidden' });
        }
      },
    };
  },
};

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', '**/.vercel/**', '**/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    plugins: { factory: { rules: { 'no-comments': noComments } } },
    rules: {
      'factory/no-comments': 'error',
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
);
