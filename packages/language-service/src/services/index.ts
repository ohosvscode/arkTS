import type { LanguageServerConfigurator } from '@arkts/shared'
import type { LanguageServicePlugin } from '@volar/language-server'
import type { ProjectDetectorManager } from '../interfaces/project-detector-manager'
import { createETS$$ThisService } from './arkts-$$this'
import { createArkTSColors } from './arkts-color'
import { createArkTSLinter } from './arkts-linter'
import { createArkTSResource } from './arkts-resource'

export interface CreateArkTServiceOptions extends LanguageServerConfigurator {
  getProjectDetectorManager(): ProjectDetectorManager
}

export async function createArkTServices(options: CreateArkTServiceOptions, ets: typeof import('ohos-typescript')): Promise<LanguageServicePlugin[]> {
  return [
    createArkTSResource(options, ets),
    createETS$$ThisService(options, ets),
    createArkTSLinter(options, ets),
    createArkTSColors(options),
  ]
}
