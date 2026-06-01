import type { FormRules } from 'naive-ui'
import type { Ref } from 'vue'
import path from 'node:path'
import { ref, watch } from 'vue'
// [新增] 项目写入路径安全校验工具：
// - assertWritableProjectDirectoryPath: 校验路径是否可安全写入（防止系统路径/无效路径）
// - isRootDevEcoStudioProjectsPath: 判断是否为 DevEcoStudioProjects 根目录（用于智能路径替换）
// - ProjectWritePathError: 路径校验异常类
import {
  assertWritableProjectDirectoryPath,
  isRootDevEcoStudioProjectsPath,
  ProjectWritePathError,
} from '../../utils/project-write-path-guard'

export interface Input {
  label: string
  labelIcon?: string
}

export interface TextInput extends Input {
  type: 'text'
  value?: string
  placeholder?: string
  required?: boolean
}

export interface SelectInput<T extends string | number = string | number> extends Input {
  type: 'select'
  options: { value: T, label: string }[]
  value?: T
  placeholder?: string
  required?: boolean
}

export interface CheckboxInput extends Input {
  type: 'checkbox'
  options: { value: string, label: string }[]
  value?: string[]
  placeholder?: string
  required?: boolean
}

export interface TextButtonContent {
  type: 'text'
  text: string
}

export interface IconButtonContent {
  type: 'icon'
  icon: string
}

export type ButtonContent = TextButtonContent | IconButtonContent

export interface TextButtonGroupInput extends Omit<TextInput, 'type'> {
  type: 'text-button-group'
  buttonContent: ButtonContent | [TextButtonContent, IconButtonContent]
  /** 模板中可能传入解包后的值，故同时接受 Ref 或值 */
  onClick?(project: Ref<ProjectConfiguration | undefined> | ProjectConfiguration | undefined): void
}

export type BaseInput = TextInput | SelectInput | CheckboxInput
export type ProjectInput = BaseInput | TextButtonGroupInput

export interface ProjectConfiguration {
  title: string
  description: string
  icon?: string
  id: string
  input: { [key: string]: ProjectInput }
  rules?: FormRules
  onInit?(project: Ref<this>): void
  onDestroy?(newProject: Ref<ProjectConfiguration>): void
  onSubmit?(project: Ref<this>): void | Promise<void>
}

export interface ProjectConfigurationContext {
  projectConfigurations: Ref<ProjectConfiguration[]>
  currentProjectId: Ref<string>
  currentProject: Ref<ProjectConfiguration | undefined>
}

// [新增] 根据用户主目录和项目名构建默认保存路径 ~/DevEcoStudioProjects/<projectName>
function buildDefaultSavePath(homeDirectory: string, projectName: string): string {
  return path.join(homeDirectory, 'DevEcoStudioProjects', projectName)
}

// [新增] 将 ProjectWritePathError 转换为用户可读的 i18n 错误消息
function formatProjectWritePathValidationError(error: ProjectWritePathError, t: (key: string, ...args: string[]) => string): string {
  switch (error.code) {
    case 'BLOCKED_SYSTEM_PATH':
      return t('project.writePath.blockedSystemPath')
    case 'INVALID_PATH':
      return t('project.writePath.invalid')
    default:
      return t('project.createProject.savePathRequired')
  }
}

