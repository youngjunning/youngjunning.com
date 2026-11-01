---
id: "0239371b03c3ae58"
title: "14-base、Task、Sequence 与生命周期：Chromium 异步代码真正遵守的秩序"
description: "从源码阅读入口、进程边界与验证条件理解base、Task、Sequence 与生命周期：Chromium 异步代码真正遵守的秩序。"
date: null
topic: "principles"
tags: []
collection: "docs"
cover: "/media/0239371b03c3ae58-8405d11b5a167493.webp"
---

从源码阅读入口、进程边界与验证条件理解base、Task、Sequence 与生命周期：Chromium 异步代码真正遵守的秩序。

> 本文讨论通用机制和设计判断；示意不对应任何具体产品的已交付状态。源码阅读坐标沿用原稿，本次整理不构成新的运行时验收。

![Chromium Task、Sequence 与生命周期封面](/media/0239371b03c3ae58-8405d11b5a167493.webp)

> 阅读坐标沿用原稿：Chromium `153.0.8010.37`，上游 commit `b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b`。本次同步未重新进行源码与目标平台运行时验收。

![Chromium 异步任务从发起到失效的生命周期](/media/0239371b03c3ae58-cd81961a3a39492f.webp)

## 一句话结论

Chromium 异步代码的正确性来自 sequence、ownership、callback 次数、取消与对象有效期共同约束；对象还活着不代表结果仍适用于当前页面，请求晚到也不代表可以继续提交。

Chromium 的核心复杂度不只来自多进程，也来自每个进程内部大量异步工作：网络返回、Mojo 回调、磁盘 I/O、解码、UI 操作与销毁回收不在同一个调用栈上完成。读到 `PostTask()`、`BindOnce()` 或 `WeakPtr` 时，不能把它们当作普通的“换个线程执行”。它们共同定义了任务的**顺序、归属、可取消性和对象在回调发生时是否还活着**。

最重要的判断是：**线程不是 API contract，Sequence 才往往是。** 一个 `SequencedTaskRunner` 可以让任务依次执行，却不承诺始终由同一条 OS thread 执行；反过来，一个对象即使常在同一 thread 上运行，也不能因为“目前没出错”就越过其 sequence 调用。

## 从调用栈思维切到任务图思维

同步程序常把“谁调用我”和“我何时完成”写在同一栈帧里。Chromium 的实际链路更像一张任务图：一个对象在 Browser UI sequence 发起请求，后台执行 I/O，结果再回到原 sequence；期间页面可导航、进程可退出、对象可销毁。

```text
UI / owning sequence
  -> PostTask(background work)
     -> worker executes
        -> PostTaskAndReply(result)
           -> owning sequence checks current state
              -> update object or discard stale result
```

这张图不表示所有工作都应该放进 ThreadPool。IPC、Renderer/Brower thread、GPU thread 和 sequence manager 各有自己的 runner 与生命周期。它表达的只是：异步 API 的正确性需要显式回答 work 在哪里跑、reply 回到哪里、谁持有状态、取消后结果怎么处理。

## TaskRunner、Sequence 与 ThreadPool：三个不同的选择

`base/task/task_runner.*` 定义了 posting task 与 `PostTaskAndReply` 一类基础语义；`sequenced_task_runner.*`、`single_thread_task_runner.*` 和 `thread_pool.*` 提供不同的执行约束。应按所需 contract 选择，而非按“哪个 API 最方便”选择。

| 工具 | 承诺的核心语义 | 不承诺的事 |
| --- | --- | --- |
| `TaskRunner` | 可以将任务交给目标执行环境 | 相互任务的先后、固定线程、对象仍存活 |
| `SequencedTaskRunner` | 同一 sequence 中任务按 posting 顺序串行 | 永远是一条 OS thread，或与其他 sequence 不并发 |
| `SingleThreadTaskRunner` | 在一个特定 thread 关联的执行上下文中运行 | 跨进程同步、对象自动线程安全 |
| `ThreadPool` | 依据 TaskTraits 运行可并行/串行/单线程的后台工作 | UI affinity、请求仍有效、结果一定回调 |

`ThreadPool` 用于表达任务的资源、优先级和 shutdown 行为，不能只按“后台线程池”理解。`base/task/thread_pool/` 中的 task source、sequence、priority queue、worker 与 delayed task manager 说明调度需要处理并发、顺序、延迟与进程退出。不要根据某次调试中看到的 worker id，写出依赖某条 worker thread 的逻辑。

