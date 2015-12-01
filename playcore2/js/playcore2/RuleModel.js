/**
 * @fileoverview: 内核 策略模型
 * @author: qiaogang
 * @date: Sunday, March 25, 2012
 *
 */
var PlayEngineRuleModel = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} delayTime 毫秒 定时器生效时间(比如:超时N秒，缓冲N秒的时间)
     * @options {Object} listener
     * @options {String} [name] 策略标识
     */
    function (conf) {
        conf = conf || {};
        this.name = conf.name || '';
        this.delayTime = conf.delayTime;
        this.timer = null;
        this.playEngine = conf.playEngine || null;
        this.listener = conf.listener || {};
        this.handler = conf.handler || function(){};
        this.EVENTS = {
            TIMER : 'timer'
        };
        this.init();
    }, {
        className : 'PlayEngineRuleModel'
    }).extend({
        init : function () {
            if (!this.timer && this.delayTime != null) {
                this.timer = new mbox.Timer(this.delayTime, 1);
                this.addHandler(this.handler);
                this.timer.addEventListener(this.timer.EVENTS.TIMER,
                    T.fn.bind( function(delay, repeatCount) {
                        this.dispatchEvent(this.EVENTS.TIMER, {
                            timer       : this.timer,
                            playEngine  : this.playEngine
                        });
                    }, this)
                );
            }
        },

        setPlayEngine : function(player) {
            this.playEngine = player;
        },

        /**
         * 获得规则名
         */
        getName : function () {
            return this.name;
        },

        /**
         * 获得状态监听器
         * @return {Function} listener
         */
        getListener : function () {
            return this.listener;
        },
        
        getTimer : function() {
            return this.timer;
        },

        /**
         * 设置策略触发后的处理器
         * @param {Function} handler
         */
        addHandler : function (handler) {
            this.addEventListener(this.EVENTS.TIMER, T.fn.bind(function() {
                handler.apply(this, arguments);
            }, this));
        }
    }
);
