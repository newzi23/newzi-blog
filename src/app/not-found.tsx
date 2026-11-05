import Link from 'next/link'

/**
 * 自定义 404。
 * Next 默认的 404 是英文、无样式（"This page could not be found"），
 * 访客点到死链时观感很差，所以这里做成与站点一致的卡片样式。
 */
export default function NotFound() {
	return (
		<div className='mx-auto flex min-h-[70vh] w-full max-w-[760px] flex-col items-center justify-center px-6 py-24'>
			<div className='card relative w-full rounded-2xl p-10 text-center max-sm:p-7'>
				<div className='font-averia text-linear text-6xl leading-none font-bold max-sm:text-5xl'>404</div>

				<h1 className='mt-6 text-xl font-semibold max-sm:text-lg'>这个页面不存在</h1>

				<p className='text-secondary mt-3 text-sm leading-relaxed'>
					你要找的页面可能已经被移动、删除，或者网址输错了。
					<br />
					也可能是我把链接写错了 —— 那欢迎到 GitHub 上告诉我。
				</p>

				<div className='mt-9 flex flex-wrap items-center justify-center gap-3'>
					<Link href='/' className='brand-btn rounded-xl px-5 py-2.5 text-sm font-medium'>
						回到首页
					</Link>
					<Link href='/blog' className='card relative rounded-xl px-5 py-2.5 text-sm font-medium whitespace-nowrap'>
						浏览全部文章
					</Link>
					<a
						href='/rss.xml'
						className='card relative rounded-xl px-5 py-2.5 text-sm font-medium whitespace-nowrap'
						target='_blank'
						rel='noreferrer'>
						RSS 订阅
					</a>
				</div>
			</div>
		</div>
	)
}
