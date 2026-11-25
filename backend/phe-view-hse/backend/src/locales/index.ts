import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadJson(filePath: string) {
  try {
    return JSON.parse(readFileSync(path.join(__dirname, filePath), 'utf-8'));
  } catch (error) {
    console.error(`Failed to load locale file: ${filePath}`, error);
    return {};
  }
}

export const idMessages = {
  auth: loadJson('id/auth.json'),
  admin: loadJson('id/admin.json'),
  profile: loadJson('id/profile.json'),
  user: {
    ...loadJson('id/user/common.json'),
    contractor: loadJson('id/user/contractor.json'),
    csms: {
      dashboard: loadJson('id/user/csms/dashboard.json'),
      activities: loadJson('id/user/csms/activities.json'),
      contract: {
        ...loadJson('id/user/csms/contract/common.json'),
        file: loadJson('id/user/csms/contract/file.json'),
        folder: loadJson('id/user/csms/contract/folder.json'),
        assessment: loadJson('id/user/csms/contract/assessment.json'),
      },
      guideline: loadJson('id/user/csms/guideline.json'),
      qualification: loadJson('id/user/csms/qualification.json'),
      risk: loadJson('id/user/csms/risk.json'),
    },
    dailyReport: loadJson('id/user/daily-report.json'),
    employee: loadJson('id/user/employee.json'),
    smartCard: loadJson('id/user/smart-card.json'),
  },
};

export const enMessages = loadJson('en.json');
