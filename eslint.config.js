import naily from 'naily-eslint-config'

export default naily({
  type: 'lib',
  freedom: true,
  pnpm: true,
  ignores: originals => [...originals, 'arkts-ohos-typescript/**/*'],
})
