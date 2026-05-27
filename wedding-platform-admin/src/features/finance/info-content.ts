import type { InfobarContent } from '@/components/ui/infobar';

export const financeInfoContent: InfobarContent = {
  title: '财务管理',
  sections: [
    {
      title: '概述',
      description:
        '财务总览展示当前租户下所有项目的财务汇总数据，包括合同总额、已收款、应收款、支出和利润。',
      links: []
    },
    {
      title: '数据来源',
      description: '合同金额来自合同模块，收款记录来自合同的收款明细，支出来自项目的支出记录。',
      links: []
    }
  ]
};
