/**
 * @fileoverview 播放内核 Adobe Flash Player 内核的封装(fmp_aac.swf只支持MP3的内核)
 * @authod qiaogang@baidu.com
 * @class PlayEngine_FMP_AAC
 * @requires PlayEngine_Interface.js
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */
var PlayEngine_FMP_AAC = mbox.lang.createClass(function(conf) {
    conf = conf || {};

    /**
     * 子内核支持的格式(文件扩展名)
     */
    this.supportMimeType = ['mp4', 'm4a'];

    this.engineType = 'fmp_aac';
    /**
     * 播放器 swf 地址
     * @property swfPath
     * @type String
     */
    this.swfPath = 'fmp_aac.swf';

    /**
     * flash 版本的最低要求
     */
    this.flashVersionRequire = conf.flashVersionRequire || '10.0.0';
}, {
    superClass : PlayEngine_FMP_MP3,
    className : 'PlayEngine_FMP_AAC'
});