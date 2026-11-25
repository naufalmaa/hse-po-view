import {checkExpiry} from "../services/employee/alarm.engine.ts";
import {certificates, contracts, mcus, sika} from "../db/schema/employee.schema.ts";
import {runCSMSNotificationChecks} from "../services/csms/notification.service.ts";

export async function runExpiryCheckJobs() {
  await checkExpiry(mcus, 'mcuExpiredDate', 'mcu');
  await checkExpiry(contracts, 'expiredDate', 'contract');
  await checkExpiry(contracts, 'expiredDateCompany', 'contract_company');
  await checkExpiry(certificates, 'expiredDate', 'certificate');
  await checkExpiry(sika, 'expiredDate', 'sika');
  await runCSMSNotificationChecks();
}