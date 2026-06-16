'use client';

import { useState } from 'react';

type DeviceSize = {
  name: string;
  width: number;
  height: number;
};

const devices: DeviceSize[] = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 800 },
];

/**
 * Developer tool for previewing component at different device sizes
 * Usage: Wrap your component with <DevicePreview>
 */
export function DevicePreview({ children }: { children: React.ReactNode }) {
  const [selectedDevice, setSelectedDevice] = useState(devices[0]);

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mb-4 flex gap-2 flex-wrap">
        {devices.map((device) => (
          <button
            key={device.name}
            onClick={() => setSelectedDevice(device)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDevice.name === device.name
                ? 'bg-primary-600 text-white'
                : 'bg-white text-slate-700 hover:bg-primary-50'
            }`}
          >
            {device.name}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <div
          className="bg-white shadow-2xl rounded-lg overflow-auto"
          style={{
            width: `${selectedDevice.width}px`,
            height: `${selectedDevice.height}px`,
          }}
        >
          {children}
        </div>
      </div>

      <p className="text-center mt-4 text-sm text-slate-600">
        {selectedDevice.name}: {selectedDevice.width}x{selectedDevice.height}px
      </p>
    </div>
  );
}
