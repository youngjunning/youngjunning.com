---
id: "772498190d28843f"
title: "React Native 架构面面观"
description: "本文记录了一些 React Native 架构方案的最佳实践"
date: "2020-02-23"
topic: "architecture"
tags: ["架构","最佳实践","React Native"]
source: "https://github.com/youngjunning/blog.zisheng.pro/blob/3edd776416630100b4a100bc90b84dd1d66b3596/source/_posts/React%20Native%20%E6%9E%B6%E6%9E%84%E9%9D%A2%E9%9D%A2%E8%A7%82.md"
sourceDate: "2020-02-23T17:26:09.000Z"
cover: "/media/3fe6c552feecc53095cab619.png"
assets: {"https://i.loli.net/2020/02/21/Sy3OjWBKbMdYgoH.png":"/media/8b64b96c0fab3dffe8cccacb.png","https://i.loli.net/2020/02/24/hPsv4Q87zlIrX6x.png":"/media/3fe6c552feecc53095cab619.png"}
unavailableAssets: ["https://user-gold-cdn.xitu.io/2020/2/24/17074acbb24c7412?w=200&h=200&f=jpeg&s=17183","https://user-gold-cdn.xitu.io/2020/2/24/17074acbb26af8e1?w=200&h=200&f=png&s=39093","https://user-gold-cdn.xitu.io/2020/2/24/17074acbb338c643?w=698&h=700&f=png&s=315492"]
originalBodySha256: "b065615ebf7403f0bfe3f92ab98c1782187896971006b5bd1722d1cac5606acf"
---

## @sigmayun/react-native-template-typescript

