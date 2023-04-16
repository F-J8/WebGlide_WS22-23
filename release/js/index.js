//INITIALISATION
// Grant CesiumJS access to your ion assets. INSERT YOUR ACCES TOKEN HERE. GET YOUR TOKEN AT: https://cesium.com/learn/ion/cesium-ion-access-tokens/
Cesium.Ion.defaultAccessToken = "";

//Germany sized rectangle
var defaultExtent = Cesium.Rectangle.fromDegrees(5.071520, 46.747998, 16.250398, 55.566948);

Cesium.Camera.DEFAULT_VIEW_RECTANGLE = defaultExtent;
Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

//Creates a Cesium Viewer and uses the cesiumContainer
const viewer = new Cesium.Viewer('cesiumContainer', {
  baseLayerPicker: false,
  timeline: false,
  sceneModePicker: false,
  animation: false,
  CredentialsContainer: false,
  terrainProvider: Cesium.createWorldTerrain({
    requestWaterMask : true,
    requestVertexNormals : true
  })
});

//Blend Loading Screen in and out
let img = document.getElementById('img')
let time = 1000           // time in milliseconds
img.style.opacity = 0;    // set img to hidden on load
setTimeout(()=> {
  img.style.opacity = 1;  // after timeout show img
}, time)

viewer.scene.globe.tileLoadProgressEvent.addEventListener(function (queuedTileCount) {
  if(viewer.scene.globe.tilesLoaded){
    img.style.opacity = 0;
    setTimeout(()=> {
      img.style.zIndex = -1; // after timeout show img
    }, time);
  }
});

//disable shadow on load
document.getElementById('shadowCheckboxId').checked = false;