一个常用模式是 `PostTaskAndReply`：后台任务完成后将 reply 回发到发起调用的 sequence。`task_runner.*`、`thread_pool.*` 以及相应测试都覆盖该模式，但它不是“完成必然通知”的承诺。posting 可能失败，shutdown 可能使 task 或 reply 无法运行，目标对象也可能已销毁；API 调用者必须把这些路径写入状态机。

## `OnceCallback` 与 `RepeatingCallback`：调用次数属于类型契约

`base/functional/callback.*` 将 callback 的调用次数表达进类型：`OnceCallback` 是一次消费型回调，通常以 move 方式交接所有权；`RepeatingCallback` 可被多次调用。它们不是命名偏好。

| 回调形态 | 适合的语义 | 常见错误 |
| --- | --- | --- |
| `OnceCallback` | 一次 completion、一次错误回传、对象所有权转移 | 试图保存后再次调用，或因早退遗漏调用/释放 |
| `RepeatingCallback` | observer、持续事件、可重复过滤/转换 | 捕获短生命周期对象后长期保存，忘记解绑 |
| `BindOnce` / `BindRepeating` | 将参数、receiver 与回调类型一起固定 | 把 raw pointer 的可达性误认为生命周期保证 |

回调是否应被调用、何时被调用、在什么 sequence 调用，仍需由所在 API 说明。`Once` 不意味着异常或取消时一定会调用一次；`Repeating` 也不意味着会一直订阅到进程结束。代码 review 应要求每条 completion path 明确处理 success、error、cancel、shutdown 与 owner destruction，而不是只看 happy path 能否跑通。

## `WeakPtr`、`scoped_refptr` 与 `SequenceChecker` 分别解决什么

Chromium 的异步代码经常同时使用多种生命周期工具；它们不能互相替换。

| 工具 | 主要解决的问题 | 不能保证 |
| --- | --- | --- |
| `scoped_refptr<T>` / `RefCounted` | 跨异步边界延长 ref-counted 对象的所有权 | 对象方法可在任意 sequence 调用；不会形成逻辑上的过期结果 |
| `WeakPtr<T>` / `WeakPtrFactory<T>` | owner 销毁后让未来回调失效，避免 use-after-free | task 自动取消；其他状态仍正确；跨 sequence 使用天然安全 |
| `SequenceChecker` | 在 debug/检查路径中约束对象应在哪个 sequence 被访问 | 数据竞争自动修复；release 下为你建立同步 |
| cancel token / `CancelableTaskTracker` | 跟踪并抑制尚未执行或可取消任务的结果 | 已开始的底层 I/O、IPC 或硬件操作一定停止 |

`base/memory/weak_ptr.*`、`ref_counted.*`、`scoped_refptr.*` 与 `sequence_checker.*` 显示这些是独立机制。典型错误是把 `WeakPtr` 当成跨线程锁：它解决的是“owner 已销毁时不要解引用”，不能让同一个对象在多个 sequence 任意读写。另一个错误是为了避免悬垂回调把所有对象改为 ref-counted，结果生命周期被无意延长，旧页面或旧请求的结果仍在稍后写回当前状态。

因此应先决定 ownership：谁拥有对象、何时销毁；再决定 affinity：哪些方法只能在其 owning sequence 调用；最后决定 cancellation：请求被 supersede、navigation 或 shutdown 后，是丢弃结果、取消任务，还是关闭底层资源。把三者混成“加一个 weak pointer”会产生表面稳定、语义错误的代码。

## 延迟结果的正确性：活着不等于仍然有效

浏览器最典型的 stale-result 场景是导航：页面 A 发出异步请求，导航到页面 B 后请求 A 的回调才到达。即使 `WebContents`、Controller 或 manager 仍然活着，回调也不应覆盖 B 的状态。

正确设计至少需要两层判断：

```text
1. 生命周期：owner / requester 是否仍存在？
   -> WeakPtr、关闭回调、request cancellation
2. 语义身份：到达的结果是否仍属于当前 request / document / generation？
   -> request id、navigation id、generation、current frame identity
```

第一层防止 use-after-free，第二层防止写错对象。它们的关系类似安全边界主题中的 caller identity：一个 tab id 或对象地址还存在，不代表它仍代表那一次 document/request。对于 permission、media、network、Browser Native capability 与 Runtime reply，应当将 request identity 与取消语义作为 contract，而不是在回调末尾临时比较一个 URL 字符串。

## shutdown、取消与 task 的真实边界

`base/task/cancelable_task_tracker.*` 可以关联 task id、取消已跟踪任务，并提供 `PostTaskAndReply` 辅助；它是一种协调手段，不是对底层操作的全能 kill switch。任务可能已经在执行，回复可能已经被投递，或者相关 service/进程已经在关闭。

