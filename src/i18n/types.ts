export type Lang = 'en' | 'ar'

export type Localized<T = string> = { en: T; ar: T }
