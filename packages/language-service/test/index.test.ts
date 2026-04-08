import path from 'node:path'
import { ProjectDetector } from '@arkts/project-detector'
import { describe, expect, it } from 'vite-plus/test'

describe('index', () => {
  it('should create ProjectDetector', () => {
    const projectDetector = ProjectDetector.create(path.resolve(__dirname, 'mock'))
    expect(projectDetector).toBeDefined()
  })
})
