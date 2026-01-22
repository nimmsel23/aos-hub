// ================================================================
// TASK REFLECTION SYSTEM (NAMESPACED)
// ================================================================

const REFLECTION_CONFIG = {
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('REFLECTION_SHEET_ID') || '',
  DRIVE_FOLDER_ID: PropertiesService.getScriptProperties().getProperty('REFLECTION_DRIVE_FOLDER_ID') || '',
  SHEET_NAMES: {
    HOT_LIST: 'Hot_List',
    TASK_REGISTRY: 'Task_Registry',
    REFLECTION_LOG: 'Reflection_Log'
  },
  DOCUMENT_TEMPLATES: {
    TASK_DOSSIER: PropertiesService.getScriptProperties().getProperty('TASK_DOSSIER_TEMPLATE_ID') || '',
    WAR_STACK: PropertiesService.getScriptProperties().getProperty('WAR_STACK_TEMPLATE_ID') || ''
  }
};

function initializeTaskReflectionSystem() {
  const ss = SpreadsheetApp.openById(REFLECTION_CONFIG.SHEET_ID);
  reflection_createHotListSheet_(ss);
  reflection_createTaskRegistrySheet_(ss);
  reflection_createReflectionLogSheet_(ss);
  Logger.log('Task Reflection System initialized');
}

function reflection_createHotListSheet_(ss) {
  let sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.HOT_LIST);
  if (!sheet) {
    sheet = ss.insertSheet(REFLECTION_CONFIG.SHEET_NAMES.HOT_LIST);
  }

  const headers = [
    'UUID', 'Timestamp', 'Title', 'Source', 'Tags', 'Status',
    'Document_ID', 'TickTick_ID', 'Taskwarrior_UUID', 'Notes'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 200);
}

function reflection_createTaskRegistrySheet_(ss) {
  let sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.TASK_REGISTRY);
  if (!sheet) {
    sheet = ss.insertSheet(REFLECTION_CONFIG.SHEET_NAMES.TASK_REGISTRY);
  }

  const headers = [
    'Task_UUID', 'Title', 'Created', 'Status', 'Current_Phase',
    'Hot_List_Date', 'Door_War_Date', 'War_Stack_Date', 'Execution_Date',
    'Completion_Date', 'Review_Date', 'Document_URL', 'Reflection_Score'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function reflection_createReflectionLogSheet_(ss) {
  let sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.REFLECTION_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(REFLECTION_CONFIG.SHEET_NAMES.REFLECTION_LOG);
  }

  const headers = [
    'Reflection_ID', 'Task_UUID', 'Phase', 'Timestamp', 'Reflection_Type',
    'Questions_Asked', 'Insights', 'Lessons_Learned', 'Next_Actions', 'Emotional_State'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function addToHotListWithDossier(title, source = 'Manual', tags = [], notes = '') {
  const taskUuid = reflection_generateTaskUUID_();
  const timestamp = new Date();

  const docId = reflection_createTaskDossier_(taskUuid, title, source, tags, notes);

  if (!docId) {
    Logger.log('Failed to create task document');
    return null;
  }

  const ss = SpreadsheetApp.openById(REFLECTION_CONFIG.SHEET_ID);
  const hotListSheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.HOT_LIST);

  const row = [
    taskUuid,
    Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    title,
    source,
    tags.join(', '),
    'hot_list',
    docId,
    '',
    '',
    notes
  ];

  hotListSheet.appendRow(row);
  reflection_addToTaskRegistry_(taskUuid, title, 'hot_list', docId);
  reflection_createInitialReflection_(taskUuid, title, source, tags);

  Logger.log(`Added "${title}" to Hot List with dossier: ${docId}`);

  return {
    uuid: taskUuid,
    documentId: docId,
    documentUrl: `https://docs.google.com/document/d/${docId}/edit`
  };
}

function reflection_createTaskDossier_(taskUuid, title, source, tags, initialNotes) {
  try {
    const folder = DriveApp.getFolderById(REFLECTION_CONFIG.DRIVE_FOLDER_ID);

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const docName = `[${timestamp}] ${title} - ${taskUuid.substring(0, 8)}`;

    const doc = DocumentApp.create(docName);
    const docId = doc.getId();

    const docFile = DriveApp.getFileById(docId);
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);

    reflection_populateTaskDossierTemplate_(doc, taskUuid, title, source, tags, initialNotes);

    return docId;

  } catch (error) {
    Logger.log('Error creating task dossier:', error);
    return null;
  }
}

