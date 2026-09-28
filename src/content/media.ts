/**
 * Photography slots.
 *
 * Every slot is empty until Lush supplies photographs, and the site shows an illustrated plate instead.
 * To add a photo: put an optimised file in /public/images (WebP or AVIF, about 1600px on the long edge),
 * then fill in the slot. Width and height must be the file's real pixel size so the layout can reserve space.
 */
import type { Localized } from '../i18n/types'

export interface Photo {
  src: string
  width: number
  height: number
  alt: Localized
  /** CSS object-position, for keeping the nails in frame when the image is cropped. */
  focus?: string
}

export const media: {
  heroManicure: Photo | null
  heroSpa: Photo | null
  bridal: Photo | null
} = {
  heroManicure: null,
  heroSpa: null,
  bridal: null,
}
