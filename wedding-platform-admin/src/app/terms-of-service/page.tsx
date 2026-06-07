import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '服务条款 | 婚礼 SaaS 平台',
  robots: { index: false }
};

export default function TermsOfServicePage() {
  return (
    <div className='min-h-screen bg-[#f3ecdf] px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='text-center'>
          <Link href='/auth/sign-in' className='text-sm text-[#8f7864] hover:text-[#6e5a48]'>
            ← 返回登录
          </Link>
          <h1 className='mt-4 font-serif text-3xl font-bold text-[#3f2f24]'>服务条款</h1>
          <p className='mt-2 text-sm text-[#8f7864]'>最后更新：2026 年 6 月 1 日</p>
        </div>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>一、服务说明</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            婚礼 SaaS 平台（以下简称"本平台"）是一款面向婚礼策划团队的数字化协作工具，提供客户管理、项目管理、合同管理、AI 创意生成、素材管理等功能。本平台以订阅制方式向注册用户（以下简称"您"或"用户"）提供服务。
          </p>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>二、账户注册与管理</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>2.1</strong> 本平台采用邀请制注册。您的账户由平台管理员或租户管理员创建，您无法自行注册。</p>
            <p><strong>2.2</strong> 您应妥善保管账户信息及密码，因您保管不善导致的损失由您自行承担。</p>
            <p><strong>2.3</strong> 您不得将账户转让、出借或以其他方式提供给他人使用。</p>
            <p><strong>2.4</strong> 如发现账户存在未经授权使用的情况，应立即通知管理员。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>三、服务内容与变更</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>3.1</strong> 本平台提供的功能包括但不限于：客户线索管理、项目管理、合同管理、任务分配、AI 图片生成、AI 文案生成、素材库管理、团队协作等。</p>
            <p><strong>3.2</strong> 我们有权根据业务发展需要，对平台功能进行更新、升级或调整。重大变更将提前通知用户。</p>
            <p><strong>3.3</strong> 我们可能因系统维护、升级等原因暂停服务，将尽量提前通知并在合理时间内恢复。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>四、用户行为规范</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>4.1</strong> 您在使用本平台时，应遵守法律法规，不得利用平台从事违法违规活动。</p>
            <p><strong>4.2</strong> 您不得：</p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>上传含有病毒、恶意代码的内容</li>
              <li>尝试未经授权访问其他用户的数据</li>
              <li>对平台进行逆向工程、反编译或反汇编</li>
              <li>利用平台发送垃圾信息或进行骚扰</li>
              <li>以任何方式损害平台的正常运行</li>
            </ul>
            <p><strong>4.3</strong> 您对其在平台上传、发布的内容承担法律责任。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>五、知识产权</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>5.1</strong> 本平台的所有代码、设计、图标、文档等内容的知识产权归我们所有。</p>
            <p><strong>5.2</strong> 您在使用平台过程中上传的素材、文档等内容，其知识产权仍归您所有。您授予我们在提供服务范围内使用这些内容的必要许可。</p>
            <p><strong>5.3</strong> 通过 AI 功能生成的内容，其使用权归您所有，但您应自行确保使用方式符合相关法律法规。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>六、数据与隐私</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>6.1</strong> 我们重视您的数据安全，详见《隐私政策》。</p>
            <p><strong>6.2</strong> 您的数据存储在我们指定的服务器上，我们采取合理的技术措施保护数据安全。</p>
            <p><strong>6.3</strong> 在服务终止或您注销账户后，我们将在合理期限内删除您的数据，法律法规另有规定的除外。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>七、订阅与付费</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>7.1</strong> 本平台提供不同等级的订阅套餐，具体功能和价格以平台公布为准。</p>
            <p><strong>7.2</strong> 订阅费用按选定周期收取，到期前将提醒续费。</p>
            <p><strong>7.3</strong> 逾期未续费的账户，我们有权限制或暂停部分功能。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>八、免责声明</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>8.1</strong> 本平台按"现状"提供服务，我们不对服务的不间断性、无错误性作出保证。</p>
            <p><strong>8.2</strong> AI 生成内容仅供参考，我们不对 AI 生成内容的准确性、合法性承担责任。</p>
            <p><strong>8.3</strong> 因不可抗力（包括但不限于自然灾害、政策变化、网络故障等）导致的服务中断，我们不承担责任。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>九、服务终止</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>9.1</strong> 您可以随时联系管理员要求注销账户。</p>
            <p><strong>9.2</strong> 如您违反本条款，我们有权暂停或终止您的账户访问权限。</p>
            <p><strong>9.3</strong> 服务终止后，您将无法访问账户中的数据，请提前做好数据备份。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>十、条款变更</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            我们有权根据业务需要修改本条款。修改后的条款将在平台内公告，继续使用本平台即表示您同意修改后的条款。如您不同意修改内容，有权停止使用并注销账户。
          </p>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>十一、适用法律与争议解决</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            本条款适用中华人民共和国法律。因本条款引起的争议，双方应友好协商解决；协商不成的，任何一方有权向我们所在地有管辖权的人民法院提起诉讼。
          </p>
        </section>

        <div className='border-t border-[#e7dac9] pt-6 text-center text-sm text-[#8f7864]'>
          <p>如有疑问，请联系平台管理员。</p>
        </div>
      </div>
    </div>
  );
}
