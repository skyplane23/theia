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

import { remote, Menu, BrowserWindow } from 'electron';
import { inject, injectable, postConstruct } from 'inversify';
import { isOSX } from '@theia/core/lib/common/os';
import { CommonMenus } from '@theia/core/lib/browser';
import {
    Emitter,
    Command,
    MenuPath,
    MessageService,
    MenuModelRegistry,
    MenuContribution,
    CommandRegistry,
    CommandContribution
} from '@theia/core/lib/common';
import { SampleUpdater, UpdateStatus, SampleUpdaterClient } from '../../common/updater/sample-updater';
import { ElectronMainMenuFactory } from '@theia/core/lib/electron-browser/menu/electron-main-menu-factory';

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
        label: 'Mock - Available',
        category
    };

    export const MOCK_UPDATE_NOT_AVAILABLE: Command = {
        id: 'electron-sample:mock-update-not-available',
        label: 'Mock - Not Available',
        category
    };

}

export namespace SampleUpdaterMenu {
    export const MENU_PATH: MenuPath = [...CommonMenus.FILE_SETTINGS_SUBMENU, '3_settings_submenu_update'];
}

@injectable()
export class SampleUpdaterClientImpl implements SampleUpdaterClient {

    protected readonly onReadyToInstallEmitter = new Emitter<void>();
    readonly onReadyToInstall = this.onReadyToInstallEmitter.event;

    notifyReadyToInstall(): void {
        this.onReadyToInstallEmitter.fire();
    }

}

@injectable()
export class ElectronMenuUpdater {

    @inject(ElectronMainMenuFactory)
    protected readonly factory: ElectronMainMenuFactory;

    public update(): void {
        this.setMenu();
    }

    private setMenu(
        menu: Menu = this.factory.createMenuBar(),
        electronWindow: BrowserWindow = remote.getCurrentWindow()): void {
        if (isOSX) {
            remote.Menu.setApplicationMenu(menu);
        } else {
            // Unix/Windows: Set the per-window menus
            electronWindow.setMenu(menu);
        }
    }

}

@injectable()
export class SampleUpdaterFrontendContribution implements CommandContribution, MenuContribution {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(SampleUpdater)
    protected readonly updater: SampleUpdater;

    @inject(SampleUpdaterClientImpl)
    protected readonly updaterClient: SampleUpdaterClientImpl;

    @inject(ElectronMenuUpdater)
    protected readonly menuUpdater: ElectronMenuUpdater;

    protected readyToUpdate = false;

    @postConstruct()
    protected init(): void {
        this.updaterClient.onReadyToInstall(async () => {
            this.readyToUpdate = true;
            this.menuUpdater.update();
            const answer = await this.messageService.info('Found updates, do you want update now?', 'No', 'Yes');
            if (answer === 'Yes') {
                this.updater.onRestartToUpdateRequested();
            }
        });
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(SampleUpdaterCommands.CHECK_FOR_UPDATES, {
            execute: async () => {
                const { status } = await this.updater.checkForUpdates();
                switch (status) {
                    case UpdateStatus.Available: {
                        const answer = await this.messageService.info('Found updates, do you want update now?', 'No', 'Yes');
                        if (answer === 'Yes') {
                            this.updater.onRestartToUpdateRequested();
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
            execute: () => this.updater.setUpdateAvailable(true)
        });
        registry.registerCommand(SampleUpdaterCommands.MOCK_UPDATE_NOT_AVAILABLE, {
            execute: () => this.updater.setUpdateAvailable(false)
        });
    }

    registerMenus(registry: MenuModelRegistry): void {
        registry.registerMenuAction(SampleUpdaterMenu.MENU_PATH, {
            commandId: SampleUpdaterCommands.CHECK_FOR_UPDATES.id
        });
        registry.registerMenuAction(SampleUpdaterMenu.MENU_PATH, {
            commandId: SampleUpdaterCommands.RESTART_TO_UPDATE.id
        });
    }

}
