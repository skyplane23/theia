/********************************************************************************
 * Copyright (C) 2020 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { inject, injectable } from 'inversify';
import { MessageService, MenuContribution, CommandContribution, MenuModelRegistry, CommandRegistry, Command, MenuPath } from '@theia/core/lib/common';
import { FrontendApplicationContribution, CommonMenus } from '@theia/core/lib/browser';
import { SampleUpdater, UpdateStatus } from '../../common/updater/sample-updater';

export namespace SampleUpdaterCommands {

    const category = 'Electron Updater Sample';

    export const CHECK_FOR_UPDATES: Command = {
        id: 'electron-sample:check-for-updates',
        label: 'Check for Updates...',
        category
    };

    export const RESTART_TO_UPDATE: Command = {
        id: 'electron-sample:restart-to-update',
        label: 'Restart to Update',
        category
    };

    // Mock
    export const MOCK_UPDATE_AVAILABLE: Command = {
        id: 'electron-sample:mock-update-available',
        label: 'Mock Update Available',
        category
    }

    export const MOCK_UPDATE_NOT_AVAILABLE: Command = {
        id: 'electron-sample:mock-update-not-available',
        label: 'Mock Update not Available',
        category
    }

}

export namespace SampleUpdaterMenu {
    export const SAMPLE_UPDATER_MENU_PATH: MenuPath = [...CommonMenus.FILE_SETTINGS_SUBMENU, '3_settings_submenu_update'];
}

@injectable()
export class SampleUpdaterFrontendContribution implements FrontendApplicationContribution, CommandContribution, MenuContribution {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(SampleUpdater)
    protected readonly sampleUpdater: SampleUpdater;

    protected readyToUpdate: false;

    onStart(): void {

    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(SampleUpdaterCommands.CHECK_FOR_UPDATES, {
            execute: async () => {
                const { status } = await this.sampleUpdater.checkForUpdates();
                switch (status) {
                    case UpdateStatus.Available: {
                        const answer = await this.messageService.info('Found updates, do you want update now?', 'No', 'Yes');
                        if (answer === 'Yes') {
                            this.sampleUpdater.onRestartToUpdateRequested();
                        }
                        break;
                    }
                    case UpdateStatus.NotAvailable: {
                        this.messageService.info('You’re all good', { timeout: 3000 });
                        break;
                    }
                    case UpdateStatus.InProgress: {
                        this.messageService.warn('Work in progress...', { timeout: 3000 });
                        break;
                    }
                    default: throw new Error(`Unexpected status: ${status}`);
                }
            },
            isEnabled: () => !this.readyToUpdate,
            isVisible: () => !this.readyToUpdate
        });
        registry.registerCommand(SampleUpdaterCommands.RESTART_TO_UPDATE, {
            execute: () => {

            },
            isEnabled: () => this.readyToUpdate,
            isVisible: () => this.readyToUpdate
        });
        registry.registerCommand(SampleUpdaterCommands.MOCK_UPDATE_AVAILABLE, {
            execute: () => this.sampleUpdater.setUpdateAvailable(true)
        });
        registry.registerCommand(SampleUpdaterCommands.MOCK_UPDATE_NOT_AVAILABLE, {
            execute: () => this.sampleUpdater.setUpdateAvailable(false)
        });
    }

    registerMenus(registry: MenuModelRegistry): void {
        registry.registerMenuAction(SampleUpdaterMenu.SAMPLE_UPDATER_MENU_PATH, {
            commandId: SampleUpdaterCommands.CHECK_FOR_UPDATES.id
        });
        registry.registerMenuAction(SampleUpdaterMenu.SAMPLE_UPDATER_MENU_PATH, {
            commandId: SampleUpdaterCommands.RESTART_TO_UPDATE.id
        });
    }

}
