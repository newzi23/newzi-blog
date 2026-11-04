export const INIT_DELAY = 0.3
export const ANIMATION_DELAY = 0.1
export const CARD_SPACING = 36
export const CARD_SPACING_SM = 24
export const BLOG_SLUG_KEY = process.env.BLOG_SLUG_KEY || ''

/**
 * 点赞服务地址（可选）。留空则整个点赞按钮不渲染。
 * 上游默认硬编码了作者自己的 Worker，那会把访客请求发到第三方、并显示作者的点赞数，
 * 所以这里改成必须显式配置才启用。
 */
export const LIKE_API_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_API_ENDPOINT || ''

/**
 * GitHub 仓库配置
 */
export const GITHUB_CONFIG = {
	OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'newzi23',
	REPO: process.env.NEXT_PUBLIC_GITHUB_REPO || 'newzi-blog',
	BRANCH: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
	APP_ID: process.env.NEXT_PUBLIC_GITHUB_APP_ID || '-',
	ENCRYPT_KEY: process.env.NEXT_PUBLIC_GITHUB_ENCRYPT_KEY || 'wudishiduomejimo',
} as const