设计 shutdown 路径时，建议分开记录：

1. **不再接受新请求**：入口关闭、调用者立即得到确定错误；
2. **已排队工作**：能取消则取消，否则在执行点快速检查 generation/cancel 状态；
3. **已开始工作**：底层 API 是否有显式 cancel/close；若没有，完成后的结果必须被安全丢弃；
4. **回复与资源回收**：reply 是否必须回到 owning sequence，且在 owner 销毁时不再访问它。

“进程要退出了，所以回调不用管”常在测试和真实关闭路径中变成 crash 或 dangling state。与其依赖退出时序，不如让每一层都能容忍 reply 缺席、晚到或被丢弃；测试也应覆盖 shutdown 与取消，而不是只覆盖正常 completion。

## 建议的追踪任务：修复一个“偶现旧结果覆盖新页面”问题

1. 为一次请求建立稳定 id，并在发起、post、IPC/Mojo、completion、cancel 与对象销毁处记录同一 id。
2. 明确每一步所在的 sequence；用 `SequenceChecker`/当前 runner 断言验证设计假设，而不是从 thread name 猜。
3. 先让 request A 发起、navigation/新请求 B 发生、A 晚到这一场景稳定复现；分别测试 owner 销毁与 owner 存活但 generation 已变两种情况。
4. 在 API contract 中定义 A 晚到后的行为：取消底层工作、忽略结果或显式返回 cancelled；不要让 UI 通过“最后一次赋值碰巧赢了”决定状态。
5. 修复后用 browser/integration test 覆盖状态边界，再采一段窄窗口 trace，确认实际 reply 回到了预期 sequence 且旧结果未被消费。

## 本文已核验的源码锚点

| 主题 | 源码入口 |
| --- | --- |
| task/reply 基础语义 | `base/task/task_runner.*`、`base/task/thread_pool.*`、`base/task/bind_post_task.h` |
| sequence 与单线程 runner | `base/task/sequenced_task_runner.*`、`base/task/single_thread_task_runner.*`、`base/sequence_checker.*` |
| ThreadPool 内部调度 | `base/task/thread_pool/sequence.*`、`task_source.*`、`priority_queue.*`、`thread_group_impl.*`、`delayed_task_manager.*` |
| callback | `base/functional/callback.*`、`callback_helpers.*` |
| 内存与失效引用 | `base/memory/ref_counted.*`、`scoped_refptr.h`、`weak_ptr.*` |
| 取消与测试 | `base/task/cancelable_task_tracker.*`、`base/test/*task_runner*`、对应 `*_unittest.cc` |

## 运行时验证路径

- 为一个真实 Browser/Renderer/Mojo 请求录制 trace，验证每个 task/reply 的 sequence 与 request identity，而不是仅阅读 posting 代码。
- 在目标平台用 TSAN/适合的 debug 检查与重复测试覆盖 concurrent access、shutdown、navigation、Tab close 和 Renderer crash；静态 `SequenceChecker` 不能替代全部竞争检测。
- 在性能敏感场景测量 task queue、worker 饱和与主线程 long task；不要因为把工作移入 ThreadPool 就直接宣布交互性能改善。

## 从故障反推边界：旧请求为什么覆盖了新页面

典型路径是：Document A 发起异步工作，callback 捕获一个仍存活的 Browser/Tab owner；用户导航到 Document B；后台任务完成后 callback 只检查 owner 没销毁，于是把 A 的结果写进 B。这里既没有 use-after-free，也不一定违反 sequence，却违反了结果的语义生命周期。

修复需要把 document/request identity 作为一等状态，并在发起、跨进程 dispatch、reply 与提交前复核；取消只是一种优化，晚到结果仍要能安全丢弃。`WeakPtr` 能阻止对象销毁后的调用，却不能证明“同一个对象当前仍代表同一用户意图”；这一层要由业务 state machine 处理。

## Sequence safety 与 thread safety 不一样

一个对象可以要求所有方法在同一 sequence 调用，而不要求绑定同一个物理线程。TaskRunner 保证任务按 sequence 约束执行，ThreadPool 可以让 sequence 在不同 worker thread 上调度。`SEQUENCE_CHECKER` 用于验证这种逻辑归属；把它替换成 thread id 检查会误解 Chromium 的调度模型。

真正 thread-safe 的对象必须允许多个线程并发访问并自行同步，成本和复杂度更高。默认让对象归属一个 sequence，跨边界 post task，通常更容易推理。若为了省一次 hop 直接从任意线程调用 sequence-bound object，短期可能工作，负载或 shutdown 下才暴露竞态。

