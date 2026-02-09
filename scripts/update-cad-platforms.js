const fs = require('fs');
const path = require('path');

// Read the current county data
const dataPath = path.join(__dirname, '../data/texas-counties.json');
const counties = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// CAD platform mappings - most Texas counties use True Automation
// Client IDs discovered via research
const cadPlatformUpdates = {
  // Priority counties
  'Van Zandt': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=231',
    cadClientId: '231',
    lookupSupported: true,
  },
  'Kaufman': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=61',
    cadClientId: '61',
    lookupSupported: true,
  },
  'Henderson': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=49',
    cadClientId: '49',
    lookupSupported: true,
  },
  'Smith': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=188',
    cadClientId: '188',
    lookupSupported: true,
  },
  
  // Major metro counties
  'Bexar': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=110',
    cadClientId: '110',
    lookupSupported: true,
  },
  'Dallas': {
    cadPlatform: 'custom',
    cadSearchUrl: 'https://www.dallascad.org/SearchAddr.aspx',
    lookupSupported: false, // Custom platform, needs specific implementation
  },
  'Tarrant': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=220',
    cadClientId: '220',
    lookupSupported: true,
  },
  'Harris': {
    cadPlatform: 'custom',
    cadSearchUrl: 'https://public.hcad.org/records/quicksearch.asp',
    lookupSupported: false, // Custom platform
  },
  'Travis': {
    cadPlatform: 'custom',
    cadSearchUrl: 'https://stage.travis.prodigycad.com/',
    lookupSupported: false, // Custom platform
  },
  'Collin': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=24',
    cadClientId: '24',
    lookupSupported: true,
  },
  'Denton': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=27',
    cadClientId: '27',
    lookupSupported: true,
  },
  'Ellis': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=31',
    cadClientId: '31',
    lookupSupported: true,
  },
  'Fort Bend': {
    cadPlatform: 'custom',
    cadSearchUrl: 'https://esearch.fbcad.org/Property',
    lookupSupported: false,
  },
  'Galveston': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=42',
    cadClientId: '42',
    lookupSupported: true,
  },
  'Williamson': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=249',
    cadClientId: '249',
    lookupSupported: true,
  },
  'Hays': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=48',
    cadClientId: '48',
    lookupSupported: true,
  },
  'Rockwall': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=172',
    cadClientId: '172',
    lookupSupported: true,
  },
  'Comal': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=23',
    cadClientId: '23',
    lookupSupported: true,
  },
  'Montgomery': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=135',
    cadClientId: '135',
    lookupSupported: true,
  },
  'Brazoria': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=11',
    cadClientId: '11',
    lookupSupported: true,
  },
  'Guadalupe': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=44',
    cadClientId: '44',
    lookupSupported: true,
  },
  'Johnson': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=59',
    cadClientId: '59',
    lookupSupported: true,
  },
  'Parker': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=148',
    cadClientId: '148',
    lookupSupported: true,
  },
  'Gregg': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=43',
    cadClientId: '43',
    lookupSupported: true,
  },
  'Bell': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=6',
    cadClientId: '6',
    lookupSupported: true,
  },
  'Nueces': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=143',
    cadClientId: '143',
    lookupSupported: true,
  },
  'Lubbock': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=124',
    cadClientId: '124',
    lookupSupported: true,
  },
  'El Paso': {
    cadPlatform: 'custom',
    cadSearchUrl: 'https://www.epcad.org/propertysearch',
    lookupSupported: false,
  },
  'Hidalgo': {
    cadPlatform: 'custom',
    cadSearchUrl: 'https://www.hidalgoad.org/search',
    lookupSupported: false,
  },
  'Cameron': {
    cadPlatform: 'trueAutomation',
    cadSearchUrl: 'https://propaccess.trueautomation.com/clientdb/?cid=15',
    cadClientId: '15',
    lookupSupported: true,
  },
};

// Update counties
let updatedCount = 0;
counties.forEach(county => {
  if (cadPlatformUpdates[county.name]) {
    county.cad = {
      ...county.cad,
      ...cadPlatformUpdates[county.name],
    };
    updatedCount++;
    console.log(`✓ Updated ${county.name} County`);
  }
});

// Write updated data back to file
fs.writeFileSync(dataPath, JSON.stringify(counties, null, 2), 'utf8');

console.log(`\n✅ Updated ${updatedCount} counties with CAD platform information`);
console.log(`📝 ${counties.length} total counties in database`);