//for standart color picker
String.prototype.convertToRGB = function(alpha){
  var aRgbHex = this.match(/#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})/i).slice(1);
  return new Cesium.Color(
              Cesium.Color.byteToFloat(parseInt(aRgbHex[0], 16)),
              Cesium.Color.byteToFloat(parseInt(aRgbHex[1], 16)),
              Cesium.Color.byteToFloat(parseInt(aRgbHex[2], 16)),
              alpha
             );
}

// VISUAL SETTINGS
viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.postProcessStages.fxaa.enabled = true;
viewer.forceResize();
const osmBuildings = viewer.scene.primitives.add(Cesium.createOsmBuildings());
const baseLayerPicker = viewer.baseLayerPicker;

//VARIABLES
let igcData;                                            //raw igc input
let jsonResult;                                         //the igc converted to decimal degrees stored as JSON
let flightData;                                         //the validated JSON file
let heightCorrection;                                   //holds the height correction
let positions = [];                                     //the flight data converted into an array of cartesian3 objects for Cesium
let planePositions = [];                                //the positions of the vertical polylines
let plane = [];                                         //the entities of planePositions
let entity = [];                                        //the entities of positions
let entityShadow = [];                                  //the entities of shadows
let entityPoints = [];                                  //the entities of points (outcommented)
let defaultColor = '#FFB01E';                           //default flighttrack color
let pickedHexColor = defaultColor.convertToRGB(1);      //the hex value of defaultColor

// Buttons for Loading igc, selecting shader & Colorpicker
// IGC-BUTTON
window.viewer = viewer;
const toolbar = document.querySelector("div.cesium-viewer-toolbar");
const modeButton = document.querySelector("span.cesium-sceneModePicker-wrapper");
const igcButton = document.getElementById('inputButton');
igcButton.classList.add("cesium-button", "cesium-toolbar-button");
toolbar.insertBefore(igcButton, modeButton);

// SHADER-BUTTON (Forms)
// const shdButton = document.createElement('button');
const shdButton = document.getElementById('shaders');
shdButton.disabled = true;
document.getElementById('shaders').selectedIndex = 0;
shdButton.classList.add("cesium-button");
toolbar.insertBefore(shdButton, modeButton);

//Change SHADER (Forms)
function changeShader(){
  switch(materialSelect.value){
    case 's1':
      entity.polyline.material = material1;
      entity.polyline.material.color = pickedHexColor;
      plane.polyline.material = material1;
      plane.polyline.material.color = pickedHexColor;
      console.log("material1: "+entity.polyline.material.color);
      plane.polyline.show = new Cesium.ConstantProperty(false);
      break;
    case 's2':
      entity.polyline.material = material2;
      entity.polyline.material.color = pickedHexColor;
      plane.polyline.material = material2;
      plane.polyline.material.color = pickedHexColor;
      console.log("material2: "+entity.polyline.material.color);
      plane.polyline.show = new Cesium.ConstantProperty(true);
      break;
    case 's3':
      entity.polyline.material = material3;
      entity.polyline.material.color = pickedHexColor;
      plane.polyline.material = material3;
      plane.polyline.material.color = pickedHexColor;
      console.log("material3: "+entity.polyline.material.color);
      plane.polyline.show = new Cesium.ConstantProperty(true);
      break;
    case 's4':
      entity.polyline.material = material4;
      entity.polyline.material.color = pickedHexColor;
      plane.polyline.material = material4;
      plane.polyline.material.color = pickedHexColor;
      console.log("material4: "+entity.polyline.material.color);
      plane.polyline.show = new Cesium.ConstantProperty(false);
      break;
    default:
      entity.polyline.material = defaultMaterial;
      entity.polyline.material.color = pickedHexColor;
  };
  entity.polyline.color = pickedHexColor;
};

//SHADOW
//checkbox to show shadow or not
let shadowCheckbox = document.getElementById('shadowCheckboxId');
shadowCheckbox.disabled = true;
// shadowCheckbox.classList.add("cesium-button");
// toolbar.insertBefore(shadowCheckbox, modeButton);
const shadowCheckboxLabel = document.getElementById('checkDiv');
shadowCheckboxLabel.classList.add("cesium-button");//, "cesium-toolbar-button"
toolbar.insertBefore(shadowCheckboxLabel, modeButton);

shadowCheckbox.addEventListener('change',toggleShadow)

function toggleShadow(){
  console.log("toggle started")
  try {
    if(shadowCheckbox.checked){
      //if entity shadow was already created
      if(typeof entityShadow == 'undefined' || entityShadow.length == 0){
          //and if a file was selected to load from
          if(document.getElementById("fileInput").value != "") {
              //add positions from file to entities
              console.log('loading shadows...')
              entityShadow = viewer.entities.add({
                polyline: {
                  positions: positions,
                  width: 10,
                  material: material5,
                  clampToGround: true
                  }
              });
              console.log('loading shadows finished')
          }else{alert('no file selected')};
      } else {console.log('entityShadows visible = true')};
      entityShadow.polyline.show = new Cesium.ConstantProperty(true);
  } else {
      if(entityShadow != []){
          console.log('entityShadows visible = false')
          if (typeof entityShadow.polyline != "undefined") {
            entityShadow.polyline.show = new Cesium.ConstantProperty(false);
          }
      }
  };
  } catch (error) {
    console.log("Error: "+error);
  }
}

//COLORPICKER

//huebee framework (MIT License)
var colorInput = document.getElementById('inputPicker');
var hueb = new Huebee( colorInput, {
    hues: 12,      // columns
    hue0: 0,    // the first hue of the color grid. default: 0
    shades: 7, //rows
    saturations: 1, //fields
    notation: 'hex',// the text syntax of colors
    // values: shortHex, hex, hsl
    // shortHex => #F00, hex => #FF0000, hsl => hsl(0, 100%, 50%)
    // default: shortHex
    setText: false,// sets text of elements to color, and sets text color
    // true => sets text of anchor
    // string, '.color-text' => sets elements that match selector
    // default: true
    setBGColor: false,
    customColors: [ '#FFB01E', '#55FF11', '#00BBFF', '#FF3D91', '#2B83FF' ],// custom colors added to the top of the grid
    staticOpen: false,
    className: 'color-input-picker',
});
  
let button = document.getElementById('inputPicker');
button.classList.add("cesium-button");//, "cesium-toolbar-button"
toolbar.insertBefore(button, modeButton);
button.disabled = true;

button.style.background=defaultColor;

hueb.on( 'change', function( color, hue, sat, lum ) {
  entity.polyline.material.color = color.convertToRGB(1);
  console.log( 'color changed to: ' + color.convertToRGB(1))
  pickedHexColor = color.convertToRGB(1);
  button.style.background=color;
  hueb.close();
})

//MATERIALS
var material1 = new Cesium.PolylineGlowMaterialProperty({glowPower: 0.1, taperPower: 1, color: pickedHexColor});
var material1 = new Cesium.PolylineOutlineMaterialProperty({color: pickedHexColor, outlineWidth: 2.5}); 

var material2 = new Cesium.PolylineGlowMaterialProperty({glowPower: 0.6, taperPower: 1, color: pickedHexColor});
var material3 = new Cesium.PolylineOutlineMaterialProperty({color: pickedHexColor, outlineColor: Cesium.Color.WHITE, outlineWidth: 3});
var material4 = new Cesium.PolylineGlowMaterialProperty({glowPower: 0.1, taperPower: 1, color: pickedHexColor});

var material5 = new Cesium.PolylineGlowMaterialProperty({glowPower: 0.4, taperPower: 1, color: Cesium.Color.GREY}); //shadows
var defaultMaterial = material1;

const materialSelect = document.getElementById('shaders');
materialSelect.addEventListener("change",(event) => {
  changeShader();
})

//LOAD IGC FILE AFTER FILE WAS SELECTED
// Get the file input element
const fileInput = document.getElementById('fileInput');
// Listen for changes to the file input element
fileInput.addEventListener('change', (event) => {
    // Get the first selected file
    const file = event.target.files[0];
    // Create a new FileReader object
    const reader = new FileReader();
    // Listen for the 'load' event on the FileReader object
    reader.addEventListener('load', (event) => {
        // Delete all (previous) polylines
    
        //remove old entities
        for (var i = 0; i < viewer.entities.values.length; ++i) {
          viewer.entities.remove(viewer.entities.values[i]);
        };
        console.log("removing old poly finished");
       
        // Get the file contents as a string
        igcData = event.target.result;
        jsonResult = convertIgcToJson(igcData);//converts to json for formatting and parsing

        try {
          JSON.parse(jsonResult);
          console.log("valid json")
        } catch (error) {
          console.error("Invalid JSON: " + error);
        }
        flightData = JSON.parse(jsonResult);
        
        // THIS ADDS DATA POINTS (other than polylines)
  
        // for (let i = 0; i < flightData.length; i++) {
        //   const dataPoint = flightData[i];
        //   entityPoints = [];
        //   entityPoints = viewer.entities.add({
        //     description: `Location: (${dataPoint.longitude}, ${dataPoint.latitude}, ${dataPoint.altitude})`,
        //     position: Cesium.Cartesian3.fromDegrees(dataPoint.longitude, dataPoint.latitude, dataPoint.altitude),
        //     point: { pixelSize: 3, color: Cesium.Color.BLUE }
        //   });
        // }

        // POLYLINE
        
        viewer.scene.globe.depthTestAgainstTerrain = true;
        let xcoo = Cesium.Cartographic.fromDegrees(flightData[0].longitude,flightData[0].latitude);
        
        heightCorrection="";

        Cesium.sampleTerrain(viewer.terrainProvider, 9, [xcoo])
        .then(function(samples) {
          // console.log('Height0 in meters is: ' + samples[0].height);
          heightCorrection = flightData[0].altitude - samples[0].height;
          // console.log('Height1 in meters is: ' + heightCorrection);
        });

        //HEIGHT CORRECTION
        //waiting for heightCorrection to be determined
        (async() => {
          console.log("waiting for variable");
          while(heightCorrection == undefined || heightCorrection == "")
              await new Promise(resolve => setTimeout(resolve, 1000));
          //here heightCorrection is defined
          console.log('Korrektur beträgt: '+ heightCorrection);

          positions = [];
          for (let i = 0; i < flightData.length; i++) {
            const dataPoint = flightData[i];
            // dataPoint.altitude=dataPoint.altitude-heightCorrection; //height correction turned off by default
            dataPoint.altitude=dataPoint.altitude+50;
            positions.push(Cesium.Cartesian3.fromDegrees(dataPoint.longitude, dataPoint.latitude, dataPoint.altitude));
          };

          planePositions = [];
          for (let i = 0; i < flightData.length; i++) {
            const dataPoint = flightData[i];
            // dataPoint.altitude=dataPoint.altitude-heightCorrection;  //height correction turned off by default
            // dataPoint.altitude=dataPoint.altitude+50;      //for testing
            planePositions.push(Cesium.Cartesian3.fromDegrees(dataPoint.longitude, dataPoint.latitude, dataPoint.altitude));
            planePositions.push(Cesium.Cartesian3.fromDegrees(dataPoint.longitude, dataPoint.latitude, 0));
            planePositions.push(Cesium.Cartesian3.fromDegrees(dataPoint.longitude, dataPoint.latitude, dataPoint.altitude));
          };

          //add entities
          //////////////////////////////////////////////////
          console.log("positions defined");
          entity =[];
          entity = viewer.entities.add({
            polyline: {
              positions: positions,
              width: 5,
              material: defaultMaterial,
              }
          });
          
          plane = [];
          plane = viewer.entities.add({
            polyline: {
              positions: planePositions,
              width: 5,
              material: defaultMaterial,
              }
          });
          /////////////////////////////////////////////////

          //if new igc is loaded check if shadow is toggled
          entityShadow =[];
          toggleShadow();
          changeShader();

          console.log("entities loaded");
        })();

        //Preparing rectangle for initial zoom
        let latMax=flightData[0].latitude;
        let latMin=flightData[0].latitude;
        let lonMax=flightData[0].longitude;
        let lonMin=flightData[0].longitude;
        
        for(let i = 0; i < flightData.length-1; i++){
          if(flightData[i].latitude > latMax){
            latMax = flightData[i].latitude;
          } else if(flightData[i].latitude < latMin){
            latMin = flightData[i].latitude;
          }
          if(flightData[i].longitude > lonMax){
            lonMax = flightData[i].longitude;
          } else if(flightData[i].longitude < lonMin){
            lonMin = flightData[i].longitude;
          }
        }
       
        //applying factors for zoom to rectangle
        let rf = 1.0001; //zoom corerction factor by maximizing the rectangle
        if (lonMin>0){
          lonMin=lonMin*(1-(rf-1))
        } else {
          lonMin=lonMin*rf
        }
        if (latMin>0){
          latMin=latMin*(1-(rf-1))
        } else {
          latMin=latMin*rf
        }
        if (lonMax>0){
          lonMax=lonMax*rf
        } else {
          lonMax=lonMax*(1-(rf-1))
        }
        if (latMax>0){
          latMax=latMax*rf
        } else {
          latMax=latMax*(1-(rf-1))
        };

        //fly to rectangle
        let targetCamRectangle = new Cesium.Rectangle.fromDegrees(lonMin, latMin, lonMax, latMax);
        viewer.camera.flyTo({
          destination : targetCamRectangle,
          orientation: {
            roll : 0.0
          },
          duration: 3
        }); 
        //set home button to flight track
        Cesium.Camera.DEFAULT_VIEW_RECTANGLE = targetCamRectangle;
        Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;
    });
    //enable manipulators
    button.disabled = false;
    shadowCheckbox.disabled = false;
    shdButton.disabled = false;
    
    // Read the file as a text file
    reader.readAsText(file);
});


// Takes the igc file (igcData) and converts it to a JSON file into the decimal degree format
function convertIgcToJson(igcData) {
  // Split the IGC data into individual lines
  const lines = igcData.split('\n');
  // Initialize an empty array to store the JSON data
  const jsonData = [];
  // Iterate through the lines of IGC data
  for (const line of lines) {
      // Check if the line starts with the "B" record identifier
      if (line.startsWith('B')) {
          // Extract the latitude, longitude, and altitude from the line

          //0  1    6  7     14 15     23   25 29 30 34 35 36
          //B  HHMMSS  DDMMmmmN DDDMMmmmE A PPPPP GGGGG CR LF

          const latitude = line.substring(7, 15);//7,15
          const longitude = line.substring(15, 24);//15, 24
          const altitude = line.substring(30, 35);//25, 30 //30, 35
          // Convert the latitude and longitude to decimal degrees
          const latDecimal = parseFloat(latitude.slice(0, 2)) + parseFloat(latitude.slice(2, 7)) / 6e4;
          const lonDecimal = parseFloat(longitude.slice(0, 3)) + parseFloat(longitude.slice(3, 8)) / 6e4;
          // Convert the altitude to meters
          const altMeters = parseFloat(altitude);
          //ADD for South/West values
          if(latitude.charAt(23)=="S"){latDecimal=latDecimal*(-1)};
          if(longitude.charAt(14)=="W"){lonDecimal=lonDecimal*(-1)};
          // Add the data to the jsonData array as an object
          jsonData.push({
              latitude: latDecimal,
              longitude: lonDecimal,
              altitude: altMeters
          });
      }
  }
  // return the jsonData
  return JSON.stringify(jsonData);
}
