/**
 * @fileoverview: 播放内核 策略模块
 * @author: qiaogang;huangzhongjian
 * @date: Sunday, March 25, 2012
 *
 */
/*
 * 以下规则监控播放器setUrl();play();后的状态改变
 */
var PlayEngineRules = PlayEngineRules || {};
/**
 * 1. 播放前缓冲超时（链接超时）
 * 链接时间超过[time]秒(默认10s)，未进入到缓冲或播放状态，触发。
 * 持续prebuffer状态
 */
PlayEngineRules.Prebuffer = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认10s
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 10;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "preBuffer",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.getTimer().reset();
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    var nSt = engineEvent['newState'];
                    var STATES = engineEvent.target.STATES;
                    if (nSt == STATES.PREBUFFER) {
                        ruleEvent.getTimer().start();
                    } else {
                        ruleEvent.getTimer().reset();
                    }
                }
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.Prebuffer'
    }).extend({
        getRule : function() {
            return this.rule;
        }
});

/**
 * 2. 缓冲超时
 * 缓冲时间超过10秒，未进入到播放状态，触发。
 * (第一次持续buffer状态)
 */
PlayEngineRules.FirstBuffer = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认10s
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 10;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "firstBuffer",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.getTimer().reset();
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    var nSt = engineEvent['newState'], oSt = engineEvent['oldState'];
                    var STATES = engineEvent.target.STATES;
                    if (nSt == STATES.BUFFERING) {
                        if (oSt == STATES.READY || oSt == STATES.PREBUFFER) {
                            ruleEvent.getTimer().start();
                        }
                    } else {
                        ruleEvent.getTimer().reset();
                    }
                }
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.FirstBuffer'
    }).extend({
        getRule : function() {
            return this.rule;
        }
});

/**
 * 3. 连续缓冲超时（播放后连续缓冲超时）
 * 进入播放状态后，连续缓冲（在play间出现的buffer时间）累计超过20秒，视为坏链。
 * 期间play状态小于100ms的记为buffer
 */
PlayEngineRules.Buffer = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认20s
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 20;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "buffer",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.startRecord = true;
                    ruleEvent.getTimer().reset();
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    var nSt = engineEvent['newState'], oSt = engineEvent['oldState'];
                    var STATES = engineEvent.target.STATES;
                    if (ruleEvent.startRecord) {
                        if (nSt == STATES.BUFFERING) {
                            if (oSt == STATES.PLAY) {
                                ruleEvent.getTimer().start();
                            }
                        } else if (nSt == STATES.PLAY || nSt == STATES.PAUSE) {
                            if (oSt == STATES.BUFFERING) {
                                ruleEvent.getTimer().pause();
                            }
                        } else if (nSt == STATES.END || nSt == STATES.READY) {
                            ruleEvent.getTimer().reset();
                            ruleEvent.startRecord = false;
                        }
                    }
                }
            },
            handler : function(event) {
                event.target.startRecord = false;
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.Buffer'
    }).extend({
        getRule : function() {
            return this.rule;
        }
});

/**
 * 4. 播放后进入异常状态
 * 播放后进入ready，并且持续该状态超过1秒，视为坏链。
 */
PlayEngineRules.Exception = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认20s
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 1;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "exception",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.startRecord = true;
                    ruleEvent.getTimer().reset();
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    var nSt = engineEvent['newState'], oSt = engineEvent['oldState'];
                    var STATES = engineEvent.target.STATES;
                    if (ruleEvent.startRecord) {
                        if (nSt == STATES.READY || nSt == STATES.ERROR) {
                            if (oSt == STATES.PLAY || oSt == STATES.PREBUFFER) {
                                ruleEvent.getTimer().start();
                            }
                        } else {
                            ruleEvent.getTimer().reset();
                        }
                    }
                }
            },
            handler : function(event) {
                event.target.startRecord = false;
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.Exception'
    }).extend({
        getRule : function() {
            return this.rule;
        }
});

