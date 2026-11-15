import { nextTick, onBeforeUnmount, watch } from 'vue'

export function useModalFocus(open, container) {
  let previousFocus
  let previousOverflow
  const keydown = (event) => {
    if (!open.value || !container.value) return
    if (event.key === 'Escape') {
      event.preventDefault()
      open.value = false
      return
    }
    if (event.key !== 'Tab') return
    const items = [...container.value.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
      .filter((element) => element.getClientRects().length)
    const first = items[0]
    const last = items.at(-1)
    if (!first) return
    if (!container.value.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    }
  }
  const release = () => {
    document.removeEventListener('keydown', keydown)
    if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow
    previousFocus?.focus()
    previousOverflow = undefined
  }
  watch(open, async (value) => {
    if (!value) { release(); return }
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', keydown)
    await nextTick()
    container.value?.querySelector('button, a[href]')?.focus()
  })
  onBeforeUnmount(release)
}
