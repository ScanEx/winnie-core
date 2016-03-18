module.exports = function (cm) {
    cm.define('baseLayersControl', ['baseLayersManager', 'config', 'i18n', 'map'], function(cm, cb) {
        var GmxIconLayers = require('gmx-common-components/GmxIconLayers');
        var baseLayersManager = cm.get('baseLayersManager');
        var config = cm.get('config');
        var i18n = cm.get('i18n');
        var map = cm.get('map');

        if (config.app.baseLayersControl && GmxIconLayers) {
            var ctrl = new GmxIconLayers(baseLayersManager, L.extend(config.app.baseLayersControl, {
                language: i18n.getLanguage()
            }));
            map.addControl(ctrl);
            return ctrl;
        } else {
            return null;
        }
    });
};
