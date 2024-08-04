/**
 * Contains utility functions for dynamically creating ATF tests. The original use case for these utility methods was to
 * generate a baseline test template. Then using this script you could potentially generate copies of that template to
 * quickly create new tests.
 */

/** @ts-ignore */
var global = global || {};

global.KLF_AtfAddStepsHelper = (function() {
    return {
        /**
         * Gets an sys_atf_test record by sys_id
         * @param {string} testSysId sys_atf_test.sys_id
         * @returns {?GlideRecord} sys_atf_test
         */
        getTest: function(testSysId) {
            var test = new GlideRecord('sys_atf_test');
            if (test.get(testSysId)) {
                return test;
            } else {
                return null;
            }
        },

        /**
         * Copies test steps from the from test to the to test. The copied
         * test steps are added after the last test step in the to test.
         * Returns the list of added test steps
         * @param {string} fromTestSysId sys_atf_test.sys_id
         * @param {string} toTestSysId sys_atf_test.sys_id
         */
        addTestSteps: function(fromTestSysId, toTestSysId) {
            // copy test from test
            var copiedTestSysId = this.copyTest(fromTestSysId);
            var nextStepOrder = this.getMaxStepOrder(toTestSysId);
            // change the value of the order in each test step
            this.updateStepOrder(copiedTestSysId, nextStepOrder);
            // change the parent test of the test steps
            this.moveSteps(copiedTestSysId, toTestSysId);
            // delete the copied test
            this.deleteTest(copiedTestSysId);
        },

        /**
         * Deletes the test given by sys_atf_test.sys_id
         * @param {string} testSysId sys_atf_test.sys_id
         */
        deleteTest: function(testSysId) {
            var test = new GlideRecord('sys_atf_test');
            if (test.get(testSysId)) {
                new global.KLF_GlideRecordUtils().deleteRecord('sys_atf_test', test.getEncodedQuery());
            }
        },

        /**
         * Renumbers the sys_atf_step.order starting with the passed in
         * startOrder
         * @param {string} testSysId sys_atf_test.sys_id
         * @param {number} startOrder The starting value of sys_atf_step.order
         */
        updateStepOrder: function(testSysId, startOrder) {
            var step = new GlideRecord('sys_atf_step');
            step.addQuery('test', testSysId);
            step.query();
            while (step.next()) {
                startOrder = startOrder + 1;
                step.order = startOrder;
                step.setWorkflow(false);
                step.update();
            }
        },

        /**
         * Moves all the test steps from on test to another
         * @param {string} fromTestSysId sys_atf_test.sys_id
         * @param {string} toTestSysId sys_atf_test.sys_id
         */
        moveSteps: function(fromTestSysId, toTestSysId) {
            var step = new GlideRecord('sys_atf_step');
            step.addQuery('test', fromTestSysId);
            new global.KLF_GlideRecordUtils().updateRecord('sys_atf_step', step.getEncodedQuery(), {
                test: toTestSysId
            });
        },

        /**
         * Copies the source test to another test
         * @param {string} sourceTestSysId sys_atf_test.sys_id
         * @returns {string} sys_atf_test.sys_id of test copy
         */
        copyTest: function(sourceTestSysId) {
            var userTestProcessor = new sn_atf.UserTestProcessor();
            try {
                return userTestProcessor.copyTest(sourceTestSysId);
            } catch ( /**@type{*}*/ ex) {
                gs.addErrorMessage(gs.getMessage("Unexpected error occurred while copying the test: {0}", ex.message));
                return '';
            }
        },

        /**
         * Looks through a test and returns the maximum value for the
         * sys_atf_step.order field
         * @param {string} testSysId sys_atf_test.sys_id
         * @returns {number} The maximum value for sys_atf_step.order
         */
        getMaxStepOrder: function(testSysId) {
            var maxOrder = new GlideAggregate('sys_atf_step');
            maxOrder.groupBy('test');
            maxOrder.addQuery('test', testSysId);
            maxOrder.addQuery('active', true);
            maxOrder.addAggregate('MAX', 'order');
            maxOrder.query();

            if (maxOrder.next()) {
                return parseInt(maxOrder.getAggregate('MAX', 'order')) || 0;
            } else {
                return 0;
            }
        }

    };

})();
//@ts-ignore -- I know this throws an error, but it allows VSCode to autocomplete the methods
var global = global || {};

/**
 * ServiceNow has a module called Business Calendar. Business Calendars are used to define time
 * periods that are significant to the business that differ from the standard calendar year.
 * 
 * Creating all the entries in a business calendar can be a tedious task. This script include
 * provides a way to create the entries for a fiscal quarter and fiscal year business calendar.
 * This script is specifically used to create the entries for the US Federal Government fiscal
 * year and quarters.
 * 
 * The significant methods are:
 * {@link global.KLF_CalendarCreator.createFiscalQuarterNameEntries} Creates the fiscal quarter name entries for a Business Calendar. The names of the entries must exist before creating the entries.
 * NOTE: You must create a business_calendar named "Fiscal Year" before calling this method.
 * {@link global.KLF_CalendarCreator.createFiscalQuarterEntries} Creates the fiscal quarter entries for a Business Calendar (business_calendar) called "Fiscal Quarter".
 * NOTE: You must create a business_calendar named "Fiscal Quarter" before creating the entries.
 * 
 * {@link global.KLF_CalendarCreator.createFiscalYearNameEntries} Creates the year name entries for a Business Calendar. The names of the entries must exist before creating the entries.
 * NOTE: You must create a business_calendar named "Fiscal Year" before calling this method.
 * {@link global.KLF_CalendarCreator.createFiscalYearEntries} Creates the fiscal year entries for a Business Calendar (business_calendar) called "Fiscal Year"
 * NOTE: You must create a business_calendar named "Fiscal Year" before creating the entries.
 * 
 * 
 * @example
 * // This will generate Fiscal Year calendar for the years 1999 to 2040
 * // This must be run in global scope
 * // You will receive the error: "Could not find calendar using name: Fiscal Year"
 * // if you have not created a calendar with the name "Fiscal Year" in the system
 * // before calling this method
 * global.KLF_CalendarCreator.createFiscalYearNameEntries(1999, 2040);
 * global.KLF_CalendarCreator.createFiscalYearEntries(1999, 2040); 
 * 
 * // This will generate Fiscal Quarter calendar for the years 1999 to 2040
 * // This must be run in global scope
 * // You will receive the error: "Could not find calendar using name: Fiscal Year"
 * // if you have not created a calendar with the name "Fiscal Quarter" in the system
 * // before calling this method
 * global.KLF_CalendarCreator.createFiscalYearNameEntries(1999, 2040);
 * global.KLF_CalendarCreator.createFiscalYearEntries(1999, 2040); 
 */

global.KLF_CalendarCreator = (function() {
    return {
        fiscalQuarterCalendarName: 'Fiscal Quarter',
        /**
         * business_calendar that holds calendar data
         * @param {string} calendarName
         * @returns {GlideRecord} business_calendar
         */
        getCalendarByName: function(calendarName) {
            var calender = new GlideRecord('business_calendar');
            if (calender.get('calendar_name', calendarName)) {
                return calender;
            } else {
                throw 'Could not find calendar using name: ' + calendarName;
            }
        },
        /**
         * Returns the span name
         * @param {string} quarterName One of Q1, Q2, Q3, or Q4
         * @param {number} year
         * @returns {GlideRecord} business_calendar_span_name
         */
        getQuarterSpanName: function(quarterName, year) {
            var calendar = this.getCalendarByName(this.fiscalQuarterCalendarName);
            var quarter = new GlideRecord('business_calendar_span_name');
            quarter.addQuery('calendar', calendar.getUniqueValue());
            quarter.addQuery('short_name', this.getFiscalQuarterSpanNameShortName(quarterName, year));
            quarter.query();
            if (quarter.next()) {
                return quarter;
            } else {
                throw 'Could not find quarter name using calendar: ' + calendar.getDisplayValue() + ' and quarter: ' + quarterName + ' and year: ' + year;
            }
        },
        /**
         * Uses the quarter and year to return a pair that represent the start and end
         * date of the quarter
         * @param {string} quarterName One of Q1, Q2, Q3, Q4
         * @param {number} year
         * @returns {[string,string]} A pair representing the start and end date
         */
        getQuarterDateRange: function(quarterName, year) {
            if (quarterName == 'Q1') {
                return [year - 1 + '-10-01 00:00:00', year + '-01-01 00:00:00'];
            } else if (quarterName == 'Q2') {
                return [year + '-01-01 00:00:00', year + '-04-01 00:00:00'];
            } else if (quarterName == 'Q3') {
                return [year + '-04-01 00:00:00', year + '-07-01 00:00:00'];
            } else if (quarterName == 'Q4') {
                return [year + '-07-01 00:00:00', year + '-10-01 00:00:00'];
            } else {
                throw 'No date range defined for quarter: ' + quarterName;
            }
        },
        /**
         * Creates a business calendar span for the quarter and
         * year
         * @param {string} quarterName One of Q1, Q2, Q3, Q4
         * @param {number} year
         * @returns {GlideRecord} a persisted business_calendar_span
         */
        createQuarter: function(quarterName, year) {
            var calendarSysId = this.getCalendarByName(this.fiscalQuarterCalendarName).getUniqueValue();
            var spanNameSysId = this.getQuarterSpanName(quarterName, year).getUniqueValue();
            var calendarSpan = new GlideRecord('business_calendar_span');
            var dateRange = this.getQuarterDateRange(quarterName, year);
            calendarSpan.addQuery('calendar', calendarSysId);
            calendarSpan.addQuery('start', dateRange[0]);
            calendarSpan.addQuery('end', dateRange[1]);
            calendarSpan.query();
            if (!calendarSpan.next()) {
                calendarSpan.newRecord();
            }
            calendarSpan.start = dateRange[0];
            calendarSpan.end = dateRange[1];
            calendarSpan.calendar = calendarSysId;
            calendarSpan.span_name = spanNameSysId;
            calendarSpan.update();
            return calendarSpan;
        },
        /**
         * Creates 4 fiscal quarters for the provided year. The quarters
         * are business_calendar_span records
         * @param {number} year
         * @returns {[GlideRecord, GlideRecord, GlideRecord, GlideRecord]} the four fiscal quarters business_calendar_span
         */
        createFiscalYearByQuarters: function(year) {
            return [
                this.createQuarter('Q1', year),
                this.createQuarter('Q2', year),
                this.createQuarter('Q3', year),
                this.createQuarter('Q4', year)
            ];
        },
        /**
         * Creates the fiscal quarter entries for a Business Calendar (business_calendar) called "Fiscal Quarter".
         * NOTE: You must create a business_calendar named "Fiscal Quarter" before creating the entries.
         * 
         * Creates all the calendar entries by quarter beginning at the start year
         * and ending at the end year
         * @param {number} startYear
         * @param {number} endYear
         */
        createFiscalQuarterEntries: function(startYear, endYear) {
            for (var year = startYear; year <= endYear; year++) {
                this.createFiscalYearByQuarters(year);
            }
        },
        /**
         * Creates the span names for the fiscal quarters for a calendar year
         * @param {number} startYear
         * @param {number} endYear
         */
        createFiscalQuarterNameEntries: function(startYear, endYear) {
            for (var year = startYear; year <= endYear; year++) {
                this.createFiscalQuartersNameEntriesByYear(year);
            }
        },
        /**
        * Creates 4 fiscal quarter span names for the provided year. The names
        * are business_calendar_span_name records. They serve as the labels for the
        * calendar entries
        * @param {number} year
        * @returns {[GlideRecord, GlideRecord, GlideRecord, GlideRecord]}
        the four fiscal quarters business_calendar_span
        */
        createFiscalQuartersNameEntriesByYear: function(year) {
            return [
                this.createFiscalQuarterName('Q1', year),
                this.createFiscalQuarterName('Q2', year),
                this.createFiscalQuarterName('Q3', year),
                this.createFiscalQuarterName('Q4', year)
            ];
        },
        /**
         * Returns the fiscal quarter span name short name
         * @param {string} quarter One of Q1, Q2, Q3, or Q4
         * @param {number} year
         * @returns {string}
         */
        getFiscalQuarterSpanNameShortName: function(quarter, year) {
            return year + ' ' + quarter;
        },

        /**
         * @param {string} quarter
         * @param {number} year
         */
        createFiscalQuarterName: function(quarter, year) {
            var calendarSysId = this.getCalendarByName(this.fiscalQuarterCalendarName).getUniqueValue();
            var spanName = new GlideRecord('business_calendar_span_name');
            var shortName = this.getFiscalQuarterSpanNameShortName(quarter, year);
            spanName.addQuery('short_name', shortName);
            spanName.addQuery('calendar', calendarSysId);
            spanName.query();
            if (!spanName.next()) {
                spanName.newRecord();
            }
            spanName.short_name = shortName;
            spanName.long_name = 'Fiscal Quarter ' + quarter;
            spanName.label = 'FY ' + year + ' ' + quarter;
            spanName.calendar = calendarSysId;
            spanName.update();
            return spanName;
        },

        fiscalYearCalendarName: 'Fiscal Year',

        /**
         * Uses the year to return a pair that represent the start and end
         * date of the year
         * @param {number} year
         * @returns {[string,string]} A pair representing the start and end
         */
        getYearDateRange: function(year) {
            return [year - 1 + '-10-01 00:00:00', year + '-10-01'];
        },

        /**
         * Returns the span name
         * @param {number} year
         * @returns {GlideRecord} business_calendar_span_name
         */
        getYearSpanName: function(year) {
            var calendar = this.getCalendarByName(this.fiscalYearCalendarName);
            var yearSpanName = new GlideRecord('business_calendar_span_name');
            yearSpanName.addQuery('calendar', calendar.getUniqueValue());
            yearSpanName.addQuery('short_name', year.toString());
            yearSpanName.query();
            if (yearSpanName.next()) {
                return yearSpanName;
            } else {
                throw 'Could not find year name using calendar: ' +
                    calendar.getDisplayValue() + ' and year: ' + year;
            }
        },
        /** 
         * Creates a business calendar span for the quarter and
         * year
         * @param {number} year
         * @returns {GlideRecord} a persisted business_calendar_span
         */
        createYear: function(year) {
            var calendarSysId = this.getCalendarByName(this.fiscalYearCalendarName).getUniqueValue();
            var spanNameSysId = this.getYearSpanName(year).getUniqueValue();
            var calendarSpan = new GlideRecord('business_calendar_span');
            var dateRange = this.getYearDateRange(year);
            calendarSpan.addQuery('calendar', calendarSysId);
            calendarSpan.addQuery('start', dateRange[0]);
            calendarSpan.addQuery('end', dateRange[1]);
            calendarSpan.query();
            if (!calendarSpan.next()) {
                calendarSpan.newRecord();
            }
            calendarSpan.start = dateRange[0];
            calendarSpan.end = dateRange[1];
            calendarSpan.calendar = calendarSysId;
            calendarSpan.span_name = spanNameSysId;
            calendarSpan.update();
            return calendarSpan;
        },
        /**
         * Creates the fiscal year entries for a Business Calendar (business_calendar) called "Fiscal Year"
         * NOTE: You must create a business_calendar named "Fiscal Year" before creating the entries.
         * 
         * Creates all the calendar entries by year beginning at the start year
         * and ending at the end year.
         * @param {number} startYear
         * @param {number} endYear
         */
        createFiscalYearEntries: function(startYear, endYear) {
            for (var year = startYear; year <= endYear; year++) {
                this.createYear(year);
            }
        },
        /**
         * Creates the span names for the fiscal calendar year
         * @param {number} startYear
         * @param {number} endYear
         */
        createFiscalYearNameEntries: function(startYear, endYear) {
            for (var year = startYear; year <= endYear; year++) {
                this.createFiscalYearName(year);
            }
        },
        /**
         *
         * @param {number} year
         * @returns {GlideRecord}
         */
        createFiscalYearName: function(year) {
            var calendarSysId = this.getCalendarByName(this.fiscalYearCalendarName).getUniqueValue();
            var spanName = new GlideRecord('business_calendar_span_name');
            /**@ts-ignore */
            var shortName = year.toString();
            spanName.addQuery('short_name', shortName);
            spanName.addQuery('calendar', calendarSysId);
            spanName.query();
            if (!spanName.next()) {
                spanName.newRecord();
            }
            spanName.short_name = shortName;
            spanName.long_name = 'Fiscal Year ' + year;
            spanName.label = 'FY ' + year;
            spanName.calendar = calendarSysId;
            spanName.update();
            return spanName;
        }
    };
})();
/**
 * This class is used to execute shell commands on a mid server. The command is executed by sending an
 * ecc_queue record to the mid server by {@link global.KLF_CommandProbe#executeCommand}. 
 * The mid server processes the command and sends the output back to
 * the ecc_queue. 
 * 
 * The ecc_queue table is used to send messages between the application server and the mid server.
 * The ecc_queue table has a topic field that is used to determine what processing is done on the ecc_queue
 * record. In this case the topic is "KLF_CommandProbe". "KLF_CommandProbe" topics are picked up by the
 * business rule {@link global.KLF_CommandProbe.onRecordInserted} that processes the command output.
 * 
 * Once the command output is processed by {@link global.KLF_CommandProbe.onRecordInserted} an event is
 * created that can be handled by a Script Action. The event name is "klf_commandprobe.response".
 */

var global = global || {};

/**
 * For details on how to use this class refer to the {@link global.KLF_CommandProbe#executeCommand} function
 * @param {string} midServer The name of the mid server
 * @param {string} [name='KLF_CommandProbeES'] The name of the probe
 */
global.KLF_CommandProbe = function(midServer, name) {
    this.midServer = midServer;
    this.name = name || "KLF_CommandProbe";
};

/**
 * Called by business rule on the ecc_queue table when the input records
 * are created with the topic "KLF_CommandProbe"
 * @param {GlideRecord} eccQueue The ecc_queue record
 */
global.KLF_CommandProbe.onRecordInserted = function(eccQueue) {
    // eccQueue should have a payload that looks like this:
    // <results probe_time="2054">
    // <result command="whoami">
    // <stdout>servicenow</stdout>
    // <stderr/>
    // </result>
    // <parameters>
    // <parameter name="agent" value="mid.server.aws_midserver"/>
    // <parameter name="signature" value=""/>
    // <parameter name="response_to" value=""/>
    // <parameter name="from_sys_id" value=""/>
    // <parameter name="source" value="3a98e38397512110b2e1f97e6253af5f"/>
    // <parameter name="priority" value="2"/>
    // <parameter name="agent_correlator" value=""/>
    // <parameter name="processed" value=""/>
    // <parameter name="error_string" value=""/>
    // <parameter name="sys_id" value="f698e38397512110b2e1f97e6253af5f"/>
    // <parameter name="sequence" value="186b282130d0000001"/>
    // <parameter name="from_host" value=""/>
    // <parameter name="sys_created_on" value="2023-03-05 16:01:54"/>
    // <parameter name="sys_domain" value="global"/>
    // <parameter name="name" value="whoami"/>
    // <parameter name="topic" value="Command"/>
    // <parameter name="state" value="ready"/>
    // <parameter name="queue" value="output"/>
    // <parameter name="ecc_queue" value="f698e38397512110b2e1f97e6253af5f"/>
    // </parameters>
    // </results>

    var payload = eccQueue.getValue('payload');
    /**
     * This is actually a ServiceNow XMLDocument object. To get the API look at the Script Include
     * @type {XMLDocument}
     */
    // @ts-ignore
    var resultsDoc = new XMLDocument(payload);

    /**
     * This is a Java object. To get the API look at JavaDoc for org.w3c.dom.Node
     * The stdout and stderr elements hold the output of the command. stdout will have the output
     * if the command executed successfully. stderr will have the output if the command failed.
     */
    var stdout = resultsDoc.getNode('//stdout');
    var stderr = resultsDoc.getNode('//stderr');

    if (stdout || stderr) {
        var output = {
            stdout: stdout ? stdout.getTextContent() : '',
            stderr: stderr ? stderr.getTextContent() : ''
        };
        var outputJson = JSON.stringify(output);
        gs.eventQueue('klf_commandprobe.response', eccQueue, outputJson, eccQueue.getValue('source'));
    } else {
        gs.eventQueue('klf_commandprobe.response', eccQueue, '', eccQueue.getValue('source'));
    }
};

global.KLF_CommandProbe.prototype = {

    /**
     * Adds a parameter to the payload that can be retrieved by a mid server
     * script include using 
     * @param {XMLDocument} payloadDoc
     * @param {HTMLElement} parametersElement
     * @param {string} name 
     * @param {string} value 
     */
    _addParameter: function(payloadDoc, parametersElement, name, value) {
        var el = payloadDoc.createElement("parameter");
        el.setAttribute("name", name);
        el.setAttribute("value", value);
        parametersElement.appendChild(el);
        return el;
    },

    /**
     * Sets the shell command to execute
     * The shell command works with the ECC Queue. An output record is created on the ECC Queue that
     * sends the command to the mid server. The mid server executes the command and sends the output
     * by crating an input record on the ECC Queue. The input record is processed by {@link global.KLF_CommandProbe.onRecordInserted}
     * {@link global.KLF_CommandProbe.onRecordInserted} will create an event called "klf_commandprobe.response" that can be handled
     * by a Script Action that you create.
     * @param {string} command The shell command to execute
     * @returns {{sysId:string,source:string,agentCorrelator:string}} The sys_id of the ecc_queue record and the value of the source field
     */
    executeCommand: function(command) {
        // @ts-ignore
        var payloadDoc = new XMLDocument();
        var parametersElement = payloadDoc.createElement("parameters");
        this._addParameter(payloadDoc, parametersElement, "name", command);
        var agentCorrelator = gs.generateGUID();
        var commandOutput = new GlideRecord("ecc_queue");
        commandOutput.newRecord();
        commandOutput.agent = "mid.server." + this.midServer;
        commandOutput.queue = "output";
        commandOutput.state = "ready";
        commandOutput.topic = "Command";
        commandOutput.name = this.name;
        commandOutput.source = 'KLF_CommandProbe';
        commandOutput.agent_correlator = agentCorrelator;
        commandOutput.payload = payloadDoc.toString();

        return {
            sysId: commandOutput.insert(),
            source: commandOutput.source,
            agentCorrelator: commandOutput.agent_correlator,
        };
    }
};
/**
 * This was an initial attempt to create a utility to export data from a scoped application. The core of it
 * uses updated sets to export data. While this method does work it creates a large amount of data in the source
 * and target instance. This method of exporting data is not recommended for large data sets. The recommended
 * method is to use KLF_RecordSync instead.
 * 
 * There are a few methods in this script that are still useful and may be used in other scripts.
 */

//@ts-ignore
var global = global || {};
// Add logging so have a better idea of what's going on

