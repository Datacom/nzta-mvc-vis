

var _data;
var mymap
var dateFormat = d3.time.format('%d/%m/%Y')
var withHours = d3.format("04d");
var timeFormat = d3.time.format('%H%M')
var display_dateFormat = d3.time.format('%Y-%m-%d')
//var NZTMprojection = "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +y_0=10000000 +x_0=1600000 +ellps=GRS80 +datum=NZGD2000 +units=m +no_defs";

function hideReset() {
  d3.select('#resetPosition').classed('hidden',function(){return true});
}

function dim_zero_rows(chart) {
  chart.selectAll('text.row').classed('hidden',function(d){return (d.value < 0.1)});
}

var date_domain = {
}

filter_dim = {}

// this is all map stuff. our dataset has northing and easting, so we might want to bring this back in eventually, but I think we might want to avoid identifying individual crashes in the long run.

//
//var map;
//var markers = [];
//
//maxMarkers = 80;

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



function cleanup(d) {
  
  d.crash_date = dateFormat.parse(d.CRASHDATE);
  d.crash_week = d3.time.week.floor(d.crash_date);
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
    .defer(d3.csv,  "data/crash-data-2014-reduced.csv", cleanup)
    .defer(d3.tsv,  "data/dicts.tsv")
    .defer(d3.csv,  "data/cause_codes_short.csv")
    .defer(d3.json, "data/clipped_working_nois2.geojson") 
    .await(showCharts);

dictionaries = {
}

function showCharts(err, data, dicts, cause_codes_dict, nz_tla) {


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
    
  format_s = d3.format('s')
  format_d = d3.format('d') 
  whole_crashes_format = function(d){if(d < 1){return ""} else if (d < 10 ) {return format_d(d)} else {return format_s(d)}}

  ndx = crossfilter(_data);

  date_domain.min = d3.time.month.offset(date_domain.min, -1)
  date_domain.max = d3.time.month.offset(date_domain.max, +1)
  date = ndx.dimension(function(d) { return d.crash_week });
  date_group = date.group().reduceCount();
  

  date_chart = dc.barChart('#date')
    .height(150)
    .dimension(date)
    .group(date_group)
    .elasticY(true)
    .x(d3.time.scale().domain([date_domain.min, date_domain.max])) 
    .xUnits(d3.time.weeks)
    .centerBar(true)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .transitionDuration(200)

  
  date_chart.yAxis().ticks(4).tickFormat(whole_crashes_format);
  date_chart.xAxis().tickFormat(d3.time.format('%b'));
  

  time = ndx.dimension(function(d) { return d.crash_hour });
  time_group = time.group().reduceCount();
  

  time_chart = dc.barChart('#time')
    .height(150)
    .dimension(time)
    .group(time_group)
    .elasticY(true)
    .x(d3.scale.linear().domain([-1, 24]))
    .centerBar(true)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .transitionDuration(200)

  
  time_chart.yAxis().ticks(4).tickFormat(whole_crashes_format);
  
  day = ndx.dimension(function(d) { return d.crash_day });
  day_group = day.group().reduceCount();

  day_chart = dc.barChart('#day')
    .height(150)
    .dimension(day)
    .group(day_group)
    .elasticY(true)
    .x(d3.scale.linear().domain([-1, 7]))
    .centerBar(true)
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .transitionDuration(200)
    //.on('filtered.markers',updateMarkers)

  days = ['M','T','W','T','F','S','S'];
  day_chart.yAxis().ticks(4).tickFormat(whole_crashes_format);
  day_chart.xAxis().tickFormat(function(x) { return days[x]});
  
  
  
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

  
  objectsstruck_chart.xAxis().ticks(4).tickFormat(whole_crashes_format);
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

  
  weather_chart.xAxis().ticks(4).tickFormat(whole_crashes_format);
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

  
  
  crash_causes_tags = createTagDimAndGroup(ndx, 'crash_causes')
  crash_causes_chart = dc.rowChart('#crash_causes')
  
  crash_causes_chart.dimension(crash_causes_tags.dim)
    .group(crash_causes_tags.group)
    .filterHandler(crash_causes_tags.filterHandlerFor(crash_causes_chart))
    .transitionDuration(200)
    .height(720)
    .elasticX(true)
    .label(function(d) { return dictionaries.cause_codes[d.key]})
    .title(function(d) { return dictionaries.cause_codes[d.key] + ": " + d.value})
    .ordering(function(d) {return -d.value})
    .cap(40)

  
  crash_causes_chart.xAxis().ticks(4).tickFormat(whole_crashes_format);
  crash_causes_chart.on('pretransition.dim', dim_zero_rows)

  all_vehicles_tags = createTagDimAndGroup(ndx, 'all_vehicles')
  all_vehicles_chart = dc.rowChart('#all_vehicles')
  
  all_vehicles_chart.dimension(all_vehicles_tags.dim)
    .group(all_vehicles_tags.group)
    .filterHandler(all_vehicles_tags.filterHandlerFor(all_vehicles_chart))
    .transitionDuration(200)
    .height(274)
    .elasticX(true)
    .label(function(d) { return dictionaries.all_vehicles[d.key]})
    .title(function(d) { return dictionaries.all_vehicles[d.key] + ": " + d.value})
    .ordering(function(d) {return -d.value})
    .cap(25)

  
  all_vehicles_chart.xAxis().ticks(4).tickFormat(whole_crashes_format);
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
  
  
  speed_limit_chart.xAxis().ticks(4).tickFormat(whole_crashes_format);
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
 
var colourscale = d3.scale.log().range(["#ffe7cf","#E6550D"])

projection = d3.geo.mercator()
            .center([170,-40])
            .scale(2000)
            .translate([220, 320]); // width, height

function zoomed() {
    projection
    .translate(d3.event.translate)
    .scale(d3.event.scale);
    var hidden = projection.scale() == 2000 && JSON.stringify(projection.translate()) == JSON.stringify([220,320]);
    console.log('testing!!', projection.scale(), projection.translate(), hidden)
    d3.select('#resetPosition').classed('hidden',function(){return hidden})
    mymap.render();
    }
  
  
  zoom = d3.behavior.zoom()
    .translate(projection.translate())
    .scale(projection.scale())
    .scaleExtent([2000, 20000])
    .on("zoom", zoomed);

  d3.select("#map").call(zoom);

  function colourRenderlet(chart) {
    ext = d3.extent(mymap.data(), mymap.valueAccessor());
    ext[0]=0.0001;
    mymap.colorDomain(ext);
    }

  TLA = ndx.dimension(function(d) { return d.TLANAME});
  TLA_group = TLA.group().reduceCount();
  
  mymap = dc.geoChoroplethChart("#map")
      .dimension(TLA)
      .group(TLA_group)
      .projection(projection)
      .colorAccessor(function(d){return d + 1})
      .colorCalculator(function(d){return (d==0)? '#ffe7cf' : colourscale(d)})
      .transitionDuration(200)
      .height(700)
      .overlayGeoJson(_nz_tla.features, 'tla', function(d) {return dictionaries.TLA_name[d.properties.NAME]})
      .colors(colourscale) 
      .on("preRender", colourRenderlet)
      .on("preRedraw", colourRenderlet)
      
  dc.renderAll();
  
//  d3.select("#light svg").append("text")
//                          .attr("x", 100) 
//                          .attr("y",100)
//                          .attr("fill", "red")
//                          .text("I love SVG!")
  
//  d3.select("#light svg").append("image")
//                          .attr("x", 65) 
//                          .attr("y", 65)
//                          .attr("width",70)
//                          .attr("height",70)
//                          .attr("xlink:href", "js/images/icons_top_5day.GIF")
  
  //mymap.tiles(tiles)
  
  
}