## Task traits 表达调度承诺

ThreadPool task 的 priority、MayBlock、TaskShutdownBehavior 等 traits 会影响资源分配和退出语义。把磁盘/IPC wait 当普通 CPU task，会占住 worker；把非关键后台任务标为 shutdown 必须完成，可能拖住 Browser 退出；把用户可见动作放在低优先级队列，又会产生首个动作延迟。

选择 traits 时应以用户结果和可取消性为依据：任务是否阻塞、用户是否在等待、退出时丢弃是否安全、任务是否修改必须持久化的数据。不要用提高 priority 修复没有 backpressure 的生产者，否则只会让消息风暴更快挤占系统。

## WeakPtr 解决悬空，不解决业务过期

WeakPtr 常用于 owner 销毁后阻止 callback 解引用，但 callback 即使能安全执行，也可能属于旧 request、旧 document 或旧 session。正确提交前还要检查 generation/request id、当前 owner 状态、deadline 和权限。

相反，`scoped_refptr` 延长对象生命也不是总正确。为了让 callback 安全而强持有 BrowserContext/service，可能阻止 shutdown，或让旧状态在用户关闭后继续工作。选择 WeakPtr、ref-count、raw pointer with sequence contract 或显式 cancellation，要从 owner 与最长合法生命周期推导。

## 取消需要贯穿整条异步链

在最外层丢弃结果，只能避免错误 UI 更新，不能停止中间的网络、计算、Runtime tool 或文件操作。对昂贵或高权限任务，取消信号应向下传播；每一层明确自己能立刻停止、只能忽略 reply，还是必须完成原子提交。

一个实用状态机可以是：`Created → Dispatched → Running → Completing → Completed`，并允许从前四个状态进入 `Cancelling/Cancelled`。`Completing` 用于表达不可随意中断的最终写入；deadline 到期后若底层仍继续，也要让调用方知道结果不会再提交。

## Shutdown 是所有异步设计的强制测试

正常运行时依赖关系通常按 A 调 B 展开，shutdown 则应按相反顺序停止：先拒绝新请求，取消上层 session，再关闭下游连接和 worker，最后销毁 owner。若 destructor 中才第一次通知对端，其他 sequence 可能已经停止，清理 task 永远无法执行。

测试可以在每个阶段触发 Profile shutdown、Browser exit、Renderer crash 或 service disconnect，观察是否有 late task、double callback、阻塞退出和资源泄漏。ThreadSanitizer 能发现部分数据竞态，却不能发现“旧结果安全地写进新页面”这类语义错误。

## 为异步链建立最小 trace

每个 request 使用稳定 id，记录 post、start、remote dispatch、reply、validation、commit/cancel，并附 owner generation/document。这样可以区分 task 没运行、排队太久、对端慢、reply 被取消或 UI commit 慢。

不要在每个 callback 打无关联日志。并发下日志顺序不等于执行因果，跨进程时系统时间和缓冲刷新还会制造错觉。flow/async trace 配合 request id，才是验证 sequence 与生命周期的可靠方法。

## Reentrancy 会让“同一 sequence”仍然出错

即使所有代码都在 UI sequence，调用外部 callback、observer 或 nested run loop 时也可能重入当前对象。回调返回后，原状态可能已被删除、导航或推进到下一阶段。调用前应保存必要 identity，回调后重新验证 owner/state；不要依赖“没有多线程”推断对象没变化。

Observer 通知尤其要定义添加/删除、遍历中自注销和 owner 销毁规则。许多偶现问题来自同 sequence 上合法事件顺序超出作者预期，并非 data race。

阻塞调用也会破坏这些假设：在 UI/IO sequence 同步等待另一个需要回调本 sequence 的任务会死锁，等待较慢资源则造成饥饿。应通过异步 continuation 表达依赖，确需阻塞时放入允许 blocking 的受控 worker 并设置取消边界。

## 工程结论

异步正确性的核心是“结果是否仍属于当前世界”。Thread、Sequence、ownership 与 callback type 提供机械安全，document/session/request 的有效性提供语义安全，两者缺一不可。

## 继续阅读

- [15-DevTools Protocol、调试与自动化：一条高权限控制通道如何进入浏览器](/blog/6404e0541fec1096): 相邻章节的后续机制。

## 上游源码入口

文中的相对源码路径可从 [Chromium 官方上游快照](https://chromium.googlesource.com/chromium/src/+/b75a5a95ea1a1b55bdbfd6d9f42d47be7507fb8b/) 定位。此入口保留原稿的上游阅读坐标，不包含任何产品定制代码，也不替代运行时验收。