/**
 * Uses community supported 
 * {@link https://developer.servicenow.com/connect.do#!/share/contents/9824957_add_to_update_set_utility?t=PRODUCT_DETAILS|Add to Update Set Utility}
 * to export application data to an update set.
 * 
 * Primary methods are {@link KLF_DataTransferUtils.exportAllDataInTable} which exports all
 * data in a table and {@link KLF_DataTransferUtils.enhancedAddToUpdateSet}. Exporting a record
 * will include the related attachments, journal field data, currency data, price data, and
 * audit data.
 * 
 * Before starting export you'll probably want to change the "display" value for sys_user to be
 * sys_user.user_name. By default ServiceNow will try to match sys_user records based on the display value
 * which may not be unique in the target instance of an export
 * 
 * There is also a function that will generate a summary of the record count for all the tables in the
 * scoped application. This is useful estimating the amount of data that will be exported.
 * {@link KLF_DataTransferUtils.generateExportSummary}
 * 
 * @example
 * // Exporting all data in a table to update set
 * var transferUtils = new global.KLF_DataTransferUtils();
 * transferUtils.exportAllDataInTable('incident');
 * 
 * // Exporting one record to update set
 * var incident = new GlideRecord('incident');
 * incident.query();
 * incident.next();
 * var transferUtils = new global.KLF_DataTransferUtils();
 * transferUtils.enhancedAddToUpdateSet(incident);
 * @param {boolean} [isGlobal=false] true if the application is a global application
 */
global.KLF_DataTransferUtils = function(isGlobal) {
    this.isGlobal = isGlobal;
};

/**
 * Convenience function to quickly log an export summary of an entire scoped application
 * Logs the export summary to syslog with the source of KLF_DataTransferUtils
 * Refer to {@link global.KLF_DataTransferUtils.generateExportSummary}
 * @param {string} scopeName
 * @param {boolean} isGlobal
 */
global.KLF_DataTransferUtils.logExportSummary = function(scopeName, isGlobal) {
    var transferUtils = new global.KLF_DataTransferUtils(isGlobal);
    gs.log(JSON.stringify(transferUtils.generateExportSummary(scopeName), null, 4), 'KLF_DataTransferUtils');
};

global.KLF_DataTransferUtils.prototype = {
    example: function() {
        var sysId = "8cf4884f9779311024d7b066f053af8c";
        var tableName = "x_53417_demo_cat_breed";
        var glideRecord = new GlideRecord(tableName);
        glideRecord.get(sysId);
        var transferUtils = new global.KLF_DataTransferUtils();
        transferUtils.deleteAllRecordsAndRelatedRecords('x_53417_demo_cat_breed');
        // transferUtils.enhancedAddToUpdateSet(glideRecord);
        // transferUtils.exportAllDataInTable('x_53417_demo_cat_breed');
        // deleteRecordAndRelatedRecords(sysId, tableName);
        // gs.info(transferUtils.getTablesInScope('x_53417_demo'));
    },

    /**
     * Generates a hierarchical map that contains the record count for each table in the scoped application
     * the root will be the scoped application with the sum of the record count of all the tables in the scoped application
     * Below is an example of the expected output
     * {
     *   "totalRecordCount": 2000, // Total record count of all the tables in the scoped application
     *   "tables": {
     *     "x_my_app_task": {
     *       "totalRecordCount": 2000, // Record count of the recordCount and relatedRecordCount
     *       "recordCount": 1000, // Record count of the table
     *       "relatedRecordCount": 1000, // Record count of related tables
     *       "relatedTables": {
     *         "sys_journal_field": {
     *           "totalRecordCount": 500
     *           "recordCount": 500,
     *           "relatedRecordCount": 0
     *         },
     *         "sys_attachment": {
     *           "totalRecordCount": 500,
     *           "recordCount": 500,
     *           "relatedRecordCount": 0
     *         }
     *       }
     *     }
     *   }
     * }
     * @param {string} scopeName
     * @returns {*}
     */
    generateExportSummary: function(scopeName) {
        var me = this;

        /**
         * Returns the record count of related tables. This is the
         * sum of the record count of records in
         * sys_attachment, sys_attachment_doc, sys_journal_field, sys_audit, fx_currency_instance, and fx_price
         */

        /**
         * Returns the record count of a table using GlideAggregate
         * @param {string} tableName
         * @param {string} [encodedQuery]
         */
        function getRecordCount(tableName, encodedQuery) {
            // Use GlideAggregate to get the record count for each table
            var aggregate = new GlideAggregate(tableName);
            if (encodedQuery) {
                aggregate.addEncodedQuery(encodedQuery);
            }
            aggregate.addAggregate("COUNT");
            aggregate.query();
            if (aggregate.next()) {
                return parseInt(aggregate.getAggregate("COUNT")) || 0;
            }
            return 0;
        }

        /**
         * Returns the record count of sys_audit for the given tableName. This needs to work
         * differently than {@link getRecordCount} because sys_audit does not have an index
         * on tablename which makes querying by tablename extremely slow
         * @param {string} tableName
         */
        function getAuditRecordCount(tableName) {
            // Use join query to filter sys_audit instead of GlideAggregate
            var audit = new GlideRecord('sys_audit');
            audit.addJoinQuery(tableName, 'documentkey', 'sys_id');
            audit.addQuery('tablename', tableName);
            audit.query();
            return audit.getRowCount();
        }

        /**
         * Returns the attachment size of all the attachments for the table using the encodedQuery and by
         * expanding the encodedQuery to included any tables that extend the base table
         * @param {string} baseTableName A table that is potentially extended
         * @param {*} [encodedQuery]
         * @returns {number} The size of all the attachments on the table
         */
        function getAttachmentSize(baseTableName, encodedQuery) {
            var _encodedQuery = encodedQuery || '';

            // The table could be extended. Get all the tables in the hierarchy including the table
            var extendedTables = me.getExtendingTables(baseTableName);
            return extendedTables.reduce(function(attachmentSize, extendedTableName) {
                // The encodedQuery could be an interpolated string. I allow the table name to be interpolated
                // using the pattern {{tableName}}. Replace the pattern with the actual table name
                var processedEncodedQuery = _encodedQuery.replace("{{tableName}}", extendedTableName);
                // Use GlideAggregate to get the record count for each table
                var aggregate = new GlideAggregate('sys_attachment');
                if (processedEncodedQuery) {
                    aggregate.addEncodedQuery(processedEncodedQuery);
                }
                var sum = 0;
                aggregate.addAggregate("SUM", "size_bytes");
                aggregate.addNotNullQuery('size_bytes');
                aggregate.setGroup(false); // Don't group by anything so I just sum all the rows
                aggregate.query();
                if (aggregate.next()) {
                    sum = parseInt(aggregate.getAggregate("SUM", "size_bytes")) || 0;
                }
                return attachmentSize + sum;
            }, 0);
        }

        /**
         * Returns the record count of the passed in table using the encodedQuery and by
         * expanding the encodedQuery to included any tables that extend the base table
         * @param {string} tableName 
         * @param {string} baseTableName A table that is potentially extended
         * @param {*} [encodedQuery]
         * @returns 
         */
        function getBaseRecordCount(tableName, baseTableName, encodedQuery) {
            var _encodedQuery = encodedQuery || '';


            // The table could be extended. Get all the tables in the hierarchy including the table
            var extendedTables = me.getExtendingTables(baseTableName);
            return extendedTables.reduce(function(recordCount, extendedTableName) {
                // The encodedQuery could be an interpolated string. I allow the table name to be interpolated
                // using the pattern {{tableName}}. Replace the pattern with the actual table name
                var processedEncodedQuery = _encodedQuery.replace("{{tableName}}", extendedTableName);
                if (tableName == 'sys_audit') {
                    return recordCount + getAuditRecordCount(extendedTableName);
                } else {
                    return recordCount + getRecordCount(tableName, processedEncodedQuery);
                }
            }, 0);
        }

        /**
         * This is the type definition for the table object that is contained in the application object
         * @typedef {{
         *  recordCount: number;
         *  relatedTables: {
         *      sys_attachment: {
         *          recordCount: number;
         *          relatedRecordCount: number;
         *          totalRecordCount: number;
         *      };
         *      sys_attachment_doc: {
         *          recordCount: number;
         *          relatedRecordCount: number;
         *          totalRecordCount: number;
         *      };
         *      sys_journal_field: {
         *          recordCount: number;
         *          relatedRecordCount: number;
         *          totalRecordCount: number;
         *      };
         *      sys_audit: {
         *          recordCount: number;
         *          relatedRecordCount: number;
         *          totalRecordCount: number;
         *      };
         *      fx_currency_instance: {
         *          recordCount: number;
         *          relatedRecordCount: number;
         *          totalRecordCount: number;
         *      };
         *      fx_price: {
         *          recordCount: number;
         *          relatedRecordCount: number;
         *          totalRecordCount: number;
         *      };
         *  };
         *  relatedRecordCount: number;
         *  totalRecordCount: number;
         * }} _Table
         */

        var application = {
            tables: /** @type {{[tableName:string]:_Table}} */ ({}),
            totalRecordCount: 0,
            totalAuditCount: 0,
            totalJournalCount: 0,
            totalAttachmentCount: 0,
            totalAttachmentSize: 0,
            totalAttachmentDocCount: 0,
            totalCurrencyCount: 0,
            totalPriceCount: 0
        };

        var tables = this.getBaseTablesInScope(scopeName);
        tables.reduce(function(application, /** @type {string} */ tableName) {
            /**
             * @param {string} relatedTableName 
             * @param {string} [encodedQuery]
             */
            function getRelatedTable(relatedTableName, encodedQuery) {
                var table = {
                    recordCount: getBaseRecordCount(relatedTableName, tableName, encodedQuery),
                    relatedRecordCount: 0,
                    totalRecordCount: 0
                };
                if (relatedTableName == 'sys_attachment') {
                    // @ts-ignore
                    table.totalAttachmentSize = getAttachmentSize(tableName, encodedQuery);
                }
                table.totalRecordCount = table.recordCount + table.relatedRecordCount;
                return table;
            }

            /** @type {_Table} */
            var table = {};
            table.recordCount = getRecordCount(tableName); // This gets record count of the table

            // I also need to get the record count of related tables
            // The related tables are sys_attachment, sys_attachment_doc, sys_journal_field, sys_audit, fx_currency_instance, and fx_price
            var relatedTables = {
                sys_attachment: getRelatedTable("sys_attachment", "table_name={{tableName}}^ORtable_name=ZZ_YY{{tableName}}"), // ZZ_YY prefix is used when attachments are used on attachment fields
                sys_attachment_doc: getRelatedTable("sys_attachment_doc", "sys_attachment.table_name={{tableName}}^ORsys_attachment.table_name=ZZ_YY{{tableName}}"), // ZZ_YY prefix is used when attachments are used on attachment fields
                sys_journal_field: getRelatedTable("sys_journal_field", "name={{tableName}}"),
                sys_audit: getRelatedTable("sys_audit"),
                fx_currency_instance: getRelatedTable("fx_currency_instance", "table={{tableName}}"),
                fx_price: getRelatedTable("fx_price", "table={{tableName}}")
            };

            table.relatedTables = relatedTables;

            // Sum the record count of the related tables
            table.relatedRecordCount = Object.keys(relatedTables).reduce(function(relatedRecordCount, relatedTable) {
                // @ts-ignore
                return relatedRecordCount + relatedTables[relatedTable].totalRecordCount;
            }, 0);

            table.totalRecordCount = table.recordCount + table.relatedRecordCount;

            application.totalRecordCount += table.totalRecordCount;
            application.totalAuditCount += table.relatedTables.sys_audit.totalRecordCount;
            application.totalJournalCount += table.relatedTables.sys_journal_field.totalRecordCount;
            application.totalAttachmentCount += table.relatedTables.sys_attachment.totalRecordCount;
            // @ts-ignore
            application.totalAttachmentSize += table.relatedTables.sys_attachment.totalAttachmentSize;
            application.totalAttachmentDocCount += table.relatedTables.sys_attachment_doc.totalRecordCount;
            application.totalCurrencyCount += table.relatedTables.fx_currency_instance.totalRecordCount;
            application.totalPriceCount += table.relatedTables.fx_price.totalRecordCount;
            application.tables[tableName] = table;
            return application;
        }, application);

        // convert attachment size to a human readable number
        // @ts-ignore
        application.totalAttachmentSize = this.getReadableFileSizeString(application.totalAttachmentSize);

        return application;
    },


    /**
     * Return a list of all the tables in the scoped application
     *
     * Exclude tables is a list of tables that will be removed from the list. Tables in the
     * exclude list will exclude the excluded table and any table that extends the excluded table
     * @param {string} scopeNamespace
     * @param {string[]} [excludedTables]
     */
    getTablesInScope: function(scopeNamespace, excludedTables) {
        var _excludedTables = excludedTables || [];
        var me = this;

        var tables = [];
        var tableDefinition = new GlideRecord("sys_db_object");
        if (this.isGlobal) {
            // if this is a global namespace then use the name because
            // all global scopes will have a namespace of global, but the
            // name will be different
            tableDefinition.addQuery("sys_scope.name", scopeNamespace);
        } else {
            tableDefinition.addQuery("sys_scope.scope", scopeNamespace);
        }
        tableDefinition.addQuery("scriptable_table", false);
        tableDefinition.query();
        while (tableDefinition.next()) {
            var tableName = tableDefinition.name.toString();
            // Make sure this table actually exists
            if (new GlideRecord(tableName).isValid()) {
                tables.push(tableName);
            }
        }
        return tables.filter(function(table) {
            var hierarchy = me.getTableAncestors(table);
            // Check the hierarchy to make sure none of the excluded tables are in the hierarchy
            return _excludedTables.every(function(excludedTable) {
                return hierarchy.indexOf(excludedTable) == -1;
            });
        });
    },

    /**
     * Returns list of tables that extend the table
     * @param {string} table
     * @returns {string[]}
     */
    getExtendingTables: function(table) {
        return new global.ArrayUtil().convertArray(new global.TableUtils(table).getAllExtensions())
            .map(function(table) {
                return String(table);
            });
    },

    /**
     * Returns list of tables in the parent hierarchy including the table
     * @param {string} table
     * @returns {string[]}
     */
    getTableAncestors: function(table) {
        return new global.ArrayUtil().convertArray(new global.TableUtils(table).getTables())
            .map(function(table) {
                return String(table);
            });
    },

    /**
     * Returns the name of a table that is in the application scope that this table extends.
     * If the table does not extend a table it returns the table name
     * @param {string} scopeNamespace 
     * @param {string} table 
     * @returns 
     */
    getBaseTableInScope: function(scopeNamespace, table) {
        // hierarchy is arranged from extended table to base table. The absolute base table will be last in the list.
        // This plucks the last table in the list until it finds one that matches the scopeNamespace
        var hierarchy = this.getTableAncestors(table);
        var baseInScope = '';
        // @ts-ignore
        while (baseInScope = hierarchy.pop()) {
            if (baseInScope.startsWith(scopeNamespace)) {
                break;
            }
        }
        return baseInScope || table;
    },

    /**
     * This returns only the base tables in the scope. The difference between this and
     * {@link KLF_DataTransferUtils.getTablesInScope} is that this method will filter out any
     * table extensions and only include the base tables and any tables that aren't extended.
     * 
     * Exclude tables is a list of tables that will be removed from the list. Tables in the
     * exclude list will exclude the excluded table and any table that extends the excluded table
     * @param {string} scopeNamespace
     * @param {string[]} [excludedTables]
     */
    getBaseTablesInScope: function(scopeNamespace, excludedTables) {
        if (!scopeNamespace) {
            return [];
        }

        var _excludedTables = excludedTables || [];
        var me = this;

        // holds the unique list of base tables. the key is the base table name
        // the value is not used
        var baseTableMap = this.getTablesInScope(scopeNamespace).reduce(function(baseTables, table) {
            baseTables[me.getBaseTableInScope(scopeNamespace, table)] = null;
            return baseTables;
        }, {});
        return Object.keys(baseTableMap).filter(function(table) {
            var hierarchy = me.getTableAncestors(table);
            // Check the hierarchy to make sure none of the excluded tables are in the hierarchy
            return _excludedTables.every(function(excludedTable) {
                return hierarchy.indexOf(excludedTable) == -1;
            });
        });
    },

    /**
     * Adds the record's related journal entries to the update set
     * @param {GlideRecord} parent
     */
    addJournalEntries: function(parent) {
        var journal = new GlideRecord("sys_journal_field");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        journal.addQuery("name", parent.getRecordClassName());
        journal.addQuery("element_id", parent.getUniqueValue());
        journal.query();
        while (journal.next()) {
            // Using saveRecord to add these records to the update set directly w/out
            // going through all the things that addToUpdateSet does
            new global.addToUpdateSetUtils().saveRecord(journal, true, false);
        }
    },

    /**
     * Adds the record's related audit entries to the update set
     * @param {GlideRecord} parent
     */
    addAuditEntries: function(parent) {
        var audit = new GlideRecord("sys_audit");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        audit.addQuery("tablename", parent.getRecordClassName());
        audit.addQuery("documentkey", parent.getUniqueValue());
        audit.query();
        while (audit.next()) {
            // Using saveRecord to add these records to the update set directly w/out
            // going through all the things that addToUpdateSet does
            new global.addToUpdateSetUtils().saveRecord(audit, true, false);
        }
    },

    /**
     * Adds the record's related currency entries to the update set
     * @param {GlideRecord} parent
     */
    addCurrencyEntries: function(parent) {
        var currency = new GlideRecord("fx_currency_instance");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        currency.addQuery("table", parent.getRecordClassName());
        currency.addQuery("id", parent.getUniqueValue());
        currency.query();
        while (currency.next()) {
            // Using saveRecord to add these records to the update set directly w/out
            // going through all the things that addToUpdateSet does
            new global.addToUpdateSetUtils().saveRecord(currency, true, false);
        }
    },

    /**
     * Adds the record's related currency entries to the update set
     * @param {GlideRecord} parent
     */
    addPriceEntries: function(parent) {
        var price = new GlideRecord("fx_price");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        price.addQuery("table", parent.getRecordClassName());
        price.addQuery("id", parent.getUniqueValue());
        price.query();
        while (price.next()) {
            // Using saveRecord to add these records to the update set directly w/out
            // going through all the things that addToUpdateSet does
            new global.addToUpdateSetUtils().saveRecord(price, true, false);
        }
    },

    /**
     * Adds the record and its related audit entries, journal entries, and attachments to the update set
     * @param {GlideRecord} glideRecord
     */
    enhancedAddToUpdateSet: function(glideRecord) {
        var _addToUpdateSetUtils = new global.addToUpdateSetUtils();
        // Disable adding attachments to the update set. Attachments
        // are already included in the base record XML for data records
        _addToUpdateSetUtils.includeAttachments = false;
        _addToUpdateSetUtils.addToUpdateSet(glideRecord);
        this.addAuditEntries(glideRecord);
        this.addJournalEntries(glideRecord);
    },

    /**
     * Use {@link KLF_DataTransferUtils.enhancedAddToUpdateSet} to export all the data in a table
     * @param {string} tableName
     */
    exportAllDataInTable: function(tableName) {
        var glideRecord = new GlideRecord(tableName);
        glideRecord.query();
        while (glideRecord.next()) {
            this.enhancedAddToUpdateSet(glideRecord);
        }
    },

    /**
     * Exportal all the data in the scope excluding any tables listed in the excluded table
     * list
     * @param {string} scopeNamespace
     * @param {string[]} excludedTables
     */
    exportAllDataInScope: function(scopeNamespace, excludedTables) {
        var tables = this.getBaseTablesInScope(scopeNamespace, excludedTables);
        var me = this;
        tables.forEach(function(table) {
            me.exportAllDataInTable(table);
        });
    },

    /**
     * Deletes all records and related audit entries, journal entries, and attachments in a scope
     * Useful for when you are testing loading data from a different instance and you want
     * to delete the data before loading new data
     * @param {string} scopeNamespace
     * @param {string[]} excludedTables
     */
    deleteAllRecordsAndRelatedRecordsInScope: function(scopeNamespace, excludedTables) {
        if (!scopeNamespace) {
            gs.error("scopeNamespace is required");
            return;
        }

        var tables = this.getTablesInScope(scopeNamespace, excludedTables);
        var me = this;
        tables.forEach(function(table) {
            me.deleteAllRecordsAndRelatedRecords(table);
        });
    },

    /**
     * Deletes all records and related audit entries, journal entries, and attachments in a table
     * Useful for when you are testing loading data from a different instance and you want
     * to delete the data before loading new data
     * @param {string} tableName
     */
    deleteAllRecordsAndRelatedRecords: function(tableName) {
        var me = this;

        if (!tableName) {
            gs.error("tableName is required");
            return;
        }

        var glideRecord = new GlideRecord(tableName);
        glideRecord.query();
        // Collect all sys_ids before deleting records
        var sysIds = [];
        while (glideRecord.next()) {
            sysIds.push(glideRecord.getUniqueValue());
        }

        // Delete all the records at once
        glideRecord.setWorkflow(false);
        glideRecord.deleteMultiple();

        // Delete related audit entries
        sysIds.forEach(function(sysId) {
            me.deleteRecordAndRelatedRecords(sysId, tableName);
        });
    },

    /**
     * Deletes a record and its related audit entries, journal entries, and attachments
     * Useful for when you are testing loading data from a different instance and you want
     * to delete the data before loading new data
     * @param {string} sysId
     * @param {string} tableName
     */
    deleteRecordAndRelatedRecords: function(sysId, tableName) {
        if (!sysId || !tableName) {
            gs.error("sysId and tableName are required");
            return;
        }

        // Delete related audit entries
        var audit = new GlideRecord("sys_audit");
        audit.addQuery("tablename", tableName);
        audit.addQuery("documentkey", sysId);
        audit.deleteMultiple();

        // Delete related journal entries
        var journal = new GlideRecord("sys_journal_field");
        journal.addQuery("name", tableName);
        journal.addQuery("element_id", sysId);
        journal.deleteMultiple();

        // Delete related attachments
        var attachment = new GlideRecord("sys_attachment");
        attachment
            .addQuery("table_name", tableName)
            .addOrCondition("table_name", "ZZ_YY" + tableName);
        attachment.addQuery("table_sys_id", sysId);
        attachment.deleteMultiple();

        // Delete related history entries
        var historySet = new GlideRecord("sys_history_set");
        historySet.addQuery("table", tableName);
        historySet.addQuery("id", sysId);
        historySet.deleteMultiple();

        var record = new GlideRecord(tableName);
        record.addQuery("sys_id", sysId);
        record.deleteMultiple();
    },

    /**
     * Returns the number of bytes in a human readable size
     * @param {number} fileSizeInBytes The number of bytes
     * @returns {string} A human readable file size
     */
    getReadableFileSizeString: function(fileSizeInBytes) {
        var i = -1;
        var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
        do {
            fileSizeInBytes /= 1024;
            i++;
        } while (fileSizeInBytes > 1024);

        return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
    }
};
/**
 * This utility object provides a convenient way to execute GlideRecord operations from a scoped application
 * on globally scoped tables. This is useful when you need to perform operations on tables that are restricted
 * to global scope.
 * 
 * It also provides a function to transform a GlideRecord into a map. This is useful when you need to pass
 * GlideRecord data to a client script. The map can be easily converted to JSON and passed to the client script.
 */

