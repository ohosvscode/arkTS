<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'
import { NConfigProvider } from 'naive-ui'
import { inject, provide, ref } from 'vue'
import { useConnection } from './utils/connection'

provide('vscode', typeof window !== 'undefined' ? window.vscode : undefined)
const locale = inject<any | undefined>('naiveui:locale')

/** SSR 时无 document，用固定 hex 替代 var()，避免 seemly 解析 var() 报 Invalid color value。 */
const SSR_VAR_FALLBACK = '#1e1e1e'

/** Naive UI 的 seemly 会对主题色做 rgba 等计算，只接受具体颜色，不接受 var(--xxx)。需在传入 NConfigProvider 前解析为实际颜色。 */
function resolveCssVar(value: string): string {
  if (typeof document === 'undefined') {
    const match = value.match(/var\((--[a-zA-Z0-9-]+)\)/)
    return match ? value.replace(match[0], SSR_VAR_FALLBACK) : value
  }
  const match = value.match(/var\((--[a-zA-Z0-9-]+)\)/)
  if (!match) return value
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
  return value.replace(match[0], resolved || '#000000')
}

function resolveTheme<T>(obj: T): T {
  if (typeof obj === 'string') return (obj.startsWith('var(') ? resolveCssVar(obj) : obj) as T
  if (Array.isArray(obj)) return obj.map(resolveTheme) as T
  if (obj && typeof obj === 'object') {
    const result = {} as T
    for (const key of Object.keys(obj as object))
      (result as Record<string, unknown>)[key] = resolveTheme((obj as Record<string, unknown>)[key])
    return result
  }
  return obj
}

