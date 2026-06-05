/**
 * 路由级 staleTime 配置。
 * 匹配到的路由下所有 query 自动获得 staleTime: 0，确保页面切换时数据显示最新。
 * 新增需要实时数据的页面，只需在此数组添加路由前缀即可。
 */
export const FRESH_ROUTES: string[] = [
  '/studio/overview',   // 工作台统计
  '/studio/leads',      // 意向单列表
  '/studio/projects',   // 项目管理
  '/studio/contracts',  // 合同管理
];
