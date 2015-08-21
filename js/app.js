

var _data;
var mymap
var dateFormat = d3.time.format('%d/%m/%Y')
var withHours = d3.format("04d");
var timeFormat = d3.time.format('%H%M')
var display_dateFormat = d3.time.format('%Y-%m-%d')
var NZTMprojection = "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +y_0=10000000 +x_0=1600000 +ellps=GRS80 +datum=NZGD2000 +units=m +no_defs";
//var NZTMprojection = "+proj=tmerc +lat_0=0.0 +lon_0=173.0 +k=0.9996 +x_0=1600000.0 +y_0=10000000.0 +datum=WGS84 +units=m";

var fatalIcon = L.AwesomeMarkers.icon({
    prefix: 'fa', //font awesome rather than bootstrap
    markerColor: 'darkred', // see colors above
    icon: 'exclamation-triangle' //http://fortawesome.github.io/Font-Awesome/icons/
});

var seriousIcon = L.AwesomeMarkers.icon({
    prefix: 'fa', //font awesome rather than bootstrap
    markerColor: 'red', // see colors above
    icon: 'exclamation-triangle' //http://fortawesome.github.io/Font-Awesome/icons/
});

var minorIcon = L.AwesomeMarkers.icon({
    prefix: 'fa', //font awesome rather than bootstrap
    markerColor: 'orange', // see colors above
    icon: 'exclamation-triangle' //http://fortawesome.github.io/Font-Awesome/icons/
});

var noneIcon = L.AwesomeMarkers.icon({
    prefix: 'fa', //font awesome rather than bootstrap
    markerColor: 'cadetblue', // see colors above
    icon: 'exclamation-triangle' //http://fortawesome.github.io/Font-Awesome/icons/
});

function dim_zero_rows(chart) {
  chart.selectAll('text.row').classed('hidden',function(d){return (d.value < 0.1)});
}

var date_domain = {
}

filter_dim = {}

// this is all map stuff. our dataset has northing and easting, so we might want to bring this back in eventually, but I think we might want to avoid identifying individual crashes in the long run.


var map;
var markers = [];

maxMarkers = 80;

//-----------location by severity accessors-------------------------------------------------------
  
function loc_init() {
    return {'Fatal'     : 0,
            'Serious'   : 0,
            'Minor'     : 0,
            'No injury' : 0,
            'count'     : 0,
            'severity'  : ''
            }
  }
  
  function loc_add(p,v) {
    p[v.severity] = (p[v.severity] || 0)+1
    p["count"] = (p["count"] || 0)+1
      if      (p["Fatal"] > 0)   {p.severity = 'Fatal'} 
      else if (p["Serious"] > 0) {p.severity = 'Serious'}
      else if (p["Minor"] > 0)   {p.severity = 'Minor'}
      else if (p["No injury"] > 0)   {p.severity = "No injury"}
      else {p.severity = ''}
    return p;
  }
  
  function loc_sub(p,v) {
    p[v.severity] -= 1
    p['count'] -=1
      if      (p["Fatal"] > 0)   {p.severity = 'Fatal'} 
      else if (p["Serious"]>0)   {p.severity = 'Serious'}
      else if (p["Minor"] > 0)   {p.severity = 'Minor'}
      else if (p["No injury"] > 0)   {p.severity = "No injury"}
      else {p.severity = ''}
    return p;
  }

//------------------------------------------------------MARKERS-MARKERS-MARKERS-------------------------------------------------------
var updateMarkers = _.debounce(filterUpdateMarkers, 200)

var dontRepaintAfterMove = false;

function filterUpdateMarkers() {
//  crash_locs_all = crash_locs_group.all();
//  count = 0;
//  filtered_locations = [];
//  new_markers = [];
//  bad_location = "-90 173";
//  
//  for (i in crash_locs_all){
//      if (crash_locs_all[i].value.count > 0 && crash_locs_all[i].key != bad_location){
//        filtered_locations.push({location:crash_locs_all[i].key.split(' '), severity:crash_locs_all[i].value.severity}); //array of markers
//      }
//  }
//
//  newmarkers = get_most_severe_markers();  
//  markers_bounds = createMarkers(new_markers)
//  dontRepaintAfterMove = true;
//  map.fitBounds(markers_bounds, {maxZoom:8, padding:[30,30]})
}
//------------------------------------------------------------------------------------------------------------------------------------

severity_icons = {
  Fatal:fatalIcon,
  Serious:seriousIcon,
  Minor:minorIcon,
  "No injury":noneIcon
}
    
