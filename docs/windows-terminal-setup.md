# Windows Terminal 配置流程

这份流程用于在新的 Windows 11 机器或 Parallels Windows 11 ARM 虚拟机里快速恢复当前终端体验：

- 安装 Oh My Posh
- 安装 zoxide
- 安装已经下载好的 Nerd Font
- 配置 PowerShell `$PROFILE`
- 添加常用 Git alias
- 添加历史搜索、预测补全和 `Ctrl+U` 等快捷键

## 一键脚本

在仓库根目录执行：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows-terminal.ps1
```

脚本默认安装仓库内置的四个 MesloLGM Nerd Font 文件：

```text
assets\fonts\Meslo\MesloLGMNerdFont-Regular.ttf
assets\fonts\Meslo\MesloLGMNerdFont-Bold.ttf
assets\fonts\Meslo\MesloLGMNerdFont-Italic.ttf
assets\fonts\Meslo\MesloLGMNerdFont-BoldItalic.ttf
```

如果新机器还没有 Neovim，可以顺手安装：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows-terminal.ps1 -InstallNeovim
```

如果不想安装 zoxide：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows-terminal.ps1 -SkipZoxide
```

如果你想改用其他字体，也可以手动传 zip 或目录：

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows-terminal.ps1 -FontPath "C:\Users\razor\Downloads\Meslo"
```

脚本会写入当前 PowerShell 的 profile：

```powershell
$PROFILE
```

如果你在 PowerShell 7 里运行脚本，它会配置 PowerShell 7 的 `$PROFILE`。

## Windows Terminal 字体设置

脚本安装字体后，还需要在 Windows Terminal 里选择 Nerd Font：

```text
Settings -> Defaults -> Appearance -> Font face
```

选择其中一个：

```text
MesloLGM Nerd Font
MesloLGM NF
CaskaydiaCove Nerd Font
```

建议改 `Defaults`，不要只改某一个 Profile。否则容易出现 `Windows PowerShell` 有图标、`PowerShell` 没图标的问题。

改完后关闭所有 Windows Terminal 窗口，重新打开。

## 配置内容

脚本会加入这些功能：

```powershell
vz   # 用 nvim 编辑 PowerShell profile
sz   # 重新加载 PowerShell profile

gst  # git status
gco  # git checkout
gcb  # git checkout -b
gb   # git branch
gba  # git branch -a
ga   # git add
gaa  # git add -A
gcmsg # git commit -m
gp   # git push
gll  # git pull
glo  # git log --oneline --decorate --graph
gd   # git diff
gds  # git diff --staged
```

没有使用 `gl` 作为 `git pull`，因为 PowerShell 里 `gl` 常常是内置 alias `Get-Location`。

快捷键：

```text
UpArrow    按当前输入前缀向上搜索历史
DownArrow  按当前输入前缀向下搜索历史
RightArrow 接受灰色历史建议
Ctrl+U     删除光标前内容
Ctrl+K     删除光标后内容
Ctrl+W     删除前一个单词
Ctrl+A     跳到行首
Ctrl+E     跳到行尾
```

zoxide 用法：

```powershell
cd C:\Users\razor\longyin_plus
cd C:\Users\razor\Downloads
z longyin
z downloads
```

## 手动编辑

以后编辑配置：

```powershell
vz
```

或者直接：

```powershell
nvim $PROFILE
```

改完后重新加载：

```powershell
sz
```

或者：

```powershell
. $PROFILE
```

## 排查

查看当前 PowerShell 版本：

```powershell
$PSVersionTable.PSVersion
```

查看当前 profile 路径：

```powershell
$PROFILE
$PROFILE | Format-List * -Force
```

检查 alias 或函数是否生效：

```powershell
Get-Command gll -All
Get-Command gst -All
```

如果图标丢失，优先检查 Windows Terminal 当前打开的 Profile 是 `PowerShell` 还是 `Windows PowerShell`，以及该 Profile 是否真的使用了 Nerd Font。
