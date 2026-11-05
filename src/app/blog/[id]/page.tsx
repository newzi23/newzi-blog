import type { Metadata } from 'next'
import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'
import { absoluteUrl, getSiteUrl } from '@/lib/site-url'
import BlogClient from './blog-client'

/**
 * 文章详情页拆成「服务端壳 + 客户端组件」两层。
 *
 * 原因：页面内容需要在浏览器里渲染（运行时 fetch markdown + 动态加载 shiki），原本整个
 * page.tsx 是 'use client'，而客户端组件**不能导出 metadata** —— 结果每篇文章分享出去
 * 都只有站点级的标题/描述，看不到文章标题和封面。
 *
 * 现在由这一层（服务端）用构建期导入的索引生成每篇独立的 title / description / og:image，
 * 渲染仍交给原来的客户端组件，行为完全不变。
 */
const posts = blogIndex as BlogIndexItem[]

function findPost(slug: string): BlogIndexItem | undefined {
	const decoded = decodeURIComponent(slug)
	return posts.find(p => p.slug === decoded)
}

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { id } = await params
	const post = findPost(id)

	if (!post) {
		return { title: '文章不存在' }
	}

	const url = `${getSiteUrl()}/blog/${post.slug}`
	const image = absoluteUrl(post.cover) || absoluteUrl('/og-default.png')
	const description = post.summary || post.title

	return {
		title: post.title,
		description,
		alternates: { canonical: url },
		openGraph: {
			type: 'article',
			title: post.title,
			description,
			url,
			images: image ? [{ url: image, width: 1200, height: 630, alt: post.title }] : undefined,
			tags: post.tags
		},
		twitter: {
			card: 'summary_large_image',
			title: post.title,
			description,
			images: image ? [image] : undefined
		}
	}
}

export default function Page() {
	return <BlogClient />
}
