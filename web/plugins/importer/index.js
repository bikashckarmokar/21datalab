/* move this to cockpit widget later */
_helper_log('cockpit importer load') 
var cockpiteventSource = 0
var cockpitPath = ""
var cockpitWidgetPath = ""
let importerFields
let importerStepNo = 1
let importerFileName

// --- FOR TESTING PURPOSES
// --- [TODO] remove
function cockpit_importer_test() {
  _helper_log('cockpit_importer_test') 
  // _helper_modal_activate_step_no(4)
  http_post( "/_execute", cockpitPath + ".importer_import", null, null, (self, status, data, params) => {})
}

// --- initializes the cockpit
function cockpit_init(path) {
  // --- [TODO] remove
  _helper_log('cockpit_importer_init') 
  cockpitPath = path
  $("#cockpit").attr("path",path)
  cockpiteventSource = new EventSource('/event/stream');
  cockpiteventSource.addEventListener('importer.data_imported', (e) => {
    console.log("importer.data_imported", e)
  });
  cockpit_importer_1_choose_file()
}

// --- Choose File (STEP 1)
function cockpit_importer_1_choose_file() {
  // --- [TODO] remove
  _helper_log('cockpit_importer_1_choose_file') 
  _helper_modal_activate_step_no(1)
  const files = JSON.parse(http_get('/_upload'));
  const filesLength = files.length;
  const selector = '#importer-content-1'
  $(selector).html('Waiting for file list to load!')
  let filesHtml = '<b>No files available!</b>';
  if (filesLength > 0) {
    filesHtml = `<thead><tr style="text-align: center;"><th>File</th><th>Action</th></tr></thead><tbody style="text-align: center;">`;
    for (var fileNo = 0, length = filesLength; fileNo < length; fileNo++) {
      const file = files[fileNo];
      filesHtml = `${filesHtml}<tr><td>${file.name}</td>
        <td><button type="button" class="btn btn-info" onclick="cockpit_importer_2_approve_file('${file.name}')">Next (Import File) ></button></td>
      </tr>`;
    }
    filesHtml = `<table class="table table-dark table-striped">${filesHtml}</tbody></table>`;
  }
  $(selector).html(filesHtml);
}

// --- Approve File (STEP 2)
function cockpit_importer_2_approve_file(fileName) {
  // --- [TODO] remove
  _helper_log('cockpit_importer_2_approve_file') 
  // --- set global filename
  importerFileName = fileName
  _helper_modal_activate_step_no(2)
  const selector = '#importer-content-2'
  $(selector).html('Waiting for file preview to load!')
  // --- set filename
  let path =$("#cockpit").attr("path");
  let query = [ { browsePath: path + ".importer_preview.fileName", value: fileName} ];
  http_post( "/setProperties", JSON.stringify(query), null, null, function ( obj, status, data, params ) {
    // --- delete current data_preview
    query = [ { browsePath: path + ".importer_preview.data_preview", value: undefined } ];
    http_post( "/setProperties", JSON.stringify(query), null, null, function ( obj, status, data, params ) {
      // --- run import function
      http_post( "/_execute", cockpitPath + ".importer_preview", null, null, (self, status, data, params) => {
        console.log("log",status);
        let importerApproveHtml = ``
        if ( status !== 200 ) {
          importerApproveHtml = `<p>Something went wrong while loading the file!</p>`
          $(selector).html(importerApproveHtml)
        } else {
          // --- get data from node
          http_post( "_getbranchpretty", cockpitPath + ".importer_preview.data_preview", null, null, function( obj, status, data, params ) {
            const node = JSON.parse(data)
            const value = JSON.parse(node[".properties"].value)
            importerFields = value.schema.fields
            const dat = value.data
            let fieldsHtml = `<thead style="text-align: center;">`
            // --- loop through fields
            for (var fieldNo = 1, len = importerFields.length; fieldNo < len; fieldNo++) {
              const field = importerFields[fieldNo]
              fieldsHtml = `${fieldsHtml}<th>${field.name}</th>`
            } 
            fieldsHtml = `<tr>${fieldsHtml}</tr></thead><tbody style="text-align: center;">`
            // --- loop through data
            let datHtml = ``
            for (var datNo = 0, datLen = dat.length; datNo < datLen ; datNo++) {
              const row = dat[datNo]
              datHtml = `${datHtml}<tr>`
              // --- loop through fields
              for (var fieldNoDat = 1, fieldLen = importerFields.length; fieldNoDat < fieldLen; fieldNoDat++) {
                const field = importerFields[fieldNoDat]
                datHtml = `${datHtml}<td>${row[field.name]}</td>`
              } 
              datHtml = `${datHtml}</tr>`
            } 
            importerApproveHtml = `
              <div class="text-center"> 
                <button type="button" class="btn btn-info" onclick="_helper_modal_activate_step_no(1)">< Back (Choose File)</button>
                <button type="button" class="btn btn-info" onclick="cockpit_importer_3a_define_header_file_contains_header()">Next (File contains header) ></button>
                <button type="button" class="btn btn-info" onclick="cockpit_importer_3b_define_header_file_misses_header()">Next (File misses header) ></button>
              </div>
              <div class="table-responsive">
                <table class="table table-dark table-striped">${fieldsHtml}${datHtml}</tbody></table>
              </div>
            `
            $(selector).html(importerApproveHtml)
          })
        }
      })
    })
  })
}

