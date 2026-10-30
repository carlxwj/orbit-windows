using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Management;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32;

namespace OrbitBridge {
  public static class Inventory {
    public static object Query(string scope, string query) {
      var options = new EnumerationOptions { ReturnImmediately = false, Timeout = TimeSpan.FromSeconds(3) };
      using (var searcher = new ManagementObjectSearcher(scope, query, options)) {
        var rows = new List<Dictionary<string, object>>();
        using (var results = searcher.Get()) foreach (ManagementBaseObject item in results) {
          using (item) {
            var row = new Dictionary<string, object>();
            foreach (PropertyData prop in item.Properties) row[prop.Name] = prop.Value;
            rows.Add(row);
          }
        }
        return rows;
      }
    }
    [DllImport("secur32.dll", CharSet = CharSet.Unicode)] static extern bool GetUserNameEx(int format, StringBuilder value, ref uint size);
    [DllImport("kernel32.dll")] static extern bool GetFirmwareType(out uint firmwareType);
    static object Profile() {
      string username = Environment.UserName; var display = new StringBuilder(512); uint length = 512;
      string displayName = GetUserNameEx(3, display, ref length) ? display.ToString() : username;
      string photo = null;
      using (var identity = WindowsIdentity.GetCurrent()) {
        using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\AccountPicture\Users\" + identity.User.Value)) {
          if (key != null) foreach (string name in new [] { "Image448", "Image240", "Image192", "Image96" }) {
            string candidate = key.GetValue(name) as string;
            if (!String.IsNullOrEmpty(candidate) && File.Exists(candidate)) { photo = candidate; break; }
          }
        }
      }
      return new { username = username, displayName = displayName, photo = photo, accountType = "unknown" };
    }
    static object Firmware() {
      uint type; bool? uefi = GetFirmwareType(out type) ? (bool?)(type == 2) : null;
      object secure = null;
      using (var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Control\SecureBoot\State")) {
        if (key != null && key.GetValue("UEFISecureBootEnabled") != null) secure = Convert.ToInt32(key.GetValue("UEFISecureBootEnabled")) == 1;
      }
      return new { uefi = uefi, secureBoot = secure };
    }
    static object Volumes() {
      return DriveInfo.GetDrives().Where(d => d.DriveType != DriveType.Network && d.IsReady).Select(d => new { id = d.Name, label = d.VolumeLabel, total = d.TotalSize, free = d.AvailableFreeSpace, filesystem = d.DriveFormat }).ToArray();
    }
    public static object Read() {
      var values = new Dictionary<string, object>();
      var issues = new List<object>();
      Action<string, Func<object>> add = (name, reader) => {
        try { values[name] = reader(); }
        catch (UnauthorizedAccessException) { values[name] = null; issues.Add(new { collector = name, state = "permission_required" }); }
        catch (ManagementException e) { values[name] = null; issues.Add(new { collector = name, state = e.ErrorCode == ManagementStatus.AccessDenied ? "permission_required" : "temporarily_unavailable" }); }
        catch { values[name] = null; issues.Add(new { collector = name, state = "unsupported" }); }
      };
      add("profile", Profile); add("firmware", Firmware); add("volumes", Volumes); add("smbios", Smbios.Read); add("nativeStorage", Storage.Read);
      add("cpu", () => Query(@"root\cimv2", "SELECT Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,L2CacheSize,L3CacheSize FROM Win32_Processor"));
      add("memory", () => Query(@"root\cimv2", "SELECT DeviceLocator,Capacity,Manufacturer,PartNumber,SMBIOSMemoryType,Speed,ConfiguredClockSpeed FROM Win32_PhysicalMemory"));
      add("board", () => Query(@"root\cimv2", "SELECT Manufacturer,Product,Version FROM Win32_BaseBoard"));
      add("bios", () => Query(@"root\cimv2", "SELECT SMBIOSBIOSVersion,ReleaseDate FROM Win32_BIOS"));
      add("os", () => Query(@"root\cimv2", "SELECT Caption,BuildNumber,OSArchitecture,LastBootUpTime FROM Win32_OperatingSystem"));
      add("computer", () => Query(@"root\cimv2", "SELECT Manufacturer,Model,PCSystemType FROM Win32_ComputerSystem"));
      add("video", () => Query(@"root\cimv2", "SELECT Name,PNPDeviceID,DriverVersion,DriverDate,AdapterCompatibility FROM Win32_VideoController"));
      add("videoFallback", () => Devices.DisplayDrivers());
      add("gpu", () => Gpu.Inventory());
      add("physicalDisks", () => Query(@"root\Microsoft\Windows\Storage", "SELECT DeviceId,FriendlyName,Manufacturer,Size,MediaType,BusType,HealthStatus FROM MSFT_PhysicalDisk"));
      add("partitions", () => Query(@"root\Microsoft\Windows\Storage", "SELECT DiskNumber,DriveLetter FROM MSFT_Partition"));
      add("diskMap", () => Query(@"root\Microsoft\Windows\Storage", "SELECT Number,FriendlyName,Size FROM MSFT_Disk"));
      add("devices", () => Devices.Read());
      add("displays", () => Displays.Read());
      add("network", () => Program.Network());
      add("wifi", () => Wifi.Read());
      add("vpn", () => Query(@"root\Microsoft\Windows\RemoteAccess\Client", "SELECT Name,ConnectionStatus FROM PS_VpnConnection"));
      add("vpnFallback", () => Vpn.Read());
      add("sensors", () => Sensors.Inventory());
      add("tpm", () => Query(@"root\CIMV2\Security\MicrosoftTpm", "SELECT SpecVersion FROM Win32_Tpm"));
      add("audio", () => Audio.Read(-1, null, true));
      values["issues"] = issues;
      return values;
    }
  }
}
