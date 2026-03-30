
import { MedicalDevice } from '../types';

// Define WebUSB types for TS if not present
export interface USBDevice {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  productName?: string;
  opened: boolean;
  configuration: any;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<{ data?: DataView }>;
}

export class USBService {
  static isSupported(): boolean {
    return 'usb' in navigator;
  }

  static async requestDevice(): Promise<USBDevice | null> {
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      return device;
    } catch (error) {
      console.error('USB Device request failed:', error);
      return null;
    }
  }

  static async getPairedDevices(): Promise<USBDevice[]> {
    if (!this.isSupported()) return [];
    try {
      return await (navigator as any).usb.getDevices();
    } catch (error) {
      console.error('Failed to get paired USB devices:', error);
      return [];
    }
  }

  static mapUSBDeviceToMedicalDevice(device: USBDevice): MedicalDevice {
    const name = device.productName || `Dispositivo USB (${device.vendorId})`;
    const isQuantum = name.toLowerCase().includes('quantum') || 
                      name.toLowerCase().includes('resonance') ||
                      (device.vendorId === 0x1A86 && device.productId === 0x7523); // Common CH340 serial chip

    return {
      id: `${device.vendorId}-${device.productId}-${device.serialNumber || 'no-serial'}`,
      name: isQuantum ? 'Quantum Resonance Magnetic Analyzer' : name,
      type: 'usb',
      status: 'connected',
      isQuantum: isQuantum
    };
  }

  static async connect(device: USBDevice): Promise<boolean> {
    try {
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
      return true;
    } catch (error) {
      console.error('Failed to connect to USB device:', error);
      return false;
    }
  }

  static async readData(device: USBDevice): Promise<DataView | null> {
    try {
      const result = await device.transferIn(1, 64);
      return result.data || null;
    } catch (error) {
      console.error('Failed to read from USB device:', error);
      return null;
    }
  }
}
