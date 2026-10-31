import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

type SpecSection = {
  directory: string
  en: string
  collapsed?: boolean
}

const specSections: SpecSection[] = [
  { directory: '01-product', en: 'Product' },
  { directory: '02-architecture', en: 'Architecture' },
  { directory: '03-runtime', en: 'Runtime', collapsed: true },
  { directory: '04-ux', en: 'Experience', collapsed: true },
  { directory: '05-security', en: 'Security', collapsed: true },
  { directory: '06-delivery', en: 'Delivery', collapsed: true },
  { directory: '07-plugins', en: 'Plugins', collapsed: true },
  { directory: '08-meta', en: 'Decisions & metadata', collapsed: true },
]

const preferredRootFiles = ['README.md', '00-baseline.md', 'NAV.md']

function titleFromMarkdown(filePath: string): string {
  const source = fs.readFileSync(filePath, 'utf8')
  const frontmatterTitle = source.match(/^---[\s\S]*?^title:\s*(.+?)\s*$[\s\S]*?^---/m)?.[1]
  if (frontmatterTitle) return frontmatterTitle.replace(/^['"]|['"]$/g, '')
  return source.match(/^#\s+(.+)$/m)?.[1]?.replace(/`/g, '') ?? path.basename(filePath, '.md')
}

function specItems(directory: string): DefaultTheme.SidebarItem[] {
  const sourceDirectory = path.join(docsRoot, 'spec', directory)
  const routePrefix = '/spec'
  if (!fs.existsSync(sourceDirectory)) return []
  return fs.readdirSync(sourceDirectory)
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => {
      if (left === 'README.md') return -1
      if (right === 'README.md') return 1
      return left.localeCompare(right, 'en')
    })
    .map((file) => ({
      text: titleFromMarkdown(path.join(sourceDirectory, file)),
      link: `${routePrefix}/${directory}/${file.slice(0, -3)}`,
    }))
}

function adrItems(): DefaultTheme.SidebarItem[] {
  const directory = path.join(docsRoot, 'adr')
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((file) => ({
      text: titleFromMarkdown(path.join(directory, file)),
      link: `/adr/${file.slice(0, -3)}`,
    }))
}

function projectItems(): DefaultTheme.SidebarItem[] {
  const directory = path.join(docsRoot, 'project')
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => {
      if (left === 'README.md') return -1
      if (right === 'README.md') return 1
      return left.localeCompare(right, 'en')
    })
    .map((file) => ({
      text: titleFromMarkdown(path.join(directory, file)),
      link: `/project/${file.slice(0, -3)}`,
    }))
}

function specSidebar(): DefaultTheme.SidebarItem[] {
  const localizedRoot = path.join(docsRoot, 'spec')
  const routePrefix = '/spec'
  const rootFiles = fs.readdirSync(localizedRoot)
    .filter((file) => file.endsWith('.md'))
  const startItems = preferredRootFiles
    .filter((file) => fs.existsSync(path.join(localizedRoot, file)))
    .map((file) => ({
      text: titleFromMarkdown(path.join(localizedRoot, file)),
      link: `${routePrefix}/${file.slice(0, -3)}`,
    }))
  const referenceItems = rootFiles
    .filter((file) => !preferredRootFiles.includes(file))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((file) => ({
      text: titleFromMarkdown(path.join(localizedRoot, file)),
      link: `${routePrefix}/${file.slice(0, -3)}`,
    }))

  return [
    { text: 'Start here', items: startItems },
    ...specSections.map((section) => ({
      text: section.en,
      collapsed: section.collapsed,
      items: specItems(section.directory),
    })),
    ...(referenceItems.length ? [{
      text: 'Compatibility references',
      collapsed: true,
      items: referenceItems,
    }] : []),
  ]
}

const enSidebar: DefaultTheme.Sidebar = {
  '/guide/': [{ text: 'Guide', items: [{ text: 'Start here', link: '/guide/' }, { text: 'Screens', link: '/guide/screenshots' }, { text: 'MCP market', link: '/guide/mcp-market' }] }],
  '/plugin-development': [{ text: 'Plugin authoring', items: [{ text: 'Zero to one', link: '/plugin-development' }, ...specItems('07-plugins')] }],
  '/project/': [{ text: 'Project records', items: projectItems() }],
  '/spec/': specSidebar(),
  '/adr/': [
    {
      text: 'Architecture decisions',
      items: [
        { text: 'ADR index', link: '/adr/README' },
        { text: 'Documentation site', link: '/adr/0079-vitepress-documentation-site' },
        { text: 'Latest decisions', link: '/spec/08-meta/decisions-log' },
      ],
    },
    { text: 'All decisions', collapsed: true, items: adrItems() },
  ],
}

const enNav: DefaultTheme.NavItem[] = [
  { text: 'Guide', link: '/guide/' },
  { text: 'Specs', link: '/spec/README' },
  { text: 'ADRs', link: '/adr/README' },
  { text: 'Plugin guide', link: '/plugin-development' },
  { text: 'Privacy policy', link: '/privacy-policy' },
  { text: 'GitHub', link: 'https://github.com/vastsa/PI-Desktop' },
]

export default defineConfig({
  title: 'PI-Desktop',
  description: 'A modular desktop workspace for AI agents',
  // Product shell is dark-base; lock docs to the same charcoal system.
  appearance: 'force-dark',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#0d0d0d' }],
    ['meta', { name: 'color-scheme', content: 'dark light' }],
  ],
  locales: {
    root: { label: 'English', lang: 'en' },
  },
  markdown: {
    html: false,
    lineNumbers: true,
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  themeConfig: {
    logo: '/app-icon.png',
    siteTitle: 'PI-Desktop',
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/vastsa/PI-Desktop' }],
    editLink: { pattern: 'https://github.com/vastsa/PI-Desktop/edit/main/docs/:path', text: 'Edit this page on GitHub' },
    outline: { level: 'deep', label: 'On this page' },
    docFooter: { prev: 'Previous', next: 'Next' },
    footer: { message: 'Local-first · Model-agnostic · Plugin-powered. <a href="https://aiuo.net" target="_blank" rel="noreferrer">AIUO.NET</a>', copyright: 'Copyright © 2026 PI-Desktop contributors' },
    nav: enNav,
    sidebar: enSidebar,
  },
})
