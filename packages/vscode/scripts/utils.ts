import child_process from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

export function $(command: TemplateStringsArray) {
  return new Promise<void>((resolve, reject) => {
    const pack_process = child_process.exec(command.join(' '), { cwd: path.resolve(__dirname, '..'), env: { FORCE_COLOR: '1', ...process.env } })
    pack_process.stdout?.pipe(process.stdout)
    pack_process.stderr?.pipe(process.stderr)
    pack_process.on('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with code ${code} and signal ${signal}. Please check the output for more details.`))
    })
  })
}
