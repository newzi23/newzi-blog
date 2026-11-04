import { MetadataRoute } from 'next'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// 域名优先级：
	// 1. SITE_URL / NEXT_PUBLIC_SITE_URL —— 想手动指定时用
	// 2. Vercel 生产环境 —— 直接用正式域名，所以正式站不需要设任何环境变量
	// 3. 预览/本地 —— 用 VERCEL_URL / localhost
	const baseUrl =
		process.env.SITE_URL ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		(process.env.VERCEL_ENV === 'production'
			? 'https://murin.dpdns.org'
			: process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: 'http://localhost:3000')

	console.log(`[Sitemap] Generating for: ${baseUrl}`)

	let posts: BlogIndexItem[] = blogIndex

	const postEntries: MetadataRoute.Sitemap = posts.map(post => ({
		url: `${baseUrl}/blog/${post.slug}`,
		lastModified: post.date ? new Date(post.date) : new Date(),
		changeFrequency: 'weekly',
		priority: 0.8
	}))

	const staticEntries: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: 'daily',
			priority: 1
		}
	]

	return [...staticEntries, ...postEntries]
}
