import { Listr } from 'listr2'
import { $, createWebviewTasks } from './watch'

const startTime = performance.now()

new Listr([
  { title: 'Build extension', task: () => $`tsdown` },
  {
    title: 'Build webview-related packages and dist files',
    task: () => createWebviewTasks(startTime),
  },
], { concurrent: true }).run()
