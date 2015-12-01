/**
 * @fileoverview 播放内核 HTML5 Audio 内核的封装
 * @authod liangweibin@baidu.com
 * @class PlayEngine_Audio
 * @requires PlayEngine_Interface.js
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
var PlayEngine_Audio = mbox.lang.createClass(function(conf) {
    conf = conf || {};

    this.engineType = 'audio';

    /**
     * 文件扩展名对应的 Content-Type，一个扩展名可能会对应多个 Content-Type
     */
    this.contentType = {
        'mp3' : ['audio/mpeg', 'audio/mp3'],
        'mp4' : ['audio/mp4' , 'audio/MP4A-LATM', 'video/mpeg4', 'audio/mpeg4-generic'],
        'm4a' : ['audio/mp4' , 'audio/MP4A-LATM', 'video/mpeg4', 'audio/mpeg4-generic'],
        'aac' : ['audio/aac' , 'audio/aacp'],
        '3gp' : ['audio/3gpp', 'audio/3gpp2'],
        'ogg' : ['audio/ogg' , 'video/ogg', 'application/ogg', 'audio/vorbis'],
        'oga' : ['audio/ogg' , 'application/ogg', 'audio/vorbis'],
        'wma' : ['audio/x-ms-wma']
    };

    this.supportAudio = typeof Audio != "undefined";

    /**
     * 子内核支持的格式(文件扩展名)
     */
    this.supportMimeType = [];

    /**
     * 如果支持 Audio，那么检测并填充 this.supportMimeType
     */
    if (this.supportAudio) {
        this.audio = new Audio();
        if (typeof this.audio.canPlayType == "function") {
            T.object.each(this.contentType, T.fn.bind(function (types, ext) {
                for (var i = 0; i < types.length; i++) {
                    // 只要支持任意一种 content-type，就可以认为浏览器支持该扩展名
                    var canPlayType = this.audio.canPlayType(types[i]);
                    if (canPlayType == 'probably' || canPlayType == 'maybe') {
                        this.supportMimeType.push(ext);
                        break;
                    }
                }
            }, this));
        }
        // 如果没有能支持的扩展名，那么可以认为浏览器不支持 Audio
        if (!this.supportMimeType.length) {
            this.supportAudio = false;
        }
    }

    /**
     * 判断是否支持调节音量（预留）
     * 原理：对于 iOS，audio.volume 总是返回 1
     * 只针对 iOS，其他系统的音量特性未测试
     */
    this.supportVolume = T.fn.bind(function(){
        if (this.supportAudio) {
            this.audio.volume = 0.5;
            return (this.audio.volume < 1);
        }
        return false;
    }, this)();

}, {
    superClass : PlayEngine_Interface,
    className : 'PlayEngine_Audio'
}).extend({
    /**
     * 判断当前环境中是否可用，子内核加载时，依据这里的结果
     *
     * @param {Boolean} dispatch 是否派发INITFAIL事件，默认不派发
     * @return {Boolean}
     */
    test : function(dispatch) {
        dispatch = !!dispatch;
        if (!this.supportAudio && dispatch) {
            this.dispatchEvent(this.EVENTS.INITFAIL, {
                engineType:this.engineType
            });
        }
        return this.supportAudio;
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
        this.lastState = this.STATES.INIT;
        this.muted = this.audio.muted = false;
        this.volume = 50;
        this.audio.volume = 0.5;
        this.url = "";
        this._definedEvents();

        this.state = this.STATES.READY;
        this.dispatchEvent(this.EVENTS.INIT, {
            engineType : this.engineType,
            engine : this.audio
        });
    },

    /**
     * 播放核状态恢复
     * @method reset
     */
    reset : function() {
        if (!this.supportAudio) return;
        this.url = "";
        this.audio.pause();
        this.state = "ready";
        this.lastState = "ready";
    },

    /**
     * 设置播放核的音频地址,开始加载url
     * @method setUrl
     * @param {String} url 音频地址
     */
    setUrl : function(url) {
        if (!this.supportAudio) return;
        this.url = url;
        this.audio.src = url;
        this.audio.load();
        this._firePlayStateChange(this.STATES.PREBUFFER);
    },

    /**
     * 操作音频播放
     * @method play
     */
    play : function() {
        if (!this.supportAudio) return;
        if (this.state != "ready") {
            if (T.platform.isAndroid &&  T.browser.isWebkit && this.audio.readyState < 3) {
                var canPlay = T.fn.bind(function () {
                    this.audio.play();
//                    window.setTimeout(T.fn.bind(function() {
                        this.setMute(this.getMute());
//                    }, this), 0);
                    this.audio.removeEventListener("canplay", canPlay, false);
                }, this);
                this.audio.addEventListener("canplay", canPlay, false);
            } else {
                this.audio.play();
//                window.setTimeout(T.fn.bind(function() {
                    this.setMute(this.getMute());
//                }, this), 0);
            }
        }
    },

    /**
     * 操作音频暂停
     * @method pause
     */
    pause : function() {
        if (!this.supportAudio) return;
        if (this.state != this.STATES.STOP
            && this.state != this.STATES.READY && this.state != this.STATES.END) {
            this.audio.pause();
            this._firePlayStateChange(this.STATES.PAUSE);
        }
    },

    /**
     * 操作音频停止
     * @method stop
     */
    stop : function() {
        if (!this.supportAudio) return;
        if (this.state != this.STATES.READY) {
            if (this.audio.currentTime != 0) {
                this.audio.currentTime = 0;
            }
            this.audio.pause();
            this._firePlayStateChange(this.STATES.STOP);
        }
    },

    /**
     * 设置播放核静音状态
     * @method setMute
     * @param {Boolean} mute 播放核是否静音
     */
    setMute : function(mute) {
        if (!this.supportAudio) return;
        this.audio.muted = false;
        this.audio.muted = this.mute = mute;
    },

    /**
     * 设置播放核音量大小
     * @method setVolume
     * @param {Number} volume 音量大小，取值范围 0-100，0 最小声
     */
    setVolume : function(volume) {
        if (!this.supportAudio) return;
        volume = T.lang.isNumber(volume) ?  volume : 50;
        volume = Math.max(Math.min(volume, 100), 0);
        this.volume = volume;  //set a NaN can crash chrome broswer!
        this.audio.volume = volume / 100;
    },

    /**
     * 设置播放核当前播放进度
     * @method setCurrentPosition
     * @param {Number} time 目标播放时间，单位：毫秒
     */
    setCurrentPosition : function(time) {
        //TODO
        if (!this.supportAudio) return;
        if (T.platform.isAndroid && this.audio.readyState < 3) {
            var canPlay = T.fn.bind(function () {
                this.audio.currentTime = time / 1000;
                this.audio.play();
                this.audio.removeEventListener("canplay", canPlay, false);
            }, this);
            this.audio.addEventListener("canplay", canPlay, false);
        } else {
            this.audio.currentTime = time / 1000;
            this.audio.play();
        }
    },

    /**
     * 取得播放核当前播放进度
     * @method getCurrentPosition
     * @return {Number} 当前播放时间，单位：毫秒
     */
    getCurrentPosition : function() {
        if (!this.supportAudio) return 0;
        return Math.round(this.audio.currentTime * 1000);
    },

    /**
     * 取得播放核当前下载百分比
     * @method getLoadedPercent
     * @return {Number} 下载百分比，取值范围 0-1
     */
    getLoadedPercent : function() {
        try {
            var end = this.audio.buffered.end(0),
                dur = this.audio.duration;
            dur = isNaN(dur) ? 0 : dur;
            return Math.round(end / dur * 100) / 100;
        } catch (e) {
            return 0;
        }
    },

    /**
     * 取得播放核当前 URL 总播放时间
     * @method getTotalTime
     * @return {Number} 总时长，单位：毫秒
     */
    getTotalTime : function() {
        if (!this.supportAudio) return 0;
        var dur = this.audio.duration;
        dur = isNaN(dur) ? 0 : dur;
        return Math.round(dur * 1000);
    },

    /**
     * 取得当前播放器原生状态
     * @method getState
     * @return {String} 当前播放状态
     */
    getState : function() {
        return this.state;
    },

    /**
     * 这个函数有特殊用途，不允许污染函数体的代码
     * @private
     */
    _firePlayStateChange : function(stateName) {
        if (this.state != stateName) {
            this.lastState = this.state;
            this.state = stateName;
            this.dispatchEvent(this.EVENTS.STATECHANGE, {
                newState : stateName,
                oldState :this.lastState,
                engineType : this.engineType
            });
        }
    },

    /**
     * 定义事件，即把 HTML5 Audio 的事件转换成 PlayEngine 事件
     * @private
     */
    _definedEvents : function() {
        this.audio.addEventListener("error", T.fn.bind(function () {
            this._firePlayStateChange(this.STATES.ERROR);
            this.dispatchEvent(this.EVENTS.ERROR, {
                engineType:this.engineType
            });
        }, this), false);

        this.audio.addEventListener("ended", T.fn.bind(function () {
            this._firePlayStateChange(this.STATES.END);
        }, this), false);

        this.audio.addEventListener("playing", T.fn.bind(function () {
            this._firePlayStateChange(this.STATES.PLAY);
        }, this), false);

        // win8 ie10 拖动进度后只有 waiting--》进入buffer 没有 playing发出。
        T.browser.ie >=10 && this.audio.addEventListener("timeupdate", T.fn.bind(function () {
            if(this.getState() == this.STATES.BUFFERING){
                this._firePlayStateChange(this.STATES.PLAY);
            }
        }, this), false);

        this.audio.addEventListener("pause", T.fn.bind(function () {
            if (this.getState() == this.STATES.PLAY) {
                this._firePlayStateChange(this.getCurrentPosition() ? this.STATES.PAUSE : this.STATES.STOP);
            }
        }, this), false);

        this.audio.addEventListener("waiting", T.fn.bind(function () {
            this._firePlayStateChange(this.getCurrentPosition() ? this.STATES.BUFFERING : this.STATES.PREBUFFER);
        }, this), false);

        /*this.audio.addEventListener("seeking", T.fn.bind(function () {
            if (!this.audio.paused) {
                this._firePlayStateChange(this.STATES.BUFFERING);
            }
        }, this), false);

        this.audio.addEventListener("seeked", T.fn.bind(function () {
            if (!this.audio.paused) {
                this._firePlayStateChange(this.STATES.PLAY);
            }
        }, this), false);*/

        /*this.audio.addEventListener("progress", T.fn.bind(function (event) {
            //in chrome broswer, call "progress" event pre 350ms one time.
            var playingTime = this.getCurrentPosition(), end = 0;
            try {
                end = Math.round(this.audio.buffered.end(0) * 1000);
            } catch (e) {
            }
            var res = end - playingTime;
            //play buffer is about 1000ms in chrome
            if (end && res > 350) {
                if (this.state == "buffering") {
                    this._firePlayStateChange(this.STATES.PLAY);
                }
            } else {
                if (this.state == "play") {
                    this._firePlayStateChange(this.STATES.BUFFERING);
                }
            }
        }, this), false);*/
    }
});
