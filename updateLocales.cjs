const fs = require('fs');
const path = require('path');

const updateLocale = (filePath, additions) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  if (!data.admin) data.admin = {};
  if (!data.admin.employeeForm) {
    data.admin.employeeForm = additions;
  } else {
    data.admin.employeeForm = { ...data.admin.employeeForm, ...additions };
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('Updated ' + filePath);
};

const enAdditions = {
  subtitle: 'Manage dashboard access and roles for your staff.',
  addEmployee: 'Add Employee',
  editEmployee: 'Edit Employee',
  addNewEmployee: 'Add New Employee',
  errors: {
    nameEmailRequired: 'Name and Email are required.',
    passwordRequired: 'Password is required for new employees.',
    errorSaving: 'An error occurred while saving.',
    deleteConfirm: 'Are you sure you want to delete this employee? This action cannot be undone.',
    deleteFailed: 'Failed to delete employee.'
  },
  form: {
    fullName: 'Full Name *',
    fullNamePlaceholder: 'e.g. Rahul Patil',
    email: 'Email Address *',
    emailPlaceholder: 'employee@astitvarealestate.com',
    mobile: 'Mobile Number',
    password: 'Password',
    passwordOptional: 'Password (Optional)',
    passwordPlaceholderExisting: 'Leave blank to keep current',
    passwordPlaceholderNew: '••••••••',
    assignPermissions: 'Assign Dashboard Permissions'
  },
  actions: {
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save Employee',
    editAccess: 'Edit Access',
    deleteEmployee: 'Delete Employee'
  },
  table: {
    employeeName: 'Employee Name',
    emailContact: 'Email & Contact',
    permissions: 'Permissions',
    actions: 'Actions',
    noEmployees: 'No employees found. Click "Add Employee" to create one.',
    noAccess: 'No access'
  }
};

const mrAdditions = {
  subtitle: 'तुमच्या कर्मचाऱ्यांसाठी डॅशबोर्ड प्रवेश आणि भूमिका व्यवस्थापित करा.',
  addEmployee: 'कर्मचारी जोडा',
  editEmployee: 'कर्मचारी संपादित करा',
  addNewEmployee: 'नवीन कर्मचारी जोडा',
  errors: {
    nameEmailRequired: 'नाव आणि ईमेल आवश्यक आहेत.',
    passwordRequired: 'नवीन कर्मचाऱ्यांसाठी पासवर्ड आवश्यक आहे.',
    errorSaving: 'जतन करताना त्रुटी आली.',
    deleteConfirm: 'तुम्हाला खात्री आहे की तुम्ही या कर्मचाऱ्याला हटवू इच्छिता? ही कृती पूर्ववत केली जाऊ शकत नाही.',
    deleteFailed: 'कर्मचारी हटवण्यात अयशस्वी.'
  },
  form: {
    fullName: 'पूर्ण नाव *',
    fullNamePlaceholder: 'उदा. राहुल पाटील',
    email: 'ईमेल पत्ता *',
    emailPlaceholder: 'employee@astitvarealestate.com',
    mobile: 'मोबाईल नंबर',
    password: 'पासवर्ड',
    passwordOptional: 'पासवर्ड (पर्यायी)',
    passwordPlaceholderExisting: 'सध्याचा ठेवण्यासाठी रिकामे सोडा',
    passwordPlaceholderNew: '••••••••',
    assignPermissions: 'डॅशबोर्ड परवानग्या नियुक्त करा'
  },
  actions: {
    cancel: 'रद्द करा',
    saving: 'जतन करत आहे...',
    save: 'कर्मचारी जतन करा',
    editAccess: 'प्रवेश संपादित करा',
    deleteEmployee: 'कर्मचारी हटवा'
  },
  table: {
    employeeName: 'कर्मचाऱ्याचे नाव',
    emailContact: 'ईमेल आणि संपर्क',
    permissions: 'परवानग्या',
    actions: 'कृती',
    noEmployees: 'कोणतेही कर्मचारी आढळले नाहीत. नवीन तयार करण्यासाठी "कर्मचारी जोडा" वर क्लिक करा.',
    noAccess: 'प्रवेश नाही'
  }
};

updateLocale('src/locales/en/common.json', enAdditions);
updateLocale('src/locales/mr/common.json', mrAdditions);
