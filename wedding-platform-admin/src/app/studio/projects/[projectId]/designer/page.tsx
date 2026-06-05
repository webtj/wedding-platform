'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSceneByProject, createScene, updateScene } from '@/features/editor/api/queries';
import { EditorCanvas } from '@/features/editor/components/canvas';
import { MaterialPanel } from '@/features/editor/components/material-panel';
import { PropertyPanel } from '@/features/editor/components/property-panel';
import { EditorToolbar } from '@/features/editor/components/toolbar';
import { VenueSetupDialog } from '@/features/editor/components/venue-setup-dialog';
import { AiPanel } from '@/features/editor/components/ai-panel';
import { useSceneStore } from '@/features/editor/store/scene-store';

export default function DesignerPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.projectId as string;

  const [sceneId, setSceneId] = useState<string | null>(null);
  const [showVenueSetup, setShowVenueSetup] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [ready, setReady] = useState(false);

  const initScene = useSceneStore((s) => s.initScene);
  const toSceneJson = useSceneStore((s) => s.toSceneJson);
  const dirty = useSceneStore((s) => s.dirty);
  const setDirty = useSceneStore((s) => s.setDirty);

  // Load existing scene
  const { data: existingScene, isLoading } = useQuery({
    queryKey: ['scene', projectId],
    queryFn: () => getSceneByProject(projectId),
    enabled: !!projectId
  });

  useEffect(() => {
    if (existingScene) {
      setSceneId(existingScene.id);
      const rawData = existingScene.sceneData;
      const sceneData = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData ?? {});
      initScene(sceneData, existingScene.id);
      setReady(true);
    } else if (!isLoading && existingScene === null) {
      setShowVenueSetup(true);
    }
  }, [existingScene, isLoading, initScene]);

  // Create scene mutation
  const createMutation = useMutation({
    mutationFn: (data: { width: number; height: number; name: string }) =>
      createScene({ projectId, width: data.width, height: data.height, name: data.name }),
    onSuccess: (scene) => {
      setSceneId(scene.id);
      const rawData = scene.sceneData;
      const sceneData = typeof rawData === 'string' ? JSON.parse(rawData) : (rawData ?? {});
      initScene(sceneData, scene.id);
      setShowVenueSetup(false);
      setReady(true);
      toast.success('场景已创建');
    },
    onError: (err: Error) => {
      toast.error(err.message || '创建失败');
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!sceneId) throw new Error('No scene');
      const sceneJson = toSceneJson();
      return updateScene(sceneId, { sceneData: sceneJson });
    },
    onSuccess: () => {
      setDirty(false);
      toast.success('已保存');
      queryClient.invalidateQueries({ queryKey: ['scene', projectId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || '保存失败');
    }
  });

  // Auto-save debounce
  useEffect(() => {
    if (!dirty || !sceneId) return;
    const timer = setTimeout(() => {
      saveMutation.mutate();
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, sceneId]);

  const handleExport = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `wedding-layout-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('已导出平面图');
  }, []);

  const handleBack = useCallback(() => {
    if (dirty) {
      if (!confirm('有未保存的更改，确定离开？')) return;
    }
    router.push('/studio/projects');
  }, [dirty, router]);

  const toggleAiPanel = useCallback(() => {
    setShowAiPanel((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-muted-foreground text-sm'>加载中...</p>
      </div>
    );
  }

  return (
    <div className='flex flex-1 min-h-0 flex-col overflow-hidden'>
      <EditorToolbar
        saving={saveMutation.isPending}
        onSave={() => saveMutation.mutate()}
        onExport={handleExport}
        onBack={handleBack}
        showAiPanel={showAiPanel}
        onToggleAiPanel={toggleAiPanel}
      />

      <div className='flex min-h-0 flex-1'>
        {ready && <MaterialPanel className='w-48 shrink-0' />}

        <div className='relative min-w-0 flex-1 overflow-hidden'>
          {ready ? (
            <EditorCanvas />
          ) : (
            <div className='flex h-full items-center justify-center'>
              <p className='text-muted-foreground text-sm'>请先设置场地</p>
            </div>
          )}
        </div>

        {ready && <PropertyPanel className='w-56 shrink-0' />}

        {ready && showAiPanel && sceneId && (
          <AiPanel sceneId={sceneId} className='w-64 shrink-0' />
        )}
      </div>

      <VenueSetupDialog
        open={showVenueSetup}
        onSubmit={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}
