/**
 * @fileoverview 播放器超类
 * @authod qiaogang@baidu.com
 * @class PlayEngine_Interface
 * @requires tangram-1.5.0.js
 * @requires common.js
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */

/**
 * @class PlayEngine_Interface播放核心的接口类, fmp
 *
 */
var PlayEngine_Interface = mbox.lang.createClass((function(window, undefined) {
    var guid = 0;

    var defConf = {
        mute    : false,
        volume  : 50
    };

    var fn = function(conf) {
        /**
         * 标准状态
         *
         */
        this.STATES = {
            INIT       : 'init',        //-2 还未初始化(dom未加载)
            READY      : 'ready',       //-1 初始化成功(dom已加载,且可以播放)
            STOP       : 'stop',        //0
            PLAY       : 'play',        //1
            PAUSE      : 'pause',       //2
            END        : 'end',         //3
            BUFFERING  : 'buffering',   //4
            PREBUFFER  : 'pre-buffer',  //5
            ERROR      : 'error'        //6
        };

        /**
         * 标准事件
         *
         */
        this.EVENTS = {
            STATECHANGE     : 'player_playStateChange',
            POSITIONCHANGE  : 'player_positionChange',
            PROGRESS        : 'player_progress',
            ERROR           : 'player_error',
            INIT            : 'player_initSuccess',    //dom加载成功，已进入ready状态
            INITFAIL        : 'player_initFail'        //dom加载失败，版本不支持或加载异常
        };

        conf = conf || {};
        this.mute = typeof conf.mute == 'undefined' ? defConf.mute : !!conf.mute;
        this.volume = typeof conf.volume == 'undefined' ? defConf.volume : conf.volume;
        this.ready = false;
        this.url = '';
        this.state = this.STATES.INIT;
        this.engineType = '';
        this.stateStack = [this.STATES.INIT];
        this.supportMimeType = [];
    };

    fn.prototype = {
        /**
         * 创建新的guid
         *
         * @return {String}
         */
        newId : function() {
            return "_m3_" + guid++;
        },

        /**
         * 初始化播放器
         * 进行加载dom
         */
        init : function() {

        },

        /**
         * 重置播放器
         * 除音量和静音状态外的其他状态，都要进行重置
         */
        reset : function() {

        },

        /**
         * 开始加载资源
         *
         * @param {String}
         */
        setUrl : function(url) {

        },

        /**
         * 获取当前的资源地址
         *
         * @return {String}
         */
        getUrl : function() {
            return this.url;
        },

        /**
         * 开始播放/继续播放
         *
         */
        play : function() {

        },

        /**
         * 暂停播放
         * 播放位置不清零，资源继续下载
         */
        pause : function() {

        },

        /**
         * 停止当前播放的资源
         * 播放位置清零 ，中断下载
         */
        stop : function() {

        },

        /**
         * 设置静音状态
         *
         * @param {Boolean}
         */
        setMute : function(mute) {

        },

        /**
         * 获取静音状态
         *
         * @return {Boolean}
         */
        getMute : function() {
            return this.mute;
        },

        /**
         * 设置音量
         *
         * @param {Number} 取值范围 0-100
         */
        setVolume : function(vol) {

        },

        /**
         * 获取音量
         *
         * @return {Number} 取值范围 0-100
         */
        getVolume : function() {
            return this.volume;
        },

        /**
         * 获取当前播放状态
         *
         * @return {String} 播放状态
         */
        getState : function() {
            return '';
        },

        /**
         * 设置当前播放进度
         *
         * @param {Number} pos 当前播放进度。单位:毫秒
         */
        setCurrentPosition : function(pos) {

        },

        getCurrentPosition : function() {
            return 0;
        },

        /**
         * 获取当前加载进度百分比
         *
         * @return {Number} 取值范围 0-1
         */
        getLoadedPercent : function() {
            return 0;
        },

        /**
         * 获取已加载的字节数
         *
         * @return {Number} 已加载的字节数。单位: bytes
         */
        getLoadedBytes : function() {
            return 0;
        },

        /**
         * 获取资源总字节数
         *
         * @return {Number} 总字节数。单位: bytes
         */
        getTotalBytes : function() {
            return 0;
        },

        /**
         * 获取歌曲总时长
         *
         * @return {Number} 单位: 毫秒
         */
        getTotalTime : function() {
            return 0;
        },

        /**
         * 获取当前播放内核版本号
         *
         * @return {String}
         */
        getVersion : function() {
            return '';
        },

        /**
         * 获取当前内核的类型
         *
         * @return {String} 当前内核类型
         */
        getEngineType : function() {
            return this.engineType;
        },

        /**
         * 判断制定的mimeType是否可以播放
         *
         * @param {String} mimeType
         * @return {Boolean}
         */
        canPlayType : function(mimeType) {
            var list = this.getSupportMimeTypeList();
            return T.array.some(list, function(item, index) {
                return mimeType == item;
            });
        },

        /**
         * 获取当前内核支持的格式
         *
         * @return {Array(String)} 支持的格式
         */
        getSupportMimeTypeList : function() {
            return this.supportMimeType;
        },

        /**
         * 添加事件
         *
         * @param {String} eventName 事件名称，目前支持的事件有:
         *      'playStateChange'   播放状态改变时
         *      'positionChange'    播放位置改变时
         *      'progress'          数据加载时
         *      'complete'          数据加载完成
         *      'error'             播放错误时
         *      'initSuccess'       内核加载成功时
         *      'initFail'          内核加载失败时(浏览器不支持等)
         * @param {Function} listener 返回自定义的Event，其中target为触发的子内核实力
         */
        setEventListener : function(eventName, listener) {
            var _listener = T.fn.bind(function() {
                return listener.apply(this, arguments);
            }, this);

            this.addEventListener(eventName, _listener);
        }
    };

    return fn;
})(window), {superClass : T.lang.Class, className : 'PlayEngine_Interface'});