//@ts-ignore
var global = global || {};
global.KLF_GlideRecordUtils = function() {};

global.KLF_GlideRecordUtils.prototype = {
    /**
     * Transforms the GlideRecord into a map. The exact set of fields to be included can be passed.
     * If fields is not provided then all non 'sys' fields will be included. Sys fields are excluded
     * from output. The keys in the map are the field names. Thevalues are the values retrieved with
     * {@link GlideRecord#getValues}. Display values are copied over to the key value with a suffix of
     * _display_value. A write flag is copied to the key value witha suffie of _canwrite
     * @param {GlideRecord} glideRecord 
     * @param {string[]} [fields]
     * @returns {Object.<string,string>}
     */
    glideRecordToMap: function(glideRecord, fields) {
        /** @type {Object.<string, string>} */
        var glideRecordMap = {};
        var elements = new global.ArrayUtil().convertArray(glideRecord.getElements());
        elements.filter(function(element) {
            var name = element.getName();

            // if the fields are specified only include fields in map
            if (fields) {
                return fields.indexOf(name) >= 0;
            }

            if (name == 'sys_id') {
                return true;
            } else if (name.startsWith('sys_')) {
                return false;
            } else {
                return true;
            }
        }).forEach(function(element) {
            var name = element.getName();
            var displayName = name + '_display_value';
            var writeName = name + '_canwrite';
            var value = glideRecord.getValue(name);
            var displayValue = glideRecord.getDisplayValue(name);
            glideRecord[name] = value;
            glideRecord[displayName] = displayValue;
            glideRecord[writeName] = glideRecord[name].canWrite();
        });

        return glideRecordMap;
    },

    /**
     * Used to delete records from tables only accessible in Global scope. Some tables
     * restrict delete access to only Global so a scoped application can use this method
     * to delete records in global scope they otherwise wouldn't be able to delete. You
     * can pass the encodedQuery by generating an encodedQuery using a GlideRecord in the
     * current scope and pass it to this function
     * @param {string} tableName The table name to perform deletion
     * @param {string} encodedQuery An encoded query passed to this function to filter
     * the records to delete
     * query params before deletion. This is required
     * @example var taskDelete = new GlideRecord('task');
     * taskDelete.addQuery(active, false);
     * new global.KLF_GlideRecord().deleteRecord('incident', taskDelete.getEncodedQuery());
     */
    deleteRecord: function(tableName, encodedQuery) {
        if (!encodedQuery) {
            throw 'encodedQuery is required';
        }

        var glideRecord = new GlideRecord(tableName);
        glideRecord.addEncodedQuery(encodedQuery);
        glideRecord.query();

        while (glideRecord.next()) {
            glideRecord.deleteRecord();
        }
    },

    /**
     * Used to insert records from tables only accessible in Global scope. Some tables
     * restrict write access to only Global so a scoped application can use this method
     * to insert records in global scope they otherwise wouldn't be able to update. 	
     * @param {string} tableName The table name to perform deletion
     * @param {*} updates An object containing the fields and values to update
     * @example var taskInsert = new GlideRecord('task');
     * new global.KLF_GlideRecord().insertRecord('incident', {
     *   short_description: 'Updated description'
     * });
     */
    insertRecord: function(tableName, updates) {
        if (!updates) {
            throw 'updates is required';
        }

        var glideRecord = new GlideRecord(tableName);
        glideRecord.newRecord();

        Object.keys(updates).forEach(function(field) {
            glideRecord.setValue(field, updates[field]);
        });
        glideRecord.update();
        return glideRecord;
    },

    /**
     * Used to update records from tables only accessible in Global scope. Some tables
     * restrict write access to only Global so a scoped application can use this method
     * to update records in global scope they otherwise wouldn't be able to update. You
     * can pass the encodedQuery by generating an encodedQuery using a GlideRecord in the
     * current scope and pass it to this function
     * @param {string} tableName The table name to perform deletion
     * @param {string} encodedQuery An encoded query passed to this function to filter
     * @param {*} updates An object containing the fields and values to update
     * @returns {string[]} An array of sys_ids of the records updated
     * @example var taskUpdate = new GlideRecord('task');
     * taskUpdate.addQuery(active, false);
     * new global.KLF_GlideRecord().updateRecord('incident', taskUpdate.getEncodedQuery(), {
     *   short_description: 'Updated description'
     * });
     */
    updateRecord: function(tableName, encodedQuery, updates) {
        if (!encodedQuery) {
            throw 'encodedQuery is required';
        }
        if (!updates) {
            throw 'updates is required';
        }

        var glideRecord = new GlideRecord(tableName);
        glideRecord.addEncodedQuery(encodedQuery);
        glideRecord.query();

        /** @type {string[]} */
        var updatedSysIds = [];
        while (glideRecord.next()) {
            Object.keys(updates).forEach(function(field) {
                glideRecord.setValue(field, updates[field]);
            });
            glideRecord.update();
            updatedSysIds.push(glideRecord.getUniqueValue());
        }

        return updatedSysIds;
    }

};
/**
 * This script contains general functions that help with group management in ServiceNow.
 * - getGroupByName: Retrieves the sys_user_group based on a group name or alias.
 * - getGroupFields: Finds all the fields that reference sys_user_group in a scoped app.
 * - changeGroupName: This looks for all references to group `oldName` in the system and replaces 
 * that group reference with the `newName` group. This is useful for when an application needs to update all the references of an old group
 * to a new group
 * - syncChildGroupMembers: This will make the membership of the parent group equal to the membership of its child groups. Basically, it copies the child group membership
 * into the parent group
 */

//@ts-ignore
var global = global || {};

global.KLF_GroupUtils = function() {};

global.KLF_GroupUtils.prototype = {

    /**
     * Retrieves the sys_user_group based on a group alias. The alias can alson include
     * the ServiceNow concatenated alias.
     * @param {string} name One of the aliases for a group.
     * @returns {?GlideRecord} The sys_user_group or null
     */
    getGroupByName: function(name) {
        if (!name) return null;

        var group = new GlideRecord('sys_user_group');
        group.addQuery('name', name)
            .addOrCondition('name', 'CONTAINS', name + '^')
            .addOrCondition('name', 'CONTAINS', '^' + name);
        group.query();
        while (group.next()) {
            /** @type {string} **/
            var groupName = group.name.toString();
            if (groupName.split('^').length > 1) {
                var aliases = groupName.split('^');
                var match = aliases.some(function(alias) {
                    return name == alias;
                });
                if (match) {
                    return group;
                }
            } else {
                return group; // exact match
            }
        }

        gs.warn('Cannot find group by name: ' + name);

        return null;
    },

    /**
     * Data type returned from call to {@link GroupUtils.getGroupFields}
     * @typedef GroupField
     * @property {string} table The name of the table that contains the field
     * @property {string} type The type of the field from sys_dictionary
     * @property {string} columnName The column name of the field
     * @property {?string} [filter] A pass through optional filter. Used to query for records that contain the field
     */

    /**
     * Finds all the fields that reference sys_user_group in a scoped app. This attempts to find
     * all the group fields in the system. The group fields will include both reference fields and
     * list fields that reference sys_user_group
     * @param {string} scopeSysId sys_scope.sys_id
     * @param {string} [filter] GlideRecord encoded query
     * @returns {GroupField[]}
     */
    getGroupFields: function(scopeSysId, filter) {
        var fieldGr = new GlideRecord('sys_dictionary');
        fieldGr.addQuery('sys_scope', scopeSysId);
        fieldGr.addQuery('reference', 'sys_user_group');
        fieldGr.query();
        var fields = [];
        while (fieldGr.next()) {
            fields.push({
                table: fieldGr.name.toString(),
                type: fieldGr.internal_type.toString(),
                columnName: fieldGr.element.toString(),
                filter: filter
            });
        }
        return fields;
    },

    /**
     * Uses the field retrieved from {@link GroupUtils.getGroupFields}
     * to query for records and update the group name. The field
     * must be a list field. This will only update the specific group in the list
     * and leave the rest of the groups in place
     * @param {GroupField} field
     * @param {GlideRecord} oldGroup
     * @param {GlideRecord} newGroup
     * @returns {string[]} A list of sys_ids that have been updated
     */
    updateListGroupField: function(field, oldGroup, newGroup) {
        var gr = new GlideRecord(field.table);
        gr.addQuery(field.columnName, oldGroup.sys_id.toString());
        if (field.filter) {
            gr.addEncodedQuery(field.filter);
        }
        gr.query();
        var updates = [];
        while (gr.next()) {
            gr.setWorkflow(false);
            gr.autoSysFields(false);
            var groups = gr.getValue(field.columnName);
            var updatedGroups = groups.split(',').map(function(sys_id) {
                if (sys_id == oldGroup.sys_id.toString()) {
                    return newGroup.sys_id.toString();
                } else {
                    return sys_id;
                }
            }).join(',');
            gr.setValue(field.columnName, updatedGroups);
            gr.update();
            updates.push(gr.getUniqueValue());
        }
        return updates;
    },

    /**
     * Uses the field retrieved from {@link GroupUtils.getGroupFields}
     * to query for records and update the group name. The field
     * must be a reference field
     * @param {GroupField} field
     * @param {GlideRecord} oldGroup
     * @param {GlideRecord} newGroup
     * @returns {string[]} A list of sys_ids that have been updated
     */
    updateReferenceGroupField: function(field, oldGroup, newGroup) {
        var gr = new GlideRecord(field.table);
        // only kill the workflow isf the table isn't tracked
        gr.addQuery(field.columnName, oldGroup.sys_id.toString());
        if (field.filter) {
            gr.addEncodedQuery(field.filter);
        }
        gr.query();
        var updates = [];
        while (gr.next()) {
            gr.setWorkflow(false);
            gr.autoSysFields(false);
            gr.setValue(field.columnName, newGroup.sys_id.toString());
            gr.update();
            updates.push(gr.getUniqueValue());
        }
        return updates;
    },

    /**
     * @typedef ReportEntry
     * @property {string} sysId The sys_id of the record that was updated
     * @property {string} table Table of the record that was updated
     * @property {string} column Column of the table that was updated
     * @property {string} oldName The old group name
     * @property {string} newName The new group name
     */

    /**
     * This looks for all references to group oldName in the system and replaces
     * that group reference with the newName gorup. A GlideRecord encoded query can
     * be provided to filter for records that you want to target. If no filter is provided
     * all records in the system will attempt to be updated with the new name. This
     * method is useful when there are changes to group names. This method will
     * not look at sys_properties or any hardcoded sys_ids or group names you may directly have
     * in source code. It also doesn't look at notifications or email scripts.
     * To find references in code you may want to search sys_metadata using text search for the
     * old group name
     * @param {string} scopedAppName The name of the scoped application to query for group fields
     * @param {string} oldName The old name of the group
     * @param {string} newName The new name of the group
     * @param {string} [filter] GlideRecord encoded query
     * @returns {ReportEntry[]}
     */
    changeGroupName: function(scopedAppName, oldName, newName, filter) {
        var scopedApp = new GlideRecord('sys_scope');
        if (!scopedApp.get('name', scopedAppName)) {
            gs.error('Could not find scoped app using name: ' + scopedAppName);
        }
        var scopedAppSysId = scopedApp.getUniqueValue();

        var me = this;
        /** @type {ReportEntry[]} */
        var report = [];
        var oldGroup = /** @type {GlideRecord} */ (this.getGroupByName(oldName));
        var newGroup = /** @type {GlideRecord} */ (this.getGroupByName(newName));

        if (!oldGroup) {
            gs.error('Cannot find group: ' + oldName);
            return [];
        }

        if (!newGroup) {
            gs.error('Cannot find group: ' + newName);
            return [];
        }

        me.getGroupFields(scopedAppSysId, filter).forEach(function(field) {
            if (field.type == 'reference') {
                var updatedSysIds = me.updateReferenceGroupField(field, oldGroup, newGroup);
                var referenceReport = updatedSysIds.map(function(sysId) {
                    return {
                        sysId: sysId,
                        table: field.table,
                        column: field.columnName,
                        oldName: oldName,
                        newName: newName
                    };
                });
                report = /** @type {ReportEntry[]} */ ([]).concat(report, referenceReport);
            } else if (field.type == 'glide_list') {
                var updatedListSysIds = me.updateListGroupField(field, oldGroup, newGroup);
                var listReport = updatedListSysIds.map(function(sysId) {
                    return {
                        sysId: sysId,
                        table: field.table,
                        column: field.columnName,
                        oldName: oldName,
                        newName: newName
                    };
                });

                report = /** @type {ReportEntry[]} */ ([]).concat(report, listReport);
            } else {
                gs.error('Cannot update field: ' + field.table + '.' + field.columnName + ' : ' + field.type);
            }
        });

        return report;
    },

    /**
     * This will make the membership of the parent group equal to the membership of its child groups. Child groups
     * are groups where the sys_user_group.parent field is set to the passed in parentGroupSysId
     * This will sync the membership exactly. If there is a member in the parent group that is not in one of the
     * child groups that member will be removed. All members of child groups will be added directly to the passed
     * in parent group
     * @param {string} parentGroupSysId
     */
    syncChildGroupMembers: function(parentGroupSysId) {
        var parentGroup = new GlideRecord('sys_user_group');
        parentGroup.get(parentGroupSysId);

        // This will hold the sys_ids of all the members of all the child groups of the parent
        // group. I will initialize this with the current members of the parent group. These will
        // be initialized to "false". If I see the current member in one of the child groups the
        // flag will be set to "true". This is so I can clean up members that no longer exist in
        // the child group
        var members = /** @type {{[userSysId:string]:boolean}} */ ({});

        // Load up the current members
        var currentMember = new GlideRecord('sys_user_grmember');
        currentMember.addQuery('group', parentGroup.getUniqueValue());
        currentMember.query();
        while (currentMember.next()) {
            // Default this to false. I'm using this later to see if
            // the user is still in the aggregated parent group
            members[currentMember.getValue('user')] = false;
        }

        // Go through all the child groups and populate the member object. Any member
        // that is seen will be set to "true"
        var childGroup = new GlideRecord('sys_user_group');
        childGroup.addQuery('parent', parentGroup.getUniqueValue());
        childGroup.query();
        while (childGroup.next()) {
            // Get members
            var groupMember = new GlideRecord('sys_user_grmember');
            groupMember.addQuery('group', childGroup.getUniqueValue());
            groupMember.query();
            while (groupMember.next()) {
                members[groupMember.getValue('user')] = true;
            }
        }

        var memberSysIds = Object.keys(members);

        // Valid members are all members we saw in the child groups
        var validMembers = memberSysIds.filter(function(memberSysId) {
            return members[memberSysId];
        });
        addMembers(parentGroup.getUniqueValue(), validMembers);

        // Invalid members are all members that are in the parent group that we didn't
        // see in the child group
        var invalidMembers = memberSysIds.filter(function(memberSysId) {
            return !members[memberSysId];
        });
        removeMembers(parentGroup.getUniqueValue(), invalidMembers);

        /**
         * Adds the list of users to the group
         * @param {string} groupSysId sys_user_group.sys_id
         * @param {string[]} memberSysIds sys_user.sys_id[]
         */
        function addMembers(groupSysId, memberSysIds) {
            memberSysIds.forEach(function(memberSysId) {
                var groupMember = new GlideRecord('sys_user_group');
                groupMember.addQuery('group', groupSysId);
                groupMember.addQuery('user', memberSysId);
                groupMember.query();
                if (groupMember.getRowCount() === 0) {
                    groupMember.newRecord();
                    groupMember.group = groupSysId;
                    groupMember.user = memberSysId;
                    groupMember.update();
                }
            });
        }

        /**
         * Removes the list of users from the group
         * @param {string} groupSysId sys_user_group.sys_id
         * @param {string[]} memberSysIds sys_user.sys_id[]
         */
        function removeMembers(groupSysId, memberSysIds) {
            memberSysIds.forEach(function(memberSysId) {
                var groupMember = new GlideRecord('sys_user_group');
                groupMember.addQuery('group', groupSysId);
                groupMember.addQuery('user', memberSysId);
                groupMember.query();
                if (groupMember.next()) {
                    groupMember.deleteRecord();
                }
            });
        }
    }
};
/**
 * This script is used to ingest groups from LDAP into ServiceNow. Depending on the configuration
 * it can also properly ingest nested groups by recursively adding the members of nested groups
 * to the parent group.
 * 
 * It can ingest a single group or multiple groups. It can also refresh the membership of multiple
 * groups based on the group type names or sys_ids.
 */

//@ts-ignore
var global = global || {};
/**
 * There was no where to put this information, so storing it here. These are the attributes
 * available for active directory LDAP entry:
 * actualdn,cn,description,displayName,distinguishedName,dn,
 * extensionAttributel,extensionAttribute2,groupType,instanceType,
 * internetEncoding, mail, mailNickname, me.mber, memberOf, name, objectCategory,
 * objectClass,objectGUID,objectSid,proxyAddresses,reportToOriginator,
 * sAMAccountName,sAMAccountType,showinAddressBook,source,uSNChanged,
 * uSNCreated,whenChanged,whenCreated
 */
/**
 * @class global.KLF_LdapGroupService
 * @param {Object} [connectionConfig] A configuration object
 * @param {boolean} [connectionConfig.includeNestedGroups=false] Includes the members of any nested groups in resolved groups.
 * Otherwise only the top level members .will be included
 * @param {string} [connectionConfig.ldapServerName=LDAP] The ldap server name of the LDAP server to query against. Will be set to
 * LDAP by default if isActiveDirectoryGroups is false, LDAP-AD otherwise
 * @param {boolean} [connectionConfig.isActiveDirectoryGroups=false] Configures searches to run against active directory
 * @param {string} [connectionConfig.ingestTypeName=KLF_LDAP_GROUP] The sys_user_group_type that is added to a new group that is ingested by this class.
 * This will be set to KLF_LDAP_GROUP if isActiveDirectoryGroups is false, KLF_LDAP_AD otherwise
 * @param {string} [connectionConfig.searchRdn=ou=Groups] The rdn to limit searches of the directory to. For LDAP groups
 * this defaults to ou=Groups. Empty string is default for AD
 * @param {string} [connectionConfig.logSource=KLF_LdapGroupService] The source to add to log messages generated by this class. By default
 * KLF_LdapGroupService
 */
function KLF_LdapGroupService(connectionConfig) {
    connectionConfig = connectionConfig || {};
    this.includeNestedGroups = connectionConfig.includeNestedGroups || false;
    this.isActiveDirectoryGroups = connectionConfig.isActiveDirectoryGroups || false;
    this.logSource = connectionConfig.logSource || 'KLF_LdapGroupService';
    var defaultLdapServerName = this.isActiveDirectoryGroups ? 'LDAP-AD' : 'LDAP';
    this.ldapServerSysId = this._getLdapServerSysIdByName(connectionConfig.ldapServerName || defaultLdapServerName);
    this.processedGroups = [];
    var defaultingestTypeName = this.isActiveDirectoryGroups ?
        this.getDefaultAdGroupTypeName() : this.getDefaultLdapGroupTypeName();
    this.ingestTypeName = connectionConfig.ingestTypeName || defaultingestTypeName;
    var defaultSearchRdn = this.isActiveDirectoryGroups ? '' : 'ou=Groups~';
    this.searchRdn = connectionConfig.searchRdn || defaultSearchRdn;
}

