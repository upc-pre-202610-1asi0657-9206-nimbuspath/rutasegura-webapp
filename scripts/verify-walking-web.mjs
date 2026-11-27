import fs from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

const fixture = JSON.parse(await fs.readFile(process.argv[2], 'utf8'))
const origin = process.env.RUTASEGURA_TEST_WEB || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: 'chrome' })
const results = []
await fs.mkdir('artifacts/walking', { recursive: true })
try {
  for (const role of ['parent', 'administrator']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${origin}/login`)
    await page.getByLabel('Correo electrónico', { exact: true }).fill(fixture[role].email)
    await page.getByLabel('Contraseña', { exact: true }).fill(role === 'parent' ? fixture.parent.password : process.env.RUTASEGURA_TEST_ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Ingresar a RutaSegura', exact: true }).click()
    await page.waitForURL(role === 'parent' ? '**/parent' : '**/admin/routes', { timeout: 30000 })
    if (role === 'parent') {
      await page.goto(`${origin}/parent/students`)
      for (const student of fixture.students) await expect(page.getByText(student.fullName, { exact: true }).first()).toBeVisible()
      await page.screenshot({ path: 'artifacts/walking/parent-four-students.png', fullPage: true })
    }
    await page.goto(`${origin}/${role === 'parent' ? 'parent' : 'admin'}/notifications`)
    await expect(page.getByRole('heading', { name: 'Notificaciones', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Activar notificaciones', exact: true })).toBeEnabled()
    expect(errors).toEqual([])
    results.push({ role, login: true, inbox: true, fourStudents: role === 'parent' ? true : undefined })
    await context.close()
  }
} finally { await browser.close() }
await fs.writeFile('artifacts/walking/web-acceptance.json', JSON.stringify({ checkedAt: new Date().toISOString(), origin, results }, null, 2))
console.log(JSON.stringify(results))
