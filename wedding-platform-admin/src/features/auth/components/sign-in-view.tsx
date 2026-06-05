import Link from 'next/link';
import { RomanticAuthHero } from '@/features/auth-hero/RomanticAuthHero';
import UserAuthForm from './user-auth-form';

export default function SignInViewPage() {
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
          把婚礼的灵感、美学与执行，沉淀成团队能力。
        </p>
        <p className='mt-3 text-[15px] leading-relaxed text-white/72'>
          从意向单到合同，从项目到财务，让每位策划师都能在同一套系统中协作、复用与成长。
        </p>
      </div>

      <section className='relative z-30 flex min-h-screen items-center justify-center p-6 lg:justify-end lg:p-14'>
        <div className='pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] bg-gradient-to-l from-[#f2e5d4]/32 via-[#f2e5d4]/10 to-transparent lg:block' />
        <div className='relative w-full max-w-[520px] px-5 py-7 sm:px-8'>
          <div className='mb-7 text-center'>
            <p className='text-xs tracking-[0.26em] text-[#8f7864]'>WELCOME BACK</p>
            <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight text-[#3f2f24]'>登录账户</h1>
            <p className='mt-2 text-sm text-[#816f5f]'>输入账号密码登录婚礼 SaaS 平台</p>
          </div>

          <UserAuthForm mode='signin' />

          <div className='mt-5 px-2 text-center text-sm text-[#7d6b5d]'>
            还没有账号？{' '}
            <Link
              href='/auth/sign-up'
              className='font-medium text-[#b16272] underline-offset-4 hover:underline'
            >
              注册
            </Link>
          </div>

          <p className='mt-5 px-2 text-center text-xs leading-relaxed text-[#887463]'>
            点击登录即表示同意我们的{' '}
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