[@sigmayun/react-native-template-typescript](https://github.com/sigmayun/react-native-template-typescript)是基于 [react-native-community/react-native-template-typescript](https://github.com/react-native-community/react-native-template-typescript) 二次开发的模板脚手架。本文的架构方案融进了该模板。你甚至不需要阅读本文的内容即可使用本文中的最佳实践！！！

## 全局变量

既然都引入 TypeScript 了，就不用再担心给全局对象添加属性不小心污染它了，但是需要我们进行一些配置。

1、在项目根目录新建 `types`,并新建 `global.d.ts` 文件名，添加一下内容：

```tsx
declare const global: {
  HermesInternal: null | {}
  ...
}
```

2、为了防止和 `@types/node` 的 `Global` 声明冲突，需要把 `tsconfig.json` 中的 `skipLibCheck` 的值设置为 `true`

> 该部分示例代码涉及 `global.ts`、`types/global.d.ts`、`tsconfig.json`，请到 https://github.com/sigmayun/react-native-template-typescript 查看。

## 编码规范

- [@sishuguojixuefu/eslint-config](https://github.com/sishuguojixuefu/eslint-config)：大而全的 ESlint 配置，支持 vue、jsx、js、ts、tsx、html 的 ESLint 配置插件，基于 airbnb，支持Prettier
- husky + lint-staged: 禁止 `commit` 不符合规范的代码

> 该部分示例代码：https://bre.is/3GD7cHKn

## Npm Scripts

善用 NPM Scripts 能帮助改善工作流程！！！

```json
{
  "scripts": {
    "postinstall": "npx jetifier",
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "pod": "cd ios && pod install",
    "gradle:clean": "cd android && ./gradlew clean",
    "an:release": "yarn gradle:clean && cd android && ./gradlew app:assembleRelease",
    "an:installRelease": "yarn gradle:clean && cd android && ./gradlew app:installRelease",
    "an:releaseStaging": "yarn gradle:clean && cd android && ./gradlew app:assembleReleaseStaging",
    "an:installReleaseStaging": "yarn gradle:clean && cd android && ./gradlew app:installReleaseStaging",
    "an:genkeypair": "keytool -genkeypair -v -keystore release.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000",
    "an:key-debug": "keytool -list -v -keystore ./android/app/debug.keystore",
    "an:key-release": "keytool -v -list -keystore ./android/app/release.keystore",
    "icon": "npx iconfont-rn"
  }
}
```

> 该部分示例代码：https://bre.is/LC6uu8kc

## 网络编程

- [axios](https://www.kancloud.cn/yunye/axios/234845): Axios 是一个基于 promise 的 HTTP 库，可以用在浏览器和 node.js 中。
- [qs](https://www.npmjs.com/package/qs): A querystring parsing and stringifying library with some added security.
- [clean-deep](https://www.npmjs.com/package/clean-deep): 从对象中递归删除空对象、空数组、空字符串、`null`和 `value`值。不改变原始数据。

> 该部分示例代码：https://bre.is/39khhJtn

## 路由管理

- React Navigation: 这个模块是官方推荐的导航组件，升级到5之后不仅支持了 `hooks`，更是支持了动态路由。

> 该部分示例代码：https://bre.is/pzA7JArY
>
> 相关博客：https://bre.is/pzA7JArY

## 状态管理

- `mobx` + `mobx-react`: 相对于 redux 来说更简单易用，还在犹豫的同学，可以读一下有赞的一篇文章 [我为什么从Redux迁移到了Mobx](https://tech.youzan.com/mobx_vs_redux/)

## 本地存储

- [react-native-simple-storage](https://www.npmjs.com/package/react-native-simple-store):  AsyncStorage 的一个简单包装器
- [rxdb](https://github.com/pubkey/rxdb):  JavaScript 即时数据库，如果有复杂的缓存业务可以考虑使用
- [watermelonDB](https://github.com/Nozbe/WatermelonDB): 一个专为 React、React Native 服务的响应式数据库框架

## 启动屏

- [react-native-splash-screen](https://github.com/crazycodeboy/react-native-splash-screen)

> 启动屏的配置涉及到不少原生知识，请阅读 https://bre.is/CRC2SkqP 进行配置。

## 热更新

- [react-native-pushy](https://update.reactnative.cn/home): ReactNative中文网推出的代码热更新服务，免费，但是限制多，不推荐使用
- [react-native-code-push](https://github.com/microsoft/react-native-code-push) + [AppCenter](https://appcenter.ms/)：完全免费，国内速度可能慢，适合个人开发者【推荐】
- [react-native-code-push](https://github.com/microsoft/react-native-code-push) + [code-push-server](https://github.com/lisong/code-push-server)：适合公司自建热更新服务器

> 新版热更新部分我还没写好博客，可以先参考我之前写的： http://techblog.sishuxuefu.com/atricle.html?5beaa7e59f5454007039e01c，我会在看完新文档之后把这部分配置也内置到脚手架中，毕竟这个服务也是 React Native 的标配。

## UI框架

- [@ant-design/react-native](https://rn.mobile.ant.design/index-cn):  Ant Design 出品的一个基于 React Native 的 UI 组件库
- [beeshell](https://github.com/Meituan-Dianping/beeshell): 美团 React Native 组件库
- [react-native-elements](https://react-native-elements.github.io/react-native-elements/): 跨平台React Native UI工具包
- [react-native-ui-lib](https://github.com/wix/react-native-ui-lib): 没有体验过，看起来很强大

> 其他组件收藏请查看：https://bre.is/jWUGvPrK

## 列表

- [mobx+react-native-largelist 实现分页功能](https://bre.is/yqJ2EEdL): 推荐使用 [react-native-largelist-v3](https://github.com/bolan9999/react-native-largelist)，支持下拉刷新、上拉加载更多、分组列表、表格和瀑布流
- 自行封装 `FlatList`、`SectionList`: 并不复杂，建议还是要回手写的，react-native-largelist-v3 不一定能满足所有场景

## 图标

- [react-native-iconfont-cli](https://www.npmjs.com/package/react-native-iconfont-cli): 【推荐】用纯JS把图标转换成RN组件，不依赖字体，支持多色彩，支持热更新
- [@ant-design/icons-react-native](https://bre.is/dfCDM2Kw): Ant Design Icons for React Native
- [react-native-vector-icons](https://github.com/oblador/react-native-vector-icons): Perfect for buttons, logos and nav/tab bars. Easy to extend, style and integrate into your project.

## 字体

- [react-native-fonts](https://github.com/react-native-training/react-native-fonts): 在React Native项目中开箱即用的可用字体，这个库只是统计了一下 React Native 中可用的字体而已
- [React Native 配置自定义字体](https://juejin.im/entry/59c74c91f265da065c5e9282)
- [React Native Custom Fonts](https://bre.is/N2NqkX4N)
- [react-native-responsive-fontSize](https://github.com/heyman333/react-native-responsive-fontSize): 响应式fontSize基于React Native中设备的屏幕尺寸
- [React Native 配置字体大小不随字体设置变化](https://bre.is/WTxnrfPV)
- [React Native字体问题解决方案指北](https://juejin.im/post/5ce66c26e51d4555fd20a2a0)
- [react-native-responsive-fontsize](https://www.npmjs.com/package/react-native-responsive-fontsize)

## 工具

- [react-native-shadow-generator](https://ethercreative.github.io/react-native-shadow-generator/): 在线生成 React Native 阴影代码
- [visualize-bundle](https://github.com/JonnyBurger/npx-visualize-bundle): `npx visualize-bundle` 允许你一键检查你的 React Native bundle 包 并且找到大的依赖
- [图标工厂](https://icon.wuruihong.com/): 一键生成所有尺寸的应用图标/启动图

## React Hooks

这个新语法是2019年的明星，React Navigation、Mobx这些常用库都内置支持了，还没有学习的同学快去补课吧！！！

### 推荐阅读

> 建议先读官方文档！！！

- [官方文档](https://zh-hans.reactjs.org/docs/hooks-intro.html)
- [30分钟精通React Hooks](https://juejin.im/post/5be3ea136fb9a049f9121014)
- [React Hooks 详解 【近 1W 字】+ 项目实战](https://juejin.im/post/5dbbdbd5f265da4d4b5fe57d)
- [呕心沥血，一文看懂 react hooks](https://juejin.im/post/5d985deae51d4577f9285c2f)
- [React Hooks 带来的困扰与思考](https://zhuanlan.zhihu.com/p/86211675)

### 如何兼容类组件

考虑到对于不适应 Hooks 的但是业务又很紧急的场景，我们可以在类组件之上封装一层来支持 React Navigation 的 Hooks 组件，之所以这么做，起因是因为 React Navigation 5 中我们只能通过 `useHeaderHeight()` 方法获取标题栏高度。

```jsx
class Albums extends React.Component {
  render() {
    return <ScrollView ref={this.props.scrollRef}><Text>{this.props.headerHeight}</Text></ScrollView>;
  }
}
// 封装并导出
export default function(props) {
  const ref = React.useRef(null);
  const headerHeight = useHeaderHeight();
  useScrollToTop(ref);
  return <Albums {...props} scrollRef={ref} headerHeight={headerHeight}/>;
}
```

## Metro

- [利用Metro配置React Native端口](https://juejin.im/post/5e54d910f265da571671090d)

## 第三放服务

> 这里尽量为大家推荐了免费的服务，当然选择自行搭建服务也是一个很棒的选择！！

### [Sentry](https://sentry.io/welcome/)

> Sentry 胜在可以把服务搭建到自己的服务器上，并且官方提供了[sentry-react-native](https://github.com/getsentry/sentry-react-native)插件来帮助 React Native 工程师快速集成。如果有条件，选择 Sentry 恐怕是目前行业的最佳选择。

Sentry提供自托管和基于云的错误监控，可帮助所有软件团队实时发现分类和确定错误的优先级。已经有超过五万家公司的100万名开发人员使用，Sentry可以更快地提供更好的软件。你不加入他们吗？

### [腾讯 Bugly](https://bugly.qq.com/v2/)

腾讯Bugly，为移动开发者提供专业的异常上报和运营统计，帮助开发者快速发现并解决异常，同时掌握产品运营动态，及时跟进用户反馈。免费提供异常上报、运营统计、应用升级

### 推送

####  [信鸽 | 腾讯移动推送](https://xg.qq.com/)

为开发者提供免费、快速、简单的推送服务。QQ登录即可快速注册，为APP接入SDK后马上获得无限量应用推送能力，
有效提升用户留存率、活跃度，开发者的不二选择！

#### [小米消息推送服务](https://dev.mi.com/console/appservice/push.html)

- MIUI上系统级通道
- iOS/Android全平台支持
- 免费 稳定 安全 高效

#### [极光推送](https://www.jiguang.cn/push)

极光推送服务，可以免费使用，但限制较多。官方SDK, React Native 集成容易

#### [U-Push](https://www.umeng.com/push)

和极光属于一类，限制级免费，友盟的产品胜在生态，公司产品考虑，后期用户上来之后方便扩展。

### 社会化分享

#### [ShareSDK](http://www.mob.com/mobService/sharesdk)

为开发者提供40+主流平台的分享与授权等社会化功能，效果稳定，完整清晰统计分享数据

- 一键分享
- 第三方登录
- 闭环分享
- 短链转换
- 数据统计
- 新浪微博独家LinkCard

#### [jshare](https://github.com/jpush/jshare-react-native)

- 一键分享
- 第三放登录
- 社会化统计
- 官方 React Native SDK 集成方便

### [U-Share](https://bre.is/LM3eaCsL)

- 全面覆盖国内外社交平台
- 集成成本低、速度快
- 自由定制分享界面
- 权威、实时的大数据分析

### 其他

- [react-native-wechat](https://github.com/yorkie/react-native-wechat): 🚀 **WeChat login**, **share**, **favorite** and **payment** for React-Native on iOS and Android platforms
- [@0x5e/react-native-alipay](https://github.com/0x5e/react-native-alipay): Alipay SDK for React Native. Support mobile webpage url payment. Support RN >= 0.47.

## 测试

> 这部分作者的理解仅限于 Jest，有大佬可以联系我补充！！！

- [Jest](https://jestjs.io/zh-Hans/): Jest是一个令人愉快的 JavaScript 测试框架，专注于简洁明快。React Native 已经集成好了，直接使用即可。

## 自动化运维

> 这部分作者接触不深，只知道 Jekens + GitLab 的方案

### shell 文件的坑

为了安全性 shell 文件默认都是不可执行的，当然也包括 `android/gradlew` 这个用来打包的脚本文件，这会给持续集成带来麻烦：运维同学默认是执行不了我们的打包命令的。解决办法很简单：

```shell
$ git update-index --add --chmod=+x android/gradlew
```

### 动态设置 package.json 的版本

set-version.sh:

```sh
#!/bin/bash

# current_git_branch_latest_id=`git rev-parse HEAD`
current_git_branch_latest_short_id=`git rev-parse --short HEAD`
current_os=`uname -s`

# echo current git branch latest commit id=$current_git_branch_latest_id
echo current git branch latest commit short id=$current_git_branch_latest_short_id
echo current os=$current_os

if [ "$current_os" == "Darwin" ]
  then
  sed -i '' 's/"version".*/"version": "1.0.0-'$current_git_branch_latest_short_id'",/g' package.json
else
  echo windows
  sed -i 's/"version".*/"version": "'$current_git_branch_latest_short_id'",/g' package.json
fi
```

package.json:

```json
{
  // 依赖 husky
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "post-commit": [
        "./scripts/set-version.sh",
        "git add .",
        "git commit -m bump version",
        "git push"
      ]
    }
  },
}
```

## 官方组件缺陷处理

- [React Native 解决Image 圆角在安卓上面没效果](https://github.com/youngjuning/blog/issues/7)
- [React Native 处理Android系统上文字偏下的问题](https://github.com/youngjuning/blog/issues/6)
- [React Native 自定义 TextInput 高度的问题](https://github.com/youngjuning/blog/issues/5)
- [[Android] Using TextInput inside ViewPagerAndroid causes context menu (copy/paste) in some cases to not display](https://github.com/youngjuning/blog/issues/32)

## VsCode 插件推荐

- React Native TypeScript Snippets: 本人开发，主要服务于本文的架构，帮助开发者快速搭建页面和组件，凡是重复的工作都可以靠工具来解决，一个不够，就来俩！！！
- ES7 React/Redux/GraphQL/React-Native Snippets

## 性能优化

### 自动 remove console 语句

准确地说，是在正式环境下删除 `console` 语句，配置方式请参考 [自动 remove console 语句](https://bre.is/2CTUZyUj)

### 推荐阅读

- [React Native 性能优化指南【全网最全，值得收藏】](https://juejin.im/post/5e1676e16fb9a04847095b12)

## 应用内测

- [fir](https://fir.im/): 免费应用内测托管平台
- [蒲公英](https://www.pgyer.com/): 免费的苹果ios应用app内测分发托管、android安卓app内测分发托管、ios企业签名、ios专属签名、ios超级签名、ios企业账号

## 安卓必知必会

### 配置应用名

很简单,我们直接打开 `android/app/src/main/res/values/strings.xml`，即可看到配置中的 `app_name`，修改为你想要的即可。

> 你可以在初始化项目的时候指定应用的名字，像这样：`npx react-native init MyApp --title 掘金`

### 配置图标

1、使用[图标工厂](https://icon.wuruihong.com/)、[react-native-svg-app-icon](https://www.npmjs.com/package/react-native-svg-app-icon) 或者让设计师给图片

2、在 `android\app\src\main\res\mipmap-xxxxxx` 中直接覆盖图标就可以，注意图标的大小。

### 打包 APK

1、在项目根目录执行 `keytool -genkeypair -v -keystore release.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000` 生成密钥文件 `release.keystore`

2、把 `release.keystore` 文件放到你工程中的 `android/app` 文件夹下。

3、配置 `android/app/build.gradle`

```groovy
android{
    ...
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword "****"
            keyAlias "my-key-alias"
            keyPassword "****"
        }
    }
    ...
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

### 打包优化

#### 去除无用的语言资源

通过配置 `android/defaultConfig/resConfigs` 可以选择只打包哪几种语言，进而去掉各种 `aar` 包中全世界的语言，尤其是 `support` 包中的。

选择保留什么语言要根据产品的用户和市场来定，如果只选择默认英语和中文语言，配置如下：

```groovy
defaultConfig {
	resConfigs "en","zh"
}
```

#### 配置 PackagingOptions

打开 `android/app/build.gradle` 文件，添加如下配置：

```groovy
packagingOptions {
    exclude 'META-INF/android_release.kotlin_module'
    exclude 'META-INF/DEPENDENCIES'
    exclude 'META-INF/LICENSE'
    exclude 'META-INF/LICENSE.txt'
    exclude 'META-INF/license.txt'
    exclude 'META-INF/NOTICE'
    exclude 'META-INF/NOTICE.txt'
    exclude 'META-INF/notice.txt'
    exclude 'META-INF/ASL2.0'
}
```

- `pickFirsts`: 当出现重复文件，会使用第一个匹配的文件打包进入 apk
- `merges`: 当出现重复文件，合并重复的文件打入 apk
- `excludes`: 打包的时候排除匹配的文件

#### 配置 splits

> 查看手机 CPU 信息：`adb shell` -> `cd /proc` -> `cat cpuinfo`

默认情况下，生成的 `APK` 会同时包含针对于 `x86` 和 `ARMv7a` 两种 `CPU` 架构的原生代码。这样可以让我们更方便的向其他人分享这个 `APK`，因为它几乎可以运行在所有的 Android 设备上。但是，这会导致所有设备上都有一些根本不会运行的代码，白白占据了空间。目前安卓设备绝大多数是 `ARM` 架构，因此对于大部分应用来说可以考虑去掉 `x86` 架构的支持。

你可以在 `android/app/build.gradle` 中修改如下代码：

```diff
- include "armeabi-v7a", "x86", "arm64-v8a", "x86_64"
+ include "armeabi-v7a", "arm64-v8a"
- def versionCodes = ["armeabi-v7a":1, "x86":2, "arm64-v8a": 3, "x86_64": 4]
+ def versionCodes = ["armeabi-v7a":1, "arm64-v8a": 2]
```

### gradle 编译速度优化配置

在 `android\gradle.properties` 中加入以下配置：

```
# 让gradle使用单独的守护进程
org.gradle.daemon=true
# 让gradle并行编译
org.gradle.parallel=true
# 让gradle在需要的时候才配置
org.gradle.configureondemand=true
# 增加gradle运行的java虚拟机的大小
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=4096m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

### BuildConfig

> 在 react-native 中，我们可以借助 react-native-config-reader 来方便地读取这些属性

`BuildConfig` 是程序编译后，根据 `buildType` 生成在 `app\build\generated\source\buildConfig\debug(release)\` 包名下的一个 java 文件。默认有一下属性：

- `DEBUG`：是否是调试版本
- `APPLICATION_ID`：当前应用的包名
- `FLAVOR`：产品（渠道包的名称）
- `BUILD_TYPE`：当前的编译类型(`release`/`debug`)
- `VERSION_CODE`：版本号(数字)
- `VERSION_NAME`：版本号

#### 自定义 BuildConfig

```java
defaultConfig {
  // 三个参数: 1.要定义的常量的类型 2.该常量的命名 3.该常量的值
  // APP_NAME，对应 ios 的 CFBundleDisplayName
  buildConfigField "String", "APP_NAME", '"我是谁"'
  // BUILD_TIME
  buildConfigField "String", "BUILD_TIME", '"' + new Date().format("yyyy-MM-dd HH:mm:ss", TimeZone.getTimeZone("Asia/Shanghai")) + '"'
}
```

#### 在子模块中取主项目的 BuildConfig

```java
...
public static Object getBuildConfigValue(Context context, String fieldName) {
  try {
    Class<?> clazz = Class.forName(context.getPackageName() + ".BuildConfig");
    Field field = clazz.getField(fieldName);
    return field.get(null);
  } catch (ClassNotFoundException e) {
    e.printStackTrace();
  } catch (NoSuchFieldException e) {
    e.printStackTrace();
  } catch (IllegalAccessException e) {
    e.printStackTrace();
  }
  return null;
}
...
String versionName = (String)getBuildConfigValue(activity, "VERSION_NAME"))
```

### 解决在 Android P 上的提醒弹窗 （Detected problems with API compatibility(visit g.co/dev/appcompat for more info)

在 `MainActivity.java` 中添加 closeAndroidPDialog 方法并在 `onCreate` 方法中调用

```java
import android.os.Bundle;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
...
@Override
protected void onCreate(Bundle savedInstanceState) {
  closeAndroidPDialog(); // here
  super.onCreate(savedInstanceState);
}
...
private void closeAndroidPDialog(){
  try {
    Class aClass = Class.forName("android.content.pm.PackageParser$Package");
    Constructor declaredConstructor = aClass.getDeclaredConstructor(String.class);
    declaredConstructor.setAccessible(true);
  } catch (Exception e) {
    e.printStackTrace();
  }
  try {
    Class cls = Class.forName("android.app.ActivityThread");
    Method declaredMethod = cls.getDeclaredMethod("currentActivityThread");
    declaredMethod.setAccessible(true);
    Object activityThread = declaredMethod.invoke(null);
    Field mHiddenApiWarningShown = cls.getDeclaredField("mHiddenApiWarningShown");
    mHiddenApiWarningShown.setAccessible(true);
    mHiddenApiWarningShown.setBoolean(activityThread, true);
  } catch (Exception e) {
    e.printStackTrace();
  }
}
```

### 自定义安卓打包的后缀

配置 `android/app/build.gradle`:

```groovy
...
def releaseTime() {
    return new Date().format("yyyyMMdd-HHmmss", TimeZone.getTimeZone("GMT+08:00"))
}
...
android: {
    applicationVariants.all { variant ->
        ...
    		variant.outputs.all {
            // the apk name is e.g. galaxy_v1.0.1_2018-11-1_debug.apk
           outputFileName = "galaxy_v${defaultConfig.versionName}_${releaseTime()}_${variant.buildType.name}.apk"
        }
        ...
    }
}
```

### 常见报错及解决办法

#### Failed to read PNG signature: file does not start with PNG signature

有时从网上下载的 Demo 资源文件不规范，会出现直接将 jpg 文件改为 png 后缀名的情况，gradle 打包检查时报错编译通不过的。我们通过 `aaptOptions.cruncherEnabled=false` 来禁止 Gradle 检查 png 的合法性：

```groovy
android {
  aaptOptions {
    cruncherEnabled=false
  }
}
```

#### [com.android.build.api.transform.TransformException](http://t.cn/EZcTDtV)

在 `android\gradle.properties` 中加入以下配置：

```
dexOptions.javaMaxHeapSize = 2g
```

#### The number of method references in a .dex file cannot exceed 64K.

随着 Android 平台的持续成长，Android 应用的大小也在增加。当您的应用及其引用的库达到特定大小时，您会遇到构建错误，指明您的应用已达到 Android 应用构建架构的极限。

解决办法是配置您的应用进行 `Dalvik` 可执行文件分包，在 `android/app/build.gradle` 中做下面的配置：

```diff
defaultConfig {
+    multiDexEnabled true
}
```

## ios必知必会

> 这部分目前作者接触不深，有大佬可以联系我补充！！！

### 镜像

> `pod install` 会从 GitHub 拉代码，所以在国内会很慢。年轻人要爱国，自觉不翻墙！！！

- [Homebrew 镜像使用帮助](https://github.com/youngjuning/blog/issues/10)
- [CocoaPods 镜像使用帮助](https://mirror.tuna.tsinghua.edu.cn/help/CocoaPods/)

### 配置应用名

1. 选中工程名称
2. 找到右侧菜单 `Info` 选项
3. 添加 `Bundle display name` 并把 `value` 设置成 "应用名称"
4. 最后重新再 `Run`一次，即可看到最新的效果

> 你可以在初始化项目的时候指定应用的名字，像这样：`npx react-native init MyApp --title 掘金`

### 配置图标

1、使用[图标工厂](https://icon.wuruihong.com/)、[react-native-svg-app-icon](https://www.npmjs.com/package/react-native-svg-app-icon) 或者让设计师给图片
2、把准备好的图标拖到图中箭头指向的位置：

<img src="https://i.loli.net/2020/02/21/Sy3OjWBKbMdYgoH.png" style="zoom:36%;" />

###  获取BUILD_TYPE

在 `Info.plist` 中添加 `BUILD_TYPE`，取值为 `$(CONFIGURATION)`

### 获取构建时间

在 `Info.plist` 中添加 `BUILD_TIME`,取值为空，并通过脚本在每次编译的时候对其更新，脚本添加步骤 `Target`-> `Build Phases` -> `+` -> `New Run Script Phase`, Shell 代码如下：

```shell
#!/bin/bash
infoplist="$BUILT_PRODUCTS_DIR/$INFOPLIST_PATH"
builddate=`date +%Y-%m-%d_%H:%M`
if [[ -n "$builddate" ]]; then
/usr/libexec/PlistBuddy -c "Set :BUILD_TIME $builddate" ${infoplist}
fi
```

### 权限申请

- `Privacy - Camera Usage Description`
- `Privacy - Photo Library Usage Description`
- `Privacy - Microphone Usage Description`

## Lean Core

| COMPONENT            | DEPRECATED? | NEW HOME                                                     |
| :------------------- | :---------- | :----------------------------------------------------------- |
| **AsyncStorage**     | 0.59        | [@react-native-community/react-native-async-storage](https://github.com/react-native-community/react-native-async-storage) |
| **ImageStore**       | 0.59        | [expo-file-system](https://github.com/expo/expo/tree/master/packages/expo-file-system) or [react-native-fs](https://github.com/itinance/react-native-fs) |
| **MaskedViewIOS**    | 0.59        | [@react-native-community/react-native-masked-view](https://github.com/react-native-community/react-native-masked-view) |
| **NetInfo**          | 0.59        | [@react-native-community/react-native-netinfo](https://github.com/react-native-community/react-native-netinfo) |
| **Slider**           | 0.59        | [@react-native-community/react-native-slider](https://github.com/react-native-community/react-native-slider) |
| **ViewPagerAndroid** | 0.59        | [@react-native-community/react-native-viewpager](https://github.com/react-native-community/react-native-viewpager) |
| **WebView**          | 0.60        | [react-native-webview](https://github.com/react-native-community/react-native-webview) |
| **NetInfo**          | 0.60        | [@react-native-community/netinfo](https://github.com/react-native-community/react-native-netinfo) |
| **Geolocation**      | 0.60        | [@react-native-community/geolocation](https://github.com/react-native-community/react-native-geolocation) |
| **Apple TV Support** | 0.62        | [react-native-community/react-native-tvos](https://github.com/react-native-community/react-native-tvos) |

## 联系作者

|                           作者微信                           |                           知识星球                           |                           赞赏作者                           |
| :----------------------------------------------------------: | :----------------------------------------------------------: | :----------------------------------------------------------: |
| <img src="https://user-gold-cdn.xitu.io/2020/2/24/17074acbb24c7412?w=200&h=200&f=jpeg&s=17183" style="width:200px"/> | <img src="https://user-gold-cdn.xitu.io/2020/2/24/17074acbb26af8e1?w=200&h=200&f=png&s=39093" style="width:200px"/> | <img src="https://user-gold-cdn.xitu.io/2020/2/24/17074acbb338c643?w=698&h=700&f=png&s=315492" style="width:200px"/> |
