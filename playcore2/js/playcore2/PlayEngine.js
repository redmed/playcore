/**
 * @fileoverview 播放器控制类 外部调用的入口
 * @authod qiaogang@baidu.com
 * @requires PlayEngine_Interface.js
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
/**
 * @requires ../common/commone.js, ../common/tangram-custom-full-yui.js
 * 播放核心PlayEngine,封装了playcore2子内核的实现，提供给外部统一的创建实例和使用playcore2的入口。
 * @class PlayEngine 继承了tangram.lang.Class,带有setEventListener,dispatchEvent等事件监听和派发的函数.
 * @extends T.lang.Class
 * @param {Object}  conf初始化参数，设置要加载的子内核
 * @conf {Array} subEngines 子内核的配置项，
 * @example var player = new PlayEngine({
    subEngines : [{ constructorName : 'PlayEngine_Audio' }] });
 */
var PlayEngine = mbox.lang.createClass(function(conf) {
    conf = conf || {};
    //子内核的配置项

    this.subEnginesConf = [];
    this.subEnginesInitArgs = {};
    this.curEngine = null;
    this.curEngineType = '';
    //只未初始化的内核(已new)
    this.unInitEngineList = [];
    //初始化(init)成功&浏览器支持(test)的内核实例
    this.engineList = [];
//    this.engineTypeList = [];
    this.ready = false;
    this.defaultExt = '.mp3';

    this.coreContainer = null;
    /**
     * 常量PlayEngine中定义的事件<br/>
     * this.EVENTS = {
     &nbsp;&nbsp;STATECHANGE     : 'playStateChange',    //播放状态改变事件(STATES)<br/>
     &nbsp;&nbsp;POSITIONCHANGE  : 'positionChange',     //播放时播放进度改变事件<br/>
     &nbsp;&nbsp;PROGRESS        : 'progress',           //加载时加载进度改变事件<br/>
     &nbsp;&nbsp;ERROR           : 'error',              //播放过程中出错时的事件<br/>
     &nbsp;&nbsp;INIT            : 'initSuccess',        //播放器初始化成功时的事件<br/>
     &nbsp;&nbsp;INITFAIL        : 'initFail'            //播放器初始化失败时的事件<br/>
        };
     * @final EVENTS,
     * @type {Object}
     * @member PlayEngine
     */
    this.EVENTS = {
        STATECHANGE     : 'player_playStateChange',    //播放状态改变事件(STATES)
        POSITIONCHANGE  : 'player_positionChange',     //播放时播放进度改变事件
        PROGRESS        : 'player_progress',           //加载时加载进度改变事件
        ERROR           : 'player_error',              //播放过程中出错时的事件
        INIT            : 'player_initSuccess',        //播放器初始化成功时的事件
        INITFAIL        : 'player_initFail'            //播放器初始化失败时的事件
    };

    /**
     * 常量PlayEngine中定义的播放器状态.       <br/>
     * this.STATES={                         <br/>
     &nbsp;INIT       : 'init',        //-2 还未初始化<br/>
     &nbsp;READY      : 'ready',       //-1 初始化成功(dom已加载)<br/>
     &nbsp;STOP       : 'stop',        //0<br/>
     &nbsp;PLAY       : 'play',        //1<br/>
     &nbsp;PAUSE      : 'pause',       //2<br/>
     &nbsp;END        : 'end',         //3<br/>
     &nbsp;BUFFERING  : 'buffering',   //4<br/>
     &nbsp;PREBUFFER  : 'pre-buffer'   //5<br/>
        };
     * @final EVENTS,
     * @member PlayEngine
     */
    this.STATES = {
        INIT       : 'init',        //-2 还未初始化
        READY      : 'ready',       //-1 初始化成功(dom已加载)
        STOP       : 'stop',        //0
        PLAY       : 'play',        //1
        PAUSE      : 'pause',       //2
        END        : 'end',         //3
        BUFFERING  : 'buffering',   //4
        PREBUFFER  : 'pre-buffer',  //5
        ERROR      : 'error'        //6
    };

    //progress timer 模拟加载进度事件
    this.progressTimer = new mbox.Timer(200, 0);
    //position timer 模拟播放进度事件
    this.positionTimer = new mbox.Timer(100, 0);
    this._initEngines(conf);
}, {
    className : 'PlayEngine'
}).extend({
    /**
     * @private _error
     */
    _error : function(errMsg) {
        throw new Error(errMsg);
    },

    /**
     * @method  初始化给定的子内核构造函数名称
     * @private
     * @member PlayEngine
     * @param {String} engines,子内核的构造函数名称，如:"PlayEngine_FMP";
     */
    _initEngines : function(config) {
        this.coreContainer = config.el || null;

        this.subEnginesConf = config.subEngines || [];

        T.array.each(this.subEnginesConf, T.fn.bind(function(item, index) {
            var subEngineName = item.constructorName,
                args = item.args || {},
                subEngineConstructor;

            this.subEnginesInitArgs[subEngineName] = args;

            try {
                subEngineConstructor = eval(subEngineName);
                if (!T.lang.isFunction(subEngineConstructor)) {
                    return;
                }
            } catch(e) {
                return;
            }
            var engine = new subEngineConstructor(args);
            this.unInitEngineList.push(engine);
        }, this));

        // 给一个默认的 curEngine 值，防止调用 play、reset 等方法时报错
        this.curEngine = this.unInitEngineList[0];
    },

    /**
     * 初始化播放内核
     * //注意：监听初始化事件，需要在init之前注册
    //初始化成功事件
    player.setEventListener('initSuccess', function(e) {
        T.g('initok').value += '|' + e.engineType;
    });
    //初始化失败事件
    player.setEventListener('initFail', function(e) {
        T.g('initfail').value += '|' + e.engineType;
    });
     * @param {Object} options
     * @options {HTMLElement|String} [el] 容器所在dom节点或id
     * @options {Array(Object)} subEngines 子内核配置项
     * @confs {String} [constructorName] 子内核的构造函数名
     * @confs {Object} [args] 子内核的init参数
     * @args {String} [swfPath] flash内核所在路径
     * @example player.init({
     *  el : T.g('container'),
     *   subEngines : {
            'PlayEngine_Audio' : {}
           'PlayEngine_FMP_MP3' : {            //子内核构造函数名
               swfPath : 'flash/fmp_mp3.swf',
                instanceName : 'player'         //当前实例名
           },
           'PlayEngine_FMP_AAC' : {            //子内核构造函数名
                swfPath : 'flash/fmp_aac.swf',
               instanceName : 'player'         //当前实例名
           }
        }
    });

     * @method
     * @member PlayEngine
     */
    init : function(options) {
        if (this.ready) {
            return this._error('');
        }

        options = options || {};

        this.subEnginesInitArgs = options.subEngines ?
            options.subEngines : this.subEnginesInitArgs;

        this.coreContainer = options.el ?
            options.el : this.coreContainer;

        if (!this.coreContainer) {
            var con = T.dom.create('div', {
                id : '_player_container_' + T.lang.guid()
            });
            T.dom.setStyles(con, {
                'width'     : '1px',
                'height'    : '1px',
                'overflow'  : 'hidden'/*,
                'position'  : 'absolute',
                'top'       : '-10px',
                'zIndex'    : '1'*/
            });
            document.body.appendChild(con);
            this.coreContainer = options.el = con;
        }

        //init core
        T.array.each(this.unInitEngineList, T.fn.bind(function(engine, index) {
            var subEngineNameToString = engine.toString(),
                subEngineName = '',
                reg = /^\[object (.*)\]$/i;
            if (reg.test(subEngineNameToString)) {
                subEngineName = RegExp.$1;
            }
            var args = this.subEnginesInitArgs[subEngineName] || {};
            if (engine.test(true)) {
                args.instanceName = args.instanceName + '.engineList[' + this.engineList.length + ']';
                args.el = args.el || this.coreContainer;
                this.engineList.push(engine);
                engine.init.apply(engine, [args]);
            }
        }, this));

        //switch core
        this.switchEngineByUrl(this.defaultExt);
        this.ready = true;
        this._initProgressEvent();
        this._initPositionChangeEvent();
    },

    /**
     * 判断指定的mimeType或格式是否支持
     *
     * @param {String} mimeType mimeType或文件扩展名
     * @return {Boolean}
     * @member PlayEngine
     * @method canPlayType
     */
    canPlayType : function(mimeType) {
        return T.array.some(this.engineList, function(item, index) {
            return item.canPlayType(mimeType);
        });
    },

    /**
     * 获取支持的格式类型
     *
     * @member PlayEngine
     * @return {Array(String)} 支持的类型
     * @method
     */
    getSupportMimeTypeList : function() {
        var list = [];
        T.array.each(this.engineList, T.fn.bind(function(item, index) {
            list = list.concat(item.getSupportMimeTypeList());
        }, this));
        return list;
    },

    /**
     * 根据播放资源的URL选择播放子内核
     * @member PlayEngine
     * @param {String} url
     * @return
     * @method
     */
    switchEngineByUrl : function(url/*, stopRecursion*/) {
        var has = T.array.some(this.engineList, T.fn.bind(function(item, index) {
            var str = item.getSupportMimeTypeList().join('|');
            var reg = new RegExp('\\.(' + str + ')(\\?|$)', 'ig');
            if (reg.test(url)) {
                this.curEngine = item;
                this.curEngineType = item.getEngineType();
                return true;
            }
        }, this));
        //如果没有匹配到，使用默认扩展名适配。并且切断递归调用，防止死循环
        var stopRecursion = arguments[1];
        if (!has && !stopRecursion) {
            arguments.callee.apply(this, [this.defaultExt, true]);
        }
    },

    /**
     * 根据指定的扩展名或MimeType选择播放子内核
     * @member PlayEngine
     * @param {String} mimeType
     * @return
     * @method
     */
    switchEngineByMimeType : function(mimeType) {
        T.array.some(this.engineList, T.fn.bind(function(item, index) {
            if (item.canPlayType(mimeType)) {
                this.curEngine = item;
                this.curEngineType = item.getEngineType();
                return true;
            }
        }, this));
    },

    /**
     * 重置播放器
     * @member PlayEngine
     * @example player.reset();
     * @return
     * @method reset
     */
    reset : function() {
        this.curEngine.reset.apply(this.curEngine, arguments);
    },

    /**
     *
     * 设置播放核调度器的音频地址
     * @member PlayEngine
     * @param {String} url 音频地址
     * @param {String} format 'mp3' 'm4a'音频格式，此参数为防止音频文件名请求路径不包含扩展名时使用。
     * @return
     * @method setUrl
     */
    setUrl : function(url, format) {
        var oldEngie = this.curEngine;
        if(format){
            this.switchEngineByUrl('.' + format);
        }else{
            this.switchEngineByUrl(url);
        }

        if (oldEngie && oldEngie != this.curEngine) {
            oldEngie.stop();
        }
        if (this.curEngine) {
            this.curEngine.setUrl.apply(this.curEngine, arguments);
        }
    },
     /**
      * 获取当前资源的url
      * @member PlayEngine
      * @return {String} url
      */
    getUrl : function() {
        return this.curEngine.getUrl.apply(this.curEngine, arguments);
    },

    /**
     *
     * 操作播放核调度器播放
     * @param {Number} [pos] Default: 'undefined'。制定播放的位置 单位：毫秒。如果没有参数，则从当前位置开始播放。
     * @method play
     * @member PlayEngine
     */
    play : function(pos) {
        if (typeof pos == 'undefined') {
            if (this.curEngine) {
                return this.curEngine.play.apply(this.curEngine, arguments);
            }
        } else {
            return this.setCurrentPosition(pos);
        }
    },

    /**
     * 操作播放核调度器暂停
     * @member PlayEngine
     * @method pause
     */
    pause : function() {
        if (this.curEngine) {
            return this.curEngine.pause.apply(this.curEngine, arguments);
        }
    },

    /**
     * 操作播放核调度器停止
     * @member PlayEngine
     * @method stop
     */
    stop : function() {
        if (this.curEngine) {
            return this.curEngine.stop.apply(this.curEngine, arguments);
        }
    },

    /**
     * 设置播放核调度器静音状态
     * @method setMute
     * @member PlayEngine
     * @param {Boolean} mute 播放核是否静音
     */
    setMute : function(mute) {
        var args = arguments;
        T.array.each(this.engineList, function(item, index) {
            item.setMute.apply(item, args);
        });
    },

    /**
     * 取得播放核调度器静音状态
     * @member PlayEngine
     * @method getMute
     * @return {Boolean} 播放核是否静音
     */
    getMute : function() {
        if (this.curEngine) {
            return this.curEngine.getMute.apply(this.curEngine, arguments);
        }
        return false;
    },

    /**
     * 设置播放核调度器音量大小
     * @member PlayEngine
     * @method setVolume
     * @param {Number} volume 音量大小，取值范围 0-100，0 最小声
     */
    setVolume : function(volume) {
        var args = arguments;
        T.array.each(this.engineList, function(item, index) {
            item.setVolume.apply(item, args);
        });
    },

    /**
     * 取得播放核调度器音量大小
     * @method getVolume
     * @member PlayEngine
     * @return {Number} 播放核音量大小，范围 0-100，0 最小声
     */
    getVolume : function() {
        if (this.curEngine) {
            return this.curEngine.getVolume.apply(this.curEngine, arguments);
        }
        return 0;
    },

    /**
     * 设置播放核调度器当前播放进度并播放
     * @member PlayEngine
     * @method setCurrentPosition
     * @param {Number} time 目标播放时间，单位：毫秒
     */
    setCurrentPosition : function(time) {
        if (this.curEngine) {
            return this.curEngine.setCurrentPosition.apply(this.curEngine,
                arguments);
        }
    },

    /**
     * 取得播放核调度器当前播放进度
     *  @member PlayEngine
     * @method getCurrentPosition
     * @return {Number} 当前播放时间，单位：毫秒
     */
    getCurrentPosition : function() {
        if (this.curEngine) {
            return this.curEngine.getCurrentPosition.apply(this.curEngine,
                arguments);
        }
        return 0;
    },

    /**
     * 取得播放核调度器当前播放进度的字符串表现形式
     *  @member PlayEngine
     * @method getCurrentPositionString
     * @return {String} 当前播放时间，如 00:23
     */
    getCurrentPositionString : function() {
        return mbox.convertTime(this.getCurrentPosition());
    },

    /**
     * 取得播放核调度器当前下载百分比
     *  @member PlayEngine
     * @method getLoadedPercent
     * @return {Number} 下载百分比，取值范围 0-1
     */
    getLoadedPercent : function() {
        if (this.curEngine) {
            return this.curEngine.getLoadedPercent.apply(this.curEngine,
                arguments);
        }
        return 0;
    },

    /**
     * 取得当前文件下载了多少byte，单位byte
     * @member PlayEngine
     * @method getLoadedBytes
     * @reuturn {Number} 下载了多少byte
     */
    getLoadedBytes : function() {
        if (this.curEngine) {
            return this.curEngine.getLoadedBytes.apply(this.curEngine,
                arguments);
        }
    },
    /**
     * 取得当前链接文件的总大小
     * @member PlayEngine
     * @method getTotalBytes
     * @return {Number} 当前资源的总大小，单位byte
     */
    getTotalBytes : function() {
        if (this.curEngine) {
            return this.curEngine.getTotalBytes.apply(this.curEngine,
                arguments);
        }
        return 0;
    },

    /**
     * 取得播放核调度器当前 URL 总播放时长
     * @member PlayEngine
     * @method getTotalTime
     * @return {Number} 总时长，单位：毫秒
     */
    getTotalTime : function() {
        if (this.curEngine) {
            return this.curEngine.getTotalTime.apply(this.curEngine,
                arguments);
        }
        return 0;
    },

    /**
     * 取得播放核调度器当前 URL 总播放时长的字符串表现形式
     * @member PlayEngine
     * @method getTotalTimeString
     * @return {String} 总时长，如 00:23
     */
    getTotalTimeString : function() {
        return mbox.convertTime(this.getTotalTime());
    },

    /**
     * 获取当前子内核的实例
     * @member PlayEngine
     * @return {Object} curEngine 当前子内核实例对象
     */
    getCurEngine : function() {
        return this.curEngine;
    },

    /**
     * 获取当前播放内核的种类
     * @member PlayEngine
     * @return {String} 播放内核种类
     * @method getEngineType
     */
    getEngineType : function() {
        return this.getCurEngine().getEngineType();
    },

    /**
     * 获取播放器版本号
     * @member PlayEngine
     * @return {Object} 当前已初始化成功的子内核类型和对应的版本号 {engineType:engineVersion,...}
     */
    getVersion : function() {
        var res = {};
        T.array.each(this.engineList, function(item, index) {
            res[item.getEngineType()] = item.getVersion();
        });
        return res;
    },

    /**
     * 取得当前播放核调度器播放状态
     * @member PlayEngine
     * @method getState
     * @return {?String} 当前播放状态
     */
    getState : function() {
        if (this.curEngine) {
            return this.curEngine.getState.apply(this.curEngine,
                arguments);
        }
        return null;
    },

    /**
     * 添加事件
     *
     * @param {String} eventName 事件名称，目前支持的事件有:
     *      1. 'playStateChange'   播放状态改变时
     *      funtion(event){
     *          event.newState      //当前播放状态
     *          event.oldState      //上一个播放状态
     *          event.engineType    //当前播放内核类型
     *          event.target        //当前子播放内核的实例
     *      }
     *
     *      2. 'positionChange'    播放位置改变时
     *      function(event) {
     *          event.position      //当前播放进度 单位：毫秒
     *          event.target        //当前子播放内核的实例
     *      }
     *
     *      3. 'progress'          数据加载时
     *      function(event) {
     *          event.progress      //当前加载进度百分比 范围：0-1
     *          event.totalTime     //当前音频总时长 单位：毫秒
     *          event.target        //当前子播放内核的实例
     *      }
     *
     *      4. 'error'             播放错误时 // todo
     *
     *      5. 'initSuccess'       内核加载成功时
     *      function(event) {
     *          event.engineType    //当前播放内核类型
     *          event.engine        //当前播放内核的DOM
     *          event.target        //当前子播放内核的实例
     *      }
     *
     *      6. 'initFail'          内核加载失败时(浏览器不支持等)
     *      function(event) {
     *          event.engineType    //加载失败的子内核类型
     *          event.config        //init初始化时传入subEngines配置项
     *      }
     * @param {Function} handler
     * @member PlayEngine
     * @return
     * @method
     */
    setEventListener : function(eventName, listener) {
        var _listener;
        if (eventName == this.EVENTS.INITFAIL ||
            eventName == this.EVENTS.INIT) {
            _listener = T.fn.bind(function(e) {
                listener.apply(this, arguments);
            }, this);
        } else {
            _listener = T.fn.bind(function(e) {
                if (e.target && e.target.getEngineType() == this.curEngineType) {
                    listener.apply(this, arguments);
                }
            }, this);
        }

        T.array.each(this.unInitEngineList, function(item, index) {
            item.setEventListener(eventName, _listener);
        });
    },

    /**
     * 初始化加载进度改变的事件
     * @member PlayEngine
     * @param
     * @return
     * @method _initProgressEvent
     * @private
     */
    _initProgressEvent : function() {
        this.progressTimer.addEventListener('timer',
            T.fn.bind(function(delay, repeatCount) {
                var percent = this.getLoadedPercent();
                this.curEngine.dispatchEvent(this.EVENTS.PROGRESS, {
                    progress    : percent,
                    totalBytes  : this.getTotalBytes(),
                    loadedBytes : this.getLoadedBytes(),
                    totalTime   : this.getTotalTime()
                });
                if (percent == 1 && this.curEngineType != 'wmp') {
                    this.progressTimer.stop();
                }
            }, this)
        );

        this.setEventListener(this.EVENTS.STATECHANGE,
            T.fn.bind(function(e) {
                var st = e.newState;
                switch (st) {
                    //st == 'pre-buffer'
                    case this.STATES.PREBUFFER :
                    //st == 'play'
                    case this.STATES.PLAY :
//                        if (this.getLoadedPercent() < 1) {
                            this.progressTimer.start();
//                        }
                        break;
                    //stop
                    case this.STATES.STOP :
                    //ready
                    case this.STATES.READY :
                    //end
                    case this.STATES.END :
                        this.progressTimer.reset();
                        break;
                }
            }, this)
        );

        this.setEventListener('setUrl', T.fn.bind(function(e) {
            this.progressTimer.reset();
            this.progressTimer.start();
        }, this));
    },

    /**
     * 初始化播放进度改变的事件
     * @member PlayEngine
     * @param
     * @return
     * @method _initPositionChangeEvent
     * @private
     */
    _initPositionChangeEvent : function() {
        this.positionTimer.addEventListener('timer',
            T.fn.bind(function(delay, repeatCount) {
                var curPos = this.getCurrentPosition();
                this.curEngine.dispatchEvent(this.EVENTS.POSITIONCHANGE, {
                    position : curPos
                });
            }, this)
        );

        this.setEventListener(this.EVENTS.STATECHANGE,
            T.fn.bind(function(e) {
                var st = e.newState;
                switch (st) {
                    //st == 'play'
                    case this.STATES.PLAY :
                        this.positionTimer.start();
                        break;
                    //st == 'stop'
                    case this.STATES.STOP :
                    //st == 'pause'
                    case this.STATES.PAUSE :
                        this.positionTimer.pause();
                        // 刷新一下position
                        this.curEngine.dispatchEvent(this.EVENTS.POSITIONCHANGE, {
                            position:this.getCurrentPosition()
                        });
                        break;
                    //ready
                    case this.STATES.READY :
                    //end
                    case this.STATES.END :
                        this.positionTimer.reset();
                        break;
                }
            }, this)
        );
        this.setEventListener('setUrl', T.fn.bind(function(e) {
            this.positionTimer.reset();
        }, this));
    }
});