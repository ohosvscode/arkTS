import type { Ref } from 'vue'
import { nextTick, onMounted, onUnmounted, ref, shallowReadonly, shallowRef } from 'vue'

/**
 * Canvas 上以「整图可见、等比例」方式展示位图，并支持平移与滚轮缩放。
 *
 * ## 坐标约定
 * - 所有绘制与 `panOffset` 均使用 **CSS 布局像素**（与 `clientWidth` / `getBoundingClientRect()` 一致）。
 * - `canvas.width` / `height` 为 **设备像素**（× `devicePixelRatio`），通过 `setTransform(dpr, …)` 把 2D 上下文映射回 CSS 像素，便于与 DOM 事件坐标对齐。
 *
 * ## 为何要在尺寸变化时重设 backing store
 * 仅改变 CSS 宽高而不更新 `canvas` 内部分辨率时，浏览器会拉伸已有位图；若拉伸比例与画布宽高比不一致，画面会「压扁」。因此 `ResizeObserver` 与每次重绘前都会调用 `alignCanvasResolutionToDisplay`。
 *
 * ## 并发加载
 * 快速连续调用 `loadRasterImageFromDataUrl` 时，旧请求的 `onload` 可能晚到；用单调递增的 `layoutRefreshEpoch` 丢弃过期回调。
 */
export interface UseCanvasContainImageViewOptions {
  /** 用户缩放倍数下限（相对 contain 基准）。 */
  zoomMultiplierMinimum?: number
  /** 用户缩放倍数上限（相对 contain 基准）。 */
  zoomMultiplierMaximum?: number
  /** 滚轮缩放底数；越大于 1，同样 `deltaY` 下缩放变化越大。 */
  wheelZoomStepBase?: number
}

/** `alignCanvasResolutionToDisplay` 的返回值：已按 DPR 对齐的上下文与逻辑尺寸。 */
export interface PreparedCanvas2dContext {
  renderingContext: CanvasRenderingContext2D
  cssCanvasWidth: number
  cssCanvasHeight: number
}

/** 默认缩放倍数最小值 */
const DEFAULT_ZOOM_MULTIPLIER_MINIMUM = 0.25
/** 默认缩放倍数最大值 */
const DEFAULT_ZOOM_MULTIPLIER_MAXIMUM = 16
/** 默认滚轮缩放步长底数 */
const DEFAULT_WHEEL_ZOOM_STEP_BASE = 1.012

/**
 * 将 canvas 内部像素尺寸设为「CSS 尺寸 × DPR」，并配置 2D 变换，使后续 API 仍按 CSS 像素理解。
 * 在 `clientWidth` / `clientHeight` 尚未就绪时返回 `undefined`（调用方可用 rAF 重试）。
 */
function alignCanvasResolutionToDisplay(canvasElement: HTMLCanvasElement): PreparedCanvas2dContext | undefined {
  const renderingContext = canvasElement.getContext('2d')
  if (!renderingContext) return undefined
  const devicePixelRatio = window.devicePixelRatio || 1
  const cssCanvasWidth = Math.round(canvasElement.clientWidth)
  const cssCanvasHeight = Math.round(canvasElement.clientHeight)
  if (cssCanvasWidth < 1 || cssCanvasHeight < 1) return undefined
  canvasElement.width = Math.round(cssCanvasWidth * devicePixelRatio)
  canvasElement.height = Math.round(cssCanvasHeight * devicePixelRatio)
  renderingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  return { renderingContext, cssCanvasWidth, cssCanvasHeight }
}

/**
 * Contain：整图落在视口内（类似 `object-fit: contain`）。
 * - `containFitScale = min(cssW/iw, cssH/ih)` 为「刚好装进画布」的基准。
 * - `userZoomMultiplier` 在该基准上再乘一层，大于 1 可放大裁切视口外区域，配合 `panOffset*` 浏览。
 * - `panOffset*` 是相对于「几何居中」原点的平移（CSS 像素）。
 */
