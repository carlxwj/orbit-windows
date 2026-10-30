using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.IO;

namespace OrbitBridge {
  public static class Vpn {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Entry {
      public uint size;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 257)] public string name;
      public uint flags;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 261)] public string phonebook;
    }
    [StructLayout(LayoutKind.Sequential)] struct Luid { public uint low; public int high; }
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] struct Connection {
      public uint size; public IntPtr handle;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 257)] public string name;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 17)] public string type;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 129)] public string device;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string phonebook;
      public uint subentry; public Guid entryGuid; public uint flags; public Luid luid; public Guid correlation;
    }
    [DllImport("rasapi32.dll", CharSet = CharSet.Unicode)] static extern uint RasEnumEntries(string reserved, string phonebook, [In, Out] Entry[] entries, ref uint bytes, out uint count);
    [DllImport("rasapi32.dll", CharSet = CharSet.Unicode)] static extern uint RasEnumConnections([In, Out] Connection[] connections, ref uint bytes, out uint count);
    [DllImport("rasapi32.dll", CharSet = CharSet.Unicode)] static extern uint RasGetConnectStatus(IntPtr connection, [In, Out] byte[] status);
    public static object Read() {
      var entries = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
      string globalBook = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), @"Microsoft\Network\Connections\Pbk\rasphone.pbk");
      var books = new List<string> { null }; if (File.Exists(globalBook)) books.Add(globalBook);
      foreach (string book in books) {
        uint size = (uint)Marshal.SizeOf(typeof(Entry)), bytes = size, count; var data = new [] { new Entry { size = size } };
        uint code = RasEnumEntries(null, book, data, ref bytes, out count);
        if (code == 603 && bytes <= 4194304) { data = new Entry[bytes / size + 1]; data[0].size = size; code = RasEnumEntries(null, book, data, ref bytes, out count); }
        if (code == 5) throw new UnauthorizedAccessException();
        if (code != 0 && code != 623) throw new InvalidOperationException();
        if (code == 0) for (int i = 0; i < Math.Min(count, data.Length); i++) if (!String.IsNullOrEmpty(data[i].name)) entries.Add(data[i].name);
      }
      uint connectionSize = (uint)Marshal.SizeOf(typeof(Connection)), connectionBytes = connectionSize, connectionCount;
      var connections = new [] { new Connection { size = connectionSize } };
      uint result = RasEnumConnections(connections, ref connectionBytes, out connectionCount);
      if (result == 603 && connectionBytes <= 4194304) { connections = new Connection[connectionBytes / connectionSize + 1]; connections[0].size = connectionSize; result = RasEnumConnections(connections, ref connectionBytes, out connectionCount); }
      var active = new Dictionary<string, bool?>(StringComparer.OrdinalIgnoreCase);
      if (result == 0) for (int i = 0; i < Math.Min(connectionCount, connections.Length); i++) {
        var status = new byte[608]; Array.Copy(BitConverter.GetBytes((uint)status.Length), status, 4);
        active[connections[i].name] = RasGetConnectStatus(connections[i].handle, status) == 0 ? (bool?)(BitConverter.ToUInt32(status, 4) == 0x2000) : null;
      }
      var rows = new List<object>(); foreach (string name in entries) rows.Add(new { Name = name, Connected = result == 0 ? (active.ContainsKey(name) ? active[name] : (bool?)false) : null });
      return rows;
    }
  }
}