markerLayer = L.layerGroup([])
    
function createMarkers(new_markers) {
  _.each(markers, function (marker) {map.removeLayer(marker)}) // remove all old markers
  markers = _.map(new_markers, function (marker) {return L.marker(marker.location, {icon:severity_icons[marker.severity]})})  //generate new markers
  _.each(markers, function(marker) {marker.addTo(map)} )  // add new markers to map
  return L.featureGroup(markers).getBounds(); // returns the bounds of all of the markers
}


function get_n_locations(locations, n){
  // actually gets about n locations. Somewhere between n and 2n. Really doesn't matter as we're aiming for an amount best described as "not too many".
  new_locations = [];
  nLoc = locations.length; 
  if (nLoc > n) {    
    step = Math.floor(nLoc/n);
      if (step > 1){
        for (i = 0; i < nLoc; i=i+step){new_locations.push(locations[i]);}
      } else {new_locations = locations;}
  }else {new_locations = locations;}
return new_locations;
}

function get_most_severe_markers(){
  fatal_locations = _.filter(filtered_locations, function(d){return d.severity == 'Fatal'});
    n_fatal_locations = fatal_locations.length;
      if (n_fatal_locations >= maxMarkers) // we have more fatals than we want to plot.
            {new_markers = get_n_locations(fatal_locations, maxMarkers)}
      else {new_markers = fatal_locations; // take all the fatals
            serious_locations = _.filter(filtered_locations, function(d){return d.severity == 'Serious'}); // add in some serious locations
            n_serious_locations = serious_locations.length;
              if (n_serious_locations > maxMarkers-n_fatal_locations) {
                 new_markers = new_markers.concat(get_n_locations(serious_locations,maxMarkers-n_fatal_locations));
              }
              else {new_markers = new_markers.concat(serious_locations);
                  minor_locations = _.filter(filtered_locations, function(d){return d.severity == 'Minor'}); // add in some minor locations
                  n_minor_locations = minor_locations.length; 
                  n_new_markers = new_markers.length;                
                    if (n_minor_locations > maxMarkers-n_new_markers) {
                      new_markers = new_markers.concat(get_n_locations(minor_locations,maxMarkers-n_new_markers));
                    }
                    else {new_markers = new_markers.concat(minor_locations);
                          noInj_locations = _.filter(filtered_locations, function(d){return d.severity == 'No injury'}); // add in some no injury locations
                          n_noInj_locations = noInj_locations.length;
                          n_new_markers = new_markers.length;                
                            if (n_noInj_locations > maxMarkers-n_new_markers) {
                                new_markers = new_markers.concat(get_n_locations(noInj_locations,maxMarkers-n_new_markers));
                            }
                            else {new_markers = new_markers.concat(noInj_locations);} // there are no more crashes to be had. Um. Yay!
                    }
                }
           }
  return new_markers;
}

function zoomUpdateMarkers(event) {
  if (dontRepaintAfterMove) {
    dontRepaintAfterMove = false;
    return;
  }
  crash_locs_all = crash_locs_group.all();
  count = 0;
  filtered_locations = [];
  new_markers = [];
  bad_location = "-90 173";
  bounds = map.getBounds();
 
  // get markers in the new bounding box
  for (i in crash_locs_all){
      if (crash_locs_all[i].value.count > 0){
        this_loc = {location:crash_locs_all[i].key.split(' '), severity:crash_locs_all[i].value.severity};
          if(bounds.contains([+this_loc.location[0],+this_loc.location[1]])) {
            filtered_locations.push(this_loc); //array of markers
          }
      }
  }

  new_markers = get_most_severe_markers();
  console.log('new_markers ',new_markers.length)

  createMarkers(new_markers)

}


//-----------------------------------------------------------------------------------------------------------------------------------------------

