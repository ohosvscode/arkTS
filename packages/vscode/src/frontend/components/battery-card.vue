<script setup lang="ts">
import type { HdcManagerConnectionProtocol } from '../interfaces/hdc-connection-protocol'

const { deviceInfo, deviceInfoLoading } = defineProps<{
  deviceInfo?: HdcManagerConnectionProtocol.ServerFunction.GetDeviceInfo.Response
  deviceInfoLoading: boolean
}>()

const batteryIcon = computed(() => {
  const batteryIcons = [
    'i-ph-battery-vertical-empty-duotone',
    'i-ph-battery-vertical-low-duotone',
    'i-ph-battery-vertical-medium-duotone',
    'i-ph-battery-vertical-high-duotone',
    'i-ph-battery-vertical-full-duotone',
  ]
  const capacity = deviceInfo?.batteryCapacity ?? 0
  return batteryIcons[Math.min(Math.max(Math.floor(capacity / 20), 0), batteryIcons.length - 1)]
})
/** 剩余充电时间：原始值为毫秒，除以 1000 得到秒，再除以 60 得到分钟 */
const batteryRemainingChargeTime = computed(() => {
  const minutes = (deviceInfo?.batteryRemainingChargeTime ?? 0) / 1000 / 60 || 0
  if (minutes >= 1440) return `${(minutes / 1440).toFixed(1)}d`
  else if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`
  else return `${minutes.toFixed(1)}min`
})
/** 电压：原始值为微伏(µV)，除以 1e6 得到伏特(V) */
const batteryVoltage = computed(() => Number(((deviceInfo?.batteryVoltage ?? 0) / 1_000_000).toFixed(2)))
/** 电流：原始值为毫安(mA)，除以 1000 得到安培(A)，正值放电、负值充电 */
const batteryNowCurrentA = computed(() => Number(((deviceInfo?.batteryNowCurrent ?? 0) / 1000).toFixed(2)))
/** 功率：电压 * 电流 */
const batteryPowerW = computed(() => Number((batteryVoltage.value * batteryNowCurrentA.value).toFixed(2)))
</script>

<template>
  <NSpin :show="deviceInfoLoading">
    <NCard size="small">
      <div flex="~ gap-1">
        <NStatistic w-full label="电量" tabular-nums>
          <NumberAnimationEffect :precision="0" :to="deviceInfo?.batteryCapacity ?? 0" />
          <template #prefix>
            <span inline-flex relative top-0.5 :class="batteryIcon" />
            <span v-if="deviceInfo?.batteryStatus === 1" inline-flex relative top-0.5 font-size-5 i-ph-lightning-duotone />
          </template>
          <template #suffix>%</template>
        </NStatistic>
        <NStatistic w-full label="功率" tabular-nums>
          <NumberAnimationEffect :to="batteryPowerW" />
          <template #suffix>W</template>
        </NStatistic>
        <NStatistic w-full label="电压" tabular-nums>
          <NumberAnimationEffect :to="batteryVoltage" />
          <template #suffix>V</template>
        </NStatistic>
        <NStatistic w-full label="电流" tabular-nums>
          <NumberAnimationEffect :to="batteryNowCurrentA" />
          <template #suffix>A</template>
        </NStatistic>
        <NStatistic w-full label="电池温度" tabular-nums>
          <NumberAnimationEffect :precision="0" :to="(deviceInfo?.batteryTemperature ?? 0) / 10" />
          <template #suffix>℃</template>
        </NStatistic>
      </div>
      <div w-full font-size-2.2 flex="~ gap-1">
        <div flex="~ gap-1 items-baseline">
          <div>剩余电量</div>
          <div>{{ deviceInfo?.batteryRemainingEnergy ?? 0 }}mAh</div>
        </div>
        <div flex="~ gap-1 items-baseline">
          <div>剩余充电时间</div>
          <div>{{ batteryRemainingChargeTime }}</div>
        </div>
        <div flex="~ gap-1 items-baseline">
          <div>电池类型</div>
          <div>{{ deviceInfo?.batteryTechnology ?? '' }}</div>
        </div>
      </div>
    </NCard>
  </NSpin>
</template>