function paintContainImageWithPanZoom(
  renderingContext: CanvasRenderingContext2D,
  cssCanvasWidth: number,
  cssCanvasHeight: number,
  rasterImage: HTMLImageElement,
  userZoomMultiplier: number,
  panOffsetX: number,
  panOffsetY: number,
): void {
  const naturalImageWidth = rasterImage.naturalWidth
  const naturalImageHeight = rasterImage.naturalHeight
  if (!naturalImageWidth || !naturalImageHeight) return
  const containFitScale = Math.min(cssCanvasWidth / naturalImageWidth, cssCanvasHeight / naturalImageHeight)
  const imageDisplayScale = containFitScale * userZoomMultiplier
  const drawnImageWidth = naturalImageWidth * imageDisplayScale
  const drawnImageHeight = naturalImageHeight * imageDisplayScale
  const drawOriginX = (cssCanvasWidth - drawnImageWidth) / 2 + panOffsetX
  const drawOriginY = (cssCanvasHeight - drawnImageHeight) / 2 + panOffsetY
  renderingContext.clearRect(0, 0, cssCanvasWidth, cssCanvasHeight)
  renderingContext.imageSmoothingEnabled = true
  renderingContext.imageSmoothingQuality = 'high'
  renderingContext.drawImage(rasterImage, drawOriginX, drawOriginY, drawnImageWidth, drawnImageHeight)
}

/** 将 `WheelEvent.deltaY` 统一换算成「像素」量级，便于指数型缩放公式稳定跨浏览器。 */
function convertWheelDeltaYToCssPixels(wheelEvent: WheelEvent, cssCanvasHeight: number): number {
  let deltaY = wheelEvent.deltaY
  if (wheelEvent.deltaMode === 1) deltaY *= 16
  else if (wheelEvent.deltaMode === 2) deltaY *= cssCanvasHeight
  return deltaY
}

export interface UseCanvasContainImageViewReturn {
  /** 当前用于绘制的位图；无图时为 `null`。 */
  displayedRasterImage: Readonly<Ref<HTMLImageElement | null>>
  /** 相对 contain 基准的缩放倍数；`1` 表示刚好 contain 进画布。 */
  userZoomMultiplier: Ref<number>
  /** 相对「居中」原点的平移（CSS 像素）。 */
  panOffsetX: Ref<number>
  panOffsetY: Ref<number>
  /** 是否正在指针拖拽平移。 */
  pointerDragActive: Ref<boolean>
  handleCanvasWheel(wheelEvent: WheelEvent): void
  handleCanvasPointerDown(pointerEvent: PointerEvent): void
  handleCanvasPointerMove(pointerEvent: PointerEvent): void
  /** 与 `pointerup` / `pointercancel` / `lostpointercapture` 共用，释放 capture 并复位拖拽状态。 */
  endCanvasPointerDrag(event: { pointerId: number }): void
  /** 从 Data URL 解码图片；成功后会重置缩放与平移。画布未挂载时直接返回。 */
  loadImage(src: string): void
}

/**
 * 在 2D Canvas 上以 contain 方式绘制位图，支持滚轮以指针为锚缩放、指针拖拽平移；
 * 在元素尺寸变化时同步 backing store，避免仅 CSS 拉伸导致变形。
 */
