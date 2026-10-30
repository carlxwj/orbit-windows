import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'e2e',workers:1,fullyParallel:false,timeout:60000,reporter:[['list'],['html',{open:'never'}]],outputDir:'test-results',use:{trace:'retain-on-failure'}});
