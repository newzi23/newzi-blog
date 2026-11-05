/**
 * 站点对外地址（用于 sitemap / RSS / Open Graph 里的绝对 URL）。
 *
 * 优先级：
 *   1. SITE_URL / NEXT_PUBLIC_SITE_URL —— 想手动指定时用
 *   2. Vercel 生产环境 —— 直接用正式域名，所以正式站不需要设任何环境变量
 *   3. 预览部署 —— 用 VERCEL_URL
 *   4. 本地开发 —— localhost
 *
 * 注意：这是构建期/服务端读取的，不要在客户端组件里调用（客户端拿不到这些变量）。
 */
export function getSiteUrl(): string {
	return (
		process.env.SITE_URL ||
		process.env.NEXT_PUBLIC_SITE_URL ||
		(process.env.VERCEL_ENV === 'production'
			? 'https://murin.dpdns.org'
			: process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: 'http://localhost:3000')
	)
}

/** 把 /blogs/xxx/cover.webp 这类站内路径拼成绝对地址；已经是 http(s) 的原样返回 */
export function absoluteUrl(pathOrUrl?: string): string | undefined {
	if (!pathOrUrl) return undefined
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
	return `${getSiteUrl()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}
