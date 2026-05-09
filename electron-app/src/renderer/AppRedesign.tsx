import { useEffect, useMemo, useState } from 'react';
import type {
  GameHealth,
  GameSnapshot,
  ReleaseHistoryItem,
  UpdateCheckResult,
  UpdateProgressEvent,
  VisibleSettings
} from '../shared/types';
import {
  BATTLE_TURBO_HOTKEYS,
  CheckboxField,
  HOTKEY_OPTIONS,
  NumberField,
  SelectField,
  StatusPill,
  clampText,
  defaultSettings,
  mergeSettings
} from './components';
import { createEmptyCustomTalentPack } from './customTalents';
import type { CustomTalentPack } from '../shared/types';

type PageKey =
  | 'overview'
  | 'common'
  | 'growth'
  | 'explore'
  | 'battle'
  | 'trade'
  | 'social'
  | 'customTalent'
  | 'maintenance';

type PageItem = {
  key: PageKey;
  title: string;
  subtitle: string;
};

const pages: PageItem[] = [
  { key: 'overview', title: '总览', subtitle: '目录、状态与常用操作' },
  { key: 'common', title: '常用配置', subtitle: '最常改的开关和倍率' },
  { key: 'growth', title: '成长与角色', subtitle: '经验、创建角色与天赋点' },
  { key: 'explore', title: '探索与大地图', subtitle: '探索体力与坐骑移动' },
  { key: 'battle', title: '战斗与小游戏', subtitle: '战斗加速、辩论、对酒' },
  { key: 'trade', title: '交易与制造', subtitle: '商店、背包与制作增产' },
  { key: 'social', title: '社交与关系', subtitle: '对话、好感、伴侣上限' },
  { key: 'customTalent', title: '自定义天赋', subtitle: '查看当前天赋包状态' },
  { key: 'maintenance', title: '维护与更新', subtitle: '自检、日志、OTA、卸载' }
];

function emptyHealth(): GameHealth {
  return {
    healthy: false,
    needsRepair: false,
    summary: '正在加载自检状态。',
    driftedFiles: [],
    checks: []
  };
}

function launchLabel(state?: GameSnapshot['launchState']): string {
  if (state === 'running') {
    return '运行中';
  }

  if (state === 'starting') {
    return '启动中';
  }

  return '待命';
}

function launchTone(state?: GameSnapshot['launchState']): 'good' | 'warn' | 'neutral' {
  if (state === 'running') {
    return 'good';
  }

  if (state === 'starting') {
    return 'warn';
  }

  return 'neutral';
}

function healthTone(snapshot: GameSnapshot | null): 'good' | 'warn' | 'neutral' {
  if (!snapshot?.gameRoot) {
    return 'neutral';
  }

  return snapshot.health.healthy ? 'good' : 'warn';
}

