import path from 'node:path'
import { Listr } from 'listr2'
import { x } from 'tinyexec'

export function createWebviewTasks(startTime: number) {
  const listr = new Listr([
    { title: 'Build webview common package', task: () => $`cross-env NODE_ENV=common vite build` },
    {
      title: 'Build webviews',
      task: () => new Listr([
        { title: 'Build project webview', task: () => $`cross-env NODE_ENV=project vite build` },
        { title: 'Build qualifier editor webview', task: () => $`cross-env NODE_ENV=qualifier-editor vite build` },
        { title: 'Build hdc manager webview', task: () => $`cross-env NODE_ENV=hdc-manager vite build` },
      ], { concurrent: true }),
    },
  ])
  const originalRun = listr.run
  listr.run = async (ctx) => {
    const result = await originalRun.bind(listr)(ctx)
    console.log(`✔ BUILD SUCCESSFUL in ${Math.round(performance.now() - startTime)}ms`)
    return result
  }
  return listr
}

export async function $(command: TemplateStringsArray) {
  try {
    await x(command.join(' '), [], {
      nodeOptions: {
        cwd: path.resolve(new URL('.', import.meta.url).pathname, '..'),
        shell: true,
      },
    })
  }
  catch (error) {
    console.error(error)
    throw error
  }
}
