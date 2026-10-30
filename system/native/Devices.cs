using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32.SafeHandles;
using Microsoft.Win32;

namespace OrbitBridge {
  public static class Devices {
    [StructLayout(LayoutKind.Sequential)] struct DevInfo { public int size; public Guid classGuid; public uint devInst; public IntPtr reserved; }
    [StructLayout(LayoutKind.Sequential)] struct DevPropKey { public Guid guid; public uint pid; }
    [StructLayout(LayoutKind.Sequential)] struct InterfaceData { public int size; public Guid guid; public uint flags; public IntPtr reserved; }
    [StructLayout(LayoutKind.Sequential)] struct HidCaps {
      public ushort usage, page, inputLength, outputLength, featureLength;
      [MarshalAs(UnmanagedType.ByValArray, SizeConst = 17)] public ushort[] reserved;
      public ushort linkNodes, inputButtons, inputValues, inputIndices, outputButtons, outputValues, outputIndices, featureButtons, featureValues, featureIndices;
    }
    [StructLayout(LayoutKind.Explicit, Size = 72)] struct ValueCaps {
      [FieldOffset(0)] public ushort page; [FieldOffset(2)] public byte report;
      [FieldOffset(6)] public ushort link; [FieldOffset(12)] public byte range;
      [FieldOffset(40)] public int min; [FieldOffset(44)] public int max;
      [FieldOffset(56)] public ushort usage;
    }
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr SetupDiGetClassDevs(IntPtr guid, string enumerator, IntPtr window, uint flags);
    [DllImport("setupapi.dll", SetLastError = true)] static extern bool SetupDiEnumDeviceInfo(IntPtr set, uint index, ref DevInfo info);
    [DllImport("setupapi.dll")] static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode)] static extern bool SetupDiGetDeviceInstanceId(IntPtr set, ref DevInfo info, StringBuilder id, uint size, out uint required);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode)] static extern bool SetupDiGetDeviceRegistryProperty(IntPtr set, ref DevInfo info, uint property, out uint type, byte[] buffer, uint size, out uint required);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool SetupDiGetDeviceProperty(IntPtr set, ref DevInfo info, ref DevPropKey key, out uint type, byte[] buffer, uint size, out uint required, uint flags);
    [DllImport("cfgmgr32.dll")] static extern int CM_Get_Parent(out uint parent, uint devInst, uint flags);
    [DllImport("cfgmgr32.dll", CharSet = CharSet.Unicode)] static extern int CM_Get_Device_ID(uint devInst, StringBuilder id, uint length, uint flags);
    [DllImport("hid.dll")] static extern void HidD_GetHidGuid(out Guid guid);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode)] static extern IntPtr SetupDiGetClassDevs(ref Guid guid, string enumerator, IntPtr window, uint flags);
    [DllImport("setupapi.dll")] static extern bool SetupDiEnumDeviceInterfaces(IntPtr set, IntPtr info, ref Guid guid, uint index, ref InterfaceData data);
    [DllImport("setupapi.dll", CharSet = CharSet.Unicode)] static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr set, ref InterfaceData data, IntPtr detail, uint size, out uint required, ref DevInfo info);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern SafeFileHandle CreateFile(string path, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
    [DllImport("hid.dll")] static extern bool HidD_GetPreparsedData(SafeFileHandle handle, out IntPtr data);
    [DllImport("hid.dll")] static extern bool HidD_GetProductString(SafeFileHandle handle, byte[] buffer, uint length);
    [DllImport("hid.dll")] static extern bool HidD_GetManufacturerString(SafeFileHandle handle, byte[] buffer, uint length);
    [DllImport("hid.dll")] static extern bool HidD_FreePreparsedData(IntPtr data);
    [DllImport("hid.dll")] static extern int HidP_GetCaps(IntPtr data, out HidCaps caps);
    [DllImport("hid.dll")] static extern int HidP_GetValueCaps(int reportType, [Out] ValueCaps[] caps, ref ushort count, IntPtr data);
    [DllImport("hid.dll")] static extern bool HidD_GetFeature(SafeFileHandle handle, byte[] report, int length);
    [DllImport("hid.dll")] static extern int HidP_GetUsageValue(int reportType, ushort page, ushort link, ushort usage, out uint value, IntPtr data, byte[] report, uint length);
    static string Property(IntPtr set, ref DevInfo info, uint key) {
      uint type, required; byte[] bytes = new byte[8192];
      return SetupDiGetDeviceRegistryProperty(set, ref info, key, out type, bytes, (uint)bytes.Length, out required) ? Encoding.Unicode.GetString(bytes, 0, (int)Math.Min(required, (uint)bytes.Length)).TrimEnd('\0').Replace('\0', ' ') : "";
    }
    static byte[] DeviceProperty(IntPtr set, ref DevInfo info, Guid guid, uint pid) {
      var key = new DevPropKey { guid = guid, pid = pid }; uint type, required; byte[] bytes = new byte[256];
      if (!SetupDiGetDeviceProperty(set, ref info, ref key, out type, bytes, 256, out required, 0)) return null;
      var result = new byte[required]; Array.Copy(bytes, result, required); return result;
    }
    public static object DisplayDrivers() {
      var rows = new List<object>();
      IntPtr set = SetupDiGetClassDevs(IntPtr.Zero, null, IntPtr.Zero, 6);
      if (set == new IntPtr(-1)) return rows;
      try {
        for (uint i = 0; i < 2048; i++) {
          var info = new DevInfo { size = Marshal.SizeOf(typeof(DevInfo)) };
          if (!SetupDiEnumDeviceInfo(set, i, ref info)) break;
          if (Property(set, ref info, 7) != "Display") continue;
          var instance = new StringBuilder(1024); uint required;
          SetupDiGetDeviceInstanceId(set, ref info, instance, 1024, out required);
          string name = Property(set, ref info, 12); if (name == "") name = Property(set, ref info, 0);
          string version = "", date = "", provider = "";
          string driver = Property(set, ref info, 9);
          if (driver.Length > 0) using (var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\Class\" + driver)) if (key != null) {
            version = Convert.ToString(key.GetValue("DriverVersion")); date = Convert.ToString(key.GetValue("DriverDate")); provider = Convert.ToString(key.GetValue("ProviderName"));
          }
          rows.Add(new { Name = name, PNPDeviceID = instance.ToString(), DriverVersion = version, DriverDate = date, AdapterCompatibility = provider });
        }
      } finally { SetupDiDestroyDeviceInfoList(set); }
      return rows;
    }
    public static object Read() {
      IntPtr set = SetupDiGetClassDevs(IntPtr.Zero, null, IntPtr.Zero, 6);
      if (set == new IntPtr(-1)) throw new InvalidOperationException();
      var rows = new List<Dictionary<string, object>>();
      try {
        for (uint i = 0; i < 2048; i++) {
          var info = new DevInfo { size = Marshal.SizeOf(typeof(DevInfo)) };
          if (!SetupDiEnumDeviceInfo(set, i, ref info)) break;
          string cls = Property(set, ref info, 7);
          if (cls != "Keyboard" && cls != "Mouse" && cls != "HIDClass" && cls != "Bluetooth" && cls != "MEDIA" && cls != "AudioEndpoint" && cls != "USB") continue;
          var instance = new StringBuilder(1024); uint required;
          if (!SetupDiGetDeviceInstanceId(set, ref info, instance, 1024, out required)) continue;
          string name = Property(set, ref info, 12); if (name == "") name = Property(set, ref info, 0);
          if (cls == "USB" && (name.IndexOf("hub", StringComparison.OrdinalIgnoreCase) >= 0 || name.IndexOf("host controller", StringComparison.OrdinalIgnoreCase) >= 0)) continue;
          byte[] container = DeviceProperty(set, ref info, new Guid("8C7ED206-3F8A-4827-B3AB-AE9E1FAEFC6C"), 2);
          byte[] battery = DeviceProperty(set, ref info, new Guid("104EA319-6EE2-4701-BD47-8DDBF425BBE5"), 2);
          int batteryError = battery == null ? Marshal.GetLastWin32Error() : 0;
          int? level = battery != null && battery.Length >= 1 ? (int?)(battery.Length >= 4 ? BitConverter.ToInt32(battery, 0) : battery[0]) : null;
          if (level < 0 || level > 100) level = null;
          uint parent; var parentId = new StringBuilder(1024);
          if (CM_Get_Parent(out parent, info.devInst, 0) == 0) CM_Get_Device_ID(parent, parentId, 1024, 0);
          rows.Add(new Dictionary<string, object> {
            {"instanceId",instance.ToString()}, {"container",container != null && container.Length == 16 ? new Guid(container).ToString() : ""},
            {"parent",parentId.ToString()}, {"name",name}, {"manufacturer",Property(set, ref info, 11)}, {"className",cls},
            {"battery",level}, {"batterySource","Windows DeviceProperty"}, {"batteryState",level.HasValue ? "available" : batteryError == 5 ? "permission_required" : batteryError == 1168 || batteryError == 13 ? "unsupported" : "temporarily_unavailable"}, {"hardwareIds",Property(set, ref info, 1)}, {"status","present"}
          });
        }
      } finally { SetupDiDestroyDeviceInfoList(set); }
      // Only a documented Generic Device Controls / Battery Strength feature is requested.
      // No vendor report IDs, no output reports and no firmware commands are sent.
      foreach (var pair in StandardHidBatteries(rows)) foreach (var row in rows) {
        if (String.Equals((string)row["instanceId"], pair.Key, StringComparison.OrdinalIgnoreCase) && row["battery"] == null) {
          row["battery"] = pair.Value; row["batterySource"] = "HID Battery Strength (0x06/0x20)";
        }
      }
      return rows;
    }
    static Dictionary<string, int> StandardHidBatteries(List<Dictionary<string, object>> rows) {
      var values = new Dictionary<string, int>(); Guid guid; HidD_GetHidGuid(out guid);
      IntPtr set = SetupDiGetClassDevs(ref guid, null, IntPtr.Zero, 18);
      if (set == new IntPtr(-1)) return values;
      try {
        for (uint i = 0; i < 256; i++) {
          var data = new InterfaceData { size = Marshal.SizeOf(typeof(InterfaceData)) };
          if (!SetupDiEnumDeviceInterfaces(set, IntPtr.Zero, ref guid, i, ref data)) break;
          var info = new DevInfo { size = Marshal.SizeOf(typeof(DevInfo)) }; uint needed;
          SetupDiGetDeviceInterfaceDetail(set, ref data, IntPtr.Zero, 0, out needed, ref info);
          if (needed < 8 || needed > 8192) continue;
          IntPtr detail = Marshal.AllocHGlobal((int)needed);
          try {
            Marshal.WriteInt32(detail, IntPtr.Size == 8 ? 8 : 6);
            if (!SetupDiGetDeviceInterfaceDetail(set, ref data, detail, needed, out needed, ref info)) continue;
            string path = Marshal.PtrToStringUni(IntPtr.Add(detail, 4));
            using (var handle = CreateFile(path, 0, 3, IntPtr.Zero, 3, 0, IntPtr.Zero)) {
              if (handle.IsInvalid) continue; IntPtr prep;
              var instanceName = new StringBuilder(1024); uint neededName;
              if (SetupDiGetDeviceInstanceId(set, ref info, instanceName, 1024, out neededName)) {
                byte[] product = new byte[512], maker = new byte[512];
                string productName = HidD_GetProductString(handle, product, 512) ? Encoding.Unicode.GetString(product).TrimEnd('\0').Trim() : "";
                string makerName = HidD_GetManufacturerString(handle, maker, 512) ? Encoding.Unicode.GetString(maker).TrimEnd('\0').Trim() : "";
                foreach (var row in rows) if (String.Equals((string)row["instanceId"], instanceName.ToString(), StringComparison.OrdinalIgnoreCase)) {
                  if (productName.Length > 0) row["name"] = productName;
                  if (makerName.Length > 0) row["manufacturer"] = makerName;
                }
              }
              if (!HidD_GetPreparsedData(handle, out prep)) continue;
              try {
                HidCaps caps;
                if (HidP_GetCaps(prep, out caps) != 0x110000 || caps.featureValues == 0 || caps.featureValues > 256 || caps.featureLength == 0 || caps.featureLength > 4096) continue;
                ushort count = caps.featureValues; var valcaps = new ValueCaps[count];
                if (HidP_GetValueCaps(2, valcaps, ref count, prep) != 0x110000) continue;
                foreach (var cap in valcaps) {
                  if (cap.page != 6 || cap.usage != 0x20 || cap.range != 0 || cap.min != 0 || cap.max != 100) continue;
                  byte[] report = new byte[caps.featureLength]; report[0] = cap.report; uint value;
                  if (!HidD_GetFeature(handle, report, report.Length) || HidP_GetUsageValue(2, 6, cap.link, 0x20, out value, prep, report, (uint)report.Length) != 0x110000 || value > 100) continue;
                  var instance = new StringBuilder(1024); uint required;
                  if (SetupDiGetDeviceInstanceId(set, ref info, instance, 1024, out required)) values[instance.ToString()] = (int)value;
                }
              } finally { HidD_FreePreparsedData(prep); }
            }
          } finally { Marshal.FreeHGlobal(detail); }
        }
      } finally { SetupDiDestroyDeviceInfoList(set); }
      return values;
    }
  }
}
