import type { LanguageServerConfigurator } from '@arkts/shared'
import type { LanguageServicePlugin } from '@volar/language-server'
import type { ProjectDetectorManager } from '../interfaces/project-detector-manager'
import { createETS$$ThisService } from './arkts-$$this'
import { createArkTSLinter } from './arkts-linter'
import { createArkTSResource } from './arkts-resource'

export async function createArkTServices(projectDetectorManager: ProjectDetectorManager, ets: typeof import('ohos-typescript'), config: LanguageServerConfigurator): Promise<LanguageServicePlugin[]> {
  return [
    createArkTSResource(projectDetectorManager, ets, config),
    createETS$$ThisService(ets, config),
    createArkTSLinter(ets, config),
  ]
}
