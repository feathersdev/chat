/// <reference types="vite/client" />

import type { TalonLogin } from 'talon-auth/login'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'talon-login': DetailedHTMLProps<HTMLAttributes<TalonLogin>, TalonLogin> & {
        'app-id'?: string
      }
    }
  }
}
