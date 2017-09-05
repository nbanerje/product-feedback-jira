// Google Forms Slack Notification
// Andy Chase <github.com/andychase>
// License: CC0 1.0 Universal <creativecommons.org/publicdomain/zero/1.0>
// Install 1: This code goes in ( tools > script editor... ) of your google docs form
// Install 2: ( resources > current project triggers ) ( [onSubmit], [from Form], [On form submit] )

// Install BetterLog -> https://github.com/peterherrmann/BetterLog

// You might have to re-authortize the script after making changes. Always run the onSubmit function after changes to make sure 
/// the script is still auth'd otherwise you will get Response Errors.


var POST_URL = "https://hooks.slack.com/services/XXXXX";
var response_url = "https://docs.google.com/spreadsheets/d/XXXXX"
var JIRA_BASE = "https://XXXX"
var JIRA_URL = JIRA_BASE + "/rest/api/2/issue/"
var JIRA_USER_URL = JIRA_BASE+ "/rest/api/2/user/search?username="

var JIRA_USERNAME = "USER"
var JIRA_PASSWORD = "PASSWORD"

// This username is used as a fall back if a user can't be mapped.
var DEFAULT_JIRA_USERNAME = 'jira-product-feedback'

//Create the epic links for each product or section of your product that you'd like to group feedback by
var PRE_CREATED_EPIC_LINKS = {
    'Engage' : 'PF-1',
    'Connect' : 'PF-2',
    'Insight' : 'PF-3',
    'Reach' : 'PF-4',
    'Web Notify' : 'PF-346',
  }

// Add one line to use BetterLog
var Logger = BetterLog.useSpreadsheet('LOGGING_SPREADSHEET_ID'); 

function onSubmit(e) {
  Logger.log(JSON.stringify(e))
  
  var response
  
  var d = ''
  var jira_description = ''
  var jira_summary = ''
  var email = ''
  var product = ''
  var customer = ''
  if (typeof e.response !== 'undefined' && e.response.getItemResponses) {
    response = e.response.getItemResponses()
    
    // Setup 2:
    // Modify the below to make the message you want. 
    // See: https://developers.google.com/apps-script/reference/forms/form-response
    email = e.response.getRespondentEmail()
    jira_description = 'h4. From\n' + email + '\n'
    
    d = 'From : ' + email
    for (var j = 0; j < response.length; j++) {
      var itemResponse = response[j]
      jira_description = jira_description + 'h4. ' + itemResponse.getItem().getTitle() + '\n'
       + itemResponse.getResponse() + '\n'
       
      if(itemResponse.getItem().getTitle() == 'Client Feedback') 
        jira_summary = itemResponse.getResponse()
        
      if(itemResponse.getItem().getTitle() == 'Which Product?') 
        product = itemResponse.getResponse()
       
      if(itemResponse.getItem().getTitle() == 'Client') 
        customer = itemResponse.getResponse()
        
      d = d 
       + " | "
       + itemResponse.getItem().getTitle() 
       + " : "
       + itemResponse.getResponse()
    }  
  } else {
    d = d + 'Error with response.'
    jira_description = jira_description + 'Error with response.'
  }
  
  // Copy and paste the code below here to onSubmit after testing
  jira_summary = customer + ' - ' + jira_summary
  //jira_summaries can only be 255 caracters so we will limit it
  jira_summary = jira_summary.substring(0,255)
  
  // JIRA
  var jira_headers = {
    "Authorization" : "Basic " + Utilities.base64Encode(JIRA_USERNAME + ':' + JIRA_PASSWORD)
  }
  
  //Map emails that are incorrect
  if (email =='sally@domain.net') {
    email = 'sally.doe@domain.net'
  }
  else if (email == 'john.doe@domain.net') {
    email = 'john.doe'
  }
  else if (email == 'kurt.low@domain.net') {
    email = 'kurt.high'
  }
  
  
  // Fetch reporter user name
  // Since the create ticket API doesn't allow for a user email address
  // but this API does
  var user_response = UrlFetchApp.fetch(JIRA_USER_URL+email, {
    'method':'GET',
    'headers':jira_headers,
  })
  var dataAll = JSON.parse(user_response.getContentText())
  var username = DEFAULT_JIRA_USERNAME
  
  try {
    username = dataAll[0]['name']
  }
  catch (e) {
     e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" . While processing %s.',e.name||'', 
               e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'', user_response||'');
  }
  Logger.log(user_response.getContentText())
  
  //Send to Jira
  var jira_ticket_url = JIRA_BASE + "/browse/"
  var epic_links = PRECREATED_EPIC_LINKS
  
  var jira_data = {
    "fields": {
       "project":
       { 
          "key": "PF"
       },
       "summary": jira_summary,
       "description": jira_description,
       "issuetype": {
          "name": "Story"
       },
      "customfield_10422" : epic_links[product],
      "labels": [product.toLowerCase().split(' ').join('-')],
      "customfield_10121": customer,
      "reporter": {"name":username}
    }
  }
  
  var jira_params = {
    'method':'POST',
    'headers':jira_headers,
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(jira_data)
  }
  
  try {
    response = UrlFetchApp.fetch(JIRA_URL, jira_params)
    Logger.log(response);
    jira_ticket_url += response.key
  }
  catch (e) {
     e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" . While processing %s.',e.name||'', 
               e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'', jira_params||'');
  }
  
  //Send to slack
  var payload = { "payload": '{"text": "' + d + '"}' }

  var options =
   {
     "method" : "post",
     "payload" : payload
   };
  
  try {
   response = UrlFetchApp.fetch(POST_URL, options)
   Logger.log(response);
  }
  catch (e) {
     e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" . While processing %s.',e.name||'', 
               e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'', options||'');
  }
  
}