export function useCanvasContainImageView(
  canvasElementRef: Ref<HTMLCanvasElement | null>,
  options?: UseCanvasContainImageViewOptions,
): UseCanvasContainImageViewReturn {
  const zoomMultiplierMinimum = options?.zoomMultiplierMinimum ?? DEFAULT_ZOOM_MULTIPLIER_MINIMUM
  const zoomMultiplierMaximum = options?.zoomMultiplierMaximum ?? DEFAULT_ZOOM_MULTIPLIER_MAXIMUM
  const wheelZoomStepBase = options?.wheelZoomStepBase ?? DEFAULT_WHEEL_ZOOM_STEP_BASE

  // —— 视图状态（响应式，供模板或其它逻辑只读/绑定）——
  const displayedRasterImage = shallowRef<HTMLImageElement | null>(null)
  const userZoomMultiplier = ref(1)
  const panOffsetX = ref(0)
  const panOffsetY = ref(0)
  const pointerDragActive = ref(false)

  // —— 拖拽会话（非响应式，避免每帧触发依赖收集）——
  let activeDragPointerId = -1
  let dragStartViewportClientX = 0
  let dragStartViewportClientY = 0
  let dragStartPanOffsetX = 0
  let dragStartPanOffsetY = 0

  // —— 生命周期与并发 —— //
  /** 每次发起新解码时自增；仅与当前 epoch 一致的 `onload` 会提交画面。 */
  let layoutRefreshEpoch = 0
  let canvasResizeObserver: ResizeObserver | undefined

  /** 按当前 `displayedRasterImage` 与缩放/平移状态整帧重绘（含分辨率对齐）。 */
  function repaintCurrentView(): void {
    const canvasElement = canvasElementRef.value
    const rasterImage = displayedRasterImage.value
    if (!canvasElement || !rasterImage?.complete || rasterImage.naturalWidth < 1) return
    const preparedContext = alignCanvasResolutionToDisplay(canvasElement)
    if (!preparedContext) return
    paintContainImageWithPanZoom(
      preparedContext.renderingContext,
      preparedContext.cssCanvasWidth,
      preparedContext.cssCanvasHeight,
      rasterImage,
      userZoomMultiplier.value,
      panOffsetX.value,
      panOffsetY.value,
    )
  }

  /**
   * 以指针下像素为锚缩放：先求该点在图上的归一化位置，改变 `userZoomMultiplier` 后再反解 `panOffset*`，
   * 使同一图像点仍落在指针下（与地图/看图软件常见行为一致）。
   */
  function handleCanvasWheel(wheelEvent: WheelEvent): void {
    const canvasElement = canvasElementRef.value
    const rasterImage = displayedRasterImage.value
    if (!canvasElement || !rasterImage?.complete || rasterImage.naturalWidth < 1) return

    const cssCanvasWidth = canvasElement.clientWidth
    const cssCanvasHeight = canvasElement.clientHeight
    if (cssCanvasWidth < 1 || cssCanvasHeight < 1) return

    const naturalImageWidth = rasterImage.naturalWidth
    const naturalImageHeight = rasterImage.naturalHeight
    const containFitScale = Math.min(cssCanvasWidth / naturalImageWidth, cssCanvasHeight / naturalImageHeight)
    const previousZoomMultiplier = userZoomMultiplier.value
    const displayScaleBeforeZoom = containFitScale * previousZoomMultiplier
    if (displayScaleBeforeZoom <= 0) return

    const canvasBounds = canvasElement.getBoundingClientRect()
    const pointerOffsetX = wheelEvent.clientX - canvasBounds.left
    const pointerOffsetY = wheelEvent.clientY - canvasBounds.top

    const imageDrawLeft = (cssCanvasWidth - naturalImageWidth * displayScaleBeforeZoom) / 2 + panOffsetX.value
    const imageDrawTop = (cssCanvasHeight - naturalImageHeight * displayScaleBeforeZoom) / 2 + panOffsetY.value
    const normalizedPointerInImageX = (pointerOffsetX - imageDrawLeft) / (naturalImageWidth * displayScaleBeforeZoom)
    const normalizedPointerInImageY = (pointerOffsetY - imageDrawTop) / (naturalImageHeight * displayScaleBeforeZoom)

    const wheelDeltaPixels = convertWheelDeltaYToCssPixels(wheelEvent, cssCanvasHeight)
    const zoomScaleFactor = wheelZoomStepBase ** -wheelDeltaPixels
    const nextZoomMultiplier = Math.min(
      zoomMultiplierMaximum,
      Math.max(zoomMultiplierMinimum, previousZoomMultiplier * zoomScaleFactor),
    )
    if (nextZoomMultiplier === previousZoomMultiplier) return

    const displayScaleAfterZoom = containFitScale * nextZoomMultiplier
    userZoomMultiplier.value = nextZoomMultiplier
    panOffsetX.value = pointerOffsetX
      - normalizedPointerInImageX * naturalImageWidth * displayScaleAfterZoom
      - (cssCanvasWidth - naturalImageWidth * displayScaleAfterZoom) / 2
    panOffsetY.value = pointerOffsetY
      - normalizedPointerInImageY * naturalImageHeight * displayScaleAfterZoom
      - (cssCanvasHeight - naturalImageHeight * displayScaleAfterZoom) / 2
    repaintCurrentView()
  }

  /** 主键按下开始拖拽；`setPointerCapture` 保证移出元素仍能收到 `pointermove`。 */
  function handleCanvasPointerDown(pointerEvent: PointerEvent): void {
    const canvasElement = canvasElementRef.value
    const rasterImage = displayedRasterImage.value
    if (!canvasElement || !rasterImage?.complete || rasterImage.naturalWidth < 1) return
    if (pointerEvent.button !== 0) return
    pointerEvent.preventDefault()
    activeDragPointerId = pointerEvent.pointerId
    dragStartViewportClientX = pointerEvent.clientX
    dragStartViewportClientY = pointerEvent.clientY
    dragStartPanOffsetX = panOffsetX.value
    dragStartPanOffsetY = panOffsetY.value
    pointerDragActive.value = true
    canvasElement.setPointerCapture(pointerEvent.pointerId)
  }

  function handleCanvasPointerMove(pointerEvent: PointerEvent): void {
    if (!pointerDragActive.value || pointerEvent.pointerId !== activeDragPointerId) return
    pointerEvent.preventDefault()
    panOffsetX.value = dragStartPanOffsetX + (pointerEvent.clientX - dragStartViewportClientX)
    panOffsetY.value = dragStartPanOffsetY + (pointerEvent.clientY - dragStartViewportClientY)
    repaintCurrentView()
  }

  function endCanvasPointerDrag(event: { pointerId: number }): void {
    if (event.pointerId !== activeDragPointerId) return
    const canvasElement = canvasElementRef.value
    if (canvasElement?.hasPointerCapture(event.pointerId)) canvasElement.releasePointerCapture(event.pointerId)
    activeDragPointerId = -1
    pointerDragActive.value = false
  }

  /**
   * 异步解码；首帧若 `clientWidth`/`clientHeight` 为 0，用 rAF 轮询直至可测量（例如 webview 尚未完成布局）。
   * 新图会重置缩放与平移，避免沿用上一张图的视图。
   */
  function loadImage(src: string): void {
    if (!canvasElementRef.value) return
    const epoch = ++layoutRefreshEpoch
    const image = new Image()
    image.onload = () => {
      if (epoch !== layoutRefreshEpoch) return
      displayedRasterImage.value = image
      userZoomMultiplier.value = 1
      panOffsetX.value = 0
      panOffsetY.value = 0
      const scheduleDrawWhenCanvasHasSize = (): void => {
        const canvasElement = canvasElementRef.value
        if (!canvasElement || epoch !== layoutRefreshEpoch) return
        const preparedContext = alignCanvasResolutionToDisplay(canvasElement)
        if (!preparedContext) {
          requestAnimationFrame(scheduleDrawWhenCanvasHasSize)
          return
        }
        paintContainImageWithPanZoom(
          preparedContext.renderingContext,
          preparedContext.cssCanvasWidth,
          preparedContext.cssCanvasHeight,
          image,
          userZoomMultiplier.value,
          panOffsetX.value,
          panOffsetY.value,
        )
      }
      scheduleDrawWhenCanvasHasSize()
    }
    image.src = src
  }

  onMounted(() => {
    nextTick(() => {
      const canvasElement = canvasElementRef.value
      if (!canvasElement) return
      canvasResizeObserver = new ResizeObserver(() => {
        repaintCurrentView()
      })
      canvasResizeObserver.observe(canvasElement)
    })
  })

  onUnmounted(() => {
    canvasResizeObserver?.disconnect()
    canvasResizeObserver = undefined
    const canvasElement = canvasElementRef.value
    if (canvasElement && activeDragPointerId >= 0 && canvasElement.hasPointerCapture(activeDragPointerId)) canvasElement.releasePointerCapture(activeDragPointerId)
    activeDragPointerId = -1
    pointerDragActive.value = false
  })

  return {
    displayedRasterImage: shallowReadonly(displayedRasterImage),
    userZoomMultiplier,
    panOffsetX,
    panOffsetY,
    pointerDragActive,
    handleCanvasWheel,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    endCanvasPointerDrag,
    loadImage,
  }
}
