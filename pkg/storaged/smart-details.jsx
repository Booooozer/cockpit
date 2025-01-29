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
    success: _("Successful"),
    aborted: _("Aborted"),
    interrupted: _("Interrupted"),
    fatal: _("Did not complete"),
    error_unknown: _("Failed (Unknown)"),
    error_electrical: _("Failed (Electrical)"),
    error_servo: _("Failed (Servo)"),
    error_read: _("Failed (Read)"),
    error_handling: _("Failed (Damaged)"),
    inprogress: _("In progress"),
};

const SmartActions = ({ drive_ata }) => {
    const [isKebabOpen, setKebabOpen] = useState(false);
    const smartSelftestStatus = drive_ata.SmartSelftestStatus;

    const runSmartTest = async (type) => {
        await drive_ata.SmartSelftestStart(type, {});
    };

    const abortSmartTest = async () => {
        await drive_ata.SmartSelftestAbort({});
    };

    const actions = [
        <DropdownItem key="smart-short-test"
                      isDisabled={smartSelftestStatus === "inprogress"}
                      onClick={() => { setKebabOpen(false); runSmartTest('short') }}>
            {_("Run short test")}
        </DropdownItem>,
        <DropdownItem key="smart-extended-test"
                      isDisabled={smartSelftestStatus === "inprogress"}
                      onClick={() => { setKebabOpen(false); runSmartTest('extended') }}>
            {_("Run extended test")}
        </DropdownItem>,
        <DropdownItem key="smart-conveyance-test"
                      isDisabled={smartSelftestStatus === "inprogress"}
                      onClick={() => { setKebabOpen(false); runSmartTest('conveyance') }}>
            {_("Run conveyance test")}
        </DropdownItem>,
    ];

    if (drive_ata.SmartSelftestStatus === "inprogress") {
        actions.push(
            <DropdownItem key="abort-smart-test"
                          onClick={() => { setKebabOpen(false); abortSmartTest() }}>
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

export const SmartCard = ({ card, drive_ata }) => {
    return (
        <StorageCard card={card} actions={<SmartActions drive_ata={drive_ata} />}>
            <CardBody>
                <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
                    <StorageDescription title={_("Power on hours")}
                        value={cockpit.format(_("$0 hours"), Math.round(drive_ata.SmartPowerOnSeconds / 3600))}
                    />
                    <StorageDescription title={_("Last updated")}
                        value={timeformat.dateTime(new Date(drive_ata.SmartUpdated * 1000))}
                    />
                    <StorageDescription title={_("Smart selftest status")}
                        value={selftestStatusDescription[drive_ata.SmartSelftestStatus]}
                    />
                    <StorageDescription title={_("Number of bad sectors")}
                        value={drive_ata.SmartNumBadSectors + " " + _("sectors")}
                    />
                    <StorageDescription title={_("Atributes failing")}
                        value={drive_ata.SmartNumAttributesFailing + " " + _("attributes")}
                    />
                </DescriptionList>
            </CardBody>
        </StorageCard>
    );
};
