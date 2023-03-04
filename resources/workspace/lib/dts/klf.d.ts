declare namespace x_912467_klf {
    namespace CalendarCreator {
        const fiscalQuarterCalendarName: string;
        function getCalendarByName(calendarName: string): GlideRecord;
        function getQuarterSpanName(quarterName: string, year: number): GlideRecord;
        function getQuarterDateRange(quarterName: string, year: number): [string, string];
        function createQuarter(quarterName: string, year: number): GlideRecord;
        function createFiscalYearByQuarters(year: number): [GlideRecord, GlideRecord, GlideRecord, GlideRecord];
        function createFiscalQuarterEntries(startYear: number, endYear: number): void;
        function createFiscalQuarterNameEntries(startYear: number, endYear: number): void;
        function createFiscalQuartersNameEntriesByYear(year: number): [GlideRecord, GlideRecord, GlideRecord, GlideRecord];
        function getFiscalQuarterSpanNameShortName(quarter: string, year: number): string;
        function createFiscalQuarterName(quarter: string, year: number): any;
        const fiscalYearCalendarName: string;
        function getYearDateRange(year: number): [string, string];
        function getYearSpanName(year: number): GlideRecord;
        function createYear(year: number): GlideRecord;
        function createFiscalYearEntries(startYear: number, endYear: number): void;
        function createFiscalYearNameEntries(startYear: number, endYear: number): void;
        function createFiscalYearName(year: number): GlideRecord;
    }
    namespace DateUtils {
        function getFiscalYear(glideDateTime: GlideDateTime): number;
        function getCurrentFiscalYear(): number;
        function getFiscalYearStartDate(yearsAgo?: number): GlideDate;
        function getCurrentYear(): number;
        function addBusinessDaysToDate(startDate: GlideDate, days: number, scheduleSysId?: string): GlideDate;
        function addBusinessDays(days: number, scheduleSysId?: string): GlideDate;
        function subtractBusinessDaysToDate(startDate: GlideDate, days: number, scheduleSysId?: string): GlideDate;
        function nowDate(): GlideDate;
        function addDays(days: number): GlideDate;
    }
    namespace GlideRecordUtils {
        function getRecord(sysld: string, tableName: string): GlideRecord;
        function getExtendedGlideRecord(glideRecord: GlideRecord): GlideRecord;
        function getFieldLabel(tableName: string, fieldName: string): {
            [x: string]: string;
        };
        function getTableName(glideRecord: GlideRecord): any;
        function extendsTable(superTableName: string, tableName: string): boolean;
        function getTableFieldNames(tableName: string): string[];
        function getOnlyExtendedFields(baseTable: string, extendedTable: string): string[];
        function getRecordUrl(glideRecord: GlideRecord, portalUrl: string, formPage: string): string;
        function getRecordHtmllink(glideRecord: GlideRecord, portalUrl: string, formPage: string, label: string): string;
    }
    const GroupUtils: {
        /**
         * Returns true if the user is a member of any of the groups
         * @param {string} userSysId
         * @param {string[]|string} groupSysIds sys_user_group.sys_id[] or concatenated string of sys_user_group.sys_id
         * @returns {boolean}
         */
        isMemberOfSomeGroup(userSysId: string, groupSysIds: string | string[]): boolean;
        /**
         * Returns the list of sys_user_group.sys_id for the user
         * @param {string} userSysId - The sys_user.sys_id
         * @returns {string[]} - The list of sys_user_group.sys_id
         */
        getGroupSysIdsForUser(userSysId: string): string[];
        /**
         * Returns the sys_user_group record with the given name
         * @param {string} groupName - The name of the group to find
         * @returns {?GlideRecord} - The sys_user_group record
         */
        getGroupByName(groupName: string): GlideRecord;
        /**
         * Returns true is the user is a member
         * of the sys_user_group
         * @param {string} groupSysId sys_user_group.sys_id
         * @param {string} userSysId sys_user.sys_id
         * @returns {boolean}
         */
        isMemberOf(groupSysId: string, userSysId: string): boolean;
        /**
         * Creates a new sys_user_group record
         * @param {string} groupName - The name of the group to create
         * @returns {GlideRecord} - The newly created sys_user_group record
         */
        createGroup(groupName: string): GlideRecord;
        /**
         * Creates a new sys_user record
         * @param {string} userName - The name of the user to create
         * @returns {GlideRecord}
         */
        createUser(userName: string): GlideRecord;
        /**
         * Adds a user to a group
         * @param {GlideRecord} user - The user to add to the group
         * @param {GlideRecord} group - The group to add the user to
         */
        addUserToGroup(user: GlideRecord, group: GlideRecord): void;
    };
    namespace ListMetric {
        export { createMetric };
    }
}
/**
 * @param {GlideRecord} glideRecord
 * @param {GlideRecord} metricDefinition
 */
declare function createMetric(glideRecord: GlideRecord, metricDefinition: GlideRecord): void;
