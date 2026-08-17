import type { HarmonyToolsFs } from '../src/build-tools/detect-harmony-tools'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { detectHarmonyTools, isValidEtsSdkPath } from '../src/build-tools/detect-harmony-tools'

function normalize(targetPath: string): string {
  return targetPath.replace(/\\/g, '/').replace(/\/+$/, '') || '/'
}

function createMemoryFs(entries: { dirs?: string[], files?: string[] }): HarmonyToolsFs {
  const dirs = new Set<string>()
  const files = new Set<string>()

  const addDir = (targetPath: string): void => {
    let current = normalize(targetPath)
    while (current && current !== '/') {
      dirs.add(current)
      const parent = current.replace(/\/[^/]+$/, '')
      if (parent === current) break
      current = parent || '/'
    }
  }

  for (const dir of entries.dirs ?? []) addDir(dir)
  for (const file of entries.files ?? []) {
    files.add(normalize(file))
    addDir(file.replace(/[/\\][^/\\]+$/, ''))
  }

  return {
    async isDirectory(targetPath) {
      return dirs.has(normalize(targetPath))
    },
    async isFile(targetPath) {
      return files.has(normalize(targetPath))
    },
    async readDirectory(targetPath) {
      const prefix = `${normalize(targetPath)}/`
      const names = new Set<string>()
      for (const dir of dirs) {
        if (dir.startsWith(prefix)) {
          const rest = dir.slice(prefix.length)
          if (rest && !rest.includes('/')) names.add(rest)
        }
      }
      for (const file of files) {
        if (file.startsWith(prefix)) {
          const rest = file.slice(prefix.length)
          if (rest && !rest.includes('/')) names.add(rest)
        }
      }
      return [...names]
    },
  }
}

function validSdkLayout(sdkRoot: string): { dirs: string[], files: string[] } {
  return {
    dirs: [
      sdkRoot,
      path.posix.join(sdkRoot, 'ets'),
      path.posix.join(sdkRoot, 'ets', 'component'),
      path.posix.join(sdkRoot, 'ets', 'build-tools'),
      path.posix.join(sdkRoot, 'ets', 'build-tools', 'ets-loader'),
    ],
    files: [
      path.posix.join(sdkRoot, 'ets', 'build-tools', 'ets-loader', 'tsconfig.json'),
    ],
  }
}

describe('detectHarmonyTools', () => {
  it('detects command-line-tools at the well-known Linux path', async () => {
    const sdkRoot = '/opt/harmony/command-line-tools/sdk/default/openharmony'
    const layout = validSdkLayout(sdkRoot)
    const detected = await detectHarmonyTools({
      platform: 'linux',
      homedir: '/home/user',
      env: {},
      resolveCommand: () => undefined,
      fs: createMemoryFs(layout),
    })

    expect(detected).toEqual({
      kind: 'command-line-tools',
      toolsRoot: '/opt/harmony/command-line-tools',
      openHarmonySdkPath: sdkRoot,
    })
  })

  it('detects DevEco Studio from the DevEco Studio env var and strips /bin', async () => {
    const toolsRoot = '/Applications/DevEco-Studio.app/Contents'
    const sdkRoot = `${toolsRoot}/sdk/default/openharmony/20`
    const layout = validSdkLayout(sdkRoot)
    const detected = await detectHarmonyTools({
      platform: 'darwin',
      homedir: '/Users/dev',
      env: { 'DevEco Studio': `${toolsRoot}/bin` },
      resolveCommand: () => undefined,
      fs: createMemoryFs({
        dirs: [...layout.dirs, `${toolsRoot}/sdk/default/openharmony`],
        files: layout.files,
      }),
    })

    expect(detected).toEqual({
      kind: 'deveco-studio',
      toolsRoot,
      openHarmonySdkPath: sdkRoot,
    })
  })

  it('picks the highest valid API version under sdk/default/openharmony', async () => {
    const openharmony = '/opt/harmony/command-line-tools/sdk/default/openharmony'
    const sdk12 = validSdkLayout(`${openharmony}/12`)
    const sdk20 = validSdkLayout(`${openharmony}/20`)
    const detected = await detectHarmonyTools({
      platform: 'linux',
      homedir: '/home/user',
      env: {},
      resolveCommand: () => undefined,
      fs: createMemoryFs({
        dirs: [...sdk12.dirs, ...sdk20.dirs, openharmony],
        files: [...sdk12.files, ...sdk20.files],
      }),
    })

    expect(detected?.openHarmonySdkPath).toBe(`${openharmony}/20`)
  })

  it('resolves DEVECO_SDK_HOME/default/openharmony', async () => {
    const sdkHome = '/custom/DevEco/sdk'
    const sdkRoot = `${sdkHome}/default/openharmony`
    const layout = validSdkLayout(sdkRoot)
    const detected = await detectHarmonyTools({
      platform: 'linux',
      homedir: '/home/user',
      env: { DEVECO_SDK_HOME: sdkHome },
      resolveCommand: () => undefined,
      fs: createMemoryFs(layout),
    })

    expect(detected).toMatchObject({
      kind: 'deveco-studio',
      openHarmonySdkPath: sdkRoot,
    })
  })

  it('walks up from hvigorw to the tools root', async () => {
    const toolsRoot = '/opt/harmony/command-line-tools'
    const sdkRoot = `${toolsRoot}/sdk/default/openharmony`
    const layout = validSdkLayout(sdkRoot)
    const detected = await detectHarmonyTools({
      platform: 'linux',
      homedir: '/home/user',
      env: {},
      resolveCommand: command => command === 'hvigorw' ? `${toolsRoot}/bin/hvigorw` : undefined,
      fs: createMemoryFs(layout),
    })

    expect(detected).toEqual({
      kind: 'command-line-tools',
      toolsRoot,
      openHarmonySdkPath: sdkRoot,
    })
  })

  it('returns undefined when no environment is present', async () => {
    const detected = await detectHarmonyTools({
      platform: 'linux',
      homedir: '/home/user',
      env: {},
      resolveCommand: () => undefined,
      fs: createMemoryFs({}),
    })

    expect(detected).toBeUndefined()
  })

  it('rejects a directory that is not a complete ETS SDK', async () => {
    await expect(isValidEtsSdkPath('/tmp/not-an-sdk', path.posix, createMemoryFs({
      dirs: ['/tmp/not-an-sdk'],
    }))).resolves.toBe(false)
  })
})
