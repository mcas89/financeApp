import { logger } from './logger.js';
import { EVENTS } from '../config/constants.js';
import { eventBus } from './eventBus.js';

class DeviceManager {
    constructor() {
        this.currentDevice = this._detectDevice();
        
        window.addEventListener('resize', () => {
            const newDevice = this._detectDevice();
            if (newDevice !== this.currentDevice) {
                this.currentDevice = newDevice;
                logger.info(`Device changed to: ${this.currentDevice}`);
                eventBus.emit(EVENTS.DEVICE_TYPE_CHANGED, this.currentDevice);
            }
        });
    }

    _detectDevice() {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    }

    isMobile() { return this.currentDevice === 'mobile'; }
    isTablet() { return this.currentDevice === 'tablet'; }
    isDesktop() { return this.currentDevice === 'desktop'; }
    getDevice() { return this.currentDevice; }
}

export const deviceManager = new DeviceManager();
