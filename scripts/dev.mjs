// Runs the API (with reload on change) and the Vite dev server together. Ctrl+C stops both.
import { spawn } from 'node:child_process'

const run = (args) => spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
const children = [run(['tsx', 'watch', 'server/index.ts']), run(['vite'])]
const stop = () => children.forEach((child) => child.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
children.forEach((child) => child.on('exit', (code) => { stop(); process.exitCode = code ?? 0 }))
