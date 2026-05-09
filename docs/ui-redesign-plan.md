# LongYin Pro Max UI 改造设计

## 目标

当前 Electron 启动器的功能是可用的，但页面切得较碎，很多页面信息密度偏低，部分命名也容易误解，例如“创作点倍率”实际对应的是创建角色点数倍率。

本次 UI 改造目标是：

- 减少页面切换，把相关配置集中展示。
- 保留原作者的安装、启动、配置读写、OTA、自检逻辑。
- 不改动游戏内 Mod 插件 DLL 和 BepInEx 载荷。
- 让后续同步原作者更新时尽量少冲突。
- 提高配置项命名的准确性，让玩家能看懂每项功能影响什么。

## 非目标

本次不做以下事情：

- 不修改 `mod-src/LongYinStaminaLock/LongYinStaminaLock.cs`。
- 不修改 `dist/BepInEx/plugins/*.dll`。
- 不直接编辑发布包里的 `.exe`、`.dll`、`.asar`。
- 不重写 `electron-app/src/main.ts` 的安装和启动逻辑。
- 不重写 `electron-app/src/shared/config.ts` 的配置读写协议，除非后续发现现有接口不能满足新 UI。

## 兼容策略

采用“保留原 UI，新增新 UI”的方式，减少与上游更新的冲突。

保留：

```text
electron-app/src/renderer/App.tsx
electron-app/src/renderer/styles.css
```

新增：

```text
electron-app/src/renderer/AppRedesign.tsx
electron-app/src/renderer/redesign.css
```

最小入口变更：

```text
electron-app/src/renderer/main.tsx
```

`main.tsx` 只负责把启动组件从原 `App` 切到 `AppRedesign`。这样以后原作者更新 `App.tsx` 时，我们可以先保留更新，再决定是否把新增配置同步到新 UI。

## 保留的数据接口

新 UI 继续使用现有 preload API，不绕过主进程直接读写游戏目录：

```ts
window.longyin.getSnapshot()
window.longyin.saveSettings(settings)
window.longyin.saveAndLaunch(settings)
window.longyin.install()
window.longyin.uninstall()
window.longyin.launch()
window.longyin.pickGameRoot()
window.longyin.openGameRoot()
window.longyin.openPayloadRoot()
window.longyin.checkUpdates()
window.longyin.applyUpdate()
window.longyin.getCustomTalents()
window.longyin.saveCustomTalents(pack)
```

配置数据仍以 `VisibleSettings` 为主，不新增一套 UI 私有配置模型。

## 新 UI 总体结构

新 UI 使用一个更密集的工作台布局：

```text
顶部操作栏
  游戏目录 / 模组状态 / 保存 / 保存并启动 / 启动 / 安装或修复

左侧分组导航
  总览
  常用配置
  成长与角色
  探索与大地图
  战斗与小游戏
  交易与制造
  社交与关系
  自定义天赋
  维护与更新

右侧内容区
  当前分组的配置卡片，支持纵向滚动

底部状态区
  最近操作结果 / 自检摘要 / 错误提示
```

核心变化是：页面可以保留分组，但每个分组内展示更多相关配置，不再一页只有一两个卡片。

## 首页设计

首页应该用于快速判断“能不能启动”和“常用配置是什么状态”。

首页包含：

- 游戏目录路径。
- 载荷目录路径。
- 当前应用版本。
- 模组安装状态。
- 环境自检摘要。
- 保存并启动主按钮。
- 安装/修复按钮。
- 打开游戏目录。
- 打开载荷目录。
- 常用配置快捷区：
  - 锁定探索体力。
  - 书籍经验倍率。
  - 创建角色点数倍率。
  - 战斗武学经验倍率。
  - 启动时开启战斗加速。
  - 坐骑体力倍率。
  - 商人现金下限。

## 配置项分组

### 常用配置

面向大多数玩家的高频设置：

- 锁定探索体力：`lockStamina`
- 书籍经验倍率：`expMultiplier`
- 创建角色点数倍率：`creationPointMultiplier`
- 战斗武学经验倍率：`battleSkillExpMultiplier`
- 启动时开启战斗加速：`battleTurboEnabled`
- 战斗加速快捷键：`battleTurboHotkey`
- 坐骑体力倍率：`horseStaminaMultiplier`
- 商人现金下限：`merchantCarryCash`

### 成长与角色

角色成长、经验、天赋相关设置：

- 书籍经验倍率：`expMultiplier`
- 战斗武学经验倍率：`battleSkillExpMultiplier`
- 创建角色点数倍率：`creationPointMultiplier`
- 心悟触发几率：`dailySkillInsightChancePercent`
- 心悟经验值比率：`dailySkillInsightExpPercent`
- 心悟经验值按武学品级调整：`dailySkillInsightUseRarityScaling`
- 心悟触发频率：`dailySkillInsightRealtimeIntervalSeconds`
- 启用突破成功额外天赋：`skillTalentEnabled`
- 仅玩家角色：`skillTalentPlayerOnly`
- 武学等级触发：`skillTalentLevelThreshold`
- 品级天赋倍率：`skillTalentTierPointMultiplier`

命名修正：

```text
创作点倍率 -> 创建角色点数倍率
```

### 探索与大地图

探索和世界地图移动相关设置：

- 锁定探索体力：`lockStamina`
- 锁定加速体力：`lockHorseTurboStamina`
- 坐骑体力倍率：`horseStaminaMultiplier`
- 基础速度倍率：`horseBaseSpeedMultiplier`
- 加速速度倍率：`horseTurboSpeedMultiplier`
- 加速持续倍率：`horseTurboDurationMultiplier`
- 加速冷却倍率：`horseTurboCooldownMultiplier`

