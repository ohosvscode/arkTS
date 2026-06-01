/**
 * project-write-path-guard 模块的单元测试。
 *
 * 覆盖场景：
 * - isRootDevEcoStudioProjectsPath: DevEcoStudioProjects 根/子目录识别
 * - assertWritableProjectDirectoryPath: 系统路径拦截、Home 目录拦截、合法路径放行
 * - resolveArchiveEntryPath: Zip Slip 攻击防护（路径遍历、绝对路径）
 */
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import {
  assertWritableProjectDirectoryPath,
  isRootDevEcoStudioProjectsPath,
  ProjectWritePathError,
  resolveArchiveEntryPath,
} from '../src/utils/project-write-path-guard'

const homeDir = os.homedir()

describe('project-write-path-guard', () => {
  it('detects root DevEcoStudioProjects paths', () => {
    expect(isRootDevEcoStudioProjectsPath('/DevEcoStudioProjects')).toBe(true)
    expect(isRootDevEcoStudioProjectsPath('/DevEcoStudioProjects/MyApplication')).toBe(true)
    expect(isRootDevEcoStudioProjectsPath(`${homeDir}/DevEcoStudioProjects/MyApplication`)).toBe(false)
  })

  it('rejects filesystem root and system directories', () => {
    expect(() => assertWritableProjectDirectoryPath('/', homeDir)).toThrow(ProjectWritePathError)
    expect(() => assertWritableProjectDirectoryPath('/DevEcoStudioProjects/MyApplication', homeDir)).toThrow(ProjectWritePathError)
    expect(() => assertWritableProjectDirectoryPath('/etc/project', homeDir)).toThrow(ProjectWritePathError)
    expect(() => assertWritableProjectDirectoryPath(homeDir, homeDir)).toThrow(ProjectWritePathError)
  })

  it('allows user project directories', () => {
    expect(assertWritableProjectDirectoryPath(`${homeDir}/DevEcoStudioProjects/MyApplication`, homeDir))
      .toBe(path.resolve(`${homeDir}/DevEcoStudioProjects/MyApplication`))
    expect(assertWritableProjectDirectoryPath('/tmp/arkts-project', homeDir))
      .toBe(path.resolve('/tmp/arkts-project'))
  })

  it('blocks zip slip entries', () => {
    const extractRoot = `${homeDir}/DevEcoStudioProjects/MyApplication`
    expect(resolveArchiveEntryPath(extractRoot, 'entry/src/main/module.json5'))
      .toBe(path.resolve(extractRoot, 'entry/src/main/module.json5'))
    expect(() => resolveArchiveEntryPath(extractRoot, '../outside.txt')).toThrow(ProjectWritePathError)
    expect(() => resolveArchiveEntryPath(extractRoot, '/etc/passwd')).toThrow(ProjectWritePathError)
  })
})