const rawThemeOverrides: GlobalThemeOverrides = {
  common: {
    textColor1: 'var(--vscode-foreground)',
    textColor2: 'var(--vscode-foreground)',
    textColor3: 'var(--vscode-foreground)',
    textColorBase: 'var(--vscode-foreground)',
    borderColor: 'var(--vscode-input-border)',
    hoverColor: 'var(--vscode-button-hoverBackground)',
    buttonColor2Hover: 'var(--vscode-button-hoverBackground)',
    buttonColor2: 'var(--vscode-button-background)',
    buttonColor2Pressed: 'var(--vscode-button-activeBackground)',
    borderRadius: '2px',
    cardColor: 'var(--vscode-input-background)',
    tagColor: 'var(--vscode-background)',
    inputColorDisabled: 'var(--vscode-disabledForeground)',
  },
  Card: {
    borderColor: 'none',
  },
  Tabs: {
    tabColorSegment: 'var(--vscode-button-background)',
    colorSegment: 'var(--vscode-input-background)',
    colorSegmentActive: 'var(--vscode-button-hoverBackground)',
    tabColor: 'var(--vscode-input-background)',
    tabBorderColor: 'var(--vscode-button-background)',
    tabTextColorActiveBar: 'var(--vscode-button-background)',
    barColor: 'var(--vscode-button-background)',
  },
  Tag: {
    border: '1px solid var(--vscode-button-background)',
    colorBordered: 'var(--vscode-button-background)',
    closeIconColor: 'var(--vscode-badge-foreground)',
    closeIconColorHover: 'var(--vscode-badge-foreground)',
  },
  Button: {
    border: 'var(--vscode-input-border)',
    colorPrimary: 'var(--vscode-button-background)',
    colorPrimaryHover: 'var(--vscode-button-hoverBackground)',
    colorPressedPrimary: 'var(--vscode-button-hoverBackground)',
    colorFocusPrimary: 'var(--vscode-button-hoverBackground)',
    colorHover: 'var(--vscode-button-hoverBackground)',
    borderPrimary: 'var(--vscode-input-border)',
    colorError: 'var(--vscode-editorError-foreground)',
    colorErrorHover: 'var(--vscode-errorForeground)',
    colorErrorPressed: 'var(--vscode-errorForeground)',
    colorErrorFocus: 'var(--vscode-errorForeground)',
    borderError: 'var(--vscode-editorError-foreground)',
    colorInfo: 'var(--vscode-editorInfo-foreground)',
    colorInfoHover: 'var(--vscode-infoForeground)',
    colorInfoPressed: 'var(--vscode-infoForeground)',
    colorInfoFocus: 'var(--vscode-infoForeground)',
    borderInfo: 'var(--vscode-editorInfo-foreground)',
  },
  Checkbox: {
    colorChecked: 'var(--vscode-checkbox-selectBackground)',
    color: 'var(--vscode-button-background)',
    borderChecked: 'var(--vscode-checkbox-selectBorder)',
    border: 'var(--vscode-checkbox-border)',
    boxShadowFocus: '0 0 0 1px var(--vscode-focusBorder)',
  },
  Input: {
    color: 'var(--vscode-input-background)',
    border: 'var(--vscode-input-border)',
    textColor: 'var(--vscode-input-foreground)',
    borderFocus: 'var(--vscode-inputOption-activeBorder)',
    boxShadowFocus: '0 0 0 1px var(--vscode-focusBorder)',
    colorFocus: 'var(--vscode-inputOption-activeBackground)',
    colorFocusError: 'none',
    borderError: 'var(--vscode-errorForeground)',
  },
  Form: {
    feedbackTextColorError: 'var(--vscode-errorForeground)',
  },
  Select: {
    peers: {
      InternalSelectMenu: {
        color: 'var(--vscode-input-background)',
        optionCheckColor: 'var(--vscode-foreground)',
        optionColorActive: 'var(--vscode-list-activeSelectionBackground)',
        optionTextColor: 'var(--vscode-foreground)',
        optionTextColorActive: 'var(--vscode-list-activeSelectionForeground)',
        optionColorPending: 'var(--vscode-list-hoverBackground)',
        optionColorActivePending: 'var(--vscode-list-activeSelectionBackground)',
      },
      InternalSelection: {
        color: 'var(--vscode-input-background)',
        border: 'var(--vscode-input-background)',
        boxShadowFocus: '0 0 0 1px var(--vscode-focusBorder)',
        colorActive: 'var(--vscode-checkbox-background)',
        colorActiveError: 'var(--vscode-errorForeground)',
        colorActiveWarning: 'var(--vscode-warningForeground)',
        common: {
          tagColor: 'var(--vscode-button-background)',
        },
      },
    },
  },
  Collapse: {
    dividerColor: 'var(--vscode-button-background)',
  },
  Switch: {
    railColorActive: 'var(--vscode-button-background)',
  },
  Radio: {
    color: 'var(--vscode-input-background)',
  },
  DataTable: {
    thColor: 'var(--vscode-button-background)',
    thColorSorting: 'var(--vscode-button-hoverBackground)',
    thColorHover: 'var(--vscode-button-hoverBackground)',
    thTextColor: 'var(--vscode-foreground)',
    tdColor: 'var(--vscode-input-background)',
    tdTextColor: 'var(--vscode-foreground)',
    borderColor: 'var(--vscode-input-border)',
    actionDividerColor: 'var(--vscode-button-background)',
    thIconColorActive: 'var(--vscode-foreground)',
    thButtonColorHover: 'var(--vscode-button-hoverBackground)',
    peers: {
      Button: {
        colorHover: 'var(--vscode-dropdown-background)',
      },
    },
  },
  Popover: {
    color: 'var(--vscode-dropdown-background)',
    dividerColor: 'var(--vscode-dropdown-border)',
  },
  List: {
    colorHover: 'var(--vscode-button-secondaryHoverBackground)',
    borderRadius: '2px',
    borderColor: 'none',
  },
}

/** 必须在首次渲染前解析，否则 DataTable 等组件内部会因 seemly 解析 var() 报错 */
const themeOverrides = ref<GlobalThemeOverrides>(resolveTheme(rawThemeOverrides))
const { onDidChangeActiveColorTheme } = useConnection() ?? {}
onDidChangeActiveColorTheme?.(() => themeOverrides.value = resolveTheme(rawThemeOverrides))

const route = useRoute()
const { isOnline } = useNetwork()
const error = ref<Error | null>(null)
const key = ref(0)
onErrorCaptured((err) => {
  error.value = err as Error
  return !import.meta.env.SSR
})

const isThrowErrorIfNoNetwork = computed(() => {
  if (route.meta.throwErrorIfNoNetwork === true && !isOnline.value) return true
  return false
})
watch(isThrowErrorIfNoNetwork, () => key.value++)
</script>

<template>
  <Suspense>
    <NConfigProvider :theme-overrides="themeOverrides" inline-theme-disabled :locale>
      <RouterView />
    </NConfigProvider>
    <template #fallback>
      <ErrorFallback :error="error" :is-throw-error-if-no-network="isThrowErrorIfNoNetwork" />
    </template>
  </Suspense>
</template>
