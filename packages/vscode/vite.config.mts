import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vite'
import { createViteConfig } from './scripts/vite'

export default defineConfig(async () => {
  if (process.env.NODE_ENV === 'qualifier-editor') {
    return createViteConfig(path.resolve(__dirname, 'src/qualifier-editor'), 'qualifier-editor.html')
  }
  else {
    return createViteConfig(path.resolve(__dirname, 'src/project'), 'project.html', true)
  }
})