function reflection_populateTaskDossierTemplate_(doc, taskUuid, title, source, tags, initialNotes) {
  const body = doc.getBody();
  body.clear();

  const headerStyle = {};
  headerStyle[DocumentApp.Attribute.FONT_SIZE] = 18;
  headerStyle[DocumentApp.Attribute.BOLD] = true;

  body.appendParagraph(`🎯 TASK DOSSIER: ${title}`).setAttributes(headerStyle);
  body.appendParagraph('');

  body.appendParagraph('📋 TASK METADATA').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph(`UUID: ${taskUuid}`);
  body.appendParagraph(`Created: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')}`);
  body.appendParagraph(`Source: ${source}`);
  body.appendParagraph(`Tags: ${tags.join(', ')}`);
  body.appendParagraph('Status: Hot List');
  body.appendParagraph('');

  body.appendParagraph('💡 INITIAL CAPTURE').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph(`Original Idea: ${title}`);
  if (initialNotes) {
    body.appendParagraph(`Notes: ${initialNotes}`);
  }
  body.appendParagraph('');

  body.appendParagraph('🔥 HOT LIST REFLECTION').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph('What sparked this idea?');
  body.appendParagraph('[Your reflection here...]');
  body.appendParagraph('');
  body.appendParagraph('Why is this important now?');
  body.appendParagraph('[Your reflection here...]');
  body.appendParagraph('');
  body.appendParagraph('What would success look like?');
  body.appendParagraph('[Your reflection here...]');
  body.appendParagraph('');

  body.appendParagraph('⚔️ DOOR WAR ANALYSIS').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph('Eisenhower Matrix Position:');
  body.appendParagraph('□ Important & Urgent (Quadrant 1)');
  body.appendParagraph('□ Important & Not Urgent (Quadrant 2) - TARGET');
  body.appendParagraph('□ Not Important & Urgent (Quadrant 3)');
  body.appendParagraph('□ Not Important & Not Urgent (Quadrant 4)');
  body.appendParagraph('');
  body.appendParagraph('Why did this win the Door War?');
  body.appendParagraph('[To be filled when selected as Door...]');
  body.appendParagraph('');

  body.appendParagraph('🛡️ WAR STACK PLANNING').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph('Domain: [Body/Being/Balance/Business]');
  body.appendParagraph('');
  body.appendParagraph('The Domino Door: [What specific outcome?]');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');
  body.appendParagraph('Trigger: [What sparked this?]');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');
  body.appendParagraph('Impact on Opening: [How will this change things?]');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');
  body.appendParagraph('Consequences of Inaction: [What happens if we don\'t act?]');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');

  body.appendParagraph('🎯 THE FOUR HITS').setAttributes({[DocumentApp.Attribute.BOLD]: true});

  for (let i = 1; i <= 4; i++) {
    body.appendParagraph(`HIT ${i}:`);
    body.appendParagraph('Fact: [Measurable result]');
    body.appendParagraph('Obstacle: [What could prevent this?]');
    body.appendParagraph('Strike: [Strategic move to overcome obstacle]');
    body.appendParagraph('Responsibility: [Who executes this?]');
    body.appendParagraph('');
  }

  body.appendParagraph('⚡ EXECUTION TRACKING').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph('Daily Progress Log:');
  body.appendParagraph('[Date] - [Progress made] - [Obstacles encountered] - [Adjustments needed]');
  body.appendParagraph('');

  body.appendParagraph('🎭 COMPLETION REVIEW').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph('What was accomplished?');
  body.appendParagraph('[To be filled on completion...]');
  body.appendParagraph('');
  body.appendParagraph('What was learned?');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');
  body.appendParagraph('What would you do differently?');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');
  body.appendParagraph('How does this connect to larger goals?');
  body.appendParagraph('[To be filled...]');
  body.appendParagraph('');

  body.appendParagraph('🗣️ VOICE REFLECTION PROMPTS').setAttributes({[DocumentApp.Attribute.BOLD]: true});
  body.appendParagraph('STOP: What emotions arise when I think about this task?');
  body.appendParagraph('[Voice reflection...]');
  body.appendParagraph('');
  body.appendParagraph('SUBMIT: What is the deeper truth behind this goal?');
  body.appendParagraph('[Voice reflection...]');
  body.appendParagraph('');
  body.appendParagraph('STRUGGLE: What internal resistance am I feeling?');
  body.appendParagraph('[Voice reflection...]');
  body.appendParagraph('');
  body.appendParagraph('STRIKE: What is the aligned action I need to take?');
  body.appendParagraph('[Voice reflection...]');
  body.appendParagraph('');

  doc.saveAndClose();
}

function promoteToDoorWar(taskUuid, doorWarReason) {
  reflection_updateTaskPhase_(taskUuid, 'door_war');
  reflection_addReflection_(taskUuid, 'door_war', 'promotion',
    'What made this task win the Door War?',
    doorWarReason);
  reflection_updateTaskDocument_(taskUuid, 'door_war', {reason: doorWarReason});
  Logger.log(`Task ${taskUuid} promoted to Door War phase`);
}

// Legacy typo alias.
function promoteTooorWar(taskUuid, doorWarReason) {
  return promoteToDoorWar(taskUuid, doorWarReason);
}

function promoteToWarStack(taskUuid, warStackData) {
  reflection_updateTaskPhase_(taskUuid, 'war_stack');
  reflection_addReflection_(taskUuid, 'war_stack', 'planning',
    'War Stack planning completed',
    JSON.stringify(warStackData));
  reflection_updateTaskDocument_(taskUuid, 'war_stack', warStackData);
  Logger.log(`Task ${taskUuid} promoted to War Stack phase`);
}

