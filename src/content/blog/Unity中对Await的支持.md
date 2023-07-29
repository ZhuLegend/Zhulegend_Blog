---
external: false
title: "Unity中对Await的支持"
description: "简要介绍了Unity 2023.1开始对C#中 await 的支持，并提供了数个await的应用场景"
date: 2023-07-29
---

## 为什么要用 Await

Unity 中如果一直要用异步操作，往常只能使用协程，通过 `IEnumerator` 来实现。协程在一些情况下已经足够好了，例如延迟数秒执行代码，例如等待到下一帧执行。但是，通过协程执行函数存在一个较大的问题——无法获取异步的返回值。而在部分情况下，返回值是必要的，例如，从 API 异步的获取数据、从数据库载入数据等。**使用 `Await` ，可以运行你获取异步执行的返回值，同时以近似同步的方式编写异步代码，自由且简单的在主线程和后台线程间切换任务**。

这里是一个简单的例子：

```csharp
async Awaitable<List<Achievement>> GetAchivementsAsync()
{
    var apiResult = await SomeMethodReturningATask(); // 或者其他可等待类型
    JsonConvert.DeserializeObject<List<Achievement>>(apiResult);
}

async Awaitable ShowAchievementsView()
{
    ShowLoadingOverlay();
    var achievements = await GetAchievementsAsync();
    HideLoadingOverlay();
    ShowAchivementsList(achievements);
}
```