// --- Define Header: file contains header (STEP 3a)
function cockpit_importer_3a_define_header_file_contains_header() {
  _helper_log('cockpit_importer_3a_define_header_file_contains_header') 
  _helper_modal_activate_step_no(3)
  const selector = '#importer-content-3'
  $(selector).html('Waiting for header fields to load!')
  console.log('importerFields', importerFields) 
  let html = ``
  for (var fieldNo = 1, fieldsLen = importerFields.length; fieldNo < fieldsLen; fieldNo++) {
    const field = importerFields[fieldNo]
    html = `${html}
      <tr>
        <td style="text-align: center;">${field.name}</td>
        <td>
          <div class="form-group">
            <input type="text" class="form-control" placeholder="Enter tablename" id="importer-field-name-${fieldNo} "value="${field.name}">
          </div>
        </td>
        <td style="text-align: center;">
          <div class="form-check">
            <input type="checkbox" class="form-check-input" id="importer-field-import-${fieldNo}" checked>
          </div>
        </td>
      </tr>
    `
  }
  html = `
    <div class="text-center"> 
      <button type="button" class="btn btn-info" onclick="_helper_modal_activate_step_no(2)">< Back (Approve File)</button>
      <button type="button" class="btn btn-info" onclick="cockpit_importer_4_define_table()">Next (Define Table) ></button>
    </div>
    <div class="table-responsive">
      <table class="table table-dark table-striped">
        <thead>
          <tr style="text-align: center;">
            <th>Original name</th>
            <th>Adapted name</th>
            <th>Import</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `
  $(selector).html(html)
  // $('#importer-content-3').html(defineHeaderHtml)
}

// --- Define Header: file misses header (STEP 3b)
function cockpit_importer_3b_define_header_file_misses_header() {
  _helper_log('cockpit_importer_3b_define_header_file_misses_header') 
  _helper_modal_activate_step_no(3)
  const selector = '#importer-content-3'
  $(selector).html('Waiting for header fields to load!')
  let html = ``
  for (var fieldNo = 1, fieldsLen = importerFields.length; fieldNo < fieldsLen; fieldNo++) {
    const field = importerFields[fieldNo]
    html = `${html}
      <tr>
        <td style="text-align: center;">${field.name}</td>
        <td>
          <div class="form-group">
            <input type="text" class="form-control" placeholder="Enter field name" id="importer-field-name-${fieldNo}">
          </div>
        </td>
        <td style="text-align: center;">
          <div class="form-check">
            <input type="checkbox" class="form-check-input" id="importer-field-import-${fieldNo}" checked>
          </div>
        </td>
      </tr>
    `
  }
  html = `
    <div class="text-center"> 
      <button type="button" class="btn btn-info" onclick="_helper_modal_activate_step_no(2)">< Back (Approve File)</button>
      <button type="button" class="btn btn-info" onclick="cockpit_importer_4_define_table()">Next (Define Table) ></button>
    </div>
    <div class="table-responsive">
      <table class="table table-dark table-striped">
        <thead>
          <tr style="text-align: center;">
            <th>Example value</th>
            <th>Field name</th>
            <th>Import</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>
  `
  $(selector).html(html)
}

// --- Define Table (STEP 4)
function cockpit_importer_4_define_table() {
  _helper_log('cockpit_importer_4_define_table') 
  _helper_modal_activate_step_no(4)
  const filename = importerFileName
  const tablename = filename.replace('.', '_')
  const tablepath = 'imports/' + tablename
  const selector = '#importer-content-4'
  const html = `
    <div class="text-center"> 
      <button type="button" class="btn btn-info" onclick="_helper_modal_activate_step_no(3)">< Back (Define Header)</button>
      <button type="button" class="btn btn-info" onclick="cockpit_importer_5_finish_import()">Next (Import) ></button>
    </div>
    <div class="form-group">
      <label for="tablename">Tablename:</label>
      <input type="text" class="form-control" placeholder="Enter tablename. Default (${tablename})" id="importer-tablename">
    </div>
    <div class="form-group">
      <label for="tablepath">Tablepath:</label>
      <input type="text" class="form-control" placeholder="Enter tablepath (for exmple: tables/mytable). Default (${tablepath})" id="importer-tablepath">
    </div>
  `
  $(selector).html(html)
}

