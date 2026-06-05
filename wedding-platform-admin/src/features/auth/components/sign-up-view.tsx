import Link from 'next/link';
import { RomanticAuthHero } from '@/features/auth-hero/RomanticAuthHero';
import UserAuthForm from './user-auth-form';

export default function SignUpViewPage() {
  return (
    <div className='relative min-h-screen overflow-hidden bg-[#f3ecdf]'>
      <div className='absolute inset-0' aria-hidden='true'>
        <RomanticAuthHero />
      </div>
      <div className='pointer-events-none absolute inset-0 bg-gradient-to-r from-[#000]/6 via-transparent to-[#f3e8d8]/11' />

      <div className='pointer-events-none absolute left-7 top-7 z-20 hidden lg:block'>
        <div className='inline-flex items-center gap-4 rounded-2xl border border-white/42 bg-white/18 px-4 py-3 text-[#fffaf4] backdrop-blur-[2px]'>
          <span className='flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/24 font-serif text-base text-white'>
            婚
          </span>
          <div className='space-y-1'>
            <p className='text-[10px] tracking-[0.3em] text-white/88'>NATURE WEDDING OS</p>
            <p className='font-serif text-xl tracking-[0.04em] text-white'>婚礼 SaaS 平台</p>
          </div>
        </div>
      </div>

      <div className='pointer-events-none absolute bottom-8 left-7 z-20 hidden max-w-[680px] lg:block'>
        <p className='font-serif text-[34px] leading-[1.26] text-white/86 drop-shadow-sm'>
          用更温柔的体验，承载更专业的婚礼交付流程。
        </p>
        <p className='mt-3 text-[15px] leading-relaxed text-white/72'>
          注册后即可开始管理项目、沉淀模板与素材，把创意能力规模化复制到团队每一次服务里。
        </p>
      </div>

      <section className='relative z-30 flex min-h-screen items-center justify-center p-6 lg:justify-end lg:p-14'>
        <div className='pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] bg-gradient-to-l from-[#f2e5d4]/32 via-[#f2e5d4]/10 to-transparent lg:block' />
        <div className='relative w-full max-w-[520px] px-5 py-7 sm:px-8'>
          <div className='mb-7 text-center'>
            <p className='text-xs tracking-[0.26em] text-[#8f7864]'>JOIN US</p>
            <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight text-[#3f2f24]'>创建账户</h1>
            <p className='mt-2 text-sm text-[#816f5f]'>注册加入婚礼 SaaS 平台</p>
          </div>

          <UserAuthForm mode='signup' />

          <div className='mt-5 px-2 text-center text-sm text-[#7d6b5d]'>
            已有账号？{' '}
            <Link
              href='/auth/sign-in'
              className='font-medium text-[#b16272] underline-offset-4 hover:underline'
            >
              登录
            </Link>
          </div>

          <p className='mt-5 px-2 text-center text-xs leading-relaxed text-[#887463]'>
            点击注册即表示同意我们的{' '}
            <Link
              href='/terms-of-service'
              className='text-[#6f5c4d] underline underline-offset-4'
            >
              服务条款
            </Link>{' '}
            和{' '}
            <Link
              href='/privacy-policy'
              className='text-[#6f5c4d] underline underline-offset-4'
            >
              隐私政策
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
