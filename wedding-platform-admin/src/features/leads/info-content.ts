import type { InfobarContent } from '@/components/ui/infobar';

export const leadsInfoContent: InfobarContent = {
  title: '意向单管理',
  sections: [
    {
      title: '概述',
      description:
        '意向单是销售漏斗的起点，记录潜在客户的咨询信息。从初次接触到签约，跟踪每个环节的转化状态。',
      links: []
    },
    {
      title: '状态流转',
      description:
        '未沟通 → 已联系 → 已报价 → 洽谈中 → 已签约。签约后可转为正式项目。流失的客户可以标记为"已流失"并记录原因。',
      links: []
    },
    {
      title: '快捷操作',
      description:
        '点击行内 → 按钮可快速推进到下一状态。点击编辑按钮修改客户信息。签约后点击 ✨ 按钮可一键转为项目。',
      links: []
    }
  ]
};
