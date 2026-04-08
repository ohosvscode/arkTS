<script setup lang="tsx">
import type { SnapshotPreviewerProtocol } from '../../interfaces/snapshot-previewer-protocol'

const { onLayoutRefresh } = useSnapshotPreviewerConnection()

const captureData = ref<SnapshotPreviewerProtocol.ClientFunction.OnLayoutRefresh.Event>()
onLayoutRefresh(event => captureData.value = event)
</script>

<template>
  <div
    class="fixed top-0 left-0 size-full overflow-hidden
    border-t border-t-solid border-t-[var(--vscode-tree-inactiveIndentGuidesStroke)]
    border-l border-l-solid border-l-[var(--vscode-tree-inactiveIndentGuidesStroke)]"
  >
    <NSplit :default-size="0.7">
      <template #1>
        <SnapshotCanvas class="bg-[var(--vscode-editorWidget-background)]" :capture-data="captureData" />
      </template>
      <template #2>
        Hello
      </template>
    </NSplit>
  </div>
</template>