KLF_LdapGroupService.prototype = {
    /**
     * These properties are not accessible directly. You must call
     * LdapResult.get to retrieve these values, and LdapResult.get does not
     * return a JavaScript string. I'm not exactly sure what this is returning,
     * but you need to wrap the return in a string constructor like
     * String(result.get('cn')). If you don't do this i've found some string methods
     * do not work correctly
     * @typedef {Hashtable<'cn'|'dn'|'description'|'source'|'uniquemember'|'member'|'employeeNumber'>} LdapResult
     * {string} en
     * {string} dn
     * {string} description Description of group
     * {string} source DN with a prefix of 'ldap:'
     * {string?} uniquemember Concatenated list of members.  Concatenated with 'A'. This will
     * be there for ou=Groups entries. Will be empty for dc=AD entries
     * {string?} member Concatenated list of members. Concatenated with 'A'. This will be
     * therefor dc=AD entries and not for ou=Group entries
     */
    /**
     * @typedef LdapGroup
     * @property {string} cn
     * @property {string} dn
     * @property {string} uniquemember
     * @property {string[]} members
     * @property {boolean} isAdGroup
     */
    /**
     * @template T
     * @callback transformFn
     * @param {LdapResult} result A single result returned from an LDAP search
     * @param {string[]} [processedGroups]
     * @returns {T} Result of transformation
     */
    /**
     * Refresh the membership of a set of groups based on the group types
     * @param {string[]} typeNames A list of sys_user_group_type names
     */
    refreshGroupsByTypeNames: function(typeNames) {
        var groupSysIds = this.getGroupSysIdsByTypeNames(typeNames);
        this.refreshGroups(groupSysIds);
    },
    /**
     * Refreshes the membership of a set of groups based off group sys_id
     * @param {string[]} groupSysIds sys_ids of groups to referesh
     */
    refreshGroups: function(groupSysIds) {
        groupSysIds.forEach(this.refreshGroup.bind(this));
    },
    /**
     * Refreshes the membership of a group based off of a sys_id
     * @param {string} groupSysId group sys_id
     */
    refreshGroup: function(groupSysId) {
        var group = new GlideRecord('sys_user_group');
        if (group.get(groupSysId)) {
            var source = group.getValue('source');
            var name = this.getGroupShortNameFromSource(source);
            var ldapGroup = this.getGroupByName(name);
            if (ldapGroup) {
                this.clearMembers(groupSysId);
                this.addMembers(groupSysId, ldapGroup.members);
            } else {
                this._logError('Could not find group, ' + name + ' in LDAP');
            }
        } else {
            this._logError('Could not find group using sys_id: ' + groupSysId);
        }
    },
    /**
     * Ingests the given group from LDAP. Will create the group if the group
     * does not already exist. Only applies the type names to newly created groups.
     * If the group already exists the type isn't applied
     * @param {string} groupName Set of group names to ingest
     * @param {string[]} [types] List of sys_user_group_type names to apply to newly created groups
     * @returns {?GlideRecord} The ingested group or null if there was a problem
     */
    ingestGroup: function(groupName, types) {
        var groups = this.ingestGroups([groupName], types);
        if (groups.length > 0) {
            return groups[0];
        } else {
            return null;
        }
    },
    /**
     * Retrieves a sys_user_group by distinguished name (DN)
     * @param {string} dn The distinguished name of the group to retrieve
     * @returns {?GlideRecord} the sys_user_group or null
     */
    getGroupByDn: function(dn) {
        var group = new GlideRecord('sys_user_group');
        if (group.get('source', 'ldap: ' + dn)) {
            return group;
        } else {
            return null;
        }
    },
    /**
    * Ingests the given group names from LDAP. Will create the group if the
    * does not already exist. Only applies the type names to newly created
    * If the group already exists the type isn't applied
    * @param {string[]} groupNames Set of group names to ingest
    * @param {string[]} [types] List of sys_user_group_type names to apply to
    newly created groups
    types);
    * @returns {GlideRecord[]} The list of ingested groups
    */
    ingestGroups: function(groupNames, types) {
        var queryParts = groupNames.map(function(name) {
            return '(cn=' + name + ')';
        });
        var query = '(|' + queryParts.join(' ') + ')';
        /** @type {LdapGroup[]} */
        var ldapGroups = this.searchAndTransform(query, 10000, this.defaultTransformFn.bind(this));
        var me = this;
        return ldapGroups.map(function(ldapGroup) {
            var existingGroup = me.getGroupByDn(ldapGroup.dn);
            if (existingGroup) {
                return existingGroup;
            } else {
                return me.createGroupFromLdapGroup(ldapGroup, types);
            }
        });
    },
    /**
     * Retrieves a list of sys_user_group sys_ids by finding groups that have
     * all the provided type names passed in
     * @param {string[]} typeNames List of typenames to find group sys_ids
     * @returns {string[]} sys_ids of group names that have all type names
     */
    getGroupSysIdsByTypeNames: function(typeNames) {
        var me = this;
        var group = new GlideAggregate('sys_user_group');
        group.groupBy('sys_id');
        typeNames.forEach(function(name) {
            var type = me.getType(name);
            if (type) {
                group.addQuery('type', 'CONTAINS', type);
            }
        });
        group.query();
        var sysIds = [];
        while (group.next()) {
            sysIds.push(group.getValue('sys_id'));
        }
        return sysIds;
    },

    /**
     * Returns the type sys_id by using the provided type name
     * @param {string} typeName Type name from sys_user_group_type
     * @returns {?string} sys_id of the type or null if type not found
     */
    getType: function(typeName) {
        var types = this.getTypes([typeName]);
        if (types.length > 0) {
            return types[0];
        } else {
            return null;
        }
    },
    /**
     * Returns the sys_ids of the sys_user_group_type by using the provided
     * type names
     * @param {string[]} typeNames List of names of sys_user_group_type
     * @returns {string[]} List of sys_ids of the types
     */
    getTypes: function(typeNames) {
        if (typeNames && typeNames.length > 0) {
            var type = new GlideRecord('sys_user_group_type');
            type.addQuery('name', 'IN', typeNames);
            type.query();
            var types = [];
            while (type.next()) {
                types.push(type.getUniqueValue());
            }
            return types;
        } else {
            return [];
        }
    },
    /**
     * Creates the marker for newly ingested groups by this class. This is so
     * it is easy to find groups created by this class, so they can be updated
     * or monitored
     * @returns {string} The sys_id of the sys_user_group_type that represents the type
     * marker
     */
    getOrCreateIngestGroupType: function() {
        var type = new GlideRecord('sys_user_group_type');
        var ingestTypeName = this.ingestTypeName;
        if (type.get('name', ingestTypeName)) {
            return type.getUniqueValue();
        }
        type.newRecord();
        type.name = ingestTypeName;
        type.description = 'Marker for groups ingested by KLF_LdapGroupService';
        type.update();
        return type.getUniqueValue();
    },
    /**
     * Creates a sys_user_group from an LDAP group. Applies the provided type names to
     * the new group
     * @param {LdapGroup} ldapGroup
     * @param {string[]} [types] List of sys_user_group_type names to apply to the created group
     * @returns {GlideRecord} The created sys_user_group
     */
    createGroupFromLdapGroup: function(ldapGroup, types) {
        var group = new GlideRecord('sys_user_group');
        group.newRecord();
        group.name = this.getNameFromDn(ldapGroup.dn);
        group.source = 'ldap: ' + ldapGroup.dn;
        var _types = types ? this.getTypes(types) : [];
        // @ts-ignore 
        group.type = [].concat([this.getOrCreateIngestGroupType()],
            _types).join(', ');
        group.update();
        this.addMembers(group.getUniqueValue(), ldapGroup.members);
        return group;
    },

    /**
     * Removes all the members of a group given a sys_id
     * @param {string} groupSysId sys_id of group to remove members
     */
    clearMembers: function(groupSysId) {
        if (!groupSysId) return;
        var groupMember = new GlideRecord('sys_user_grmember');
        groupMember.addQuery('group', groupSysId);
        groupMember.query();
        groupMember.deleteMultiple();
    },

    /**
     * Adds the given members distinguished by their DNs to the group by
     * the provided group sys_id
     * @param {string} groupSysId sys_id of group to add members
     * @param {string[]} memberDNs List DNs for people to add to group
     * @param {string[]} [processedGroups] DNs for groups that have already been processed. Used for
     * recursive calls
     */
    addMembers: function(groupSysId, memberDNs, processedGroups) {
        var me = this;
        var people = memberDNs.filter(function(member) {
            return new RegExp(me.getPersonRegex(), 'i').test(member);
        });
        if (people.length > 0) {
            var user = new GlideAggregate('sys_user');
            user.groupBy('sys_id');
            user.groupBy('employee_number');
            user.groupBy('u_dn');
            // @ts-ignore
            var peopleCopy = [].concat(people);
            var userCondition;
            /** @type {string[]} */
            var peopleEmployeeNumber = [];
            if (this.isActiveDirectoryGroups) {
                peopleEmployeeNumber = this._getActiveDirectoryUserEmployeeNumbers(peopleCopy);
                userCondition = user.addQuery('employee_number', 'IN', peopleEmployeeNumber);
            } else {
                userCondition = user.addQuery('u_dn', peopleCopy.shift());
                peopleCopy.reduce(function(condition, person) {
                    return condition.addOrCondition('u_dn', person);
                }, userCondition);
            }
            user.query();
            //used to track people we didn't find in ServiceNow that exist in LDAP
            /** @type {string[]} */
            var missingPeople = [];
            if (this.isActiveDirectoryGroups) {
                missingPeople = peopleEmployeeNumber;
            } else {
                // @ts-ignore
                missingPeople = [].concat(people);
            }
            while (user.next()) {
                var matchField = this.isActiveDirectoryGroups ? 'employee_number' : 'u_dn';
                var index = missingPeople.indexOf(user.getValue(matchField));
                if (index >= 0) {
                    missingPeople.splice(index, 1);
                }
                var groupMember = new GlideRecord('sys_user_grmember');
                groupMember.addQuery('user', user.getValue('sys_id'));
                groupMember.addQuery('group', groupSysId);
                groupMember.query();
                if (groupMember.hasNext()) {
                    continue;
                }
                groupMember.newRecord();
                groupMember.group = groupSysId;
                groupMember.user = user.getValue('sys_id');
                groupMember.update();
            }
            if (missingPeople.length > 0) {
                var targetGroup = new GlideRecord('sys_user_group');
                targetGroup.get(groupSysId);
                this._logWarning('KLF_LdapGroupService.addMembers  Could not find people: ' + missingPeople + ' for group: ' + targetGroup.getDisplayValue());
            }
        }
        if (this.includeNestedGroups) {
            var _processedGroups = processedGroups || [];
            var groupDNs = memberDNs.filter(function(member) {
                return new RegExp(me.getGroupRegex(), 'i').test(member);
            });
            /** @type {LdapGroup[]} */
            //@ts-ignore
            var groups = groupDNs.filter(function(groupDN) {
                var alreadyProcessed = _processedGroups.indexOf(groupDN) >= 0;
                return !alreadyProcessed;
            }).map(function(groupDN) {
                var shortCn = me.getGroupShortNameFromDn(groupDN);
                return me.getGroupByName(shortCn);
            }).filter(function(group) {
                return !!group;
            });
            groups.forEach(function(group) {
                //if processed groups is not initialized this is the first call the group
                //need to initialize this argument with the DN of
                //that all members are added to.
                if (!processedGroups) {
                    var targetGroup = new GlideRecord('sys_user_group');
                    targetGroup.get(groupSysId);
                    var dn = me.getDnFromSource(targetGroup.getValue('source'));
                    processedGroups = [dn];
                }
                me.addMembers(groupSysId, group.members, processedGroups);
            });
        }
    },
    /**
     * Transforms source attribute into a common name. Source field contains the DN that
     * is prefixed by 'ldap:'. This transforms that into just a common name
     * @param {string} source Value of source field in LdapResult or sys_user_group
     * @returns {string} primary common name of the group. This is the name used in the ON the DN
     */
    getGroupShortNameFromSource: function(source) {
        var dn = this.getDnFromSource(source);
        return this.getGroupShortNameFromDn(dn);
    },
    /**
    * Transforms DN attribute into a common name. ~t pulls the CN portion of
    * @param {string} groupDN Value of DN field in LdapResult or sys_user_group
    * @returns {string} primary common name of the group. This is the name
    used in the DN
    */
    getGroupShortNameFromDn: function(groupDN) {
        var dnParts = groupDN.split(', ');
        var cn = dnParts[0];
        var cnParts = cn.split('=');
        var shorten = cnParts[1];
        return shorten;
    },
    /**
     * Returns an LdapGroup for the given group name or null
     * @param {string} groupName An individual group alias
     * @param {?string[]} [processedGroups] List of processed groups by DN.
     * Used for recursive calls
     * @returns {(LdapGroup|null)}
     */
    getGroupByName: function(groupName, processedGroups) {
        var results = this.searchAndTransform('(cn=' + groupName + ')', 1, this.defaultTransformFn.bind(this), processedGroups);
        if (results.length > 0) {
            return results[0];
        } else {
            return null;
        }
    },
    /**
     * Searches for groups using a begins with query. The term is all or part of a group alias.
     * This returns a list of the found group names. The names will be the primary group names.
     * These are the group name used in the group's DN. This can be different than the ServiceNow
     * group name, because the ServiceNow group name may be the concatenated group aliases using the 'A'
     * @param {string} term common name of group to look for
     * @param {number} limit Maximum number of search results
     * @param {boolean} onlyMailGroups true if you only want mail groups
     * @returns {string[]} List of found primary group names
     */
    searchBeginsWith: function(term, limit, onlyMailGroups) {
        if (!term) {
            return [];
        }
        var query = onlyMailGroups ? '(&(en=' + term + ' *)(descript i on=domino_whitepages_group))' : '(en=' + term + ' *)';
        var groups = this.searchAndTransform(query, limit, this.defaultTransformFn.bind(this));
        if (limit != 0 && groups.length > limit) {
            groups.length = limit;
        }
        var transformedGroups = [];
        for (var i = 0; i < groups.length; i++) {
            transformedGroups.push(this.getNameFromDn(groups[i].dn));
        }
        return transformedGroups;
    },
    /**
     * Searches for groups using a contains query . The term is all or part of a group alias.
     * This returns a list of the found group names. The names will be the primary group names.
     * These are the group name used in the group's DN. This can be different than the ServiceNow
     * group name, because the ServiceNow group name may be the concatenated group aliases using the·~·
     * @param {string} term common name of group to look for
     * @param {number} limit Maximum number of search results
     * @param {boolean} onlyMailGroups true if you only want mail groups
     * @returns {string[]} List of found primary group names
     */
    search: function(term, limit, onlyMailGroups) {
        if (!term) {
            return [];
        }
        var query = onlyMailGroups ? '(&(en=*' + term + '*)(description=domino_whitepages_group))' : '(en=*' + term + '*)';
        var groups = this.searchAndTransform(query, limit, this.defaultTransformFn.bind(this));
        if (limit != 0 && groups.length > limit) {
            groups.length = limit;
        }
        var transformedGroups = [];
        for (var i = 0; i < groups.length; i++) {
            transformedGroups.push(this.getNameFromDn(groups[i].dn));
        }
        return transformedGroups;
    },
    /**
     * Returns true if group is an active directory group as opposed to a traditional LDAP
     * group . AD groups come straight from active directory and have slightly different
     * attributes
     * @param {string} dn DN of AD group
     */
    isActiveDirectoryGroup: function(dn) {
        //checks DN for the string dc=ad which signifies
        //that the entry is in the
        return /\bdc=ad\b/i.test(dn);
    },

    /**
     * A default implementation of a transform function used in searchAndTransform.
     * @type {transformFn<LdapGroup>}
     */
    defaultTransformFn: function(result, processedGroups) {
        var uniquemember = this.getUniqueMember(result);
        var members = this.getMembers(result, processedGroups || null);
        return {
            cn: String(result.get('cn')),
            dn: String(result.get('dn')),
            uniquemember: uniquemember,
            members: members,
            isAdGroup: this.isActiveDirectoryGroup(String(result.get('dn')))
        };
    },

    /**
     * Searches LDAP using the provided query. Will only pull back groups
     * because there is a RDN filter placed on the search. Query must be a valid LDAP query
     * You can provide an optional transformFn. If not provided a transform will
     * be performed on the query results
     * @template T
     * @param {string} query A valid LDAP query
     * @param {number} limit Maximum number of results
     * @param {transformFn<T>} transformFn Function to transform the result of the LDAP query
     * @param {?string[]} [processedGroups] Accumulator for recursive query
     * @returns {T[]} The list of found groups from LDAP
     */
    searchAndTransform: function(query, limit, transformFn, processedGroups) {
        var me = this;

        //@ts-ignore
        var ldap = new GlideLDAP();
        ldap.setConfigID(this._getLdapServerSysId());
        var ldapResult = ldap.getMatching(this.getSearchRdn(), query, false, limit || 1000);
        var groups = [];
        /** @type {LdapResult} */
        var result;
        while (ldapResult.hasMore()) {
            result = ldapResult.next();
            groups.push(transformFn(result));
        }
        return groups;
    },
    /**
     * @returns {string} The rdn to limit searches of the directory to
     */
    getSearchRdn: function() {
        return this.searchRdn;
    },
    /**
     * Retrieves the value for the members in a group. This can vary depending
     * on the type of LDAP entry retrieved
     * @param {LdapResult} result
     */
    getUniqueMember: function(result) {
        return this.isActiveDirectoryGroup(String(result.get('dn'))) ?
            String(result.get('member')) :
            String(result.get('uniquemember'));
    },
    /**
     * Returns a regex to apply against a DN returned from LDAP to determine if the DN
     * is a group
     * @returns {string} Regex to apply against a DN to determine if DN is a group
     */
    getGroupRegex: function() {
        return this.isActiveDirectoryGroups ?
            //This looks odd, but this matches everything that is not the getPersonRegex
            '^(?!CN=\\w{7}(-\\w{3})?,.*$)' :
            'ou=Groups';
    },
    /**
     * Returns a regex to apply against a DN returned from LDAP to determine if the DN
     * is a person
     * @returns {string} Regex to apply against a DN to determine if DN is a person
     */
    getPersonRegex: function() {
        return this.isActiveDirectoryGroups ?
            //Matches 7 characters followed by an optional dash and 3 characters
            //like abcdefg or abcdefg-adm
            '^CN=\\w{7}(-\\w{3})?,' :
            'ou=People';
    },
    /**
     * Retrieves all the members of a group using an LdapResult. This can potentially resolve
     * nested groups recursively.
     * @param {LdapResult} result Result from an LDAP search
     * @param {?string[]} processedGroups Accumulated list of already processed groups specified by DN.
     * Used for recursive calls
     * @returns {string[]} List of DNs of all the people in a group
     */
    getMembers: function(result, processedGroups) {
        var me = this;
        var uniquemember = this.getUniqueMember(result);
        var memberDNs = uniquemember ? uniquemember.split('A') : [];
        var people = memberDNs.filter(function(member) {
            return new RegExp(me.getPersonRegex(), 'i').test(member);
        });
        gs.debug('people:' + people.join('\n'));
        /** @type {string[]} */
        var nestedPeople = [];
        if (this.includeNestedGroups) {

            var _processedGroups = processedGroups ? processedGroups : [String(result.get('dn'))];
            var groupDNs = memberDNs.filter(function(member) {
                return new RegExp(me.getGroupRegex(), 'i').test(member);
            });
            gs.debug('groups: ' + groupDNs.join('\n'));
            /** @type {LdapGroup[]} */
            // @ts-ignore -- This is an LdapGroup[] but the type system doesn't know that
            var groups = groupDNs.filter(function(groupDN) {
                var alreadyProcessed = _processedGroups.indexOf(groupDN) >= 0;
                return !alreadyProcessed;
            }).map(function(groupDN) {
                var dnParts = groupDN.split(', ');
                var en = dnParts[0];
                var cnParts = en.split('=');
                var shortCn = cnParts[1];
                _processedGroups.push(groupDN);
                return me.getGroupByName(shortCn, _processedGroups);
            }).filter(function(group) {
                return !!group;
            });
            nestedPeople = groups.reduce(function(people, group) {
                return /**@type{string[]}*/ ([]).concat(people, group.members);
            }, /**@type{string[]}*/ ([]));
        }
        // @ts-ignore
        return new global.ArrayUtil().unique([].concat(people, nestedPeople));
    },
    /**
     * Returns if this group exists in LDAP
     * @param {string} groupName One of the aliases of a group
     * @returns {boolean} Returns true if alias found
     */
    exists: function(groupName) {
        return !!this.getGroupByName(groupName);
    },
    /**
    * Transforms source attribute into a DN
    * @param {string} source Value of source field in LdapResult or
    sys_user_group
    * @returns {string} The DN from the source field
    */
    getDnFromSource: function(source) {
        //chops off ldap: from source to get true DN
        return source.substr('ldap:'.length);
    },
    /**
     * Retrieves the primary group name from DN. This is the CN attribute associated table
     * with the DN
     * @param {string} dn
     * @returns {string} The primary group name
     */
    getNameFromDn: function(dn) {
        var cn = dn.split(', ')[0];
        if (cn) {
            var name = cn.split('=');
            return name[1];
        } else {
            return '';
        }
    },
    /**
     * Returns the sys_id of the LDAP server entry in the ldap_server_config
     */
    _getLdapServerSysId: function() {
        return this.ldapServerSysId;
    },

    /**
     * Returns the sys_id of the LDAP server by name
     * @param {string} name The name of the LDAP server
     * @returns {string} LDAP server sys_id
     */
    _getLdapServerSysIdByName: function(name) {
        var ldap = new GlideRecord('ldap_server_config');
        if (ldap.get('name', name)) {
            return ldap.getUniqueValue();
        } else {
            throw 'Could not find LDAP server using name: ' + name;
        }
    },
    /**
     * @returns {string} The default sys_user_group_type name for a LDAP group
     */
    getDefaultLdapGroupTypeName: function() {
        return 'KLF LDAP GROUP';
    },
    /**
     * @returns {string} The default sys_user_group_type name for an AD group
     */
    getDefaultAdGroupTypeName: function() {
        return 'KLF_AD_GROUP';
    },
    /**
     * Logs a warn level message with the log source provided at construction
     * @param {string} message Log message
     */
    _logWarning: function(message) {
        gs.logWarning(message, this.logSource);
    },
    /**
     * Logs a error level message with the log source provided at construction
     * @param {string} message
     */
    _logError: function(message) {
        gs.logError(message, this.logSource);
    },
    /**
     * Takes the member list from an LDAP search of active directory and retrieves the
     * associated employeenumbers by searching for the users in LDAP
     * @param {string[]} members List of member DNs to retrieve EmployeeNumbers
     * @returns {string[]} List of EmployeeNUmbers
     */
    _getActiveDirectoryUserEmployeeNumbers: function(members) {
        // var existingSearchRdn = this.searchRdn;
        var me = this;
        var queryParts = members.map(function(member) {
            return '(cn=' + me.getNameFromDn(member) + ')';
        });
        var query = '(|' + queryParts.join(' ') + ')';
        var results = this.searchAndTransform(query, 1000, function(ldapResult) {
            var employeeNumber = ldapResult.get('employeeNumber');
            return employeeNumber ? String(employeeNumber) : '';
        }).filter(function( /** @type {?string} */ employeeNumber) {
            return !!employeeNumber;
        });
        // this.searchRdn = existingSearchRdn;
        return new global.ArrayUtil().unique(results);
    },
    /** !Important: This field must be at the bottom of this object */
    /** @type {'KLF_LdapGroupService'} */
    type: 'KLF_LdapGroupService'
};

global.KLF_LdapGroupService = KLF_LdapGroupService;
/**
 * 
 * @param {*} outputs 
 * @param {*} steps 
 * @param {*} params 
 * @param {*} stepResult 
 * @param {*} assertEqual 
 */
function KLF_LdapGroupServiceTest(outputs, steps, params, stepResult, assertEqual) {
    describe('KLF_LdapGroupServiceTest.getGroupByDn', function() {
        var expectedGroupName = 'test group';
        beforeAll(function() {
            var expectedGroup = new GlideRecord('sys_user_group');
            expectedGroup.newRecord();
            expectedGroup.name = expectedGroupName;
            expectedGroup.source = 'ldap: ' + expectedGroupName;
            expectedGroup.update();
        });

        try {
            var ldapGroupService = new global.KLF_LdapGroupService({
                ldapServerName: 'Example LDAP Server'
            });
        } catch (e) {
            stepResult.setOutputMessage(e);
            stepResult.setFailed();
            return;
        }

        it('should return group when one exists', function() {
            var group = ldapGroupService.getGroupByDn(expectedGroupName);
            expect(group).not.toBeNull();
            if (group) {
                expect(group.getValue('name')).toBe(expectedGroupName);
            }
        });

        it('should not return a group when no group name is provided', function() {
            // @ts-ignore
            var group = ldapGroupService.getGroupByDn();
            expect(group).toBeNull();
        });

        it('should not return group when given a bad group name', function() {
            var group = ldapGroupService.getGroupByDn('INVALID GROUP NAME');
            expect(group).toBeNull();
        });

    });
}
//@ts-ignore
var global = global || {};

