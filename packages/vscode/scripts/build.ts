import type { ListrTask } from 'listr2'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Listr } from 'listr2'
import { $ } from './utils'

if (!process.argv.includes('--extension') && !process.argv.includes('--webview')) process.argv.push('--extension', '--webview')

new Listr([
  process.argv.includes('--extension')
    ? {
        title: 'Build extension',
        task: () => new Listr([
          process.argv.includes('--no-clean') ? undefined : { title: 'Clean dist folder', task: () => fs.rmSync(path.resolve('dist'), { recursive: true, force: true }) },
          { title: 'Build', task: () => $`vp pack` },
        ].filter(Boolean) as ListrTask[]),
      }
    : undefined,
  process.argv.includes('--webview')
    ? {
        title: 'Build webview-related packages and dist files',
        task: () => new Listr([
          process.argv.includes('--no-clean') ? undefined : { title: 'Clean build folder', task: () => fs.rmSync(path.resolve('build'), { recursive: true, force: true }) },
          { title: 'Build', task: () => $`vite-ssg build` },
        ].filter(Boolean) as ListrTask[]),
      }
    : undefined,
].filter(Boolean) as ListrTask[], { concurrent: true }).run()
