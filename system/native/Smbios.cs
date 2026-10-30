using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;

namespace OrbitBridge {
  // Read-only firmware fallback when WMI is restricted. Serial fields are deliberately skipped.
  public static class Smbios {
    [DllImport("kernel32.dll", SetLastError = true)] static extern uint GetSystemFirmwareTable(uint provider, uint table, byte[] data, uint size);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetLogicalProcessorInformationEx(int relationship, IntPtr data, ref uint size);
    static string Str(byte[] table, int start, byte index, int end) {
      if (index == 0) return ""; int n = 1;
      while (start < end) {
        int stop = start; while (stop < end && table[stop] != 0) stop++;
        if (n == index) return Encoding.UTF8.GetString(table, start, stop - start).Trim();
        start = stop + 1; n++;
      }
      return "";
    }
    static int? Cores() {
      uint size = 0; GetLogicalProcessorInformationEx(0, IntPtr.Zero, ref size);
      if (size == 0 || size > 1048576) return null;
      IntPtr buffer = Marshal.AllocHGlobal((int)size);
      try {
        if (!GetLogicalProcessorInformationEx(0, buffer, ref size)) return null;
        int count = 0;
        for (int offset = 0; offset + 8 <= size; ) {
          int relation = Marshal.ReadInt32(buffer, offset), length = Marshal.ReadInt32(buffer, offset + 4);
          if (length < 8 || offset + length > size) break;
          if (relation == 0) count++; offset += length;
        }
        return count > 0 ? (int?)count : null;
      } finally { Marshal.FreeHGlobal(buffer); }
    }
    public static object Read() {
      var memory = new List<object>();
      var cpu = new Dictionary<string, object>(); var board = new Dictionary<string, object>(); var bios = new Dictionary<string, object>(); var os = new Dictionary<string, object>();
      using (var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\CentralProcessor\0")) if (key != null) {
        cpu["Name"] = key.GetValue("ProcessorNameString"); cpu["Manufacturer"] = key.GetValue("VendorIdentifier");
      }
      cpu["NumberOfCores"] = Cores(); cpu["Source"] = "Win32 topology / registre CPU";
      using (var key = Registry.LocalMachine.OpenSubKey(@"HARDWARE\DESCRIPTION\System\BIOS")) if (key != null) {
        board["Manufacturer"] = key.GetValue("BaseBoardManufacturer"); board["Product"] = key.GetValue("BaseBoardProduct"); board["Version"] = key.GetValue("BaseBoardVersion");
        object version = key.GetValue("BIOSVersion"); bios["SMBIOSBIOSVersion"] = version is string[] ? String.Join(" · ", (string[])version) : version;
        bios["ReleaseDate"] = key.GetValue("BIOSReleaseDate");
      }
      using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion")) if (key != null) {
        string product = Convert.ToString(key.GetValue("ProductName")); int build;
        if (Int32.TryParse(Convert.ToString(key.GetValue("CurrentBuildNumber")), out build) && build >= 22000) product = product.Replace("Windows 10", "Windows 11");
        os["Caption"] = product + " " + Convert.ToString(key.GetValue("DisplayVersion")); os["BuildNumber"] = Convert.ToString(key.GetValue("CurrentBuildNumber")) + "." + Convert.ToString(key.GetValue("UBR"));
      }
      uint length = GetSystemFirmwareTable(0x52534d42, 0, null, 0);
      if (length >= 8 && length <= 4194304) {
        byte[] table = new byte[length];
        if (GetSystemFirmwareTable(0x52534d42, 0, table, length) == length) {
          for (int start = 8; start + 4 <= table.Length; ) {
            int type = table[start], size = table[start + 1]; if (size < 4 || start + size > table.Length) break;
            int end = start + size;
            while (end + 1 < table.Length && (table[end] != 0 || table[end + 1] != 0)) end++;
            if (end + 1 >= table.Length) break;
            if (type == 17 && size >= 27) {
              ushort field = BitConverter.ToUInt16(table, start + 12); ulong capacity = 0;
              if (field == 0x7fff && size >= 32) capacity = (ulong)(BitConverter.ToUInt32(table, start + 28) & 0x7fffffff) * 1024 * 1024;
              else if (field != 0xffff) capacity = (ulong)(field & 0x7fff) * ((field & 0x8000) != 0 ? 1024UL : 1024UL * 1024);
              if (capacity > 0) {
                uint speed = size >= 23 ? (uint)BitConverter.ToUInt16(table, start + 21) : 0u;
                uint configured = size >= 34 ? (uint)BitConverter.ToUInt16(table, start + 32) : 0u;
                if (speed == 65535 && size >= 88) speed = BitConverter.ToUInt32(table, start + 84);
                if (configured == 65535 && size >= 92) configured = BitConverter.ToUInt32(table, start + 88);
                memory.Add(new { DeviceLocator = Str(table, start + size, table[start + 16], end), Capacity = capacity,
                  Manufacturer = Str(table, start + size, table[start + 23], end), PartNumber = Str(table, start + size, table[start + 26], end),
                  SMBIOSMemoryType = table[start + 18], Speed = speed == 0 ? null : (object)speed,
                  ConfiguredClockSpeed = configured == 0 ? null : (object)configured, Source = "SMBIOS GetSystemFirmwareTable" });
              }
            }
            if (type == 127) break; start = end + 2;
          }
        }
      }
      return new { cpu = cpu, board = board, bios = bios, os = os, memory = memory };
    }
  }
}
