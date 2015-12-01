/**
 * @fileoverview: 通用库
 * @author: qiaogang
 * @requires tangram.js
 * @date: Wednesday, April 11, 2012
 *
 */
var mbox = mbox || {};

/**
 * 创建命名空间，  支持申请多级命名和多个命名空间如
 * @example 例mbox.namespace("lang"), mbox.lang=mbox.lang||{},
 *  mbox.namespace("m3.dispatch"), mbox.namespace("lang","m3");
 * @param {string} name
 * @return obj,最后申请的命名空间.
 */
mbox.namespace = function() {
    var a = arguments, o = null, i, j, d;
    for (i = 0, len = a.length; i < len; i++) {
        d = ('' + a[i]).split('.');
        o = mbox;
        for (j = (d[0] == 'mbox') ? 1 : 0; j < d.length; j = j + 1) {
            o[d[j]] = o[d[j]] || {};
            o = o[d[j]];
        }
    }
    return o;
};

T.extend(mbox, {
    /**
     * @lends mbox
     */
    /**
     * 创建一个新的引信函数,
     * @example 在音乐盒中用来解决flash加载的问题。如果flash还没加载完全，将要执行的函数保存到队列中；如果flash已加载，直接执行传入的函数,
     *  flashReady=new mbox.Fuze();flashReady(fn);  flash加载完调用flashReady.fire();
     * @return {Function} fn 引信函数
     * @member mbox
     */
    Fuze : function() {
        var queue, fn, infire;
        queue = [];

        /**
         * 引信函数
         * @param {function} process
         * @private
         */
        fn = function(process) {
            if (infire) {
                process();
            } else {
                queue.push(process);
            }
        };

        fn.fire = function() {
            while (queue.length) {
                queue.shift()();
            }
            infire = true;
        };

        fn.extinguish = function() {
            infire = false;
        };

        fn.wettish = function() {
            this.fire();
            this.extinguish();
        };

        fn.clear = function () {
            while (queue.length) {
                queue.shift();
            }
            this.extinguish();
        };

        return fn;
    },

    /**
     * 转换时间，毫秒转换为mm:ss格式
     * @param {Number} time
     * @return {String} 格式mm:ss
     * @member mbox
     */
    convertTime : function(time) {
        var minute, second;
        time = Math.round(time / 1000);
        minute = Math.floor(time / 60);
        second = time % 60;
        return T.number.pad(minute, 2) + ':' + T.number.pad(second, 2);
    },

    /**
     * 计时器类
     * 可以创建新的 Timer 对象，以便按指定的时间顺序运行代码。 使用 start() 方法来启动计时器。
     * 通过addEventListener添加定时处理句柄。
     * 可以开始、暂停、终止一个计时器
     * @member mbox
     * @namespace
     * @name Timer
     */
    Timer : (function( window, undefined ) {
        /**
         * Timer构造函数,由于是由匿名执行的函数返回的构造函数，所以在生成文档时名称难改。（音乐盒文档中出现多次）
         * @example 创建一个计时器
         *          var timer=new mbox.Timer(1000,3);
         * @param {Number} delay 计时器事件间的延迟 单位:毫秒(ms) 注意：间隔在0-15ms时可能计算不准确
         * @param {Number} repeatCount 设置的计时器运行总次数。如果重复计数设置为 0，则计时器将持续不断运行，直至调用了 stop()/reset() 方法或程序停止。
         * @member mbox.Timer
         */
        var fn = function( delay, repeatCount ) {
            this._timer = function(){};
            this._listener = function(){};
            this._timerComplete = function(){};
            this._timerID = null;
            this._delay = this._remain = delay;
            this._repeatCount = repeatCount || 0 ;
            this._currentCount = 0;
            this._isRunning = false;
            this._startTime = this._endTime = 0;
            this.EVENTS = {
                TIMER : 'timer',
                COMPLETE : 'timerComplete'
            };
        };


        fn.prototype =
        /**
         * @lends mbox.Timer
         */
        {
            /**
             * 根据传参创建新的计时器
             * @param {Object} dalay 计时器事件间的延迟 单位:毫秒(ms) 注意：间隔在0-15ms时可能计算不准确
             * @param {Object} repeatCount 设置的计时器运行总次数。如果重复计数设置为 0，则计时器将持续不断运行，直至调用了 stop()/reset() 方法或程序停止。
             * @private
             */
            _createTimer : function(delay, repeatCount) {
                var me = this;
                if (repeatCount == 1) {
                    return function(){
                        return window.setTimeout(function() {
                            me.reset();
                            me._listener(me._delay, repeatCount);
                            me._timerComplete();
                        }, delay);
                    }
                } else {
                    return function() {
                        return window.setInterval(function() {
                            if (repeatCount !=0 && me._currentCount >= repeatCount) {
                                me.reset();
                                me._timerComplete();
                            } else {
                                me._currentCount++;
                                me._listener(delay, me._currentCount);
                            }
                        }, delay);
                    }
                }
            },

            /**
             * 添加事件侦听器
             * 监听类型: EVENTS.TIMER 每当 Timer 对象达到根据 Timer.delay 属性指定的间隔时调度。
             * EVENTS.COMPLETE 每当它完成 Timer.repeatCount 设置的请求数后调度。
             * @method addEventListener
             * @param {String} type 监听事件类型
             * @param {Function} listener 事件侦听器
             * @member mbox.Timer
             */
            addEventListener : function(type, listener) {
                if (type == "timer") {
                    this._listener = listener;
                    this._timer = this._createTimer(this._delay, this._repeatCount);
                } else if (type == "timerComplete") {
                    this._timerComplete = listener;
                }
            },

            /**
             * 如果计时器正在运行，则停止计时器，并将 _currentCount 属性设回为 0，这类似于秒表的重置按钮。
             * @method reset
             * @member mbox.Timer
             */
            reset : function() {
                this.stop();
                if (this._repeatCount == 1) {
                    this._timer = this._createTimer(this._delay, this._repeatCount);
                }
                this._currentCount = 0;
                this._remain = this._delay;
                this._startTime = this._endTime = 0;
            },

            /**
             * 如果计时器尚未运行，则启动计时器。
             * @method start
             * @member mobx.Timer
             */
            start : function() {
                if (!this._timerID) {
                    this._timerID = this._timer();
                    if (this._repeatCount == 1) {
                        this._startTime = new Date().getTime();
                    }
                    this._isRunning = true;
                }
            },

            /**
             * 停止计时器。 如果在调用 stop() 后调用 start()，则将继续运行计时器实例，运行次数为剩余的 重复次数（由 repeatCount 属性设置）。
             * @method stop
             * @member mobx.Timer
             */
            stop : function() {
                if (this._timerID) {
                    if (this._repeatCount == 1) {
                        window.clearTimeout(this._timerID);
                    } else {
                        window.clearInterval(this._timerID);
                    }
                    this._timerID = null;
                    this._isRunning = false;
                }
            },

            /**
             * 暂停计时器。
             * 调用时暂停计时器计时，start()后，从上次暂停时的时间开始继续计时。
             * 例如：一个20秒的计时器，在第5秒处暂停，当再次start()后，计时器将从第6秒开始，完成剩余的时间。
             * 注意：目前只支持repeatCount = 1的情况。其他情况调用等同于stop()。
             * @method pause
             * @member mbox.Timer
             */
            pause : function() {
                if (this._repeatCount == 1) {
                    if (this._timerID) {
                        this.stop();

                        this._endTime = new Date().getTime();
                        this._remain = this._remain - (this._endTime - this._startTime);
                        if (this._remain > 0) {
                            this._timer = this._createTimer(this._remain, 1);
                        } else {
                            this.reset();
                        }
                    }
                } else {
                    this.stop();
                }
            },

            /**
             * 获得计时器从 0 开始后触发的总次数。
             * @method getCurrentCount
             * @return {Number}
             * @member mbox.Timer
             */
            getCurrentCount : function() {
                return this._currentCount;
            },

            /**
             * 判断计时器是否在运行
             * @method isRunning
             * @return {Boolean}
             * @member mbox.Timer
             */
            isRunning : function() {
                return this._isRunning;
            }
        };

        return fn;
    })(window),

    /**
     * 秒表类
     * @member mbox
     * @namespace
     * @name StopWatch
     */
    StopWatch : (function (window, undefined) {
        var count = 0;
        var fn = function () {
            this.startTime = 0;
            this.isRunning = false;
            this.isReset = true;
            this.passedTime = 0;
            count++;
        };

        fn.prototype = {

            /**
             * 重置秒表
             *
             * @param
             * @method
             */
            reset:function () {
                this.startTime = 0;
                this.pauseTime = 0;
                this.passedTime = 0;
                this.isRunning = false;
                this.isReset = true;
            },

            /**
             * 开始/恢复计时
             *
             * @param
             * @return
             * @method
             */
            start:function () {
                if (this.isReset) {
                    this.reset();
                    this.startTime = new Date().getTime();
                } else {
                    if (!this.isRunning) {
                        this.startTime = new Date().getTime();
                    }
                }
                this.isRunning = true;
                this.isReset = false;
            },

            /**
             * 秒表暂停
             *
             * @param
             * @return {Number}
             * @method
             */
            pause:function () {
                if (!this.isReset && this.isRunning) {
                    this.pauseTime = new Date().getTime();
                    this.passedTime += this.pauseTime - this.startTime;
                    this.isRunning = false;
                }
            },

            /**
             * 秒表是否运行中
             *
             * @param
             * @return {Boolean} true - 运行中，false - 停止
             * @method
             */
            isRunning:function () {
                return this.isRunning;
            },

            /**
             * 秒表是否重置
             *
             * @param
             * @return {Boolean} true - 重置，false - 未重置
             * @method
             */
            isReset:function () {
                return this.isReset;
            },

            /**
             * 获取秒表当前计时时间
             *
             * @return {Number} 当前时间 单位：毫秒(ms)
             * @method
             */
            getTime:function () {
                if (this.isReset) {
                    return 0;
                } else {
                    if (this.isRunning) {
                        return new Date().getTime() - this.startTime + this.passedTime;
                    } else {
                        return this.passedTime;
                    }
                }
            },

            /**
             * 由该类创建出实例的个数
             *
             * @param
             * @return
             * @method
             */
            getCounts:function () {
                return count;
            }
        };

        return fn;
    })(window)
});

