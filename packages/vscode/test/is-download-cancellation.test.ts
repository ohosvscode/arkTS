import { describe, expect, it } from 'vite-plus/test'
import { formatDownloadErrorDetail, isDownloadCancellation } from '../src/sdk/is-download-cancellation'

describe('isDownloadCancellation', () => {
  it('treats a cancellation token as cancel', () => {
    expect(isDownloadCancellation(new Error('network down'), { isCancellationRequested: true })).toBe(true)
  })

  it('treats AbortError and CanceledError as cancel', () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    expect(isDownloadCancellation(abortError)).toBe(true)

    const canceledError = new Error('canceled')
    canceledError.name = 'CanceledError'
    expect(isDownloadCancellation(canceledError)).toBe(true)
  })

  it('treats abort error codes as cancel', () => {
    expect(isDownloadCancellation(Object.assign(new Error('aborted'), { code: 'ABORT_ERR' }))).toBe(true)
    expect(isDownloadCancellation(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }))).toBe(true)
  })

  it('treats DownloadError wrapping an abort as cancel', () => {
    const cause = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    const downloadError = Object.assign(new Error('Download failed: aborted'), {
      name: 'DownloadError',
      code: 'DOWNLOAD_FAILED',
      cause,
    })
    expect(isDownloadCancellation(downloadError)).toBe(true)
  })

  it('does not treat a real download failure as cancel', () => {
    const downloadError = Object.assign(new Error('Download failed: socket hang up'), {
      name: 'DownloadError',
      code: 'DOWNLOAD_FAILED',
    })
    expect(isDownloadCancellation(downloadError)).toBe(false)
    expect(isDownloadCancellation(new Error('SHA256 checksum mismatch'))).toBe(false)
    expect(isDownloadCancellation(undefined)).toBe(false)
  })
})

describe('formatDownloadErrorDetail', () => {
  it('joins code and message when present', () => {
    expect(formatDownloadErrorDetail(
      Object.assign(new Error('Download failed: 404'), { code: 'DOWNLOAD_FAILED' }),
      'unknown',
    )).toBe('DOWNLOAD_FAILED Download failed: 404')
  })

  it('falls back to the unknown label', () => {
    expect(formatDownloadErrorDetail(null, 'unknown')).toBe('unknown')
  })
})