/**
 * Object that provides methods to sync records between two ServiceNow instances
 * 
 * ServiceNow natively supports transferring application code between instances but does not expose an API to efficiently transfer data between instances.
 * This script include provides a way to transfer data between instances using the REST API. The basic idea is to script the data transfer in a way that
 * that is repeatable so the script can be written up front and then run whenever data needs to be transferred. This way the data transfer is automated
 * and there is no need to manually export and import data.
 * 
 * NOTE: To use any of the sync methods you must install this application on the target
 * instance and the source instance. This scoped application contains the REST API that is used to import records into
 * the target instance. The open API spec for the REST API is located at 
 * {@link https://github.com/kfrencher/servicenow-klf-global/blob/main/klf_import_xml_openapi.yaml KLF Import XML Spec}
 * 
 * The primary method is {@link global.KLF_RecordSync.syncAllDataInScope} which syncs all the data in
 * a scoped application from one ServiceNow instance to the same application in a different ServiceNow instance
 * 
 * Other methods allow you to sync a single table or a single record
 * {@link global.KLF_RecordSync.syncTable} and {@link global.KLF_RecordSync.syncRecord} respectively
 * 
 * TODO: 
 * - Possibly add ability to do incremental syncs where the mod count or sys_updated_on is used to determine if a record needs to be synced
 * - Also may need a way to properly handle sys_user and sys_user_group references that aren't the same in the target instance or don't exist
 * - Probably need better error handling. It's non-existent right now
 * 
 * @class KLF_RecordSync
 * @param {KLF_RecordSyncConnectionConfig} connectionConfig
 * @param {KLF_RecordSync_GroupMapping?} [groupMapping]
 * @example
 * var recordSync = new global.KLF_RecordSync({
 *     username: 'admin',
 *     password: gs.getProperty('KLF_RecordSync.user.password'), // Retrieve password from encoded password property
 *     instanceUrl: 'https://dev188047.service-now.com',
 *     chunkSize: 220
 * });
 * 
 * // Example of syncing all the data in a scope
 * recordSync.syncAllDataInScope('x_53417_demo');
 * 
 * // Example of including approvals that are associated with the scope
 * // This shows that you can also sync data that is outside of the scope as sysapproval_approver records
 * // are in the global scope
 * var demoApproval = new GlideRecord('sysapproval_approver');
 * demoApproval.addQuery('source_table', 'STARTSWITH', 'x_53417_demo');
 * recordSync.syncTable('sysapproval_approver', demoApproval.getEncodedQuery());
 */
global.KLF_RecordSync = function(connectionConfig, groupMapping) {
    this.connectionConfig = connectionConfig;
    this.groupMapping = groupMapping;
};

/**
 * The manifest is an object that represents the data that is being transfered in a transaction. The keys
 * in the manifest are the table name and the values are an object where the keys are the sys_ids of the records
 * being transferred. It's a bit unconventional, but the reason the sys_ids are stored as keys in an object is because
 * i want them to be unique.
 * {
 *    "incident": {"sys_id1": true, "sys_id2": true},
 * }
 * @typedef {{[tableName:string]: {[sysId:string]: boolean}}} KLF_Manifest
 */
global.KLF_RecordSync.Manifest = function() {
    /** @type {KLF_Manifest} */
    this.manifest = {};
};

/**
 * @typedef {{success:boolean, payload:string, missingManifest:global.KLF_RecordSync.Manifest?}} KLF_SendToRemoteInstanceResponse
 */

/**
 * Configuration object for the KLF_RecordSync class
 * @typedef KLF_RecordSyncConnectionConfig
 * @property {string} instanceUrl
 * @property {string} username
 * @property {string} password
 * @property {number} [chunkSize=220] Optional. The number of records to sync at a time. Default is 220. 220 was chosen
 * intentionally because there is a limitation on some ServiceNow instances that will throw a 400 error if the URL is too long
 */

global.KLF_RecordSync.Manifest.prototype = {
    /**
     * @param {string} message 
     */
    logError: function(message) {
        gs.logError(message, 'KLF_RecordSync.Manifest');
    },

    /**
     * Adds a record to the manifest
     * @param {string} tableName 
     * @param {string} sysId 
     */
    addRecord: function(tableName, sysId) {
        if (!this.manifest[tableName]) {
            this.manifest[tableName] = {};
        }
        this.manifest[tableName][sysId] = true;
    },

    /**
     * Adds multiple records to the manifest
     * @param {string} tableName
     * @param {string[]} sysIds
     */
    addRecords: function(tableName, sysIds) {
        var me = this;
        sysIds.forEach(function(sysId) {
            JSON.stringify("manifest: " + me.manifest);
            me.addRecord(tableName, sysId);
        }, this);
    },

    /**
     * Adds a record to the manifest by GlideRecord
     * @param {GlideRecord} glideRecord 
     */
    addRecordByGlideRecord: function(glideRecord) {
        this.addRecord(glideRecord.getTableName(), glideRecord.getUniqueValue());
    },

    /**
     * Adds a manifest to the current manifest
     * @param {global.KLF_RecordSync.Manifest} manifest
     */
    addManifest: function(manifest) {
        var me = this;
        manifest.getTables().forEach(function(tableName) {
            manifest.getSysIdsForTable(tableName).forEach(function(sysId) {
                me.addRecord(tableName, sysId);
            });
        });
    },

    /**
     * Returns all the tables in the manifest
     * @returns {string[]}
     */
    getTables: function() {
        return Object.keys(this.manifest).sort();
    },

    /**
     * Returns all the sys_ids for a table in the manifest
     * @param {string} tableName
     */
    getSysIdsForTable: function(tableName) {
        return Object.keys(this.manifest[tableName]).sort();
    },

    /**
     * Returns a Object representation of the manifest. This is to facilitate JSON serialization
     */
    toObj: function() {
        var me = this;
        /** @type {{[tableName:string]:string[]}} */
        var manifest = {};
        this.getTables().forEach(function(tableName) {
            manifest[tableName] = me.getSysIdsForTable(tableName);
        });
        return manifest;
    },

    /**
     * Returns a JSON representation of the manifest
     */
    toJson: function() {
        return JSON.stringify(this.toObj(), null, 4);
    },

    /**
     * Validates the manifest against the local instance. It checks to see if the records exist in the local instance.
     * It then builds a new manifest of records that do not exist in the local instance
     * @returns {global.KLF_RecordSync.Manifest} A manifest of records that do not exist in the local instance
     */
    validate: function() {
        var me = this;
        var missingManifest = new global.KLF_RecordSync.Manifest();
        this.getTables().forEach(function(tableName) {
            var manifestSysIds = me.getSysIdsForTable(tableName);
            var gr = new GlideAggregate(tableName);
            gr.addQuery('sys_id', 'IN', manifestSysIds.join(','));
            gr.groupBy('sys_id');
            gr.query();
            var foundSysIds = [];
            while (gr.next()) {
                foundSysIds.push(gr.getValue('sys_id'));
            }
            var missingSysIds = new global.ArrayUtil().diff(manifestSysIds, foundSysIds);
            missingManifest.addRecords(tableName, missingSysIds);
        });
        return missingManifest;
    }
};

/**
 * Creates a manifest from the object generated by {@link global.KLF_RecordSync.Manifest.toObj}
 * @param {{[tableName:string]:string[]}} manifestObject
 * @returns {global.KLF_RecordSync.Manifest}
 */
global.KLF_RecordSync.Manifest.createManifestFromObj = function(manifestObject) {
    var manifest = new global.KLF_RecordSync.Manifest();
    for (var tableName in manifestObject) {
        manifest.addRecords(tableName, manifestObject[tableName]);
    }
    return manifest;
}

/**
 * Creates a manifest from the JSON representation
 * @param {string} jsonManifest
 * @returns {global.KLF_RecordSync.Manifest}
 */
global.KLF_RecordSync.Manifest.createManifestFromJson = function(jsonManifest) {
    var manifestObj = JSON.parse(jsonManifest);
    return global.KLF_RecordSync.Manifest.createManifestFromObj(manifestObj);
}


/**
 * Imports a record into ServiceNow using GlideUpdateManager2
 * @param {string} xml
 */
global.KLF_RecordSync.loadRecordByGlideUpdateManager2 = function(xml) {
    // @ts-ignore
    var updateManager = new global.GlideUpdateManager2();
    updateManager.loadXML(xml);
};

global.KLF_RecordSync.prototype = {
    /**
     * @param {string} message 
     */
    logError: function(message) {
        gs.logError(message, 'KLF_RecordSync');
    },
    /**
     * @param {string} message 
     */
    logInfo: function(message) {
        gs.log(message, 'KLF_RecordSync');
    },

    dataTransferUtils: new global.KLF_DataTransferUtils(),

    /**
     * Syncs all the data in the scope excluding any tables listed in the excluded table
     * list
     * @param {string} scopeNamespace
     * @param {string[]} [excludedTables]
     * @returns {global.KLF_RecordSync.Manifest}
     */
    syncAllDataInScope: function(scopeNamespace, excludedTables) {
        var tables = this.dataTransferUtils.getBaseTablesInScope(scopeNamespace, excludedTables);
        var me = this;
        var missingManifest = new global.KLF_RecordSync.Manifest();
        tables.forEach(function(table) {
            missingManifest.addManifest(me.syncTable(table));
        });
        return missingManifest;
    },

    /**
     * Syncs document that could contain data from a number of tables from ServiceNow instance to target ServiceNow instance 
     * @param {Document} document
     * @param {global.KLF_RecordSync.Manifest} [manifest]
     * @returns {KLF_SendToRemoteInstanceResponse}
     */
    syncDocument: function(document, manifest) {
        return this.sendToRemoteInstance(this.documentToString(document), manifest);
    },

    /**
     * Syncs a single record from one table in a ServiceNow instance to the same table in a different ServiceNow instance 
     * @param {GlideRecord} glideRecord
     * @returns {KLF_SendToRemoteInstanceResponse}
     */
    syncRecord: function(glideRecord) {
        var unloadDocument = this.createUnloadDocument();
        var unloadedData = this.unloadRecordWithRelatedRecords(glideRecord, unloadDocument);
        return this.sendToRemoteInstance(this.documentToString(unloadDocument), unloadedData.manifest);
    },

    /**
     * Syncs data from one table in a ServiceNow instance to the same table in a different ServiceNow instance 
     * You can provide an encoded query string to filter the records that are synced
     * 
     * One simple way to get the encoded query string is to use the filter navigator in ServiceNow
     * Another is to build the query using GlideRecord and then call GlideRecord.getEncodedQuery()
     * 
     * This will return a manifest of records that were not inserted into the target instance
     * @param {string} tableName
     * @param {string} [encodedQueryString]
     * @returns {global.KLF_RecordSync.Manifest}
     */
    syncTable: function(tableName, encodedQueryString) {
        var me = this;
        var missingRecordsManifest = new global.KLF_RecordSync.Manifest();

        /**
         * @param {number} start 
         * @param {number} chunkSize 
         * @returns 
         */
        function syncChunk(start, chunkSize) {
            // I want to transfer the data in chunks. So I will use the GlideRecord.setWindow method to query a batch of records at a time.
            // Use the tableName to query a batch of records from the source table
            var source = new GlideRecord(tableName);
            source.orderBy('sys_created_on');
            source.chooseWindow(start, start + chunkSize);
            if (encodedQueryString) {
                source.addEncodedQuery(encodedQueryString);
            }
            source.query();

            var sourceSysIds = [];
            while (source.next()) {
                sourceSysIds.push(source.sys_id.toString());
            }

            // Query the remote instance using the REST table API for the records that are in the sysIds array
            var request = me.createRestMessage();
            request.setHttpMethod('GET');
            var endpointPath = '/api/now/table/' + tableName
            var query = [
                'sysparm_fields=sys_id',
                'sysparm_query=sys_idIN' + encodeURIComponent(sourceSysIds.join(','))
            ].join('&');
            var endpoint = request.getEndpoint() + endpointPath + '?' + query;
            request.setEndpoint(endpoint);
            var response = request.execute();

            if (response.getStatusCode() != 200) {
                me.logError('Failed to get the records from the target instance');
                me.logError('Received status code: ' + response.getStatusCode());
                me.logError('Received body: ' + response.getBody());
                return null;
            }

            // The sys_ids in the response represent records that already exist in the target instance
            // Subtract the sys_ids in the response from the sysIds array to get the sys_ids that do not exist in the target instance
            // This will be the sys_ids that need to be inserted into the target instance
            var targetSysIds = /** @type string[] */ ([]);
            /** @type {{result:[{sys_id:string}]}} */
            var responseBody = JSON.parse(response.getBody());
            responseBody.result.forEach(function(record) {
                targetSysIds.push(record.sys_id);
            });
            var sysIdsToInsert = sourceSysIds.filter(function(sysId) {
                return targetSysIds.indexOf(sysId) === -1;
            });

            me.logInfo(tableName + ' Syncing ' + sysIdsToInsert.length + ' records: ');

            // Requery the source for the records that need to be inserted into the target instance
            var sourceToInsert = new GlideRecord(tableName);
            sourceToInsert.addQuery('sys_id', 'IN', sysIdsToInsert.join(','));
            sourceToInsert.query();
            var unloadDocument = me.createUnloadDocument();
            var manifest = new global.KLF_RecordSync.Manifest();
            while (sourceToInsert.next()) {
                var unloadedData = me.unloadRecordWithRelatedRecords(sourceToInsert, unloadDocument);
                manifest.addManifest(unloadedData.manifest);
            }

            if (sysIdsToInsert.length > 0) {
                var remoteResponse = me.sendToRemoteInstance(me.documentToString(unloadDocument), manifest);
                if (remoteResponse.success) {
                    if (remoteResponse.missingManifest) {
                        missingRecordsManifest.addManifest(remoteResponse.missingManifest);
                    }
                } else {
                    me.logError('Failed to sync chunk:\n\n' + manifest.toJson() + '\n\n' + remoteResponse.payload);
                }
            } else {
                me.logInfo('No records to sync for this chunk');
            }

        }

        var chunkSize = this.connectionConfig.chunkSize || 220;
        var glideRecord = new GlideRecord(tableName);
        if (glideRecord.isValid()) {
            this.logInfo('Starting sync of table: ' + tableName);
            // First get the size of the table
            // Then sync records in chunks
            if (encodedQueryString) {
                this.logInfo(encodedQueryString);
                glideRecord.addEncodedQuery(encodedQueryString);
            }
            glideRecord.query();
            var totalRecords = glideRecord.getRowCount();
            this.logInfo('Total records: ' + totalRecords);
            var i = 0;
            while (i < totalRecords) {
                syncChunk(i, chunkSize);
                i = i + chunkSize;
            }
            return missingRecordsManifest;
        } else {
            throw new Error('Invalid table name: ' + tableName);
        }
    },

    /**
     * Returns a sn_ws.RESTMessageV2 object that is configured to make a request to the target instance
     * @returns {sn_ws.RESTMessageV2}
     */
    createRestMessage: function() {
        var request = new sn_ws.RESTMessageV2();
        request.setRequestHeader("Accept", "application/json");
        var authHeader = 'Basic ' + GlideStringUtil.base64Encode(this.connectionConfig.username + ':' + this.connectionConfig.password);
        request.setRequestHeader('Authorization', authHeader);
        // Do not use setBasicAuth. This does not work with mutual auth for some reason
        // request.setBasicAuth(this.connectionConfig.username, this.connectionConfig.password);
        request.setEndpoint(this.connectionConfig.instanceUrl);
        return request;
    },

    /**
     * Creates a document object that can be passed to {@link global.KLF_RecordSync.unloadRecord}
     * This is useful when you want to add multiple unloaded records to the same document
     * @returns {Document}
     */
    createUnloadDocument: function() {
        // @ts-ignore
        var document = global.GlideXMLUtil.newDocument('unload');
        var date = new GlideDateTime();
        document.documentElement.setAttribute('unload_date', date.toString());
        return document;
    },

    /**
     * Adds the record's related journal entries to the update set
     * @param {GlideRecord} parent
     * @param {Document} document
     * @returns {global.KLF_RecordSync.Manifest}
     */
    addJournalEntries: function(parent, document) {
        var manifest = new global.KLF_RecordSync.Manifest();

        var journal = new GlideRecord("sys_journal_field");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        journal.addQuery("name", parent.getRecordClassName());
        journal.addQuery("element_id", parent.getUniqueValue());
        journal.query();
        while (journal.next()) {
            manifest.addRecordByGlideRecord(journal);
            this.unloadRecord(journal, document);
        }
        return manifest;
    },

    /**
     * Adds the record's related audit entries to the update set
     * @param {GlideRecord} parent
     * @param {Document} document
     * @returns {global.KLF_RecordSync.Manifest}
     */
    addAuditEntries: function(parent, document) {
        var manifest = new global.KLF_RecordSync.Manifest();

        var audit = new GlideRecord("sys_audit");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        audit.addQuery("tablename", parent.getRecordClassName());
        audit.addQuery("documentkey", parent.getUniqueValue());
        audit.query();
        while (audit.next()) {
            manifest.addRecordByGlideRecord(audit);
            this.unloadRecord(audit, document);
        }
        return manifest;
    },

    /**
     * Adds the record's related currency entries to the update set
     * @param {GlideRecord} parent
     * @param {Document} document
     * @returns {global.KLF_RecordSync.Manifest}
     */
    addCurrencyEntries: function(parent, document) {
        var manifest = new global.KLF_RecordSync.Manifest();

        var currency = new GlideRecord("fx_currency_instance");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        currency.addQuery("table", parent.getRecordClassName());
        currency.addQuery("id", parent.getUniqueValue());
        currency.query();
        while (currency.next()) {
            manifest.addRecordByGlideRecord(currency);
            this.unloadRecord(currency, document);
        }
        return manifest;
    },

    /**
     * Adds the record's related currency entries to the update set
     * @param {GlideRecord} parent
     * @param {Document} document
     * @returns {global.KLF_RecordSync.Manifest}
     */
    addPriceEntries: function(parent, document) {
        var manifest = new global.KLF_RecordSync.Manifest();

        var price = new GlideRecord("fx_price");
        // Intentionally using GlideRecord.getRecordClassName because it will correctly
        // handle returning the correct table name when dealing with extended records
        price.addQuery("table", parent.getRecordClassName());
        price.addQuery("id", parent.getUniqueValue());
        price.query();
        while (price.next()) {
            manifest.addRecordByGlideRecord(price);
            this.unloadRecord(price, document);
        }
        return manifest;
    },

    /**
     * Uses the group mapping to map the groups in the record to the groups in the target instance
     * @param {GlideRecord} glideRecord 
     */
    mapGroups: function(glideRecord) {
        /**
         * @param {string} fieldName 
         */
        function mapReferenceField(fieldName) {
            var value = mapping[glideRecord.getValue(fieldName)] ||
                glideRecord.getValue(fieldName);
            glideRecord.setValue(fieldName, value);
        }

        /**
         * @param {string} fieldName 
         */
        function mapListField(fieldName) {
            var value = glideRecord.getValue(fieldName);
            if (!value) {
                return;
            }
            var groupSysIds = value.split(',');
            var mappedSysIds = groupSysIds.map(function(sysId) {
                return mapping[sysId] || sysId;
            });
            glideRecord.setValue(fieldName, mappedSysIds.join(','));
        }

        if (!this.groupMapping) {
            return;
        }

        var mapping = this.groupMapping.mapping;

        // Need to find all the fields that are group references
        var elements = new global.ArrayUtil().convertArray(glideRecord.getElements());
        elements.forEach(function(element) {
            var elementDescriptor = element.getED()
            if (elementDescriptor) {
                var internalType = elementDescriptor.getInternalType();
                if (internalType == 'reference') {
                    var table = elementDescriptor.getReference();
                    if (table == 'sys_user_group') {
                        mapReferenceField(element.getName());
                    }
                } else if (internalType == 'glide_list') {
                    var table = elementDescriptor.getReference();
                    if (table == 'sys_user_group') {
                        mapListField(element.getName());
                    }
                }
            }
        });
    },

    /**
     * Generates XML from GlideRecord that is like the XML generated by exporting a record from ServiceNow.
     * This XML can be used to import a record into ServiceNow.
     * @param {GlideRecord} glideRecord 
     * @param {Document} [document]
     * @returns {Document}
     */
    unloadRecord: function(glideRecord, document) {
        // I'm going to write to this glideRecord so I don't want something downstream
        // to write to the database so I'm disabling write operations just in case
        // something downstream tries to write
        glideRecord.setAbortAction(true);

        // This will map the groups in the record to the groups in the target instance
        // if a group mapping is provided in the constructor
        this.mapGroups(glideRecord);

        // @ts-ignore
        var _document = document || global.GlideXMLUtil.newDocument('unload');
        if (!document) {
            // If the document was not passed in, then add the unload_date attribute
            var date = new GlideDateTime();
            _document.documentElement.setAttribute('unload_date', date.toString());
        }

        // If this is an extended table then I need the true record and not the base record
        // If I detect this isn't the extended record I query for the extended record
        if (glideRecord.getTableName() != glideRecord.getRecordClassName()) {
            var extended = new GlideRecord(glideRecord.getRecordClassName());
            extended.get(glideRecord.getUniqueValue());
            // @ts-ignore
            new global.GlideUnloader().unloadGlideRecord(_document, extended, 'INSERT_OR_UPDATE');
        } else {
            // @ts-ignore
            new global.GlideUnloader().unloadGlideRecord(_document, glideRecord, 'INSERT_OR_UPDATE');
        }

        return _document;
    },

    /**
     * Generates XML from GlideRecord that is like the XML generated by exporting a record from ServiceNow.
     * This XML can be used to import a record into ServiceNow.
     * 
     * Adds the record and its related audit entries, journal entries, and attachments to the document
     * @param {GlideRecord} glideRecord 
     * @param {Document} [document]
     * @returns {{manifest:global.KLF_RecordSync.Manifest, document:Document}}
     */
    unloadRecordWithRelatedRecords: function(glideRecord, document) {
        var manifest = new global.KLF_RecordSync.Manifest();
        manifest.addRecordByGlideRecord(glideRecord);

        // @ts-ignore
        var _document = document || global.GlideXMLUtil.newDocument('unload');
        if (!document) {
            // If the document was not passed in, then add the unload_date attribute
            var date = new GlideDateTime();
            _document.documentElement.setAttribute('unload_date', date.toString());
        }

        // Initially add the record to the document
        this.unloadRecord(glideRecord, _document);

        // Add related records to the document
        manifest.addManifest(this.addAuditEntries(glideRecord, _document));
        manifest.addManifest(this.addJournalEntries(glideRecord, _document));
        manifest.addManifest(this.addCurrencyEntries(glideRecord, _document));
        manifest.addManifest(this.addPriceEntries(glideRecord, _document));

        return {
            manifest: manifest,
            document: _document
        };
    },

    /**
     * Merges two KLF_Manifest objects together. It merges the keys and the values of the two objects.
     * The resulting objects will have the keys of both objects and the values will be the unique values
     * of both objects based on the key.
     * @param {KLF_Manifest} manifest1
     * @param {KLF_Manifest} manifest2
     * @returns {KLF_Manifest}
     */
    mergeManifests: function(manifest1, manifest2) {
        for (var tableName in manifest2) {
            if (!manifest1[tableName]) {
                manifest1[tableName] = {};
            }
            for (var sysId in manifest2[tableName]) {
                manifest1[tableName][sysId] = true;
            }
        }
        return manifest1;
    },

    /**
     * Returns the XML representation of the Document
     * @param {Document} document 
     * @returns {string}
     */
    documentToString: function(document) {
        // @ts-ignore
        return global.GlideXMLUtil.toString(document);
    },

    /**
     * This isn't used right now. The thought is that it could be used to generate a custom version of the XML. You'd do
     * that if you needed to do something special with the XML before sending it to the target instance. One use case I can
     * think of is altering how the sys_user and sys_user_group references are handled because the sys_id values will be different
     * in the target instance
     * 
     * Generates XML from GlideRecord that is like the XML generated by exporting a record from ServiceNow.
     * This XML can be used to import a record into ServiceNow.
     * @param {GlideRecord} glideRecord 
     */
    unloadRecordCustom: function(glideRecord) {
        var xml = '<record_update>';
        xml += '<' + glideRecord.getTableName() + '>';
        var fields = glideRecord.getFields();
        for (var i = 0; i < fields.size(); i++) {
            var field = fields.get(i);
            xml += '<' + field + '>' + glideRecord[field] + '</' + field + '>';
        }
        xml += '</' + glideRecord.getTableName() + '>';
        xml += '</record_update>';
        return xml;
    },

    /**
     * Imports a record into ServiceNow using the Table API.
     * Returns whatever the response was or null if there was an error
     * 
     * If a manifest is provided then the manifest is validated on the remote
     * instance to ensure the records in the manifest were inserted
     * 
     * @param {string} xml 
     * @param {global.KLF_RecordSync.Manifest} [manifest]
     * @returns {KLF_SendToRemoteInstanceResponse}
     */
    sendToRemoteInstance: function(xml, manifest) {
        var request = this.createRestMessage();
        request.setHttpMethod('POST');
        request.setRequestHeader('Content-Type', 'application/xml');
        var endpoint = request.getEndpoint() + gs.getProperty('KLF_RecordSync.endpoint.import.path');
        request.setEndpoint(endpoint);
        request.setRequestBody(xml);
        var response = request.execute();
        if (response.getStatusCode() != 200) {
            this.logError('Failed to load the record into the target instance');
            this.logError('Received status code: ' + response.getStatusCode());
            this.logError('Received body: ' + response.getBody());
            return {
                success: false,
                payload: response.getBody(),
                missingManifest: null
            };
        }

        var payload = response.getBody();

        if (manifest) {
            return {
                success: true,
                payload: payload,
                missingManifest: this.validateSync(manifest)
            };
        } else {
            return {
                success: true,
                payload: payload,
                missingManifest: null
            }
        }

    },

    /**
     * Checks the target instance for the list of records specified in the manifest. If the records do not exist in the target instance
     * then a new manifest is created that contains the records that do not exist in the target instance
     * @param {global.KLF_RecordSync.Manifest} manifest
     * @returns {global.KLF_RecordSync.Manifest?} A manifest of records that do not exist in the remote instance
     */
    validateSync: function(manifest) {
        var request = this.createRestMessage();
        request.setHttpMethod('POST');
        request.setRequestHeader('Content-Type', 'application/json');
        var endpoint = request.getEndpoint() + gs.getProperty('KLF_RecordSync.endpoint.import.path') + '/validate_manifest';
        request.setEndpoint(endpoint);
        request.setRequestBody(manifest.toJson());
        var response = request.execute();
        if (response.getStatusCode() != 200) {
            this.logError('Failed to validate manifest');
            this.logError('Received status code: ' + response.getStatusCode());
            this.logError('Received body: ' + response.getBody());
            return null;
        }

        var payload = response.getBody();
        var parsedPayload = JSON.parse(payload);
        var missingManifest = global.KLF_RecordSync.Manifest.createManifestFromObj(parsedPayload.result);
        return missingManifest;
    }

};
/**
 * When transferring data between ServiceNow instances groups referenced in the source data set may not exist 
 * in the target instance. This utility contains functions to help manage the group data when transferring
 * data between instances.
 * 
 * With this utility you can:
 * - Create a mapping of the groups in the local system to the groups in the remote system {@link global.KLF_RecordSync_GroupUtils.createGroupMapping}
 * - Sync the groups in the local system with the remote system {@link global.KLF_RecordSync_GroupUtils.syncGroups}
 * - Update the group sys_ids in notifications that are transferred to the remote system {@link global.KLF_RecordSync_GroupUtils.updateRemoteNotifications}
 */

