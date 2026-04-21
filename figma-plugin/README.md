# FolioBox Figma Import

把 FolioBox 项目编辑器导出的 JSON 导入到当前 Figma 页面。

## 安装方式

1. 在 FolioBox 项目编辑器点击“导出到 Figma”
2. 先下载 `foliobox-figma-plugin.zip`
3. 解压后进入 `FolioBox-Figma-Plugin`
4. 在 Figma 中打开 `Plugins -> Development -> Import plugin from manifest...`
5. 选择解压目录里的 `manifest.json`

## 使用方式

1. 在 FolioBox 项目编辑器点击“另存为导出文件”，保存当前项目的 `.json`
2. 回到 Figma，运行 `FolioBox Figma Import`
3. 选择刚保存的 `.json` 文件
4. 插件会在当前页面生成可编辑图层

## 当前支持

- 项目级单向导出
- Frame
- 文本
- 图片
- 基础形状

## 当前限制

- 不支持从 Figma 回写 FolioBox
- 图片 crop 仅保留 `fit` / `fill`，暂不精确还原偏移
- 复杂字体会尽量匹配，找不到时回退到 `Inter`
