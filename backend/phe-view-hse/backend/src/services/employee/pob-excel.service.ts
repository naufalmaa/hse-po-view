import XLSX from 'xlsx';

export interface POBData {
  NAME: string;
  'E-PASPORT': string;
  DEPARTMENT: string;
  COMPANY: string;
}

export async function readPOBOffshoreExcel(data: string | Buffer): Promise<POBData[]> {
  const workbook = typeof data === 'string' ? XLSX.readFile(data) : XLSX.read(data);
  const results: POBData[] = [];
  
  const targetDepartments = [
    'PRODUCTION OPERATOR',
    'Production h Operation',
    'Production & Operation'
  ];

  const excludedSheet = 'TABEL POPULASI';

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === excludedSheet) continue;

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

    for (const row of jsonData) {
      const dept = (row['DEPARTMENT'] || row['DEPARTMEN'] || row['Dept'] || '')?.toString().trim();
      
      if (targetDepartments.includes(dept)) {
        const name = (row['EMPLOYEE NAME'] || row['NAME'] || row['Name'] || '')?.toString().trim();
        const epasport = (row['BARCODE ID'] || row['E-PASPORT'] || row['EPASPORT'] || row['Passport'] || '')?.toString().trim();
        const company = (row['COMPANY'] || row['Company'] || '')?.toString().trim();
        
        results.push({
          NAME: name,
          'E-PASPORT': epasport,
          DEPARTMENT: dept,
          COMPANY: company
        });
      }
    }
  }

  return results;
}
