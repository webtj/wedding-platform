import { cn } from '@/lib/utils';
import Link from 'next/link';
import { InteractiveGridPattern } from './interactive-grid';
import UserAuthForm from './user-auth-form';

export default function SignInViewPage() {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-sidebar' />
        <div className='text-sidebar-foreground relative z-20 flex items-center gap-2 text-lg font-medium'>
          <span className='bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-base'>
            婚
          </span>
          <span className='font-serif text-xl font-bold tracking-wide'>婚礼 SaaS 平台</span>
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
        <div className='text-sidebar-foreground relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg leading-relaxed'>
              从意向单到合同，从项目到财务，一站式婚礼策划管理平台，让你的团队高效协作，服务更多新人。
            </p>
            <footer className='text-sidebar-foreground/70 text-sm'>婚礼 SaaS 团队</footer>
          </blockquote>
        </div>
      </div>
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='text-center'>
            <h1 className='font-serif text-2xl font-bold tracking-tight'>登录账户</h1>
            <p className='text-muted-foreground mt-2 text-sm'>输入账号密码登录婚礼 SaaS 平台</p>
          </div>

          <UserAuthForm mode='signin' />

          <div className='text-muted-foreground px-8 text-center text-sm'>
            还没有账号？{' '}
            <Link
              href='/auth/sign-up'
              className='text-primary hover:underline underline-offset-4 font-medium'
            >
              注册
            </Link>
          </div>

          <p className='text-muted-foreground px-8 text-center text-xs'>
            点击登录即表示同意我们的{' '}
            <Link
              href='/terms-of-service'
              className='hover:text-primary underline underline-offset-4'
            >
              服务条款
            </Link>{' '}
            和{' '}
            <Link
              href='/privacy-policy'
              className='hover:text-primary underline underline-offset-4'
            >
              隐私政策
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