/**
 * Data type returned from call to {@link GroupUtils.getGroupFields}
 * @typedef KLF_RecordSync_GroupField
 * @property {string} table The name of the table that contains the field
 * @property {string} type The type of the field from sys_dictionary
 * @property {string} columnName The column name of the field
 */

/**
 * @typedef KLF_RecordSync_GroupMapping
 * @property {boolean} success true if there was a successful response from the remote system. false if there was an error response
 * @property {boolean} hasMissingGroups true if there are missing groups
 * @property {string[]} missingGroups The sys_ids of the groups that do not exist in the remote system
 * @property {{[localGroupSysId:string]:string}} mapping The mapping of the sys_ids of the groups that exist in the local system to the remote system
 * @property {string} [error] There error message if success is false
 */

/**
 * @typedef {{sysId:string,name:string?,source:string?}} KLF_RecordSync_RemoteGroup
 */

/**
 * @typedef {{
 *   groupMapping:{[localGroupSysId:string]:string},
 *   notificationSysIds:string[]
 * }} KLF_RecordSync_UpdateRemoteNotificationsRequest
 */

/**
 * Incomplete notifications is a mapping of the notification sys_id to the groups that were not found in the remote system
 * @typedef {{
 *   success:boolean,
 *   error?:string,
 *   updatedNotifications:string[],
 *   notUpdatedNotifications:string[]
 *   incompleteNotifications?: {[notificationSysId:string]: string[]}
 * }} KLF_RecordSync_UpdateRemoteNotificationsResponse
 */


//@ts-ignore
var global = global || {};

/**
 * 
 * @param {KLF_RecordSyncConnectionConfig} connectionConfig 
 */
global.KLF_RecordSync_GroupUtils = function(connectionConfig) {
    this.connectionConfig = connectionConfig;
};

/**
 * Uses the {@link KLF_RecordSync_RemoteGroup[]} passed in from the remote system to create a {@link KLF_RecordSync_GroupMapping} object
 * that maps the remote group sys_id to the local group sys_id
 * @param {KLF_RecordSync_RemoteGroup[]} remoteGroups 
 * @returns {KLF_RecordSync_GroupMapping}
 */
global.KLF_RecordSync_GroupUtils.createMappingFromRemote = function(remoteGroups) {
    /**
     * Creates a mapping of the passed in fieldName to the sys_id of the remote group
     * This is to make it easy to lookup the sys_id of the remote group by the provided
     * field name without searching through the remoteGroups array each time
     * @param {keyof KLF_RecordSync_RemoteGroup} fieldName 
     * @param {KLF_RecordSync_RemoteGroup[]} remoteGroups 
     * @returns {{[name:string]:string}}
     */
    function createIndex(remoteGroups, fieldName) {
        return remoteGroups.reduce(function(index, remoteGroup) {
            var key = remoteGroup[fieldName];
            if (key) {
                index[key] = remoteGroup.sysId;
            }
            return index;
        }, /** @type {{[indexName:string]:string}} */ ({}));
    }

    /** 
     * I am transforming the remoteGroups into an object that contains of the
     * names, sys_ids, and sources of the remote groups so I can easily use those
     * values in a GlideRecord query
     * @type {{names:string[],sysIds:string[],sources:string[]}} 
     **/
    var namesSysIdsSources = remoteGroups.reduce(function(namesSysIdsSources, remoteGroup) {
        // There should always be a sys_id. The name and source are optional
        namesSysIdsSources.sysIds.push(remoteGroup.sysId);
        if (remoteGroup.name) {
            namesSysIdsSources.names.push(remoteGroup.name);
        }
        if (remoteGroup.source) {
            namesSysIdsSources.sources.push(remoteGroup.source);
        }
        return namesSysIdsSources;
    }, {
        names: /** @type {string[]} **/ ([]),
        sysIds: /** @type {string[]} **/ ([]),
        sources: /** @type {string[]} **/ ([]),
    });

    var nameToSysId = createIndex(remoteGroups, 'name');
    var sourceToSysId = createIndex(remoteGroups, 'source');
    var sysIdToSysId = createIndex(remoteGroups, 'sysId');

    var groupGr = new GlideRecord('sys_user_group');
    groupGr.addQuery('sys_id', 'IN', namesSysIdsSources.sysIds)
        .addOrCondition('source', 'IN', namesSysIdsSources.sources)
        .addOrCondition('name', 'IN', namesSysIdsSources.names);
    groupGr.query();
    /** @type {{[localGroupSysId:string]:string}} */
    var localToRemoteMapping = {};
    while (groupGr.next()) {
        // This is in order of priority. 
        // If the sys_id is found, then that is used. 
        // If the name is found, then that is used. 
        // If the source is found, then that is used
        if (sysIdToSysId[groupGr.getUniqueValue()]) {
            localToRemoteMapping[sysIdToSysId[groupGr.getUniqueValue()]] = groupGr.getUniqueValue();
        } else if (nameToSysId[groupGr.getValue('name')]) {
            localToRemoteMapping[nameToSysId[groupGr.getValue('name')]] = groupGr.getUniqueValue();
        } else if (sourceToSysId[groupGr.getValue('source')]) {
            localToRemoteMapping[sourceToSysId[groupGr.getValue('source')]] = groupGr.getUniqueValue();
        }
    }

    var mappedGroups = Object.keys(localToRemoteMapping);
    var allGroups = Object.keys(sysIdToSysId);
    var missingGroups = new global.ArrayUtil().diff(allGroups, mappedGroups);

    return {
        success: true,
        hasMissingGroups: missingGroups.length > 0,
        missingGroups: missingGroups,
        mapping: localToRemoteMapping
    };
}

/**
 * The group sys_ids in notifications are not updated when the notifications are transferred to the remote system. This method
 * uses the group mapping to update the notifications with the correct group sys_ids
 * @param {KLF_RecordSync_GroupMapping} groupMapping 
 * @param {string[]} notificationSysIds sysevent_email_action.sys_id[]
 * @returns {KLF_RecordSync_UpdateRemoteNotificationsResponse}
 */
global.KLF_RecordSync_GroupUtils.updateNotifications = function(groupMapping, notificationSysIds) {
    var mapping = groupMapping.mapping;

    // Get notifications that use groups
    var notification = new GlideRecord('sysevent_email_action');
    notification.addQuery('sys_id', 'IN', notificationSysIds);
    notification.addNotNullQuery('recipient_groups');
    notification.query();

    var hasIncompleteNotifications = false;
    var incompleteNotifications = /** @type {{[notificationSysId:string]:string[]}} */ ({});
    var updatedNotifications = [];
    while (notification.next()) {
        var recipientGroups = notification.getValue('recipient_groups').split(',');
        var updatedRecipientGroups = recipientGroups.map(function(group) {
            return mapping[group] || group;
        });
        notification.recipient_groups = updatedRecipientGroups.join(',');
        notification.update();

        // Check to see if all the groups have been mapped
        // If all the groups have not been mapped then
        var group = new GlideRecord('sys_user_group');
        group.addQuery('sys_id', 'IN', updatedRecipientGroups);
        group.query();
        var mappedGroups = [];
        while (group.next()) {
            mappedGroups.push(group.getUniqueValue());
        }

        var unmappedGroups = new global.ArrayUtil().diff(updatedRecipientGroups, mappedGroups);
        if (unmappedGroups.length > 0) {
            hasIncompleteNotifications = true;
            incompleteNotifications[notification.getUniqueValue()] = unmappedGroups;
        }

        updatedNotifications.push(notification.getUniqueValue());
    }

    var notUpdatedNotifications = new global.ArrayUtil().diff(notificationSysIds, updatedNotifications);

    // Needs to return updated notifications and notifications that were not updated
    var response = {
        success: true,
        updatedNotifications: updatedNotifications,
        notUpdatedNotifications: notUpdatedNotifications
    };

    if (hasIncompleteNotifications) {
        // @ts-ignore
        response.incompleteNotifications = incompleteNotifications;
    }

    return response;

}

global.KLF_RecordSync_GroupUtils.prototype = {
    /**
     * @param {string} message 
     */
    logInfo: function(message) {
        gs.log(message, 'KLF_RecordSync_GroupUtils');
    },
    /**
     * @param {string} message 
     */
    logError: function(message) {
        gs.logError(message, 'KLF_RecordSync_GroupUtils');
    },

    /**
     * Finds all the fields that reference sys_user_group in a scoped app. This attempts to find
     * all the group fields in the system. The group fields will include both reference fields and
     * list fields that reference sys_user_group
     * @param {string} scopeSysId sys_scope.sys_id
     * @returns {KLF_RecordSync_GroupField[]}
     */
    getGroupFieldsInScope: function(scopeSysId) {
        var me = this;
        var dataTransferUtils = new global.KLF_DataTransferUtils();
        var tables = dataTransferUtils.getTablesInScope(scopeSysId);
        return tables.reduce(function(allFields, tableName) {
            return allFields.concat(me.getGroupFieldsInTable(tableName));
        }, []);
    },

    /**
     * Finds all the fields that reference sys_user_group in a table. This attempts to find
     * all the group fields in table. The group fields will include both reference fields and
     * list fields that reference sys_user_group
     * @param {string} tableName 
     * @returns {KLF_RecordSync_GroupField[]}
     */
    getGroupFieldsInTable: function(tableName) {
        var arrayUtil = new global.ArrayUtil()
        // @ts-ignore
        var tableUtils = new global.TableUtils(tableName);
        var tables = arrayUtil.convertArray(tableUtils.getHierarchy());
        return tables.reduce(function(allFields, tableName) {
            var fieldGr = new GlideRecord('sys_dictionary');
            fieldGr.addQuery('name', tableName);
            fieldGr.addQuery('reference', 'sys_user_group');
            fieldGr.query();
            var fields = [];
            while (fieldGr.next()) {
                fields.push({
                    table: fieldGr.name.toString(),
                    type: fieldGr.internal_type.toString(),
                    columnName: fieldGr.element.toString(),
                });
            }
            return allFields.concat(fields);
        }, []);
    },

    /**
     * Finds all the unique groups that are referenced in a table by using the group fields
     * that are returned from {@link GroupUtils.getGroupFields}
     * @param {string} tableName
     * @param {string} [filter] GlideRecord encoded query
     * @returns {string[]} The unique group sys_ids
     */
    getUniqueGroupsInTable: function(tableName, filter) {
        var fields = this.getGroupFieldsInTable(tableName);
        var gr = new GlideRecord(tableName);
        if (filter) {
            gr.addEncodedQuery(filter);
        }
        gr.query();
        /** @type {{[fieldName:string]: boolean}} */
        var groups = {};
        while (gr.next()) {
            fields.forEach(function(field) {
                var columnName = field.columnName;
                if (gr[columnName].nil()) {
                    return;
                }

                if (field.type === 'reference') {
                    groups[gr.getValue(columnName)] = true;
                } else if (field.type === 'glide_list') {
                    var groupList = gr.getValue(columnName).split(',');
                    groupList.forEach(function(group) {
                        groups[group] = true;
                    });
                } else {
                    throw 'Unsupported field type: ' + field.type;
                }
            });
        }
        return Object.keys(groups);
    },

    /**
     * Finds all the unique groups that are referenced in a scope by using the group fields
     * that are returned from {@link GroupUtils.getGroupFields}
     * @param {string} scope
     * @returns {string[]} The unique group sys_ids
     */
    getUniqueGroupsInScope: function(scope) {
        var me = this;
        var dataTransferUtils = new global.KLF_DataTransferUtils();
        var tables = dataTransferUtils.getTablesInScope(scope);
        return new global.ArrayUtil().unique(tables.reduce(function(allGroups, tableName) {
            return allGroups.concat(me.getUniqueGroupsInTable(tableName));
        }, []));
    },

    /**
     * Returns a sn_ws.RESTMessageV2 object that is configured to make a request to the target instance
     * @returns {sn_ws.RESTMessageV2}
     */
    createRestMessage: function() {
        var request = new sn_ws.RESTMessageV2();
        request.setRequestHeader("Accept", "application/json");
        var authHeader = 'Basic ' + GlideStringUtil.base64Encode(this.connectionConfig.username + ':' + this.connectionConfig.password);
        request.setRequestHeader('Authorization', authHeader);
        // Do not use setBasicAuth. This does not work with mutual auth for some reason
        // request.setBasicAuth(this.connectionConfig.username, this.connectionConfig.password);
        request.setEndpoint(this.connectionConfig.instanceUrl);
        return request;
    },

    cachePropertyName: 'KLF_RecordSync_GroupUtils.mapping',

    /**
     * Returns the group mapping that was created by calling {@link global.KLF_RecordSync_GroupUtils.createGroupMapping}. When calling
     * {@link global.KLF_RecordSync_GroupUtils.createGroupMapping}, the cache will be updated with the group mapping
     * @param {string} mappingName The mapping name used to store the mapping when calling {@link global.KLF_RecordSync_GroupUtils.createGroupMapping}
     */
    getGroupMapping: function(mappingName) {
        var cacheJson = gs.getProperty(this.cachePropertyName);
        var cache = JSON.parse(cacheJson);
        var mapping = cache[this.getCacheKey(mappingName)];
        if (!mapping) {
            throw 'Call createGroupMapping first to create the group mapping';
        }
        return mapping;
    },

    /**
     * Returns a mappingName that is used to store / retrieve a group mapping from the cache
     * See {@link global.KLF_RecordSync_GroupUtils.getGroupMapping} and {@link global.KLF_RecordSync_GroupUtils.createGroupMapping}
     * @param {string} mappingName 
     * @returns {string}
     */
    getCacheKey: function(mappingName) {
        return this.connectionConfig.instanceUrl + ':' + mappingName;
    },

    /**
     * Uses the sys_ids of the groups in the local system to find the sys_ids of the groups that exist in the remote system. This returns
     * a mapping of the local group sys_id to the remote group sys_id. If a group does not exist in the remote system, the remote group sys_id will be null
     * 
     * By default the results are cached. If you want to bypass the cache, set useCache to false. When using the cache a mappingName is required. This is used
     * when you retrieve the group mapping using {@link global.KLF_RecordSync_GroupUtils.getGroupMapping}
     * @param {string[]} groupSysIds
     * @param {boolean} [useCache=true] If true, the cache will be used to store the group mappings. true by default
     * @param {string} [mappingName] A mapping name to store the group mapping under. This is not needed if useCache is false. Typically this would be the application scope, for example: x_example_app
     * @returns {KLF_RecordSync_GroupMapping} The sys_ids of the groups that do not exist in the remote system
     */
    createGroupMapping: function(groupSysIds, mappingName, useCache) {
        var _useCache = useCache === undefined ? true : useCache;
        var groupRecords = new GlideRecord('sys_user_group');
        groupRecords.addQuery('sys_id', 'IN', groupSysIds);
        groupRecords.query();

        /** @type {KLF_RecordSync_RemoteGroup[]} */
        var groups = [];
        var foundGroups = [];
        while (groupRecords.next()) {
            foundGroups.push(groupRecords.getUniqueValue());
            groups.push({
                sysId: groupRecords.getValue('sys_id'),
                name: groupRecords.getValue('name'),
                source: groupRecords.getValue('source')
            });
        }

        // Add the missing groups. These groups don't really exist in the local system for some reason
        // I will still attempt to find them in the remote system
        var missingGroupSysIds = new global.ArrayUtil().diff(groupSysIds, foundGroups);
        missingGroupSysIds.forEach(function(sysId) {
            groups.push({
                sysId: sysId,
                name: '',
                source: ''
            });
        });

        // Make a  request to sys_user_group
        var request = this.createRestMessage();
        request.setRequestHeader('Content-Type', 'application/json')
        request.setHttpMethod('POST');
        var endpoint = request.getEndpoint() + gs.getProperty('KLF_RecordSync_GroupUtils.endpoint.mapping.path');
        request.setEndpoint(endpoint);
        this.logInfo('Creating group mapping using RemoteGroups:\n\n' + JSON.stringify(groups, null, 4));
        request.setRequestBody(JSON.stringify(groups));

        var response = request.execute();
        if (response.getStatusCode() != 200) {
            this.logError('Failed to group mapping using groups: ' + groupSysIds.join(', '));
            this.logError('Received status code: ' + response.getStatusCode());
            this.logError('Received body: ' + response.getBody());
            if (_useCache) {
                gs.setProperty(this.cachePropertyName, '');
            }
            return {
                success: false,
                error: response.getBody(),
                hasMissingGroups: true,
                missingGroups: [],
                mapping: {}
            };
        }

        var payload = response.getBody();
        this.logInfo('Received group mapping response:\n\n' + payload);
        if (payload) {
            var parsedPayload = JSON.parse(payload);
            /** @type {KLF_RecordSync_GroupMapping} */
            var groupMapping = parsedPayload.result;
            if (_useCache) {
                if (!mappingName) {
                    throw 'KLF_RecordSync_GroupUtils: A mapping name is required when using the cache';
                }
                var cacheJson = gs.getProperty(this.cachePropertyName, '{}');
                var cache = JSON.parse(cacheJson);
                cache[this.getCacheKey(mappingName)] = groupMapping;
                gs.setProperty(this.cachePropertyName, JSON.stringify(cache, null, 4));
            }
            return groupMapping;
        } else {
            if (_useCache) {
                gs.setProperty(this.cachePropertyName, '');
            }
            return {
                success: false,
                error: 'No response body was received from the remote system',
                hasMissingGroups: true,
                missingGroups: [],
                mapping: {}
            };
        }
    },

    /**
     * Syncs the specified groups by their sys_user_group.sys_id in the local system with the remote system.
     * 
     * This will throw an exception if there are groups that don't exist in the group list unless
     * the quiet parameter is set to true
     * 
     * This will return null if the method finds that there are no groups to sync
     * @param {string[]} groupSysIds sys_user_group.sys_id[]
     * @param {boolean} [quiet=false] If true then sync will proceed even if there are groups that don't exist in the group list
     * @returns {KLF_SendToRemoteInstanceResponse?}
     */
    syncGroups: function(groupSysIds, quiet) {
        var manifest = new global.KLF_RecordSync.Manifest();
        var recordSync = new global.KLF_RecordSync(this.connectionConfig);
        var document = recordSync.createUnloadDocument();
        var group = new GlideRecord('sys_user_group');
        group.addQuery('sys_id', 'IN', groupSysIds);
        group.query();
        var foundGroupSysIds = [];
        while (group.next()) {
            foundGroupSysIds.push(group.getUniqueValue());
            recordSync.unloadRecord(group, document);
            manifest.addRecordByGlideRecord(group);
        }

        var missingGroupSysIds = new global.ArrayUtil().diff(groupSysIds, foundGroupSysIds);
        if (missingGroupSysIds.length > 0) {
            var errorMessage = 'The following groups were not found in the group list:\n' + missingGroupSysIds.join(',') + '\n';
            if (quiet) {
                this.logError(errorMessage);
            } else {
                throw errorMessage;
            }
        }

        if (foundGroupSysIds.length === 0) {
            return null;
        } else {
            return recordSync.syncDocument(document, manifest);
        }
    },

    /**
     * Returns a list of sys_ids of notifications in the provided scope that use groups as one of the recipients.
     * Useful to use in combination with {@link global.KLF_RecordSync_GroupUtils.updateRemoteNotifications}
     * @param {string} scope 
     * @returns {string[]} sysevent_email_action.sys_id[]
     */
    getNotificationsUsingGroupsInScope: function(scope) {
        var notification = new GlideRecord('sysevent_email_action');
        notification.addQuery('sys_scope.scope', scope);
        notification.addNotNullQuery('recipient_groups');
        notification.query();
        var notifications = [];
        while (notification.next()) {
            notifications.push(notification.getUniqueValue());
        }
        return notifications;
    },

    /**
     * Returns a list of sys_user_group.sys_id of the groups that are used in the specified notifications
     * @param {string[]} notificationSysIds sysevent_email_action.sys_id[]
     * @returns {string[]} sys_user_group.sys_id[]
     */
    getGroupsUsedInNotifications: function(notificationSysIds) {
        var notification = new GlideRecord('sysevent_email_action');
        notification.addQuery('sys_id', 'IN', notificationSysIds);
        notification.addNotNullQuery('recipient_groups');
        notification.query();
        var groups = /** @type string[] */ ([]);
        while (notification.next()) {
            var recipientGroups = notification.getValue('recipient_groups').split(',');
            groups = groups.concat(recipientGroups);
        }
        return new global.ArrayUtil().unique(groups);
    },

    /**
     * The group sys_ids in notifications are not updated when the notifications are transferred to the remote system. This method
     * uses the group mapping to update the notifications with the correct group sys_ids on the remote system
     * @param {KLF_RecordSync_GroupMapping} groupMapping 
     * @param {string[]} notificationSysIds sysevent_email_action.sys_id[]
     * @returns {KLF_RecordSync_UpdateRemoteNotificationsResponse}
     */
    updateRemoteNotifications: function(groupMapping, notificationSysIds) {
        var request = this.createRestMessage();
        request.setHttpMethod('POST');
        request.setEndpoint(request.getEndpoint() + gs.getProperty('KLF_RecordSync_GroupUtils.endpoint.notifications.path'));
        request.setRequestHeader('Content-Type', 'application/json');
        request.setRequestBody(JSON.stringify({
            groupMapping: groupMapping,
            notificationSysIds: notificationSysIds
        }));
        var response = request.execute();
        if (response.getStatusCode() != 200) {
            this.logError('Failed to update remote notifications');
            this.logError('Received status code: ' + response.getStatusCode());
            this.logError('Received body: ' + response.getBody());
            return {
                success: false,
                error: response.getBody(),
                updatedNotifications: [],
                notUpdatedNotifications: []
            };
        }

        return JSON.parse(response.getBody());
    }
};
/**
 * When transferring data between ServiceNow instances users referenced in the source data set may not exist 
 * in the target instance. This utility contains functions to help manage the user data when transferring
 * data between instances.
 * 
 * With this utility you can:
 * - Create a mapping of the users in the local system to the users in the remote system {@link global.KLF_RecordSync_UserUtils.createUserMapping}
 */

