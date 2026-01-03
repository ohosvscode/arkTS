<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'
import { NConfigProvider } from 'naive-ui'
import { provide } from 'vue'

provide('vscode', window.vscode)
provide('connection', window.connection)
const locale = inject<any | undefined>('naiveui:locale')

const themeOverrides: GlobalThemeOverrides = {
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
  },
  Tag: {
    border: '1px solid var(--vscode-button-background)',
  },
  Button: {
    border: 'var(--vscode-input-border)',
    colorPrimary: 'var(--vscode-button-background)',
    colorPrimaryHover: 'var(--vscode-button-hoverBackground)',
    colorPressedPrimary: 'var(--vscode-button-hoverBackground)',
    colorFocusPrimary: 'var(--vscode-button-hoverBackground)',
    colorHover: 'var(--vscode-button-hoverBackground)',
    borderPrimary: 'var(--vscode-input-border)',
  },
  Checkbox: {
    colorChecked: 'var(--vscode-checkbox-background)',
    color: 'var(--vscode-input-background)',
    borderChecked: 'var(--vscode-checkbox-background)',
    border: 'var(--vscode-input-background)',
    boxShadowFocus: '0 0 0 1px var(--vscode-focusBorder)',
  },
  Input: {
    color: 'var(--vscode-input-background)',
    border: 'var(--vscode-input-border)',
    textColor: 'var(--vscode-input-foreground)',
    borderFocus: 'var(--vscode-inputOption-activeBorder)',
    boxShadowFocus: '0 0 0 1px var(--vscode-focusBorder)',
    colorFocus: 'var(--vscode-input-border)',
    colorFocusError: 'none',
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
}
</script>

<template>
  <NConfigProvider :theme-overrides inline-theme-disabled :locale>
    <RouterView />
  </NConfigProvider>
</template>
