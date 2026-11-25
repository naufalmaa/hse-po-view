export const extractMarineTableEMl = (html: string, tableKey: string) => {
  // Use DOMParser (built into modern Node or browsers)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result: { boat: string; activity: string }[] = [];

  // Find all tables
  const tables = Array.from(doc.querySelectorAll("table"));

  // Find the table that contains "SOUTH AREA"
  const southTable = tables.find((table) => table.textContent?.includes(tableKey));

  if (southTable) {
    // Loop through all rows (skip header row)
    const rows = Array.from(southTable.querySelectorAll("tr")).slice(1);

    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 5) {
        const boatCell = cells[3];
        const activityCell = cells[4];

        // Get all <span> or <p> items inside the BOAT and ACTIVITY cells
        const boatElements = Array.from(boatCell.querySelectorAll("span"));
        const activityElements = Array.from(activityCell.querySelectorAll("span"));

        // Pair up boats and activities by order - each boat element corresponds to an activity element
        const maxLen = Math.max(boatElements.length, activityElements.length);
        for (let i = 0; i < maxLen; i++) {
          const boatElement = boatElements[i];
          const activityElement = activityElements[i];
          
          const boat = boatElement?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const activity = activityElement?.textContent?.replace(/\s+/g, " ").trim() ?? "";
          
          if (boat || activity) result.push({ boat, activity });
        }
      }
    }
  }
  return result;
}

interface RowData {
  boat: string;
  activity: string;
}

/**
 * Convert structured JSON (boat/activity) into text format.
 * @param data Array of { boat, activity } objects
 * @returns Multi-line string in "boat - activity" format
 */
export function convertListJsonVesselToText(data: RowData[]): string {
  return data
    .map(({ boat, activity }) => `${boat || ""} - ${activity || ""}`.trim())
    .filter(line => line !== "-") // remove empty rows
    .join("\n");
}

/**
 * Convert structured JSON (boat/activity) into text format with only activities.
 * @param data Array of { boat, activity } objects
 * @returns Multi-line string with only activity values
 */
export function convertListJsonVesselToActivityText(data: RowData[]): string {
  return data
    .map(({ activity }) => activity?.trim() || "")
    .filter(line => line !== "") // remove empty rows
    .filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
    .map(activity => `- ${activity}`) // add - prefix
    .join("\n");
}

/**
 * Separates marine weather data into CBU, NBU, and SBU regions based on latitude
 * @param regionWeather Array of weather data objects with latitude property
 * @param regionSeaLevel Array of sea level data objects with latitude property
 * @returns Object containing separated data for each region
 */
export function separateMarineRegions(regionWeather: any[], regionSeaLevel: any[]) {
  // Separate SBU (latitude < -5.4)
  const sbuWeather = regionWeather?.find((item: any) => item.latitude < -5.4);
  const sbuSeaLevel = regionSeaLevel?.find((item: any) => item.latitude < -5.4);
  
  // Separate NBU (latitude > -4.9)
  const nbuWeather = regionWeather?.find((item: any) => item.latitude > -4.9);
  const nbuSeaLevel = regionSeaLevel?.find((item: any) => item.latitude > -4.9);
  
  // Separate CBU (between -5.4 and -4.9)
  const cbuWeather = regionWeather?.find((item: any) => ((item.latitude > -5.4) && (item.latitude < -4.9)));
  const cbuSeaLevel = regionSeaLevel?.find((item: any) => ((item.latitude > -5.4) && (item.latitude < -4.9)));
  
  return {
    sbu: {
      weather: sbuWeather,
      seaLevel: sbuSeaLevel
    },
    nbu: {
      weather: nbuWeather,
      seaLevel: nbuSeaLevel
    },
    cbu: {
      weather: cbuWeather,
      seaLevel: cbuSeaLevel
    }
  };
}
