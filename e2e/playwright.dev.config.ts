// Same suite against the Vite dev server, so React's development warnings count as failures.
import { makeConfig } from './playwright.config'

export default makeConfig(true)
