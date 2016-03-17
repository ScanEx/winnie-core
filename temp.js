lt.eachNode(function(n) {
    var l = lh[n.get('id')];
    if (map.hasLayer(l)) {
        console.log(n.get('properties').title, l.getDateInterval())
    }
})
