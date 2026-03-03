import type { EmulatorFile } from '@arkts/image-manager'

export function getIconByDeviceType(deviceType: EmulatorFile.DeviceTypeWithString): string {
  switch (deviceType) {
    case 'phone':
      return 'i-ph-device-mobile-camera-duotone'
    case 'tablet':
      return 'i-ph-device-tablet-camera-duotone'
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
    case 'triplefold':
      return 'i-ph-device-tablet-speaker-duotone'
    default:
      return 'i-ph-question-duotone'
  }
}
