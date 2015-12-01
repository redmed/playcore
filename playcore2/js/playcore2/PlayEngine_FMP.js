/**
 * @fileoverview 播放内核 Adobe Flash Player 内核的封装(allinone.swf支持MP3、AAC)
 * @authod qiaogang@baidu.com, liangweibin@baidu.com
 * @class PlayEngine_FMP
 * @requires PlayEngine_Interface.js
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
var PlayEngine_FMP = mbox.lang.createClass(
    function (conf) {
        conf = conf || {};

        var defConf = {
            mute:false,
            volume:50
        };

        this.mute = typeof conf.mute == 'undefined' ? defConf.mute : !!conf.mute;
        this.volume = typeof conf.volume == 'undefined' ? defConf.volume : conf.volume;

        /**
         * 子内核支持的格式(文件扩展名)
         */
        this.supportMimeType = ['mp3', 'mp4', 'm4a'];

        this.engineType = 'fmp';

        /**
         * 播放器 swf 地址
         */
        this.swfPath = 'allinone.swf';

        /**
         * flash 版本的最低要求
         */
        this.flashVersionRequire = conf.flashVersionRequire || '10.0.0';

        /**
         * flash 版本小于最低要求时的提示文本
         */
        this.versionErrorMessage = conf.versionErrorMessage || '';

        /**
         * 状态码hash表,用来和标准STATE状态做一个映射
         */
        this.stateCode = {
            'ready':this.STATES.READY,
            'stop':this.STATES.STOP,
            'play':this.STATES.PLAY,
            'pause':this.STATES.PAUSE,
            'end':this.STATES.END,
            'buffering':this.STATES.BUFFERING,
            'pre-buffer':this.STATES.PREBUFFER,
            'error':this.STATES.ERROR
        };

        this.flashReady = new mbox.Fuze();
        this.flashLoaded = false;
    }, {
        superClass:PlayEngine_Interface,
        className:'PlayEngine_FMP'
    }).extend({
        /**
         * 判断当前环境中是否可用，子内核加载时，依据这里的结果
         *
         * @param {Boolean} dispatch 是否派发INITFAIL事件，默认不派发
         * @return {Boolean}
         */
        test:function (dispatch) {
            return this._checkPlayer(dispatch);
        },

        /**
         * 播放核的初始化
         *
         * @param {Object} options
         * @config {HTMLElement|String} [el] 播放内核容器或容器id
         * @config {String} instanceName 创建的实例名字 用于flash回调
         * @config {String} swfPath flash文件路径
         */
        init:function (options) {
            options = options || {};
            var el = options.el;
            this.instanceName = options.instanceName;
            this.swfPath = options.swfPath || this.swfPath;

            var inner;
            this.flashObjectId = this.newId();
            if (T.lang.isString(el)) {
                el = T.g(el);
            }

            if (!el) {
                el = T.dom.create('div');
                document.body.appendChild(el);
            }
            inner = T.dom.create('div');
            el.appendChild(inner);

            this.swfPath += '?' + this.flashObjectId + '_' + Math.random();

            T.swf.create({
                id:this.flashObjectId,
                width:'1',
                height:'1',
                ver:this.flashVersionRequire,
                errorMessage:this.versionErrorMessage,
                allowscriptaccess:'always',
                url:this.swfPath,
                wmode:'window',
                scale:'noscale',
                vars:{
                    onready:this.instanceName + '._onLoad',
                    onplaystatechange:this.instanceName + '._onPlayStateChange',
                    onerror:this.instanceName + '._onError',
                    volume:this.volume
                }
            }, inner);

            this.state = this.STATES.INIT;

            this.flashObject = T.swf.getMovie(this.flashObjectId);
        },

        /**
         * 播放核状态恢复
         * @method reset
         */
        reset:function () {
            this.flashReady(T.fn.bind(function () {
                this.flashObject.reset();
            }, this));
            this.url = '';
            this.state = this.STATES.READY;
            this.stateStack = [this.STATES.READY];
        },

        /**
         * 设置播放核的音频地址,开始加载url
         * @method setUrl
         * @param {String} url 音频地址
         */
        setUrl:function (url) {
            this.flashReady(T.fn.bind(function () {
                this.url = url;
                this.flashObject.audioLoad(url);
            }, this));
        },

        /**
         * 操作音频播放
         * @method play
         */
        play:function () {
            this.flashReady(T.fn.bind(function () {
                if (this.state == this.STATES.PLAY) return;
                this.flashObject.audioPlay();
            }, this));
        },

        /**
         * 操作音频暂停
         * @method pause
         */
        pause:function () {
            this.flashReady(T.fn.bind(function () {
                this.flashObject.audioPause();
            }, this));
        },

        /**
         * 操作音频停止
         * @method stop
         */
        stop:function () {
            this.flashReady(T.fn.bind(function () {
                if (this.state == this.STATES.STOP) return;
                this.flashObject.audioStop();
            }, this));
        },

        /**
         * 设置播放核静音状态
         * @method setMute
         * @param {Boolean} mute 播放核是否静音
         */
        setMute:function (mute) {
            this.flashReady(T.fn.bind(function () {
                this.mute = !!mute;
                this.flashObject.setVolume(this.mute ? 0 : this.volume);
            }, this));
        },

        /**
         * 设置播放核音量大小
         * @method setVolume
         * @param {Number} volume 音量大小，取值范围 0-100，0 最小声
         */
        setVolume:function (volume) {
            this.flashReady(T.fn.bind(function () {
                this.volume = volume;
                if (!this.mute) {
                    this.flashObject.setVolume(volume);
                }
            }, this));
        },

        /**
         * 设置播放核当前播放进度
         * @method setCurrentPosition
         * @param {Number} time 目标播放时间，单位：毫秒
         */
        setCurrentPosition:function (time) {
            this.flashReady(T.fn.bind(function () {
                this.flashObject.setCurrentPos(time);
                this.flashObject.audioPlay();
            }, this));
        },

        /**
         * 取得播放核当前播放进度
         * @method getCurrentPosition
         * @return {Number} 当前播放时间，单位：毫秒
         */
        getCurrentPosition:function () {
            return this.flashLoaded ? this.flashObject.getCurrentPos() : 0;
        },

        /**
         * 取得播放核当前下载百分比
         * @method getLoadedPercent
         * @return {Number} 下载百分比，取值范围 0-1
         */
        getLoadedPercent:function () {
            return this.flashLoaded ? (parseFloat(this.flashObject.getLoadedPercent() / 100) || 0) : 0;
        },

        /**
         * 取得播放核当前 URL 总播放时间
         * @method getTotalTime
         * @return {Number} 总时长，单位：毫秒
         */
        getTotalTime:function () {
            return this.flashLoaded ? this.flashObject.getTotalTime() : 0;
        },

        /**
         * 取得当前文件下载了多少byte，单位byte
         *  @member PlayEngine
         * @method getLoadedBytes
         * @reuturn {Number} 下载了多少byte
         */
        getLoadedBytes:function () {
            return this.flashLoaded ? this.flashObject.getLoadedByte() : 0;
        },

        /**
         * 取得当前链接文件的总大小
         *  @member PlayEngine
         * @method getTotalBytes
         * @return {Number} 当前资源的总大小，单位byte
         */
        getTotalBytes:function () {
            return this.flashLoaded ? this.flashObject.getTotalByte() : 0;
        },

        /**
         * 取得当前播放器原生状态
         * @method getState
         * @return {String} 当前播放状态
         */
        getState:function () {
            return this.flashLoaded ? this.stateCode[this.flashObject.getState()] : this.STATES.INIT;
        },

        getVersion:function () {
            return T.swf.version;
        },

        /**
         * 这个函数有特殊用途，不允许污染函数体的代码
         * @private
         */
        _firePlayStateChange:function (stateName) {
            if (this.state != stateName) {
                var previouState = this.state;
                this.state = stateName;
                this.dispatchEvent(this.EVENTS.STATECHANGE, {
                    newState:stateName,
                    oldState:previouState,
                    engineType:this.engineType
                });
            }
        },

        /**
         * swf 加载完成时的回调函数
         * @private
         */
        _onLoad:function () {
            this.state = this.STATES.READY;
            this.dispatchEvent(this.EVENTS.INIT, {
                engineType:this.engineType,
                engine:this.flashObject
            });
            //如果fire()后立刻调用this.flashObject中的方法会报错，因此使用队列方式。可以避免调用this.flashObject报错
            setTimeout(T.fn.bind(function () {
                this.flashReady.fire();
                this.flashLoaded = true;
            }, this), 0);
        },

        /**
         * swf 状态改变时的回调函数
         * @private
         */
        _onPlayStateChange:function () {
            this._firePlayStateChange(this.getState());
        },

        /**
         * swf 抛出错误时的回调函数
         * @private
         */
        _onError:function () {
            this.dispatchEvent(this.EVENTS.ERROR, {});
        },

        /**
         * 检查播放器是否存在或被禁用
         * @param {Boolean} 是否派发INITFAIL事件，默认不派发
         * @private
         */
        _checkPlayer:function (dispatch) {
            dispatch = !!dispatch;
            var curVer = T.swf.version,
                reqVer = this.flashVersionRequire;
            if (curVer) {
                var curVerArr = curVer.split('.'),
                    reqVerArr = reqVer.split('.');
                if (curVerArr[0] - reqVerArr[0] >= 0
                    && curVerArr[1] - reqVerArr[1] >= 0) {
                    return true;
                } else {
                    if (dispatch) {
                        this.dispatchEvent(this.EVENTS.INITFAIL, {
                            engineType:this.engineType
                        });
                    }
                    return false;
                }
            } else {
                if (dispatch) {
                    this.dispatchEvent(this.EVENTS.INITFAIL, {
                        engineType:this.engineType
                    });
                }
                return false;
            }
        }
    });