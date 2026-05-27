import type { InfobarContent } from '@/components/ui/infobar';

export const contractsInfoContent: InfobarContent = {
  title: '合同管理',
  sections: [
    {
      title: '概述',
      description: '管理所有合同，关联项目，跟踪收款进度。合同金额以分为单位存储，前端显示为元。',
      links: []
    },
    {
      title: '合同状态',
      description: '草稿 → 待审核 → 已签署 → 已完成 / 已作废。每个合同支持多条收款记录。',
      links: []
    }
  ]
};
