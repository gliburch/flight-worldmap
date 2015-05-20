var map;

$(function(){

  map = new jvm.Map({
    // Basic Options
    container: $("#world"),
    map: 'world_mill_en',
    // Design Options
    backgroundColor: '#222',
    regionStyle: {
      initial: {
        'fill': '#444',
        'fill-opacity': 1,
        'stroke': 'none',
        'stroke-width': 0,
        'stroke-opacity': 1
      },
      hover: {
        'fill-opacity': 0.8,
        'cursor': 'pointer'
      },
      selected: {
        'fill': '#999'
      },
    },
    // ETC
    focusOn: {
      scale: 3,
      lat: 20,
      lng: 120
    },
    regionsSelectable: true,
    markersSelectable: true,
    regionsSelectableOne: true,
    markersSelectableOne: true,
    // Action
    onRegionClick: function(event, name) {
      map.__.callRegionPopup(map.getRegionName(name));
    },
    onMarkerClick: function(event, name) {
      map.__.callRegionPopup('ID : ' + name);
    },
  });

  map.__ = {

    smoothFocus: function(option) {
      // 자연스러운 이동 효과
      map.setFocus(option);
      // if(option.scale == 1 || parseInt(map.scale) > parseInt(option.scale)) {
      //   map.setFocus(option);
      // } else {
      //   map.setScale(map.scale/1.2, map.width/2, map.height/2, false, map.option.zoomAnimate);
      //   setTimeout(function() {
      //     map.setFocus(option);
      //   }, 220);
      // }
      // 지역 선택일 경우 하이라이트
      if(option.region) {
        map.setSelectedRegions(option.region);
      } else if(option.regions) {
        map.setSelectedRegions(option.regions);
      }
      // 마커 선택일 경우 하이라이트
    },

    addMarkersAndFocus: function(id, color, points) {;
      var coordinates = [];
      $.each(points, function(point_key, point_value) {
        var index = id + '-' + point_key;
        map.addMarker(index, {
          latLng: point_value,
          name: point_key,
          style: {
            r: 5,
            fill: color,
            stroke: '#444',
            'stroke-width': 1
          }
        });
        coordinates.push({
          lat: point_value[0],
          lng: point_value[1]
        });
      });

      map.__.smoothFocus({
        scale: function() {
          // 마커가 하나일 경우 스케일 8 / 여러개일 경우 스마트 스케일 계산 공식 정용
          if(Object.keys(coordinates).length > 1) {
            var samples_lat_dist = [];
            var samples_lng_dist = [];
            $.each(coordinates, function(index, coordinate) {
              samples_lat_dist.push(Math.abs(coordinates[0].lat - coordinate.lat));
              samples_lng_dist.push(Math.abs(coordinates[0].lng - coordinate.lng));
            });
            return Math.min(180/Math.max.apply(null, samples_lat_dist), 180/Math.max.apply(null, samples_lng_dist))*1.3;
          } else {
            return 8;
          }
        }(), 
        lat: function() {
          var sum_lat = 0;
          $.each(coordinates, function(index, coordinate) {
            sum_lat += coordinate.lat;
          });
          return sum_lat/Object.keys(coordinates).length;
        }(),
        lng: function() {
          var sum_lng = 0;
          $.each(coordinates, function(index, coordinate) {
            sum_lng += coordinate.lng;
          });
          return sum_lng/Object.keys(coordinates).length;
        }(),
        animate: true
      });

    },

    lockMapControl: {
      mask: $('<div></div>').css({
        'overflow': 'auto',
        'position': 'fixed',
        'top': 0,
        'right': 0,
        'bottom': 0,
        'left' :0
      }),
      on: function() {
        if($('#lock-buttons').prop('checked')) {
          $('.options button').prop('disabled', true);
          map.container.parent().append(this.mask);
        }
      },
      off: function() {
        if(!map.container.find('img')[0]) {
          $('.options button').prop('disabled', false);
          this.mask.remove();
        }
      }
    },

    callRegionPopup: function(content) {
      map.__.removeRegionPopup();
      var popup = $('<div></div>').addClass('map-popup').css({
        'position': 'absolute',
        'right': 0,
        'bottom': 0,
        'left': 0,
        'width': '100%',
        'height': '20%',
        'border-top': '1px solid #666',
        'background-color': 'rgba(0,0,0,0.7)',
        'box-shadow': '0 0 20px 0 rgba(0,0,0,0.8)',
        'color': '#fff',
      }).appendTo(map.container.parent());
      $('<button>Close</button>').css({
        'position': 'absolute',
        'top': '10px',
        'right': '10px',
      }).on('click', function() {
        map.__.removeRegionPopup();
        map.clearSelectedRegions();
      }).appendTo(popup);
      popup.append('<div style="padding:15px">' + content + '</div>');
    },

    removeRegionPopup: function() {
      map.container.parent().find('.map-popup').remove();
    },

    drawFlightOnRoute: function(prefix, corp) {
      var coordinates = [];
      $.each(map.markers, function(index, marker) {
        if(index.indexOf(prefix) == 0) {
          coordinates.push(marker.config.latLng);
        }
      });
      var step = 0;
      function planeEffectLoop() {
        // Marker 가 2개 이상일 때에만 빙행기 그리기
        if(coordinates.length > 1) {
          map.__.planeEngine(corp, coordinates[step], coordinates[step+1], 10000, 60, function() {
            step++;
            if(step < Object.keys(coordinates).length - 1) {
              planeEffectLoop(coordinates);
            }
          });  
        } else {
          alert('비행 경로가 존재하기 않습니다.');
        }
      }
      planeEffectLoop();
    },

    planeEngine: function(corp, coordinate_from, coordinate_to, duration, fps, callback) {

      function rotation(ox, oy, px, py) {
        var radian = Math.atan2((py - oy), (px - ox));
        var degree = radian * 180 / Math.PI;
        return parseInt(degree);
      }

      function draw_flight(flt, sdw, txt, bdg, x, y, r, s, sx, sy) {
        var w = Number(20 + (20 * s));
        var h = Number(20 + (20 * s));
        flt.css("opacity", s);
        flt.css("left", (x - w / 2) + "px");
        flt.css("top", (y - h / 2) + "px");
        flt.css("width", w + "px");
        flt.css("height", h + "px");
        flt.css("transform", "rotate(" + r + "deg)");
        sdw.css("opacity", s);
        sdw.css("left", (sx - 32 / 2) + "px");
        sdw.css("top", (sy - 32 / 2) + "px");
        sdw.css("width", 32 + "px");
        sdw.css("height", 32 + "px");
        sdw.css("transform", "rotate(" + r + "deg)");
        bdg.css("left", (x - w / 2) + w + "px");
        bdg.css("top", (y - h / 2) + h + "px");
        var p = map.pointToLatLng((x - w / 2), (y - h / 2));
        var latitude = (Math.round(p.lat) > 0 ? 'N ' : 'S ') + Math.abs(Math.round(p.lat)) + '°';
        var longtitude = (Math.round(p.lng) > 0 ? 'E ' : 'W ') + Math.abs(Math.round(p.lng)) + '°';
        txt.css("left", (x - w / 2) + w + 30 + "px");
        txt.css("top", (y - h / 2) + h + 2 + "px");
        txt.text(latitude + ', ' + longtitude);
      }

      var sdw = $('<img class="jvectormap-flight-body" src="assets/images/shadow.png"/>').css({
        'opacity': 0,
        'position': 'absolute',
      });
      var flt = $('<img class="jvectormap-flight-shadow" src="assets/images/plane.png"/>').css({
        'opacity': 0,
        'position': 'absolute',
      });
      var txt = $('<span class="jvectormap-flight-text"/>').css({
        'position': 'absolute',
        'color': '#fff',
        'font-size': '9px',
      });
      switch(corp) {
        case 'PR':
          var bdg = $('<img class="jvectormap-flight-badge" src="assets/images/badge-pr.png"/>').css({
            'position': 'absolute',
          });
          break;
        case 'VJ':
          var bdg = $('<img class="jvectormap-flight-badge" src="assets/images/badge-vj.png"/>').css({
            'position': 'absolute',
          });
          break;
      }
      
      map.container.append(sdw);
      map.container.append(flt);
      map.container.append(txt);
      map.container.append(bdg);
      var frame = 0;
      var lastFrame = parseInt(duration / fps);
      var interval = setInterval(function() {
        frame++;
        var from = map.latLngToPoint(coordinate_from[0], coordinate_from[1]);
        var to = map.latLngToPoint(coordinate_to[0], coordinate_to[1]);
        var rv = rotation(from.x, from.y, to.x, to.y, 0, from.x, from.y);
        draw_flight(flt, sdw, txt, bdg, from.x, from.y, rv);
        var rx = from.x;
        var ry = from.y;
        var ox = parseInt((to.x + from.x) / 2);
        var oy = parseInt((to.y + from.y) / 2);

        var theta = -Math.PI * frame / lastFrame;
        var px = from.x - ox;
        var py = from.y - oy;
        var x = Math.cos(theta) * (px) + Math.sin(theta) * (py) / 4 + ox;
        var y = -Math.sin(theta) * (px) / 4 + Math.cos(theta) * (py) + oy;
        draw_flight(flt, sdw, txt, bdg, parseInt(x), parseInt(y), rv, Math.sin(-theta),
            (to.x - from.x) * frame * frame / (lastFrame * lastFrame)
                + from.x, (to.y - from.y) * frame * frame / (lastFrame * lastFrame) + from.y);
        rx = x;
        ry = y;
        if (frame >= lastFrame) {
          clearInterval(interval);
          draw_flight(flt, sdw, txt, bdg, to.x, to.y, rv, 0, to.x, to.y);
          flt.remove();
          sdw.remove();
          txt.remove();
          bdg.remove();
          if(callback)
            callback();
        }
      }, 1000 / fps);

    },

  }
  
});