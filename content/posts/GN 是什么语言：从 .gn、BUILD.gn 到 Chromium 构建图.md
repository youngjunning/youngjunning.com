---
id: "b284c1f2d77f992f"
title: "GN 是什么语言：从 .gn、BUILD.gn 到 Chromium 构建图"
description: "用最小 target 理解 GN 的 generation 阶段、作用域、依赖传播、参数、template 与 toolchain，区分生成图和执行构建。"
date: null
topic: "principles"
tags: ["构建"]
collection: "docs"
cover: "/media/b284c1f2d77f992f-bcb22beeb0751c3a.webp"
---

用最小 target 理解 GN 的 generation 阶段、作用域、依赖传播、参数、template 与 toolchain，区分生成图和执行构建。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

第一次进入 Chromium 源码时，`.gn`、`BUILD.gn` 和 `.gni` 很容易被看成“另一种配置文件”。这种理解只对了一半：GN 确实以声明为主，但它有自己的类型、作用域、控制流、模板、toolchain 和依赖传播语义。忽略这些语义，轻则把源文件加错 target，重则让代码只在一个平台或一种 component build 下侥幸通过。

这篇文章面向已经会写 C/C++、但还没有系统掌握 GN 的工程师。目标不是背完所有内置变量，而是建立一套能读懂 Chromium 构建图、正确添加 target、控制依赖传播并定位跨平台构建问题的方法。

![GN 语言与 Chromium 构建图封面](/media/b284c1f2d77f992f-bcb22beeb0751c3a.webp)

![从 GN 源码到可查询构建图](/media/b284c1f2d77f992f-9880d03a764ea18b.webp)

## 一句话结论

GN 是一门面向构建图生成的声明式 DSL。它在 generation 阶段执行 `.gn`、`BUILD.gn`、`.gni` 和 `args.gn` 中的代码，得到 target、config、toolchain 及依赖关系，再生成 Ninja 文件；真正的编译、链接、复制和代码生成由 Ninja 在 build 阶段执行。

因此，掌握 GN 的关键不是把它当成“简化版 Python”，而是始终区分四个对象：

```text
GN 代码
  -> generation 阶段求值
  -> target dependency graph
  -> Ninja rules
  -> 编译、链接、代码生成与最终制品
```

一个 `.cc` 文件存在于 checkout，只说明实现代码可被选择；它进入某个 target、经过特定 toolchain 编译并最终链接进 binary，才构成可验证的构建事实。

## `.gn` 到底是什么

严格来说，`.gn` 既可能指 GN 语言，也可能特指源码根目录的隐藏文件 `//.gn`。讨论时最好把两者分开：

| 文件 | 角色 | 典型内容 |
| --- | --- | --- |
| `//.gn` | 项目入口配置 | `buildconfig`、`secondary_source`、默认参数、检查范围、脚本 allowlist |
| `BUILD.gn` | 某个目录的 target 声明 | `source_set`、`static_library`、`executable`、`group`、`action` 及其依赖 |
| `*.gni` | 可通过 `import()` 复用的 GN 代码 | `declare_args()`、template、共享变量和平台规则 |
| `args.gn` | 某个 output directory 的构建参数 | `is_debug`、`target_os`、`target_cpu`、feature 参数 |

`//.gn` 不是“所有 GN 代码的总文件”。它告诉 GN 主构建配置在哪里，Chromium 通常再由 `//build/config/BUILDCONFIG.gn` 建立全局默认值、平台变量和默认 toolchain。每个 `BUILD.gn` 随依赖图按需加载；`.gni` 只有被 `import()` 时才执行。

