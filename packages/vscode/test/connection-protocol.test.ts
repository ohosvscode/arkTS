import { describe, expect, it } from 'vite-plus/test'
import { ProjectConnectionProtocol } from '../src/frontend/interfaces/project-connection-protocol'
import projectMock from './project-mock.json'

describe('connectionProtocol', () => {
  it('should be valid', () => {
    expect(ProjectConnectionProtocol.ServerFunction.RequestTemplateMarketList.Response.is(projectMock)).toBe(true)
  })
})
