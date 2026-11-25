import {date_to_string, excelDateToJSDate} from "@/lib/my-utils";
import * as XLSX from "xlsx";
import {projectPosTemplate} from "./excel-project-pos";
import {marinePosTemplate} from "./excel-marine-pos";

type CellType = {
  r: number,
  c: number,
  type?: string
}

const sheetToCells = (worksheet: any) => {
  const rows: any = [];
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    let row = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (cell) {
        row.push({
          r: R,
          c: C,
          value: cell.v,
        });
      }
    }
    rows.push(row);
  }
  return rows;
}

export const checkExcelTemplateType = (worksheet: any) => {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const rowEnd = range.e.r;
  const colEnd = range.e.c;

  if((rowEnd < 3) || (colEnd < 3)) {
    return "unknown";
  }

  let isProject = false;
  try {
    const projectIdentified = getCellValue(worksheet, {r: 0, c: 0, type: "text"});
    if ((projectIdentified.toLowerCase()).includes("daily report")) {
      isProject = true;
    }
  } catch (e) {
  }

  let isMarine = false;
  try {
    const projectIdentified = getCellValue(worksheet, {r: 0, c: 2, type: "text"});
    if ((projectIdentified.toLowerCase()).includes("marine")) {
      isMarine = true;
    }
  } catch (e) {
  }

  if(isProject) {
    return "project";
  }

  if(isMarine) {
    return "marine";
  }

  return "unknown";
}

export const getCellValue = (worksheet: any, pos: CellType) => {
  const cellAddress = XLSX.utils.encode_cell({r: pos.r, c: pos.c});
  const cell = worksheet[cellAddress];

  try {
    if (pos?.type === "date") {
      return date_to_string(excelDateToJSDate(cell.v));
    } else if (pos?.type === "text") {
      if(!cell.v) {

      }
      if(cell.v === 0) {
        return "";
      }
    }
    if (cell.v === null) {
      return "";
    }
  }
  catch (e) {
    return cell?.v ?? "";
  }
  return cell.v;
}

export const importProjectExcel = (worksheet: any) => {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  // ---------------- IDENTITY -----------------
  let identity = {
    instansi: "PHE OSES",
    formType: "project",
    subtype: "",
    reportDate: new Date(),
    reportedBy: "",
    subtypeName: "",
  }

  Object.keys(projectPosTemplate.identity).forEach((key) => {
    (identity as any)[key] = getCellValue(worksheet, (projectPosTemplate.identity as any)[key]);
  });
  identity["reportDate"] = new Date(identity["reportDate"]);
  identity["subtype"] = "";
  identity["subtypeName"] = (identity["subtypeName"] ?? "").replace("-", "").replace("  ", " ");

  // ---------------- LAGGING -----------------
  let lagging = {}
  Object.keys(projectPosTemplate.lagging).forEach((key) => {
    (lagging as any)[key] = getCellValue(worksheet, (projectPosTemplate.lagging as any)[key]);
  });

  // ---------------- MANHOURS -----------------
  let manhours = {}
  Object.keys(projectPosTemplate.manhours).forEach((key) => {
    (manhours as any)[key] = getCellValue(worksheet, (projectPosTemplate.manhours as any)[key]);
  });

  // ---------------- MEETING -----------------
  let meeting = {}
  Object.keys(projectPosTemplate.meeting).forEach((key) => {
    (meeting as any)[key] = getCellValue(worksheet, (projectPosTemplate.meeting as any)[key]);
  });

  // ---------------- DRILL -----------------
  let drill = {}
  Object.keys(projectPosTemplate.drill).forEach((key) => {
    (drill as any)[key] = getCellValue(worksheet, (projectPosTemplate.drill as any)[key]);
  });

  // ---------------- TRAINING -----------------
  let training = {}
  Object.keys(projectPosTemplate.training).forEach((key) => {
    (training as any)[key] = getCellValue(worksheet, (projectPosTemplate.training as any)[key]);
  });

  // ---------------- INSPECTION -----------------
  let inspection = {}
  Object.keys(projectPosTemplate.inspection).forEach((key) => {
    (inspection as any)[key] = getCellValue(worksheet, (projectPosTemplate.inspection as any)[key]);
  });

  // ---------------- SMART CARD -----------------
  let smartCard = {}
  Object.keys(projectPosTemplate.smartCard).forEach((key) => {
    (smartCard as any)[key] = getCellValue(worksheet, (projectPosTemplate.smartCard as any)[key]);
  });

  // ---------------- DAILY HIGHLIGHT -----------------
  let dailyHighlights = {}
  Object.keys(projectPosTemplate.dailyHighlights).forEach((key) => {
    (dailyHighlights as any)[key] = getCellValue(worksheet, (projectPosTemplate.dailyHighlights as any)[key]);
  });

  // ---------------- PERMIT TO WORK -----------------
  let permitToWork = {}
  Object.keys(projectPosTemplate.permitToWork).forEach((key) => {
    (permitToWork as any)[key] = getCellValue(worksheet, (projectPosTemplate.permitToWork as any)[key]);
  });

  // add overstay personnel list
  let overstayPersonnel = [];
  for(let i=39; i <= range.e.r; i++) {
    let name = getCellValue(worksheet, {r: i, c: 7});
    let company = getCellValue(worksheet, {r: i, c: 10});
    let dob = getCellValue(worksheet, {r: i, c: 13});
    if(name === "" || name === 0) {
      break;
    }
    else {
      overstayPersonnel.push({
        name,
        company,
        dob
      })
    }
  }
  (dailyHighlights as any)["overstayPersonnel"] = overstayPersonnel;

  return {
    identity,
    lagging,
    manhours,
    meeting,
    drill,
    training,
    inspection,
    smartCard,
    dailyHighlights,
    permitToWork
  }
}

export const importMarineExcel = (worksheet: any) => {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  // ---------------- IDENTITY -----------------
  let identity = {
    instansi: "PHE OSES",
    formType: "marine",
    subtype: "",
    reportDate: new Date(),
    reportedBy: "",
  }

  Object.keys(marinePosTemplate.identity).forEach((key) => {
    (identity as any)[key] = getCellValue(worksheet, (marinePosTemplate.identity as any)[key]);
  });
  identity["reportDate"] = new Date(identity["reportDate"]);
  identity["subtype"] = "";

  // ---------------- LAGGING -----------------
  let lagging = {}
  Object.keys(marinePosTemplate.lagging).forEach((key) => {
    (lagging as any)[key] = getCellValue(worksheet, (marinePosTemplate.lagging as any)[key]);
  });

  // ---------------- OPERATIONS -----------------
  let operation = [];
  for(let i=0; i<3; i++) {
    let item = {};
    Object.keys(marinePosTemplate.operation).forEach((key) => {
      let items: any[] = (marinePosTemplate.operation as any)[key];
      (item as any)[key] = getCellValue(worksheet, items[i]);
    });
    operation.push(item);
  }

  // ---------------- SMART CARD -----------------
  let smartCard = {}
  Object.keys(marinePosTemplate.smartCard).forEach((key) => {
    (smartCard as any)[key] = getCellValue(worksheet, (marinePosTemplate.smartCard as any)[key]);
  });

  let result: Record<string, any> = {
    identity,
    lagging,
    operation: operation,
    smartCard: smartCard
  }

  return result
}