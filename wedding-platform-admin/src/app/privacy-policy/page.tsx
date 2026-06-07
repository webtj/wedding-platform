import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '隐私政策 | 婚礼 SaaS 平台',
  robots: { index: false }
};

export default function PrivacyPolicyPage() {
  return (
    <div className='min-h-screen bg-[#f3ecdf] px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl space-y-8'>
        <div className='text-center'>
          <Link href='/auth/sign-in' className='text-sm text-[#8f7864] hover:text-[#6e5a48]'>
            ← 返回登录
          </Link>
          <h1 className='mt-4 font-serif text-3xl font-bold text-[#3f2f24]'>隐私政策</h1>
          <p className='mt-2 text-sm text-[#8f7864]'>最后更新：2026 年 6 月 1 日</p>
        </div>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>一、引言</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            婚礼 SaaS 平台（以下简称"本平台"）深知个人信息对您的重要性，我们将严格遵守相关法律法规，采取相应的安全保护措施来保护您的个人信息。本隐私政策适用于您通过本平台提供的所有服务。
          </p>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>二、我们收集的信息</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>2.1 账户信息</strong></p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>登录账号（由管理员分配）</li>
              <li>显示名称</li>
              <li>密码（加密存储，我们无法查看明文）</li>
            </ul>

            <p><strong>2.2 业务数据</strong></p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>客户线索信息（姓名、联系方式、需求描述等）</li>
              <li>项目信息（婚礼日期、场地、风格偏好等）</li>
              <li>合同信息（合同内容、签署状态等）</li>
              <li>上传的素材文件（图片、文档等）</li>
              <li>AI 生成的内容（图片、文案等）</li>
            </ul>

            <p><strong>2.3 使用数据</strong></p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>登录时间、操作日志</li>
              <li>功能使用频率</li>
              <li>AI 功能使用量</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>三、我们如何使用信息</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>3.1</strong> 提供和维护平台的核心功能。</p>
            <p><strong>3.2</strong> 验证身份、保障账户安全。</p>
            <p><strong>3.3</strong> 提供客户管理、项目管理、合同管理等业务功能。</p>
            <p><strong>3.4</strong> 提供 AI 创意生成服务（图片、文案等）。</p>
            <p><strong>3.5</strong> 生成使用统计和分析报告，帮助管理员了解团队使用情况。</p>
            <p><strong>3.6</strong> 改进平台功能和用户体验。</p>
            <p><strong>3.7</strong> 防范欺诈、保障平台安全。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>四、信息存储与安全</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>4.1 存储位置</strong>：您的数据存储在我们指定的安全服务器上，位于中华人民共和国境内。</p>
            <p><strong>4.2 存储期限</strong>：我们在您使用服务期间保留您的数据。账户注销后，我们将在 30 天内删除您的数据，法律法规另有规定的除外。</p>
            <p><strong>4.3 安全措施</strong>：我们采取以下措施保护您的数据：</p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>密码使用 bcrypt 加密存储</li>
              <li>通信传输使用 HTTPS 加密</li>
              <li>访问令牌采用 JWT + httpOnly Cookie 机制</li>
              <li>严格的权限控制，确保用户只能访问授权范围内的数据</li>
              <li>定期安全审计和漏洞扫描</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>五、信息共享与披露</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>5.1</strong> 我们不会将您的个人信息出售、出租或以其他方式提供给第三方，但以下情况除外：</p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>获得您的明确同意</li>
              <li>法律法规要求或政府机关依法要求</li>
              <li>为维护公共安全等重大公共利益</li>
            </ul>
            <p><strong>5.2 团队内部共享</strong>：您在平台上的业务数据（如客户信息、项目信息等）会根据权限设置在团队内部共享。平台管理员可以管理团队成员和权限。</p>
            <p><strong>5.3 AI 服务</strong>：当您使用 AI 功能时，相关内容会发送至 AI 服务提供商进行处理。我们仅传输必要的内容，不会传输您的账户信息。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>六、您的权利</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>6.1 查看权</strong>：您可以查看您的账户信息和业务数据。</p>
            <p><strong>6.2 更正权</strong>：您可以联系管理员更正不准确的个人信息。</p>
            <p><strong>6.3 删除权</strong>：您可以联系管理员删除特定数据或注销账户。</p>
            <p><strong>6.4 导出权</strong>：您可以联系管理员导出您的业务数据。</p>
            <p><strong>6.5 撤回同意</strong>：对于基于同意处理的个人信息，您有权撤回同意。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>七、Cookie 使用</h2>
          <div className='space-y-3 text-base leading-relaxed text-[#6e5a48]'>
            <p><strong>7.1</strong> 本平台使用 Cookie 来维持您的登录状态和存储偏好设置。</p>
            <p><strong>7.2</strong> 我们使用的 Cookie 类型：</p>
            <ul className='list-disc pl-6 space-y-1'>
              <li><strong>认证 Cookie</strong>（httpOnly）：用于维持登录状态，包含加密的刷新令牌</li>
              <li><strong>偏好 Cookie</strong>：存储主题、语言等偏好设置</li>
            </ul>
            <p><strong>7.3</strong> 您可以通过浏览器设置管理或删除 Cookie，但这可能影响您使用平台的部分功能。</p>
          </div>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>八、未成年人保护</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            本平台面向企业用户，不面向未成年人提供服务。如果我们发现未成年人使用了本平台，我们将采取措施删除相关数据。
          </p>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>九、隐私政策变更</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            我们可能会不时更新本隐私政策。更新后的政策将在平台内公告，继续使用本平台即表示您同意更新后的隐私政策。重大变更将提前通知您。
          </p>
        </section>

        <section>
          <h2 className='mb-3 text-xl font-semibold text-[#3f2f24]'>十、联系我们</h2>
          <p className='text-base leading-relaxed text-[#6e5a48]'>
            如您对本隐私政策有任何疑问、意见或建议，请联系平台管理员。
          </p>
        </section>

        <div className='border-t border-[#e7dac9] pt-6 text-center text-sm text-[#8f7864]'>
          <p>本隐私政策自发布之日起生效。</p>
        </div>
      </div>
    </div>
  );
}
