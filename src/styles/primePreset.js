import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

export default definePreset(Aura, {
  semantic: {
    primary: { 50: '#edf1f7', 100: '#e6e8ee', 200: '#cbd3df', 300: '#b9c3d3', 400: '#6b86ab',
      500: '#34496b', 600: '#15243b', 700: '#1e3150', 800: '#15243b', 900: '#15243b', 950: '#15243b' },
    colorScheme: { light: { primary: { color: '#15243b', inverseColor: '#ffffff', hoverColor: '#1e3150', activeColor: '#15243b' } } },
  },
})