function cleanup(d) {
  
  d.crash_date = dateFormat.parse(d.CRASHDATE);
  d.crash_week = d3.time.week.floor(d.crash_date);
//  d.crash_day = d.crash_date.getDay();
  d.crash_day = (d.crash_date.getDay() + 6)%7;
  d.crash_hour = +withHours(+d.CRASHTIME).slice(0,2);
  d.objects_struck = d.OBJECTSSTRUCK.split('')
  d.junction_type = d.JUNCTIONTYPE || 'Not at a junction'
  d.traffic_control = d.TRAFCTRL || 'None'
  d.vehicle_1 = d.VEHICLES.slice(0,1);
  d.all_vehicles = (d.vehicle_1 + (d.VEHICLES.slice(3) || '')).trim().split('');
  d.crash_causes = d.CAUSES.trim().split(' ');
  for (i in d.crash_causes){
    cause = d.crash_causes[i]
    d.crash_causes[i] = ''+ (+cause.slice(0,2) * 10) ;
    if (d.crash_causes[i] == '360') {
      d.crash_causes[i] = '350'
    }
  }
  d.crash_causes = _.uniq(d.crash_causes)  
  date_domain.min = date_domain.min || d.crash_date;
  date_domain.max = date_domain.max || d.crash_date;
  d.n_fatals = +d.CRASHFATALCNT;
  d.n_serious = +d.CRASHSEVCNT;
  d.n_minor = +d.CRASHMINCNT;
  d.WTHRa = d.WTHRa.trim()
  d.LIGHT = d.LIGHT.trim()
  if (d.LIGHT.indexOf('B') == 0) {
    d.LIGHT = 'B'
  }
  if (d.LIGHT.indexOf('O') == 0) {
    d.LIGHT = 'O'
  }
  if (d.LIGHT.indexOf('F') == 0) {
    d.LIGHT = 'I'
  }
  if (d.LIGHT.indexOf('N') == 0) {
    d.LIGHT = 'I'
  }
  if (d.LIGHT.trim() == '') {
    d.LIGHT = 'I'
  }
  d.ROADWET = d.ROADWET.trim()  
  d.causes = _.filter(d.CAUSES.split(' '), function(z) {return z.length > 1});
  if (d.crash_date < date_domain.min) {
      date_domain.min = d.crash_date;
  }
  
  if (d.crash_date > date_domain.max) {
      date_domain.max = d.crash_date;

  }
  //
  //if (d.TLANAME.trim() == "Chatham Islands County"){d.lonlat = proj4(NZTMprojection).inverse([d.EASTING+363392, d.NORTHING])}
  //else {d.lonlat = proj4(NZTMprojection).inverse([d.EASTING, d.NORTHING])}
  
  d.lonlat = proj4(NZTMprojection).inverse([d.EASTING, d.NORTHING])
  if (d.TLANAME.trim() == "Chatham Islands County"){d.lonlat[0] = (d.lonlat[0]+4.5);
                                                   d.lonlat[1] = (d.lonlat[1]-0.545)}
  
  d.SPDLIM = +d.SPDLIM;
  
  if (+d.CRASHFATALCNT > 0) {d.severity = 'Fatal'} 
  else if (+d.CRASHSEVCNT > 0){d.severity = 'Serious'}
  else if (+d.CRASHMINCNT > 0){d.severity = 'Minor'}
  else {d.severity = 'No injury'}
  
  d.casualtycount = +d.CRASHFATALCNT+d.CRASHSEVCNT +d.CRASHMINCNT;
  
  return d;
}

var dict = {
  'Others':'Others'
}

queue()
    .defer(d3.csv, "data/crash-data-2014-reduced.csv", cleanup)
    .defer(d3.tsv, "data/dicts.tsv")
    .defer(d3.csv, "data/cause_codes_short.csv")
    .defer(d3.json, "data/nztla_2012.json") 
    .await(showCharts);

dictionaries = {
}