### 战斗与小游戏

战斗速度、辩论、对酒相关设置：

- 启动时开启战斗加速：`battleTurboEnabled`
- 战斗加速快捷键：`battleTurboHotkey`
- 辩论我方伤害倍率：`debatePlayerDamageTakenMultiplier`
- 辩论敌方伤害倍率：`debateEnemyDamageTakenMultiplier`
- 对酒我方伤害倍率：`drinkPlayerPowerCostMultiplier`
- 对酒敌方伤害倍率：`drinkEnemyPowerCostMultiplier`

### 交易与制造

商店、背包、制造相关设置：

- 商人现金下限：`merchantCarryCash`
- 珍宝自动加入购物车：`treasureAutoTradeEnabled`
- 幸运返利命中概率：`luckyHitChancePercent`
- 忽略负重：`ignoreCarryWeight`
- 负重上限：`carryWeightCap`
- 追加材料按大阶增产：`craftRandomPickUpgrade`
- 一阶额外数量：`craftTier1ExtraItems`
- 二阶额外数量：`craftTier2ExtraItems`
- 三阶额外数量：`craftTier3ExtraItems`
- 四阶额外数量：`craftTier4ExtraItems`
- 五阶额外数量：`craftTier5ExtraItems`

### 社交与关系

对话、快进、关系相关设置：

- 每月对话次数倍率：`dialogMonthlyLimitMultiplier`
- 启用剧情快进辅助：`dialogFastForwardAssistEnabled`
- 额外好感增长：`extraRelationshipGainChancePercent`
- 队友每日自动加好感：`teamAutoFavorEnabled`
- 队友每日自动加好感点数：`teamAutoFavorPerDay`
- 伴侣上限：`maxLoverCount`

### 自定义天赋

保留原有自定义天赋能力，但优化布局：

- 左侧：天赋列表、启用状态、条件/效果摘要。
- 右侧：当前天赋编辑表单。
- 底部：校验结果和“应用到游戏配置”按钮。

自定义天赋仍写入：

```text
BepInEx/config/codex.longyin.custom-talents.json
```

### 维护与更新

把不常用但重要的维护功能集中：

- 环境自检详情。
- GitHub Release 更新检查。
- OTA 更新状态。
- 当前发布说明。
- 历史发布记录。
- 打开日志目录。
- 打开 `startup.log`。
- 打开 `ota-update.log`。
- 卸载模组。

## 组件设计

新 UI 需要的基础组件：

- `ShellLayout`：整体布局。
- `TopBar`：目录状态和主操作。
- `SideNav`：左侧分组导航。
- `StatusStrip`：自检、安装、启动状态。
- `Section`：配置分组容器。
- `SettingRow`：单个配置项布局。
- `NumberSetting`：数字输入。
- `ToggleSetting`：布尔开关。
- `SelectSetting`：快捷键和选项选择。
- `PathPanel`：目录展示和打开按钮。
- `ActionBar`：保存、启动、安装、卸载等操作。
- `LogPanel`：日志预览。

优先复用原 `components.tsx` 中已经存在的字段组件；只有当原组件布局不适合新 UI 时，再在 `AppRedesign.tsx` 或新组件文件里补轻量包装。

## 交互规则

- 修改配置后，顶部显示“有未保存更改”。
- `保存` 只写配置，不启动游戏。
- `保存并启动` 先保存，再启动。
- 如果未选择游戏目录，保存和启动相关按钮禁用。
- 如果环境自检失败，首页显示失败项，但仍允许用户进入维护页处理。
- 危险操作如卸载放在维护页，不放首页。
- 数字输入保留最小值、最大值、步进限制，和 `sanitizeVisibleSettings` 保持一致。

## 实现步骤

1. 新增 `AppRedesign.tsx` 和 `redesign.css`。
2. 从原 `App.tsx` 复用 snapshot 加载、settings 更新、自定义天赋读写等状态逻辑。
3. 先实现首页、常用配置、维护与更新。
4. 再迁移其余配置分组。
5. 修改 `main.tsx`，切换到 `AppRedesign`。
6. 运行 `npm run typecheck`。
7. 运行 `npm run build`。
8. 在 Windows 上用发布包验证：
   - 选择游戏目录。
   - 修改创建角色点数倍率。
   - 保存配置。
   - 确认 `BepInEx/config/codex.longyin.staminalock.cfg` 写入 `[CharacterCreation] PointMultiplier`。
   - 保存并启动游戏。

## 上游更新同步流程

以后同步原作者更新时，重点检查：

- `electron-app/src/shared/types.ts` 是否新增 `VisibleSettings` 字段。
- `electron-app/src/main.ts` preload/API 是否变化。
- `electron-app/src/shared/config.ts` 是否新增配置读写逻辑。
- 原 `App.tsx` 是否出现新的配置项或功能入口。

如果上游新增配置项，优先在新 UI 中补一个对应 `SettingRow`，不要修改原 UI 文件。

## 是否需要新增 agent.md

不需要。

原因：

- 当前源码仓库已经有 `AGENTS.md`。
- `Agent.md` 已明确废弃，并指向 `AGENTS.md` 作为唯一有效规则文件。
- 再新增新的 `agent.md` 会制造多个规则入口，增加维护和理解成本。

本次 UI 改造规则应写在本设计文档中；长期工程规则继续以 `AGENTS.md` 为准。