function startExecution(taskUuid, startNotes) {
  reflection_updateTaskPhase_(taskUuid, 'execution');
  reflection_addReflection_(taskUuid, 'execution', 'start', 'Execution started', startNotes);
  Logger.log(`Task ${taskUuid} moved to execution phase`);
}

function completeTask(taskUuid, completionNotes, lessonsLearned) {
  reflection_updateTaskPhase_(taskUuid, 'completed');
  reflection_addReflection_(taskUuid, 'completion', 'final_review',
    'What was accomplished and learned?',
    `Completion: ${completionNotes}\nLessons: ${lessonsLearned}`);
  reflection_updateTaskDocument_(taskUuid, 'completion', {
    notes: completionNotes,
    lessons: lessonsLearned
  });
  reflection_triggerVoiceReflection_(taskUuid);
  Logger.log(`Task ${taskUuid} completed with reflection`);
}

function reflection_createInitialReflection_(taskUuid, title, source, tags) {
  const reflectionQuestions = [
    'What sparked this idea?',
    'Why is this important now?',
    'What would success look like?',
    'How does this align with my larger goals?'
  ];

  reflection_addReflection_(taskUuid, 'hot_list', 'initial_capture',
    reflectionQuestions.join('\n'),
    `Task "${title}" added from ${source} with tags: ${tags.join(', ')}`);
}

function reflection_addReflection_(taskUuid, phase, reflectionType, questions, insights) {
  const ss = SpreadsheetApp.openById(REFLECTION_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.REFLECTION_LOG);

  const reflectionId = reflection_generateReflectionId_();
  const timestamp = new Date();

  const row = [
    reflectionId,
    taskUuid,
    phase,
    Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    reflectionType,
    questions,
    insights,
    '',
    '',
    ''
  ];

  sheet.appendRow(row);
  Logger.log(`Added reflection for task ${taskUuid} in phase ${phase}`);
}

function reflection_triggerVoiceReflection_(taskUuid) {
  const taskData = reflection_getTaskData_(taskUuid);

  const voicePrompts = {
    stop: 'What emotions arise when I reflect on this completed task?',
    submit: 'What is the deeper truth behind what I accomplished?',
    struggle: 'What internal resistance did I overcome during this task?',
    strike: 'What aligned actions emerged from completing this task?'
  };

  reflection_addReflection_(taskUuid, 'voice_reflection', 'completion_voice',
    JSON.stringify(voicePrompts),
    'Voice reflection prompts generated for task completion');

  reflection_notifyVoiceReflectionReady_(taskUuid, taskData.title);
}

function reflection_notifyVoiceReflectionReady_(taskUuid, taskTitle) {
  const message = `🗣️ *Voice Reflection Ready*\n\nTask: ${taskTitle}\nUUID: ${taskUuid}\n\nTime for deep reflection on this completed task.`;
  const chatId = PropertiesService.getScriptProperties().getProperty('CHAT_ID');
  if (chatId) {
    reflection_sendTelegramMessage_(chatId, message);
  }
  Logger.log(`Voice reflection notification sent for task: ${taskTitle}`);
}

function reflection_updateTaskPhase_(taskUuid, newPhase) {
  const ss = SpreadsheetApp.openById(REFLECTION_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.TASK_REGISTRY);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskUuid) {
      sheet.getRange(i + 1, 5).setValue(newPhase);
      sheet.getRange(i + 1, 6 + reflection_getPhaseColumnOffset_(newPhase)).setValue(
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
      );
      break;
    }
  }
}

function reflection_addToTaskRegistry_(taskUuid, title, phase, docId) {
  const ss = SpreadsheetApp.openById(REFLECTION_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.TASK_REGISTRY);

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  const row = [
    taskUuid,
    title,
    timestamp,
    'active',
    phase,
    timestamp,
    '', '', '', '', '',
    docUrl,
    0
  ];

  sheet.appendRow(row);
}

function reflection_getTaskData_(taskUuid) {
  const ss = SpreadsheetApp.openById(REFLECTION_CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(REFLECTION_CONFIG.SHEET_NAMES.TASK_REGISTRY);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskUuid) {
      return {
        uuid: data[i][0],
        title: data[i][1],
        created: data[i][2],
        status: data[i][3],
        currentPhase: data[i][4],
        documentUrl: data[i][11]
      };
    }
  }

  return null;
}

function reflection_generateTaskUUID_() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task_${timestamp}_${random}`;
}

function reflection_generateReflectionId_() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `refl_${timestamp}_${random}`;
}

function reflection_getPhaseColumnOffset_(phase) {
  const phases = {
    'hot_list': 0,
    'door_war': 1,
    'war_stack': 2,
    'execution': 3,
    'completion': 4,
    'review': 5
  };
  return phases[phase] || 0;
}

function reflection_sendTelegramMessage_(chatId, text) {
  const token = getPrimaryBotToken_();
  if (!token) return;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  try {
    UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    });
  } catch (error) {
    Logger.log('Error sending Telegram message:', error);
  }
}

function reflection_updateTaskDocument_(taskUuid, phase, payload) {
  // Placeholder for future document updates
  Logger.log(`updateTaskDocument not implemented. Task ${taskUuid} phase ${phase}.`);
}
