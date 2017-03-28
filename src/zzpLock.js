;
(function(win){
    "use strict";
    let instance = null;    //单例模式储存的唯一对象
    const ratio = win.devicePixelRatio >= 2 ? 2 : 1;
    const PWD_SUCCESS = "success";          //验证正确
    const PWD_ERROR = "error";              //验证错误
    const SEC_SUCCESS = "storeSuccess";     //设置密码二次确认正确
    const SEC_ERROR = "storeError";         //设置密码二次确认错误
    const FIR_SHORT = "shortPwd";           //设置密码过短
    const FIR_REPEAT = "repeatPwd";         //重设密码提示

    class ZZPLock {
        /**
         * @param {object} config 初始化配置对象
         * @param {int} nodeType 选择n*n的锁点矩阵
         * @param {int} width,height canvas宽高
         * @param {string} backColor, preColor ,afterColor,lineColor 背景颜色/选中前点颜色/选中后颜色/连线颜色
         * @param {string}
         */
        constructor(config) {
            if(instance) {
                return instance;
            }
            instance = this;

            //默认属性
            let _default = {
                nodeType   : 3,
                width      : 300,
                height     : 300,
                ifAdapter  : 1,
                backColor  : "#305066",
                preColor   : "#cfe6ff",
                afterColor : "#ffa726",
                fillColor  : "#2b4a5f",
                canvasName : "#canvas",
                hintName   : "#hint",
                template   :   '<canvas id="hint" width=100 height=100></canvas>'
                             + '<div id="myImage"></div>'
                             + '<h4 id="title" class="title">设置解锁图案</h4>'
                             + '<canvas id="canvas" width={width} height={height}></canvas>'
                             + '<a id="changePsw">设置密码</a>',

            };

            Object.assign(this, _default, config);

            this.btnFlag = 0;       //设置密码按钮的标识位
            this.lastNodes = [];    //保存划过的点
            this.restNodes = [];    //保存剩下的点
            this.hintNodes = [];   //保存提示点
            this.touchFlag = false;  //控制一次解锁过程的标志
            this.initLock();
        }


        /**
         * 初始化函数
         * lockPsw是存储的密码
         */
        initLock() {
            //可配置是否需要适配
            if(this.ifAdapter) {
                this.adapte();
            }
            this.initDom();
            this.pswObj = window.localStorage.getItem("lockPsw") ? {
                lockState : 2,
                lockPsw : window.localStorage.getItem("lockPsw")
            } : {};
            this.canvas = document.querySelector(this.canvasName);
            this.canvasHint = document.querySelector(this.hintName);
            if(!this.canvas || !this.canvasHint) {
                throw new Error("CANVAS 没有找到");
            }
            this.cvc = this.canvas.getContext('2d');
            this.cvh = this.canvasHint.getContext("2d");
            this.r = this.cvc.canvas.width / (2+4*this.nodeType);  //根据canvas的大小分配半径，空白占两份，直径占两份
            this.lr = this.r / this.width * 100;

            //先createCirCles再changeShow，因为会初始化提示点
            this.createCircles();
            this.changeShow();
            this.bindEvents();
        }

        /**
         * 所有机型适配
         */
        adapte() {
            let scale = window.devicePixelRatio >= 2 ? 0.5 : 1;
            let radio = window.devicePixelRatio >= 2 ? 2 : 1;
            this.width = this.width * radio;
            this.height = this.height * radio;

            //将节点中的width，height替换为适配的宽高
            this.template = this.template.replace(/\{([^{}]+)\}/gm, (match, name) => {
                return this[name];
            });

            let metaEle = document.querySelector("meta[name=viewport]");
            if(!metaEle) {
                metaEle = document.createElement("meta");
                metaEle.setAttribute("name","viewport");
                metaEle.setAttribute("content", "width=device-width, maximum-scale="+ scale +",minimum-scale="+ scale +", initial-scale=" + scale + ", user-scalable=no");
                document.head.appendChild(metaEle);
            }
            document.querySelector("html").setAttribute("data-ptr", radio);
        }

        /**
         * 初始化CANVAS节点
         */
        initDom() {
            let wrap = document.createElement("div");
            let canvasStr = this.template;
            wrap.id = "canvasWrap";
            wrap.style.backgroundColor = this.backColor;
            wrap.insertAdjacentHTML('afterbegin',canvasStr);
            document.body.appendChild(wrap);
        }

        /**
         * 构造所有的初始圆
         */
        createCircles() {
            let num = this.nodeType,
                count = 0,
                r = this.r,
                lr = this.lr;
            this.lastNodes = [];
            this.arr = [];
            this.restNodes = [];
            this.hintNodes = [];

            for(let i = 0 ; i < num ; i++) {
                for(let j = 0; j < num; j++) {
                    count++;
                    let obj = {
                        x: j * 4 * r + 3 * r,
                        y: i * 4 * r + 3 * r,
                        index: count
                    };

                    //提示点的圆
                    let hint = {
                        x: j * 4 * lr + 3 * lr,
                        y: i * 4 * lr + 3 * lr,
                        index: count
                    };
                    this.arr.push(obj);
                    this.restNodes.push(obj);
                    this.hintNodes.push(hint);
                }
            }
            this.cvc.clearRect(0, 0, this.cvc.canvas.width, this.cvc.canvas.height);
            for(let i = 0 ; i < this.arr.length ; i++) {
                this.singleCir(this.arr[i].x,this.arr[i].y);
            }
        }

        /**
         * 绘制单个圆
         * @param  x,y 圆心坐标
         */
        singleCir(x, y) {
            this.cvc.strokeStyle = this.preColor;
            this.cvc.fillStyle = this.fillColor;
            this.cvc.lineWidth = 2;
            this.cvc.beginPath();
            this.cvc.arc(x, y, this.r, 0, Math.PI * 2, true);
            this.cvc.closePath();
            this.cvc.fill()
            this.cvc.stroke();
        }

        /**
         * 解锁的三种状态:
         * pswObj.lockState: 2--已设置密码，待解锁。 1--第二遍设置密码，确认。 none--第一遍设置密码
         */
        changeShow() {
            let state = this.pswObj.lockState;
            this._showMsg(state);
            if(state === 2) {
                this.btnFlag = 1;
            } else if (state === 1){
                this.createHint();
                this.showHint();
                this.btnFlag = 1;
            } else {
                this.createHint();
                this.btnFlag = 0;
            }
        }

        /**
         * 界面展示信息的回调函数的调用
         * @param state 解锁的3种状态
         * @private
         */
        _showMsg(state) {
            if(this.showMsg) {
                this.showMsg(state);
            } else {
                console.warn("没有写界面展示的回调函数");
            }
        }

        /**
         * 创建提示点
         */
        createHint() {
            let len = this.hintNodes.length;
            this.cvh.clearRect(0,0,100,100);

            this.cvh.fillStyle = this.preColor;
            for(let i  = 0 ; i < len ; i++) {
                this.cvh.beginPath();
                this.cvh.arc(this.hintNodes[i].x, this.hintNodes[i].y, this.lr, 0, Math.PI * 2, true);
                this.cvh.closePath();
                this.cvh.fill();
            }
        }


        showHint() {
            let index,
                psw = this.pswObj.firstPsw,
                len = this.pswObj.firstPsw.length;

            this.cvh.fillStyle = "#00ff00";     //提示点提示颜色 EEC900
            for(let i = 0 ; i < len ; i++) {
                index = psw[i].index;
                this.cvh.beginPath();
                this.cvh.arc(this.hintNodes[index-1].x, this.hintNodes[index-1].y, this.lr, 0, Math.PI * 2, true);
                this.cvh.closePath();
                this.cvh.fill();
            }
        }

        /**
         * 初始为修改密码界面
         */
        changePsw() {
            if(this.btnFlag === 1) {
                this.pswObj = {};
                window.localStorage.removeItem("lockPsw");
                document.querySelector("#title").textContent = "设置解锁图案";
                this.resetLock();
            }
        }

        /**
         * 修改解锁路径的颜色
         * @param col 修改颜色
         */
        stateCirCol(col) {
            let len = this.lastNodes.length;

            this.cvc.strokeStyle = col;
            for(let i = 0 ; i < len ; i++) {
                this.cvc.lineWidth = 2;
                this.cvc.beginPath();
                this.cvc.arc(this.lastNodes[i].x, this.lastNodes[i].y, this.r, 0, Math.PI * 2, true);
                this.cvc.closePath();
                this.cvc.stroke();

                this.cvc.lineWidth = 5;
                this.cvc.beginPath();
                this.cvc.arc(this.lastNodes[i].x, this.lastNodes[i].y, this.r /2, 0, Math.PI * 2, true);
                this.cvc.closePath();
                this.cvc.stroke();
            }

            this.drawLines({"col": col});
        }

        /**
         * 一次过程的结果处理
         * pswObj.lockState: 2--已设置密码，待解锁。 1--第二遍设置密码，确认。 none--第一遍设置密码
         */
        pswWork() {
            let state = this.pswObj.lockState;
            if(state === 2) {
                let lockPsw = this.pswObj.lockPsw,
                    nowPsw = this._pswEncript(JSON.stringify(this.lastNodes));
                if(lockPsw === nowPsw) {
                    this.stateCirCol("#00ff00");
                    this._pwdResultMsg(PWD_SUCCESS)
                } else {
                    this.stateCirCol("#ff0000");
                    this._pwdResultMsg(PWD_ERROR);
                }
            } else if(state === 1) {
                let firPsw = this._pswEncript(JSON.stringify(this.pswObj.firstPsw)),
                    secPsw = this._pswEncript(JSON.stringify(this.lastNodes));
                if(secPsw === firPsw) {
                    this.stateCirCol("#00ff00");
                    this.pswObj.lockState = 2;
                    this.pswObj.lockPsw = secPsw;
                    window.localStorage.setItem("lockPsw",secPsw);
                    this._pwdResultMsg(SEC_SUCCESS);
                } else {
                    this.stateCirCol("#ff0000");
                    this._pwdResultMsg(SEC_ERROR);
                }
            } else {
                if(this.lastNodes.length < 5) {
                    this.stateCirCol("#ffa726");
                    this._pwdResultMsg(FIR_SHORT);
                } else {
                    this.pswObj.firstPsw = this.lastNodes;
                    this.pswObj.lockState = 1;
                    this._pwdResultMsg(FIR_REPEAT);
                }
            }
        }

        /**
         * 用户加密的回调函数
         * @param psw
         * @returns {*}
         * @private
         */
        _pswEncript(psw) {
            if(this.pswEncript) {
                return this.pswEncript(psw);
            } else {
                console.wran("无加密算法");
                return psw;
            }
        }

        /**
         * 用户控制输出信息的回调函数
         * @param state
         * @private
         */
        _pwdResultMsg(state) {
            if(this.pwdResultMsg) {
                this.pwdResultMsg(state);
            }else {
                console.warn("没有写提示回调函数");
            }
        }

        /**
         * 填充选择过的圆圈
         */
        fillCir() {
            for (let i = 0 ; i < this.lastNodes.length ; i++) {
                this.cvc.strokeStyle = this.preColor;
                this.cvc.lineWidth = 5;
                this.cvc.beginPath();
                this.cvc.arc(this.lastNodes[i].x, this.lastNodes[i].y, this.r/2, 0, Math.PI * 2, true);
                this.cvc.closePath();
                this.cvc.stroke();
            }
        }

        /**
         * 解锁轨迹
         * @param p
         */
        drawLines({p, col}) {
            this.cvc.beginPath();
            this.cvc.strokeStyle = col || this.preColor;
            this.cvc.lineWidth = 3;
            this.cvc.moveTo(this.lastNodes[0].x, this.lastNodes[0].y);

            for(let i = 1 ; i < this.lastNodes.length ; i++) {
                this.cvc.lineTo(this.lastNodes[i].x, this.lastNodes[i].y);
            }

            if(p) {
                this.cvc.lineTo(p.x, p.y);
            }
            this.cvc.stroke();
            this.cvc.closePath();
        }

        /**
         * 更新滑动的鼠标的位置，包括重新画圆和连接线
         * @param p
         */
        update(p) {
            this.cvc.clearRect(0, 0, this.cvc.canvas.width, this.cvc.canvas.height);

            //重绘9个圆圈
            for(let i = 0 ; i < this.arr.length ; i++) {
                this.singleCir(this.arr[i].x, this.arr[i].y);
            }
            this.fillCir();     //填充选择的圆
            this.drawLines({p});   //连接填充的圆心，并指向圆心

            for(let i = 0 ; i < this.restNodes.length ; i++) {
                if(Util.isInCircle(p.x, p.y, this.restNodes[i].x, this.restNodes[i].y, this.r)) {
                    this.lastNodes.push(this.restNodes[i]);
                    this.restNodes.splice(i,1);
                    break;
                }
            }
        }

        /**
         * 重置解锁画面
         */
        resetLock() {
            this.createCircles();
            this.changeShow();
        }

        /**
         * 绑定触摸，滑动，抬起三个事件
         */
        bindEvents() {

            this.canvas.addEventListener("touchstart", (eve) => {
                eve.preventDefault();

                let p = Util.getPosition(eve);

                for(let i = 0 ; i < this.arr.length ; i++) {
                    if(Util.isInCircle(p.x, p.y, this.arr[i].x, this.arr[i].y, this.r)) {
                        this.touchFlag = true;
                        this.fillCir(this.arr[i].x, this.arr[i].y);
                        this.lastNodes.push(this.arr[i]);
                        this.restNodes.splice(i,1);
                        break;
                    }
                }
            },false);

            this.canvas.addEventListener("touchmove", (eve) => {
                // eve.preventDefault();

                if(this.touchFlag) {
                    this.update(Util.getPosition(eve));
                }
            },false);

            this.canvas.addEventListener("touchend", (eve) => {
                // eve.preventDefault();

                if(this.touchFlag) {
                    this.touchFlag = false;

                    this.pswWork();
                    setTimeout(() => {
                        this.resetLock();
                    },600)
                }
            },false);

            document.addEventListener('touchmove', function(eve){
                //eve.preventDefault();
            },false);

            document.querySelector("#changePsw").addEventListener("click", () => {
                this.changePsw();
            }, false);
        }

        /**
         * 销毁组件
         */
        destory() {
            window.localStorage.clear();
            document.querySelector(this.hintName).remove();
            document.querySelector(this.canvasName).remove();
            instance = null;
        }
    };

    //工具集对象
    let Util = {
        /**
         * 获取鼠标当前位置
         * @param eve 事件对象
         * @returns {{x: number, y: number}} 鼠标对象
         */
        getPosition(eve) {
            let box = eve.currentTarget.getBoundingClientRect();
            let p = {
                x: eve.touches[0].clientX - box.left,
                y: eve.touches[0].clientY - box.top,
            };
            return p;
        },

        /**
         *  计算位置是否在小圆圈内
         * @param px,py 鼠标位置坐标
         * @param cx,cy 圆心坐标
         * @param r 园半径
         * @returns {*} 返回true 和false
         */
        isInCircle(px, py, cx, cy, r) {
            let myPow = Math.pow;
            if(myPow(px - cx, 2) + myPow(py - cy, 2) <= myPow(r, 2)) {
                return true;
            } else {
                return false;
            }
        }
    }

    win.ZZPLock = ZZPLock;
})(window);