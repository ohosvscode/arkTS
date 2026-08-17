/**
 * True when an SDK download failed because the user cancelled it.
 *
 * `@arkts/sdk-downloader` only treats `AbortError` as cancel. After the HTTP
 * response starts, abort is wrapped as `DownloadError` (`DOWNLOAD_FAILED` /
 * "Download failed: aborted"), which previously surfaced as a raw error toast.
 */
export function isDownloadCancellation(
  error: unknown,
  token?: { isCancellationRequested: boolean },
): boolean {
  if (token?.isCancellationRequested)
    return true
  return isAbortLikeError(error)
}

function isAbortLikeError(error: unknown, seen = new Set<unknown>()): boolean {
  if (error == null)
    return false
  if (typeof error === 'string')
    return isAbortText(error)
  if (typeof error !== 'object')
    return false
  if (seen.has(error))
    return false
  seen.add(error)

  const name = 'name' in error ? String(error.name) : ''
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''

  if (name === 'AbortError' || name === 'CanceledError')
    return true
  if (code === 'ABORT_ERR' || code === 'ERR_CANCELED' || code === 'ECANCELED')
    return true
  if (isAbortText(message))
    return true
  if ('cause' in error && error.cause != null)
    return isAbortLikeError(error.cause, seen)
  return false
}

function isAbortText(text: string): boolean {
  return /\b(abort(?:ed)?|cancel(?:led|ed)?)\b/i.test(text)
}

export function formatDownloadErrorDetail(error: unknown, unknownLabel: string): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error && error.code != null ? String(error.code) : ''
    const message = 'message' in error && error.message ? String(error.message) : ''
    const detail = [code, message].filter(Boolean).join(' ')
    if (detail)
      return detail
  }
  if (typeof error === 'string' && error.trim())
    return error
  return unknownLabel
}
