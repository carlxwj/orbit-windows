using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace OrbitBridge {
  public static class Displays {
    [StructLayout(LayoutKind.Sequential)] struct Luid { public uint low; public int high; }
    [StructLayout(LayoutKind.Sequential)] struct Rational { public uint numerator, denominator; public double Number { get { return denominator == 0 ? 0 : (double)numerator / denominator; } } }
    [StructLayout(LayoutKind.Sequential)] struct Point { public int x, y; }
    [StructLayout(LayoutKind.Sequential)] struct Size { public uint width, height; }
    [StructLayout(LayoutKind.Sequential)] struct Source { public Luid adapter; public uint id, mode, flags; }
    [StructLayout(LayoutKind.Sequential)] struct Target { public Luid adapter; public uint id, mode, technology, rotation, scaling; public Rational refresh; public uint scan; public int available; public uint flags; }
    [StructLayout(LayoutKind.Sequential)] struct PathInfo { public Source source; public Target target; public uint flags; }
    [StructLayout(LayoutKind.Sequential)] struct Signal { public ulong pixelRate; public Rational hSync, vSync; public Size active, total; public uint standard, scan; }
    [StructLayout(LayoutKind.Sequential)] struct SourceMode { public uint width, height, format; public Point position; }
    [StructLayout(LayoutKind.Explicit, Size = 64)] struct Mode { [FieldOffset(0)] public uint type; [FieldOffset(4)] public uint id; [FieldOffset(8)] public Luid adapter; [FieldOffset(16)] public Signal signal; [FieldOffset(16)] public SourceMode source; }
    [StructLayout(LayoutKind.Sequential)] struct Header { public uint type, size; public Luid adapter; public uint id; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct SourceName { public Header header; [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string name; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct TargetName {
      public Header header; public uint flags, technology; public ushort manufacturer, product; public uint connector;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)] public string name;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string path;
    }
    [StructLayout(LayoutKind.Sequential)] struct ColorInfo { public Header header; public uint flags, encoding, bits; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct DevMode {
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string device;
      public ushort spec, driver, size, extra; public uint fields; public int x, y; public uint orientation, fixedOutput;
      public short color, duplex, yResolution, tt, collate;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string form;
      public ushort logPixels; public uint bits, width, height, flags, frequency, icmMethod, icmIntent, media, dither, reserved1, reserved2, panningWidth, panningHeight;
    }
    [DllImport("user32.dll")] static extern int GetDisplayConfigBufferSizes(uint flags, out uint paths, out uint modes);
    [DllImport("user32.dll")] static extern int QueryDisplayConfig(uint flags, ref uint paths, [Out] PathInfo[] pathArray, ref uint modes, [Out] Mode[] modeArray, IntPtr topology);
    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")] static extern int GetInfo(ref SourceName value);
    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")] static extern int GetInfo(ref TargetName value);
    [DllImport("user32.dll", EntryPoint = "DisplayConfigGetDeviceInfo")] static extern int GetInfo(ref ColorInfo value);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromPoint(Point point, uint flags);
    [DllImport("shcore.dll")] static extern int GetScaleFactorForMonitor(IntPtr monitor, out int scale);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool EnumDisplaySettings(string name, int mode, ref DevMode settings);
    static Header H(uint type, Type structure, Luid adapter, uint id) { return new Header { type = type, size = (uint)Marshal.SizeOf(structure), adapter = adapter, id = id }; }
    static Dictionary<string, object> Edid(string path) {
      var result = new Dictionary<string, object>();
      try {
        string[] parts = path.Split('#'); if (parts.Length < 3) return result;
        using (var key = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Enum\DISPLAY\" + parts[1] + "\\" + parts[2] + @"\Device Parameters")) {
          byte[] bytes = key == null ? null : key.GetValue("EDID") as byte[];
          if (bytes == null || bytes.Length < 128) return result;
          int check = 0; for (int i = 0; i < 128; i++) check += bytes[i]; if ((check & 255) != 0 || bytes[0] != 0 || bytes[1] != 255) return result;
          int m = (bytes[8] << 8) | bytes[9]; result["manufacturer"] = new string(new [] { (char)(64 + ((m >> 10) & 31)), (char)(64 + ((m >> 5) & 31)), (char)(64 + (m & 31)) });
          if (bytes[21] > 0 && bytes[22] > 0) { result["widthCm"] = bytes[21]; result["heightCm"] = bytes[22]; }
          if ((bytes[24] & 2) != 0 && (bytes[54] != 0 || bytes[55] != 0)) { result["nativeWidth"] = bytes[56] + ((bytes[58] & 240) << 4); result["nativeHeight"] = bytes[59] + ((bytes[61] & 240) << 4); }
          result["edid"] = String.Format("EDID {0}.{1} · checksum valide · fabricant {2}", bytes[18], bytes[19], result["manufacturer"]);
        }
      } catch { }
      return result;
    }
    static string Technology(uint technology) {
      switch (technology) { case 5: return "HDMI"; case 10: case 11: return "DisplayPort"; case 4: return "DVI"; case 0: return "VGA"; case 6: return "LVDS"; case 0x80000000: return "Interne"; case 15: return "Miracast"; default: return "Non disponible"; }
    }
    public static object Read() {
      uint pathCount, modeCount; PathInfo[] paths = null; Mode[] modes = null; int status = 0;
      // Retry a configuration changing between buffer sizing and querying.
      for (int attempt = 0; attempt < 3; attempt++) {
        status = GetDisplayConfigBufferSizes(2, out pathCount, out modeCount); if (status != 0) break;
        paths = new PathInfo[pathCount]; modes = new Mode[modeCount];
        status = QueryDisplayConfig(2, ref pathCount, paths, ref modeCount, modes, IntPtr.Zero);
        if (status == 122) continue;
        if (status == 0) { Array.Resize(ref paths, (int)pathCount); Array.Resize(ref modes, (int)modeCount); } break;
      }
      if (status == 5) throw new UnauthorizedAccessException();
      if (status != 0 || paths == null) throw new InvalidOperationException();
      var result = new List<object>();
      foreach (var path in paths) {
        var sourceName = new SourceName { header = H(1, typeof(SourceName), path.source.adapter, path.source.id) }; GetInfo(ref sourceName);
        var targetName = new TargetName { header = H(2, typeof(TargetName), path.target.adapter, path.target.id) }; GetInfo(ref targetName);
        SourceMode source = new SourceMode();
        foreach (var mode in modes) if (mode.type == 1 && mode.id == path.source.id && mode.adapter.low == path.source.adapter.low && mode.adapter.high == path.source.adapter.high) { source = mode.source; break; }
        double hz = path.target.refresh.Number;
        foreach (var mode in modes) if (mode.type == 2 && mode.id == path.target.id && mode.adapter.low == path.target.adapter.low && mode.adapter.high == path.target.adapter.high && mode.signal.vSync.denominator != 0) { hz = mode.signal.vSync.Number; break; }
        var color = new ColorInfo { header = H(9, typeof(ColorInfo), path.target.adapter, path.target.id) }; bool hasColor = GetInfo(ref color) == 0;
        var monitor = MonitorFromPoint(new Point { x = source.position.x + 1, y = source.position.y + 1 }, 2); int scale;
        object scaling = GetScaleFactorForMonitor(monitor, out scale) == 0 ? (object)scale : null;
        var available = new HashSet<string>();
        for (int i = 0; i < 1024; i++) {
          var dm = new DevMode { size = (ushort)Marshal.SizeOf(typeof(DevMode)) };
          if (!EnumDisplaySettings(sourceName.name, i, ref dm)) break;
          available.Add(String.Format("{0} × {1} · {2} Hz", dm.width, dm.height, dm.frequency));
        }
        var details = Edid(targetName.path ?? "");
        result.Add(new {
          id = targetName.path ?? sourceName.name, name = String.IsNullOrEmpty(targetName.name) ? sourceName.name : targetName.name,
          manufacturer = details.ContainsKey("manufacturer") ? details["manufacturer"] : "", deviceName = sourceName.name,
          primary = source.position.x == 0 && source.position.y == 0, x = source.position.x, y = source.position.y,
          width = source.width, height = source.height, refresh = hz > 0 ? (object)hz : null, scale = scaling,
          orientation = path.target.rotation == 2 || path.target.rotation == 4 ? "Portrait" : "Paysage", connection = Technology(path.target.technology),
          nativeWidth = details.ContainsKey("nativeWidth") ? details["nativeWidth"] : null, nativeHeight = details.ContainsKey("nativeHeight") ? details["nativeHeight"] : null,
          widthCm = details.ContainsKey("widthCm") ? details["widthCm"] : null, heightCm = details.ContainsKey("heightCm") ? details["heightCm"] : null,
          hdr = hasColor ? (object)((color.flags & 2) != 0) : null, hdrSupported = hasColor ? (object)((color.flags & 1) != 0) : null,
          bits = hasColor ? (object)color.bits : null, modes = available, edid = details.ContainsKey("edid") ? details["edid"] : "EDID non accessible"
        });
      }
      return result;
    }
  }
}
