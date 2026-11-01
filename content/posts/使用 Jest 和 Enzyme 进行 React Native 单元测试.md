---
id: "e749b3a78acee689"
title: "使用 Jest 和 Enzyme 进行 React Native 单元测试"
description: "通常来说，程序员每修改一次程序就会进行最少一次单元测试，在编写程序的过程中前后很可能要进行多次单元测试，以证实程序达到软件规格书要求的工作目标，没有程序错误。在 TDD 中，甚至是先根据设计编写单元测试，然后根据单元测试写代码。"
date: "2023-04-19"
topic: "engineering"
tags: ["React Native","Jest","Enzyme","单元测试","测试覆盖率","TDD"]
source: "https://github.com/youngjunning/blog.zisheng.pro/blob/3edd776416630100b4a100bc90b84dd1d66b3596/source/_posts/%E4%BD%BF%E7%94%A8-Jest-%E5%92%8C-Enzyme-%E8%BF%9B%E8%A1%8C-React-Native-%E5%8D%95%E5%85%83%E6%B5%8B%E8%AF%95.md"
sourceDate: "2023-04-19T17:48:29.000Z"
cover: "/media/article-title-e749b3a78acee689.svg"
assets: {"https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/411210ad2c1b46a69444efca8b5f9c35~tplv-k3u1fbpfcp-zoom-1.image":"/media/7ad083a186f3755d08477752.png","https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/304867f9cd894882b110a3f36eb491f4~tplv-k3u1fbpfcp-zoom-1.image":"/media/b564f2358f74628036d0a615.png","https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0f9eaa5afd7c48a8a0c6e354075790db~tplv-k3u1fbpfcp-zoom-1.image":"/media/b471fa305392b926960ad55a.png","https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9c6240f0c86b497999fe854b20533b1a~tplv-k3u1fbpfcp-zoom-1.image":"/media/121f1a91504222a04ff7fc8c.png","https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/530b087960784ddd821a4fe86d06525e~tplv-k3u1fbpfcp-zoom-1.image":"/media/8d0c3e9384324e0ae7e452b8.png","https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2215ef958ea5409aad116f07f42543d8~tplv-k3u1fbpfcp-zoom-1.image":"/media/d347176b528ed2db19af47dc.png"}
unavailableAssets: ["https://user-images.githubusercontent.com/88981/52933895-c0d47600-338f-11e9-9034-11e1ad0c42f1.gif","https://imgur.com/download/Po1unSh"]
originalBodySha256: "e067880236aea0ead30180f5e215c200e6c7fedeeec5d7a5613d349c12ee89d0"
---

## 单元测试是什么 🧐

单元测试是用来对一个模块、一个函数或者一个类来进行正确性检验的测试工作。程序单元是应用的最小可测试部件，在 React 编程中，最小单元通常是组件、函数。如果你熟悉“测试驱动开发”（TDD：Test-Driven Development），单元测试也不会陌生，狭义来说就是单测驱动开发。

通常来说，程序员每修改一次程序就会进行最少一次单元测试，在编写程序的过程中前后很可能要进行多次单元测试，以证实程序达到软件规格书要求的工作目标，没有程序错误。在 TDD 中，甚至是先根据设计编写单元测试，然后根据单元测试写代码。

万丈高楼平地起，单元测试和文档一样，是保障程序最小单元质量的重要一环。试想一下，一块砖可能不需要使用说明书就可以量产使用，但是一块砖不经质检测验就投入使用带来的后果可能是恐怖的。从这个角度来看，单测可能是比文档更重要的存在。当然我们也不提倡为了单测而单测，单测是为了防范于未然。

## 其他测试

前端测试常见的测试类型有单元测试(Unit testing)、集成测试(Integration testing)、端到端(E2E testing)测试，一般我们投入的测试资源排序如下：

![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/411210ad2c1b46a69444efca8b5f9c35~tplv-k3u1fbpfcp-zoom-1.image)

集成测试是在单元测试的基础上，集成多个模块进行测试，确保模块之间互动行为正确无误的工作。有时，单一的模块完全通过单元测试，单独使用也没有问题，但是当与其他模块配合使用时，可能就出现问题了，下图是未通过集成测试的例子：

