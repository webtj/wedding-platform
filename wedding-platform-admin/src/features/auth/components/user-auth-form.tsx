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
          const msg = await res.json().catch(() => ({}));
          throw new Error((msg as any).message ?? '注册失败，请稍后重试');
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
        <div className='rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      {isSignUp && (
        <div className='space-y-2'>
          <label htmlFor='displayName' className='text-sm font-medium'>
            姓名
          </label>
          <Input
            id='displayName'
            type='text'
            placeholder='你的姓名'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      <div className='space-y-2'>
        <label htmlFor='identifier' className='text-sm font-medium'>
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
        />
      </div>

      <div className='space-y-2'>
        <label htmlFor='password' className='text-sm font-medium'>
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
        />
      </div>

      {isSignUp && (
        <div className='space-y-2'>
          <label htmlFor='confirmPassword' className='text-sm font-medium'>
            确认密码
          </label>
          <Input
            id='confirmPassword'
            type='password'
            placeholder='再次输入密码'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      <Button disabled={loading} className='w-full' type='submit'>
        {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
      </Button>
    </form>
  );
}
