//@ts-ignore -- I know this throws an error, but it allows VSCode to autocomplete the methods
var x_912467_klf = x_912467_klf || {};

x_912467_klf.CalendarCreator = (function() {
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
         * @param {string} quarterName One of Ql, Q2, Q3, or Q4
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
         * @param {string} quarterName One of Ql, Q2, Q3, Q4
         * @param {number} year
         * @returns {[string,string]} A pair representing the start and end date
         */
        getQuarterDateRange: function(quarterName, year) {
            if (quarterName == 'Ql') {
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
         * @param {string} quarterName One of Ql, Q2, Q3, Q4
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
                this.createQuarter('Ql', year),
                this.createQuarter('Q2', year),
                this.createQuarter('Q3', year),
                this.createQuarter('Q4', year)
            ];
        },
        /**
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
                this.createFiscalQuarterName('Ql', year),
                this.createFiscalQuarterName('Q2', year),
                this.createFiscalQuarterName('Q3', year),
                this.createFiscalQuarterName('Q4', year)
            ];
        },
        /**
         * Returns the fiscal quarter span name short name
         * @param {string} quarter One of Ql, Q2, Q3, or Q4
         * @param {number} year
         * @returns {string}
         */
        getFiscalQuarterSpanNameShortName: function(quarter, year) {
            return year + ' ' + quarter;
        },
        /**
         *
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
         * Creates all the calendar entries by quarter beginning at the start year
         * and ending at the end year
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
//@ts-ignore
var x_912467_klf = x_912467_klf || {};
/**
 * @class x_snb_common.DateUtils
 * contains utility functions
 */
x_912467_klf.DateUtils = (function() {

    return {
        /**
         * Returns the fiscal year of the GlideDateTime in the form of YYYY
         * @param {GlideDateTime} glideDateTime
         * @returns {number}
         */
        getFiscalYear: function(glideDateTime) {
            var month = glideDateTime.getMonthLocalTime();
            var isBetweenOctoberAndDecember = month >= 10 && month <= 12;
            var year = glideDateTime.getYearLocalTime();
            return isBetweenOctoberAndDecember ? year + 1 : year;
        },
        /**
         * Returns the fiscal year of the current date
         * @returns {number}
         */
        getCurrentFiscalYear: function() {
            return this.getFiscalYear(new GlideDateTime());
        },
        /**
         * Returns a string that represents the start date of the current fiscal year
         * @param {number} [yearsAgo]
         * @returns {GlideDate}
         */
        getFiscalYearStartDate: function(yearsAgo) {
            yearsAgo = yearsAgo || 0;
            return new GlideDateTime((this.getCurrentFiscalYear() - yearsAgo - 1) + '-10-01 04:00:00').getDate();
        },
        /**
         * Returns the current year in the form of YYYY
         * @returns {number}
         */
        getCurrentYear: function() {
            return new GlideDateTime().getYearLocalTime();
        },
        /**
         * Returns a GlideDate that represents the number of business days
         * after the current date based on the days argument
         * @param {GlideDate} startDate
         * @param {number} days
         * @param {string} [scheduleSysId]
         * @returns {GlideDate}
         */
        addBusinessDaysToDate: function(startDate, days, scheduleSysId) {
            if (days < 0) throw 'Days must be greater than or equal to 0';
            gs.debug('Start Date: ' + startDate.getByFormat('YYYY-MM-dd'));
            var start = new GlideDateTime();
            start.setDisplayValue(startDate.getByFormat('YYYY-MM-dd'));
            // if the days is O then we need at least lms so the schedular checks if the current day is on the schedule
            var duration = days === 0 ? new GlideDuration(1) : new GlideDuration(60 * 60 * 24 * 1000 * days);
            var durationCalculator = new global.DurationCalculator();
            gs.debug('Start: ' + start);
            durationCalculator.setSchedule(scheduleSysId || 'e0abedd297c4e150b2e1f97e6253af21');
            durationCalculator.calcRelativeDueDate(start, days);
            return durationCalculator.getEndDateTime().getLocalDate();
        },
        /**
         * Returns a GlideDate that represents the number of business days
         * after the current date based on the days argument
         * @param {number} days
         * @param {string} [scheduleSysId]
         * @returns {GlideDate}
         */
        addBusinessDays: function(days, scheduleSysId) {
            var start = new GlideDateTime(gs.beginningOfToday()).getDate();
            if (days < 0) {
                return this.subtractBusinessDaysToDate(start, -1 * days, scheduleSysId);
            } else {
                return this.addBusinessDaysToDate(start, days, scheduleSysId);
            }
        },
        /**
         * Returns a GlideDate that represents the number of business days
         * after the current date based on the days argument
         * @param {GlideDate} startDate
         * @param {number} days
         * @param {string} [scheduleSysId]
         * @returns {GlideDate}
         */
        subtractBusinessDaysToDate: function(startDate, days, scheduleSysId) {
            // Formula to return an estimation of the number of business
            // days in the past. This will be off because it only accounts
            // for weekends, but it will be closer than just starting with
            // the days parameter
            function candidateBusinessDaysAgo( /**@type {number}*/ x) {
                x = x < 0 ? -1 * x : x;
                return (((x - (x % 5)) / 5) * 7) + (x % 5);
            }
            var schedule = new GlideSchedule(scheduleSysId || 'e0abedd297c4e150b2e1f97e6253af21');
            if (days <= 0) throw 'Days must be greater than O';
            // This script may run on a non-business day, so we get the next business
            // day by asking for the business day O days from now
            var currentBusinessDay = this.addBusinessDaysToDate(startDate, 0);
            var loopCount = 0;
            var candidateDayOffset = -1 * candidateBusinessDaysAgo(days);
            do {
                var result = null;
                if (loopCount > 365) throw 'Could not do subtraction';
                loopCount = loopCount + 1;
                var candidateAnswer = new GlideDateTime(currentBusinessDay.getValue());
                candidateAnswer.addDaysLocalTime(candidateDayOffset);
                if (!schedule.isInSchedule(candidateAnswer)) {
                    // if this day is not in the schedule skip to previous day
                    candidateDayOffset = candidateDayOffset - 1;
                    continue;
                }
                result = this.addBusinessDaysToDate(candidateAnswer.getDate(), days, scheduleSysId);
                candidateDayOffset = candidateDayOffset - 1;
            } while (result === null || result.getValue() != currentBusinessDay.getValue());
            return candidateAnswer.getDate();
        },
        /**
         * GlideDate representation of today's date
         * @returns {GlideDate}
         */
        nowDate: function() {
            return new GlideDate();
        },
        /**
         * Returns a GlideDate that represents the date the number of days
         * in the future based on the passed in argument. If you want days in the past then
         * use a negative number of days
         * @param {number} days
         * @returns {GlideDate}
         */
        addDays: function(days) {
            var daysAgo = new GlideDateTime();
            daysAgo.addDaysLocalTime(days);
            return daysAgo.getDate();
        }
    };
})();
//@ts-ignore
var x_912467_klf = x_912467_klf || {};
/**
 * @class x_snb_common.GlideRecordUtils
 * contains utility functions
 */
x_912467_klf.GlideRecordUtils = (function () {

    var globalGlideRecordUtils = new global.KLF_GlideRecordUtils();

    return {
        /**
         * Quickly retrieve a GlideRecord by sys_id
         * @param {string} sysld
         * @param {string} tableName
         * @returns {?GlideRecord} Found GlideRecord or null
         */
        getRecord: function (sysld, tableName) {
            var record = new GlideRecord(tableName);
            if (record.get(sysld)) {
                return record;
            } else {
                return null;
            }
        },
        /**
         * Checks to see if the provided GlideRecord is a new record through various mechanisms
         * @param {GlideRecord} glideRecord A GlideRecord that uses extension
         * @returns {GlideRecord} The extended GlideRecord
         */
        getExtendedGlideRecord: function (glideRecord) {
            if (glideRecord.getTableName() != glideRecord.getRecordClassName()) {
                var extended = new GlideRecord(glideRecord.getRecordClassName());
                extended.get(glideRecord.getUniqueValue());
                return extended;
            } else {
                return glideRecord;
            }
        },
        /**
         * Returns the sys_documentation label associated with a field. The
         * sys_documentation record contains the label, help, and hint information
         * for a field
         * @param {string} tableName
         * @param {string} fieldName
         * @returns {?Object.<string,string>}
         */
        getFieldLabel: function (tableName, fieldName) {
            var label = new GlideRecord('sys_documentation');
            label.addQuery('name', tableName);
            label.addQuery('element', fieldName);
            label.query();
            if (label.getRowCount() > 1) {
                throw 'Found more than one label for the field' + tableName + '.' + fieldName;
            }
            if (label.next()) {
                return globalGlideRecordUtils.glideRecordToMap(label);
            } else {
                return null;
            }
        },
        /**
         * Retrieves the true table name of a GlideRecord. In some situations an extended table will return
         * the parent table name instead of the child table name if GlideRecord.getTableName is used
         * @param {GlideRecord} glideRecord GlideRecord to retrieve true table name for
         */
        getTableName: function (glideRecord) {
            return (glideRecord.sys_class_name && !glideRecord.sys_class_name.nil()) ?
                glideRecord.getValue('sys_class_name') :
                glideRecord.getTableName();
        },
        /**
         * Returns whether or not a child table given by tableName extends an ancestor table given by superTableName
         * If the tableName and superTableName are the same will return true
         * @param {string} superTableName The name of an ancestor table to check if it has been extended
         * @param {string} tableName The name of a child table to see if it extends the ancestor
         * @returns {boolean}
         */
        extendsTable: function (superTableName, tableName) {
            if (superTableName == tableName) {
                return true;
            }
            //Maybe refactor this to use GlideTableHierarchy
            // var tableHierarchy = new GlideTableHierarchy(requestTableName);
            // var parentTables = tableHierarchy.getTables();
            var dbRecord = new GlideRecord('sys_db_object');
            if (dbRecord.get('name', tableName) && !dbRecord.super_class.nil()) {
                var superDbRecord = dbRecord.super_class.getRefRecord();
                var superTableNameCandidate = superDbRecord.getValue('name');
                if (superTableName == superTableNameCandidate) {
                    return true;
                } else {
                    return this.extendsTable(superTableName, superTableNameCandidate);
                }
            } else {
                return false;
            }
        },
        /**
         * Returns a list of all the field names for a table
         * @param {string} tableName Table name to retrieve fields
         * @returns {string[]}
         */
        getTableFieldNames: function (tableName) {
            return new GlideRecord(tableName).getElements().map(function (element) {
                return element.getName();
            });
        },
        /**
         * Takes the names of two tables and returns the fields in the extended table that are
         * not in the base table
         * @param {string} baseTable The base table name that has been extended
         * @param {string} extendedTable The extended table name that extends the base table
         * @returns {string[]} A list of field names that are in the extended table that are not in the base table
         */
        getOnlyExtendedFields: function (baseTable, extendedTable) {
            /**
             * Returns the list of field names for a glide record
             * @param {GlideRecord} glideRecord
             * @returns {string[]}
             */
            function getFields(glideRecord) {
                return glideRecord.getElements().map(function (/**@type{GlideElement}*/element) {
                    return element.getName();
                });
            }
            var baseGr = new GlideRecord(baseTable);
            var baseFields = getFields(baseGr);
            var extendedGr = new GlideRecord(extendedTable);
            var extendedFields = getFields(extendedGr);
            return new global.ArrayUtil().diff(extendedFields, baseFields);
        },
        /**
         * Returns the ServicePortal form URL
         * @param {GlideRecord} glideRecord Glide record to retrieve url
         * @param {string} portalUrl The base portal URL
         * @param {string} formPage The ServicePortal form page id to go to
         * @returns {string}
         */
        getRecordUrl: function (glideRecord, portalUrl, formPage) {
            return portalUrl + '?' +
                'id=' + formPage +
                '&table=' + glideRecord.getTableName() +
                '&sys_id=' + glideRecord.getUniqueValue() +
                '&view=sp';
        },
        /**
         * Returns HTML anchor link to the ServicePortal form
         * @param {GlideRecord} glideRecord GlideRecord to retrieve link
         * @param {string} portalUrl The base portal URL
         * @param {string} formPage The ServicePortal form page id to go to
         * @param {string} label Label for the link the user sees
         * @returns {string}
         */
        getRecordHtmllink: function (glideRecord, portalUrl, formPage, label) {
            return '<a href="' + this.getRecordUrl(glideRecord, portalUrl, formPage) + '">' + label + '</a>';
        }
    };
})();
//@ts-ignore
var x_912467_klf = x_912467_klf || {};

/**
 * Utility functions for sys_user_group
 */
x_912467_klf.GroupUtils = (function() {
    var glideRecordUtils = new global.KLF_GlideRecordUtils();

    class GroupUtils {


        /**
         * Returns true if the user is a member of any of the groups
         * @param {string} userSysId 
         * @param {string[]|string} groupSysIds sys_user_group.sys_id[] or concatenated string of sys_user_group.sys_id
         * @returns {boolean}
         */
        isMemberOfSomeGroup(userSysId, groupSysIds) {
            const groupMember = new GlideRecord('sys_user_grmember');
            groupMember.addQuery('user', userSysId);
            groupMember.addQuery('group', 'IN', groupSysIds);
            groupMember.query();
            return groupMember.hasNext();
        }

        /**
         * Returns the list of sys_user_group.sys_id for the user
         * @param {string} userSysId - The sys_user.sys_id
         * @returns {string[]} - The list of sys_user_group.sys_id
         */
        getGroupSysIdsForUser(userSysId) {
            const gr = new GlideRecord('sys_user_grmember');
            gr.addQuery('user', userSysId);
            gr.query();
            const groupSysIds = [];
            while (gr.next()) {
                groupSysIds.push(gr.group.toString());
            }
            return groupSysIds;
        }

        /**
         * Returns the sys_user_group record with the given name
         * @param {string} groupName - The name of the group to find
         * @returns {?GlideRecord} - The sys_user_group record
         */
        getGroupByName(groupName) {
            const group = new GlideRecord('sys_user_group');
            if (group.get('name', groupName)) {
                return group;
            } else {
                return null;
            }
        }


        /**
         * Returns true is the user is a member
         * of the sys_user_group
         * @param {string} groupSysId sys_user_group.sys_id
         * @param {string} userSysId sys_user.sys_id
         * @returns {boolean}
         */
        isMemberOf(groupSysId, userSysId) {
            const gr = new GlideRecord('sys_user_grmember');
            gr.addQuery('group', groupSysId);
            gr.addQuery('user', userSysId);
            gr.query();
            return gr.hasNext();
        }

        /**
         * Creates a new sys_user_group record
         * @param {string} groupName - The name of the group to create
         * @returns {GlideRecord} - The newly created sys_user_group record
         */
        createGroup(groupName) {
            return glideRecordUtils.insertRecord('sys_user_group', {
                name: groupName
            });
        }

        /**
         * Creates a new sys_user record
         * @param {string} userName - The name of the user to create
         * @returns {GlideRecord} 
         */
        createUser(userName) {
            return glideRecordUtils.insertRecord('sys_user', {
                user_name: userName,
                first_name: userName + 'first',
                last_name: userName + 'last',
                email: userName + '@example.com'
            });
        }

        /**
         * Adds a user to a group
         * @param {GlideRecord} user - The user to add to the group
         * @param {GlideRecord} group - The group to add the user to
         */
        addUserToGroup(user, group) {
            glideRecordUtils.insertRecord('sys_user_grmember', {
                user: user.getUniqueValue(),
                group: group.getUniqueValue()
            });
        }
    }

    return new GroupUtils();

})();
//@ts-ignore
var x_912467_klf = x_912467_klf || {};

x_912467_klf.ListMetric = (function() {
    // variables available
    // current: GlideRecord -  target incident
    // definition: GlideRecord -  (this row)
    /**
     * @param {string} instanceSysId 
     * @param {string} fieldName 
     * @returns {string[]}
     */
    function getSavedValues(instanceSysId, fieldName) {
        var mi = new GlideRecord('metric_instance');
        mi.addQuery('id', instanceSysId);
        mi.addQuery('field', fieldName);
        mi.query();
        var values = [];
        while (mi.next()) {
            values.push(mi.getValue('value'));
        }
        return values;
    }

    /**
     * @param {string} instanceSysId 
     * @param {string} fieldName 
     * @param {*} value 
     * @returns {boolean}
     */
    function exists(instanceSysId, fieldName, value) {
        var mi = new GlideRecord('metric_instance');
        mi.addQuery('id', instanceSysId);
        mi.addQuery('field', fieldName);
        mi.addQuery('value', value);
        mi.query();
        return mi.hasNext();
    }


    return {
        /**
         * @param {GlideRecord} glideRecord 
         * @param {GlideRecord} metricDefinition 
         */
        createMetric: function(glideRecord, metricDefinition) {
            var fieldName = metricDefinition.getValue('field');
            gs.debug('current operation: ' + glideRecord.operation());
            if (!glideRecord[fieldName].nil()) {
                var values = glideRecord.getValue(fieldName).split(',');
                var savedValues = getSavedValues(glideRecord.getUniqueValue(), fieldName);
                var removedValues = new global.ArrayUtil().diff(savedValues, values);
                values.forEach(function(value) {
                    if (!exists(glideRecord.getUniqueValue(), fieldName, value)) {
                        var mi = new global.MetricUtils().createMetricInstance(glideRecord, metricDefinition);
                        mi.value = value;
                        mi.update();
                    }
                });

                if (removedValues.length > 0) {
                    var mi = new GlideRecord('metric_instance');
                    mi.addQuery('id', glideRecord.getUniqueValue());
                    mi.addQuery('definition', metricDefinition.getUniqueValue());
                    mi.addQuery('value', 'IN', removedValues);
                    mi.deleteMultiple();
                }
            } else {
                var mi2 = new GlideRecord('metric_instance');
                mi2.addQuery('id', glideRecord.getUniqueValue());
                mi2.addQuery('definition', metricDefinition.getUniqueValue());
                mi2.query();
                while (mi2.next()) {
                    mi2.deleteRecord();
                }
            }
        }
    };

})();