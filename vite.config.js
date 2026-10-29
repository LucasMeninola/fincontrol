import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa funciona tanto em / quanto em /nome-do-repositorio/ do GitHub Pages.
export default defineConfig({plugins: [react()], base: './', build: {outDir:'dist'}});
