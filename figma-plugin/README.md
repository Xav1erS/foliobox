# FolioBox Figma Import

开发版 Figma 插件，用来把 FolioBox 项目编辑器导出的 JSON 导入到当前 Figma 页面。

## 使用方式

1. 在 Figma 里打开 `Plugins -> Development -> Import plugin from manifest...`
2. 选择本目录下的 `manifest.json`
3. 在 FolioBox 项目编辑器点击“导出 Figma”
4. 回到 Figma，运行 `FolioBox Figma Import`
5. 选择刚下载的 JSON 文件

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
