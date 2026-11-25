import signIn from './sign-in-locale'
import admin from './admin-locale'
import contractorVessel from './contractor-vessel-locale'
import contractors from './contractors-locale'
import message from './message-locale'
import labels from './labels-locale'
import dialog from './dialog-locale'
import shared from './shared-locale'
import subTypes from './sub-types-locale'
import vessels from './vessels-locale'
import notification from './notification-locale'
import employee from './employee-locale'
import employeeList from './employee-list-locale'
import smartCard from './smart-card-locale'
import smartCardValidation from './smart-card-validation-locale'
import smartCardUpload from './smart-card-upload-locale'
import hsePerformance from './hse-performance-locale'
import dailyReport from './daily-report-locale'
import dailyActivity from './daily-activity-locale'
import guidelines from './guidelines-locale'
import qualification from './qualification-locale'
import contractManagement from './contract-management-locale'
import csms from './csms-locale'
import user from './user-locale'
import contractList from './contract-list-locale'
import pobUpdate from './pob-update-locale';
import pobUnmatchedLogs from './pob-unmatched-logs-locale';
import pobUnmatchedDetails from './pob-unmatched-details-locale';
import employeeLogin from './employee-login';
import employeesAttendance from './employees-attendance';
import attendanceList from './attendance-list';
import attendance from './attendance';


const localeId = {
  translation: {
    shared: shared,
    dialog: dialog,
    labels: labels,
    message: message,
    signIn: signIn,
    admin: admin,
    contractorVessel: contractorVessel,
    contractors: contractors,
    subTypes: subTypes,
    vessels: vessels,
    notification: notification,
    employee: employee,
    employeeList: employeeList,
    smartCard: smartCard,
    smartCardValidation: smartCardValidation,
    smartCardUpload: smartCardUpload,
    hsePerformance: hsePerformance,
    dailyReport: dailyReport,
    dailyActivity: dailyActivity,
    guidelines: guidelines,
    qualification: qualification,
    contractManagement: contractManagement,
    csms: csms,
    user: user,
    contractList: contractList,
    pobUpdate: pobUpdate,
    pobUnmatchedLogs: pobUnmatchedLogs,
    pobUnmatchedDetails: pobUnmatchedDetails,
    employeeLogin: employeeLogin,
    employeesAttendance: employeesAttendance,
    attendanceList: attendanceList,
    attendance: attendance,
  }
}

export default {
  language: 'id',
  country: 'id',
  name: 'Indonesia',
  embeddedLocale: localeId
}