function formatDate(value?: string): string {
  if (!value) {
    return '日期未提供';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function releaseBodyLines(value?: string): string[] {
  if (!value?.trim()) {
    return ['暂无发布说明。'];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatProgressTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function Section(props: { title: string; subtitle?: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={`panel ${props.compact ? 'panel--compact' : ''}`}>
      <div className="panel__head">
        <div>
          <h2>{props.title}</h2>
          {props.subtitle ? <p>{props.subtitle}</p> : null}
        </div>
      </div>
      {props.children}
    </section>
  );
}

function PathBlock(props: { label: string; value: string; empty: string; onOpen?: () => void }) {
  return (
    <div className="path-block">
      <span>{props.label}</span>
      <code>{props.value || props.empty}</code>
      {props.onOpen ? (
        <button className="btn btn--small" onClick={props.onOpen} disabled={!props.value}>
          打开
        </button>
      ) : null}
    </div>
  );
}

function HealthList(props: { health: GameHealth }) {
  if (props.health.checks.length === 0) {
    return <div className="empty-state">暂无自检结果。</div>;
  }

  return (
    <div className="health-list">
      {props.health.checks.map((check) => (
        <div key={check.key} className={`health-row ${check.ok ? 'health-row--ok' : 'health-row--warn'}`}>
          <strong>{check.label}</strong>
          <span>{check.detail}</span>
        </div>
      ))}
    </div>
  );
}

function LogPreview(props: { title: string; body: string }) {
  return (
    <div className="log-box">
      <div className="log-box__head">
        <strong>{props.title}</strong>
      </div>
      <pre>{props.body}</pre>
    </div>
  );
}

function ProgressList(props: { events: UpdateProgressEvent[] }) {
  if (props.events.length === 0) {
    return <div className="empty-state">暂无更新进度。</div>;
  }

  return (
    <div className="progress-list">
      {props.events.map((event, index) => (
        <div key={`${event.timestamp}-${index}`} className="progress-row">
          <span>{formatProgressTime(event.timestamp)}</span>
          <strong>{event.stage}</strong>
          <p>{event.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function AppRedesign() {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [settings, setSettings] = useState<VisibleSettings>(defaultSettings());
  const [activePage, setActivePage] = useState<PageKey>('overview');
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState('正在加载...');
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<UpdateCheckResult | null>(null);
  const [releaseHistory, setReleaseHistory] = useState<ReleaseHistoryItem[]>([]);
  const [startupLogText, setStartupLogText] = useState('尚未读取 startup.log。');
  const [otaLogText, setOtaLogText] = useState('尚未读取 ota-update.log。');
  const [updateProgressEvents, setUpdateProgressEvents] = useState<UpdateProgressEvent[]>([]);
  const [customTalentPack, setCustomTalentPack] = useState<CustomTalentPack>(() => createEmptyCustomTalentPack());
  const [customTalentLoadError, setCustomTalentLoadError] = useState<string | null>(null);

  const activePageItem = pages.find((page) => page.key === activePage) ?? pages[0];
  const health = snapshot?.health ?? emptyHealth();
  const gameRoot = snapshot?.gameRoot ?? '';
  const payloadRoot = snapshot?.payloadRoot ?? '';
  const userDataRoot = snapshot?.userDataRoot ?? '';
  const gameInstalled = snapshot?.gameInstalled ?? false;
  const launchBusy = snapshot?.launchState === 'starting' || snapshot?.launchState === 'running';
  const launchReady = snapshot?.launchReady ?? false;
  const latestRelease = releaseHistory.find((release) => release.isLatest) ?? releaseHistory[0] ?? null;

  const dirtySummary = useMemo(() => {
    if (!snapshot) {
      return '正在加载配置';
    }

    return JSON.stringify(snapshot.visibleSettings) === JSON.stringify(settings) ? '配置已同步' : '有未保存更改';
  }, [settings, snapshot]);

  const updateSetting = <K extends keyof VisibleSettings>(key: K, value: VisibleSettings[K]) => {
    setSettings((current) => mergeSettings(current, { [key]: value } as Partial<VisibleSettings>));
  };

  const showError = (nextError: string) => {
    setError(nextError);
    setMessage('操作失败。');
  };

  const refreshLogs = async () => {
    const [startup, ota] = await Promise.all([window.longyin.readLogFile('startup'), window.longyin.readLogFile('ota')]);
    setStartupLogText(startup);
    setOtaLogText(ota);
  };

  const refreshCustomTalents = async (targetGameRoot?: string) => {
    if (!targetGameRoot) {
      setCustomTalentPack(createEmptyCustomTalentPack());
      setCustomTalentLoadError(null);
      return;
    }

    try {
      const pack = await window.longyin.getCustomTalents();
      setCustomTalentPack(pack);
      setCustomTalentLoadError(null);
    }
    catch (err) {
      setCustomTalentPack(createEmptyCustomTalentPack());
      setCustomTalentLoadError(err instanceof Error ? err.message : String(err));
    }
  };

  const refresh = async (syncSettings = true) => {
    const next = await window.longyin.getSnapshot();
    setSnapshot(next);
    setUpdate(next.update);
    if (syncSettings) {
      setSettings(next.visibleSettings);
    }
    setMessage(next.status || '准备就绪');
    return next;
  };

  const run = async (label: string, action: () => Promise<any>) => {
    setWorking(label);
    setError(null);
    setMessage(label);
    try {
      const result = await action();
      if (result?.updatedSnapshot) {
        setSnapshot(result.updatedSnapshot);
        setSettings(result.updatedSnapshot.visibleSettings);
        setUpdate(result.updatedSnapshot.update);
      }
      else {
        await refresh(label !== '保存设置');
      }
      setMessage(result?.message ?? `${label}完成。`);
      return result;
    }
    catch (err) {
      showError(err instanceof Error ? err.message : String(err));
      return undefined;
    }
    finally {
      setWorking(null);
    }
  };

  useEffect(() => {
    void refresh().catch((err: Error) => showError(err.message));
    void window.longyin.getReleaseHistory().then(setReleaseHistory).catch(() => undefined);
    void refreshLogs().catch(() => undefined);
  }, []);

  useEffect(() => {
    void refreshCustomTalents(gameRoot).catch(() => undefined);
  }, [gameRoot]);

  useEffect(() => {
    if (!snapshot) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void refresh(false).catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [snapshot]);

  useEffect(() => {
    const unsubscribe = window.longyin.onUpdateProgress((event) => {
      setUpdateProgressEvents((current) => [...current.slice(-7), event]);
      setMessage(event.detail);
      if (event.stage === 'error') {
        setError(event.detail);
      }
    });
    return unsubscribe;
  }, []);

  const save = () => run('保存设置', () => window.longyin.saveSettings(settings));
  const saveAndLaunch = () => run('保存并启动', () => window.longyin.saveAndLaunch(settings));
  const launch = () => run('启动游戏', () => window.longyin.launch());
  const install = () => run(gameInstalled ? '修复模组' : '安装模组', () => window.longyin.install());
  const uninstall = () => run('卸载模组', () => window.longyin.uninstall());
  const pickGameRoot = () => run('选择游戏目录', () => window.longyin.pickGameRoot());
  const checkUpdates = () =>
    run('检查更新', async () => {
      const next = await window.longyin.checkUpdates();
      setUpdate(next);
      const history = await window.longyin.getReleaseHistory().catch(() => releaseHistory);
      setReleaseHistory(history);
      return { message: next.status ?? '更新检查完成。' };
    });
  const applyUpdate = () => run('下载更新中', () => window.longyin.applyUpdate());
  const openPath = (targetPath: string) => {
    if (targetPath) {
      void window.longyin.openPath(targetPath);
    }
  };
  const openReleasePage = () => {
    const url = update?.releaseUrl ?? latestRelease?.htmlUrl;
    if (url) {
      void window.longyin.openExternal(url);
    }
  };

  if (!snapshot) {
    return (
      <div className="redesign-loading">
        <div>正在加载 龙胤立志传 Pro Max...</div>
      </div>
    );
  }

  return (
    <div className="redesign-shell">
      <aside className="redesign-sidebar">
        <div className="brand-block">
          <span>LongYin Pro Max</span>
          <h1>模组控制台</h1>
          <p>集中配置、保存、启动和维护。</p>
        </div>

        <nav className="page-nav" aria-label="功能分组">
          {pages.map((page) => (
            <button
              key={page.key}
              className={`page-nav__item ${activePage === page.key ? 'page-nav__item--active' : ''}`}
              onClick={() => setActivePage(page.key)}
            >
              <strong>{page.title}</strong>
              <span>{page.subtitle}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="redesign-main">
        <header className="topbar">
          <div>
            <span className="topbar__eyebrow">当前分组</span>
            <h2>{activePageItem.title}</h2>
            <p>{activePageItem.subtitle}</p>
          </div>
          <div className="topbar__actions">
            <button className="btn" onClick={pickGameRoot} disabled={working !== null}>
              {gameRoot ? '更换目录' : '选择目录'}
            </button>
            <button className="btn" onClick={save} disabled={working !== null || !gameRoot}>
              保存
            </button>
            <button className="btn btn--primary" onClick={saveAndLaunch} disabled={working !== null || !launchReady}>
              {launchBusy ? '启动中' : '保存并启动'}
            </button>
          </div>
        </header>

        <section className="status-grid">
          <StatusPill label="应用版本" value={snapshot.appVersion} tone="good" />
          <StatusPill label="游戏目录" value={gameRoot ? '已连接' : '未选择'} tone={gameRoot ? 'good' : 'warn'} />
          <StatusPill label="模组状态" value={gameInstalled ? '已就绪' : gameRoot ? '需修复' : '未安装'} tone={gameInstalled ? 'good' : 'warn'} />
          <StatusPill label="启动状态" value={launchLabel(snapshot.launchState)} tone={launchTone(snapshot.launchState)} />
          <StatusPill label="环境自检" value={health.summary} tone={healthTone(snapshot)} />
          <StatusPill label="配置状态" value={dirtySummary} tone={dirtySummary === '配置已同步' ? 'good' : 'warn'} />
        </section>

        <section className="message-strip">
          <strong>{working ?? '状态'}</strong>
          <span>{message}</span>
        </section>

        {error ? (
          <section className="error-strip">
            <strong>最近错误</strong>
            <span>{error}</span>
            <button className="btn btn--small" onClick={() => setError(null)}>
              关闭
            </button>
          </section>
        ) : null}

        <div className="content-scroll">
          {activePage === 'overview' ? (
            <div className="content-grid content-grid--overview">
              <Section title="启动工作台" subtitle="先确认目录，再保存和启动。">
                <div className="action-grid">
                  <button className="btn btn--primary" onClick={saveAndLaunch} disabled={working !== null || !launchReady}>
                    保存并启动
                  </button>
                  <button className="btn" onClick={launch} disabled={working !== null || !launchReady}>
                    启动游戏
                  </button>
                  <button className="btn" onClick={install} disabled={working !== null || !gameRoot || launchBusy}>
                    {gameInstalled ? '修复模组' : '安装模组'}
                  </button>
                  <button className="btn" onClick={() => void refresh()} disabled={working !== null}>
                    刷新状态
                  </button>
                </div>
                <div className="path-stack">
                  <PathBlock label="游戏目录" value={gameRoot} empty="尚未选择游戏目录" onOpen={() => openPath(gameRoot)} />
                  <PathBlock label="载荷目录" value={payloadRoot} empty="未找到载荷目录" onOpen={() => openPath(payloadRoot)} />
                </div>
              </Section>

              <Section title="常用快捷配置" subtitle="首页只放最常调的项目。">
                <div className="settings-grid">
                  <CheckboxField label="锁定探索体力" value={settings.lockStamina} onChange={(value) => updateSetting('lockStamina', value)} />
                  <CheckboxField label="启动时开启战斗加速" value={settings.battleTurboEnabled} onChange={(value) => updateSetting('battleTurboEnabled', value)} />
                  <NumberField label="书籍经验倍率" value={settings.expMultiplier} onChange={(value) => updateSetting('expMultiplier', value)} min={1} max={999} step={1} />
                  <NumberField label="创建角色点数倍率" value={settings.creationPointMultiplier} onChange={(value) => updateSetting('creationPointMultiplier', value)} min={1} max={999} step={1} />
                  <NumberField label="战斗武学经验倍率" value={settings.battleSkillExpMultiplier} onChange={(value) => updateSetting('battleSkillExpMultiplier', value)} min={1} max={999} step={1} />
                  <NumberField label="坐骑体力倍率" value={settings.horseStaminaMultiplier} onChange={(value) => updateSetting('horseStaminaMultiplier', value)} min={0.01} max={999} step={0.25} />
                  <NumberField label="商人现金下限" value={settings.merchantCarryCash} onChange={(value) => updateSetting('merchantCarryCash', value)} min={0} max={999999999} step={1000} />
                </div>
              </Section>

              <Section title="自检摘要" subtitle={health.needsRepair ? '检测到载荷可能需要修复。' : '当前环境检查结果。'}>
                <HealthList health={{ ...health, checks: health.checks.slice(0, 6) }} />
              </Section>
            </div>
          ) : null}

          {activePage === 'common' ? (
            <Section title="常用配置" subtitle="把最容易反复调整的功能放在一屏里。">
              <div className="settings-grid settings-grid--dense">
                <CheckboxField label="锁定探索体力" value={settings.lockStamina} onChange={(value) => updateSetting('lockStamina', value)} />
                <CheckboxField label="锁定坐骑加速体力" value={settings.lockHorseTurboStamina} onChange={(value) => updateSetting('lockHorseTurboStamina', value)} />
                <CheckboxField label="启动时开启战斗加速" value={settings.battleTurboEnabled} onChange={(value) => updateSetting('battleTurboEnabled', value)} />
                <NumberField label="书籍经验倍率" value={settings.expMultiplier} onChange={(value) => updateSetting('expMultiplier', value)} min={1} max={999} step={1} />
                <NumberField label="创建角色点数倍率" value={settings.creationPointMultiplier} onChange={(value) => updateSetting('creationPointMultiplier', value)} min={1} max={999} step={1} />
                <NumberField label="战斗武学经验倍率" value={settings.battleSkillExpMultiplier} onChange={(value) => updateSetting('battleSkillExpMultiplier', value)} min={1} max={999} step={1} />
                <SelectField label="战斗加速快捷键" value={settings.battleTurboHotkey} onChange={(value) => updateSetting('battleTurboHotkey', clampText(value))} options={BATTLE_TURBO_HOTKEYS} />
                <NumberField label="坐骑体力倍率" value={settings.horseStaminaMultiplier} onChange={(value) => updateSetting('horseStaminaMultiplier', value)} min={0.01} max={999} step={0.25} />
                <NumberField label="商人现金下限" value={settings.merchantCarryCash} onChange={(value) => updateSetting('merchantCarryCash', value)} min={0} max={999999999} step={1000} />
              </div>
            </Section>
          ) : null}

          {activePage === 'growth' ? (
            <div className="content-grid">
              <Section title="经验与创建角色" subtitle="创建角色点数倍率对应 [CharacterCreation] PointMultiplier。">
                <div className="settings-grid">
                  <NumberField label="书籍经验倍率" value={settings.expMultiplier} onChange={(value) => updateSetting('expMultiplier', value)} min={1} max={999} step={1} />
                  <NumberField label="战斗武学经验倍率" value={settings.battleSkillExpMultiplier} onChange={(value) => updateSetting('battleSkillExpMultiplier', value)} min={1} max={999} step={1} />
                  <NumberField label="创建角色点数倍率" value={settings.creationPointMultiplier} onChange={(value) => updateSetting('creationPointMultiplier', value)} min={1} max={999} step={1} />
                </div>
              </Section>
              <Section title="心悟机制">
                <div className="settings-grid">
                  <NumberField label="心悟触发几率" value={settings.dailySkillInsightChancePercent} onChange={(value) => updateSetting('dailySkillInsightChancePercent', value)} min={0} max={100} step={1} suffix="%" />
                  <NumberField label="心悟经验值比率" value={settings.dailySkillInsightExpPercent} onChange={(value) => updateSetting('dailySkillInsightExpPercent', value)} min={0} max={999} step={0.5} suffix="%" />
                  <NumberField label="心悟触发频率" value={settings.dailySkillInsightRealtimeIntervalSeconds} onChange={(value) => updateSetting('dailySkillInsightRealtimeIntervalSeconds', value)} min={0} max={999} step={0.5} suffix="秒" />
                  <CheckboxField label="心悟经验值按武学品级调整" value={settings.dailySkillInsightUseRarityScaling} onChange={(value) => updateSetting('dailySkillInsightUseRarityScaling', value)} />
                </div>
              </Section>
              <Section title="突破成功额外天赋">
                <div className="settings-grid">
                  <CheckboxField label="启用突破成功额外天赋" value={settings.skillTalentEnabled} onChange={(value) => updateSetting('skillTalentEnabled', value)} />
                  <CheckboxField label="仅玩家角色" value={settings.skillTalentPlayerOnly} onChange={(value) => updateSetting('skillTalentPlayerOnly', value)} />
                  <NumberField label="武学等级触发" value={settings.skillTalentLevelThreshold} onChange={(value) => updateSetting('skillTalentLevelThreshold', value)} min={1} max={999} step={1} />
                  <NumberField label="品级天赋倍率" value={settings.skillTalentTierPointMultiplier} onChange={(value) => updateSetting('skillTalentTierPointMultiplier', value)} min={0.1} max={999} step={0.25} />
                </div>
              </Section>
            </div>
          ) : null}

          {activePage === 'explore' ? (
            <div className="content-grid">
              <Section title="探索辅助">
                <div className="settings-grid">
                  <CheckboxField label="锁定探索体力" value={settings.lockStamina} onChange={(value) => updateSetting('lockStamina', value)} />
                </div>
              </Section>
              <Section title="世界地图坐骑">
                <div className="settings-grid">
                  <CheckboxField label="锁定加速体力" value={settings.lockHorseTurboStamina} onChange={(value) => updateSetting('lockHorseTurboStamina', value)} />
                  <NumberField label="坐骑体力倍率" value={settings.horseStaminaMultiplier} onChange={(value) => updateSetting('horseStaminaMultiplier', value)} min={0.01} max={999} step={0.25} />
                  <NumberField label="基础速度倍率" value={settings.horseBaseSpeedMultiplier} onChange={(value) => updateSetting('horseBaseSpeedMultiplier', value)} min={0.01} max={999} step={0.25} />
                  <NumberField label="加速速度倍率" value={settings.horseTurboSpeedMultiplier} onChange={(value) => updateSetting('horseTurboSpeedMultiplier', value)} min={0.01} max={999} step={0.25} />
                  <NumberField label="加速持续倍率" value={settings.horseTurboDurationMultiplier} onChange={(value) => updateSetting('horseTurboDurationMultiplier', value)} min={0.01} max={999} step={0.25} />
                  <NumberField label="加速冷却倍率" value={settings.horseTurboCooldownMultiplier} onChange={(value) => updateSetting('horseTurboCooldownMultiplier', value)} min={0.01} max={999} step={0.25} />
                </div>
              </Section>
            </div>
          ) : null}

          {activePage === 'battle' ? (
            <div className="content-grid">
              <Section title="战斗节奏">
                <div className="settings-grid">
                  <CheckboxField label="启动时开启战斗加速" value={settings.battleTurboEnabled} onChange={(value) => updateSetting('battleTurboEnabled', value)} />
                  <SelectField label="战斗加速快捷键" value={settings.battleTurboHotkey} onChange={(value) => updateSetting('battleTurboHotkey', clampText(value))} options={BATTLE_TURBO_HOTKEYS} />
                </div>
              </Section>
              <Section title="辩论与对酒">
                <div className="settings-grid">
                  <NumberField label="辩论我方伤害倍率" value={settings.debatePlayerDamageTakenMultiplier} onChange={(value) => updateSetting('debatePlayerDamageTakenMultiplier', value)} min={0} max={999} step={0.25} />
                  <NumberField label="辩论敌方伤害倍率" value={settings.debateEnemyDamageTakenMultiplier} onChange={(value) => updateSetting('debateEnemyDamageTakenMultiplier', value)} min={0} max={999} step={0.25} />
                  <NumberField label="对酒我方伤害倍率" value={settings.drinkPlayerPowerCostMultiplier} onChange={(value) => updateSetting('drinkPlayerPowerCostMultiplier', value)} min={0} max={999} step={0.25} />
                  <NumberField label="对酒敌方伤害倍率" value={settings.drinkEnemyPowerCostMultiplier} onChange={(value) => updateSetting('drinkEnemyPowerCostMultiplier', value)} min={0} max={999} step={0.25} />
                </div>
              </Section>
            </div>
          ) : null}

          {activePage === 'trade' ? (
            <div className="content-grid">
              <Section title="交易与背包">
                <div className="settings-grid">
                  <NumberField label="商人现金下限" value={settings.merchantCarryCash} onChange={(value) => updateSetting('merchantCarryCash', value)} min={0} max={999999999} step={1000} />
                  <CheckboxField label="珍宝自动加入购物车" value={settings.treasureAutoTradeEnabled} onChange={(value) => updateSetting('treasureAutoTradeEnabled', value)} />
                  <NumberField label="幸运返利命中概率" value={settings.luckyHitChancePercent} onChange={(value) => updateSetting('luckyHitChancePercent', value)} min={0} max={100} step={1} suffix="%" />
                  <CheckboxField label="忽略负重" value={settings.ignoreCarryWeight} onChange={(value) => updateSetting('ignoreCarryWeight', value)} />
                  <NumberField label="负重上限" value={settings.carryWeightCap} onChange={(value) => updateSetting('carryWeightCap', value)} min={0} max={999999999} step={1000} />
                </div>
              </Section>
              <Section title="制造增产">
                <div className="settings-grid">
                  <CheckboxField label="追加材料按大阶增产" value={settings.craftRandomPickUpgrade} onChange={(value) => updateSetting('craftRandomPickUpgrade', value)} />
                  <NumberField label="一阶额外数量" value={settings.craftTier1ExtraItems} onChange={(value) => updateSetting('craftTier1ExtraItems', value)} min={0} max={999} step={1} />
                  <NumberField label="二阶额外数量" value={settings.craftTier2ExtraItems} onChange={(value) => updateSetting('craftTier2ExtraItems', value)} min={0} max={999} step={1} />
                  <NumberField label="三阶额外数量" value={settings.craftTier3ExtraItems} onChange={(value) => updateSetting('craftTier3ExtraItems', value)} min={0} max={999} step={1} />
                  <NumberField label="四阶额外数量" value={settings.craftTier4ExtraItems} onChange={(value) => updateSetting('craftTier4ExtraItems', value)} min={0} max={999} step={1} />
                  <NumberField label="五阶额外数量" value={settings.craftTier5ExtraItems} onChange={(value) => updateSetting('craftTier5ExtraItems', value)} min={0} max={999} step={1} />
                </div>
              </Section>
            </div>
          ) : null}

          {activePage === 'social' ? (
            <div className="content-grid">
              <Section title="聊天与互动">
                <div className="settings-grid">
                  <NumberField label="每月对话次数倍率" value={settings.dialogMonthlyLimitMultiplier} onChange={(value) => updateSetting('dialogMonthlyLimitMultiplier', value)} min={0} max={999} step={1} />
                  <CheckboxField label="启用剧情快进辅助" value={settings.dialogFastForwardAssistEnabled} onChange={(value) => updateSetting('dialogFastForwardAssistEnabled', value)} />
                  <NumberField label="额外好感增长" value={settings.extraRelationshipGainChancePercent} onChange={(value) => updateSetting('extraRelationshipGainChancePercent', value)} min={0} max={100} step={1} suffix="%" />
                </div>
              </Section>
              <Section title="关系与组队">
                <div className="settings-grid">
                  <CheckboxField label="队友每日自动加好感" value={settings.teamAutoFavorEnabled} onChange={(value) => updateSetting('teamAutoFavorEnabled', value)} />
                  <NumberField label="队友每日自动加好感点数" value={settings.teamAutoFavorPerDay} onChange={(value) => updateSetting('teamAutoFavorPerDay', value)} min={0} max={999} step={1} />
                  <NumberField label="伴侣上限" value={settings.maxLoverCount} onChange={(value) => updateSetting('maxLoverCount', value)} min={1} max={999} step={1} />
                </div>
              </Section>
            </div>
          ) : null}

          {activePage === 'customTalent' ? (
            <div className="content-grid">
              <Section title="自定义天赋状态" subtitle="第一版新 UI 先展示状态；完整编辑器后续单独迁移。">
                {customTalentLoadError ? <div className="error-strip"><strong>读取失败</strong><span>{customTalentLoadError}</span></div> : null}
                <div className="metric-grid">
                  <div className="metric-card"><span>天赋数量</span><strong>{customTalentPack.talents.length}</strong></div>
                  <div className="metric-card"><span>已启用</span><strong>{customTalentPack.talents.filter((talent) => talent.enabled).length}</strong></div>
                  <div className="metric-card"><span>配置版本</span><strong>{customTalentPack.version}</strong></div>
                </div>
                <div className="talent-list-preview">
                  {customTalentPack.talents.length > 0 ? customTalentPack.talents.map((talent) => (
                    <div key={talent.id} className="talent-preview-row">
                      <strong>{talent.name || '未命名天赋'}</strong>
                      <span>{talent.enabled ? '启用' : '禁用'} · {talent.conditions.length} 条条件 · {talent.effects.length} 条效果</span>
                    </div>
                  )) : <div className="empty-state">暂无自定义天赋。</div>}
                </div>
              </Section>
            </div>
          ) : null}

          {activePage === 'maintenance' ? (
            <div className="content-grid">
              <Section title="目录与自检">
                <div className="path-stack">
                  <PathBlock label="游戏目录" value={gameRoot} empty="尚未选择游戏目录" onOpen={() => openPath(gameRoot)} />
                  <PathBlock label="载荷目录" value={payloadRoot} empty="未找到载荷目录" onOpen={() => openPath(payloadRoot)} />
                  <PathBlock label="日志目录" value={userDataRoot} empty="未找到日志目录" onOpen={() => openPath(userDataRoot)} />
                </div>
                <HealthList health={health} />
              </Section>
              <Section title="更新与日志">
                <div className="action-grid">
                  <button className="btn" onClick={checkUpdates} disabled={working !== null}>检查更新</button>
                  <button className="btn" onClick={applyUpdate} disabled={working !== null || !update?.updateAvailable}>应用更新</button>
                  <button className="btn" onClick={openReleasePage} disabled={!update?.releaseUrl && !latestRelease?.htmlUrl}>打开发布页</button>
                  <button className="btn" onClick={() => void refreshLogs()} disabled={working !== null}>刷新日志</button>
                  <button className="btn" onClick={() => openPath(snapshot.startupLogPath)} disabled={!snapshot.startupLogPath}>打开 startup.log</button>
                  <button className="btn" onClick={() => openPath(snapshot.otaLogPath)} disabled={!snapshot.otaLogPath}>打开 ota-update.log</button>
                  <button className="btn btn--danger" onClick={uninstall} disabled={working !== null || !gameRoot || launchBusy}>卸载模组</button>
                </div>
                <div className="release-box">
                  <strong>{update?.updateAvailable ? `发现新版本 ${update.latestVersion}` : `当前版本 ${update?.currentVersion ?? snapshot.appVersion}`}</strong>
                  <span>{formatDate(update?.publishedAt ?? latestRelease?.publishedAt)}</span>
                  <ul>
                    {releaseBodyLines(update?.releaseBody ?? latestRelease?.body).slice(0, 8).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <ProgressList events={updateProgressEvents} />
                <div className="log-grid">
                  <LogPreview title="startup.log" body={startupLogText} />
                  <LogPreview title="ota-update.log" body={otaLogText} />
                </div>
              </Section>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
