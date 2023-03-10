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
 * @param {Object} [config] A configuration object
 * @param {boolean} [config.includeNestedGroups=false] Includes the members of any nested groups in resolved groups.
 * Otherwise only the top level members .will be included
 * @param {string} [config.ldapServerName=LDAP] The ldap server name of the LDAP server to query against. Will be set to
 * LDAP by default if isActiveDirectoryGroups is false, LDAP-AD otherwise
 * @param {boolean} [config.isActiveDirectoryGroups=false] Configures searches to run against active directory
 * @param {string} [config.ingestTypeName=SNB_LDAP_GROUP] The sys_user_group_type that is added to a new group that is ingested by this class.
 * This will be set to SNB_LDAP_GROUP if isActiveDirectoryGroups is false, SNB_LDAP_AD otherwise
 * @param {string} [config.searchRdn=ou=Groups] The rdn to limit searches of the directory to. For LDAP groups
 * this defaults to ou=Groups. Empty string is default for AD
 * @param {string} [config.logSource=KLF_LdapGroupService] The source to add to log messages generated by this class. By default
 * KLF_LdapGroupService
 */
function KLF_LdapGroupService(config) {
    config = config || {};
    this.includeNestedGroups = config.includeNestedGroups || false;
    this.isActiveDirectoryGroups = config.isActiveDirectoryGroups || false;
    this.logSource = config.logSource || 'KLF_LdapGroupService';
    var defaultLdapServerName = this.isActiveDirectoryGroups ? 'LDAP-AD' : 'LDAP';
    this.ldapServerSysId = this._getLdapServerSysIdByName(config.ldapServerName || defaultLdapServerName);
    this.processedGroups = [];
    var defaultingestTypeName = this.isActiveDirectoryGroups ?
        this.getDefaultAdGroupTypeName() : this.getDefaultLdapGroupTypeName();
    this.ingestTypeName = config.ingestTypeName || defaultingestTypeName;
    var defaultSearchRdn = this.isActiveDirectoryGroups ? '' : 'ou=Groups~';
    this.searchRdn = config.searchRdn || defaultSearchRdn;
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
        return 'SNB LDAP GROUP';
    },
    /**
     * @returns {string} The default sys_user_group_type name for an AD group
     */
    getDefaultAdGroupTypeName: function() {
        return 'SNB_AD_GROUP';
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
     * @returns {Activity[]} A list of activities that can be displayed in the "Ticket Conversations" widget
     */
    getActivityEntries: function(history) {
        var tableName = 'x_lib_library_loan';
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