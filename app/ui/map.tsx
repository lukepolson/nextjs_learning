"use client"

// components/OpenLayersMap.tsx
import { useEffect, useRef } from 'react';
import 'ol/ol.css'; // Import OpenLayers CSS
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import {LineString, Polygon} from 'ol/geom.js';
import { fromLonLat } from 'ol/proj';
import Draw from 'ol/interaction/Draw';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { getLength } from 'ol/sphere';
import { Feature } from 'ol';
import { Stroke, Style, Fill, Circle as CircleStyle} from 'ol/style';
import Overlay from 'ol/Overlay.js';
import {unByKey} from 'ol/Observable.js';

let sketch:Feature
let measureTooltipElement:HTMLElement;
let measureTooltip:Overlay;

const formatLength = function (line:LineString) {
    const length = getLength(line);
    let output;
    if (length > 100) {
      output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
    } else {
      output = Math.round(length * 100) / 100 + ' ' + 'm';
    }
    return output;
  };

const OpenLayersMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const map = new Map({
      target: mapRef.current as HTMLElement, 
      layers: [
        new TileLayer({
          source: new OSM(), // Use OpenStreetMap tiles
        }),
      ],
      view: new View({
        center: fromLonLat([144.9631, -37.8136]), // Melbourne, Australia
        zoom: 10, // Initial zoom level
      }),
    });

    const vectorSource = new VectorSource();

    // Create a vector layer to show the drawn features
    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
            stroke: new Stroke({
                color: 'rgba(0, 0, 0, 0.5)',
                lineDash: [10, 10],
                width: 2,
            }),
            image: new CircleStyle({
                radius: 5,
                stroke: new Stroke({
                  color: 'rgba(0, 0, 0, 0.7)',
                }),
                fill: new Fill({
                  color: 'rgba(255, 255, 255, 0.2)',
                }),
            }),
        }),
        
    });

    map.addLayer(vectorLayer);

    // Add drawing interaction for LineStrings
    const draw  = new Draw({
        source: vectorSource,
        type: 'LineString',
      });

    map.addInteraction(draw);
    createMeasureTooltip();

    // Draw on and draw off functionality

    let listener;
    draw.on('drawstart', (event) => {
        sketch = event.feature
        let tooltipCoord = event.coordinate;
        listener = sketch.getGeometry().on('change', function (event) {
            const geom = event.target;
            let output;
            if (geom instanceof LineString) {
                output = formatLength(geom);
                tooltipCoord = geom.getLastCoordinate();
            }
            measureTooltipElement.innerHTML = output;
            measureTooltip.setPosition(tooltipCoord)
        });
    });

    draw.on('drawend', function () {
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
        measureTooltip.setOffset([0, -7]);
        // unset sketch
        sketch = null;
        // unset tooltip so that a new one can be created
        measureTooltipElement = null;
        createMeasureTooltip();
        unByKey(listener);
      });

    function createMeasureTooltip() {
        if (measureTooltipElement) {
          measureTooltipElement.remove();
        }
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
        measureTooltip = new Overlay({
          element: measureTooltipElement,
          offset: [0, -15],
          positioning: 'bottom-center',
          stopEvent: false,
          insertFirst: false,
        });
        map.addOverlay(measureTooltip);
      }

    return () => {
      map.setTarget(undefined); // Clean up the map instance on unmount
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '500px' }} // Set the dimensions of the map
    ></div>
  );
};
export default OpenLayersMap;