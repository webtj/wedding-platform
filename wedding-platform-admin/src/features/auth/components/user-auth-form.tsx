'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login, fetchMe, switchTenant } from '@/lib/auth/auth-client';

export default function UserAuthForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldClass =
    'h-12 rounded-2xl border-[#e7dac9]/58 bg-[#fff9f1]/38 text-[#3f2f24] placeholder:text-[#ad9c8a] shadow-[0_8px_26px_rgba(125,95,66,0.05)] backdrop-blur-[5px] focus-visible:border-[#c98695] focus-visible:ring-[#c98695]/18 [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_rgba(255,249,241,0.8)] [&:-webkit-autofill]:[-webkit-text-fill-color:#3f2f24]';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('请填写账号和密码');
      return;
    }

    setLoading(true);
    try {
      await login(identifier, password);
      const me = await fetchMe();

      if (me.isPlatformAdmin) {
        router.replace('/admin/overview');
        return;
      }

      if (me.tenants.length > 0) {
        try {
          await switchTenant(me.tenants[0]!.id);
        } catch (err) {
          console.warn('[sign-in] switchTenant failed', err);
        }
        router.replace('/studio/overview');
        return;
      }

      router.replace('/studio/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
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

      <Button
        disabled={loading}
        className='mt-2 h-12 w-full rounded-2xl bg-[#bf7181]/96 text-base font-semibold text-white shadow-[0_14px_30px_rgba(190,114,127,0.34)] transition-colors hover:bg-[#b26674]'
        type='submit'
      >
        {loading ? '处理中...' : '登录'}
      </Button>
    </form>
  );
}