function showCharts(err, data, dicts, cause_codes_dict, nz_tla) {
 // console.log(err)

  dictionaries.cause_codes = {'Others':'Others'};
  for (i in cause_codes_dict) {
    entry = cause_codes_dict[i]
    dictionaries.cause_codes[entry.key] = entry.value;
  }
  
  for (i in dicts) {
    entry = dicts[i];
    dictionaries[entry.chart] = dictionaries[entry.chart] || {}
    dictionaries[entry.chart][entry.key] = entry.label;
  }
  
  
  _data = data;
  
  _nz_tla = nz_tla;
  

  ndx = crossfilter(_data);
  
  date_domain.min = d3.time.month.offset(date_domain.min, -1)
  date_domain.max = d3.time.month.offset(date_domain.max, +1)
  

  date = ndx.dimension(function(d) { return d.crash_week });
  date_group = date.group().reduceCount();
  

  date_chart = dc.barChart('#date')
    .height(200)
    .dimension(date)
    .group(date_group)
    .elasticY(true)
    .x(d3.time.scale().domain([date_domain.min, date_domain.max])) 
    .xUnits(d3.time.weeks)
    .centerBar(true)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .transitionDuration(200)
    //.on('filtered.markers',updateMarkers)

  date_chart.yAxis().ticks(4).tickFormat(d3.format('s'));

  time = ndx.dimension(function(d) { return d.crash_hour });
  time_group = time.group().reduceCount();
  

  time_chart = dc.barChart('#time')
    .height(200)
    .dimension(time)
    .group(time_group)
    .elasticY(true)
    .x(d3.scale.linear().domain([-1, 24]))
    .centerBar(true)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .transitionDuration(200)
    //.on('filtered.markers',updateMarkers)

  time_chart.yAxis().ticks(4).tickFormat(d3.format('s'));
  
  
  day = ndx.dimension(function(d) { return d.crash_day });
  day_group = day.group().reduceCount();

  day_chart = dc.barChart('#day')
    .height(200)
    .dimension(day)
    .group(day_group)
    .elasticY(true)
    .x(d3.scale.linear().domain([-1, 7]))
    .centerBar(true)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .transitionDuration(200)
    //.on('filtered.markers',updateMarkers)

  days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  day_chart.yAxis().ticks(4).tickFormat(d3.format('s'));
  day_chart.xAxis().tickFormat(function(x) { return days[x]});
  
  TLA = ndx.dimension(function(d) { return d.TLANAME});
  TLA_group = TLA.group().reduceCount();
  TLA_chart = dc.rowChart('#TLA')
    .dimension(TLA)
    .group(TLA_group)
    .transitionDuration(200)
    .height(400)
    .elasticX(true)
    .ordering(function(d) {return -d.value})
    .cap(20)
    //.on('filtered.markers',updateMarkers)
  
  TLA_chart.xAxis().ticks(4).tickFormat(d3.format('s'));
  TLA_chart.on('pretransition.dim', dim_zero_rows)
  
  objects_struck_tags = createTagDimAndGroup(ndx, 'objects_struck')
  objectsstruck_chart = dc.rowChart('#objectsstruck')
  
  objectsstruck_chart.dimension(objects_struck_tags.dim)
    .group(objects_struck_tags.group)
    .filterHandler(objects_struck_tags.filterHandlerFor(objectsstruck_chart))
    .transitionDuration(200)
    .height(400)
    .elasticX(true)
    .label(function(d) { return dictionaries.ObjectStruck[d.key]})
    .title(function(d) { return dictionaries.ObjectStruck[d.key] + ": " + d.value})
    .ordering(function(d) {return -d.value})
    .cap(25)
    .on('filtered.markers',updateMarkers)
  
  objectsstruck_chart.xAxis().ticks(4).tickFormat(d3.format('s'));
  objectsstruck_chart.on('pretransition.dim', dim_zero_rows)


  weather = ndx.dimension(function(d) { return d.WTHRa});
  weather_group = weather.group().reduceCount();
 
  weather_chart = dc.rowChart('#weather')
    .dimension(weather)
    .group(weather_group)
    .transitionDuration(200)
    .height(200)
    .elasticX(true)
    .label(function(d) { return dictionaries.WTHRa[d.key]})
    .title(function(d) { return dictionaries.WTHRa[d.key] + ": " + d.value})
    .ordering(function(d) {return -d.value})
    .cap(10)
    //.on('filtered.markers',updateMarkers)
  
  weather_chart.xAxis().ticks(4).tickFormat(d3.format('s'));
  weather_chart.on('pretransition.dim', dim_zero_rows)

  light = ndx.dimension(function(d) { return d.LIGHT});
  light_group = light.group().reduceCount();
  
  light_chart = dc.pieChart('#light')
    .innerRadius(50)
    .radius(80)
    .dimension(light)
    .group(light_group)
    .label(function(d) { return dictionaries.LIGHT[d.key]})
    .title(function(d) { return dictionaries.LIGHT[d.key] + ": " + d.value})
    .transitionDuration(200)
    .height(200)
    //.on('filtered.markers',updateMarkers)
  
  roadwet = ndx.dimension(function(d) { return d.ROADWET});
  roadwet_group = roadwet.group().reduceCount();
  roadwet_chart = dc.pieChart('#roadwet')
    .innerRadius(50)
    .radius(80)
    .dimension(roadwet)
    .group(roadwet_group)
    .label(function(d) { return dictionaries.ROADWET[d.key]})
    .title(function(d) { return dictionaries.ROADWET[d.key] + ": " + d.value})
    .transitionDuration(200)
    .height(200)
    //.on('filtered.markers',updateMarkers)
  
  
  crash_causes_tags = createTagDimAndGroup(ndx, 'crash_causes')
  crash_causes_chart = dc.rowChart('#crash_causes')
  
  crash_causes_chart.dimension(crash_causes_tags.dim)
    .group(crash_causes_tags.group)
    .filterHandler(crash_causes_tags.filterHandlerFor(crash_causes_chart))
    .transitionDuration(200)
    .height(400)
    .elasticX(true)
    .label(function(d) { return dictionaries.cause_codes[d.key]})
    .title(function(d) { return dictionaries.cause_codes[d.key] + ": " + d.value})
    .ordering(function(d) {return -d.value})
    .cap(25)
    //.on('filtered.markers',updateMarkers)
  
  crash_causes_chart.xAxis().ticks(4).tickFormat(d3.format('s'));
  crash_causes_chart.on('pretransition.dim', dim_zero_rows)

  all_vehicles_tags = createTagDimAndGroup(ndx, 'all_vehicles')
  all_vehicles_chart = dc.rowChart('#all_vehicles')
  
  all_vehicles_chart.dimension(all_vehicles_tags.dim)
    .group(all_vehicles_tags.group)
    .filterHandler(all_vehicles_tags.filterHandlerFor(all_vehicles_chart))
    .transitionDuration(200)
    .height(400)
    .elasticX(true)
    .label(function(d) { return dictionaries.all_vehicles[d.key]})
    .title(function(d) { return dictionaries.all_vehicles[d.key] + ": " + d.value})
    .ordering(function(d) {return -d.value})
    .cap(25)
    //.on('filtered.markers',updateMarkers)
  
  all_vehicles_chart.xAxis().ticks(4).tickFormat(d3.format('s'));
  all_vehicles_chart.on('pretransition.dim', dim_zero_rows)
  
  speed_limit = ndx.dimension(function(d) { return d.SPDLIM});
  speed_limit_group = speed_limit.group().reduceCount();
 
  speed_limit_chart = dc.rowChart('#speed_limit')
    .dimension(speed_limit)
    .group(speed_limit_group)
    .transitionDuration(200)
    .height(200)
    .elasticX(true)
    .label(function(d) {return d.key + ' km/hr'})
    .title(function(d) { return d.key  +" km/hr: " + d.value})
    .ordering(function(d) {return -d.key})
    //.cap(10)
    //.on('filtered.markers',updateMarkers)
  
  speed_limit_chart.xAxis().ticks(4).tickFormat(d3.format('s'));
  speed_limit_chart.on('pretransition.dim', dim_zero_rows)
  
  severity = ndx.dimension(function(d) { return d.severity});
  severity_group = severity.group().reduceCount();
  
  severity_chart = dc.pieChart('#severity')
    .innerRadius(50)
    .radius(80)
    .dimension(severity)
    .group(severity_group)
    .label(function(d) { return d.key})
    .title(function(d) { return d.key + ": " + d.value})
    .transitionDuration(200)
    .height(200)
    //.on('filtered.markers',updateMarkers)


  crash_locs = ndx.dimension(function(d) {return [d.lonlat[1],d.lonlat[0]]});
  //crash_locs_group = crash_locs.group().reduce(loc_add,loc_sub,loc_init);
  crash_locs_group = crash_locs.group().reduceCount();

//  var tiles = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiYmxhaXJuaWxzc29uIiwiYSI6IjllOWNhNGU0MjAxNTNhMjQ0MWM1NGE0ZDc5YTU5ZTA1In0.QWLOhfygnMMipPJL7gfTfw', {
//		maxZoom: 17,
//                  minZoom: 5,
//		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
//				'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
//				'Imagery © <a href="http://mapbox.com">Mapbox</a>',
//                  id:'mapbox.streets'
//  })
/*
  mymap = dc_leaflet.markerChart("#map")
      .dimension(crash_locs)
      .group(crash_locs_group)
      .width(600)
      .height(400)
      .center([-41, 172])
      .zoom(5)
      .tiles(function(map) {
        tiles.addTo(map);
      })
      .cluster(true)

  */  
  
  var projection = d3.geo.mercator()
            .center([172,-41])
            .scale(1200)
           // .translate([200, 300]); // width, height

  mymap = dc.geoChoroplethChart("#map")
      .dimension(TLA)
      .group(TLA_group)
      .projection(projection)
      .width(600)
      .height(400)
      //.center([-41, 172])
      //.zoom(5)             
      .overlayGeoJson(_nz_tla.features, 'tla', function(d) {return d.properties.NAME})
      
  
  
  dc.renderAll();
  //mymap.tiles(tiles)
  
  
}
