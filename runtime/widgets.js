cm.define('layersTreeWidget', ['layersTreeWidgetContainer', 'layersTree', 'resetter', 'config', 'map'], function(cm) {
    var layersTreeWidgetContainer = cm.get('layersTreeWidgetContainer');
    var layersTree = cm.get('layersTree');
    var resetter = cm.get('resetter');
    var config = cm.get('config');
    var map = cm.get('map');

    if (!layersTreeWidgetContainer || !layersTree) {
        return null;
    }

    var layersTreeWidget = new nsGmx.LayersTreeWidget(L.extend({
        isMobile: nsGmx.Utils.isMobile()
    }, config.app.layersTreeWidget, {
        layersTree: layersTree
    }));

    layersTreeWidget.on('centerLayer', function(model) {
        map.fitBounds(model.getLatLngBounds());
    });

    resetter.on('reset', function() {
        layersTreeWidget.reset();
    });

    layersTreeWidgetContainer.addView(layersTreeWidget);

    return layersTreeWidget;
});

cm.define('bookmarksWidget', ['bookmarksWidgetContainer', 'permalinkManager', 'rawTree'], function(cm) {
    var bookmarksWidgetContainer = cm.get('bookmarksWidgetContainer');
    var permalinkManager = cm.get('permalinkManager');
    var rawTree = cm.get('rawTree');

    if (!permalinkManager || !bookmarksWidgetContainer) {
        return null;
    }

    if (!rawTree) {
        return false;
    }

    var bookmarksWidget = new nsGmx.BookmarksWidget({
        collection: new Backbone.Collection(JSON.parse(rawTree.properties.UserData && rawTree.properties.UserData).tabs)
    });

    bookmarksWidget.on('selected', function(model) {
        permalinkManager.loadFromData(model.get('state'));
    });

    bookmarksWidgetContainer.addView(bookmarksWidget);

    return bookmarksWidget;
});

cm.define('storytellingWidget', ['permalinkManager', 'rawTree', 'config', 'map'], function(cm) {
    var permalinkManager = cm.get('permalinkManager');
    var rawTree = cm.get('rawTree');
    var config = cm.get('config');
    var map = cm.get('map');

    if (config.app.storytellingWidget) {
        var StorytellingControlClass = config.app.storytellingWidget.type === 'accordeon' ?
            nsGmx.StorytellingAccordeonControl :
            nsGmx.StorytellingControl;

        var storytellingControl = new StorytellingControlClass(L.extend({}, config.app.storytellingWidget, {
            bookmarks: rawTree.properties.UserData && JSON.parse(rawTree.properties.UserData).tabs
        }));

        storytellingControl.on('storyChanged', function(story) {
            permalinkManager && permalinkManager.loadFromData(story.state)
        });

        map.addControl(storytellingControl);

        return storytellingControl;
    } else {
        return null;
    }
});

cm.define('calendarWidget', ['calendarWidgetContainer', 'calendar', 'resetter', 'config'], function(cm) {
    var calendarWidgetContainer = cm.get('calendarWidgetContainer');
    var calendar = cm.get('calendar');
    var resetter = cm.get('resetter');
    var config = cm.get('config');

    if (!calendarWidgetContainer) {
        return null;
    }

    var calendarClass = config.app.calendarWidget.type === 'fire' ?
        nsGmx.FireCalendarWidget :
        nsGmx.CalendarWidget;

    if (!calendarClass) {
        return false;
    }

    var calendarWidget = new calendarClass(L.extend({
        dateInterval: calendar,
        dateFormat: 'dd-mm-yy',
        dateMax: new Date()
    }, config.app.calendarWidget));

    resetter.on('reset', function() {
        calendarWidget.reset();
    });

    calendarWidgetContainer.addView(calendarWidget);

    return calendarWidget;
});
