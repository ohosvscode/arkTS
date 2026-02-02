import type { MaybeRefOrGetter, WebviewViewRegisterOptions } from 'reactive-vscode'
import fs from 'node:fs'
import path from 'node:path'
import { watch as createFileSystemWatcher } from 'chokidar'
import { ref, toValue, useWebviewView, watch } from 'reactive-vscode'
import * as vscode from 'vscode'

export function useCompiledWebview(htmlPath: MaybeRefOrGetter<string>, options: WebviewViewRegisterOptions = {}): ReturnType<typeof useWebviewView> {
  const html = ref('')

  watch(() => htmlPath, () => loadHtml(toValue(htmlPath)))

  const webviewView = useWebviewView('ets-hilog-view', html, {
    ...options,
    webviewOptions: {
      enableScripts: true,
      enableCommandUris: true,
      ...options?.webviewOptions,
    },
  })

  function loadHtml(htmlPath: string): void {
    const content = fs.readFileSync(htmlPath, 'utf-8')
    html.value = content
    html.value = html.value.replace(/\{\{(.*?)\}\}/g, (_, href) => {
      const resourceUri = webviewView.view.value?.webview.asWebviewUri(vscode.Uri.file(path.resolve(path.dirname(htmlPath), href?.trim?.() || href)))
      return decodeURIComponent(resourceUri?.toString() || '')
    })
  }
  watch(() => webviewView.view.value?.webview, () => loadHtml(toValue(htmlPath)), { immediate: true })

  return webviewView
}

export function useCompiledWebviewPanel<T extends vscode.WebviewPanel | vscode.WebviewView>(webviewPanel: T, htmlPath: string, initialURL?: string): vscode.Disposable {
  function loadHtml(htmlPath: string): void {
    const content = fs.readFileSync(htmlPath, 'utf-8')
    webviewPanel.webview.html = content.replace(/\{\{(.*?)\}\}/g, (_, href) => {
      const resourceUri = webviewPanel.webview.asWebviewUri(vscode.Uri.file(path.resolve(path.dirname(htmlPath), href?.trim?.() || href)))
      return decodeURIComponent(resourceUri?.toString() || '')
    }).replace(/<head>/, `<head>${initialURL ? `<script>window.INITIAL_URL = '${initialURL}'</script>` : ''}`)
  }

  const fsWatcher = createFileSystemWatcher(htmlPath)

  fsWatcher.on('ready', () => {
    loadHtml(htmlPath)
    fsWatcher.on('change', loadHtml)
    fsWatcher.on('add', loadHtml)
  })

  return {
    dispose: () => {
      fsWatcher.close()
      fsWatcher.removeAllListeners()
    },
  }
}
