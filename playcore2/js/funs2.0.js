//这是一个调用新版PlayEngine的demo
//初始化
//播放内核
var player;
//播放逻辑
var listCtrl;
var logcount = 0;
var log_container = T.g('log_container'),
    log_content = T.g('log'),
    loaded = T.g('loaded'),
    curpositon = T.g('curpositon'),
    curpositon2 = T.g('curpositon2'),
    total = T.g('total'),
    total2 = T.g('total2'),
    status = T.g('status'),
    vol = T.g('vol'),
    volume = T.g('volume'),
    ismute = T.g('ismute');
//初始化播放内核
//包括 1. 指定播放内核种类及配置
//     2. 绑定各种事件
function initPlaycore() {
    player = new PlayEngine({
        el : T.g('container'),
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
        T.g('initok').value += '|' + e.engineType;
    });
    //初始化失败事件
    player.setEventListener(player.EVENTS.INITFAIL, function(e) {
        T.g('initfail').value += '|' + e.engineType;
    });
    //播放器状态改变
    player.setEventListener(player.EVENTS.STATECHANGE, function(e) {
        log("state change : previous state >> <b>" + e.oldState +
            "</b>;  new state >> <b>" + e.newState +"</b>" +
            "; engineType >> <b> " + e.engineType + "</b>");
        status.value = e.newState;
    });
    //监听进度加载事件
    player.setEventListener(player.EVENTS.PROGRESS, function(e) {
        loaded.value = e.progress * 100;
        total.value = e.totalTime;
        total2.value = mbox.convertTime(e.totalTime);
    });
    //播放位置改变事件
    player.setEventListener(player.EVENTS.POSITIONCHANGE, function(e) {
        curpositon.value = e.position;
        curpositon2.value = mbox.convertTime(e.position);
    });

    player.init();
}

function init() {
    initPlaycore();
    initRules();
    T.g('ready').className = "dis";
    status.value = "ready";
    T.g('runcode').disabled = false;
    T.g('runcode').value = "run code";
}

function initRules() {
    var prc = new PlayEngineRulesController({
        playEngine : player
    });
    var p100 = new PlayEngineRules.Play100ms({
        handler : function() {
            log('play100ms');
        }
//        ,time : 0.1
    });
    prc.addRule(p100);
}

function reset() {
    log("reset");
    player.reset();
}

function load() {
    var u = T.g('url').value;
    if (u == 'other') {
        u = T.g('otherurl').value;
    }
    log("setUrl('" + u + "')");
    player.setUrl(encodeURI(u));
}
function play(pos){
    var p = pos ? pos : '';
    log("play(" + p +")");
    player.play(pos);

}

function loadAndPlay() {
    reset();
    load();
    play();
}

function startwith(){
    play(T.g('startpos').value*1000);
}
function pause(){
    log("pasue()");
    player.pause();

}
function stop(){
    log("stop()");
    player.stop();

}
function mute(b){
    player.setMute(b);
    ismute.value = b ? "on" : "off";
    log("setMute("+b+")");
}
function setvol(){
    var v = vol.value;
    player.setVolume(v);
    volume.value = v;
    log("setVolume("+v+")");
}

function clslog(){
    T.g('log').innerHTML = "";
    logcount = 0;
}
function log(info){
    logcount++;
    var li = document.createElement('li');
    li.innerHTML = info.toString();
    log_content.appendChild(li);
    log_container.scrollTop = log_container.scrollHeight - log_container.offsetHeight;
}
function fcs(obj){
    obj.select();
}
function addCallback(id){
    var code = "player.setStateChangeCallBack(function(newState, prevState){"+T.g(id).value+"});";
    eval(code);
}

window.onload = function() {
    init();
//    load();
//    play();
};