export function createProjectConfigContext(homeDirectory: Ref<string | null>): ProjectConfigurationContext {
  const { t } = useI18n()
  const { connection, createOpenDialog } = useProjectConnection()
  const lastAutoSavePath = ref<string>()
  const subscriptions = new Set<() => void>()

  // [新增] 智能应用默认保存路径：仅在用户尚未手动修改路径、或路径仍为 DevEcoStudioProjects 根目录时自动更新
  // 场景：用户修改项目名后自动同步保存路径，但保留用户已手动选择的路径
  function applyDefaultSavePath(project: Ref<ProjectConfiguration>, projectName: string): void {
    const home = homeDirectory.value
    if (!home) return

    const savePathInput = project.value.input.savePath as TextButtonGroupInput
    const nextSavePath = buildDefaultSavePath(home, projectName)
    const currentSavePath = savePathInput.value
    if (
      !currentSavePath
      || currentSavePath === lastAutoSavePath.value
      || isRootDevEcoStudioProjectsPath(currentSavePath)
    ) {
      savePathInput.value = nextSavePath
      lastAutoSavePath.value = nextSavePath
    }
  }
  const modelVersionToSdkVersionMap = new Map(
    [
      ['6.0.0', 20],
      ['5.1.1', 19],
      ['5.1.0', 18],
      ['6.0.5', 17],
      ['5.0.4', 16],
      ['5.0.3', 15],
      ['5.0.2', 14],
      ['5.0.1', 13],
      ['5.0.0', 12],
      ['4.1.0', 11],
      ['4.0.0', 10],
    ] as const,
  )

  const projectConfigurations = ref<ProjectConfiguration[]>([
    {
      title: 'Empty Ability',
      description: t('project.createProject.emptyAbilityDescription'),
      icon: 'i-ph-cube-duotone',
      id: 'empty-ability',
      rules: {
        savePath: {
          async asyncValidator(_rule, value: TextInput, callback) {
            if (!value.value) return callback(t('project.createProject.savePathRequired'))
            // [新增] 保存路径写入安全性前置校验：拦截系统目录、无效路径等不安全的写入目标
            try {
              assertWritableProjectDirectoryPath(value.value, homeDirectory.value ?? '')
            }
            catch (error) {
              if (error instanceof ProjectWritePathError) {
                return callback(formatProjectWritePathValidationError(error, t))
              }
              throw error
            }
            const stat = await connection.stat?.(value.value)
            if (stat && !stat.isDirectory) return callback(t('project.createProject.savePathNotDirectory'))
            let directoryFileNames = await connection.readDirectory?.(value.value)
            if (!directoryFileNames) return callback()
            directoryFileNames = directoryFileNames.filter(item => item !== '.DS_Store')
            if (directoryFileNames.length > 0) return callback(t('project.createProject.savePathHasFiles', [directoryFileNames.join(', ').slice(0, 30)]))
            callback()
          },
        },
      },
      input: {
        projectName: {
          type: 'text',
          value: 'MyApplication',
          placeholder: t('project.createProject.projectNamePlaceholder'),
          label: t('project.createProject.projectName'),
          labelIcon: 'i-ph-pen-duotone',
          required: true,
        },
        bundleName: {
          type: 'text',
          value: 'com.example.myapplication',
          placeholder: t('project.createProject.bundleNamePlaceholder'),
          label: t('project.createProject.bundleName'),
          labelIcon: 'i-ph-package-duotone',
          required: true,
        },
        savePath: {
          type: 'text-button-group',
          // [变更] 初始值从预填空字符串改为空，由 watch(homeDirectory) 回调动态填充默认路径
          value: '',
          placeholder: t('project.createProject.savePathPlaceholder'),
          label: t('project.createProject.savePath'),
          labelIcon: 'i-ph-folder-duotone',
          required: true,
          buttonContent: [
            { type: 'text', text: t('project.createProject.selectSavePath') },
            { type: 'icon', icon: 'i-ph-folder-duotone' },
          ],
          onClick: async project => (
            createOpenDialog({
              canSelectFiles: false,
              canSelectFolders: true,
              canSelectMany: false,
              onClose(uri) {
                if (!uri) return
                if (uri.length !== 1) return
                const config = project != null && 'value' in project
                  ? (project as Ref<ProjectConfiguration | undefined>).value
                  : (project as ProjectConfiguration | undefined)
                if (config?.input.savePath) config.input.savePath.value = uri[0]
              },
            })
          ),
        },
        compatibleSdkVersion: {
          type: 'select',
          options: Array
            .from(modelVersionToSdkVersionMap.entries())
            .map(([modelVersion, sdkVersion]) => ({
              value: sdkVersion,
              label: `${modelVersion}(API${sdkVersion})`,
            })),
          label: t('project.createProject.compatibleSdkVersion'),
          value: 20,
          labelIcon: 'i-ph-cpu-duotone',
          required: true,
        },
        moduleName: {
          type: 'text',
          value: 'entry',
          placeholder: t('project.createProject.moduleNamePlaceholder'),
          label: t('project.createProject.moduleName'),
          labelIcon: 'i-ph-bandaids-duotone',
          required: true,
        },
        deviceType: {
          type: 'checkbox',
          label: t('project.createProject.deviceType'),
          labelIcon: 'i-ph-device-mobile-camera-duotone',
          options: [
            { value: 'phone', label: 'Phone' },
            { value: 'tablet', label: 'Tablet' },
            { value: '2in1', label: '2in1' },
          ],
          value: ['phone'],
        },
      },
      onInit: (project) => {
        // [新增] 监听 homeDirectory 加载完成，自动填充默认保存路径（immediate 确保首次即有值）
        subscriptions.add(
          watch(homeDirectory, () => {
            const projectName = project.value.input.projectName.value as string || 'MyApplication'
            applyDefaultSavePath(project as Ref<ProjectConfiguration>, projectName)
          }, { immediate: true }),
        )
        // [新增] 监听项目名称变化，自动同步更新保存路径（如 MyApplication → ~/DevEcoStudioProjects/MyApplication）
        subscriptions.add(
          watch(() => project.value.input.projectName.value as string, (projectName) => {
            if (!projectName) return
            applyDefaultSavePath(project as Ref<ProjectConfiguration>, projectName)
          }),
        )
        subscriptions.add(
          watch(() => project.value.input.compatibleSdkVersion.value as number, (value) => {
            if (value < 12) {
              (project.value.input.deviceType as CheckboxInput).options = [
                { value: 'phone', label: 'Phone' },
                { value: 'tablet', label: 'Tablet' },
                { value: '2in1', label: '2in1' },
              ]
              if ((project.value.input.deviceType as CheckboxInput).value?.includes('car')
                || (project.value.input.deviceType as CheckboxInput).value?.includes('wearable')
                || (project.value.input.deviceType as CheckboxInput).value?.includes('tv')
              ) {
                (project.value.input.deviceType as CheckboxInput).value = (project.value.input.deviceType.value as string[]).filter(item => !['car', 'wearable', 'tv'].includes(item))
              }
            }
            else if (value < 18 && value >= 12) {
              (project.value.input.deviceType as CheckboxInput).options = [
                { value: 'phone', label: 'Phone' },
                { value: 'tablet', label: 'Tablet' },
                { value: '2in1', label: '2in1' },
                { value: 'car', label: 'Car' },
                { value: 'wearable', label: 'Wearable' },
              ]
              if ((project.value.input.deviceType as CheckboxInput).value?.includes('tv')) {
                (project.value.input.deviceType as CheckboxInput).value = (project.value.input.deviceType.value as string[]).filter(item => item !== 'tv')
              }
            }
            else {
              (project.value.input.deviceType as CheckboxInput).options = [
                { value: 'phone', label: 'Phone' },
                { value: 'tablet', label: 'Tablet' },
                { value: '2in1', label: '2in1' },
                { value: 'car', label: 'Car' },
                { value: 'wearable', label: 'Wearable' },
                { value: 'tv', label: 'TV' },
              ]
            }
          }, { immediate: true }),
        )
      },
      onDestroy: () => {
        subscriptions.forEach(subscription => subscription())
        subscriptions.clear()
      },
      onSubmit: async project => (
        await connection.createProject?.({
          moduleName: project.value.input.moduleName.value as string,
          projectName: project.value.input.projectName.value as string,
          bundleName: project.value.input.bundleName.value as string,
          sdkVersion: project.value.input.compatibleSdkVersion.value as number,
          deviceType: project.value.input.deviceType.value as string[],
          modelVersion: Array.from(modelVersionToSdkVersionMap.entries()).find(([_, sdkVersion]) => sdkVersion === project.value.input.compatibleSdkVersion.value as number)?.[0] as string,
        }, 'empty-ability', project.value.input.savePath.value as string)
      ),
    },
  ])

  const currentProjectId = ref<string>(projectConfigurations.value[0]?.id ?? 'empty-ability')
  const currentProject = ref<ProjectConfiguration | undefined>(
    projectConfigurations.value.find(item => item.id === currentProjectId.value) ?? projectConfigurations.value[0],
  )
  watch(currentProjectId, () => {
    currentProject.value?.onDestroy?.(currentProject as Ref<ProjectConfiguration>)
    currentProject.value = projectConfigurations.value.find(item => item.id === currentProjectId.value) ?? projectConfigurations.value[0]
    currentProject.value?.onInit?.(currentProject as Ref<ProjectConfiguration>)
  }, { immediate: true })

  return {
    projectConfigurations,
    currentProjectId,
    currentProject,
  }
}
