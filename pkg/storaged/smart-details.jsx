/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from "cockpit";
import React, { useState } from "react";
import * as timeformat from "timeformat.js";

import { CardBody } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import { DescriptionList } from "@patternfly/react-core/dist/esm/components/DescriptionList/index.js";
import { Flex } from "@patternfly/react-core/dist/esm/layouts/Flex/index.js";
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core/dist/esm/deprecated/components/Dropdown/index.js';

import { format_temperature } from "./utils.js";
import { StorageCard, StorageDescription } from "./pages.jsx";

const _ = cockpit.gettext;

const selftestStatusDescription = {
    // Shared values
    success: _("Successful"),
    aborted: _("Aborted"),
    inprogress: _("In progress"),

    // SATA special values
    interrupted: _("Interrupted"),
    fatal: _("Did not complete"),
    error_unknown: _("Failed (Unknown)"),
    error_electrical: _("Failed (Electrical)"),
    error_servo: _("Failed (Servo)"),
    error_read: _("Failed (Read)"),
    error_handling: _("Failed (Damaged)"),

    // NVMe special values
    ctrl_reset: _("Aborted by a Controller Level Reset"),
    ns_removed: _("Aborted due to a removal of a namespace from the namespace inventory"),
    aborted_format: _("Aborted due to the processing of a Format NVM command"),
    fatal_error: _("A fatal error or unknown test error occurred while the controller was executing the device self-test operation and the operation did not complete"),
    unknown_seg_fail: _("Completed with a segment that failed and the segment that failed is not known"),
    known_seg_fail: _("Completed with one or more failed segments"),
    aborted_unknown: _("Aborted for unknown reason"),
    aborted_sanitize: _("Aborted due to a sanitize operation"),
};

// TODO: UX to show what is wrong with the nvme
// .SmartCriticalWarning contains an array of values which say what is wrong with the disk
// empty if disk OK
// https://storaged.org/doc/udisks2-api/latest/gdbus-org.freedesktop.UDisks2.NVMe.Controller.html#gdbus-property-org-freedesktop-UDisks2-NVMe-Controller.SmartCriticalWarning
const nvmeCriticalWarning = {
    spare: _("Spare capacity is bellow the treshold"),
    temperature: _("Temperature outside of recommended thresholds"),
    degraded: _("Degraded"),
    readonly: _("All media is in read-only mode"),
    volatile_mem: _("Volatile memory backup failed"),
    pmr_readonly: _("Persistent memory has become read-only")
};

const SmartActions = ({ drive_ata }) => {
    const [isKebabOpen, setKebabOpen] = useState(false);
    const smartSelftestStatus = drive_ata.SmartSelftestStatus;

    const runSelfTest = (type) => {
        drive_ata.SmartSelftestStart(type, {});
    };

    const abortSelfTest = () => {
        drive_ata.SmartSelftestAbort({});
    };

    const actions = [
        <DropdownItem key="smart-short-test"
                      isDisabled={smartSelftestStatus === "inprogress"}
                      onClick={() => { setKebabOpen(false); runSelfTest('short') }}>
            {_("Run short test")}
        </DropdownItem>,
        <DropdownItem key="smart-extended-test"
                      isDisabled={smartSelftestStatus === "inprogress"}
                      onClick={() => { setKebabOpen(false); runSelfTest('extended') }}>
            {_("Run extended test")}
        </DropdownItem>,
        <DropdownItem key="abort-smart-test"
                      isDisabled={smartSelftestStatus !== "inprogress"}
                      onClick={() => { setKebabOpen(false); abortSelfTest() }}>
            {_("Abort test")}
        </DropdownItem>,
    ];

    return (
        <Dropdown toggle={<KebabToggle onToggle={(_, isOpen) => setKebabOpen(isOpen)} />}
                isPlain
                isOpen={isKebabOpen}
                position="right"
                id="smart-actions"
                dropdownItems={actions}
        />
    );
};

export const SmartCard = ({ card, drive_ata, drive_type }) => {
    const powerOnHours = (drive_type === "hdd")
        ? Math.round(drive_ata.SmartPowerOnSeconds / 3600)
        : drive_ata.SmartPowerOnHours;

    const smartOK = (drive_type === "hdd" && !drive_ata.SmartFailing) || (drive_type === "ssd" && drive_ata.SmartCriticalWarning.length === 0);
    const assesment = (
        <StorageDescription title={_("Assessment")}>
            <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                { drive_type === "hdd" && !smartOK &&
                    <span className="cockpit-disk-failing">{_("Disk is failing")}</span>
                }
                { drive_type === "ssd" && !smartOK &&
                    (<span className="cockpit-disk-failing">
                        {_("Disk is failing") + ": " + drive_ata.SmartCriticalWarning.map(reason => nvmeCriticalWarning[reason]).join(", ")}
                    </span>)
                }
                { smartOK &&
                    <span>{_("Disk is OK")}</span>
                }
                { drive_ata.SmartTemperature > 0
                    ? <span>({format_temperature(drive_ata.SmartTemperature)})</span>
                    : null
                }
            </Flex>
        </StorageDescription>
    );

    return (
        <StorageCard card={card} actions={<SmartActions drive_ata={drive_ata} />}>
            <CardBody>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
                    { assesment }
                    <StorageDescription title={_("Power on hours")}
                        value={cockpit.format(_("$0 hours"), powerOnHours)}
                    />
                    <StorageDescription title={_("Selftest status")}
                        value={selftestStatusDescription[drive_ata.SmartSelftestStatus]}
                    />
                    {drive_ata.SmartSelftestStatus === "inprogress" && drive_ata.SmartSelftestPercentRemaining !== -1 &&
                        <StorageDescription title={_("Progress")}
                            value={(100 - drive_ata.SmartSelftestPercentRemaining) + "%"}
                        />
                    }
                    <StorageDescription title={_("Last update")}
                        value={timeformat.dateTime(new Date(drive_ata.SmartUpdated * 1000))}
                    />
                    {drive_type === "hdd" &&
                        <StorageDescription title={_("Number of bad sectors")}
                            value={drive_ata.SmartNumBadSectors}
                        />
                    }
                    {drive_type === "hdd" &&
                        <StorageDescription title={_("Attributes failing")}
                            value={drive_ata.SmartNumAttributesFailing}
                        />
                    }
                </DescriptionList>
            </CardBody>
        </StorageCard>
    );
};
