/**
 * 播放内核 Windows Media Player 内核的封装
 *
 * @authod qiaogang@baidu.com
 * @requires PlayEngine_Interface.js
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
var PlayEngine_WMP = T.lang.createClass(function(conf) {
        conf = conf || {};
        this.supportMimeType = ['mp3','wma'];
        /**
         * 播放状态延时派发时间
         * @property playStateDelayTime
         * @type Number
         * @default 100
         */
        this.playStateDelayTime = typeof conf.playStateDelayTime == "number" ?
            conf.playStateDelayTime : 100;

        /**
         * 人为停止状态延时解锁时间
         * @property humanStopCheckDelayTime
         * @type Number
         * @default 640
         */
        this.humanStopCheckDelayTime = typeof conf.humanStopCheckDelayTime ==
            "number" ? conf.humanStopCheckDelayTime : 640;

        /**
         * 总时长和当前时长比较误差范围
         * @property timeDifference
         * @type Number
         * @default 2
         */
        this.timeDifference = typeof conf.timeDifference == "number" ?
            conf.timeDifference : 2;

        /**
         * 启用总时长和当前时长比较的最小总时长
         * @property minDurationForDiff
         * @type Number
         * @default 10
         */
        this.minDurationForDiff = typeof conf.minDurationForDiff == "number" ?
            conf.minDurationForDiff : 10;

        /**
         * 播放器错未安装或被禁止的误信息
         * @property errorMessage
         * @type String
         * @default ""
         */
        this.errorMessage = typeof conf.errorMessage != "undefined" ?
            conf.errorMessage : "";

        this.engineType = 'wmp';
        /**
         * @private
         */
        this.fuze = new mbox.Fuze();
        this.fuze.fire();
    }, {
    superClass : PlayEngine_Interface,
    className : 'PlayEngine_WMP'
}).extend({

        test : function(dispatch) {
            if (!T.browser.ie&&dispatch){
                    this.dispatchEvent(this.EVENTS.INITFAIL, {
                        engineType:"wmp"
                    });
            }
			return T.browser.ie;
		
        },
    /**
     * 播放核的初始化
     * @method init
     * @param {Object} options
     * @options {HTMLElement/String} el 播放内核容器或容器id
     */
    init : function(options) {

        options = options || {};

        var el = options.el;

        var inner = T.dom.create('div');
        if (T.isString(el)) {
            el = T.g(el);
        }
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
        var id = this.newId();

        var template = ["<object id='#{id}' width='#{width}' height='#{height}' ",
            "classid='CLSID:6BF52A52-394A-11d3-B153-00C04F79FAA6'>",
                "<param name='autostart' value='false'>",
                "<param name='balance' value='0'>",
                "<param name='enabled' value='false'>",
                "<param name='enablecontextmenu' value='false'>",
                "<param name='url' value='#{url}'>",
                "<param name='playcount' value='#{playcount}'>",
                "<param name='rate' value='1'>",
                "<param name='currentposition' value='0'>",
                "<param name='currentmarker' value='0'>",
                "<param name='defaultframe' value=''>",
                "<param name='invokeurls' value='false'>",
                "<param name='baseurl' value=''>",
                "<param name='stretchtofit' value='false'>",
                "<param name='volume' value='#{volume}'>",
                "<param name='mute' value='#{mute}'>",
                "<param name='uimode' value='none'>",//Invisible
                "<param name='windowlessvideo' value='-1'>",
                "<param name='fullscreen' value='false'>",
                "<param name='enableerrordialogs' value='false'>",
            "</object>"];

        inner.innerHTML = T.format(template.join(''), {
            id: id,
            width: "400",
            height: "300",
            url: "",
            playcount: 1,
            volume: 50,
            mute: false
        });



        if (!el) {
            el = T.dom.create('div');
            document.body.appendChild(el);
        }

        el.appendChild(inner);

        /**
         * 播放器 dom 对象
         * @property audio
         * @type htmlElement
         */
        this.audio = T.g(id);
        this.state = this.STATES.INIT;


        //check the player if is exist.
        if ( !this.checkPlayer() ) {
            return;
        }
        this.defineEvent();
        this.reset();
    },

    /**
     * 播放核状态恢复
     * @method reset
     */
    reset : function() {
        this.bufferingProgress = 0;
        this.lastControl = "";
        this.lastState = "";
        this.stateDispatchSwitch = false;
        this.url = "";
        this.audio.URL = "";
        this.state = this.STATES.READY;
        this.stateStack = [this.STATES.READY];
        this.timer_0 = this.timer_1 = null;
    },

    /**
     * 设置播放核的音频地址
     * @method setUrl
     * @param {String} url 音频地址
     */
    setUrl : function(url) {
        this.fuze(T.fn.bind(function() {
            this.reset();
//                this.stateDispatchSwitch = true;
            this.url = this.audio.URL = url || "";
//                this.firePlayStateChange(this.getState(10));
            this.lastState = "ready";
        }, this));
    },

    /**
     * 操作音频播放
     * @method play
     */
    play : function() {
        this.fuze(T.fn.bind(function() {
            if (this.state == this.STATES.PLAY) return;

            this.setVolume(this.getVolume());
            this.setMute(this.getMute());
            this.stateDispatchSwitch = true;

            this.firePlayStateChange(this.getState(3));
            this.audio.controls.play();

            this.firePlayStateChange(this.getState());
        }, this));
    },

    /**
     * 操作音频暂停
     * @method pause
     */
    pause : function() {
        this.fuze(T.fn.bind(function() {
            if (this.state != this.STATES.STOP){
                this.firePlayStateChange(this.getState(2));
                this.audio.controls.pause();
            }
        }, this));
    },

    /**
     * 操作音频停止
     * @method stop
     */
    stop : function() {
        this.fuze(T.fn.bind(function() {
            if (this.state == this.STATES.STOP) return;
            this.firePlayStateChange(this.getState(1));
            this.fuze.extinguish();
            this.humanStop = true;
            this.audio.controls.stop();
            setTimeout(T.fn.bind(function() {
                this.humanStop = false;
                this.fuze.fire();
            }, this), this.humanStopCheckDelayTime);
        }, this));
    },

    /**
     * 设置播放核静音状态
     * @method setMute
     * @param {Boolean} mute 播放核是否静音
     */
    setMute : function(mute) {
        if (this.getMute() == mute)
            return;
        if (mute) {
            this.volume_tmp = this.getVolume();
            this.setVolume(0);
            this.mute = mute;
        } else {
            this.mute = mute;
            this.setVolume(this.volume_tmp);
        }
        this.audio.settings.mute = mute;
    },

    /**
     * 取得播放核静音状态
     * @method getMute
     * @return {Boolean} 播放核是否静音
     */
    getMute : function() {
        return typeof this.mute == "boolean" ?
            this.mute : this.mute = this.audio.settings.mute;
    },

    /**
     * 设置播放核音量大小
     * @method setVolume
     * @param {Number} volume 音量大小，取值范围 0-100，0 最小声
     */
    setVolume : function(volume) {
        if (this.getMute()) {
            this.volume_tmp = volume;
            this.volume = 0;
        } else {
            this.volume = volume;
        }
        this.audio.settings.volume = this.volume;
    },

    /**
     * 取得播放核音量大小
     * @method getVolume
     * @return {Number} 播放核音量大小，范围 0-100，0 最小声
     */
    getVolume : function() {
        return this.getMute() ?
            this.volume_tmp : typeof this.volume == "number" ?
                this.volume : this.volume = this.audio.settings.volume;
    },

    /**
     * 设置播放核当前播放进度
     * @method setCurrentPosition
     * @param {Number} time 目标播放时间，单位：毫秒
     */
    setCurrentPosition : function(time){
        this.fuze(T.fn.bind(function() {
            this.audio.controls.currentPosition = time / 1000;
            if (this.state != this.STATES.PLAY&& this.state != this.STATES.BUFFERING&&
                this.state != this.STATES.PREBUFFER) {
                this.play();
            } else {
                this.audio.controls.play();
            }
        }, this));
    },

    /**
     * 取得播放核当前播放进度
     * @method getCurrentPosition
     * @return {Number} 当前播放时间，单位：毫秒
     */
    getCurrentPosition : function() {

        var currentPosition = this.audio.controls.currentPosition,
            //未加载资源时，currentMedia为null
            duration = this.audio.currentMedia ? this.audio.currentMedia.duration : 0;

        if(Math.abs(currentPosition - duration) < this.timeDifference &&
            duration > this.minDurationForDiff){
            this.firePlayStateChange(this.getState(8));
        }
        return Math.ceil(currentPosition * 1000);
    },

    /**
     * 取得播放核当前播放进度的字符串表现形式
     * @method getCurrentPositionString
     * @return {String} 当前播放时间，如 00:23
     */
    getCurrentPositionString : function() {
        return this.audio.controls.currentPositionString || "00:00";
    },

    /**
     * 取得播放核当前下载百分比
     * @method getLoadedPercent
     * @return {Number} 下载百分比，取值范围 0-1
     */
    getLoadedPercent : function() {

         if(this.lastState == this.STATES.READY)
           return 0;
         else{

            this.bufferingProgress = Math.max(
            this.audio.network.downloadProgress,
            this.bufferingProgress);

            return this.bufferingProgress/100;

         //   return this.audio.network.downloadProgress/100;
         }

    },
/*
    getBufferedPercent : function() {
        if (this.lastState == "ready"){
            return 0;
        } else {
            //在mediaplayer下，资源加载的一段时间内，该值可能也是100，但实际未加载数据。
            //而且虽然loaded为100，但实际还是有部分数据在缓冲，拖拽到后面的位置依然会缓冲。
            //todo 寻找一个稳定的计算已加载数据值的方法
            return this.audio.network.bufferingProgress / 100;
        }
    },
*/
    /**
     * 取得播放核当前 URL 总播放时间
     * @method getTotalTime
     * @return {Number} 总时长，单位：毫秒
     */
    getTotalTime : function() {
        if(this.audio.currentMedia){
            return Math.round(this.audio.currentMedia.duration * 1000);
        }else{
            return 0;
        }
    },

    /**
     * 取得播放核当前 URL 总播放时间的字符串表现形式
     * @method getTotalTimeString
     * @return {Number} 总时长，如 03:24
     */
    getTotalTimeString : function() {
        if(this.audio.currentMedia){
            return this.audio.currentMedia.durationString;
        }else{
            return "00:00";
        }
    },

    /**
     * 取得当前播放器原生状态
     * @method getState
     * @return {String} 当前播放状态
     */
    getState : function(state) {


        state = typeof state == "number" ? state : this.audio.PlayState - 0;
     //

        switch(state){
            case 0:
                return "notInitURL";
            case 1:
                return "stop";
            case 2:
                return "pause";
            case 3:
                return "play";
            case 6:

                return "buffering";
            case 8:
                return "end";
            case 9:
                //Transitioning ,正在连接
                return "pre-buffer";
            case 10:
                return "ready";
            case 11: // extra state
                return "error";
        }
    },

    /**
     * 获取此时产生的带宽
     */
    getBandWidth : function() {
        if (this.audio.network) {
            return this.audio.network.bandwidth;
        } else {
            return 0;
        }
    },

    getVersion : function() {

        return this.audio.versionInfo;
    },

    getReceivedPackets : function() {
        if (this.audio.network) {
            return this.audio.network.receivedPackets;
        } else {
            return 0;
        }
    },

    getPlayState : function() {
        return this.audio.playState;
    },

    getOpenState : function() {
        return this.audio.openState;
    },

    /**
     * @private defineEvent 定义播放器控件事情
     */
    defineEvent : function() {
        var audio = this.audio;
        var stateDelayTimer;

        var delayStateDispatch = T.fn.bind(function(time, state){
            return setTimeout(T.fn.bind(this.firePlayStateChange, this,
                this.getState(state)), time);
        }, this);

        audio.attachEvent("PlayStateChange", T.fn.bind(function(state){

            clearTimeout(stateDelayTimer);
            // filter invalid 'play' state,
            // and fix 'in buffering state action invalid' bug
            if(state == 3){

                switch(this.lastControl){
                    case "stop":
                    case "pause":
                        this[this.lastControl].call(this);
                        break;
                    default:
                        stateDelayTimer = delayStateDispatch(
                            this.playStateDelayTime, state);
                        break;
                }

            // ignore the buffering state after stop/pause
            }else if(state == 6){
                switch(this.lastControl){
                    case "stop":
                    case "pause":
                        return ;
                        break;
                }

            // check if man-made stop
            }else if(state == 1){
                if (this.humanStop) {
                    this.firePlayStateChange(this.getState(1));
                } else {
                    this.timer_0 = setTimeout(T.fn.bind(function() {
                        if (!this.unload) {
                            this.firePlayStateChange(this.getState(8));
                        }
                    }, this), 0);
                }
            // catch the 'ready' state after 'play' state
            }else if(state == 10 && this.getCurrentPosition() > 0){
                this.firePlayStateChange(this.getState(11));
            // the other states
            }else{
                //here is a bug,but has fixed! take a looooong time!
                if (state != 8) {
                    if (!this.timer_1) {
                        this.firePlayStateChange(this.getState(state));
                    }
                } else {
                    this.timer_1 = setTimeout(T.fn.bind(function() {
                        this.firePlayStateChange(this.getState(8));
                    }, this), 20);
                }
            }
        }, this));
    },

    /**
     * 这个函数有特殊用途，不允许污染函数体的代码
     * 如果你需要监听 wmp 状态变化，可以用 playerEngine.wmp.on("playstatechange", yourFunc)
     * 或者直接使用封装好的 setStateChangeCallBack 方法，可重复使用
     * @private
     */
    firePlayStateChange : function(stateName) {
        if(this.stateDispatchSwitch && this.state != stateName){
                var previouState = this.state;
                this.state = stateName;

               // this.stateStack.push(stateName);
               // var previouState = this.stateStack.shift();

                  this.lastState=previouState;
                if(stateName == "end"){
                    this.stateDispatchSwitch = false;
                    if (this.timer_0) {
                        window.clearTimeout(this.timer_0);
                    }
                    if (this.timer_1) {
                        window.clearTimeout(this.timer_1);
                    }
                }
          // playerEngine.fireEvent("playstatechange", [this.lastState = stateName, previouState, "wmp"]);

            this.dispatchEvent(this.EVENTS.STATECHANGE, {
                newState:stateName,
                oldState:previouState,
                engineType : 'wmp' });
        }
    },

    /**
     * 检查播放器是否安装或是否被禁用
     * 当播放器未安装或被禁用时调用callErrorListener，触发在错误监听器中注册的方法
     * @private
     */
    checkPlayer : function() {

        if (!this.audio.controls) {
            this.dispatchEvent(this.EVENTS.INITFAIL, { engineType : 'wmp' });
            return false;
        }
        this.dispatchEvent(this.EVENTS.INIT, { engineType : 'wmp' });
        return true;
    }
});