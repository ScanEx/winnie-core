module.exports = function(cm) {
    // DateInterval model
    cm.define('calendar', ['permalinkManager', 'config'], function(cm) {
        var DateInterval = require('gmx-common-components/DateInterval');
        var permalinkManager = cm.get('permalinkManager');
        var config = cm.get('config');

        var cal = new DateInterval();

        // TODO: add fire calendar logic
        // if (config.app.calendarWidget && config.app.calendarWidget.type === 'fire' && nsGmx.FireCalendarWidget) {
        //     cal.set(nsGmx.FireCalendarWidget.defaultFireDateInterval());
        // }

        permalinkManager && permalinkManager.setIdentity('calendar', cal);

        return cal;
    });

    // LayersTreeNode model
    cm.define('layersTree', ['rawTree', 'permalinkManager'], function(cm) {
        var LayersTreeNode = require('gmx-common-components/LayersTree');
        var rawTree = cm.get('rawTree');
        var permalinkManager = cm.get('permalinkManager');

        var layersTree = new LayersTreeNode({
            content: rawTree
        });

        permalinkManager && permalinkManager.setIdentity('layersTree', layersTree);

        return layersTree;
    });


    cm.define('layersMapper', ['config', 'map', 'layersHash', 'layersTree'], function(cm) {
        var LayersMapper = require('./LayersMapper.js');
        var config = cm.get('config');

        if (config.app.layersMapper) {
            return new LayersMapper({
                map: cm.get('map'),
                layersHash: cm.get('layersHash'),
                layersTree: cm.get('layersTree')
            })
        } else {
            return null;
        }
    });

    cm.define('dateMapper', ['layersHash', 'calendar'], function(cm) {
        var layersHash = cm.get('layersHash');
        var calendar = cm.get('calendar');

        calendar.on('change', mapDate);
        mapDate();

        return null;

        function mapDate() {
            for (layer in layersHash) {
                if (layersHash.hasOwnProperty(layer)) {
                    layersHash[layer].setDateInterval && layersHash[layer].setDateInterval(calendar.get('dateBegin'), calendar.get(
                        'dateEnd'));
                }
            }
        }
    });
};