// --- Finish Import (STEP 5)
function cockpit_importer_5_finish_import() {
  // --- [TODO] remove
  _helper_log('cockpit_importer_5_finish_import') 
  // --- activate modals tab-pane
  _helper_modal_activate_step_no(5)
  // --- set jquery selector
  const selector = '#importer-content-5'
  // --- define importer object
  const fields = []
  $("input[id^=importer-field-name-]").each(function(index, el) {
    const id = $(el).attr('id')
    const no = id.substr( id.lastIndexOf('-') + 1 )
    const val = $(el).val() === "" ? no : $(el).val()
    const use = $( '#importer-field-import-' + no).is(":checked")
    if ( use === true ) {
      fields.push({ id, no, val, use })
    }
    // console.log(fieldId, ':', fieldVal, fieldNo, 'import:', fieldImport) 
  })
  let tablename = $("#importer-tablename").val()
  let tablepath = $("#importer-tablepath").val()
  const filename = importerFileName
  if ( tablename === '' ) {
    tablename = filename.replace('.', '_')
  }
  if ( tablepath === '' ) {
    tablepath = 'root.imports.' + tablename
  } else {
    tablepath = 'root.' + $("#importer-tablepath").val().replace('/', '.') + tablename
  }
  const importerObj = { fields, filename }
  console.log('importerObj', importerObj) 
  // --- update html
  $(selector).html('Waiting for import to be finished!')
  // --- create response var
  let res 
  // --- [api] create table node
  res = http_post_sync('/_create', true, [ { browsePath: tablepath, type: 'table' } ])
  if ( res.status > 201 ) $(selector).html(`Failed creating table '${tablepath}'!`)
  // --- [api] set importer.tablename
  if (res.status <= 201)
    res = http_post_sync('/_create', true, [ { browsePath: "root.importer.tablename", type: 'const' } ])
  if ( res.status > 201 ) $(selector).html(`Failed creating const 'root.importer.tablename'!`)
  // --- [api] set const root.importer.filename
  if (res.status <= 201)
    res = http_post_sync('/setProperties', true, [ { browsePath: "root.importer.tablename", value: tablename } ])
  if ( res.status > 201 ) $(selector).html(`Failed setting value for const 'root.importer.tablename'!`)
  // --- [api] create referencer columns
  if (res.status <= 201)
    res = http_post_sync('/_create', true, [ { browsePath: tablepath + ".metadata", type: 'const' } ])
  if ( res.status > 201 ) $(selector).html(`Failed creating const '${tablepath + ".metadata"}'!`)
  // --- [api] set fields
  if (res.status <= 201)
    res = http_post_sync('/setProperties', true, [ { browsePath: tablepath + ".metadata", value: JSON.stringify(importerObj) } ])
  if ( res.status > 201 ) $(selector).html(`Failed setting value for const '${tablepath + ".metadata"}'!`)
  // --- [api] run importer function
  if (res.status <= 201) {
      http_post( "/_execute", cockpitPath + ".importer_import", null, null, (self, status, data, params) => {
        if ( status === 200 ) {
          $(selector).html('<div class="text-center">Import finished successful!</div>')
        } else {
          $(selector).html(`Failed running importer.importer_import!`, status, data, params)
        }
      })
  }
}

// --- Approve File (STEP 2)
function cockpit_importer_preview() {
  _helper_log('cockpit_importer_preview') 
  http_post("/_execute", cockpitPath+".importer_preview", null, null, (self, status, data, params) => {
    console.log("cockpit_importer_preview",status);
  });
}

// --- closes the cockpit
function cockpit_close() {  
  _helper_log('cockpit_close') 
  cockpiteventSource.close();
}

// --- _helper_log
function _helper_log( logText ) {
  const length = logText.length + 4
  let header = ''
  for (var i = 0, len = length; i < len ; i++) {
    header = `${header}=` 
  } 
  console.log(header)
  console.log(`| ${logText} |`)
  console.log(header)
}

// --- _helper_modal_activate_step_no
function _helper_modal_activate_step_no( stepNo ) {
  const newActivePane = "tabpane" + stepNo
  const tabId = 'tab' + stepNo
  $('#' + tabId).click()
  $("#myTabContent").children('div').each(function(index, el) {
    const childStepNo = $(el).attr("id") 
    const tabPaneId = 'tabpane' + stepNo
    const tabId = 'tab' + stepNo
    if ( newActivePane === childStepNo ) {
      console.log('childStepNo active', childStepNo) 
      // --- activate actual pane
      $('#' + tabId).removeClass('disabled')
      $('#' + tabId).click()
    } else {
      // --- deactivate all other panes
      $('#' + tabId).addClass('disabled')
    }
  })
}

// --- create a slug from a given string
function _helper_slugify(inputStr)
{
  return inputStr
    .toLowerCase()
    .replace(/[^\w ]+/g,'')
    .replace(/ +/g,'-')
}