官方 [GN Language and Operation](https://gn.googlesource.com/gn/+/main/docs/language.md) 和 [GN Reference](https://gn.googlesource.com/gn/+/main/docs/reference.md) 是这门语言的权威说明。Chromium 构建文档也明确把 GN 定义为生成 `.ninja` 文件的工具，而 Ninja 才负责执行构建。

## 先跑通一个最小 target

下面的 `BUILD.gn` 声明一个可执行文件：

```gn
executable("hello_gn") {
  sources = [ "hello_gn.cc" ]
}
```

生成构建图并执行 target：

```bash
gn gen out/Default
autoninja -C out/Default hello_gn
```

这里发生了两件事：

1. `gn gen` 读取 GN 代码和当前 `args.gn`，生成 Ninja graph。
2. `autoninja` 让 Ninja 执行 `hello_gn` 对应的编译与链接 edge。

修改 `BUILD.gn` 后通常不需要手动再次执行 `gn gen`。Ninja 发现 GN 输入变化时会触发 build graph regeneration；但排障时主动运行 `gn gen out/Default --check`，能更快暴露 label、header dependency 或参数错误。

## GN 的基本类型和表达式

GN 的类型系统不复杂，常用类型包括 Boolean、Integer、String、List 和 Scope。变量不需要声明类型，但赋值后的类型必须符合运算要求。

```gn
enabled = true
retry_count = 3
output_name = "browser_helper"

sources = [
  "helper.cc",
  "helper.h",
]

metadata = {
  owner = "runtime"
  platform = current_os
}
```

最常见的运算是赋值、追加和删除：

```gn
sources = [ "common.cc" ]

if (is_win) {
  sources += [ "common_win.cc" ]
}

sources -= [ "legacy.cc" ]
```

`-=` 不是“没有就忽略”。如果待删除项不存在，GN 会报错。这个设计能发现上游列表已经变化、当前 patch 仍在假设旧结构的情况，但也意味着跨版本维护时不能盲目照搬旧的删除语句。

字符串支持变量展开：

```gn
output_file = "$target_gen_dir/${target_name}_version.h"
```

路径和普通字符串在语法上都以 String 表示，但 GN 会根据变量语义解析路径。`//` 表示 source root，`$root_gen_dir` 和 `$target_gen_dir` 指向 output tree；不要把相对路径默认理解为仓库根路径。

## 作用域：很多“变量失踪”都发生在这里

每个 `BUILD.gn` 在独立 scope 中执行。`import()` 会把 `.gni` 导出的变量和 template 带入当前 scope，但另一个目录的 `BUILD.gn` 变量不会自动可见。`BUILDCONFIG.gn` 中不以下划线开头的变量可以成为构建全局上下文的一部分，因此修改它的影响面远大于普通组件文件。

```gn
import("//build/config/compiler/compiler.gni")
```

template 的调用方 scope 通过内置的 `invoker` 访问：

这里有三个容易混淆的名字：

| 名字 | 含义 |
| --- | --- |
| `target_name` | 当前 template 调用时传入的 target 名 |
| `invoker` | template 调用方的 scope |
| `forward_variables_from()` | 有选择地把调用方变量复制进内部 target scope |

template 应该封装稳定的构建规则，而不是把所有变量无差别透传。`forward_variables_from(invoker, "*")` 很方便，却可能让 template 的接口不可审查；更稳妥的做法是列出允许字段，或明确排除由 template 自己维护的变量。

## Label 是 GN 世界里的完整地址

GN 依赖的对象不是目录或文件，而是 label。常见写法如下：

```text
//components/example:core
:core
//components/example
//base/test:test_support(//build/toolchain/win:win_clang_x64)
```

完整 label 由 source-absolute path、target name 和可选 toolchain 组成：

```text
//path/to/dir:target_name(//path/to/toolchain:toolchain_name)
```

在同一个 `BUILD.gn` 内推荐使用 `:core`。跨目录依赖通常使用绝对 label，避免文件移动或 import context 改变后产生歧义。`//components/example` 是 `//components/example:example` 的简写，只有目录名和 target 名相同时才成立。

我读 Chromium GN 时，第一步不是展开 `sources`，而是先写下当前 label。否则很容易把同目录中的多个 target 当成一个模块，或者把 non-default toolchain 下的同名 target 混入默认构建图。

## Target：构建图的基本节点

常见 target 类型可以按输出语义理解：

| target | 作用 | 常见误区 |
| --- | --- | --- |
| `source_set` | 编译对象文件并交给最终链接目标 | 误以为它本身生成独立 library |
| `static_library` | 生成静态库 | 忽略 `complete_static_lib` 和依赖链接传播 |
| `shared_library` | 生成共享库 | 忽略平台导出符号与 runtime 查找路径 |
| `executable` | 生成可执行文件 | 只看名字，不核对实际 output path |
| `group` | 聚合依赖，不编译源码 | 把它当成 binary target |
| `action` | 运行一次脚本产生声明的 outputs | 把 generation-time `exec_script` 与 build-time action 混用 |
| `action_foreach` | 对每个 source 分别执行脚本 | outputs 未包含 source expansion，产生冲突 |
| `copy` | 复制声明的文件 | 把复制关系误当链接关系 |
| `generated_file` | 根据 GN 数据生成文件 | 忘记为消费者建立依赖 |

一个 target 的关键字段通常包括：

```gn
source_set("core") {
  sources = [
    "core.cc",
    "core.h",
  ]

  deps = [ "//base" ]
  public_deps = [ "//mojo/public/cpp/bindings" ]
  configs += [ ":warnings" ]
  public_configs = [ ":public_include_path" ]
  visibility = [ "//components/example/*" ]
}
```

阅读顺序建议固定为：target 类型 → sources → deps/public_deps → configs 传播 → 平台条件 → visibility → outputs。这样比从文件名猜模块边界可靠得多。

## `deps`、`public_deps` 和 `data_deps` 不是同义词

三者都建立依赖 edge，但表达的 API 和执行语义不同：

| 字段 | 语义 | 是否向消费方暴露依赖 |
| --- | --- | --- |
| `deps` | 当前 target 的普通私有依赖 | 默认不暴露 |
| `public_deps` | 当前 public API 暴露的依赖 | 会传播 public headers、public configs 和输出依赖 |
| `data_deps` | 运行时需要构建，但不参与当前 target 链接 | 不形成普通链接传播 |

假设 A 依赖 B，B 依赖 C：

```text
A -> B -> C
```

如果 B 的公开 header 引用了 C 的公开类型，B 应考虑把 C 放入 `public_deps`。如果 C 只是 B 的 `.cc` 内部实现，普通 `deps` 更准确。把所有依赖都改成 `public_deps` 可以暂时修掉 include error，却扩大了 API 面和重编译范围，也掩盖了 header 分层问题。

`data_deps` 常见于测试 runner、helper executable 或运行时工具。它确保依赖目标被构建，但不会把对应 library 当成链接输入。

## Config：编译参数也有传播方向

`config()` 把 defines、include directories、compiler flags、linker flags 和 libraries 等设置命名化：

```gn
config("public_api") {
  include_dirs = [ "include" ]
  defines = [ "EXAMPLE_PUBLIC_API" ]
}
```

应用方式决定传播范围：

| 字段 | 影响范围 |
| --- | --- |
| `configs` | 当前 target |
| `public_configs` | 当前 target 及符合 public dependency 传播规则的消费方 |
| `all_dependent_configs` | 强制传播给所有依赖方，影响面最大 |

Chromium 的默认 target configs 通常由 build config 注入，因此修改时常见的是 `configs += [...]`，而不是直接 `configs = [...]`。直接覆盖可能无意删除默认 warning、optimization、sanitizer 或 platform config。

## `declare_args()`：构建参数不是普通全局变量

组件可以用 `declare_args()` 定义可被构建目录覆盖的参数：

```gn
declare_args() {
  enable_example_feature = false
}
```

用户通过 `args.gn` 或命令行设置：

```gn
is_debug = false
target_cpu = "arm64"
enable_example_feature = true
```

查看有效参数和来源：

```bash
gn args out/Default --list
gn args out/Default --list=enable_example_feature
gn args out/Default --list --short
```

可用 build arguments 依赖当前构建图和 toolchain，所以 `gn args --list` 必须指定 output directory。`args.gn` 也是 GN 代码，但它的职责是提供参数，不应在其中复制组件构建规则。

参数设计有两条实践原则：

1. 只服务单个组件的参数尽量在该组件附近声明，不要都塞进顶层 `BUILDCONFIG.gn`。
2. 影响 C/C++ 条件编译的稳定 feature，优先通过项目既有的 generated build flag 机制生成 header，不要在大量 target 上散落 `defines`。

## Template：GN 的构建抽象

GN 没有面向对象继承。template 是它复用构建规则的主要方式，可以展开为一个或多个 target：

成熟 template 通常还需要：

1. 使用 `assert()` 校验必填字段。
2. 使用 `defined(invoker.xxx)` 处理可选字段。
3. 为内部 helper target 生成不会与调用方冲突的名字。
4. 用 `not_needed()` 明确允许但当前分支未消费的变量。
5. 避免读取调用点之外的隐式全局变量。

template 的价值是固化一组可审查规则，不是让 GN 看起来更像通用编程语言。只有一处调用、没有稳定约束的代码，直接写 target 往往更清楚。

## Generation-time 与 build-time：最重要的时间边界

GN 中的 `exec_script()` 在 generation 阶段同步执行。它会阻塞 `gn gen`，其输出还能改变构建图：

```gn
generated_sources = exec_script(
    "list_sources.py",
    [],
    "list lines")
```

`action()` 和 `action_foreach()` 则生成 Ninja rule，在 build 阶段执行：

```gn
action("generate_version") {
  script = "generate_version.py"
  inputs = [ "version.json" ]
  outputs = [ "$target_gen_dir/version.h" ]
  args = [
    rebase_path(inputs[0], root_build_dir),
    rebase_path(outputs[0], root_build_dir),
  ]
}
```

选择标准很直接：必须先得到结果才能确定 target/sources 时，才考虑 `exec_script()`；能够表示为明确 inputs/outputs 的生成过程，应优先用 action 交给 Ninja。后者才能获得增量、并行、depfile、restat 和失败重试等构建能力。

手改 `out/Default/gen/...` 下的 generated file 无法形成持久修复。它的 owner 是 action 的 source input 和 script；下一次构建可能覆盖本地改动。

## Toolchain：同一个 BUILD.gn 为什么会执行多次

toolchain 定义编译、链接、归档等工具如何把 inputs 变成 outputs。GN 的完整 label 包含 toolchain，因此同一个 target 可以在不同 toolchain context 下分别存在。

需要区分三组变量：

| 变量 | 回答的问题 |
| --- | --- |
| `host_os` / `host_cpu` | GN 当前运行在哪台主机 |
| `target_os` / `target_cpu` | 这次构建想产生什么主目标 |
| `current_os` / `current_cpu` | 当前正在求值的 toolchain 负责什么目标 |

在默认 toolchain 中，`current_*` 通常与 `target_*` 一致；但 host tool、代码生成器或交叉编译依赖可能使用 secondary toolchain。此时只判断 `target_os` 可能把 target 配进错误的执行环境。

```gn
if (current_toolchain == default_toolchain) {
  group("default_only") {
    deps = [ ":browser_target" ]
  }
}
```

跨 toolchain label 会显式带上括号：

```gn
deps = [
  "//tools/codegen:generator(//build/toolchain:host)",
]
```

学习 toolchain 的目标不是自己从零写一套 Chromium toolchain，而是能解释：哪个 target 在 host 上运行、哪个产物面向 target、为什么同一个 `BUILD.gn` 出现两次日志，以及某个条件应该使用 `host_*`、`target_*` 还是 `current_*`。

## 从 `//.gn` 到 `BUILD.gn` 的加载顺序

可以把一次 GN generation 简化为：

```text
内置 host/target 默认值
  -> 读取 //.gn
  -> 应用 default_args 与用户 args.gn
  -> 加载 buildconfig 指向的 BUILDCONFIG.gn
  -> 选择 default_toolchain
  -> 从 root target 开始加载 BUILD.gn
  -> import .gni、展开 template、解析依赖
  -> 必要时为 secondary toolchain 重新求值
  -> 生成 Ninja files
```

这个顺序解释了两个常见问题。第一，`declare_args()` 中看到的是用户参数覆盖后的值，但同一个参数不能在同一 scope 重复声明。第二，每个 `BUILD.gn` 的父 scope 主要来自 build config，而不是另一个 `BUILD.gn`；跨目录共享变量应该通过 `.gni` 或 target/config contract 表达。

## Chromium 中怎样读一个真实 `BUILD.gn`

面对几百行条件和依赖，不要从第一行顺序读到最后一行。我使用下面的路径：

1. 确认 output directory、GN args 和 target label。
2. 用 `gn desc` 查看求值后的 target，而不是只看源文件文本。
3. 用 `--blame` 找出 define/include/config 的来源。
4. 用 `deps --tree` 和 `gn path` 查询依赖传播。
5. 用 `gn refs` 反查 target 或文件的消费者。
6. 回到 `BUILD.gn` 核对条件、template 和平台分支。

```bash
# 完整 target 信息。
gn desc out/Default //chrome:chrome

# 依赖树。
gn desc out/Default //chrome:chrome deps --tree

# 某个 define/config 从哪里来。
gn desc out/Default //chrome:chrome defines --blame

# A 到 B 的依赖路径。
gn path out/Default //chrome:chrome //base

# 哪些 target 引用了指定 target 或文件。
gn refs out/Default //components/example:core --all
gn refs out/Default //components/example/core.cc --all

# 一个 target 最终产生哪些文件。
gn outputs out/Default //chrome:chrome

# 检查 include dependency 和格式。
gn check out/Default //components/example:core
gn format path/to/BUILD.gn
```

`gn desc` 展示的是指定 output directory 下已经求值的结果。同一份源码换一个 `args.gn`、平台或 toolchain，结果可以不同。因此，排障记录至少要包含 revision、out directory、target label 和关键 GN args。

## 十个高频错误

| 症状 | 根因 | 正确检查 |
| --- | --- | --- |
| 文件已加入 `sources`，最终 binary 没行为 | target 没进入最终依赖链，或 feature 未启用 | `gn refs`、`deps --tree`、运行时 feature 状态 |
| include 在一个 target 能用，另一个失败 | `public_deps`/`public_configs` 传播不正确 | `gn desc ... --blame`、public header 边界 |
| 一改 config 就重编大量 target | config 传播面过大 | `public_configs`、`all_dependent_configs`、反向依赖 |
| 修改 generated header 后又被覆盖 | 改了 output 而非 action input | 查 `gn refs`、action、outputs 和生成脚本 |
| macOS 正常，Windows GN 失败 | platform condition 或 source list 不完整 | 对比两个 out directory 的 `gn desc` |
| host 工具被按 target 架构编译 | 混用了 `target_*` 与 `current_*` | 检查 target 的 canonical label/toolchain |
| `configs = [...]` 后出现奇怪 warning/link error | 覆盖了默认 configs | 对比修改前后的 `gn desc ... configs --blame` |
| `exec_script()` 让 `gn gen` 很慢 | 在 generation 阶段做了可增量化工作 | 改为 inputs/outputs 明确的 `action()` |
| template 收到变量却报 unused | invoker 字段未转发或某分支未消费 | `forward_variables_from()`、`not_needed()` |
| 删 `out/` 后暂时恢复，问题反复出现 | 清理掩盖了不稳定输出或错误依赖声明 | 查 Ninja edge、depfile、restat 和 action outputs |

## 从入门到精通的学习路线

### 第一阶段：能新增并构建一个 target

掌握 Boolean、String、List、`if`、`foreach`、label、`source_set`、`executable` 和普通 `deps`。目标是能独立完成：

```text
新建 BUILD.gn
  -> gn format
  -> gn gen
  -> autoninja 明确 target
  -> 找到实际 output
```

### 第二阶段：能解释依赖为什么传播

重点学习 `public_deps`、`configs`、`public_configs`、visibility、public headers 和 generated outputs。选择一个三层依赖 A → B → C，用 `gn desc --blame` 验证每个 include directory 和 define 的来源。

### 第三阶段：能写稳定 template 和 action

掌握 `invoker`、`forward_variables_from()`、`defined()`、`assert()`、`not_needed()`、source expansion、depfile 和 response file。目标是让生成规则具有明确 inputs/outputs，并能在输入未变化时保持增量稳定。

### 第四阶段：能排查跨平台与 toolchain 问题

比较 host/target/current 变量，阅读 `BUILDCONFIG.gn` 和 toolchain 定义，确认 host generator 与 target binary 的边界。对同一 label 在 macOS、Windows 或 cross-compile out directory 中执行 `gn desc`，记录条件求值差异。

### 第五阶段：能控制大仓库的变化半径

精通不是能写最复杂的 GN，而是能让变更保持局部、依赖准确、增量稳定、跨平台可验证。这个阶段应能回答：

1. 为什么这个依赖必须是 public？
2. 为什么 config 应该在 target 而不是全局 toolchain？
3. 为什么脚本必须在 generation 阶段执行？
4. 哪些 target 会因这个 header/config 变化而重编？
5. 如何用命令证明，而不是靠目录和文件名猜测？

## 我的判断框架

写 GN 时，我会按下面四个问题收敛方案：

1. **节点是否准确？** 代码属于哪个 target，输出类型是什么？
2. **边是否准确？** 依赖是 private、public、runtime 还是 generation input？
3. **传播是否最小？** config、include、define 和 toolchain 条件是否只影响必要范围？
4. **证据是否足够？** `gn desc`、`gn check`、目标 compile 和目标平台构建分别证明了什么？

如果四个问题都能回答，GN 就不再是一堆“能让编译通过的配置”。它是一张可以查询、约束和验证的构建图。反过来，如果一次修复只能靠扩大 `public_deps`、追加全局 flag 或删除整个 `out/` 才成立，通常说明真正的 target 或依赖边界还没有找对。

## 官方资料

1. [GN Quick Start Guide](https://gn.googlesource.com/gn/+/main/docs/quick_start.md)：最小 target、依赖、config、build args 与 `gn desc`。
2. [GN Reference](https://gn.googlesource.com/gn/+/main/docs/reference.md)：命令、target、函数、内置变量和完整语法参考。
3. [GN Language and Operation](https://gn.googlesource.com/gn/+/main/docs/language.md)：作用域、列表、执行脚本与语言行为。
4. [GN Style Guide](https://gn.googlesource.com/gn/+/main/docs/style_guide.md)：文件布局、命名和 target 内字段顺序。
5. [How GN handles cross-compiling](https://gn.googlesource.com/gn/+/main/docs/cross_compiles.md)：host、target、current 与 secondary toolchain。
6. [Chromium build instructions](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/mac_build_instructions.md)：Chromium 中 GN、Ninja 与 output directory 的实际入口。

## 继续阅读

1. [三、构建、依赖与生成代码：源码如何成为当前浏览器](/blog/a6d39ad04d324f47)：从 checkout、DEPS、GN、Ninja、generated code 到 binary 的完整证据链。