/**
 * Data type returned from call to {@link global.KLF_RecordSync_UserUtils.getUserFields}
 * @typedef KLF_RecordSync_UserField
 * @property {string} table The name of the table that contains the field
 * @property {string} type The type of the field from sys_dictionary
 * @property {string} columnName The column name of the field
 */

/**
 * @typedef KLF_RecordSync_UserMapping
 * @property {boolean} success true if there was a successful response from the remote system. false if there was an error response
 * @property {boolean} hasMissingUsers true if there are missing users
 * @property {string[]} missingUsers The sys_ids of the users that do not exist in the remote system
 * @property {{[localUserSysId:string]:string}} mapping The mapping of the sys_ids of the users that exist in the local system to the remote system
 * @property {string} [error] There error message if success is false
 */

/**
 * @typedef {{sysId:string,username:string?,source:string?}} KLF_RecordSync_RemoteUser
 */

//@ts-ignore
var global = global || {};

/**
 * 
 * @param {KLF_RecordSyncConnectionConfig} connectionConfig 
 */
global.KLF_RecordSync_UserUtils = function(connectionConfig) {
    this.connectionConfig = connectionConfig;
};

/**
 * Uses the {@link KLF_RecordSync_RemoteUser[]} passed in from the remote system to create a {@link KLF_RecordSync_UserMapping} object
 * that maps the remote user sys_id to the local user sys_id
 * @param {KLF_RecordSync_RemoteUser[]} remoteUsers 
 * @returns {KLF_RecordSync_UserMapping}
 */
global.KLF_RecordSync_UserUtils.createMappingFromRemote = function(remoteUsers) {
    /**
     * Creates a mapping of the passed in fieldName to the sys_id of the remote user
     * This is to make it easy to lookup the sys_id of the remote user by the provided
     * field name without searching through the remoteUsers array each time
     * @param {keyof KLF_RecordSync_RemoteUser} fieldName 
     * @param {KLF_RecordSync_RemoteUser[]} remoteUsers 
     * @returns {{[name:string]:string}}
     */
    function createIndex(remoteUsers, fieldName) {
        return remoteUsers.reduce(function(index, remoteUser) {
            var key = remoteUser[fieldName];
            if (key) {
                index[key] = remoteUser.sysId;
            }
            return index;
        }, /** @type {{[indexName:string]:string}} */ ({}));
    }

    /** 
     * I am transforming the remoteUsers into an object that contains of the
     * names, sys_ids, and sources of the remote users so I can easily use those
     * values in a GlideRecord query
     * @type {{usernames:string[],sysIds:string[],sources:string[]}} 
     **/
    var usernamesSysIdsSources = remoteUsers.reduce(function(namesSysIdsSources, remoteUser) {
        // There should always be a sys_id. The name and source are optional
        namesSysIdsSources.sysIds.push(remoteUser.sysId);
        if (remoteUser.username) {
            namesSysIdsSources.usernames.push(remoteUser.username);
        }
        if (remoteUser.source) {
            namesSysIdsSources.sources.push(remoteUser.source);
        }
        return namesSysIdsSources;
    }, {
        usernames: /** @type {string[]} **/ ([]),
        sysIds: /** @type {string[]} **/ ([]),
        sources: /** @type {string[]} **/ ([]),
    });

    var usernameToSysId = createIndex(remoteUsers, 'username');
    var sourceToSysId = createIndex(remoteUsers, 'source');
    var sysIdToSysId = createIndex(remoteUsers, 'sysId');

    var userGr = new GlideRecord('sys_user');
    userGr.addQuery('sys_id', 'IN', usernamesSysIdsSources.sysIds)
        .addOrCondition('source', 'IN', usernamesSysIdsSources.sources)
        .addOrCondition('user_name', 'IN', usernamesSysIdsSources.usernames);
    userGr.query();
    /** @type {{[localUserSysId:string]:string}} */
    var localToRemoteMapping = {};
    while (userGr.next()) {
        // This is in order of priority. 
        // If the sys_id is found, then that is used. 
        // If the name is found, then that is used. 
        // If the source is found, then that is used
        if (sysIdToSysId[userGr.getUniqueValue()]) {
            localToRemoteMapping[sysIdToSysId[userGr.getUniqueValue()]] = userGr.getUniqueValue();
        } else if (usernameToSysId[userGr.getValue('user_name')]) {
            localToRemoteMapping[usernameToSysId[userGr.getValue('user_name')]] = userGr.getUniqueValue();
        } else if (sourceToSysId[userGr.getValue('source')]) {
            localToRemoteMapping[sourceToSysId[userGr.getValue('source')]] = userGr.getUniqueValue();
        }
    }

    var mappedUsers = Object.keys(localToRemoteMapping);
    var allUsers = Object.keys(sysIdToSysId);
    var missingUsers = new global.ArrayUtil().diff(allUsers, mappedUsers);

    return {
        success: true,
        hasMissingUsers: missingUsers.length > 0,
        missingUsers: missingUsers,
        mapping: localToRemoteMapping
    };
}

global.KLF_RecordSync_UserUtils.prototype = {
    /**
     * @param {string} message 
     */
    logInfo: function(message) {
        gs.log(message, 'KLF_RecordSync_UserUtils');
    },
    /**
     * @param {string} message 
     */
    logError: function(message) {
        gs.logError(message, 'KLF_RecordSync_UserUtils');
    },

    /**
     * Checks sys_user display field to make sure it is set to sys_user.user_name
     * Returns true if the display field is set to sys_user.user_name false otherwise
     * @returns {boolean}
     */
    checkSysUserDisplayField: function() {
        var field = new GlideRecord('sys_dictionary');
        field.addQuery('name', 'sys_user');
        field.addQuery('element', 'user_name');
        field.addQuery('display', true);
        field.query();

        return field.getRowCount() > 0;
    },

    /**
     * Clears the sys_user display field. This is typically used when the sys_user table is configured to pick a default display field.
     * Probably sys_user.name
     */
    clearSysUserDisplayField: function() {
        var displayField = new GlideRecord('sys_dictionary');
        displayField.addQuery('name', 'sys_user');
        displayField.addQuery('display', true);
        displayField.setWorkflow(false);
        displayField.autoSysFields(false);
        displayField.setValue('display', false);
        displayField.updateMultiple();
    },

    /**
     * When transferring sys_user data between instances the sys_user display value may be used to match users
     * 
     * This changes sys_user display value to sys_user.user_name instead of sys_user.name. This
     * is because the sys_user.user_name field is unique and the sys_user.name field is not.
     * 
     * When transferring data between instances, the sys_user.name field is not guaranteed to be unique
     * which could cause subtle bugs when trying to match users by name
     * 
     * @param {string} fieldName The field name to update the sys_user display field to
     * @returns {string} The previous display field name
     */
    updateSysUserDisplayField: function(fieldName) {
        // Make sure we can get the field using the field name
        if (!fieldName) {
            throw 'KLF_RecordSync_UserUtils.updateSysUserDisplayField: Field name is required';
        }

        var field = new GlideRecord('sys_dictionary');
        field.addQuery('name', 'sys_user');
        field.addQuery('element', fieldName);
        field.query();
        if (!field.next()) {
            throw 'KLF_RecordSync_UserUtils.updateSysUserDisplayField: Field not found';
        }

        // Set the display field to false
        var currentDisplayFieldName = '';
        // Check to see if there is a current display field
        var currentDisplayField = new GlideRecord('sys_dictionary');
        currentDisplayField.addQuery('name', 'sys_user');
        currentDisplayField.addQuery('display', true);
        currentDisplayField.query();
        if (currentDisplayField.next()) {
            // We have a current display field
            // Set this to false so we can update the display field
            currentDisplayFieldName = currentDisplayField.getValue('element');
            if (currentDisplayFieldName == fieldName) {
                return currentDisplayFieldName;
            }
            currentDisplayField.setWorkflow(false);
            currentDisplayField.autoSysFields(false);
            currentDisplayField.display = false;
            currentDisplayField.update();
        }

        // Update the field to be the display field
        field.setWorkflow(false);
        field.autoSysFields(false);
        field.display = true;
        field.update();

        return currentDisplayFieldName;
    },

    /**
     * Finds all the fields that reference sys_user in a scoped app. This attempts to find
     * all the user fields in the system. The user fields will include both reference fields and
     * list fields that reference sys_user
     * 
     * @param {string} scopeSysId sys_scope.sys_id
     * @param {string} [filter] GlideRecord encoded query
     * @returns {KLF_RecordSync_UserField[]}
     */
    getUserFields: function(scopeSysId, filter) {
        var fieldGr = new GlideRecord('sys_dictionary');
        fieldGr.addQuery('sys_scope', scopeSysId);
        fieldGr.addQuery('reference', 'sys_user');
        fieldGr.query();
        var fields = [];
        while (fieldGr.next()) {
            fields.push({
                table: fieldGr.name.toString(),
                type: fieldGr.internal_type.toString(),
                columnName: fieldGr.element.toString(),
                filter: filter
            });
        }
        return fields;
    },

    /**
     * Finds all the fields that reference sys_user in a scoped app. This attempts to find
     * all the user fields in the system. The user fields will include both reference fields and
     * list fields that reference sys_user
     * @param {string} scopeSysId sys_scope.sys_id
     * @returns {KLF_RecordSync_UserField[]}
     */
    getUserFieldsInScope: function(scopeSysId) {
        var me = this;
        var dataTransferUtils = new global.KLF_DataTransferUtils();
        var tables = dataTransferUtils.getTablesInScope(scopeSysId);
        return tables.reduce(function(allFields, tableName) {
            return allFields.concat(me.getUserFieldsInTable(tableName));
        }, []);
    },

    /**
     * Finds all the fields that reference sys_user in a table. This attempts to find
     * all the user fields in table. The user fields will include both reference fields and
     * list fields that reference sys_user
     * @param {string} tableName 
     * @returns {KLF_RecordSync_UserField[]}
     */
    getUserFieldsInTable: function(tableName) {
        var arrayUtil = new global.ArrayUtil()
        // @ts-ignore
        var tableUtils = new global.TableUtils(tableName);
        var tables = arrayUtil.convertArray(tableUtils.getHierarchy());
        return tables.reduce(function(allFields, tableName) {
            var fieldGr = new GlideRecord('sys_dictionary');
            fieldGr.addQuery('name', tableName);
            fieldGr.addQuery('reference', 'sys_user');
            fieldGr.query();
            var fields = [];
            while (fieldGr.next()) {
                fields.push({
                    table: fieldGr.name.toString(),
                    type: fieldGr.internal_type.toString(),
                    columnName: fieldGr.element.toString(),
                });
            }
            return allFields.concat(fields);
        }, []);
    },

    /**
     * Finds all the unique users that are referenced in a table by using the user fields
     * that are returned from {@link UserUtils.getUserFields}
     * @param {string} tableName
     * @param {string} [filter] GlideRecord encoded query
     * @returns {string[]} The unique user sys_ids
     */
    getUniqueUsersInTable: function(tableName, filter) {
        var fields = this.getUserFieldsInTable(tableName);
        var gr = new GlideRecord(tableName);
        if (filter) {
            gr.addEncodedQuery(filter);
        }
        gr.query();
        /** @type {{[fieldName:string]: boolean}} */
        var users = {};
        while (gr.next()) {
            fields.forEach(function(field) {
                var columnName = field.columnName;
                if (gr[columnName].nil()) {
                    return;
                }

                if (field.type === 'reference') {
                    users[gr.getValue(columnName)] = true;
                } else if (field.type === 'glide_list') {
                    var userList = gr.getValue(columnName).split(',');
                    userList.forEach(function(user) {
                        users[user] = true;
                    });
                } else {
                    throw 'Unsupported field type: ' + field.type;
                }
            });
        }
        return Object.keys(users);
    },

    /**
     * Finds all the unique users that are referenced in a scope by using the user fields
     * that are returned from {@link UserUtils.getUserFields}
     * @param {string} scope
     * @returns {string[]} The unique user sys_ids
     */
    getUniqueUsersInScope: function(scope) {
        var me = this;
        var dataTransferUtils = new global.KLF_DataTransferUtils();
        var tables = dataTransferUtils.getTablesInScope(scope);
        return new global.ArrayUtil().unique(tables.reduce(function(allUsers, tableName) {
            return allUsers.concat(me.getUniqueUsersInTable(tableName));
        }, []));
    },

    /**
     * Returns a sn_ws.RESTMessageV2 object that is configured to make a request to the target instance
     * @returns {sn_ws.RESTMessageV2}
     */
    createRestMessage: function() {
        var request = new sn_ws.RESTMessageV2();
        request.setRequestHeader("Accept", "application/json");
        var authHeader = 'Basic ' + GlideStringUtil.base64Encode(this.connectionConfig.username + ':' + this.connectionConfig.password);
        request.setRequestHeader('Authorization', authHeader);
        // Do not use setBasicAuth. This does not work with mutual auth for some reason
        // request.setBasicAuth(this.connectionConfig.username, this.connectionConfig.password);
        request.setEndpoint(this.connectionConfig.instanceUrl);
        return request;
    },

    cachePropertyName: 'KLF_RecordSync_UserUtils.mapping',

    /**
     * Returns the user mapping that was created by calling {@link global.KLF_RecordSync_UserUtils.createUserMapping}. When calling
     * {@link global.KLF_RecordSync_UserUtils.createUserMapping}, the cache will be updated with the user mapping
     * @param {string} mappingName The mapping name used to store the mapping when calling {@link global.KLF_RecordSync_UserUtils.createUserMapping}
     */
    getUserMapping: function(mappingName) {
        var cacheJson = gs.getProperty(this.cachePropertyName);
        var cache = JSON.parse(cacheJson);
        var mapping = cache[this.getCacheKey(mappingName)];
        if (!mapping) {
            throw 'Call createUserMapping first to create the user mapping';
        }
        return mapping;
    },

    /**
     * Returns a mappingName that is used to store / retrieve a user mapping from the cache
     * See {@link global.KLF_RecordSync_UserUtils.getUserMapping} and {@link global.KLF_RecordSync_UserUtils.createUserMapping}
     * @param {string} mappingName 
     * @returns {string}
     */
    getCacheKey: function(mappingName) {
        return this.connectionConfig.instanceUrl + ':' + mappingName;
    },

    /**
     * Uses the sys_ids of the users in the local system to find the sys_ids of the users that exist in the remote system. This returns
     * a mapping of the local user sys_id to the remote user sys_id. If a user does not exist in the remote system, the remote user sys_id will be null
     * 
     * By default the results are cached. If you want to bypass the cache, set useCache to false. When using the cache a mappingName is required. This is used
     * when you retrieve the user mapping using {@link global.KLF_RecordSync_UserUtils.getUserMapping}
     * @param {string[]} userSysIds
     * @param {boolean} [useCache=true] If true, the cache will be used to store the user mappings. true by default
     * @param {string} [mappingName] A mapping name to store the user mapping under. This is not needed if useCache is false. Typically this would be the application scope, for example: x_example_app
     * @returns {KLF_RecordSync_UserMapping} The sys_ids of the users that do not exist in the remote system
     */
    createUserMapping: function(userSysIds, mappingName, useCache) {
        var _useCache = useCache === undefined ? true : useCache;
        var userRecords = new GlideRecord('sys_user_user');
        userRecords.addQuery('sys_id', 'IN', userSysIds);
        userRecords.query();

        /** @type {KLF_RecordSync_RemoteUser[]} */
        var users = [];
        var foundUsers = [];
        while (userRecords.next()) {
            foundUsers.push(userRecords.getUniqueValue());
            users.push({
                sysId: userRecords.getValue('sys_id'),
                username: userRecords.getValue('user_name'),
                source: userRecords.getValue('source')
            });
        }

        // Add the missing users. These users don't really exist in the local system for some reason
        // I will still attempt to find them in the remote system
        var missingUserSysIds = new global.ArrayUtil().diff(userSysIds, foundUsers);
        missingUserSysIds.forEach(function(sysId) {
            users.push({
                sysId: sysId,
                username: '',
                source: ''
            });
        });

        // Make a  request to sys_user_user
        var request = this.createRestMessage();
        request.setRequestHeader('Content-Type', 'application/json')
        request.setHttpMethod('POST');
        var endpoint = request.getEndpoint() + gs.getProperty('KLF_RecordSync_UserUtils.endpoint.mapping.path');
        request.setEndpoint(endpoint);
        this.logInfo('Creating user mapping using RemoteUsers:\n\n' + JSON.stringify(users, null, 4));
        request.setRequestBody(JSON.stringify(users));

        var response = request.execute();
        if (response.getStatusCode() != 200) {
            this.logError('Failed to user mapping using users: ' + userSysIds.join(', '));
            this.logError('Received status code: ' + response.getStatusCode());
            this.logError('Received body: ' + response.getBody());
            if (_useCache) {
                gs.setProperty(this.cachePropertyName, '');
            }
            return {
                success: false,
                error: response.getBody(),
                hasMissingUsers: true,
                missingUsers: [],
                mapping: {}
            };
        }

        var payload = response.getBody();
        this.logInfo('Received user mapping response:\n\n' + payload);
        if (payload) {
            var parsedPayload = JSON.parse(payload);
            /** @type {KLF_RecordSync_UserMapping} */
            var userMapping = parsedPayload.result;
            if (_useCache) {
                if (!mappingName) {
                    throw 'KLF_RecordSync_UserUtils: A mapping name is required when using the cache';
                }
                var cacheJson = gs.getProperty(this.cachePropertyName, '{}');
                var cache = JSON.parse(cacheJson);
                cache[this.getCacheKey(mappingName)] = userMapping;
                gs.setProperty(this.cachePropertyName, JSON.stringify(cache, null, 4));
            }
            return userMapping;
        } else {
            if (_useCache) {
                gs.setProperty(this.cachePropertyName, '');
            }
            return {
                success: false,
                error: 'No response body was received from the remote system',
                hasMissingUsers: true,
                missingUsers: [],
                mapping: {}
            };
        }
    },

    /**
     * This probably doesn't need to be used. Each ServiceNow instance should have a full list of users so
     * the users should be able to be found in the remote system.
     * 
     * Syncs the specified users by their sys_user.sys_id in the local system with the remote system.
     * 
     * This will throw an exception if there are users that don't exist in the user list unless
     * the quiet parameter is set to true
     * 
     * This will return null if the method finds that there are no users to sync
     * @param {string[]} userSysIds sys_user_user.sys_id[]
     * @param {boolean} [quiet=false] If true then sync will proceed even if there are users that don't exist in the user list
     * @returns {KLF_SendToRemoteInstanceResponse?}
     */
    syncUsers: function(userSysIds, quiet) {
        var manifest = new global.KLF_RecordSync.Manifest();
        var recordSync = new global.KLF_RecordSync(this.connectionConfig);
        var document = recordSync.createUnloadDocument();
        var user = new GlideRecord('sys_user');
        user.addQuery('sys_id', 'IN', userSysIds);
        user.query();
        var foundUserSysIds = [];
        while (user.next()) {
            foundUserSysIds.push(user.getUniqueValue());
            recordSync.unloadRecord(user, document);
            manifest.addRecordByGlideRecord(user);
        }

        var missingUserSysIds = new global.ArrayUtil().diff(userSysIds, foundUserSysIds);
        if (missingUserSysIds.length > 0) {
            var errorMessage = 'The following users were not found in the user list:\n' + missingUserSysIds.join(',') + '\n';
            if (quiet) {
                this.logError(errorMessage);
            } else {
                throw errorMessage;
            }
        }

        if (foundUserSysIds.length === 0) {
            return null;
        } else {
            return recordSync.syncDocument(document, manifest);
        }
    }
};
/**
 * This script implements some enhancements to the Service Portal.
 * 
 * - applyGlideRecordTemplate - Applies a sys_template to a ServicePortal form to easily populate fields
 * - getActivityEntries - Enhances the Ticket Conversations widget by providing a complete list of activities.
 * By default, the widget only shows comments and work notes. This function provides the same list of activities
 * that are displayed in platform UI.
 * - getSPClientUIActions - This is used to display client actions in ServicePortal. Retrieves all the client actions for a table.
 * By default, ServicePortal will only display server side UI actions. This function retrieves client side UI actions that are
 * configured to be displayed on a ServicePortal view.
 * - setRedirectURL - Used in the form widget in ServicePortal to provide a redirect URL. This is to provide some standardization on
 * how routing is performed in ServicePortal after a UI Action is executed.
 */
