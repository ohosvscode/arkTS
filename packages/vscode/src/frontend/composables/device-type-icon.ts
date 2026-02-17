import type { DeviceType } from '@arkts/image-manager'

export function getIconByDeviceType(deviceType: DeviceType | '2in1_foldable' | string & {}): string {
  switch (deviceType) {
    case 'phone':
      return 'i-ph-device-mobile-camera-duotone'
    case 'tablet':
      return 'i-ph-device-tablet-camera-duotone'
    case 'pc':
      return 'i-ph-devices-duotone'
    case 'wearable':
      return 'i-ph-watch-duotone'
    case 'tv':
      return 'i-ph-television-duotone'
    case 'foldable':
      return 'i-ph-device-tablet-duotone'
    case 'widefold':
      return 'i-ph-device-tablet-speaker-duotone'
    case '2in1':
      return 'i-ph-laptop-duotone'
    case '2in1_foldable':
      return 'i-ph-laptop-duotone'
    default:
      return 'i-ph-question-duotone'
  }
}
