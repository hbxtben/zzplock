# ZZPLock 

![](https://travis-ci.org/hbxtben/zzplock.svg?branch=master)  ![](https://img.shields.io/badge/npm-v0.1.1-blue.svg)  
**移动端HTML5手势解锁,使用canvas绘制，提供对Retina屏适配的轻量级插件**

## DEMO
[DEMO](https://hbxtben.github.io/zzplock/test/)(需打开移动端调试工具查看效果) 
> dEMO二维码  
![ercode](https://github.com/hbxtben/zzplock/blob/master/images/zzplock.png)  

> gif效果展示  
![gif效果展示](https://github.com/hbxtben/zzplock/blob/master/images/zzplock.gif) 

## 简要说明
- 支持密码设置时两次校对
- 支持解码正确错误的验证
- 对外提供良好的扩展接口，包括密码加密方法接口等
- 使用单例模式
- 支持多机型适配
- 通过gulp构建

## 使用方法
### 1.引入css,js
```
<script type="text/javascript" src="../lib/zzpLock.js"></script>
<link rel="stylesheet" href="../style/css/zzpLock.css">
```
### 2.初始化对象及配置信息
#### 配置接口
```javascript
var lock = new ZZPLock({
   /**
   * pwdResultMsg 必填配置项，设置一次滑动后不同状态时的界面效果 
   * msgState: 
   * 'success'-验证正确 
   * 'error'-验证错误 'storeSuccess'-设置密码二次确认正确
   * 'storeError'-设置密码二次确认错误
   * 'shortPwd'-设置密码过短
   * 'repeatPwd'-重设密码提示
   */
   pwdResultMsg: function(msgState){}
    
   /**
   * showMsg 必填配置项，设置不同解锁状态的界面
   * state：
   * 2-解锁界面
   * 1-设置密码的二次验证界面
   * default-设置密码的界面
   */
   showMsg: function(state){}
   
   /**
   * pswEncript 必填配置项,设置密码加密算法
   */
   pswEncript: function(){}
   
   //其他配置项,展示的为默认值
    nodeType   : 3          //n*n的点阵
    width      : 300        //主canvas宽度
    height     : 300        //主canvas高度
    ifAdapter  : 1          //是否适配
    backColor  : "#305066"  //背景色
    preColor   : "#cfe6ff"  //滑动前圆圈颜色
    fillColor  : "#2b4a5f"  //滑动时圆圈填充色
    canvasName : "#canvas"  //主画布ID
    hintName   : "#hint"    //密码提示画布（canvas）ID
    
    //界面html模板（主画布中的宽度和高度需写成{width}和{height}）
    template   :   '<canvas id="hint" width=100 height=100></canvas>'
                 + '<div id="myImage"></div>'
                 + '<h4 id="title" class="title">设置解锁图案</h4>'
                 + '<canvas id="canvas" width={width} height={height}></canvas>'
                 + '<a id="changePsw">设置密码</a>',
});
```