// @ts-ignore 
var global = global || {};
/**
 * @class global.KLF_SPUtils
 * contains utility functions
 */
function KLF_SPUtils() {}
KLF_SPUtils.prototype = {
    /**
     * Applies a sys_template to a ServicePortal form
     * @param {string} templateName The name of the sys_template to apply
     * @param {*} spForm The form returned from $sp.getForm
     */
    applyGlideRecordTemplate: function(templateName, spForm) {
        var template = new GlideRecord('sys_template');
        if (template.get('name', templateName)) {
            var gr = new GlideRecord(spForm.table);
            gr.applyTemplate(templateName);
            var fields = spForm._fields;

            Object.keys(fields).filter(function(fieldName) {
                return !!gr.getValue(fieldName);
            }).forEach(function(fieldName) {
                var field = fields[fieldName];
                if (field.value) return; // Don't overwrite existing values
                if (field.type == 'boolean') {
                    var booleanValue = gr.getValue(fieldName) == '1' ? 'true' : 'false';
                    field.value = booleanValue;
                    field.displayValue = booleanValue;
                } else {
                    field.value = gr.getValue(fieldName);
                    field.displayValue = gr.getDisplayValue(fieldName);
                }
            });

            // Apply dot walked values
            // Be careful with these. Dot walked values are skipped in the default behavior
            // I still wanted these to apply though. If you aren't careful you can mistakenly
            // overwrite values in reference field tables
            var nameValueStrings = template.getValue('template').split('^');
            var nameValuePairs = nameValueStrings.map(function(nameValueString) {
                return nameValueString.split('=');
            });
            var dotWalkedPairs = nameValuePairs.filter(function(nameValuePair) {
                return nameValuePair[0].indexOf('.') >= 0;
            });
            dotWalkedPairs.forEach(function(nameValuePair) {
                var field = fields[nameValuePair[0]];
                field.value = nameValuePair[1];
                field.displayValue = nameValuePair[1];
            });
        }
    },

    /**
     * substitute call for $sp.getStream. For some reason $sp.getStream was returning a
     * NullPointerException in Rome, so I replaced it with an equivalent call. This is used
     * in the snb-ticket-conversation widget
     * @param {string} tableName
     * @param {string} sysld
     * @returns {Object}
     */
    getStream: function(tableName, sysld) {
        var gr = new GlideRecord(tableName);
        if (gr.get(sysld)) {
            return {
                "display_ value": gr.getDisplayValue(),
                "sys_id": sysld,
                "number": gr.getValue('number'),
                "entries": [],
                "user sys_id": gs.getUserID(),
                "user full_name": gs.getUserDisplayName(),
                "user login": gs.getUserName(),
                "label": gr.getlabel(),
                "table": tableName,
                "journal_flelds": [{
                    "can_read ": true,
                    "color": "gold",
                    "can_write": true,
                    "name": "work_notes",
                    "label": "Work Notes"
                }]
            };
        } else {
            return {};
        }
    },
    /**
     * Returns a list of field names that have changed on a record
     * @param {GlideRecord} glideRecord Record to find changed field names
     * @returns {string[]} List of field names that have changed
     */
    getChangedFieldNames: function(glideRecord) {
        var elements = new global.ArrayUtil().convertArray(glideRecord.getElements());
        return elements.filter(function(element) {
            return element.changes();
        }).map(function(element) {
            return element.getName();
        });
    },
    /**
     * @typedef ChangeRecord
     * Represents the set of changes for 1 update of a record. Each field changed
     * is stored in the changes array.
     * @property {string} sys_updated_on
     * @property {string} sys_updated_by
     * @property { object[]} changes
     * @property {string} changes[].fieldName Name of the field that changed
     * @property {string} changes[].fieldLabel Label of the field that changed
     * @property {string} changes[].currentValue Current value of the field that changed
     * @property {string} changes[].currentDisplayValue Current display value of the field that changed
     * @property {string} changes[].previousValue Previous value of the field that changed
     * @property {string} changes[].previousDisplayValue Previous display value of the field that changed
     */
    /**
     *
     * @param {string} tableName Name of table to retrieve history
     * @param {string} sysld sys_id of record to retrieve history
     * @returns {ChangeRecord[]}
     */
    getHistory: function(tableName, sysld) {
        //@ts-ignore
        var walker = new sn_hw.HistoryWalker(tableName, sysld);
        walker.walkBackward();
        var current = walker.getWalkedRecordCopy();
        /** @type {GlideRecord} */
        var previous;
        var history = [];
        while (walker.walkBackward()) {
            previous = walker.getWalkedRecordCopy();
            var changedFieldNames = this.getChangedFieldNames(current);
            var changes = changedFieldNames.map(function(fieldName) {
                return {
                    fieldName: fieldName,
                    fieldLabel: current[fieldName].getlabel(),
                    currentValue: current.getValue(fieldName),
                    currentDisplayValue: current.getDisplayValue(fieldName),
                    previousValue: previous.getValue(fieldName),
                    previousDisplayValue: previous.getDisplayValue(fieldName)
                };
            });
            var changeRecord = {
                sys_updated_on: current.getValue('sys_updated_on'),
                sys_updated_by: current.getValue('sys_updated_by'),
                changes: changes
            };
            history.push(changeRecord);
            current = previous;
        }
        return history;
    },
    /**
    @typedef Activity
    Represents an object that can be displayed as an entry in the Ticket Conversations widget
    The widget requires a set of properties to be filled in to render the entry correctly. You can see how
    * these properties are used by looking at the HTML Template section. The list is stored in "data.mergedEntries".
    * @property {string} element Type of activity: attachment,. field_changes, comments, work_notes
    * @property {string} field_label Display value of the type of activity
    * @property {string} value A description of the activity that happened
    * @property {string} name The label of the activity
    * @property {string} user_sys_id sys_id from sys_user
    * @property {string} sys_created_on Date when activity happened
    */
    /**
     * Gets a list of entries that can be rendered in the "Ticket Conversations" widget. This function
     * is called in the "Server Script" to help populate the list of entries that are displayed
     * @param {ChangeRecord[]} history
     * @param {string} tableName
     * @returns {Activity[]} A list of activities that can be displayed in the "Ticket Conversations" widget
     */
    getActivityEntries: function(history, tableName) {
        var configuredActivityFieldString = gs.getProperty('glide.ui.' + tableName + '_activity.fields');
        var activityFields = configuredActivityFieldString ? configuredActivityFieldString.split(',') : ['status'];
        return history.map(function(changeRecord) {
            function getUser( /** @type {string}**/ username) {
                var user = new GlideRecord('sys_user');
                if (user.get('user name', username)) {
                    return user;
                } else {
                    return null;
                }
            }
            var changes = changeRecord.changes;
            var changelines = changes.filter(function(change) {
                return activityFields.indexOf(change.fieldName) >= 0;
            }).map(function(change) {
                return change.fieldLabel + ': ' + '<span style="display: inline-block; width : lOpx"/>' + change.currentDisplayValue + ' was ' +
                    change.previousDisplayValue;
            });
            var summary = changelines.join(' <br/>');
            var user = getUser(changeRecord.sys_updated_by) || null;
            var createdAdjusted = '';
            if (changeRecord.sys_updated_on) {
                var createdDate = new GlideDateTime(changeRecord.sys_updated_on);
                createdAdjusted = createdDate.getLocalDate().getByFormat('YYYY-MM-dd') + '' +
                    createdDate.getLocalTime().getByFormat('HH:mm:ss');
            }
            return {
                element: 'field_ changes',
                field_label: 'Field Changes',
                value: summary,
                name: user ? user.getDisplayValue() : '',
                user_sys_id: user ? user.getUniqueValue() : '',
                sys_created_on: changeRecord.sys_updated_on,
                sys_created_on_adjusted: createdAdjusted
            };
        }).filter(function(entry) {
            return entry.value;
        });
    },
    /**
     * Retrieves all the client actions for a table. This is used to display client actions in ServicePortal.
     * This will only retrieve client actions that are configured to be displayed on a ServicePortal view
     * by configuring the "UI Action Visibility" of the UI Action. Setting the view to "Service Portal" and
     * "Visibility" to "Include". Result of this function is used in data.f._ui_actions list in form widget
     * @param {string} tableName Name of table to retrieve actions
     * @param {GlideRecord} current GlideRecord used to evaluate conditions against
     * @param {string} [viewName=sp]
     * @param {SPAction[]} [actions] Not needed. This is used as an accumulator in recursive calls
     * @returns {SPAction[]} A list of SPAction objects that can be displayed in the Form widget
     */
    getSPClientUIActions: function(tableName, current, viewName, actions) {
        var uiView = new GlideRecord('sys_ui_view');
        viewName = viewName || 'sp';
        if (!uiView.get('name', viewName)) {
            gs.error('Utils.getSPClientUIActions - could not find Service Portal view');
            return [];
        }
        var actionGr = new GlideRecord('sys_ui_action');
        actionGr.addQuery('client', true);
        actionGr.addQuery(' active', true);
        //filter for only client side UI actions with an UI Action Visibility of Service Portal
        actionGr.addJoinQuery('sys_ui_action_view', 'sys_id', 'sys_ui_action')
            .addCondition('sys_ui_ view', uiView.getUniqueValue());
        actionGr.addQuery('table', tableName);
        actionGr.query();
        actions = actions || [];
        var evaluator = new GlideScopedEvaluator();
        while (actionGr.next()) {
            var include = evaluator.evaluateScript(actionGr, 'condition', {
                current: current
            });
            //if the action already exists then the action in the parent table
            //has been overridden in the extension table
            var actionExists = actions.filter(function(action) {
                return action.action_name == actionGr.getValue('action_name');
            }).length > 0;
            if (include && !actionExists) {
                actions.push({
                    sys_id: actionGr.getUniqueValue(),
                    action_name: actionGr.getValue('action_name'),
                    form_style: actionGr.getValue('form_style'),
                    hint: actionGr.getValue('hint'),
                    is_button: Boolean(actionGr.form_button),
                    is_context: Boolean(actionGr.form_context_menu),
                    is_link: Boolean(actionGr.form_link),
                    is_custom: true,
                    display_order: parseInt(actionGr.getValue('order')) || 100,
                    name: actionGr.getValue('name'),
                    fn: actionGr.getValue('script'),
                    onclick: actionGr.getValue('onclick'),
                    is_client: Boolean(actionGr.client)
                });
            }
        }
        var dbRecord = new GlideRecord('sys_db_object');
        if (dbRecord.get('name', tableName) && !dbRecord.super_class.nil()) {
            var superDbRecord = dbRecord.super_class.getRefRecord();
            var superTableName = superDbRecord.getValue('name');
            return this.getSPClientUIActions(superTableName, current, viewName, actions);
        } else {
            return actions;
        }
    },
    /**
     * This goes through the set of SPActions and applies the view rules
     * so included and excluded actions are displayed properly in Service Portal
     * @param {SPAction[]} spActions
     * @param {string} viewName
     * @returns {SPAction[]}
     */
    filterForSPActionslnView: function(spActions, viewName) {
        var view = new GlideRecord('sys_ui_view');
        var viewSysld = (viewName && view.get('name', viewName)) ? view.getUniqueValue() : '';
        return spActions.filter(function(spAction) {
            // Look for include rule first
            // If the sys_ui_action has the view on the list than include it
            var includeViewRule = new GlideRecord('sys_ui_action_view');
            includeViewRule.addQuery('sys_ui_action', spAction.sys_id);
            includeViewRule.addQuery('visibility', 'Include');
            includeViewRule.addQuery('sys_ui_view', viewSysld);
            includeViewRule.query();
            if (includeViewRule.getRowCount() > 0) {
                return true;
            }
            // Now look for exclude rule
            // If the sys_ui_action has the view on the exclude list than exclude it
            var excludeViewRule = new GlideRecord('sys_ui_action_view');
            excludeViewRule.addQuery('sys_ui_action', spAction.sys_id);
            excludeViewRule.addQuery('visibility', 'Exclude');
            excludeViewRule.addQuery('sys_ui_view', viewSysld);
            excludeViewRule.query();
            if (excludeViewRule.getRowCount() > 0) {
                return false;
            }
            // Wasn't on an include or exclude list, so check to see if we have
            // an include list. If there was an include list then we know this view
            // isn't on it so exclude it. Otherwise either there isn't a list or
            // this view isn't on the exclude list so include it
            var haslncludeViewRule = new GlideRecord('sys_ui_action_view');
            haslncludeViewRule.addQuery('sys_ui_action', spAction.sys_id);
            haslncludeViewRule.addQuery('visibility', 'Include');
            haslncludeViewRule.query();
            return haslncludeViewRule.getRowCount() === 0; // Including if we don't have any include view rules
        });
    },
    /**
     * @callback getUrl
     * @returns {string} A URL to be used
     */
    /**
     * Used in the form widget in ServicePortal to provide a redirect URL. This is used
     * in combination with a UI action. The UI action sys_id is used as a key in the user
     * session to store a redirect URL that is picked up by the client after the UI action
     * executes
     * @param {string} actionSysld sys_id of a UI Action
     * @param {getUrl} getUrl function used to generate URL
     */
    setRedirectURL: function(actionSysld, getUrl) {
        var session = gs.getSession();
        session.putClientData(actionSysld, JSON.stringify({
            redirectUrl: getUrl()
        }));
    },

    /** !Important: This field must be at the bottom of this object */
    /** @type {'KLF_SPUtils'} */
    type: 'KLF_SPUtils'
};

global.KLF_SPUtils = KLF_SPUtils;
/**
 * This script include provides utility functions for unit testing.
 * 
 * It is intended to be used in conjunction with ATF. There are some general things that you might want to do when writing tests.
 * Like creating a user, creating a group, deleting records created by a user, impersonating a user etc.
 * 
 * It includes functions that allow you to:
 * - Delete records created by a specific user so that you can clean up after a test
 * - Run a function as a specific user so that you can test functionality that requires a specific user
 * - Create a common user that has no roles or groups
 * - Impersonate the common user
 * - Create a group, including adding users to the group
 * - Create a user
 */
//@ts-ignore
var global = global || {};

/**
 * General utility functions for to help with testing using ATF
 */
global.KLF_TestUtils = (function() {
    var glideRecordUtils = new global.KLF_GlideRecordUtils();

    return {

        /**
         * Deletes records from the given tables that the specified
         * user has created. Tables can be specified as a string or an array of strings
         * @param {string} createdBySysId sys_user.sys_id
         * @param {string|string[]} tableNames The names of the tables to delete records from
         */
        deleteRecordsCreatedBy: function(createdBySysId, tableNames) {
            if (typeof tableNames === 'string') {
                tableNames = [tableNames];
            }

            // first i need to transform the createdBySysId sys_user.sys_id
            //into a sys_user.user_name
            var createdBy = new GlideRecord('sys_user');
            if (!createdBy.get(createdBySysId)) {
                throw new Error('Could not find user with sys_id: ' + createdBySysId);
            }
            var createdByUserName = createdBy.getValue('user_name');

            tableNames.forEach(function(tableName) {
                var gr = new GlideRecord(tableName);
                gr.addQuery('sys_created_by', createdByUserName);
                gr.deleteMultiple();
            });
        },

        /**
         * Deletes records from the given tables that the common user
         * has created. Tables can be specified as a string or an array of strings
         * @param {string|string[]} tableNames The names of the tables to delete records from
         */
        deleteRecordsCreatedByCommonUser: function(tableNames) {
            var commonUser = this.getCommonUser();
            if (commonUser === null) {
                throw new Error('Could not find common user');
            }
            this.deleteRecordsCreatedBy(commonUser.getUniqueValue(), tableNames);
        },

        /**
         * Executes the given function as the common user and then reverts back to the original user
         * @param {function} func The function to execute as the given user
         */
        runAsCommonUser: function(func) {
            this.runAsUser(this.createCommonUser().getUniqueValue(), func);
        },

        /**
         * Executes the given function as the given user and then reverts back to the original user
         * @param {string} userSysId The sys_id of the user to impersonate
         * @param {function} func The function to execute as the given user
         */
        runAsUser: function(userSysId, func) {
            var previousUserSysId = this.impersonateUser(userSysId);
            try {
                func();
            } catch ( /** @type {*} */ e) {
                gs.error(e);
            }
            this.impersonateUser(previousUserSysId);
        },

        /**
         * Returns common user sys_user record or null if it does not exist
         * @returns {?GlideRecord} The sys_user record of the common user or null if it does not exist
         */
        getCommonUser: function() {
            var user = new GlideRecord('sys_user');
            if (user.get('user_name', 'common')) {
                return user;
            } else {
                return null;
            }
        },

        /**
         * Creates a user with no roles or groups to simulate a common user
         * @returns {GlideRecord} The newly created sys_user record
         */
        createCommonUser: function() {
            var user = this.createUser('common');
            return user;
        },

        /**
         * Retrieves a user that has admin access
         * @returns {GlideRecord} Some user that has admin access
         */
        getAdminUser: function() {
            var user = new GlideRecord('sys_user');
            if (user.get('user_name', 'admin')) {
                return user;
            } else {
                throw new Error('Could not find admin user');
            }
        },

        /**
         * Impersonates the admin user and returns the GlideRecord of the admin user
         * Returns the sys_id of the current user before impersonation
         * @returns {[GlideRecord, string]} The sys_user record for admin user and the
         * sys_id of the current user before impersonation
         */
        impersonateAdminUser: function() {
            var adminUser = this.getAdminUser();
            var currentUser = this.impersonateUser(adminUser.getUniqueValue());
            return [adminUser, currentUser];
        },

        /**
         * Returns the common user sys_user record or creates it if it does not exist
         * @returns {GlideRecord} The sys_user record of the common user
         */
        getOrCreateCommonUser: function() {
            var user = this.getCommonUser();
            if (user) {
                return user;
            } else {
                return this.createCommonUser();
            }
        },

        /**
         * Impersonates the admin user
         * Returns the GlideRecord of the common user that was impersonated
         * Returns the sys_id of the current user before impersonation
         * @returns {[GlideRecord, string]} The sys_user record for common user and the
         * sys_id of the current user before impersonation
         */
        impersonateCommonUser: function() {
            var commonUser = this.getOrCreateCommonUser();
            var currentUser = this.impersonateUser(commonUser.getUniqueValue());
            return [commonUser, currentUser];
        },

        /**
         * Impersonates the user with the given sys_id
         * @param {string} userSysId The sys_id of the user to impersonate
         * @returns {string} The sys_id of the current user before impersonation
         */
        impersonateUser: function(userSysId) {
            var impersonator = new GlideImpersonate();
            return impersonator.impersonate(userSysId);
        },


        /**
         * Creates a new sys_user_group record
         * @param {string} groupName - The name of the group to create
         * @returns {GlideRecord} - The newly created sys_user_group record
         */
        createGroup: function(groupName) {
            return glideRecordUtils.insertRecord('sys_user_group', {
                name: groupName
            });
        },

        /**
         * Creates a new sys_user record
         * @param {string} userName - The name of the user to create
         */
        createUser: function(userName) {
            return glideRecordUtils.insertRecord('sys_user', {
                user_name: userName,
                first_name: userName + 'first',
                last_name: userName + 'last',
                email: userName + '@example.com'
            });
        },

        /**
         * Adds a user to a group
         * @param {GlideRecord} user - The user to add to the group
         * @param {GlideRecord} group - The group to add the user to
         */
        addUserToGroup: function(user, group) {
            glideRecordUtils.insertRecord('sys_user_grmember', {
                user: user.getUniqueValue(),
                group: group.getUniqueValue()
            });
        }
    };
})();
/**
 * @param {*} outputs 
 * @param {*} steps 
 * @param {*} params 
 * @param {*} stepResult 
 * @param {*} assertEqual 
 */
function KLF_TestUtilsTest(outputs, steps, params, stepResult, assertEqual) {
    var testUtils = global.KLF_TestUtils;

    describe('KLF_TestUtilTest.impersonateUser', function() {
        it('should impersonate the user with the given sys_id', function() {
            var user = testUtils.createUser('testUser');
            testUtils.impersonateUser(user.sys_id);
            expect(user.getValue('sys_id')).toBe(gs.getUserID());
        });
    });

}
// @ts-ignore
var global = global || {};

global.MetricUtils = function() {};

global.MetricUtils.prototype = {
    /**
     * @param {GlideRecord} glideRecord 
     * @param {GlideRecord} metricDefinition 
     * @returns {GlideRecord}
     */
    createMetricInstance: function(glideRecord, metricDefinition) {
        var metricInstance = new GlideRecord('metric_instance');
        metricInstance.newRecord();
        metricInstance.table = glideRecord.getRecordClassName();
        metricInstance.id = glideRecord.sys_id;
        metricInstance.definition = metricDefinition.sys_id;
        metricInstance.field = metricDefinition.field;
        return metricInstance;
    },

    /**
     * @param {string} table 
     * @param {string} sysId 
     */
    clearMetricsByRelatedRecord: function(table, sysId) {
        if (table && sysId) {
            var metricInstance = new GlideRecord('metric_instance');
            metricInstance.addQuery('table', table);
            metricInstance.addQuery('id', sysId);
            metricInstance.deleteMultiple();
        }
    }
};