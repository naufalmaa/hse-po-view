import { db } from '../../db/index.ts';
import { contract, contractFolder, qualification_assessment, alarmCsmsLog } from '../../db/schema/csms.schema.ts';
import { users, userContractors, userAlarmLog, subContractors } from '../../db/schema/auth.schema.ts';
import { getQualificationExpiryStatus } from './qualification/expiry-check.service.ts';
import { getContractExpiryStatus } from './contract/expiry-check.service.ts';
import { eq, and } from 'drizzle-orm';
import EmailService from './email.service.ts';

/**
 * Check qualification assessment expirations and create notifications
 * This function checks for qualifications that will expire in exactly 2 months (60 days)
 * and creates notifications for admin users and contractor users
 */
export async function checkQualificationNotifications() {
  try {
    console.info('Starting qualification notification check...');
    
    // Get all qualification assessments
    const qualifications = await db
      .select({
        id: qualification_assessment.id,
        contractorId: qualification_assessment.contractorId,
        title: qualification_assessment.title,
        expiredDate: qualification_assessment.expiredDate,
      })
      .from(qualification_assessment);
  
    // Collect all qualification notifications to be sent
    const qualificationNotifications = [];
    
    // Process each qualification that needs notification
    for (const qual of qualifications) {
      try {
        const status = await getQualificationExpiryStatus(qual.expiredDate);
        // Only process qualifications with warning status
        if (status !== 'warning') {
          continue;
        }

        // Calculate days until expiry
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        const expiryDate = new Date(qual.expiredDate);
        expiryDate.setHours(0, 0, 0, 0);
        
        const timeDiff = expiryDate.getTime() - todayDate.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Check if a similar alarm already exists for this qualification
        const existingAlarms = await db
          .select()
          .from(alarmCsmsLog)
          .where(and(
            eq(alarmCsmsLog.contractorId, qual.contractorId),
            eq(alarmCsmsLog.type, 'certificate'),
            eq(alarmCsmsLog.title, 'Certificate e-CHSEMS Expiry'),
            eq(alarmCsmsLog.description, `${qual.title} akan kedaluwarsa dalam ${daysUntilExpiry} hari`)
          ))
          .limit(1);

        // If similar alarm exists, skip creating a new one
        if (existingAlarms.length > 0) {
          continue;
        }

        // Get contractor name
        const contractorResult = await db
          .select({ name: subContractors.name })
          .from(subContractors)
          .where(eq(subContractors.id, qual.contractorId));
        
        const contractorName = contractorResult && contractorResult.length > 0 
          ? contractorResult[0].name 
          : 'Unknown Contractor';

        // Create alarm log entry
        const [{ id: alarmId }] = await db
          .insert(alarmCsmsLog)
          .values({
            contractorId: qual.contractorId,
            type: 'certificate',
            title: 'Certificate e-CHSEMS Expiry',
            description: `${qual.title} akan kedaluwarsa dalam ${daysUntilExpiry} hari`,
            status: 'warning',
          })
          .returning({ id: alarmCsmsLog.id });

        // Get target users (admin + contractor users)
        const targetUsers = await getQualificationNotificationRecipients(qual.contractorId);

        // Insert user alarm logs
        if (targetUsers.length > 0) {
          const userAlarms = targetUsers.map(userId => ({
            alarmCsmsId: alarmId, // Use the correct field name
            alarmEmployeeId: null, // Null for CSMS alarms
            userId,
          }));
          
          await db.insert(userAlarmLog).values(userAlarms);
        }
        
        // Send individual notifications to contractor users
        // Get contractor users with emailVerified = true for this specific contractor
        const contractorRecipients = await db
          .select({
            email: users.email,
            name: users.name,
          })
          .from(users)
          .leftJoin(userContractors, eq(users.id, userContractors.userId))
          .where(and(
            eq(users.emailVerified, true),
            eq(users.role, 'contractor'),
            eq(userContractors.contractorId, qual.contractorId)
          ));
        
        // Filter valid email recipients
        const contractorEmailRecipients = contractorRecipients
          .filter(r => r.email && r.email.includes('@'))
          .map(r => ({ email: r.email, name: r.name }));
        
        // Send individual notifications to contractor users
        if (contractorEmailRecipients.length > 0) {
          const notification = {
            contractorName: contractorName,
            title: qual.title,
            expiredDate: expiryDate,
            daysUntilExpiry,
          };

          await EmailService.sendQualificationExpiryNotification(
            contractorEmailRecipients.map(r => ({ email: r.email as string, name: r.name })),
            notification
          );
        }
        
        // Collect notification data for grouping (for admin users)
        qualificationNotifications.push({
          contractorName,
          title: qual.title,
          expiredDate: expiryDate,
          daysUntilExpiry,
        });
      } catch (error) {
        console.error(`Error processing qualification notification ${qual.id}:`, error);
      }
    }
    
    // Send grouped qualification notifications to admin users
    if (qualificationNotifications.length > 0) {
      // Get admin users with emailVerified = true
      const adminRecipients = await db
        .select({
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(and(
          eq(users.emailVerified, true),
          eq(users.role, 'admin')
        ));
      
      // Filter valid email recipients
      const emailRecipients = adminRecipients
        .filter(r => r.email && r.email.includes('@'))
        .map(r => ({ email: r.email as string, name: r.name }));
      
      // Send grouped notifications
      if (emailRecipients.length > 0) {
        await EmailService.sendGroupedQualificationExpiryNotifications(
          emailRecipients.map(r => ({ email: r.email as string, name: r.name })),
          { notifications: qualificationNotifications }
        );
      }
    }
    
    console.info('Qualification notification check completed.');
  } catch (error) {
    console.error('Error in qualification notification check:', error);
    throw error;
  }
}

/**
 * Get users who should receive qualification expiry notifications
 * - All admin users
 * - Contractor users associated with the subcontractor
 */
export async function getQualificationNotificationRecipients(contractorId: string): Promise<string[]> {
  // Get all users with roles
  const allUsers = await db
    .select({
      userId: users.id,
      role: users.role,
      contractorId: userContractors.contractorId,
    })
    .from(users)
    .leftJoin(userContractors, eq(users.id, userContractors.userId));

  // Filter target users
  const targetUsers = allUsers
    .filter(u => {
      // Always include admin users
      if (u.role === 'admin') return true;
      
      // Include contractor users associated with this subcontractor
      if (u.role === 'contractor' && u.contractorId === contractorId) {
        return true;
      }
      
      // Exclude all other roles (crew, etc.)
      return false;
    })
    .map(u => u.userId);

  return targetUsers;
}

/**
 * Check assessment folder notifications for upcoming deadlines
 * Focuses only on assessment folders (PB/PA) for H-1 month and weekly notifications
 */
export async function checkContractFolderNotifications() {
  try {
    console.info('Starting contract folder notification check...');
    
    // Skip contract end date checks and go directly to assessment folder notifications
    await checkAssessmentFolderNotifications();
    
    console.info('Contract folder notification check completed.');
  } catch (error) {
    console.error('Error in contract folder notification check:', error);
    throw error;
  }
}

/**
 * Check assessment folders (PB/PA) for H-30 notifications and weekly reminders
 * Creates notifications for incomplete PB (Penilaian Berjalan) and PA (Penilaian Akhir) folders
 * Sends initial notification at H-30 and continues with weekly notifications until assessment date passes
 * Only notifies for future dates, not past dates
 */
async function checkAssessmentFolderNotifications() {
  try {
    console.info('Starting assessment folder notification check...');

    // Get all contracts with their assessment dates
    const contracts = await db
      .select({
        id: contract.id,
        contractorId: contract.contractorId,
        title: contract.title,
        startDate: contract.startDate,
        endDate: contract.endDate,
        nearestOngoingAssessmentDate: contract.nearestOngoingAssessmentDate,
        finalAssessmentDate: contract.finalAssessmentDate,
      })
      .from(contract);

    // Collect all assessment notifications to be sent
    const assessmentNotifications = [];
    // Also collect individual notifications for contractor users
    const individualAssessmentNotifications = [];
    
    // Process each contract
    for (const contractItem of contracts) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get contractor name
        const contractorResult = await db
          .select({ name: subContractors.name })
          .from(subContractors)
          .where(eq(subContractors.id, contractItem.contractorId));
        
        const contractorName = contractorResult && contractorResult.length > 0 
          ? contractorResult[0].name 
          : 'Unknown Contractor';

        // Check ongoing assessment dates (PB folders) - check for H-30 notifications and weekly reminders and weekly reminders
        if (contractItem.nearestOngoingAssessmentDate && Array.isArray(contractItem.nearestOngoingAssessmentDate)) {
          for (const assessmentDate of contractItem.nearestOngoingAssessmentDate) {
            const pbDate = new Date(assessmentDate);
            pbDate.setHours(0, 0, 0, 0);
            
            // Calculate days until assessment date
            const timeDiff = pbDate.getTime() - today.getTime();
            const daysUntilAssessment = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            // Only process future dates (not past dates)
            if (daysUntilAssessment < 0) {
              continue;
            }
            
            // Check if it's exactly H-30 (30 days before) or weekly intervals (every 7 days)
            // Continue notifying weekly until the assessment date passes
            const shouldNotify = daysUntilAssessment === 30 || 
                               (daysUntilAssessment % 7 === 0 && daysUntilAssessment < 30) ||
                               (daysUntilAssessment < 30 && daysUntilAssessment > 0);
            
            // Process dates that should trigger notifications
            if (shouldNotify) {
              // Get the corresponding PB folder
              const formattedDate = `${String(pbDate.getDate()).padStart(2, '0')}-${String(pbDate.getMonth() + 1).padStart(2, '0')}-${pbDate.getFullYear()}`;
              const pbFolderName = `${formattedDate} - PB`;
              
              const pbFolders = await db
                .select()
                .from(contractFolder)
                .where(and(
                  eq(contractFolder.contractId, contractItem.id),
                  eq(contractFolder.name, pbFolderName)
                ));
              
              // Process each PB folder (there should be only one)
              for (const pbFolder of pbFolders) {
       
                // Check if folder is incomplete
                if (pbFolder.isComplete === false) {
                  // Create alarm message for PB folder
                  const message = daysUntilAssessment === 0 
                    ? `Folder penilaian berjalan "${pbFolder.name}" mencapai batas waktu hari ini`
                    : `Folder penilaian berjalan "${pbFolder.name}" akan mencapai batas waktu dalam ${daysUntilAssessment} hari`;
                  
                  // Check if a similar alarm already exists for this specific date
                  // But allow notifications to be sent weekly even if similar alarms exist
                  const existingAlarms = await db
                    .select()
                    .from(alarmCsmsLog)
                    .where(and(
                      eq(alarmCsmsLog.contractorId, contractItem.contractorId),
                      eq(alarmCsmsLog.type, 'assessment'),
                      eq(alarmCsmsLog.title, 'Assessment Folder Deadline'),
                      eq(alarmCsmsLog.description, message)
                    ))
                    .limit(1);
                  
                  // If similar alarm exists, skip creating a new one
                  if (existingAlarms.length > 0) {
                    continue;
                  }
                  
                  // Create alarm log entry
                  const [{ id: alarmId }] = await db
                    .insert(alarmCsmsLog)
                    .values({
                      contractorId: contractItem.contractorId,
                      contractId: contractItem.id, // Add contract ID
                      type: 'assessment',
                      title: 'Assessment Folder Deadline',
                      description: message,
                      status: daysUntilAssessment === 0 ? 'expired' : 'warning',
                    })
                    .returning({ id: alarmCsmsLog.id });
                  
                  // Get target users (admin + contractor users)
                  const targetUsers = await getContractNotificationRecipients(contractItem.contractorId);

                  // Insert user alarm logs
                  if (targetUsers.length > 0) {
                    const userAlarms = targetUsers.map(userId => ({
                      alarmCsmsId: alarmId,
                      alarmEmployeeId: null,
                      userId,
                    }));
                    
                    await db.insert(userAlarmLog).values(userAlarms);
                  }
                  
                  // Collect notification data for grouping (for admin users)
                  assessmentNotifications.push({
                    contractorName: contractorName,
                    contractName: contractItem.title,
                    folderName: pbFolder.name,
                    assessmentDate: pbDate,
                    daysUntilAssessment,
                    assessmentType: 'Penilaian Berjalan (PB)'
                  });
                  
                  // Collect notification data for individual notifications (for contractor users)
                  individualAssessmentNotifications.push({
                    contractorId: contractItem.contractorId,
                    notification: {
                      contractorName: contractorName,
                      contractName: contractItem.title,
                      folderName: pbFolder.name,
                      assessmentDate: pbDate,
                      daysUntilAssessment,
                      assessmentType: 'Penilaian Berjalan (PB)'
                    }
                  });
                } else {
                  console.info(`PB folder ${pbFolder.name} is already complete, skipping notification`);
                }
              }
              
              // Log if no folders were found
              if (pbFolders.length === 0) {
                console.info(`No PB folder found for date: ${pbFolderName}`);
              }
            }
          }
        }
        
        // Check final assessment date (PA folder) - check for H-30 notifications and weekly reminders and weekly reminders
        if (contractItem.finalAssessmentDate) {
          const finalDate = new Date(contractItem.finalAssessmentDate);
          finalDate.setHours(0, 0, 0, 0);
          
          // Calculate days until final assessment date
          const timeDiff = finalDate.getTime() - today.getTime();
          const daysUntilFinalAssessment = Math.ceil(timeDiff / (1000 * 3600 * 24));     
          
          // Only process future dates (not past dates)
          if (daysUntilFinalAssessment < 0) {
            continue;
          }
          
          // Check if it's exactly H-30 (30 days before) or weekly intervals (every 7 days)
          // Continue notifying weekly until the assessment date passes
          const shouldNotify = daysUntilFinalAssessment === 30 || 
                             (daysUntilFinalAssessment % 7 === 0 && daysUntilFinalAssessment < 30) ||
                             (daysUntilFinalAssessment < 30 && daysUntilFinalAssessment > 0);
          
          // Process dates that should trigger notifications
          if (shouldNotify) {
            // Get the corresponding PA folder
            const formattedDate = `${String(finalDate.getDate()).padStart(2, '0')}-${String(finalDate.getMonth() + 1).padStart(2, '0')}-${finalDate.getFullYear()}`;
            const paFolderName = `${formattedDate} - PA`;
            
            const paFolders = await db
              .select()
              .from(contractFolder)
              .where(and(
                eq(contractFolder.contractId, contractItem.id),
                eq(contractFolder.name, paFolderName)
              ));
            
            // Process each PA folder (there should be only one)
            for (const paFolder of paFolders) {

              // Check if folder is incomplete
              if (paFolder.isComplete === false) {
                // Create alarm message for PA folder
                const message = daysUntilFinalAssessment === 0 
                  ? `Folder penilaian akhir "${paFolder.name}" mencapai batas waktu hari ini`
                  : `Folder penilaian akhir "${paFolder.name}" akan mencapai batas waktu dalam ${daysUntilFinalAssessment} hari`;
                
                // Check if a similar alarm already exists for this specific date
                // But allow notifications to be sent weekly even if similar alarms exist
                const existingAlarms = await db
                  .select()
                  .from(alarmCsmsLog)
                  .where(and(
                    eq(alarmCsmsLog.contractorId, contractItem.contractorId),
                    eq(alarmCsmsLog.type, 'assessment'),
                    eq(alarmCsmsLog.title, 'Assessment Folder Deadline'),
                    eq(alarmCsmsLog.description, message)
                  ))
                  .limit(1);
                
                // If similar alarm exists, skip creating a new one
                if (existingAlarms.length > 0) {
                  continue;
                }
                
                // Create alarm log entry
                const [{ id: alarmId }] = await db
                  .insert(alarmCsmsLog)
                  .values({
                    contractorId: contractItem.contractorId,
                    contractId: contractItem.id, // Add contract ID
                    type: 'assessment',
                    title: 'Assessment Folder Deadline',
                    description: message,
                    status: daysUntilFinalAssessment === 0 ? 'expired' : 'warning',
                  })
                  .returning({ id: alarmCsmsLog.id });
                
                // Get target users (admin + contractor users)
                const targetUsers = await getContractNotificationRecipients(contractItem.contractorId);
                            
                // Insert user alarm logs
                if (targetUsers.length > 0) {
                  const userAlarms = targetUsers.map(userId => ({
                    alarmCsmsId: alarmId,
                    alarmEmployeeId: null,
                    userId,
                  }));
                  
                  await db.insert(userAlarmLog).values(userAlarms);
                }
                
                // Collect notification data for grouping (for admin users)
                assessmentNotifications.push({
                  contractorName: contractorName,
                  contractName: contractItem.title,
                  folderName: paFolder.name,
                  assessmentDate: finalDate,
                  daysUntilAssessment: daysUntilFinalAssessment,
                  assessmentType: 'Penilaian Akhir (PA)'
                });
                
                // Collect notification data for individual notifications (for contractor users)
                individualAssessmentNotifications.push({
                  contractorId: contractItem.contractorId,
                  notification: {
                    contractorName: contractorName,
                    contractName: contractItem.title,
                    folderName: paFolder.name,
                    assessmentDate: finalDate,
                    daysUntilAssessment: daysUntilFinalAssessment,
                    assessmentType: 'Penilaian Akhir (PA)'
                  }
                });
              } else {
              }
            }
            
            // Log if no folders were found
            if (paFolders.length === 0) {
              console.info(`No PA folder found for date: ${paFolderName}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing contract assessment notification ${contractItem.id}:`, error);
      }
    }
    
    // Send grouped assessment notifications to admin users
    if (assessmentNotifications.length > 0) {
      // Get admin users with emailVerified = true
      const adminRecipients = await db
        .select({
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(and(
          eq(users.emailVerified, true),
          eq(users.role, 'admin')
        ));
      
      // Filter valid email recipients
      const emailRecipients = adminRecipients
        .filter(r => r.email && r.email.includes('@'))
        .map(r => ({ email: r.email as string, name: r.name }));
      
      // Send grouped notifications
      if (emailRecipients.length > 0) {
        await EmailService.sendGroupedAssessmentFolderNotifications(
          emailRecipients.map(r => ({ email: r.email as string, name: r.name })),
          { notifications: assessmentNotifications }
        );
      }
    }
    
    // Send individual assessment notifications to contractor users
    if (individualAssessmentNotifications.length > 0) {
      // Group notifications by contractorId
      const notificationsByContractor: { [key: string]: any[] } = {};
      individualAssessmentNotifications.forEach(item => {
        if (!notificationsByContractor[item.contractorId]) {
          notificationsByContractor[item.contractorId] = [];
        }
        notificationsByContractor[item.contractorId].push(item.notification);
      });
      
      // Send individual notifications to each contractor
      for (const contractorId in notificationsByContractor) {
        // Get contractor users with emailVerified = true for this specific contractor
        const contractorRecipients = await db
          .select({
            email: users.email,
            name: users.name,
          })
          .from(users)
          .leftJoin(userContractors, eq(users.id, userContractors.userId))
          .where(and(
            eq(users.emailVerified, true),
            eq(users.role, 'contractor'),
            eq(userContractors.contractorId, contractorId)
          ));
        
        // Filter valid email recipients
        const contractorEmailRecipients = contractorRecipients
          .filter(r => r.email && r.email.includes('@'))
          .map(r => ({ email: r.email as string, name: r.name }));
        
        // Send individual notifications to contractor users (one email per notification)
        const validContractorRecipients = contractorEmailRecipients.map(r => ({ email: r.email as string, name: r.name }));
        for (const notification of notificationsByContractor[contractorId]) {
          if (validContractorRecipients.length > 0) {
            await EmailService.sendAssessmentFolderNotification(validContractorRecipients, notification);
          }
        }
      }
    }
    
    console.info('Assessment folder notification check completed.');
  } catch (error) {
    console.error('Error in assessment folder notification check:', error);
    throw error;
  }
}

/**
 * Get users who should receive contract-related notifications (folder + expiry)
 * - All admin users
 * - Contractor users associated with the subcontractor
 */
async function getContractNotificationRecipients(contractorId: string): Promise<string[]> {
  // Get all users with roles
  const allUsers = await db
    .select({
      userId: users.id,
      role: users.role,
      contractorId: userContractors.contractorId,
    })
    .from(users)
    .leftJoin(userContractors, eq(users.id, userContractors.userId));

  // Filter target users
  const targetUsers = allUsers
    .filter(u => {
      // Always include admin users
      if (u.role === 'admin') return true;
      
      // Include contractor users associated with this subcontractor
      if (u.role === 'contractor' && u.contractorId === contractorId) {
        return true;
      }
      
      // Exclude all other roles (crew, etc.)
      return false;
    })
    .map(u => u.userId);

  return targetUsers;
}

/**
 * Check contract expirations and create notifications
 * This function checks for contracts that will expire in exactly 1 month (30 days)
 * and creates notifications for admin users and contractor users
 */
export async function checkContractExpiryNotifications() {
  try {
    console.info('Starting contract expiry notification check...');
    
    // Get all contracts
    const contracts = await db
      .select({
        id: contract.id,
        contractorId: contract.contractorId,
        title: contract.title,
        numberContract: contract.numberContract,
        endDate: contract.endDate,
      })
      .from(contract);
  
    // Process each contract that needs notification
    for (const cont of contracts) {
      try {
        const status = await getContractExpiryStatus(cont.endDate);
        // Only process contracts with warning status
        if (status !== 'warning') {
          continue;
        }

        // Calculate days until expiry
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        const expiryDate = new Date(cont.endDate);
        expiryDate.setHours(0, 0, 0, 0);
        
        const timeDiff = expiryDate.getTime() - todayDate.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Check if a similar alarm already exists for this contract
        const existingAlarms = await db
          .select()
          .from(alarmCsmsLog)
          .where(and(
            eq(alarmCsmsLog.contractId, cont.id),
            eq(alarmCsmsLog.type, 'contract'),
            eq(alarmCsmsLog.title, 'Contract Expiry'),
            eq(alarmCsmsLog.description, `${cont.title} (${cont.numberContract}) akan berakhir dalam ${daysUntilExpiry} hari`)
          ))
          .limit(1);

        // If similar alarm exists, skip creating a new one
        if (existingAlarms.length > 0) {
          continue;
        }

        // Get contractor name
        const contractorResult = await db
          .select({ name: subContractors.name })
          .from(subContractors)
          .where(eq(subContractors.id, cont.contractorId));
        const contractorName = contractorResult?.[0]?.name ?? 'Unknown Contractor';

        // Create alarm log entry
        const [{ id: alarmId }] = await db
          .insert(alarmCsmsLog)
          .values({
            contractorId: cont.contractorId,
            contractId: cont.id,
            type: 'contract',
            title: 'Contract Expiry',
            description: `${cont.title} (${cont.numberContract}) oleh ${contractorName} akan berakhir dalam ${daysUntilExpiry} hari`,
            status: 'warning',
          })
          .returning({ id: alarmCsmsLog.id });

        // Get target users (admin + contractor users)
        const targetUsers = await getContractNotificationRecipients(cont.contractorId);

        // Insert user alarm logs
        if (targetUsers.length > 0) {
          const userAlarms = targetUsers.map(userId => ({
            alarmCsmsId: alarmId,
            alarmEmployeeId: null,
            userId,
          }));
          
          await db.insert(userAlarmLog).values(userAlarms);
        }

        console.info(`Contract expiry notification created for: ${cont.title}`);
      } catch (error) {
        console.error(`Error processing contract expiry for ${cont.id}:`, error);
      }
    }
    
    console.info('Contract expiry notification check completed.');
  } catch (error) {
    console.error('Error in contract expiry notification check:', error);
    throw error;
  }
}

/**
 * Run all CSMS notification checks
 */
export async function runCSMSNotificationChecks() {
  await checkQualificationNotifications();
  await checkContractFolderNotifications();
  await checkContractExpiryNotifications();
}