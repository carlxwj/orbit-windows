import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {ignores:['dist-*/**','release/**','legacy/**','build/**','.npm-cache/**','node_modules/**']},
  js.configs.recommended, ...tseslint.configs.recommended,
  {files:['**/*.ts','**/*.tsx'],rules:{'no-undef':'off','no-empty':['error',{allowEmptyCatch:true}],'@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}}
);