/**
 * 5. 连续播放
 * 进入播放状态后，持续时间超过60秒的，视为优质链接，保存链接。
 * 持续时间指非人为操作，人为操作后（比如暂停后再播放），记录时间重置。
 */
PlayEngineRules.Play60s = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认20s
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 60;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "savelink",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.startRecord = true;
                    ruleEvent.getTimer().reset();
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    var nSt = engineEvent['newState'], oSt = engineEvent['oldState'];
                    var STATES = engineEvent.target.STATES;
                    if (ruleEvent.startRecord) {
                        if (nSt == STATES.PLAY) {
                            ruleEvent.getTimer().start();
                        } else if (nSt == STATES.PAUSE || nSt == STATES.BUFFERING) {
                            if (oSt == STATES.PLAY) {
                                ruleEvent.getTimer().pause();
                            }
                        } else {
                            ruleEvent.getTimer().reset();
                        }
                    }
                }
            },
            handler : function(event) {
                event.target.startRecord = false;
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.Play60s'
    }).extend({
        getRule : function() {
            return this.rule;
        }
});

/**
 * 6.出现播放状态且持续100ms后(保证更准确)
 *
 */
PlayEngineRules.Play100ms = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认100ms
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 0.1;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "play100ms",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    log('reset rule!');
                    ruleEvent.startRecord = true;
                    ruleEvent.getTimer().reset();
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    var nSt = engineEvent['newState'], oSt = engineEvent['oldState'];
                    var STATES = engineEvent.target.STATES;
                    if (nSt != STATES.END) {
                        if (ruleEvent.startRecord) {
                            if (nSt == STATES.PLAY) {
                                log('timer start!');
                                ruleEvent.getTimer().start();
                            } else {
                                log('timer reset!');
                                ruleEvent.getTimer().reset();
                            }
                        }
                    }
                }
            },
            handler : function(event) {
                log('handler!');
                event.target.startRecord = false;
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.Play100ms'
    }).extend({
        getRule : function() {
            return this.rule;
        }
});

/**
 * 6.无播放连接1000ms后
 *
 */
PlayEngineRules.NoLink = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认100ms
     * @options {Function} handler 超时后的回调
     */
        function(conf) {
        conf = conf || {};
        conf.time = conf.time || 1;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "nolink",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.startRecord = true;
                    ruleEvent.getTimer().reset();
                    var url = engineEvent.arguments[0];
                    if (url == '' || url == null) {
                        ruleEvent.getTimer().start();
                    }
                },

                playStateChange : function(ruleEvent, engineEvent) {

                }
            },
            handler : function(event) {
                event.target.startRecord = false;
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.NoLink'
    }).extend({
        getRule : function() {
            return this.rule;
        }
    });

/**
 * 7.加载资源无响应5s超时(setUrl后为进入任何状态)
 *
 */
PlayEngineRules.LoadException = mbox.lang.createClass(
    /**
     * 构造函数
     * @param {Object} conf
     * @options {Number} [time] 超时时间，默认10s
     * @options {Function} handler 超时后的回调
     */
    function(conf) {
        conf = conf || {};
        conf.time = conf.time || 10;
        conf.handler = conf.handler || function(){};
        this.rule = new PlayEngineRuleModel({
            name        : "loadexception",
            delayTime   : conf.time * 1000,
            listener    : {
                setUrl : function(ruleEvent, engineEvent) {
                    ruleEvent.startRecord = true;
                    ruleEvent.getTimer().reset();
                    var url = engineEvent.arguments[0];
                    if (url != '' || url != null) {
                        ruleEvent.getTimer().start();
                    }
                },

                playStateChange : function(ruleEvent, engineEvent) {
                    if (ruleEvent.startRecord) {
                        ruleEvent.getTimer().reset();
                    }
                }
            },
            handler : function(event) {
                event.target.startRecord = false;
            }
        });
        this.rule.addHandler(conf.handler);
    }, {
        className : 'PlayEngineRules.LoadException'
    }).extend({
        getRule : function() {
            return this.rule;
        }
    });