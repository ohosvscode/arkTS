import child_process from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { createFileSystemRegistry, createRelativePattern, Uri } from '@vstils/core'
import { createNodeFileSystemProvider } from '@vstils/core/fs/node'

const FRONTEND_ROOT = path.resolve('..', 'vscode', 'src', 'frontend')

async function main() {
  let build_child_process: child_process.ChildProcess | undefined
  await createBuildProcess(`pnpm build`)

  const fsRegistry = await createFileSystemRegistry()
  fsRegistry.registerFileSystemProvider('file', await createNodeFileSystemProvider())
  const watcher = await fsRegistry.fs.createFileSystemWatcher(createRelativePattern(Uri.resolvePath(Uri.parse(import.meta.url), '../../..'), '**/*'), {
    excludes: [/node_modules/g, /\.git/g, /\.d\.ts/g, /\.d\.mts/g, /\.d\.cts/g, /dist/g, /build/g, /\.vite-ssg/g],
  })

  async function kill() {
    if (!build_child_process) return
    if (typeof build_child_process.exitCode === 'number') return
    build_child_process.kill()
    console.warn(`Killed process ${build_child_process.pid}...`)
    if (typeof build_child_process.exitCode !== 'number') {
      console.warn(`Process ${build_child_process.pid} is still running, waiting for 1 second to kill it...`)
      return new Promise(resolve => setTimeout(resolve, 1000))
    }
    console.warn(`Process ${build_child_process.pid} killed successfully.`)
    build_child_process = undefined
  }

  async function createBuildProcess(command: string) {
    if (build_child_process && typeof build_child_process.exitCode !== 'number') await kill()
    build_child_process = child_process.exec(command, { env: { FORCE_COLOR: '1', ...process.env } })
    build_child_process.stdout?.pipe(process.stdout)
    build_child_process.stderr?.pipe(process.stderr)
    return new Promise<void>(resolve => build_child_process?.on('exit', resolve))
  }

  async function onFileChange(uri: Uri) {
    console.log(`File changed: ${uri.toString()}, building...`)
    if (uri.toString().endsWith('.vue')) {
      await createBuildProcess(`pnpm build --webview --no-clean`)
    }
    else if (uri.fsPath.startsWith(FRONTEND_ROOT) && (!uri.fsPath.startsWith(path.resolve(FRONTEND_ROOT, 'commands')) || !uri.fsPath.startsWith(path.resolve(FRONTEND_ROOT, 'functions')))) {
      await createBuildProcess(`pnpm build --webview --no-clean`)
    }
    else {
      await createBuildProcess(`pnpm build --extension --no-clean`)
    }
  }

  watcher.onDidChange(onFileChange)
  watcher.onDidCreate(onFileChange)
  watcher.onDidDelete(onFileChange)

  console.log('Watching for file changes...')
}

main()
