/**
 * @fileoverview
 * @author qiaogang@baidu.com
 * @date 13-2-21 下午5:32
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
$(function() {
    var $progress = $('#progress'),
        $position = $('#position'),
        $songIds = $('#songids');

    var player = new PlayEngine({
        subEngines : [
//            {
//                constructorName : 'PlayEngine_Audio',
//                args :{}
//            },
            {
                constructorName : 'PlayEngine_FMP_MP3', //子内核构造函数名
                args : {
                    swfPath : 'flash/fmp.swf',
                    instanceName : 'player'             //当前实例名
                }
            },
            {
                constructorName : 'PlayEngine_FMP_AAC', //子内核构造函数名
                args : {
                    swfPath : 'flash/fmp_aac.swf',
                    instanceName : 'player'             //当前实例名
                }
            }
        ]
    });
    //注意：监听初始化事件，需要在init之前注册
    //初始化成功事件
    player.setEventListener(player.EVENTS.INIT, function(e) {
        log('init success : ' + e.engineType);
    });
    //初始化失败事件
    player.setEventListener(player.EVENTS.INITFAIL, function(e) {
        log('init success : ' + e.engineType);
    });
    //播放器状态改变
    player.setEventListener(player.EVENTS.STATECHANGE, function(e) {
        log("state change : previous state >> <b>" + e.oldState +
            "</b>;  new state >> <b>" + e.newState +"</b>" +
            "; engineType >> <b> " + e.engineType + "</b>");
        if (e.newState == 'end') {
            startPlay();
        }
    });
    //监听进度加载事件
    player.setEventListener(player.EVENTS.PROGRESS, function(e) {
        $progress.val(e.progress * 100);
    });
    //播放位置改变事件
    player.setEventListener(player.EVENTS.POSITIONCHANGE, function(e) {
        $position.val(e.position);
    });

    window.player = player;

    player.init();

    //init rules
    var prc = new PlayEngineRulesController({
        playEngine : player
    });
    var p100 = new PlayEngineRules.Play100ms({
        handler : function() {
            log('play100ms');
        }
//        ,time : 0.01
    });
    prc.addRule(p100);

    //init button
    $('#start').on('click', function() {
        startPlay();
    });

    var startPlay = function() {
        var url = $songIds.val();
        log('setUrl : ' + url);
        player.setUrl(url);
        log('start play');
        player.play();
    };
});