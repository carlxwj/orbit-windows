using System;
using System.Runtime.InteropServices;
using System.Text;

namespace OrbitBridge {
  public static class Wifi {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct WifiInterface {
      public Guid guid; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string description; public uint state;
    }
    [StructLayout(LayoutKind.Sequential)] struct Ssid { public uint length; [MarshalAs(UnmanagedType.ByValArray, SizeConst = 32)] public byte[] data; }
    [StructLayout(LayoutKind.Sequential)] struct Association {
      public Ssid ssid; public uint bss; [MarshalAs(UnmanagedType.ByValArray, SizeConst = 6)] public byte[] mac;
      public uint phy, phyIndex, signal, rx, tx;
    }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Attributes {
      public uint state, mode; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 256)] public string profile; public Association association;
    }
    [DllImport("wlanapi.dll")] static extern uint WlanOpenHandle(uint version, IntPtr reserved, out uint negotiated, out IntPtr handle);
    [DllImport("wlanapi.dll")] static extern uint WlanEnumInterfaces(IntPtr handle, IntPtr reserved, out IntPtr list);
    [DllImport("wlanapi.dll")] static extern uint WlanQueryInterface(IntPtr handle, ref Guid guid, uint opcode, IntPtr reserved, out uint size, out IntPtr data, out uint type);
    [DllImport("wlanapi.dll")] static extern void WlanFreeMemory(IntPtr memory);
    [DllImport("wlanapi.dll")] static extern uint WlanCloseHandle(IntPtr handle, IntPtr reserved);
    public static object Read() {
      uint version; IntPtr handle;
      if (WlanOpenHandle(2, IntPtr.Zero, out version, out handle) != 0) return null;
      try {
        IntPtr list; if (WlanEnumInterfaces(handle, IntPtr.Zero, out list) != 0) return null;
        try {
          int count = Marshal.ReadInt32(list); int stride = Marshal.SizeOf(typeof(WifiInterface));
          for (int i = 0; i < count; i++) {
            var iface = (WifiInterface)Marshal.PtrToStructure(IntPtr.Add(list, 8 + i * stride), typeof(WifiInterface));
            if (iface.state != 1) continue; uint size, type; IntPtr data;
            uint code = WlanQueryInterface(handle, ref iface.guid, 7, IntPtr.Zero, out size, out data, out type);
            if (code == 5) throw new UnauthorizedAccessException();
            if (code != 0) continue;
            try {
              var value = (Attributes)Marshal.PtrToStructure(data, typeof(Attributes));
              return new { ssid = Encoding.UTF8.GetString(value.association.ssid.data, 0, (int)Math.Min(32, value.association.ssid.length)), signal = value.association.signal, rx = value.association.rx * 1000.0, tx = value.association.tx * 1000.0, band = "Non disponible" };
            } finally { WlanFreeMemory(data); }
          }
          return null;
        } finally { WlanFreeMemory(list); }
      } finally { WlanCloseHandle(handle, IntPtr.Zero); }
    }
  }
}
