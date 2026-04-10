import { Uri } from '@vstils/core'
import { describe, expect, it } from 'vite-plus/test'
import { UriUtil } from '../src/utils/uri-util'

describe('UriUtil.isContains', () => {
  it('returns true for windows path with different drive-case', () => {
    expect(UriUtil.isContains('c:/Users/a/b/c.txt', Uri.file('C:/Users/a/b'))).toBe(true)
  })

  it('returns true when child is a file uri and parent is a file path', () => {
    expect(UriUtil.isContains('file:///C:/Users/a/b/c.txt', Uri.file('C:/Users/a/b'))).toBe(true)
  })

  it('returns true when child path equals parent path', () => {
    expect(UriUtil.isContains('/Users/a/b', Uri.file('/Users/a/b'))).toBe(true)
  })

  it('returns false for sibling-like prefix path', () => {
    expect(UriUtil.isContains('/Users/a/b2/c.txt', Uri.file('/Users/a/b'))).toBe(false)
  })

  it('returns false when not under parent directory', () => {
    expect(UriUtil.isContains('/Users/a/c/file.txt', Uri.file('/Users/a/b'))).toBe(false)
  })
})
