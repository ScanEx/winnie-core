cm.define('baseLayersControl', ['baseLayersManager', 'config', 'i18n', 'map'], function(cm, cb) {
    var baseLayersManager = cm.get('baseLayersManager');
    var config = cm.get('config');
    var i18n = cm.get('i18n');
    var map = cm.get('map');

    if (config.app.baseLayersControl && L.Control.GmxIconLayers) {
        var ctrl = new L.Control.GmxIconLayers(baseLayersManager, L.extend({}, config.app.baseLayersControl, {
            language: i18n.getLanguage()
        }));
        map.addControl(ctrl);
        return ctrl;
    } else {
        return null;
    }
});

cm.define('logoControl', ['map', 'config', 'i18n'], function(cm) {
    var opts = cm.get('config').app.copyrightControl;
    if (!window.L.control.gmxLogo) {
        return false;
    }
    var ctrl = L.control.gmxLogo(
        (typeof opts === 'object') ? opts : {}
    );
    cm.get('map').addControl(ctrl);
    return ctrl;
});

cm.define('hideControl', ['map', 'config', 'i18n'], function(cm) {
    var opts = cm.get('config').app.hideControl;
    if (!window.L.control.gmxHide) {
        return false;
    }
    if (opts) {
        var ctrl = L.control.gmxHide(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    } else {
        return null;
    }
});

cm.define('zoomControl', ['map', 'config', 'i18n'], function(cm) {
    var config = cm.get('config');
    var map = cm.get('map');

    if (!window.L.control.gmxZoom) {
        return false;
    }

    var opts = config.app.zoomControl;

    if (!opts) {
        return null;
    }

    var ctrl = createCtrl();
    map.addControl(ctrl);
    return ctrl;

    function createCtrl() {
        if ((opts && opts === 'leaflet') || (opts && opts.type === 'leaflet')) {
            return L.control.zoom((typeof opts === 'object') ? opts : {});
        } else {
            return L.control.gmxZoom((typeof opts === 'object') ? opts : {});
        }
    }
});

cm.define('centerControl', ['map', 'config', 'i18n'], function(cm) {
    var opts = cm.get('config').app.centerControl;
    if (!window.L.control.gmxCenter) {
        return false;
    }
    if (opts) {
        var ctrl = L.control.gmxCenter(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    } else {
        return null;
    }
});

cm.define('bottomControl', ['map', 'config', 'i18n'], function(cm) {
    var opts = cm.get('config').app.bottomControl;
    if (!window.L.control.gmxBottom) {
        return false;
    }

    $(container).addClass('gmxApplication_withBottomControls');

    if (opts) {
        var ctrl = L.control.gmxBottom(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    } else {
        return null;
    }
});

cm.define('locationControl', ['map', 'config', 'i18n'], function(cm) {
    var opts = cm.get('config').app.locationControl;
    if (!window.L.control.gmxLocation) {
        return false;
    }
    if (opts) {
        var ctrl = L.control.gmxLocation(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    } else {
        return null;
    }
});

cm.define('copyrightControl', ['map', 'config', 'i18n'], function(cm) {
    var config = cm.get('config');
    var map = cm.get('map');

    if (!window.L.control.gmxCopyright) {
        return false;
    }

    var opts = config.app.copyrightControl;

    if (!opts) {
        return null;
    }

    var ctrl = createCtrl();
    map.addControl(ctrl);
    return ctrl;

    function createCtrl() {
        if ((opts && opts === 'leaflet') || (opts && opts.type === 'leaflet')) {
            return L.control.attribution((typeof opts === 'object') ? opts : {});
        } else {
            return L.control.gmxCopyright((typeof opts === 'object') ? opts : {});
        }
    }
});

cm.define('loaderStatusControl', ['map', 'config', 'i18n'], function(cm) {
    var opts = cm.get('config').app.loaderStatusControl;
    if (!window.L.control.gmxLoaderStatus) {
        return false;
    }
    if (opts) {
        var ctrl = L.control.gmxLoaderStatus(
            (typeof opts === 'object') ? opts : {}
        );
        cm.get('map').addControl(ctrl);
        return ctrl;
    } else {
        return null;
    }
});
