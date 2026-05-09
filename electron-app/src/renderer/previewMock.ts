import type {
  CustomTalentPack,
  GameHealth,
  GameSnapshot,
  LogFileKind,
  OperationResult,
  ReleaseHistoryItem,
  UpdateCheckResult,
  UpdateProgressEvent,
  VisibleSettings
} from '../shared/types';
import { CUSTOM_TALENT_PACK_VERSION } from '../shared/types';
import { defaultSettings } from './components';

function createPreviewHealth(): GameHealth {
  return {
    healthy: true,
    needsRepair: false,
    summary: '浏览器预览：模拟自检通过',
    driftedFiles: [],
    checks: [
      { key: 'game-exe', label: '游戏主程序', ok: true, detail: '预览模式模拟 LongYinLiZhiZhuan.exe 存在。' },
      { key: 'bepinex-dir', label: 'BepInEx 目录', ok: true, detail: '预览模式模拟 BepInEx 已安装。' },
      { key: 'winhttp', label: 'Doorstop Loader', ok: true, detail: '预览模式模拟 winhttp.dll 存在。' },
      { key: 'config-writable', label: '配置文件可写', ok: true, detail: '预览模式不会写入真实游戏目录。' }
    ]
  };
}

function createPreviewUpdate(): UpdateCheckResult {
  return {
    currentVersion: '0.1.27',
    latestVersion: '0.1.27',
    updateAvailable: false,
    releaseName: '浏览器预览版本',
    publishedAt: new Date().toISOString(),
    releaseBody: '这是浏览器预览数据。\n真实更新检查只在 Electron 应用中运行。',
    releaseUrl: 'https://github.com/Zhihong0321/longyin_plus/releases/latest',
    status: '浏览器预览：已是最新'
  };
}

function createPreviewSnapshot(settings: VisibleSettings): GameSnapshot {
  return {
    appVersion: '0.1.27-preview',
    payloadRoot: '/preview/resources/payload',
    userDataRoot: '/preview/user-data',
    startupLogPath: '/preview/user-data/startup.log',
    otaLogPath: '/preview/user-data/ota-update.log',
    gameRoot: '/preview/LongYinLiZhiZhuan',
    gameRootDetected: true,
    gameInstalled: true,
    health: createPreviewHealth(),
    gameRunning: false,
    launchReady: true,
    launchState: 'idle',
    launchNote: '浏览器预览模式',
    visibleSettings: settings,
    status: '浏览器预览模式：配置不会写入磁盘。',
    update: createPreviewUpdate()
  };
}

export function installPreviewLongYinApi(): void {
  if (window.longyin) {
    return;
  }

  let settings = {
    ...defaultSettings(),
    creationPointMultiplier: 3,
    battleTurboEnabled: true,
    merchantCarryCash: 100000
  };
  let snapshot = createPreviewSnapshot(settings);

  const updateSnapshot = (message: string): GameSnapshot => {
    snapshot = {
      ...createPreviewSnapshot(settings),
      status: message
    };
    return snapshot;
  };

  const operation = (message: string): OperationResult => ({
    ok: true,
    message,
    gameRoot: snapshot.gameRoot,
    updatedSnapshot: updateSnapshot(message)
  });

  window.longyin = {
    getSnapshot: async () => snapshot,
    pickGameRoot: async () => updateSnapshot('浏览器预览：已选择模拟游戏目录。'),
    setGameRoot: async () => updateSnapshot('浏览器预览：已设置模拟游戏目录。'),
    saveSettings: async (nextSettings: VisibleSettings) => {
      settings = { ...nextSettings };
      return updateSnapshot('浏览器预览：设置已保存到内存。');
    },
    getCustomTalents: async (): Promise<CustomTalentPack> => ({
      version: CUSTOM_TALENT_PACK_VERSION,
      talents: [
        {
          id: 'preview-talent',
          enabled: true,
          name: '预览天赋',
          durationDays: 999,
          conditions: [{ type: 'stat_min', stat: 'Inte', min: 10 }],
          effects: [{ effectType: 'addAttri2', value: 10 }]
        }
      ]
    }),
    saveCustomTalents: async (pack: CustomTalentPack) => ({
      ok: true,
      message: `浏览器预览：已接收 ${pack.talents.length} 个自定义天赋。`,
      pack
    }),
    install: async () => operation('浏览器预览：模拟安装完成。'),
    uninstall: async () => operation('浏览器预览：模拟卸载完成。'),
    launch: async () => operation('浏览器预览：模拟启动游戏。'),
    saveAndLaunch: async (nextSettings: VisibleSettings) => {
      settings = { ...nextSettings };
      return operation('浏览器预览：模拟保存并启动。');
    },
    checkUpdates: async () => createPreviewUpdate(),
    getReleaseHistory: async (): Promise<ReleaseHistoryItem[]> => [
      {
        tagName: 'v0.1.27',
        version: '0.1.27',
        name: '浏览器预览版本',
        publishedAt: new Date().toISOString(),
        body: '浏览器预览发布说明。\n用于检查 UI 布局。',
        htmlUrl: 'https://github.com/Zhihong0321/longyin_plus/releases/latest',
        isLatest: true
      }
    ],
    applyUpdate: async () => operation('浏览器预览：模拟更新完成。'),
    readLogFile: async (kind: LogFileKind) =>
      kind === 'startup'
        ? '[preview] startup.log\n浏览器预览不会启动真实游戏。'
        : '[preview] ota-update.log\n浏览器预览不会下载更新。',
    onUpdateProgress: (_callback: (event: UpdateProgressEvent) => void) => () => undefined,
    openPath: async (targetPath: string) => {
      console.info('[preview] openPath', targetPath);
    },
    openExternal: async (targetUrl: string) => {
      console.info('[preview] openExternal', targetUrl);
    }
  };
}
