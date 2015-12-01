/**
 * @fileoverview 播放内核 Adobe Flash Player 内核的封装(fmp_mp3.swf只支持MP3的内核)
 * @authod qiaogang@baidu.com
 * @class PlayEngine_FMP_MP3
 * @requires PlayEngine_Interface.js
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
var PlayEngine_FMP_MP3 = mbox.lang.createClass(function(conf) {
    conf = conf || {};

    /**
     * 子内核支持的格式(文件扩展名)
     */
    this.supportMimeType = ['mp3'];

    this.engineType = 'fmp_mp3';

    /**
     * 播放器 swf 地址
     */
    this.swfPath = 'fmp_mp3.swf';

    /**
     * flash 版本的最低要求
     */
    this.flashVersionRequire = conf.flashVersionRequire || '9.0.0';

    /**
     * flash 版本小于最低要求时的提示文本
     */
    this.versionErrorMessage = conf.versionErrorMessage || '';

    /**
     * 状态码hash表,用来和标准STATE状态做一个映射
     */
    this.stateCode = {
        '-2' : this.STATES.INIT,
        '-1' : this.STATES.READY,
        '0'  : this.STATES.STOP,
        '1'  : this.STATES.PLAY,
        '2'  : this.STATES.PAUSE,
        '3'  : this.STATES.END,
        '4'  : this.STATES.BUFFERING,
        '5'  : this.STATES.PREBUFFER,
        '6'  : this.STATES.ERROR
    };

    this.flashLoaded = false;
    this.flashReady = new mbox.Fuze();
}, {
    superClass : PlayEngine_Interface,
    className : 'PlayEngine_FMP_MP3'
}).extend({
    /**
     * 判断当前环境中是否可用，子内核加载时，依据这里的结果
     *
     * @param {Boolean} 是否派发INITFAIL事件，默认不派发
     * @return {Boolean}
     */
    test : function(dispatch) {
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
    init : function(options) {
        options = options || {};
        var el = options.el;
        this.instanceName = options.instanceName;
        this.swfPath = options.swfPath || this.swfPath;

        var inner, id = this.newId();
        if (T.lang.isString(el)) {
            el = T.g(el);
        }

        if (!el) {
            el = T.dom.create('div');
            document.body.appendChild(el);
        }
        inner = T.dom.create('div');
        el.appendChild(inner);

//        if (T.browser.maxthon || T.browser.ie) {
            this.swfPath += '?' + id + '_' + Math.random();
//        }

        T.swf.create({
            id : this.flashObjectId = id,
            width : '1px',
            height : '1px',
            ver : this.flashVersionRequire,
            errorMessage : this.versionErrorMessage,
            allowscriptaccess : 'always',
            url : this.swfPath,
            bgcolor : '#ffffff',
            wmode : 'window',
            scale : 'noscale',
            vars : {
                _instanceName : this.instanceName + '',
                _buffertime : 2000
            }
        }, inner);

        //by huangzhongjian 监听播放内核flash加载不了，或者没有正确执行回调的情况
        setTimeout(T.fn.bind(function(){
            if(!this.flashLoaded){
                this.dispatchEvent('flash_load_timeout');
            }
        }, this), 8000);
        this.flashObject = $.swf.getMovie(this.flashObjectId);
    },

    /**
     * 播放核状态重置
     * 注意：会抛出stop事件，会重置除音量和静音状态的其他状态值。
     * @method reset
     */
    reset : function() {
        this.stop();
        if (this.state != this.STATES.INIT) {
            this.url = '';
            this.state = this.STATES.READY;
            this.stateStack = [this.STATES.READY];
        }
    },

    /**
     * 设置播放核的音频地址,开始加载url
     * @method setUrl
     * @param {String} url 音频地址
     */
    setUrl : function(url) {
        this.url = url; //by huangzhongjian 2013-07-11 保持getUrl()能取到url，即使flash还没有回调
        this.flashReady(T.fn.bind(function() {
            //this.url = url;
            this.flashObject.f_load(url);
        }, this));
    },

    /**
     * 操作音频播放
     * @method play
     */
    play : function() {
        this.flashReady(T.fn.bind(function() {
            if ( this.state == this.STATES.PLAY ) return;
            this.flashObject.f_play();
        }, this));
    },

    /**
     * 操作音频暂停
     * @method pause
     */
    pause : function() {
        this.flashReady(T.fn.bind(function() {
            if ( this.state == this.STATES.PAUSE ||
                 this.state == this.STATES.STOP ||
                 this.state == this.STATES.END ) return;
            this.flashObject.f_pause();
        }, this));
    },

    /**
     * 操作音频停止
     * @method stop
     */
    stop : function() {
        this.flashReady(T.fn.bind(function() {
            if ( this.state == this.STATES.STOP ) return;
            this.flashObject.f_stop();
        }, this));
    },

    /**
     * 设置播放核静音状态
     * @method setMute
     * @param {Boolean} mute 播放核是否静音
     */
    setMute : function(mute) {
        this.flashReady(T.fn.bind(function() {
            this.mute = mute;
            this.flashObject.setData('mute', mute);
        }, this));
    },

    /**
     * 设置播放核音量大小
     * @method setVolume
     * @param {Number} volume 音量大小，取值范围 0-100，0 最小声
     */
    setVolume : function(volume) {
        this.flashReady(T.fn.bind(function() {
            this.volume = volume;
            this.flashObject.setData('volume', volume);
        }, this));
    },

    /**
     * 设置播放核当前播放进度
     * @method setCurrentPosition
     * @param {Number} time 目标播放时间，单位：毫秒
     */
    setCurrentPosition : function(time) {
        this.flashReady(T.fn.bind(function() {
            this.flashObject.f_play(time);
        }, this));
    },

    /**
     * 取得播放核当前播放进度
     * @method getCurrentPosition
     * @return {Number} 当前播放时间，单位：毫秒
     */
    getCurrentPosition : function() {
        return this.flashLoaded ?
            this.flashObject.getData('currentPosition') : 0;
    },

    /**
     * 取得播放核当前下载百分比
     * @method getLoadedPercent
     * @return {Number} 下载百分比，取值范围 0-1
     */
    getLoadedPercent : function() {
        return this.flashLoaded ?
            this.flashObject.getData('loadedPct') : 0;
    },

    /**
     * 取得播放核当前 URL 总播放时间
     * @method getTotalTime
     * @return {Number} 总时长，单位：毫秒
     */
    getTotalTime : function() {
        return this.flashLoaded ?
            this.flashObject.getData('length') : 0;
    },

    /**
     * 取得当前播放器原生状态
     * @method getState
     * @param {Number}
     * @return {String} 当前播放状态
     */
    getState : function(state) {
        return T.lang.isNumber(state) ?
            this.stateCode[state] : this.state;//this.flashObject.getData('playStatus');
    },

    getVersion : function() {
        return T.swf.version;
    },

    /**
     * 这个函数有特殊用途，不允许污染函数体的代码
     * @private
     */
    _firePlayStateChange : function(stateName) {
        if (this.state != stateName) {
            this.state = stateName;
            this.stateStack.push(stateName);
            var previouState = this.stateStack.shift();
            this.dispatchEvent(this.EVENTS.STATECHANGE, {
                newState : stateName,
                oldState : previouState,
                engineType : this.engineType
            });
        }
    },

    /**
     * fmp_mp3.swf 加载完成时的回调函数
     * @private
     */
    _onLoad : function() {
        this.state = this.STATES.READY;
        this.stateStack = [this.state];
        this.dispatchEvent(this.EVENTS.INIT, {
            engineType : this.engineType,
            engine : this.flashObject
        });
        //如果fire()后立刻调用this.flashObject中的方法会报错，因此使用队列方式。可以避免调用this.flashObject报错
        setTimeout(T.fn.bind(function() {
            this.flashReady.fire();
            this.flashLoaded = true;
        }, this), 0);
    },

    /**
     * fmp_mp3.swf 状态改变时的回调函数
     * @param {String} state 状态码
     * @private
     */
    _onPlayStateChange : function(state) {
        //HACK Opera下的flash回调不加timeout没法触发这个回调..可能是个bug
        if (!T.browser.opera) {
            this._firePlayStateChange(this.getState(state));
        } else {
            setTimeout(T.fn.bind(function() {
                this._firePlayStateChange(this.getState(state));
            }, this), 0);
        }
    },

    /**
     * 检查播放器是否存在或被禁用
     * @param {Boolean} 是否派发INITFAIL事件，默认不派发
     * @private
     */
    _checkPlayer : function(dispatch) {
        dispatch = !!dispatch;
        var curVer = T.swf.version,
            reqVer = this.flashVersionRequire;
        if (curVer) {
            var curVerArr = curVer.split('.'),
                reqVerArr = reqVer.split('.');
            if ( curVerArr[0] - reqVerArr[0] >= 0
                && curVerArr[1] - reqVerArr[1] >= 0 ) {
                return true;
            } else {
                if (dispatch) {
                    this.dispatchEvent(this.EVENTS.INITFAIL, {
                        engineType : this.engineType
                    });
                }
                return false;
            }
        } else {
            if (dispatch) {
                this.dispatchEvent(this.EVENTS.INITFAIL, {
                    engineType : this.engineType
                });
            }
            return false;
        }
    }
});
