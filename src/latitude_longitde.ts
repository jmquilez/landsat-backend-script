  // import type { NextApiRequest, NextApiResponse } from 'next';

  import dotenv from 'dotenv';
  import * as satellite from 'satellite.js';
  import util from 'util';


  dotenv.config();
 
  

  type SatelliteData = {
    id: string;
    launchNumber: string;
    epochDate: string;
    inclination: string;
    rightAscension: string;
    eccentricity: string;
    perigee: string;
    anomaly: string;
    motion: string;
    revNumber: string;
  };

  const landsatData = [
    { name: 'LANDSAT_1 (ERTS 1)', id: 6126 },
    { name: 'LANDSAT_2', id: 7615 },
    { name: 'LANDSAT_3', id: 10702 },
    { name: 'LANDSAT 4', id: 13367 },
    { name: 'LANDSAT 5', id: 14780 },
    { name: 'LANDSAT 7', id: 25682 },
    { name: 'LANDSAT 8', id: 39084 },
    { name: 'LANDSAT 9', id: 49260 }
  ];

  function parseSatData(data: string, sat: Number): { latitude: number, longitude: number } | null {
    let items = data.split('\n');
      for (var i = 0; i < items.length; i++) {
      var line = items[i];
      if (line[0] == "1") {
        var satid = parseInt(line.substr(2, 5));
        if (satid == sat) {
          var line1 = items[i];
          var line2 = items[i + 1];
          var satrec = satellite.twoline2satrec(line1, line2);
          var now = new Date();
          var msec = now.getTime();
          var el = 0;
          var maxFound = false;
          var startPass;
          var endPass;
          for (let t = msec; t <= msec/* + 1000 * 24 * 3600*/; t = t + 10000) {
            var now = new Date(t);
            var positionAndVelocity = satellite.propagate(
              satrec,
              now
            );


            var positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
            var velocityEci = positionAndVelocity.velocity;

              
                // Step 1: Calculate GMST (Greenwich Mean Sidereal Time)
            const gmst = satellite.gstime(now);
              
                // Step 2: Convert ECI to ECF (Earth-Centered, Earth-Fixed)
            const positionEcf = satellite.eciToEcf(positionEci, gmst);
              
                // Step 3: Convert ECF to Geodetic (Latitude, Longitude, Altitude)
            const observerGeodetic = satellite.eciToGeodetic(positionEci, gmst);
              
                // Step 4: Convert latitude and longitude from radians to degrees
            const latitude = satellite.degreesLat(observerGeodetic.latitude);
            const longitude = satellite.degreesLong(observerGeodetic.longitude);
            const altitude = observerGeodetic.height;  // Altitude in kilometers
          
            // Output the results
            console.log(`Latitude: ${latitude}`);
            console.log(`Longitude: ${longitude}`);
            console.log(`Altitude: ${altitude} km`);

            
            var deg2rad = Math.PI / 180;
            var observerGd = {
              longitude: latitude * deg2rad, // estan hardcodeadas, serán sustituidas    adshjfkllllllllllllllllllllllllllllllllllllllllllllll
              latitude: longitude * deg2rad,
              height: 0
            };


            var lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
            var dopplerFactor = 0;
            var azimuth = lookAngles.azimuth,
              elevation = lookAngles.elevation,
              rangeSat = lookAngles.rangeSat;

            var azimuth1 = azimuth * 180 / Math.PI;
            var elevation1 = elevation * 180 / Math.PI;

            if (t == msec) {
              el = elevation1;
            }
            if ((elevation1 > 5) || (maxFound)) {
              if (!maxFound) {
                startPass = now;
                maxFound = true;
              }
              else if (elevation1 <= 5) {
                endPass = now;
                //console.log(startPass + ' ' + endPass);
                // callback({ startPass: startPass, endPass: endPass });
                break;
              }
            }
            return { latitude, longitude };

          }
          break;
        }
      }
    }
    return null;
  }
  

  async function main() {
    dotenv.config()
    const response = await fetch("https://www.n2yo.com/inc/all.php");
    if (response.ok) {
      const data = await response.text();
      const coordinates: { [key: string]: { latitude: number, longitude: number } | null } = {};
      
      landsatData.forEach(satellite => {
        const coordinate = parseSatData(data, satellite.id);
        coordinates[satellite.name] = coordinate; // Store latitude and longitude with Landsat name
      });
  
      // Output coordinates
      console.log(coordinates);
    }
  }

  main().then(() => {
    console.log("DONE 🥶🥶🥶");
  })

  /*
  // Define the handler function for the API route
  export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    // Get the satellite ID from the query parameters
    // /*const { id } = req.query;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Satellite ID is required' });
      return;
  }

  // Sample satellite data string (you could also load this from a file or database)
  const satelliteData = `
    1 35937U 09052A   24225.86503657 0.00000000  00000-0  00000-0 0    01
    2 35937  57.9832 135.3255 0008504 170.0792 189.9207 12.83533774    09
    1 35938U 09052B   24243.82418646 0.00000000  00000-0  00000-0 0    01
    2 35938  57.9859 130.6386 0013788 275.8330  84.1669 12.74832043    03
    `;

  // Split the data into lines and parse it into satellite objects
  const satelliteLines = satelliteData.trim().split('\n');
  const satellites: SatelliteData[] = [];

  for (let i = 0; i < satelliteLines.length; i += 2) {
    const line1 = satelliteLines[i].trim();
    const line2 = satelliteLines[i + 1].trim();

    const satellite: SatelliteData = {
      id: line1.split(' ')[1],
      launchNumber: line1.split(' ')[0],
      epochDate: line2.substring(18, 32),
      inclination: line2.substring(8, 16),
      rightAscension: line2.substring(17, 25),
      eccentricity: line2.substring(26, 33),
      perigee: line2.substring(34, 42),
      anomaly: line2.substring(43, 51),
      motion: line2.substring(52, 63),
      revNumber: line2.substring(64, 68),
    };



    console.log(satellites); satellites.push(satellite);
  }

  // // Find the satellite data by ID
  res.status(404).json({ error: 'Satellite not found' });
  return;
    }

  try {
    // Call the external API to fetch a this satellite
    co

    console.log(response);nst response = await fetch(
      `https://www.n2yo.com/inc/all.php?s=${process.env.SAT_ID}`
    );

    //     // let items: string = await response.text()

    console.log(items);
      // const locationData = await response.json();

      // Return the satellite location
      res.status(200).json({
      satellite,
      location: locationData,
      // });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching satellite location' });

      handler().then(() => console.log("DONE 🥵"));
    }
  }
  */