![紫升](https://user-images.githubusercontent.com/88981/52933895-c0d47600-338f-11e9-9034-11e1ad0c42f1.gif)

端到端测试是站在用户角度出发（一端）到真实运行环境（另一端）进行测试。一般我们会使用 Cypress、puppeteer 这些工具进行自动化测试以替代人肉测试。下图是未通过端到端测试的例子：

![紫升](https://imgur.com/download/Po1unSh)

## 测试覆盖率

我们在测试的时候，会经常关心我们的代码是否都测试到了，以及哪些代码没有测试到。jest 内置了 Istanbul 测试覆盖率工具，我们可以通过四个维度的覆盖率来了解代码测试覆盖率情况：

- Statements（stmts）：表达式覆盖率，是不是每个表达式都执行了？
- Branches（Branch）：分支覆盖率，是不是每个 if 代码块都执行了？
- Functions（Funcs）：函数覆盖率，是不是每个函数都调用了？
- Lines（Lines）：行覆盖率，是不是每一行都执行了？

下图是执行 `jest --coverage` 之后生成的命令行输出：

![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/304867f9cd894882b110a3f36eb491f4~tplv-k3u1fbpfcp-zoom-1.image)

下图是生成的精美的测试覆盖率报告：

![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0f9eaa5afd7c48a8a0c6e354075790db~tplv-k3u1fbpfcp-zoom-1.image)

点击 App.js 可以查看单个文件的测试覆盖率情况：

![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9c6240f0c86b497999fe854b20533b1a~tplv-k3u1fbpfcp-zoom-1.image)

点开每个也没你，你会看到页面是五颜六色的，别担心，这些颜色都是有明确的意义：

- 粉紅色的代码: 尚未被执行的 statement 或 function
- 黄色的代码: 沒被覆盖到的 branch
- I: 代表 if-else 的 if 没有被执行
  > ![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/530b087960784ddd821a4fe86d06525e~tplv-k3u1fbpfcp-zoom-1.image)
- E: 代表 if-else 的 if 没有被执行
  > ![紫升](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2215ef958ea5409aad116f07f42543d8~tplv-k3u1fbpfcp-zoom-1.image)
- Nx: 代表代码块被执行到的次数，可以作为代码性能的参考依据

## 安装依赖

```shell
$ yarn add jest -D
# babel
$ yarn add babel-jest -D
# enzyme
$ yarn add enzyme jest-enzyme enzyme-adapter-react-16 enzyme-to-json -D
# react-native-mock-render
$ yarn add react-native-mock-render -D
# types
$ yarn add @types/enzyme @types/jest @types/react @types/react-native -D
```

工具介绍：

- jest: Jest 是一个令人愉快的 JavaScript 测试框架，专注于简洁明快。
- enzyme: Enzyme 是用于 React 的 JavaScript 测试实用程序，可以更轻松地测试 React 组件的输出。您还可以根据给定的输出进行操作，遍历并以某种方式模拟运行时。
- jest-enzyme: 针对 enzyme 的 Jest 断言
- enzyme-adapter-react-16: React Native 测试所需的桥接器
- enzyme-to-json: 将 Enzyme wrappers 转换成符合 Jest 快照测试的 JSON 格式。
- react-native-mock-render: A fully mocked and test-friendly version of react native

## 配置

### jest.config.js

```js
module.exports = {
  preset: 'react-native',
  verbose: true,
  collectCoverage: true,
  moduleNameMapper: {
    // for https://github.com/facebook/jest/issues/919
    '^image![a-zA-Z0-9$_-]+$': 'GlobalImageStub',
    '^[@./a-zA-Z0-9$_-]+\\.(png|gif)$': 'RelativeImageStub',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  snapshotSerializers: ['enzyme-to-json/serializer'],
};
```

- collectCoverage: 生成测试覆盖率报告
- setupFilesAfterEnv: 使用 Jest 运行安装文件以配置 Enzyme 和适配器（如下文`jest.setup.js`中所示），之前是`setupTestFrameworkScriptFile`，也可以使用`setupFiles`
- snapshotSerializers：推荐使用序列化程序使用`enzyme-to-json`，它的安装和使用非常简单，并允许您编写简洁的快照测试。

> 注意：Jest 在 [24.1.0](https://stackoverflow.com/questions/55752673/option-setuptestframeworkscriptfile-was-replaced-by-configuration-setupfilesa) 之后只能使用 `setupFilesAfterEnv`

### jest.setup.js

```js
import 'react-native';
import 'react-native-mock-render/mock';
import 'react-native/Libraries/Animated/src/bezier'; // for https://github.com/facebook/jest/issues/4710
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });
```

## enzyme 入门

enzyme 是 Airbnb 开源的 react 测试类库，提供了一套简洁强大的 API，并通过 jquery 风格的方式进行 dom 处理，开发体验十分友好. 它提供三种测试方法.

### shallow

shallow 返回组件的浅渲染，对官方 shallow rendering 进行封装。浅渲染 作用就是：它仅仅会渲染至虚拟 dom，不会返回真实的 dom 节点，这个对测试性能有极大的提升。shallow 只渲染当前组件，只能能对当前组件做断言

### mount

mount 方法用于将 React 组件加载为真实 DOM 节点。mount 会渲染当前组件以及所有子组件。多数情况下，shallow 方法就能满足我们的需求了。ref 测试则旨在 mount 模式下生效。

### render

render 采用的是第三方库 Cheerio 的渲染，渲染结果是普通的 html 结构，对于 snapshot 使用 render 比较合适。

## 组件测试

### 组件快照测试

当我们要确保 UI 不会意外更改时，快照测试都是非常有用的工具。通过 `toMatchSnapshot` 即可完成。

```js
describe('Button Component', () => {
  it('basic render', () => {
    const component = renderer.create(<Button />).toJSON();
    expect(component).toMatchSnapshot();
  });
});
```

### 生命周期测试

#### componentDidMount

通过调用 `shallow` 和 `mount` 方法，可以触发 componentDidMount 生命周期：

```js
import { shallow } from 'enzyme';

function setup(props = {}) {
  const wrapper = shallow(<CarouselComponent />);
  const instance = wrapper.instance();
  return { wrapper, instance };
}

describe('Carousel Component', () => {
  it('renders correctly', () => {
    setup();
  });
});
```

也可以通过 `wrapper.setState` 方法进行触发：

```js
import { shallow } from 'enzyme';

function setup(props = {}) {
  const wrapper = shallow(<Component {...props} />);
  const instance = wrapper.instance();
  return { wrapper, instance };
}

describe('Component', () => {
  it('renders correctly', () => {
    const { wrapper } = setup();
    wrapper.setState({
      enable: true,
    });
  });
});
```

#### componentWillUnMont

通过调用 `wrapper.unmount()` 可以触发 componentWillUnMont 生命周期：

```js
import { shallow } from 'enzyme';

function setup(props = {}) {
  const wrapper = shallow(<Component />);
  const instance = wrapper.instance();
  return { wrapper, instance };
}
describe('Carousel Component', () => {
  it('renders correctly', () => {
    const { wrapper } = setup();
    expect(wrapper).toMatchSnapshot();
    wrapper.unmount();
    expect(wrapper).toMatchSnapshot();
  });
});
```

#### componentWillReceiveProps

可以通过 `wrapper.setProps` 方法触发：

```js
import { shallow } from 'enzyme';

function setup(props = {}) {
  const wrapper = shallow(<Component {...props} />);
  const instance = wrapper.instance();
  return { wrapper, instance };
}

it('componentWillReceiveProps', () => {
  const { wrapper, instance } = setup({
    autoplay: true,
  });
  wrapper.setProps({ autoplay: false });
});
```

### 定时器模拟（Timer Mocks）

原生定时器功能(即 setTimeout，setInterval，clearTimeout，clearInterval)对于测试环境来说不太理想，因为它们依赖于实时时间。
Jest 可以将定时器换成允许我们自己控制时间的功能。

这里我们通过调用 `jest.useFakeTimers()` 来启用假定时器。然后在需要的时候执行 `jest.runOnlyPendingTimers()` 来触发定时器：

```js
import { shallow } from 'enzyme';

jest.useFakeTimers();

it('autoplay methods with count(2) and os(ios)', () => {
  const { wrapper, instance } = setup({
    autoplay: true,
    loop: false,
  });
  wrapper.setState({ isScrolling: true }, () => {
    jest.runOnlyPendingTimers();
  });
});
```

## FAQ

### 如何忽略某一块代码

添加以下格式的注释到要忽略的代码块前即可：

```js
/* istanbul ignore next */
```

### 使用 mount 时，忽略 React Native 的警告

- 参考自：[Remove warnings when rendering react-native components](https://github.com/enzymejs/enzyme/issues/831#issuecomment-352934963)

```js
describe('mounting', () => {
    const origConsole = console.error;
    beforeEach(() => {
      console.error = () => {};
    });
    afterEach(() => {
      console.error = origConsole;
    });
    it ......
       mount....
});
```

### 常见 issues

- enzyme
  - [Create Adapter for React Native & React 16](https://github.com/enzymejs/enzyme/issues/1436)
  - [Can't simulate press event in react-native](https://github.com/enzymejs/enzyme/issues/991)
  - [Shallow with New React Context API. Consumer not getting context](https://github.com/enzymejs/enzyme/issues/1636)
  - [Enzyme is not finding component by props](https://stackoverflow.com/questions/40776121/enzyme-is-not-finding-component-by-props)
- jest

  - [TypeError: Cannot read property 'Object.<anonymous>' of null](https://github.com/facebook/jest/issues/4710)
  - [Jest - how to test if a component does not exist?](https://stackoverflow.com/questions/46252396/jest-how-to-test-if-a-component-does-not-exist)
  - [Refs not working in component being shallow rendered](https://github.com/enzymejs/enzyme/issues/316)
  - [ReferenceError: You are trying to `import` a file after the Jest environment has been torn down.](https://github.com/facebook/jest/issues/6434)

- react-native
  - [requiring image in react-native](https://github.com/facebook/jest/issues/919)
  - [Cannot find module 'setupDevtools' from 'setup.js'](https://github.com/facebook/jest/issues/3822)
  - [Unable to resolve module `./views/assets/back-icon.png`](https://github.com/react-navigation/react-navigation/issues/7950#issuecomment-615220412)
