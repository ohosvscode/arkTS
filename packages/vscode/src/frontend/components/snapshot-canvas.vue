<script setup lang="tsx">
import type { SnapshotPreviewerProtocol } from '../interfaces/snapshot-previewer-protocol'

const props = defineProps<{
  captureData: SnapshotPreviewerProtocol.ClientFunction.OnLayoutRefresh.Event | undefined
}>()

const canvasRef = useTemplateRef('canvasRef')
const { endCanvasPointerDrag, handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasWheel, loadImage } = useCanvasContainImageView(canvasRef)
watch(() => props.captureData, () => props.captureData && loadImage(`data:image/jpeg;base64,${props.captureData.imageBase64}`))
</script>

<template>
  <canvas
    ref="canvasRef"
    class="size-full"
    @wheel.prevent="handleCanvasWheel"
    @pointerdown="handleCanvasPointerDown"
    @pointermove="handleCanvasPointerMove"
    @pointerup="endCanvasPointerDrag"
    @pointercancel="endCanvasPointerDrag"
    @lostpointercapture="endCanvasPointerDrag"
  />
</template>
