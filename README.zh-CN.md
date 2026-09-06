# MOF 可视化 Skill

[![CI](https://github.com/tintin0617/mof-visualization-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/tintin0617/mof-visualization-skill/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md)

这是一个面向 Codex 的 Skill 和可复现 Node.js 工作流，用于把来源可追溯的 CIF 晶体坐标转换为经过结构校验的 MOF 三维可视化素材。

项目会记录 CIF 来源、保留框架化学结构、校验周期连接和金属配位，并生成透明静态图、四视角检查图以及真实三维旋转视频。

> **Alpha 状态：** 当前连接表只覆盖有限的元素对。任何新材料都应先补充经过审查的距离阈值、配位要求和测试，再视为受支持。

## 输出内容

- 默认 4096 × 4096 透明 PNG
- 四视角结构检查图
- 默认 3840 × 2160、24 fps、18 秒、H.264/yuv420p 无声视频
- 原始及处理后 CIF、来源元数据、校验报告和 SHA-256

动画直接使用三维坐标、旋转矩阵和透视投影，不以二维图片旋转模拟三维。

## 科学准确性

- 保留框架全部重原子、配体取代基、功能基团、金属节点和配位原子。
- 保持金属—配位原子—有机配体的连接连续。
- 氢、游离溶剂、客体和无序位置只能依据明确规则移除并留下记录。
- 比较原始结构与处理后结构的重原子数量。
- 使用周期最小镜像和元素对距离阈值校验连接。
- 结构校验失败时停止正式渲染。

本项目不对缺陷、活化状态、颗粒形貌、吸附性能或商业配方作出判断。

## 环境与安装

需要 Node.js 20 或更高版本、FFmpeg，以及合法取得且可追溯的 CIF。仓库不附带 CIF 数据；使用者需要自行核实来源条款和再分发权利。

```bash
git clone https://github.com/tintin0617/mof-visualization-skill.git
cd mof-visualization-skill
npm ci
```

如需安装 Codex Skill，请把 `skill/mof-visualization` 复制到 Codex 技能目录并命名为 `mof-visualization`，随后重新加载 Codex。

## 配置与执行

复制 `examples/configs/uio-66.example.json`，填写学术名称、来源引用、必要元素、必要连接和渲染模式。`id` 只允许小写字母、数字和短横线；首版支持 `cell` 与 `spherical`。

```bash
node skill/mof-visualization/scripts/acquire-structure.mjs --config material.json --input structure.cif --project-root .
node skill/mof-visualization/scripts/prepare-structure.mjs --config material.json --project-root .
node skill/mof-visualization/scripts/validate-structure.mjs --config material.json --project-root .
node skill/mof-visualization/scripts/render-material.mjs --config material.json --project-root .
```

迭代静态图时可使用 `--skip-video`。生成内容保存在 `materials/<id>/` 和 `outputs/`，默认不会进入 Git。

## 已知限制

当前连接表包含 C–C、C–N、C–O、Zn–N、Co–N 和 Zr–O。配色表中出现某种金属，不代表其连接关系已经受支持。

复杂无序、替代占位、未展开的空间群对称以及非常规 CIF 写法仍需要人工核查。增加新材料前，应补充可靠阈值、测试结构和配位断言，并检查静态图与四视角图。

## 开发与贡献

```bash
npm ci
npm test
npm run audit:public
```

`package.json` 保留 `private: true`，仅用于防止误发布到 npm，不影响 GitHub 公开和 MIT 授权。

贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md) 和 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 许可证

代码以 [MIT License](LICENSE) 发布。外部 CIF 数据仍受各自来源条款约束。
