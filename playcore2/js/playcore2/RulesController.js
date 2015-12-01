/**
 * @fileoverview: 播放内核 策略控制器
 * 通过监听播放内核(playEngine)的状态, 触发对应的策略(RuleModel)
 *
 * @author: qiaogang huangzhongjian
 * @date: Sunday, March 25, 2012
 *
 */
var PlayEngineRulesController = mbox.lang.createClass(
    function(conf) {
        conf = conf || {};
        this.playEngine = conf.playEngine;
        this.rules = [];
        //阻止ruleModel监听标识，用于中断所有ruleModel的监听
        this.isBlock = false;
    }, {
        className : 'PlayEngineRulesController'
    }).extend({
    /**
     * 添加规则 实例
     * @method addRule
     * @param {PlayEngineRuleModel} ruleModel
     */
    addRule : function(ruleModel) {
        var rule = ruleModel.getRule();

        rule.setPlayEngine(this.playEngine);
        this.rules.push(rule);

        var listener = rule.getListener();

        T.object.each(listener, T.fn.bind(function(callback, eventName) {
            var _listener = T.fn.bind(function() {
                if (!this.isBlock) {
                    callback.apply(rule, arguments);
                }
            }, this, rule);
            switch (eventName.toLowerCase()) {
                case 'playstatechange' :
                    eventName = this.playEngine.EVENTS.STATECHANGE;
                    break;
            }

            this.playEngine.setEventListener(eventName, _listener);
        }, this));
    },

    /**
     * 获得已加载规则模型的数量
     * @method getRulesCount
     */
    getRulesCount : function() {
        return this.rules.length;
    },

    /**
     * 返回已添加的规则数组
     * @method getRules
     * @return {Array}
     */
    getRules : function() {
        return this.rules;
    },

    /**
     * 根据规则唯一标识重置定时器
     * @method reset
     * @param {String} name 规则唯一标识。若为空，则重置所有已添加规则的定时器
     */
    reset : function(name) {
        if (name) {
            for (var i = 0, len = this.rules.length; i < len; i++) {
                if (this.rules[i].getName() == name) {
                    this.rules[i].getTimer().reset();
                }
            }
        } else {
            for (var i = 0, len = this.rules.length; i < len; i++) {
                this.rules[i].getTimer().reset();
            }
        }
    },
    /**
     * 阻断状态监听器的监听(即，阻断通过on的方式对某一方法的监听，不去调用通过on注册的方法)
     * @method blockListen
     */
    blockListen : function() {
        this.isBlock = true;
    },

    /**
     * 恢复状态监听器的监听
     * @method resetListen
     */
    resetListen : function() {
        this.isBlock = false;
    },

    /**
     * 获得阻断状态
     * @method getBlockState
     */
    getBlockState : function() {
        return this.isBlock;
    }
});