/**
 * @namespace
 * @name mbox.lang
 */
mbox.namespace('mbox.lang');
T.extend(mbox.lang, {
    /**
     * @lends mbox.lang
     */
    /**
     * 创建一个类，包括创造类的构造器、继承基类T.lang.Class
     * 基于T.lang.createClass进行了封装
     * @param {Function} constructor 构造函数
     * @param {Object} options
     * @return
     * @member mbox.lang
     */
    createClass : function(constructor, options) {
        var fn = T.lang.createClass(constructor, options);

        fn.extend = function(json) {
            for (var i in json) {
                fn.prototype[i] = (function(method, name) {
                    if (T.lang.isFunction(method)) {
                        return function() {
                            this.dispatchEvent(name, {
                                name : name,
                                arguments : arguments
                            });
                            var res = method.apply(this, arguments);
//                            this.dispatchEvent('afterCallMethod', {
//                                name : name,
//                                arguments : arguments,
//                                result : res
//                            });
                            return res;
                        };
                    } else {
                        return method;
                    }
                })(json[i], i);
//                fn.prototype[i] = json[i];
            }
            return fn;
        };

/*
        fn.before = function(json) {
            for (var i in json) {
                var _method = fn.prototype[i];
                if (typeof _method == 'function') {
                    var _newMethod = function(arguments) {
                        _method.apply(fn, arguments);
                    }
                }
                fn.prototype[i] = json[i];
            }
            return fn;
        };

        fn.after = function(json) {

            return fn;
        };
*/
        return fn;
    }
});

