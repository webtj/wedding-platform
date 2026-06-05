'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/lib/auth/auth-client';

type Props = {
  mode?: 'signin' | 'signup';
};

export default function UserAuthForm({ mode = 'signin' }: Props) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignUp = mode === 'signup';
  const fieldClass =
    'h-12 rounded-2xl border-[#e7dac9]/58 bg-[#fff9f1]/38 text-[#3f2f24] placeholder:text-[#ad9c8a] shadow-[0_8px_26px_rgba(125,95,66,0.05)] backdrop-blur-[5px] focus-visible:border-[#c98695] focus-visible:ring-[#c98695]/18 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgba(255,249,241,0.8)] [&:-webkit-autofill]:[-webkit-text-fill-color:#3f2f24]';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('请填写账号和密码');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign-up: call registration endpoint
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/identity/register`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              identifier,
              password,
              displayName: displayName || identifier
            })
          }
        );
        if (!res.ok) {
          const msg = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(msg?.message ?? '注册失败，请稍后重试');
        }
      }

      // Sign in
      await login(identifier, password);
      router.replace('/studio/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='w-full space-y-4'>
      {error && (
        <div className='rounded-2xl border border-red-200/70 bg-red-50/62 px-4 py-3 text-sm text-red-700 backdrop-blur-[2px]'>
          {error}
        </div>
      )}

      {isSignUp && (
        <div className='space-y-2'>
          <label htmlFor='displayName' className='text-sm font-medium text-[#6e5a48]'>
            姓名
          </label>
          <Input
            id='displayName'
            type='text'
            placeholder='你的姓名'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            className={fieldClass}
          />
        </div>
      )}

      <div className='space-y-2'>
        <label htmlFor='identifier' className='text-sm font-medium text-[#6e5a48]'>
          账号
        </label>
        <Input
          id='identifier'
          type='text'
          placeholder='输入账号'
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={loading}
          required
          className={fieldClass}
        />
      </div>

      <div className='space-y-2'>
        <label htmlFor='password' className='text-sm font-medium text-[#6e5a48]'>
          密码
        </label>
        <Input
          id='password'
          type='password'
          placeholder='输入密码'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          className={fieldClass}
        />
      </div>

      {isSignUp && (
        <div className='space-y-2'>
          <label htmlFor='confirmPassword' className='text-sm font-medium text-[#6e5a48]'>
            确认密码
          </label>
          <Input
            id='confirmPassword'
            type='password'
            placeholder='再次输入密码'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className={fieldClass}
          />
        </div>
      )}

      <Button
        disabled={loading}
        className='mt-2 h-12 w-full rounded-2xl bg-[#bf7181]/96 text-base font-semibold text-white shadow-[0_14px_30px_rgba(190,114,127,0.34)] transition-colors hover:bg-[#b26674]'
        type='submit'
      >
        {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
      </Button>
    </form>
  );
}
