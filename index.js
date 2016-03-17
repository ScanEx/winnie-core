var ComponentsManager = require('gmx-common-components/ComponentsManager/componentsManager.js').ComponentsManager;

function createApplication(container, config) {
    var cm = new ComponentsManager();

    require('./src/core.js')(cm, container, config);
    require('./src/map.js')(cm);
    require('./src/layers.js')(cm);
    require('./src/controls.js')(cm);
    require('./src/commonWidgets.js')(cm);
    require('./src/mobileWidgets.js')(cm);
    require('./src/desktopWidgets.js')(cm);

    return cm;
}

window.nsGmx = window.nsGmx || {};
window.nsGmx.createGmxApplication = createApplication;
module.exports = createApplication;
