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

import { CardBody, DescriptionList, } from "@patternfly/react-core";
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core/dist/esm/deprecated/components/Dropdown/index.js';
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

const SmartActions = ({ drive_ata, disk_type }) => {
    const [isKebabOpen, setKebabOpen] = useState(false);
    const smartSelftestStatus = drive_ata.SmartSelftestStatus;

    const runSelfTest = (type) => {
        drive_ata.SmartSelftestStart(type, {});
    };

    const abortSelfTest = () => {
        drive_ata.SmartSelftestAbort({});
    };

    // TODO:
    // hdd also has offline test type
    // ssd has vendor-specific test type
    // - investigate what these are
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
    ];
    if (disk_type === "hdd"){
        actions.push(
            <DropdownItem key="smart-conveyance-test"
                          isDisabled={smartSelftestStatus === "inprogress"}
                          onClick={() => { setKebabOpen(false); runSelfTest('conveyance') }}>
                {_("Run conveyance test")}
            </DropdownItem>,
        );
    }

    if (drive_ata.SmartSelftestStatus === "inprogress") {
        actions.push(
            <DropdownItem key="abort-smart-test"
                          onClick={() => { setKebabOpen(false); abortSelfTest() }}>
                {_("Abort test")}
            </DropdownItem>,
        );
    }

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
    // diffs:
    // ssd
    // smartInfo.powerOnHours = drive_ata.SmartPowerOnHours;
    // hdd
    // smartInfo.powerOnHours = Math.round(drive_ata.SmartPowerOnSeconds / 3600);
    //
    // hdd only params
    // smartInfo.numBadSectors = drive_ata.SmartNumBadSectors;
    // smartInfo.numAttrFailing = drive_ata.SmartNumAttributesFailing;

    const powerOnHours = (drive_type === "hdd")
        ? Math.round(drive_ata.SmartPowerOnSeconds / 3600)
        : drive_ata.SmartPowerOnHours;

    return (
        <StorageCard card={card} actions={<SmartActions drive_ata={drive_ata} />}>
            <CardBody>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
                    <StorageDescription title={_("Power on hours")}
                        value={cockpit.format(_("$0 hours"), powerOnHours)}
                    />
                    <StorageDescription title={_("Last update")}
                        value={timeformat.dateTime(new Date(drive_ata.SmartUpdated * 1000))}
                    />
                    <StorageDescription title={_("Selftest status")}
                        value={selftestStatusDescription[drive_ata.SmartSelftestStatus]}
                    />
                    {drive_ata.SmartSelftestPercentRemaining !== -1 && 
                        <StorageDescription title={_("Progress")}
                            value={(100 - drive_ata.SmartSelftestPercentRemaining) + "%"}
                        />
                    }
                    {drive_type === "hdd" &&
                        <StorageDescription title={_("Number of bad sectors")}
                            value={drive_ata.SmartNumBadSectors + " " + (drive_ata.SmartNumBadSectors > 1 ? _("sectors") : _("sector"))}
                        />
                    }
                    {drive_type === "hdd" &&
                        <StorageDescription title={_("Atributes failing")}
                            value={drive_ata.SmartNumAttributesFailing + " " + (drive_ata.SmartNumAttributesFailing > 1 ? _("attributes") : _("attribute"))}
                        />
                    }
                </DescriptionList>
            </CardBody>
        </StorageCard>
    );
};
