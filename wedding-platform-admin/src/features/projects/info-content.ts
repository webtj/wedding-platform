import type { InfobarContent } from '@/components/ui/infobar';

export const projectsInfoContent: InfobarContent = {
  title: '项目管理',
  sections: [
    {
      title: '概述',
      description:
        '项目管理展示所有婚礼项目，按婚期排列。项目由意向单签约后转化创建，每个项目关联合同和财务数据。',
      links: []
    },
    {
      title: '项目状态',
      description: '草稿 → 进行中 → 已完成 → 已归档。点击操作菜单可查看项目详情和管理关联合同。',
      links: []
    }
  ]
};
