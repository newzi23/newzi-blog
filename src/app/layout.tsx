import '@/styles/globals.css'

import type { Metadata } from 'next'
import Layout from '@/layout'
import Head from '@/layout/head'
import siteContent from '@/config/site-content.json'
import { getSiteUrl } from '@/lib/site-url'

const {
	meta: { title, description },
	theme
} = siteContent

const SITE_URL = getSiteUrl()

export const metadata: Metadata = {
	// metadataBase 让页面里的相对图片地址（如 /og-default.png）解析成绝对 URL，
	// Open Graph 要求绝对地址，缺了它分享出去可能取不到图。
	metadataBase: new URL(SITE_URL),
	title: {
		default: title,
		// 文章页只写自己的标题，这里统一补上站名
		template: `%s | ${title}`
	},
	description,
	alternates: {
		canonical: '/',
		// 让阅读器与浏览器能自动发现订阅源
		types: {
			'application/rss+xml': '/rss.xml'
		}
	},
	openGraph: {
		type: 'website',
		locale: 'zh_CN',
		siteName: title,
		title,
		description,
		url: SITE_URL,
		images: [{ url: '/og-default.png', width: 1200, height: 630, alt: title }]
	},
	twitter: {
		card: 'summary_large_image',
		title,
		description,
		images: ['/og-default.png']
	}
}

const htmlStyle = {
	'--color-brand': theme.colorBrand,
	'--color-primary': theme.colorPrimary,
	'--color-secondary': theme.colorSecondary,
	'--color-brand-secondary': theme.colorBrandSecondary,
	'--color-bg': theme.colorBg,
	'--color-border': theme.colorBorder,
	'--color-card': theme.colorCard,
	'--color-article': theme.colorArticle
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang='en' suppressHydrationWarning style={htmlStyle}>
			<Head />

			<body>
				<script
					dangerouslySetInnerHTML={{
						__html: `
					if (/windows|win32/i.test(navigator.userAgent)) {
						document.documentElement.classList.add('windows');
					}
		      `
					}}
				/>

				<Layout>{children}</Layout>
			</body>
		</html>
	)
}