本文将会基于 Unity 官方文档([await support](https://docs.unity.cn/cn/2023.2/Manual/AwaitSupport.html))，结合个人理解，简要介绍 Unity 2023.1 中新增的 `await` 支持、在 Unity 中使用 `Awaitable` 需要注意的地方、 `await` 和 协程、C# Job的差别并在最后提供几个 `await` 的使用示例。

## Unity 2023.1 中新增的 await

`Await` 这一异步函数编写、调用方式已经出现很久了，这里就不再赘述。Unity 对 `Await` 提供了以下几个方面的支持

- 支持协程：[ `NextFrameAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable.NextFrameAsync.html), [ `WaitForSecondsAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable.WaitForSecondsAsync.html), [ `EndOfFrameAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable.EndOfFrameAsync.html), [ `FixedUpdateAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable.FixedUpdateAsync.html)等函数。
- 支持在后台线程([ `BackgroundThreadAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable.BackgroundThreadAsync.html))和主线程([ `MainThreadAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable:MainThreadAsync.html))之间切换
- 所有继承自异步操作的类(包括[ `SceneManager.LoadSceneAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/SceneManagement.SceneManager.LoadSceneAsync.html)、[ `AssetBundle.LoadAssetAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/AssetBundle.LoadAssetAsync.html)、[ `Resources.LoadAsync` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Resources.LoadAsync.html))
- Unity 事件([ `UnityEvent` ](https://docs.unity3d.com/cn/2023.2/Manual/UnityEvents.html))
- 异步读回 GPU 资源([ `AsyncGPUReadback` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Rendering.AsyncGPUReadback.html))
- 用户自定义的[ `Awaitable` ](https://docs.unity3d.com/cn/2023.2/ScriptReference/Awaitable.html)类

这里值得关注的就是 Unity 提供的 `Awaitable` 类，对于基础的 C#类，我们使用 `System.Threading.Task` 作为异步函数返回值的标记，但是 Unity 针对游戏需求，设计了可能更适合游戏开发场景的异步返回值类型，下面将详细介绍两者异同。

## Unity 中 Awaitable 的注意事项

对于为何要单独设计一个 `Awaitable` 类，Unity 官方文档中是这么说的：

> Unity’s Awaitable class is designed to be as efficient as possible for use in Unity game or app projects, however this efficiency comes with some trade-offs compared with .NET tasks. The most significant limitation is that Awaitable instances are pooled to limit allocations.

> 大意如下：
> Unity 的 `Awaitable` 类旨在尽可能高效地用于 Unity 游戏或应用程序项目，但与 .NET 任务相比，这种效率需要权衡取舍。最重要的限制是将 `Awaitable` 实例存储在对象池中以限制分配

在 Unity 官方文档中举了这样一个例子:

```csharp
class SomeMonoBehaviorWithAwaitable : MonoBehavior
{
    public async void Start()
    {
        while(true)
        {
            // do some work on each frame
            await Awaitable.NextFrameAsync();
        }
    }
}
```
> Without pooling, each instance of this behavior would allocate an Awaitable object each frame. This would put a lot of pressure on the garbage collector causing performance to suffer. To mitigate that, once awaited, Unity returns the Awaitable object to the internal Awaitable pool. This has one significant implication: **you should never await more than once on an Awaitable instance**. Doing so can result in undefined behavior such as an exception or a deadlock.

> 大意：
> 如果没有对象池，此 `MonoBehavior` 类的每个实例将在每帧分配一个 `Awaitable` 对象。这会给垃圾回收器带来很大的压力，导致性能受到影响。为了缓解这种情况，Unity 在`await`后会将 `Awaitable` 对象返回到内部可等待池。这有一个重要的含义：**您永远不应该在可等待的( `Awaitable` )实例上等待( await )超过一次**。这样做可能会导致未定义的行为，例如异常或死锁。

文档中也提供了这样的一张对比表

|                                                                 |                                           System.Threading.Task                                            |                                      UnityEngine.Awaitable                                       |
|-----------------------------------------------------------------|:----------------------------------------------------------------------------------------------------------:|:------------------------------------------------------------------------------------------------:|
| Can be awaited multiple times(可以被多次等待 `await`)                  |                                                     是                                                      |                                                否                                                 |
| Can return a value(可以返回值)                                       |                   Yes, using System.Threading.Task<T>(是，使用 `System.Threading.Task<T>` )                    |             Yes, using UnityEngine.Awaitable<T> (是，使用  `UnityEngine.Awaitable<T>` )              |
| Completion can be triggered by code(完成( `Completion` )可以通过代码触发) |      Yes, using System.Threading.TaskCompletionSource(是，使用 `System.Threading.TaskCompletionSource` )       | Yes, using UnityEngine.AwaitableCompletionSource (是，使用 `UnityEngine.AwaitableCompletionSource` ) |
| Continuation are run asynchronously (连续代码异步运行)                  | Yes, by default using the synchronization context, otherwise using the ThreadPool (是，默认情况下使用同步上下文，否则使用线程池) |       No, continuation is run synchronously when completion is triggered (否，触发完成时同步运行连续代码)       |

关于第一点上面已经介绍过了，第三点对于集成当前已有的通过回调形式实现的异步函数很有用。第四点可能有一些疑惑，这里解释一下：

> Continuation are run asynchronously (连续代码异步运行)

指的是当一段异步代码运行到 `await` 并等待到结果返回之后，后续代码是立即开始连续运行还是进入异步任务队列等待。这对于实际开发中没有实际影响。但是通常来说，**连续运行的同一异步代码段中代码会在同一线程中运行，异步运行的同一异步代码段可能在不同线程中运行**（这主要是因为两者异步的底层实现不同）。如果在之后遇到了奇怪的Bug可以考虑这个因素。

在介绍了Unity中 `await` 使用的注意事项之后，下面会给出几个例子来展示 `await` 可能的使用场景。

## await 使用示例

### 通过 AwaitableCompletionSource 封装现有异步操作

在有些时候，我们需要等待用户输入后才能继续执行后续操作。往常需要通过在用户输入后执行回调函数实现，但是有了 `AwaitableCompletionSource` 我们可以手动调用 `AwaitableCompletionSource.SetResult` 来触发完成( `Completion` )。

```csharp
public class UserNamePrompt : MonoBehavior 
{
    TextField _userNameTextField;
    AwaitableCompletionSource<string> _completionSource = new AwaitableCompletionSource<string>();
    public void Start()
    {
        var rootVisual = GetComponent<UIDocument>().rootVisualElement;
        var userNameField = rootVisual.Q<TextField>("userNameField");
        rootVisual.Q<Button>("OkButton").clicked += ()=>{
            _completionSource.SetResult(userNameField.text);
        }
    }

    public static Awaitable<string> WaitForUsernameAsync() => _completionSource.Awaitable;
}

...

public class HighScoreRanks : MonoBehavior 
{
    ...
    public async Awaitable ReportCurrentUserScoreAsync(int score)
    {
        _userNameOverlayGameObject.SetActive(true);
        var prompt = _userNameOverlayGameObject.GetComponent<UserNamePrompt>();
        var userName = await prompt.WaitForUsernameAsync();
        _userNameOverlayGameObject.SetActive(false);
        await SomeAPICall(userName, score);
    }
}
```

可以看到，通过上述代码，我们避免了通过回调函数实现用户名称的设置，相关代码被放在一个整体的代码块中，可读性和整洁性都有了显著的提升。

需要注意的是，在调用 `SetResult` 方法之后，**TODO： SetResult之后Awaitable对象是否会自动重置为新的**

### 在后台线程中执行繁重任务

```csharp
private async Awaitable<float> DoSomeHeavyComputationInBackgroundAsync(bool continueOnMainThread = true)
{
    // 调用该函数后，后续代码都会在后台线程执行
    await Awaitable.BackgroundThreadAsync();
    
    // 这里可以开始执行繁重任务了
    float result = 42;

    // 默认情况，切换回主线程
    // 如果不切换回主线程，获得该 Awaitable 返回值的代码段也会在后台线程执行
    // 这会导致部分只能在主线程执行的代码报错(如下面的 SceneManager.LoadSceneAsync 不在主线程运行时报错)
    if(continueOnMainThread){
        await Awaitable.MainThreadAsync();
    }
    return result;
}

public async Awaitable Start()
{
    var computationResult = await DoSomeHeavyComputationInBackgroundAsync();
    await SceneManager.LoadSceneAsync("my-scene");
}
```

### 帧同步

```csharp
async Awaitable SampleSchedulingJobsForNextFrame()
{
    // 在帧结束后执行以避免和 Unity 其他子系统出现资源冲突
    await Awaitable.EndOfFrameAsync(); 
    var jobHandle = ScheduleSomethingWithJobSystem();
    // 在下一帧开始时执行任务
    await Awaitable.NextFrameAsync();
    jobHandle.Complete();
    // 使用计算结果
}

JobHandle ScheduleSomethingWithJobSystem()
{
    ...
}
```

### 异步加载结果

```csharp
public async Awaitable Start()
{
    var operation = Resources.LoadAsync("my-texture");
    await operation;
    var texture = operation.asset as Texture2D;
}
```

### 混合多个 Await 程序

```csharp
public async Awaitable Start() 
{ 
    await CallSomeThirdPartyAPIReturningDotnetTask(); 
    await Awaitable.NextFrameAsync(); 
    await SceneManager.LoadSceneAsync("my-scene"); 
    await SomeUserCodeReturningAwaitable(); 
    ... 
}
```

## await、协程、C# Job

- `await` 性能略优于协程，当协程返回空值时，这一差异更加明显
- 相比C# Job，`await` 更适合：
    - 在处理本质上的异步操作（如操作文件或执行Web请求）时，以非阻塞方式简化代码
    - 将长时间运行的任务（>1帧）移动到到后台线程
    - 对基于迭代器的协程进行现代化改造
    - 混合并匹配多种异步操作（帧事件、统一事件、第三方异步API、I/O）

    
## 总结

Unity 在2023.1版本中带来的 `await` 给了我们更加现代的异步编程方式。相比起之前用回调实现异步的方式更加优雅，且没有带来明显的性能问题。但是，要在现有项目中引入 `async`、`await` 需要对大量代码进行改造，如果想要采用这种方式需要仔细进行权衡。如果是新项目，且使用Unity 2023.1之后的版本，可以考虑开始拥抱 `await`了！